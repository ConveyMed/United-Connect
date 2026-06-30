import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import PersonCard from '../PersonCard';
import AccountCard from '../AccountCard';
import TeamFilter from '../TeamFilter';
import { exportSurgeonsCSV } from '../utils/exportSurgeons';
import ExportProgressModal from '../utils/ExportProgressModal';

const BUYING_STAGES = [
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
];

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [callsThisWeek, setCallsThisWeek] = useState(0);
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [allSurgeons, setAllSurgeons] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [latestCallMap, setLatestCallMap] = useState({});
  const [repMap, setRepMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});
  const [teamFilterIds, setTeamFilterIds] = useState(null);
  const [filteredSurgeonIds, setFilteredSurgeonIds] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ phase: 'scope', count: 0 });
  const [exportError, setExportError] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleExport = async () => {
    if (exporting || !user?.id) return;
    setExporting(true);
    setExportError(null);
    setExportProgress({ phase: 'scope', count: 0 });
    setExportModalOpen(true);
    try {
      await exportSurgeonsCSV(
        { kind: 'manager', userId: user.id },
        'field-intel-team',
        (p) => setExportProgress(p)
      );
    } catch (err) {
      console.error('[FieldIntel] Export failed:', err);
      setExportError(err?.message || 'Something went wrong while exporting.');
    } finally {
      setExporting(false);
    }
  };

  const getTeamIds = useCallback(async (rootId) => {
    const ids = [];
    const { data: directReports } = await supabase
      .from('hierarchy_assignments')
      .select('user_id, role_tier')
      .eq('parent_user_id', rootId);

    if (!directReports) return ids;

    for (const report of directReports) {
      ids.push(report.user_id);
      if (report.role_tier === 'manager') {
        const subIds = await getTeamIds(report.user_id);
        ids.push(...subIds);
      }
    }
    return ids;
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Get all team IDs
        const teamIds = await getTeamIds(user.id);
        const allIds = [user.id, ...teamIds];

        // Get direct reports (reps + sub-managers)
        const { data: subAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', user.id);

        const subIds = (subAssigns || []).map(r => r.user_id);
        let subUsers = [];
        if (subIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', subIds);
          subUsers = data || [];
        }

        const repCards = await Promise.all((subAssigns || []).map(async (r) => {
          const repUser = subUsers.find(u => u.id === r.user_id);
          const { data: acctCountData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('user_id', r.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', r.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: r.user_id,
            userId: r.user_id,
            name: repUser ? `${repUser.first_name || ''} ${repUser.last_name || ''}`.trim() || repUser.email : 'Unknown',
            role: r.role_tier,
            custom_label: r.custom_label,
            accountCount: (acctCountData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setReps(repCards);

        // Get all surgeon IDs visible to this manager's team
        let visibleSurgeonIds = [];
        if (allIds.length > 0) {
          const { data: delegations } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .in('user_id', allIds);
          visibleSurgeonIds = [...new Set((delegations || []).map(d => d.surgeon_id))];
        }
        setTotalAccounts(visibleSurgeonIds.length);

        // Fetch full surgeon data for inline display + stage counts
        if (visibleSurgeonIds.length > 0) {
          const { data: surgeons } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, npi, buying_stage, forecast_close_date')
            .in('id', visibleSurgeonIds)
            .order('forecast_close_date', { ascending: true, nullsFirst: false });

          setAllSurgeons(surgeons || []);

          const counts = {};
          BUYING_STAGES.forEach(s => { counts[s.key] = 0; });
          (surgeons || []).forEach(s => {
            if (s.buying_stage && counts[s.buying_stage] !== undefined) {
              counts[s.buying_stage]++;
            }
          });
          setStageCounts(counts);

          // Fetch enrichment data in parallel
          const [callsRes, delegationsRes, cptDataRes, cptPricesRes] = await Promise.all([
            supabase.from('call_logs')
              .select('surgeon_id, call_date, summary, buying_stage_update, user_id, rep:users!call_logs_user_id_fkey(first_name, last_name)')
              .in('surgeon_id', visibleSurgeonIds)
              .order('call_date', { ascending: false }),
            supabase.from('account_delegations')
              .select('surgeon_id, user_id, rep:users!user_id(first_name, last_name)')
              .in('surgeon_id', visibleSurgeonIds),
            supabase.from('surgeon_cpt_data')
              .select('surgeon_id, cpt_code, cpt_description, annual_volume')
              .in('surgeon_id', visibleSurgeonIds),
            supabase.from('cpt_prices').select('cpt_code, average_price'),
          ]);

          const callData = callsRes.data || [];
          const repUserIds = [...new Set(callData.map(c => c.user_id).filter(Boolean))];
          let roleMap = {};
          if (repUserIds.length > 0) {
            const { data: hData } = await supabase
              .from('hierarchy_assignments')
              .select('user_id, role_tier, parent_user_id')
              .in('user_id', repUserIds);
            const parentIds = [...new Set((hData || []).map(h => h.parent_user_id).filter(Boolean))];
            let parentUsers = {};
            if (parentIds.length > 0) {
              const { data: pUsers } = await supabase.from('users').select('id, first_name, last_name').in('id', parentIds);
              (pUsers || []).forEach(u => { parentUsers[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim(); });
            }
            (hData || []).forEach(h => { roleMap[h.user_id] = { role: h.role_tier, managerName: parentUsers[h.parent_user_id] || null }; });
          }

          const callMap = {};
          callData.forEach(c => {
            if (!callMap[c.surgeon_id]) {
              const info = roleMap[c.user_id] || {};
              callMap[c.surgeon_id] = { ...c, repRole: info.role, managerName: info.managerName };
            }
          });
          setLatestCallMap(callMap);

          // Enrich each delegation rep with their manager name so the search bar can match on manager.
          const delegationRepIds = [...new Set((delegationsRes.data || []).map(d => d.user_id).filter(Boolean))];
          const repIdsNeedingManager = delegationRepIds.filter(id => !roleMap[id]);
          if (repIdsNeedingManager.length > 0) {
            const { data: hData2 } = await supabase
              .from('hierarchy_assignments')
              .select('user_id, role_tier, parent_user_id')
              .in('user_id', repIdsNeedingManager);
            const parentIds2 = [...new Set((hData2 || []).map(h => h.parent_user_id).filter(Boolean))];
            let parentUsers2 = {};
            if (parentIds2.length > 0) {
              const { data: pUsers2 } = await supabase.from('users').select('id, first_name, last_name').in('id', parentIds2);
              (pUsers2 || []).forEach(u => { parentUsers2[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim(); });
            }
            (hData2 || []).forEach(h => { roleMap[h.user_id] = { role: h.role_tier, managerName: parentUsers2[h.parent_user_id] || null }; });
          }
          const rMap = {};
          (delegationsRes.data || []).forEach(d => {
            if (!rMap[d.surgeon_id]) {
              const info = roleMap[d.user_id] || {};
              rMap[d.surgeon_id] = d.rep ? { ...d.rep, managerName: info.managerName || null } : null;
            }
          });
          setRepMap(rMap);

          const cMap = {};
          (cptDataRes.data || []).forEach(c => {
            if (!cMap[c.surgeon_id]) cMap[c.surgeon_id] = [];
            cMap[c.surgeon_id].push(c);
          });
          setCptMap(cMap);

          const pMap = {};
          (cptPricesRes.data || []).forEach(p => { if (p.average_price != null) pMap[p.cpt_code] = parseFloat(p.average_price); });
          setCptPriceMap(pMap);
        }

        // Unassigned accounts (delegated to manager but not to any rep)
        const { data: myDelegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('user_id', user.id);

        const myAccountIds = (myDelegations || []).map(d => d.surgeon_id);
        const repIds = (subAssigns || []).filter(s => s.role_tier === 'rep').map(s => s.user_id);
        if (myAccountIds.length > 0) {
          let subDelegations = [];
          if (repIds.length > 0) {
            const { data } = await supabase
              .from('account_delegations')
              .select('surgeon_id')
              .in('user_id', repIds);
            subDelegations = data || [];
          }

          const subDelegatedIds = new Set((subDelegations || []).map(d => d.surgeon_id));
          const unassignedIds = myAccountIds.filter(id => !subDelegatedIds.has(id));

          if (unassignedIds.length > 0) {
            const { data: surgeons } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty')
              .in('id', unassignedIds.slice(0, 50));
            setUnassignedAccounts(surgeons || []);
          } else {
            setUnassignedAccounts([]);
          }
        }

        // Calls this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (allIds.length > 0) {
          const { data: callCountData } = await supabase
            .from('call_logs')
            .select('id')
            .in('user_id', allIds)
            .gte('call_date', weekAgo.toISOString());
          setCallsThisWeek((callCountData || []).length);
        }

      } catch (err) {
        console.error('[ManagerDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id, getTeamIds]);

  // When team filter changes, resolve which surgeon IDs are visible
  useEffect(() => {
    if (!teamFilterIds) {
      setFilteredSurgeonIds(null);
      return;
    }
    const resolve = async () => {
      const { data } = await supabase
        .from('account_delegations')
        .select('surgeon_id')
        .in('user_id', teamFilterIds);
      setFilteredSurgeonIds(new Set((data || []).map(d => d.surgeon_id)));
    };
    resolve();
  }, [teamFilterIds]);

  const displaySurgeons = filteredSurgeonIds
    ? allSurgeons.filter(s => filteredSurgeonIds.has(s.id))
    : allSurgeons;

  const displayStageCounts = {};
  BUYING_STAGES.forEach(s => { displayStageCounts[s.key] = 0; });
  let notStagedCount = 0;
  displaySurgeons.forEach(s => {
    if (s.buying_stage && displayStageCounts[s.buying_stage] !== undefined) {
      displayStageCounts[s.buying_stage]++;
    } else {
      notStagedCount++;
    }
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <h2 style={styles.pageTitle}>Team Overview</h2>
          <div style={styles.headerStats}>
            <span style={styles.headerStat}>{totalAccounts} accounts</span>
            <span style={styles.headerStatDot} />
            <span style={styles.headerStat}>{callsThisWeek} calls (7d)</span>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', backgroundColor: '#1e3a8a',
            color: '#ffffff', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '600',
            cursor: exporting ? 'wait' : 'pointer',
            opacity: exporting ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Team Filter */}
      <TeamFilter userId={user.id} role="manager" onFilterChange={(ids) => setTeamFilterIds(ids)} />

      {/* Not Staged - wide button */}
      <button
        onClick={() => setSelectedStage(selectedStage === 'Not Staged' ? null : 'Not Staged')}
        style={{
          ...styles.notStagedBtn,
          backgroundColor: selectedStage === 'Not Staged' ? '#64748b' : '#f8fafc',
          color: selectedStage === 'Not Staged' ? '#ffffff' : '#64748b',
          border: selectedStage === 'Not Staged' ? '1px solid #64748b' : '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: '700' }}>{notStagedCount}</span>
        <span style={{ fontSize: '12px', fontWeight: '600' }}>Not Staged</span>
      </button>

      {/* Buying Stage Tiles */}
      <div style={styles.stageGrid}>
        {BUYING_STAGES.map(stage => {
          const count = displayStageCounts[stage.key] || 0;
          const isSelected = selectedStage === stage.key;
          return (
            <button
              key={stage.key}
              onClick={() => setSelectedStage(isSelected ? null : stage.key)}
              style={{
                ...styles.stageTile,
                backgroundColor: isSelected ? stage.color : stage.bg,
                border: `1px solid ${isSelected ? stage.color : '#e2e8f0'}`,
              }}
            >
              <span style={{
                ...styles.stageCount,
                color: isSelected ? '#ffffff' : stage.color,
              }}>
                {count}
              </span>
              <span style={{
                ...styles.stageLabel,
                color: isSelected ? '#ffffff' : '#475569',
              }}>
                {stage.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by surgeon, rep, manager, city, NPI..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={styles.searchInput}
      />

      {/* Inline Account List */}
      {(() => {
        const q = searchQuery.toLowerCase();
        const filtered = displaySurgeons.filter(s => {
          if (selectedStage === 'Not Staged' && s.buying_stage) return false;
          if (selectedStage && selectedStage !== 'Not Staged' && s.buying_stage !== selectedStage) return false;
          if (q) {
            const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`);
            const rep = repMap[s.id];
            const repName = rep ? `${rep.first_name || ''} ${rep.last_name || ''}` : '';
            const managerName = rep?.managerName || '';
            const searchable = `${name} ${repName} ${managerName} ${s.city || ''} ${s.state || ''} ${s.npi || ''} ${s.specialty || ''}`.toLowerCase();
            if (!searchable.includes(q)) return false;
          }
          return true;
        });

        if ((selectedStage || q) && filtered.length > 0) {
          return (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.sectionTitle}>
                  {selectedStage || 'Search Results'} ({filtered.length})
                </span>
                {selectedStage && (
                  <button onClick={() => setSelectedStage(null)} style={{ border: 'none', background: 'none', color: '#1e3a8a', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Clear</button>
                )}
              </div>
              <div style={styles.cardList}>
                {filtered.slice(0, 50).map(s => (
                  <AccountCard
                    key={s.id}
                    surgeon={s}
                    latestCall={latestCallMap[s.id]}
                    assignedRep={repMap[s.id]}
                    cptData={cptMap[s.id]}
                    cptPriceMap={cptPriceMap}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </div>
          );
        }
        if ((selectedStage || q) && filtered.length === 0) {
          return <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>No accounts found</div>;
        }
        return null;
      })()}

      {/* Deal Review entry */}
      <button onClick={() => navigate('/field-intel/deal-review')} style={styles.dealReviewBtn}>
        Deal Review
        <span style={styles.dealReviewChevron}>›</span>
      </button>

      {/* Unassigned banner */}
      {unassignedAccounts.length > 0 && (
        <button
          onClick={() => navigate(`/field-intel/accounts?scopeTo=${user.id}`)}
          style={styles.unassignedBanner}
        >
          <div style={styles.unassignedBannerLeft}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={styles.unassignedBannerText}>
              <span style={styles.unassignedBannerTitle}>Assign Accounts to Reps</span>
              <span style={styles.unassignedBannerCount}>{unassignedAccounts.length} unassigned</span>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Team Cards */}
      {reps.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Team</span>
          <div style={styles.cardList}>
            {reps.map(rep => (
              <PersonCard key={rep.id} person={rep} clickable={false} />
            ))}
          </div>
        </div>
      )}

      <div style={{ height: '24px' }} />

      <ExportProgressModal
        open={exportModalOpen}
        phase={exportProgress.phase}
        count={exportProgress.count}
        error={exportError}
        onClose={() => setExportModalOpen(false)}
      />
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
    gap: '16px',
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
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  headerStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerStat: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  headerStatDot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: '#cbd5e1',
  },
  notStagedBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  stageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  stageTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '12px 8px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  stageCount: {
    fontSize: '22px',
    fontWeight: '700',
  },
  stageLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  dealReviewBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dealReviewChevron: {
    fontSize: '20px',
    fontWeight: '400',
    color: '#94a3b8',
    lineHeight: 1,
  },
  unassignedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  unassignedBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  unassignedBannerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  unassignedBannerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  unassignedBannerCount: {
    fontSize: '12px',
    color: '#d97706',
    fontWeight: '500',
  },
};

export default ManagerDashboard;
