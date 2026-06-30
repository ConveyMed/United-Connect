import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import { supabase } from '../config/supabase';
import { exportDeals } from './utils/exportDeals';

const fmtMoney = (n) => {
  if (n == null || isNaN(n)) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const monthKey = (d) => {
  if (!d) return '';
  const dt = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const dt = new Date(parseInt(y), parseInt(m) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const enumerateMonths = (startKey, endKey) => {
  if (!startKey || !endKey) return [];
  const out = [];
  const [sy, sm] = startKey.split('-').map(Number);
  const [ey, em] = endKey.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const endOfMonthISO = (offsetMonths = 2) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths + 1, 0); // last day of target month
  return d.toISOString().slice(0, 10);
};

const DealReview = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const navigate = useNavigate();

  const [closeDateMax, setCloseDateMax] = useState(endOfMonthISO(2));
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [cptPriceMap, setCptPriceMap] = useState({});
  const [cptBySurgeon, setCptBySurgeon] = useState({});
  const [repMap, setRepMap] = useState({});
  const [selectedRepId, setSelectedRepId] = useState('all');
  const [exporting, setExporting] = useState(false);
  // Pre-resolved scoped surgeon IDs (null = unscoped admin). Used by handleExport so the
  // export matches exactly what the table shows.
  const [scopedSurgeonIds, setScopedSurgeonIds] = useState(null);

  useEffect(() => {
    if (!user?.id || !role) return;

    const fetchDeals = async () => {
      setLoading(true);
      try {
        // 1. Resolve which user_ids the current user can see (mirrors ActivityFeed pattern).
        let userIds = [user.id];
        if (role === 'manager') {
          const { data } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'rep');
          userIds = [...userIds, ...(data || []).map(r => r.user_id)];
        } else if (role === 'vp') {
          const { data: mgrs } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'manager');
          const mgrIds = (mgrs || []).map(m => m.user_id);
          userIds = [...userIds, ...mgrIds];
          if (mgrIds.length) {
            const { data: reps } = await supabase
              .from('hierarchy_assignments')
              .select('user_id')
              .in('parent_user_id', mgrIds)
              .eq('role_tier', 'rep');
            userIds = [...userIds, ...(reps || []).map(r => r.user_id)];
          }
        } else if (role === 'admin') {
          userIds = null; // unscoped
        }

        // 2. Resolve surgeon IDs via account_delegations for those users.
        let surgeonIds = null;
        if (userIds) {
          const { data: dels } = await supabase
            .from('account_delegations')
            .select('surgeon_id, user_id')
            .in('user_id', userIds);
          const ids = [...new Set((dels || []).map(d => d.surgeon_id))];
          if (!ids.length) {
            setScopedSurgeonIds([]);
            setDeals([]);
            setLoading(false);
            return;
          }
          surgeonIds = ids;
        }
        setScopedSurgeonIds(surgeonIds); // null for admin, or the explicit ID list

        // 3. Fetch surgeons filtered by forecast_close_date.
        let surgeonsQuery = supabase
          .from('surgeons')
          .select('id, full_name, first_name, last_name, npi, site_of_care, hospital, contract_status, buying_stage, forecast_close_date, competitor_products')
          .not('forecast_close_date', 'is', null)
          .lte('forecast_close_date', closeDateMax)
          .order('forecast_close_date', { ascending: true });
        if (surgeonIds) {
          surgeonsQuery = surgeonsQuery.in('id', surgeonIds);
        }
        const { data: surgeons, error: sErr } = await surgeonsQuery;
        if (sErr) throw sErr;

        const allIds = (surgeons || []).map(s => s.id);
        if (!allIds.length) {
          setDeals([]);
          setLoading(false);
          return;
        }

        // 4. Enrichment: CPT data (for market value) + delegations (for rep filter chips).
        const [cptDataRes, cptPriceRes, delsRes] = await Promise.all([
          supabase.from('surgeon_cpt_data').select('surgeon_id, cpt_code, annual_volume').in('surgeon_id', allIds),
          supabase.from('cpt_prices').select('cpt_code, average_price'),
          supabase.from('account_delegations')
            .select('surgeon_id, user_id')
            .in('surgeon_id', allIds),
        ]);

        const priceMap = {};
        (cptPriceRes.data || []).forEach(p => {
          if (p.average_price != null) priceMap[p.cpt_code] = parseFloat(p.average_price);
        });
        setCptPriceMap(priceMap);

        const cMap = {};
        (cptDataRes.data || []).forEach(c => {
          (cMap[c.surgeon_id] = cMap[c.surgeon_id] || []).push(c);
        });
        setCptBySurgeon(cMap);

        // Bug 3 fix: rep filter must show ACTUAL reps, not whoever's first in delegations.
        // Look up role_tier for every delegated user, keep only those with 'rep'.
        const delegatedUserIds = [...new Set((delsRes.data || []).map(d => d.user_id))];
        let repUserIds = new Set();
        let userInfoMap = {};
        if (delegatedUserIds.length) {
          const [{ data: hrows }, { data: urows }] = await Promise.all([
            supabase
              .from('hierarchy_assignments')
              .select('user_id, role_tier')
              .in('user_id', delegatedUserIds)
              .eq('role_tier', 'rep'),
            supabase
              .from('users')
              .select('id, first_name, last_name')
              .in('id', delegatedUserIds),
          ]);
          (hrows || []).forEach(h => repUserIds.add(h.user_id));
          (urows || []).forEach(u => { userInfoMap[u.id] = u; });
        }
        const rMap = {};
        (delsRes.data || []).forEach(d => {
          if (!repUserIds.has(d.user_id)) return;
          if (rMap[d.surgeon_id]) return;
          const u = userInfoMap[d.user_id];
          if (u) rMap[d.surgeon_id] = { id: u.id, first_name: u.first_name, last_name: u.last_name };
        });
        setRepMap(rMap);

        setDeals(surgeons || []);
      } catch (err) {
        console.error('[DealReview] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [user?.id, role, closeDateMax]);

  const marketValue = (surgeonId) => {
    const cpts = cptBySurgeon[surgeonId] || [];
    return cpts.reduce((sum, c) => sum + (Number(c.annual_volume) || 0) * (cptPriceMap[c.cpt_code] || 0), 0);
  };

  // Rep filter (only relevant if manager/vp/admin)
  const repOptions = useMemo(() => {
    const map = new Map();
    Object.values(repMap).forEach(r => {
      if (r && r.id && !map.has(r.id)) map.set(r.id, `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown');
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [repMap]);

  const filteredDeals = useMemo(() => {
    if (selectedRepId === 'all') return deals;
    return deals.filter(d => repMap[d.id]?.id === selectedRepId);
  }, [deals, repMap, selectedRepId]);

  const grouped = useMemo(() => {
    // F2: show every month in the range, including those with 0 deals.
    const map = {};
    filteredDeals.forEach(d => {
      const k = monthKey(d.forecast_close_date);
      if (!k) return;
      (map[k] = map[k] || []).push(d);
    });
    // Start = earliest deal month if past, else today. This guarantees every counted
    // deal also appears in a rendered month (fixes summary/visible-count mismatch).
    const earliestDealKey = Object.keys(map).sort()[0];
    const today = todayKey();
    const startKey = earliestDealKey && earliestDealKey < today ? earliestDealKey : today;
    const endKey = monthKey(closeDateMax);
    const months = enumerateMonths(startKey, endKey);
    return months.map(k => ({
      key: k,
      label: monthLabel(k),
      rows: map[k] || [],
      total: (map[k] || []).reduce((sum, d) => sum + marketValue(d.id), 0),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDeals, closeDateMax, cptBySurgeon, cptPriceMap]);

  const totalCount = filteredDeals.length;
  const totalValue = filteredDeals.reduce((sum, d) => sum + marketValue(d.id), 0);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      // Bug 1 fix: pass the SAME surgeonIds we computed for the table so the export matches.
      const scope = scopedSurgeonIds === null
        ? { kind: 'admin' }
        : { kind: 'explicit', surgeonIds: scopedSurgeonIds };
      await exportDeals({ scope, closeDateMax, format });
    } catch (err) {
      console.error('[DealReview] Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading deals...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Deal Review</h2>

      {/* Filters */}
      <div style={styles.filterCard}>
        <label style={styles.filterLabel}>
          Forecasted close on or before
          <input
            type="date"
            value={closeDateMax}
            onChange={(e) => setCloseDateMax(e.target.value)}
            style={styles.dateInput}
          />
        </label>

        {(role === 'manager' || role === 'vp' || role === 'admin') && repOptions.length > 0 && (
          <label style={styles.filterLabel}>
            Filter by rep
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All reps</option>
              {repOptions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Top summary */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total deals</span>
          <span style={styles.summaryValue}>{totalCount}</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total value</span>
          <span style={styles.summaryValue}>{fmtMoney(totalValue)}</span>
        </div>
      </div>

      {/* Export row */}
      <div style={styles.exportRow}>
        <button onClick={() => handleExport('csv')} disabled={exporting} style={styles.exportBtn}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
        <button onClick={() => handleExport('xlsx')} disabled={exporting} style={styles.exportBtn}>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {/* Grouped by month */}
      <div style={styles.groups}>
        {grouped.map(g => (
          <div key={g.key} style={styles.group}>
            <div style={styles.groupHeader}>
              <span style={styles.groupTitle}>{g.label} ({g.rows.length})</span>
              {g.rows.length > 0 && <span style={styles.groupTotal}>{fmtMoney(g.total)}</span>}
            </div>
            {g.rows.length === 0 ? (
              <div style={styles.emptyMonth}>No deals</div>
            ) : (
              g.rows.map(d => {
                const name = d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim();
                const value = marketValue(d.id);
                const rep = repMap[d.id];
                const repName = rep ? `${rep.first_name || ''} ${rep.last_name || ''}`.trim() : '';
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/field-intel/dossier/${d.id}`)}
                    style={styles.dealRow}
                  >
                    <div style={styles.dealHeader}>
                      <span style={styles.dealName}>{name || 'Unknown'}</span>
                      <span style={styles.dealValue}>{fmtMoney(value)}</span>
                    </div>
                    <div style={styles.dealMeta}>
                      <span style={styles.dealSite}>{d.site_of_care || d.hospital || ''}</span>
                      <span style={styles.dealDate}>{fmtDate(d.forecast_close_date)}</span>
                    </div>
                    <div style={styles.dealTags}>
                      {d.buying_stage && <span style={styles.tag}>{d.buying_stage}</span>}
                      {d.contract_status && <span style={styles.tag}>{d.contract_status}</span>}
                      {repName && <span style={styles.tagMuted}>Rep: {repName}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  filterCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#ffffff',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  filterLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  dateInput: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontWeight: '500',
  },
  selectInput: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontWeight: '500',
  },
  summaryCard: {
    display: 'flex',
    gap: '16px',
    backgroundColor: '#1e3a8a',
    padding: '16px',
    borderRadius: '10px',
    color: '#ffffff',
  },
  summaryItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  summaryValue: {
    fontSize: '22px',
    fontWeight: '700',
  },
  exportRow: {
    display: 'flex',
    gap: '8px',
  },
  exportBtn: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#ffffff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  groups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  groupTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
  },
  groupTotal: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
  emptyMonth: {
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  dealRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  dealHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  dealName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  dealValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e3a8a',
    fontVariantNumeric: 'tabular-nums',
  },
  dealMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#64748b',
  },
  dealSite: {},
  dealDate: {
    fontWeight: '600',
  },
  dealTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px',
  },
  tag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  tagMuted: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
};

export default DealReview;
