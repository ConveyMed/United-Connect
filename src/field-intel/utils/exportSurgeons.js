import { supabase } from '../../config/supabase';
import ExcelJS from 'exceljs';

const PAGE_SIZE = 1000;
const IN_CHUNK = 500;

const escapeCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCSV = (rows) => rows.map(r => r.map(escapeCell).join(',')).join('\r\n');

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadCSV = (filename, csv) => {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(filename, blob);
};

const downloadXLSX = async (filename, rows) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Field Intel';
  wb.created = new Date();
  const sheet = wb.addWorksheet('Deals', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  rows.forEach((r) => sheet.addRow(r));
  if (rows.length) {
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle' };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: rows[0].length },
    };
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 2, 60);
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(filename, blob);
};

// Page through Supabase's row cap until the result set is exhausted.
// queryFn must return a fresh PostgrestFilterBuilder each call.
const fetchAllPages = async (queryFn, onPage) => {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFn().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data);
    if (onPage) onPage(all.length);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
};

const chunkArr = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const fetchInChunks = async (table, select, ids, idColumn = 'surgeon_id', onCount) => {
  const all = [];
  const chunks = chunkArr(ids, IN_CHUNK);
  for (const c of chunks) {
    const rows = await fetchAllPages(() =>
      supabase.from(table).select(select).in(idColumn, c)
    );
    all.push(...rows);
    if (onCount) onCount(all.length);
  }
  return all;
};

const getTeamUserIds = async (rootId) => {
  const ids = [rootId];
  const { data: directReports } = await supabase
    .from('hierarchy_assignments')
    .select('user_id, role_tier')
    .eq('parent_user_id', rootId);
  if (!directReports) return ids;
  for (const r of directReports) {
    ids.push(r.user_id);
    if (r.role_tier === 'manager') {
      const subs = await getTeamUserIds(r.user_id);
      ids.push(...subs.filter(x => x !== r.user_id));
    }
  }
  return ids;
};

const resolveScope = async (scope, onProgress) => {
  const emit = (count) => onProgress?.({ phase: 'scope', count });

  // Explicit: caller pre-resolved the surgeon IDs (used by Deal Review so the
  // export matches the visible table exactly).
  if (scope.kind === 'explicit') {
    const ids = scope.surgeonIds || [];
    emit(ids.length);
    return ids;
  }

  if (scope.kind === 'admin') {
    const data = await fetchAllPages(
      () => supabase.from('surgeons').select('id'),
      emit
    );
    return data.map(s => s.id);
  }
  if (scope.kind === 'vp') {
    if (!scope.regionIds?.length) return [];
    const all = [];
    for (const c of chunkArr(scope.regionIds, IN_CHUNK)) {
      const rows = await fetchAllPages(
        () => supabase.from('surgeon_regions').select('surgeon_id').in('region_id', c)
      );
      all.push(...rows);
      emit(all.length);
    }
    return [...new Set(all.map(r => r.surgeon_id))];
  }
  if (scope.kind === 'manager') {
    const teamIds = await getTeamUserIds(scope.userId);
    if (!teamIds.length) return [];
    const rows = await fetchInChunks(
      'account_delegations',
      'surgeon_id',
      teamIds,
      'user_id',
      emit
    );
    return [...new Set(rows.map(d => d.surgeon_id))];
  }
  return [];
};

