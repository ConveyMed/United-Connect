import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import { supabase } from '../config/supabase';

const DISPLAY_CHUNK = 50;

const CallLogHistory = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(DISPLAY_CHUNK);

  useEffect(() => {
    if (!user?.id || !role) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        // call_logs RLS handles visibility - just fetch all accessible
        const { data, error } = await supabase
          .from('call_logs')
          .select('*, surgeon:surgeons(full_name, first_name, last_name, specialty), rep:users!call_logs_user_id_fkey(first_name, last_name)')
          .order('call_date', { ascending: false })
          .limit(500);

        if (error) {
          // Fallback without join if FK name doesn't match
          console.warn('[CallLogHistory] Join failed, trying fallback:', error);
          const { data: fallback } = await supabase
            .from('call_logs')
            .select('*, surgeon:surgeons(full_name, first_name, last_name, specialty)')
            .order('call_date', { ascending: false })
            .limit(500);
          setLogs(fallback || []);
        } else {
          setLogs(data || []);
        }
      } catch (err) {
        console.error('[CallLogHistory] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user?.id, role]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log => {
      const surgeonName = log.surgeon
        ? (log.surgeon.full_name || `${log.surgeon.first_name || ''} ${log.surgeon.last_name || ''}`).toLowerCase()
        : '';
      const repName = log.rep
        ? `${log.rep.first_name || ''} ${log.rep.last_name || ''}`.toLowerCase()
        : '';
      return (
        surgeonName.includes(q) ||
        repName.includes(q) ||
        (log.summary && log.summary.toLowerCase().includes(q))
      );
    });
  }, [logs, searchQuery]);

  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const hasMore = filtered.length > displayCount;

  useEffect(() => {
    setDisplayCount(DISPLAY_CHUNK);
  }, [searchQuery]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading call history...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <h2 style={styles.pageTitle}>Call Log</h2>
        <button onClick={() => navigate('/field-intel/call-log/new')} style={styles.logBtn}>
          <PlusIcon /> Log Call
        </button>
      </div>

      <div style={styles.searchWrap}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Search by surgeon, rep, or summary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
            <ClearIcon />
          </button>
        )}
      </div>

      <span style={styles.countLabel}>
        {filtered.length.toLocaleString()} call{filtered.length !== 1 ? 's' : ''}
      </span>

      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={styles.emptyText}>
              {searchQuery ? 'No calls match your search' : 'No calls logged yet'}
            </span>
            {!searchQuery && (
              <button onClick={() => navigate('/field-intel/call-log/new')} style={styles.emptyBtn}>
                Log your first call
              </button>
            )}
          </div>
        )}

        {visible.map((log) => {
          const surgeonName = log.surgeon
            ? (log.surgeon.full_name || `${log.surgeon.first_name || ''} ${log.surgeon.last_name || ''}`.trim())
            : 'Unknown Surgeon';
          const repName = log.rep
            ? `${log.rep.first_name || ''} ${log.rep.last_name || ''}`.trim()
            : '';

          const updates = [];
          if (log.buying_stage_update) updates.push(`Stage: ${log.buying_stage_update}`);
          if (log.contract_status_update) updates.push(`Contract: ${log.contract_status_update}`);
          if (log.forecast_close_date_update) {
            updates.push(`Close: ${new Date(log.forecast_close_date_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
          }
          if (log.competitor_update) updates.push(`Competitor: ${log.competitor_update}`);

          return (
            <button
              key={log.id}
              onClick={() => navigate(`/field-intel/dossier/${log.surgeon_id}`)}
              style={styles.row}
            >
              <div style={styles.rowHeader}>
                <span style={styles.surgeonName}>{surgeonName}</span>
                <span style={styles.date}>
                  {new Date(log.call_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              {repName && <span style={styles.repName}>{repName}</span>}
              {log.summary && (
                <p style={styles.summary}>
                  {log.summary.length > 120 ? log.summary.slice(0, 120) + '...' : log.summary}
                </p>
              )}
              {updates.length > 0 && (
                <div style={styles.updatesRow}>
                  {updates.map((u, i) => (
                    <span key={i} style={styles.updateTag}>{u}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + DISPLAY_CHUNK)}
            style={styles.loadMoreBtn}
          >
            Show more ({(filtered.length - displayCount).toLocaleString()} remaining)
          </button>
        )}
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  logBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'transparent',
  },
  clearBtn: {
    padding: '2px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
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
  emptyBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
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
    transition: 'all 0.15s ease',
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
};

export default CallLogHistory;
