import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import AccountCard from './AccountCard';

const BUYING_STAGES = [
  { key: 'All', color: '#475569', bg: '#f1f5f9' },
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
  { key: 'Not Staged', color: '#94a3b8', bg: '#f8fafc' },
];

const PipelineView = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialStage = searchParams.get('stage') || 'All';

  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [accounts, setAccounts] = useState([]);
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [repMap, setRepMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});

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
    if (!userId || userId === 'null') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get person info
        const { data: userInfo } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', userId)
          .single();

        if (userInfo) {
          setPersonName(`${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.email || 'Unknown');
        }

        // Get role
        const { data: assignment } = await supabase
          .from('hierarchy_assignments')
          .select('role_tier')
          .eq('user_id', userId)
          .limit(1)
          .single();

        const role = assignment?.role_tier || '';
        setPersonRole(role);

        // Get all team IDs
        const teamIds = await getTeamIds(userId);
        const allIds = [userId, ...teamIds];

        // Get all visible surgeon IDs
        let visibleSurgeonIds = [];

        if (role === 'vp') {
          // VP: get region-level accounts
          const { data: vpAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('region_id')
            .eq('user_id', userId);
          const regionIds = (vpAssigns || []).map(a => a.region_id).filter(Boolean);
          if (regionIds.length > 0) {
            const { data: srData } = await supabase
              .from('surgeon_regions')
              .select('surgeon_id')
              .in('region_id', regionIds);
            visibleSurgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];
          }
        }

        // Also include delegated accounts
        if (allIds.length > 0) {
          const { data: delegations } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .in('user_id', allIds);
          const delegatedIds = (delegations || []).map(d => d.surgeon_id);
          visibleSurgeonIds = [...new Set([...visibleSurgeonIds, ...delegatedIds])];
        }

        // Fetch all surgeons with their details
        if (visibleSurgeonIds.length > 0) {
          const { data: surgeons } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, buying_stage, contract_status, forecast_close_date')
            .in('id', visibleSurgeonIds)
            .order('full_name');

          // Get latest call log for each surgeon
          const { data: latestCalls } = await supabase
            .from('call_logs')
            .select('surgeon_id, call_date, summary, buying_stage_update, rep:users!call_logs_user_id_fkey(first_name, last_name)')
            .in('surgeon_id', visibleSurgeonIds)
            .in('user_id', allIds)
            .order('call_date', { ascending: false });

          // Group by surgeon, take latest
          const latestCallMap = {};
          (latestCalls || []).forEach(call => {
            if (!latestCallMap[call.surgeon_id]) {
              latestCallMap[call.surgeon_id] = call;
            }
          });

          const enriched = (surgeons || []).map(s => ({
            ...s,
            latestCall: latestCallMap[s.id] || null,
          }));

          setAccounts(enriched);

          // Fetch CPT + rep data
          const [delegationsRes, cptDataRes, cptPricesRes] = await Promise.all([
            supabase.from('account_delegations')
              .select('surgeon_id, user_id, rep:users!user_id(first_name, last_name)')
              .in('surgeon_id', visibleSurgeonIds),
            supabase.from('surgeon_cpt_data')
              .select('surgeon_id, cpt_code, cpt_description, annual_volume')
              .in('surgeon_id', visibleSurgeonIds),
            supabase.from('cpt_prices').select('cpt_code, average_price'),
          ]);

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
        } else {
          setAccounts([]);
        }
      } catch (err) {
        console.error('[PipelineView] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, getTeamIds]);

  const filteredAccounts = accounts.filter(a => {
    if (selectedStage === 'All') return true;
    if (selectedStage === 'Not Staged') return !a.buying_stage;
    return a.buying_stage === selectedStage;
  }).sort((a, b) => {
    // Sort by nearest close date first
    if (a.forecast_close_date && b.forecast_close_date) return new Date(a.forecast_close_date) - new Date(b.forecast_close_date);
    if (a.forecast_close_date) return -1;
    if (b.forecast_close_date) return 1;
    return 0;
  });

  const stageCounts = {};
  BUYING_STAGES.forEach(s => { stageCounts[s.key] = 0; });
  stageCounts['All'] = accounts.length;
  accounts.forEach(a => {
    if (a.buying_stage && stageCounts[a.buying_stage] !== undefined) {
      stageCounts[a.buying_stage]++;
    } else {
      stageCounts['Not Staged']++;
    }
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back + Title */}
      <div style={styles.topRow}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div style={styles.titleWrap}>
          <h2 style={styles.title}>Pipeline</h2>
          {personName && (
            <span style={styles.subtitle}>{personName}{personRole ? ` - ${personRole.toUpperCase()}` : ''}</span>
          )}
        </div>
      </div>

      {/* Stage Filter Chips */}
      <div style={styles.filterRow}>
        {BUYING_STAGES.map(stage => {
          const isSelected = selectedStage === stage.key;
          const count = stageCounts[stage.key] || 0;
          return (
            <button
              key={stage.key}
              onClick={() => setSelectedStage(stage.key)}
              style={{
                ...styles.filterChip,
                backgroundColor: isSelected ? stage.color : stage.bg,
                borderColor: isSelected ? stage.color : '#e2e8f0',
              }}
            >
              <span style={{
                ...styles.filterChipText,
                color: isSelected ? '#ffffff' : stage.color,
              }}>
                {stage.key}
              </span>
              <span style={{
                ...styles.filterChipCount,
                color: isSelected ? 'rgba(255,255,255,0.8)' : '#94a3b8',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <span style={styles.resultCount}>
        {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
        {selectedStage !== 'All' ? ` in ${selectedStage}` : ''}
      </span>

      {/* Account List */}
      {filteredAccounts.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>No accounts{selectedStage !== 'All' ? ` in ${selectedStage}` : ''}</span>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredAccounts.map(account => (
            <AccountCard
              key={account.id}
              surgeon={account}
              latestCall={account.latestCall}
              assignedRep={repMap[account.id]}
              cptData={cptMap[account.id]}
              cptPriceMap={cptPriceMap}
            />
          ))}
        </div>
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
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1e3a8a',
    display: 'flex',
    alignItems: 'center',
  },
  titleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  filterChipText: {
    fontSize: '12px',
    fontWeight: '600',
  },
  filterChipCount: {
    fontSize: '11px',
    fontWeight: '500',
  },
  resultCount: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#94a3b8',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  accountCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  accountTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
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
  accountSpecialty: {
    fontSize: '12px',
    color: '#1e3a8a',
  },
  accountLocation: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  accountBadges: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  stagePill: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  callInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  callMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callRep: {
    fontSize: '12px',
    color: '#475569',
    fontWeight: '500',
  },
  callDate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  callSummary: {
    fontSize: '12px',
    color: '#334155',
    lineHeight: '1.4',
  },
  forecastDate: {
    fontSize: '11px',
    color: '#d97706',
    fontWeight: '600',
  },
};

export default PipelineView;
