import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import DrillDownBreadcrumb from './DrillDownBreadcrumb';
import PersonCard from './PersonCard';
import AccountCard from './AccountCard';

const BUYING_STAGES = [
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
];

const DrillDownView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState(null);
  const [role, setRole] = useState(null);
  const [trail, setTrail] = useState([]);
  const [subordinates, setSubordinates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [callsThisWeek, setCallsThisWeek] = useState(0);
  const [selectedStage, setSelectedStage] = useState(null);
  const [latestCallMap, setLatestCallMap] = useState({});
  const [repMap, setRepMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});
  const [allVisibleSurgeons, setAllVisibleSurgeons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getUserName = (user) => {
    if (!user) return 'Unknown';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
  };

  const buildBreadcrumbTrail = useCallback(async (currentUserId) => {
    const crumbs = [];
    let currentId = currentUserId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const { data: assignment } = await supabase
        .from('hierarchy_assignments')
        .select('user_id, role_tier, parent_user_id, region_id')
        .eq('user_id', currentId)
        .limit(1)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', currentId)
        .single();

      if (user) {
        crumbs.unshift({
          userId: currentId,
          name: getUserName(user),
          role: assignment?.role_tier || 'user',
        });
      }

      if (assignment?.parent_user_id) {
        currentId = assignment.parent_user_id;
      } else if (assignment?.region_id) {
        const { data: region } = await supabase
          .from('regions')
          .select('id, name')
          .eq('id', assignment.region_id)
          .single();

        if (region) {
          crumbs.unshift({
            userId: null,
            name: region.name,
            role: 'region',
          });
        }
        break;
      } else {
        break;
      }
    }

    return crumbs;
  }, []);

  // Collect all team user IDs recursively (for fetching scoped data)
  const getTeamIds = useCallback(async (rootId, rootRole) => {
    const ids = [];
    if (rootRole === 'rep') return [rootId];

    // Get direct reports
    const { data: directReports } = await supabase
      .from('hierarchy_assignments')
      .select('user_id, role_tier')
      .eq('parent_user_id', rootId);

    if (!directReports) return [rootId];

    for (const report of directReports) {
      ids.push(report.user_id);
      if (report.role_tier === 'manager') {
        const subIds = await getTeamIds(report.user_id, 'manager');
        ids.push(...subIds);
      }
    }

    return ids;
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId || userId === 'null') return;
    setLoading(true);

    try {
      // Get user info
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      setPerson(userInfo);

      // Get hierarchy assignment
      const { data: assignments } = await supabase
        .from('hierarchy_assignments')
        .select('*')
        .eq('user_id', userId);

      const assignment = assignments?.[0];
      const userRole = assignment?.role_tier || null;
      setRole(userRole);

      // Build breadcrumb trail
      const crumbs = await buildBreadcrumbTrail(userId);
      setTrail(crumbs);

      // Get all team member IDs for scoped queries
      const teamIds = await getTeamIds(userId, userRole);
      const allIds = [userId, ...teamIds];

      // Get all surgeons visible to this user's team (via delegations)
      let visibleSurgeonIds = [];
      if (allIds.length > 0) {
        const { data: delegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .in('user_id', allIds);
        visibleSurgeonIds = [...new Set((delegations || []).map(d => d.surgeon_id))];
      }

      // For VP, also include region-level accounts
      if (userRole === 'vp') {
        const regionIds = (assignments || []).map(a => a.region_id).filter(Boolean);
        if (regionIds.length > 0) {
          const { data: srData } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .in('region_id', regionIds);
          const regionSurgeonIds = (srData || []).map(r => r.surgeon_id);
          visibleSurgeonIds = [...new Set([...visibleSurgeonIds, ...regionSurgeonIds])];
        }
      }

      // Fetch full surgeon data + enrichment
      if (visibleSurgeonIds.length > 0) {
        const [surgeonsRes, callsRes, delegationsRes, cptDataRes, cptPricesRes] = await Promise.all([
          supabase.from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, npi, buying_stage, forecast_close_date')
            .in('id', visibleSurgeonIds)
            .order('forecast_close_date', { ascending: true, nullsFirst: false }),
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

        const surgeons = surgeonsRes.data || [];
        setAllVisibleSurgeons(surgeons);

        const counts = {};
        BUYING_STAGES.forEach(s => { counts[s.key] = 0; });
        let noStage = 0;
        surgeons.forEach(s => {
          if (s.buying_stage && counts[s.buying_stage] !== undefined) {
            counts[s.buying_stage]++;
          } else {
            noStage++;
          }
        });
        counts['Not Staged'] = noStage;
        setStageCounts(counts);

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

        const cllMap = {};
        callData.forEach(c => {
          if (!cllMap[c.surgeon_id]) {
            const info = roleMap[c.user_id] || {};
            cllMap[c.surgeon_id] = { ...c, repRole: info.role, managerName: info.managerName };
          }
        });
        setLatestCallMap(cllMap);

        const rMap = {};
        (delegationsRes.data || []).forEach(d => { if (!rMap[d.surgeon_id]) rMap[d.surgeon_id] = d.rep; });
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

      // Subordinates
      if (userRole === 'vp' || userRole === 'manager') {
        const subRole = userRole === 'vp' ? 'manager' : 'rep';
        // Also get managers under VP, or reps + sub-managers under manager
        const { data: subAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', userId);

        const subIds = (subAssigns || []).map(s => s.user_id);
        let subUsers = [];
        if (subIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', subIds);
          subUsers = data || [];
        }

        const subs = await Promise.all((subAssigns || []).map(async (s) => {
          const subUser = subUsers.find(u => u.id === s.user_id);
          const { data: acctData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('user_id', s.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', s.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: s.user_id,
            userId: s.user_id,
            name: getUserName(subUser),
            role: s.role_tier,
            custom_label: s.custom_label,
            accountCount: (acctData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setSubordinates(subs);

        // Unassigned accounts
        if (userRole === 'vp') {
          const regionIds = (assignments || []).map(a => a.region_id).filter(Boolean);
          if (regionIds.length > 0) {
            const { data: srData } = await supabase
              .from('surgeon_regions')
              .select('surgeon_id')
              .in('region_id', regionIds);
            const surgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];
            if (surgeonIds.length > 0) {
              const { data: delegated } = await supabase
                .from('account_delegations')
                .select('surgeon_id')
                .in('surgeon_id', surgeonIds);
              const delegatedIds = new Set((delegated || []).map(d => d.surgeon_id));
              const unassigned = surgeonIds.filter(id => !delegatedIds.has(id));
              if (unassigned.length > 0) {
                const { data: surgeons } = await supabase
                  .from('surgeons')
                  .select('id, full_name, first_name, last_name, specialty')
                  .in('id', unassigned.slice(0, 50));
                setUnassignedAccounts(surgeons || []);
              } else {
                setUnassignedAccounts([]);
              }
            }
          }
        } else if (userRole === 'manager') {
          const { data: myDelegations } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .eq('user_id', userId);
          const mySurgeonIds = (myDelegations || []).map(d => d.surgeon_id);
          const repIds = (subAssigns || []).filter(s => s.role_tier === 'rep').map(s => s.user_id);
          if (mySurgeonIds.length > 0) {
            let subDelegations = [];
            if (repIds.length > 0) {
              const { data } = await supabase
                .from('account_delegations')
                .select('surgeon_id')
                .in('user_id', repIds);
              subDelegations = data || [];
            }
            const subDelegatedIds = new Set((subDelegations || []).map(d => d.surgeon_id));
            const unassignedIds = mySurgeonIds.filter(id => !subDelegatedIds.has(id));
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
        }
      } else if (userRole === 'rep') {
        // Rep view: show their delegated accounts
        const { data: repDelegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('user_id', userId);

        const surgeonIds = (repDelegations || []).map(d => d.surgeon_id);
        if (surgeonIds.length > 0) {
          const { data: surgeons } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, buying_stage, forecast_close_date')
            .in('id', surgeonIds)
            .order('forecast_close_date', { ascending: true, nullsFirst: false });
          setAccounts(surgeons || []);
        } else {
          setAccounts([]);
        }
        setSubordinates([]);
        setUnassignedAccounts([]);
      }

      // Calls this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (allIds.length > 0) {
        const { data: weekCalls } = await supabase
          .from('call_logs')
          .select('id')
          .in('user_id', allIds)
          .gte('call_date', weekAgo.toISOString());
        setCallsThisWeek((weekCalls || []).length);
      }

    } catch (err) {
      console.error('[DrillDownView] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, buildBreadcrumbTrail, getTeamIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>User not found</span>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  // Use allVisibleSurgeons for VP/Manager, accounts for rep
  const accountSource = (role === 'vp' || role === 'manager') ? allVisibleSurgeons : accounts;

  const filteredAccounts = (() => {
    let list = accountSource;
    if (selectedStage) {
      list = list.filter(a => {
        if (selectedStage === 'Not Staged') return !a.buying_stage;
        return a.buying_stage === selectedStage;
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => {
        const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
        const searchable = `${name} ${s.city || ''} ${s.state || ''} ${s.npi || ''} ${s.specialty || ''}`.toLowerCase();
        return searchable.includes(q);
      });
    }
    return list;
  })();

  const totalAccounts = accountSource.length;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backNavBtn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>
      <DrillDownBreadcrumb trail={trail} />

      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <h2 style={styles.personName}>{getUserName(person)}</h2>
          <div style={styles.headerStats}>
            <span style={styles.headerStat}>{totalAccounts} accounts</span>
            <span style={styles.headerStatDot} />
            <span style={styles.headerStat}>{callsThisWeek} calls (7d)</span>
          </div>
        </div>
        {role && (
          <span style={{
            ...styles.roleBadge,
            backgroundColor: role === 'vp' ? '#7c3aed' : role === 'manager' ? '#2563eb' : '#059669',
          }}>
            {role === 'vp' ? 'VP' : role === 'manager' ? 'Manager' : 'Rep'}
          </span>
        )}
      </div>

      {/* Buying Stage Tiles */}
      <div style={styles.stageGrid}>
        {BUYING_STAGES.map(stage => {
          const count = stageCounts[stage.key] || 0;
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
        placeholder="Search accounts by name, city, NPI..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={styles.searchInput}
      />

      {/* Stage filter indicator */}
      {selectedStage && (
        <div style={styles.filterBar}>
          <span style={styles.filterText}>Showing: {selectedStage}</span>
          <button onClick={() => setSelectedStage(null)} style={styles.filterClear}>Clear</button>
        </div>
      )}

      {/* Inline Account List (all roles) */}
      {(selectedStage || searchQuery) && filteredAccounts.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Accounts ({filteredAccounts.length})</span>
          <div style={styles.cardList}>
            {filteredAccounts.slice(0, 50).map(s => (
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
      )}
      {(selectedStage || searchQuery) && filteredAccounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>No accounts found</div>
      )}

      {/* Subordinates (VP/Manager view) */}
      {(role === 'vp' || role === 'manager') && subordinates.length > 0 && !selectedStage && !searchQuery && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>
            {role === 'vp' ? 'Managers' : 'Team'}
          </span>
          <div style={styles.cardList}>
            {subordinates.map(sub => (
              <PersonCard key={sub.id} person={sub} />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned banner */}
      {(role === 'vp' || role === 'manager') && unassignedAccounts.length > 0 && (
        <button
          onClick={() => navigate(`/field-intel/accounts?scopeTo=${userId}`)}
          style={styles.unassignedBanner}
        >
          <div style={styles.unassignedBannerLeft}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={styles.unassignedBannerText}>
              <span style={styles.unassignedBannerTitle}>
                {role === 'vp' ? 'Assign Accounts to Management' : 'Assign Accounts to Reps'}
              </span>
              <span style={styles.unassignedBannerCount}>{unassignedAccounts.length} unassigned</span>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <div style={{ height: '24px' }} />
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#94a3b8',
  },
  backNavBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#1e3a8a',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
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
    flex: 1,
    minWidth: 0,
  },
  personName: {
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
  roleBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '3px 8px',
    borderRadius: '5px',
    letterSpacing: '0.5px',
    flexShrink: 0,
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
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
  },
  filterText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  filterClear: {
    padding: '4px 10px',
    border: 'none',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e3a8a',
    cursor: 'pointer',
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
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  accountMeta: {
    fontSize: '12px',
    color: '#1e3a8a',
  },
  accountRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  accountStagePill: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
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

export default DrillDownView;
