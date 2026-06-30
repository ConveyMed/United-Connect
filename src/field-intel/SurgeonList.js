import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import { supabase } from '../config/supabase';

const DISPLAY_CHUNK = 100;

const SurgeonList = () => {
  const { user } = useAuth();
  const { role, allowedRegionIds } = useFieldIntel();
  const navigate = useNavigate();

  const [surgeons, setSurgeons] = useState([]);
  const [profileIds, setProfileIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(DISPLAY_CHUNK);

  useEffect(() => {
    if (!user?.id || !role) return;

    const fetchSurgeons = async () => {
      setLoading(true);

      try {
        let surgeonData = [];

        if (role === 'admin') {
          // Admin sees all
          const { data, error } = await supabase
            .from('surgeons')
            .select('*')
            .order('full_name');
          if (error) throw error;
          surgeonData = data || [];
        } else if (role === 'rep') {
          // Reps see ONLY accounts directly delegated to them via account_delegations.
          // (Filtering by VP's regions would leak every other rep's accounts in the same VP.)
          const { data: dels } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .eq('user_id', user.id);
          const myIds = [...new Set((dels || []).map(d => d.surgeon_id))];

          if (myIds.length === 0) {
            surgeonData = [];
          } else {
            const SZ = 500;
            for (let i = 0; i < myIds.length; i += SZ) {
              const batch = myIds.slice(i, i + SZ);
              const { data, error } = await supabase
                .from('surgeons')
                .select('*')
                .in('id', batch)
                .order('full_name');
              if (error) throw error;
              surgeonData = surgeonData.concat(data || []);
            }
            surgeonData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
          }
        } else if (allowedRegionIds.length === 0) {
          // VP/Manager with no regions assigned = no surgeons
          surgeonData = [];
        } else {
          // VP/Manager: filter by VP's regions
          const { data: srData } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .in('region_id', allowedRegionIds);
          const surgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];

          if (surgeonIds.length === 0) {
            surgeonData = [];
          } else {
            // Fetch in batches to avoid URL length limits
            const SZ = 500;
            for (let i = 0; i < surgeonIds.length; i += SZ) {
              const batch = surgeonIds.slice(i, i + SZ);
              const { data, error } = await supabase
                .from('surgeons')
                .select('*')
                .in('id', batch)
                .order('full_name');
              if (error) throw error;
              surgeonData = surgeonData.concat(data || []);
            }
            surgeonData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
          }
        }

        setSurgeons(surgeonData);

        // Fetch which surgeons have AI profiles cached
        if (surgeonData.length > 0) {
          const sIds = surgeonData.map(s => s.id);
          const { data: profiles } = await supabase
            .from('physician_profiles')
            .select('surgeon_id')
            .in('surgeon_id', sIds);
          if (profiles) {
            setProfileIds(new Set(profiles.map(p => p.surgeon_id)));
          }
        }
      } catch (err) {
        console.error('[SurgeonList] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurgeons();
  }, [user?.id, role, allowedRegionIds]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return surgeons;
    const q = searchQuery.toLowerCase();
    return surgeons.filter(s => {
      const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
      return (
        name.includes(q) ||
        (s.npi && s.npi.toLowerCase().includes(q)) ||
        (s.specialty && s.specialty.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.state && s.state.toLowerCase().includes(q))
      );
    });
  }, [surgeons, searchQuery]);

  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const hasMore = filtered.length > displayCount;
  const remaining = filtered.length - displayCount;

  // Reset display count when search changes
  useEffect(() => {
    setDisplayCount(DISPLAY_CHUNK);
  }, [searchQuery]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading surgeons...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <h2 style={styles.pageTitle}>Surgeon Dossier</h2>
        <button onClick={() => navigate('/field-intel/leads/new')} style={styles.leadBtn}>
          <PlusIcon /> Submit Lead
        </button>
      </div>

      <div style={styles.searchWrap}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Search by name, NPI, specialty, city..."
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
        {filtered.length.toLocaleString()} surgeon{filtered.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </span>

      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span style={styles.emptyText}>
              {searchQuery ? 'No surgeons match your search' : 'No surgeons assigned yet'}
            </span>
          </div>
        )}

        {visible.map((surgeon) => {
          const name = surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim() || 'Unknown';
          const location = [surgeon.city, surgeon.state].filter(Boolean).join(', ');
          const hasProfile = profileIds.has(surgeon.id);

          return (
            <button
              key={surgeon.id}
              onClick={() => navigate(`/field-intel/dossier/${surgeon.id}`)}
              style={styles.row}
            >
              <div style={styles.rowInfo}>
                <div style={styles.nameRow}>
                  <span style={styles.rowName}>{name}</span>
                  {hasProfile && <span style={styles.aiDot} title="AI profile cached" />}
                </div>
                <div style={styles.rowMeta}>
                  {surgeon.specialty && <span style={styles.metaTag}>{surgeon.specialty}</span>}
                  {surgeon.buying_stage && (
                    <span style={styles.stagePill}>{surgeon.buying_stage}</span>
                  )}
                  {location && <span style={styles.metaText}>{location}</span>}
                  {surgeon.npi && <span style={styles.metaText}>NPI: {surgeon.npi}</span>}
                </div>
              </div>
              <ChevronIcon />
            </button>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + DISPLAY_CHUNK)}
            style={styles.loadMoreBtn}
          >
            Show {Math.min(remaining, DISPLAY_CHUNK).toLocaleString()} more
            <span style={styles.loadMoreHint}>
              ({remaining.toLocaleString()} remaining)
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

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

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
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
  leadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 12px',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: '1px solid #1e3a8a',
    borderRadius: '8px',
    fontSize: '12px',
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
    gap: '8px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  rowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  rowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  aiDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    flexShrink: 0,
  },
  rowMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  metaTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  stagePill: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#a16207',
    backgroundColor: '#fefce8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  metaText: {
    fontSize: '12px',
    color: '#64748b',
  },
  loadMoreBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '14px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
  loadMoreHint: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#94a3b8',
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

export default SurgeonList;
