import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import StaleAccountIndicator from './StaleAccountIndicator';
import AccountCard from '../AccountCard';

const BUYING_STAGES = [
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
];

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RepDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [upcomingCloses, setUpcomingCloses] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [staleAccounts, setStaleAccounts] = useState([]);
  const [myAccounts, setMyAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [latestCallMap, setLatestCallMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Get accounts delegated to me
        const { data: delegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('user_id', user.id);

        const myAccountIds = (delegations || []).map(d => d.surgeon_id);

        // Fetch all my accounts for search + stage tiles
        if (myAccountIds.length > 0) {
          const { data: accounts } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, buying_stage, npi, forecast_close_date')
            .in('id', myAccountIds)
            .order('last_name');
          setMyAccounts(accounts || []);

          // Latest call per surgeon (for inline AccountCard enrichment)
          const { data: allCalls } = await supabase
            .from('call_logs')
            .select('surgeon_id, call_date, summary')
            .eq('user_id', user.id)
            .in('surgeon_id', myAccountIds)
            .order('call_date', { ascending: false });

          const callMap = {};
          (allCalls || []).forEach(c => {
            if (!callMap[c.surgeon_id]) callMap[c.surgeon_id] = c;
          });
          setLatestCallMap(callMap);

          // CPT data per surgeon + CPT price table (for AccountCard enrichment)
          const [cptDataRes, cptPricesRes] = await Promise.all([
            supabase
              .from('surgeon_cpt_data')
              .select('surgeon_id, cpt_code, cpt_description, annual_volume')
              .in('surgeon_id', myAccountIds),
            supabase
              .from('cpt_prices')
              .select('cpt_code, average_price'),
          ]);

          const cMap = {};
          (cptDataRes.data || []).forEach(c => {
            if (!cMap[c.surgeon_id]) cMap[c.surgeon_id] = [];
            cMap[c.surgeon_id].push(c);
          });
          setCptMap(cMap);

          const pMap = {};
          (cptPricesRes.data || []).forEach(p => {
            if (p.average_price != null) pMap[p.cpt_code] = parseFloat(p.average_price);
          });
          setCptPriceMap(pMap);
        }

        // Recent calls — scoped to currently-assigned accounts only so historical
        // call_logs on reassigned surgeons drop off the dashboard.
        if (myAccountIds.length > 0) {
          const { data: calls } = await supabase
            .from('call_logs')
            .select('*, surgeon:surgeons(full_name, first_name, last_name)')
            .eq('user_id', user.id)
            .in('surgeon_id', myAccountIds)
            .order('call_date', { ascending: false })
            .limit(5);
          setRecentCalls(calls || []);
        } else {
          setRecentCalls([]);
        }

        // Upcoming close dates (from surgeons with forecast_close_date)
        if (myAccountIds.length > 0) {
          const thirtyDaysOut = new Date();
          thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

          const { data: closing } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, forecast_close_date')
            .in('id', myAccountIds)
            .not('forecast_close_date', 'is', null)
            .lte('forecast_close_date', thirtyDaysOut.toISOString())
            .gte('forecast_close_date', new Date().toISOString())
            .order('forecast_close_date');
          setUpcomingCloses(closing || []);

          // Stale accounts: no call_log in 14+ days
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

          const { data: recentCallData } = await supabase
            .from('call_logs')
            .select('surgeon_id, call_date')
            .eq('user_id', user.id)
            .in('surgeon_id', myAccountIds)
            .gte('call_date', fourteenDaysAgo.toISOString());

          const recentlyCalledIds = new Set((recentCallData || []).map(c => c.surgeon_id));
          const staleIds = myAccountIds.filter(id => !recentlyCalledIds.has(id));

          if (staleIds.length > 0) {
            const { data: staleSurgeons } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty')
              .in('id', staleIds.slice(0, 20));
            setStaleAccounts(staleSurgeons || []);
          } else {
            setStaleAccounts([]);
          }
        }
      } catch (err) {
        console.error('[RepDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = myAccounts.filter(a => {
      const name = (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
      const spec = (a.specialty || '').toLowerCase();
      const loc = `${a.city || ''} ${a.state || ''}`.toLowerCase();
      return name.includes(q) || spec.includes(q) || loc.includes(q);
    });
    setSearchResults(results);
  }, [searchQuery, myAccounts]);

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

  const handleSearchSelect = (surgeonId) => {
    setSearchQuery('');
    setSearchFocused(false);
    navigate(`/field-intel/dossier/${surgeonId}`);
  };

  // Stage counts (for the 7 tiles)
  const stageCounts = {};
  let notStagedCount = 0;
  myAccounts.forEach(s => {
    if (!s.buying_stage) notStagedCount++;
    else stageCounts[s.buying_stage] = (stageCounts[s.buying_stage] || 0) + 1;
  });

  // Filtered accounts when a stage is selected
  const filteredByStage = selectedStage
    ? myAccounts.filter(s =>
        selectedStage === 'Not Staged' ? !s.buying_stage : s.buying_stage === selectedStage
      )
    : [];

  return (
    <div style={styles.container}>
      {/* Search Bar */}
      <div style={styles.searchWrap}>
        <div style={{
          ...styles.searchBox,
          ...(searchFocused ? styles.searchBoxFocused : {}),
        }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Find a doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
              style={styles.clearBtn}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        {searchQuery.trim() && searchFocused && (
          <div style={styles.searchDropdown}>
            {searchResults.length === 0 ? (
              <div style={styles.searchEmpty}>No doctors found</div>
            ) : (
              searchResults.slice(0, 8).map(surgeon => {
                const name = surgeon.full_name
                  || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
                return (
                  <button
                    key={surgeon.id}
                    onMouseDown={() => handleSearchSelect(surgeon.id)}
                    style={styles.searchResult}
                  >
                    <div style={styles.searchResultInfo}>
                      <span style={styles.searchResultName}>{name}</span>
                      <span style={styles.searchResultMeta}>
                        {[surgeon.specialty, [surgeon.city, surgeon.state].filter(Boolean).join(', ')].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                    {surgeon.buying_stage && (
                      <span style={styles.searchResultStage}>{surgeon.buying_stage}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <button onClick={() => navigate('/field-intel/call-log/new')} style={styles.logCallBtn}>
        <PlusIcon /> Log Call
      </button>

      <button onClick={() => navigate('/field-intel/deal-review')} style={styles.dealReviewBtn}>
        Deal Review
        <span style={styles.dealReviewChevron}>›</span>
      </button>

      {/* Not Staged - full-width button */}
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
              <span style={{ ...styles.stageCount, color: isSelected ? '#ffffff' : stage.color }}>
                {count}
              </span>
              <span style={{ ...styles.stageLabel, color: isSelected ? '#ffffff' : '#475569' }}>
                {stage.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline accounts list when a stage is selected */}
      {selectedStage && (
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.sectionTitle}>
              {selectedStage} ({filteredByStage.length})
            </span>
            <button
              onClick={() => setSelectedStage(null)}
              style={{ border: 'none', background: 'none', color: '#1e3a8a', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          {filteredByStage.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>
              No accounts in this stage
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredByStage.slice(0, 50).map(s => (
                <AccountCard
                  key={s.id}
                  surgeon={s}
                  latestCall={latestCallMap[s.id]}
                  cptData={cptMap[s.id]}
                  cptPriceMap={cptPriceMap}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Close Dates */}
      {upcomingCloses.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Upcoming Close Dates</span>
          <div style={styles.list}>
            {upcomingCloses.map(surgeon => {
              const name = surgeon.full_name
                || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
              return (
                <button
                  key={surgeon.id}
                  onClick={() => navigate(`/field-intel/dossier/${surgeon.id}`)}
                  style={styles.row}
                >
                  <span style={styles.rowName}>{name}</span>
                  <span style={styles.rowDate}>
                    {new Date(surgeon.forecast_close_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Recent Calls</span>
          <div style={styles.list}>
            {recentCalls.map(call => {
              const surgeonName = call.surgeon
                ? (call.surgeon.full_name || `${call.surgeon.first_name || ''} ${call.surgeon.last_name || ''}`.trim())
                : 'Unknown';
              return (
                <button
                  key={call.id}
                  onClick={() => navigate(`/field-intel/dossier/${call.surgeon_id}`)}
                  style={styles.row}
                >
                  <div style={styles.rowInfo}>
                    <span style={styles.rowName}>{surgeonName}</span>
                    {call.summary && (
                      <span style={styles.rowSummary}>
                        {call.summary.length > 60 ? call.summary.slice(0, 60) + '...' : call.summary}
                      </span>
                    )}
                  </div>
                  <span style={styles.rowDate}>
                    {new Date(call.call_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stale Accounts */}
      {staleAccounts.length > 0 && (
        <div style={styles.section}>
          <div style={styles.staleTitleRow}>
            <span style={styles.sectionTitle}>Needs Attention</span>
            <StaleAccountIndicator daysSinceActivity={14} />
          </div>
          <div style={styles.list}>
            {staleAccounts.map(surgeon => {
              const name = surgeon.full_name
                || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
              return (
                <button
                  key={surgeon.id}
                  onClick={() => navigate(`/field-intel/dossier/${surgeon.id}`)}
                  style={{ ...styles.row, border: '1px solid #fde68a' }}
                >
                  <span style={styles.rowName}>{name}</span>
                  {surgeon.specialty && <span style={styles.rowMeta}>{surgeon.specialty}</span>}
                </button>
              );
            })}
          </div>
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
    gap: '16px',
  },
  searchWrap: {
    position: 'relative',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    transition: 'border-color 0.15s ease',
  },
  searchBoxFocused: {
    border: '2px solid #1e3a8a',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#1e293b',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
  },
  clearBtn: {
    padding: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 50,
    overflow: 'hidden',
    maxHeight: '360px',
    overflowY: 'auto',
  },
  searchEmpty: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#94a3b8',
  },
  searchResult: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '12px 14px',
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.1s ease',
  },
  searchResultInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  searchResultName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  searchResultMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  searchResultStage: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 8px',
    borderRadius: '4px',
    flexShrink: 0,
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
  logCallBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  staleTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
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
  rowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  rowSummary: {
    fontSize: '12px',
    color: '#64748b',
  },
  rowDate: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    flexShrink: 0,
  },
  rowMeta: {
    fontSize: '12px',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
  },
};

export default RepDashboard;
