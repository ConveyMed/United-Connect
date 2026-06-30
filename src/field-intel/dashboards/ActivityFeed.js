import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFieldIntel } from '../FieldIntelContext';
import { useFieldIntelNotifications } from '../../context/FieldIntelNotificationsContext';
import { supabase } from '../../config/supabase';
import AccountCard from '../AccountCard';

const safeDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (str.length === 10) return new Date(str + 'T12:00:00');
  return new Date(str);
};

const TIME_FILTERS = [
  { key: '7', label: '7 days' },
  { key: '14', label: '14 days' },
  { key: '30', label: '30 days' },
  { key: 'all', label: 'All' },
];

const ActivityFeed = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const { isUnread, markRead, markAllRead, totalUnread } = useFieldIntelNotifications();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [surgeonMap, setSurgeonMap] = useState({});
  const [latestCallMap, setLatestCallMap] = useState({});
  const [repMap, setRepMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});
  const [displayCount, setDisplayCount] = useState(20);
  const [timeFilter, setTimeFilter] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const prevTotalUnreadRef = useRef(totalUnread);

  useEffect(() => {
    if (!user?.id || !role) return;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        // Bug 12 fix: scope by SURGEON ASSIGNMENT (accounts I or my tree are delegated to),
        // not by call author. The notification feed is about teammate activity on my accounts.
        let userIds = [user.id];
        if (role === 'manager') {
          const { data: repAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'rep');
          userIds = [...userIds, ...(repAssigns || []).map(r => r.user_id)];
        } else if (role === 'vp') {
          const { data: mgrAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'manager');
          const mgrIds = (mgrAssigns || []).map(m => m.user_id);
          userIds = [...userIds, ...mgrIds];
          if (mgrIds.length > 0) {
            const { data: repAssigns } = await supabase
              .from('hierarchy_assignments')
              .select('user_id')
              .in('parent_user_id', mgrIds)
              .eq('role_tier', 'rep');
            userIds = [...userIds, ...(repAssigns || []).map(r => r.user_id)];
          }
        } else if (role === 'admin') {
          userIds = null;
        }

        // Resolve surgeon IDs from delegations for non-admin roles.
        let surgeonIds = null;
        if (userIds) {
          const { data: dels } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .in('user_id', userIds);
          surgeonIds = [...new Set((dels || []).map(d => d.surgeon_id))];
          if (surgeonIds.length === 0) {
            setCalls([]); setSurgeonMap({}); setLatestCallMap({});
            setRepMap({}); setCptMap({}); setCptPriceMap({});
            setLoading(false);
            return;
          }
        }

        let query = supabase
          .from('call_logs')
          .select('*, surgeon:surgeons(id, full_name, first_name, last_name, city, state, npi, specialty, buying_stage, forecast_close_date), rep:users!call_logs_user_id_fkey(first_name, last_name)')
          .order('call_date', { ascending: false })
          .limit(200);
        if (surgeonIds) {
          query = query.in('surgeon_id', surgeonIds);
        }

        const { data, error } = await query;
        const rawCalls = (!error && data) ? data : [];

        // Build surgeon map + collect rep user IDs
        const sMap = {};
        const repUserIds = new Set();
        rawCalls.forEach(c => {
          if (c.surgeon) sMap[c.surgeon_id] = c.surgeon;
          if (c.user_id) repUserIds.add(c.user_id);
        });
        setSurgeonMap(sMap);

        // Look up each call author's role + their manager (for search + card display)
        const repIdArr = [...repUserIds];
        let roleMap = {};
        if (repIdArr.length > 0) {
          const { data: hData } = await supabase
            .from('hierarchy_assignments')
            .select('user_id, role_tier, parent_user_id')
            .in('user_id', repIdArr);
          const parentIds = [...new Set((hData || []).map(h => h.parent_user_id).filter(Boolean))];
          let parentUsers = {};
          if (parentIds.length > 0) {
            const { data: pUsers } = await supabase.from('users').select('id, first_name, last_name').in('id', parentIds);
            (pUsers || []).forEach(u => { parentUsers[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim(); });
          }
          (hData || []).forEach(h => { roleMap[h.user_id] = { role: h.role_tier, managerName: parentUsers[h.parent_user_id] || null }; });
        }

        // Enrich every call with repRole + managerName so the search can match on manager names
        const callData = rawCalls.map(c => {
          const info = roleMap[c.user_id] || {};
          return { ...c, repRole: info.role, managerName: info.managerName };
        });
        setCalls(callData);

        // Latest call per surgeon (for AccountCard)
        const lcMap = {};
        callData.forEach(c => { if (!lcMap[c.surgeon_id]) lcMap[c.surgeon_id] = c; });
        setLatestCallMap(lcMap);

        // Fetch enrichment for surgeons
        const enrichSurgeonIds = Object.keys(sMap);
        if (enrichSurgeonIds.length > 0) {
          const [delegationsRes, cptDataRes, cptPricesRes] = await Promise.all([
            supabase.from('account_delegations')
              .select('surgeon_id, user_id, rep:users!user_id(first_name, last_name)')
              .in('surgeon_id', enrichSurgeonIds),
            supabase.from('surgeon_cpt_data')
              .select('surgeon_id, cpt_code, cpt_description, annual_volume')
              .in('surgeon_id', enrichSurgeonIds),
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
        }
      } catch (err) {
        console.error('[ActivityFeed] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [user?.id, role, refreshKey]);

  // Re-fetch the feed when a new unread call_log comes in (realtime via context).
  // Without this, the badge counter updated live but the feed list stayed stale until refresh.
  useEffect(() => {
    if (totalUnread > prevTotalUnreadRef.current) {
      setRefreshKey(k => k + 1);
    }
    prevTotalUnreadRef.current = totalUnread;
  }, [totalUnread]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading activity...</span>
        </div>
      </div>
    );
  }

  // Deduplicate by surgeon - one card per account, using latest call
  const deduped = (() => {
    const seen = new Set();
    const result = [];
    // calls are already sorted by call_date desc, so first hit per surgeon is latest
    for (const call of calls) {
      if (!call.surgeon_id || seen.has(call.surgeon_id)) continue;
      // Time filter
      if (timeFilter !== 'all') {
        const days = parseInt(timeFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (safeDate(call.call_date) < cutoff) continue;
      }
      // Search filter — surgeon, rep (call author), manager, notes, city, NPI
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const surgeon = surgeonMap[call.surgeon_id];
        const surgeonName = surgeon ? (surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`) : '';
        const repName = call.rep ? `${call.rep.first_name || ''} ${call.rep.last_name || ''}` : '';
        const managerName = call.managerName || '';
        const summary = call.summary || '';
        const haystack = `${surgeonName} ${repName} ${managerName} ${summary} ${surgeon?.city || ''} ${surgeon?.npi || ''}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      seen.add(call.surgeon_id);
      result.push(call);
    }
    return result;
  })();

  const visible = deduped.slice(0, displayCount);
  const hasMore = deduped.length > displayCount;

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.pageTitle}>Activity Feed</h2>
        {totalUnread > 0 && (
          <button onClick={markAllRead} style={styles.markAllBtn}>
            Mark all read ({totalUnread})
          </button>
        )}
      </div>

      {/* Time filter pills */}
      <div style={styles.filterRow}>
        {TIME_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setTimeFilter(f.key); setDisplayCount(20); }}
            style={{
              ...styles.filterPill,
              backgroundColor: timeFilter === f.key ? '#1e3a8a' : '#ffffff',
              color: timeFilter === f.key ? '#ffffff' : '#475569',
              border: timeFilter === f.key ? '1px solid #1e3a8a' : '1px solid #e2e8f0',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by surgeon, rep, manager, or notes..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setDisplayCount(20); }}
        style={styles.searchInput}
      />

      <span style={styles.countLabel}>
        {deduped.length} account{deduped.length !== 1 ? 's' : ''} with activity
      </span>

      <div style={styles.list}>
        {deduped.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={styles.emptyText}>No activity yet</span>
          </div>
        )}

        {visible.map(call => {
          const surgeon = surgeonMap[call.surgeon_id];
          if (!surgeon) return null;
          // Unread = ANY call_log for this surgeon (visible to me) is unread.
          // Tap the card → mark all of this surgeon's calls visible-and-unread as read.
          const surgeonCallIds = calls.filter(c => c.surgeon_id === call.surgeon_id).map(c => c.id);
          const unreadIdsForSurgeon = surgeonCallIds.filter(id => isUnread(id));
          const cardUnread = unreadIdsForSurgeon.length > 0;
          return (
            <AccountCard
              key={call.surgeon_id}
              surgeon={surgeon}
              latestCall={latestCallMap[call.surgeon_id]}
              assignedRep={repMap[call.surgeon_id]}
              cptData={cptMap[call.surgeon_id]}
              cptPriceMap={cptPriceMap}
              searchQuery={searchQuery}
              unread={cardUnread}
              onMarkRead={() => unreadIdsForSurgeon.forEach(id => markRead(id))}
            />
          );
        })}

        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + 20)}
            style={styles.loadMoreBtn}
          >
            Show more ({(deduped.length - displayCount)} remaining)
          </button>
        )}
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
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  markAllBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
  },
  filterPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
  countLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingBottom: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surgeonName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  date: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  repName: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  summary: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: 0,
  },
  updatesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  updateTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#a16207',
    backgroundColor: '#fefce8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  loadMoreBtn: {
    display: 'flex',
    justifyContent: 'center',
    padding: '14px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
};

export default ActivityFeed;