export const exportSurgeonsCSV = async (scope, baseFilename = 'field-intel-export', onProgress, options = {}) => {
  const { closeDateMax = null, format = 'csv' } = options;
  const emit = (phase, count) => onProgress?.({ phase, count });

  emit('scope', 0);
  const surgeonIds = await resolveScope(scope, onProgress);

  if (!surgeonIds.length) {
    emit('done', 0);
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'xlsx') {
      await downloadXLSX(`${baseFilename}-${stamp}.xlsx`, [['No data to export']]);
    } else {
      downloadCSV(`${baseFilename}-${stamp}.csv`, 'No data to export');
    }
    return { count: 0 };
  }

  let surgeons = await fetchInChunks(
    'surgeons',
    'id, full_name, first_name, last_name, npi, site_of_care, hospital, contract_status, buying_stage, forecast_close_date, competitor_products',
    surgeonIds,
    'id',
    (c) => emit('surgeons', c)
  );

  // F1: filter by forecasted close date (excludes surgeons with null close date)
  if (closeDateMax) {
    surgeons = surgeons.filter(s => s.forecast_close_date && s.forecast_close_date <= closeDateMax);
  }

  const cptData = await fetchInChunks(
    'surgeon_cpt_data',
    'surgeon_id, cpt_code, cpt_description, annual_volume',
    surgeonIds,
    'surgeon_id',
    (c) => emit('cpt', c)
  );

  const delegations = await fetchInChunks(
    'account_delegations',
    'surgeon_id, user_id',
    surgeonIds,
    'surgeon_id',
    (c) => emit('delegations', c)
  );

  const callLogs = await fetchInChunks(
    'call_logs',
    'surgeon_id, call_date, summary',
    surgeonIds,
    'surgeon_id',
    (c) => emit('calls', c)
  );

  const cptPrices = await fetchAllPages(() =>
    supabase.from('cpt_prices').select('cpt_code, average_price')
  );

  emit('hierarchy', 0);

  // Resolve hierarchy for all delegated users + their parent chains
  const allUserIds = new Set(delegations.map(d => d.user_id));
  const hierarchyMap = {}; // userId -> { role, parentId }
  let toFetch = [...allUserIds];
  const fetched = new Set();
  while (toFetch.length) {
    const data = [];
    for (const c of chunkArr(toFetch, IN_CHUNK)) {
      const rows = await fetchAllPages(() =>
        supabase.from('hierarchy_assignments').select('user_id, role_tier, parent_user_id').in('user_id', c)
      );
      data.push(...rows);
    }
    toFetch.forEach(id => fetched.add(id));
    const next = [];
    data.forEach(h => {
      hierarchyMap[h.user_id] = { role: h.role_tier, parentId: h.parent_user_id };
      if (h.parent_user_id && !fetched.has(h.parent_user_id)) next.push(h.parent_user_id);
    });
    toFetch = [...new Set(next)];
  }

  const allRelevantUserIds = new Set([
    ...allUserIds,
    ...Object.keys(hierarchyMap),
    ...Object.values(hierarchyMap).map(h => h.parentId).filter(Boolean),
  ]);
  const userMap = {};
  if (allRelevantUserIds.size) {
    const userIdsList = [...allRelevantUserIds];
    for (const c of chunkArr(userIdsList, IN_CHUNK)) {
      const rows = await fetchAllPages(() =>
        supabase.from('users').select('id, first_name, last_name, email').in('id', c)
      );
      rows.forEach(u => {
        userMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '';
      });
    }
  }

  emit('building', surgeons.length);

  const priceMap = {};
  cptPrices.forEach(p => { priceMap[p.cpt_code] = Number(p.average_price) || 0; });

  const cptBySurgeon = {};
  cptData.forEach(c => {
    (cptBySurgeon[c.surgeon_id] = cptBySurgeon[c.surgeon_id] || []).push(c);
  });
  const callsBySurgeon = {};
  callLogs.forEach(c => {
    (callsBySurgeon[c.surgeon_id] = callsBySurgeon[c.surgeon_id] || []).push(c);
  });
  const delegationsBySurgeon = {};
  delegations.forEach(d => {
    (delegationsBySurgeon[d.surgeon_id] = delegationsBySurgeon[d.surgeon_id] || []).push(d.user_id);
  });

  const cptCodes = [...new Set(cptData.map(c => c.cpt_code).filter(Boolean))].sort();
  const cptDescriptions = {};
  cptData.forEach(c => { if (c.cpt_code && c.cpt_description) cptDescriptions[c.cpt_code] = c.cpt_description; });

  const header = ['NPI', 'NAME', 'SITE OF CARE', 'Assigned VP', 'Assigned Manager', 'Assigned Rep'];
  cptCodes.forEach((_, i) => {
    const n = i + 1;
    header.push(`CPT CODE ${n}`, `DESCRIPTION ${n}`, `VOLUME ${n}`, `MARKET ${n}`);
  });
  header.push('TOTAL MARKET VALUE', 'CONTRACT STATUS', 'CURRENT STAGE', 'FORECASTED CLOSE DATE', 'COMPETITOR PRODUCTS', 'CALL LOG HISTORY');

  const resolveAssignments = (surgeonId) => {
    const userIds = delegationsBySurgeon[surgeonId] || [];
    const reps = new Set();
    const managers = new Set();
    const vps = new Set();
    userIds.forEach(uid => {
      const node = hierarchyMap[uid];
      if (!node) return;
      if (node.role === 'rep') reps.add(uid);
      else if (node.role === 'manager') managers.add(uid);
      else if (node.role === 'vp') vps.add(uid);
      let cursor = node.parentId;
      const seen = new Set();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const parent = hierarchyMap[cursor];
        if (!parent) break;
        if (parent.role === 'manager') managers.add(cursor);
        else if (parent.role === 'vp') vps.add(cursor);
        cursor = parent.parentId;
      }
    });
    const fmt = (set) => [...set].map(id => userMap[id]).filter(Boolean).join(', ');
    return { rep: fmt(reps), manager: fmt(managers), vp: fmt(vps) };
  };

  const sortedSurgeons = [...surgeons].sort((a, b) => {
    const an = (a.full_name || `${a.last_name || ''} ${a.first_name || ''}`).trim().toLowerCase();
    const bn = (b.full_name || `${b.last_name || ''} ${b.first_name || ''}`).trim().toLowerCase();
    return an.localeCompare(bn);
  });

  const rows = [header];
  sortedSurgeons.forEach(s => {
    const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()) || '';
    const site = s.site_of_care || s.hospital || '';
    const { vp, manager, rep } = resolveAssignments(s.id);

    const surgeonCptList = cptBySurgeon[s.id] || [];
    const cptByCode = {};
    surgeonCptList.forEach(c => { cptByCode[c.cpt_code] = c; });

    let totalMarket = 0;
    const cptCells = [];
    cptCodes.forEach(code => {
      const entry = cptByCode[code];
      if (entry) {
        const vol = Number(entry.annual_volume) || 0;
        const market = vol * (priceMap[code] || 0);
        totalMarket += market;
        cptCells.push(code, entry.cpt_description || cptDescriptions[code] || '', vol, market ? market.toFixed(2) : '');
      } else {
        cptCells.push('', '', '', '');
      }
    });

    const calls = (callsBySurgeon[s.id] || [])
      .sort((a, b) => (b.call_date || '').localeCompare(a.call_date || ''))
      .map(c => `${c.call_date || ''}: ${c.summary || ''}`)
      .join(' | ');

    rows.push([
      s.npi || '',
      name,
      site,
      vp,
      manager,
      rep,
      ...cptCells,
      totalMarket ? totalMarket.toFixed(2) : '',
      s.contract_status || '',
      s.buying_stage || '',
      s.forecast_close_date || '',
      s.competitor_products || '',
      calls,
    ]);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    await downloadXLSX(`${baseFilename}-${stamp}.xlsx`, rows);
  } else {
    downloadCSV(`${baseFilename}-${stamp}.csv`, toCSV(rows));
  }
  emit('done', sortedSurgeons.length);
  return { count: sortedSurgeons.length };
};
