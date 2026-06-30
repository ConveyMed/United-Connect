import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const TeamFilter = ({ userId, role, onFilterChange }) => {
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState([]);
  const [reps, setReps] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState(new Set());
  const [selectedReps, setSelectedReps] = useState(new Set());
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!userId || !role) return;
    const fetchTeam = async () => {
      if (role === 'vp') {
        // Get managers under VP
        const { data: mgrAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, custom_label')
          .eq('parent_user_id', userId)
          .eq('role_tier', 'manager');

        const mgrIds = (mgrAssigns || []).map(m => m.user_id);
        if (mgrIds.length > 0) {
          const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', mgrIds);
          const mgrs = (mgrAssigns || []).map(m => {
            const u = (users || []).find(u => u.id === m.user_id);
            return { id: m.user_id, name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown', custom_label: m.custom_label };
          });
          setManagers(mgrs);

          // Get all reps under all managers
          const { data: repAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id, parent_user_id, custom_label')
            .in('parent_user_id', mgrIds)
            .eq('role_tier', 'rep');

          const repIds = (repAssigns || []).map(r => r.user_id);
          if (repIds.length > 0) {
            const { data: repUsers } = await supabase.from('users').select('id, first_name, last_name').in('id', repIds);
            const repList = (repAssigns || []).map(r => {
              const u = (repUsers || []).find(u => u.id === r.user_id);
              return { id: r.user_id, name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown', managerId: r.parent_user_id };
            });
            setReps(repList);
          }
        }
      } else if (role === 'manager') {
        // Get reps under manager
        const { data: repAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, custom_label')
          .eq('parent_user_id', userId)
          .eq('role_tier', 'rep');

        const repIds = (repAssigns || []).map(r => r.user_id);
        if (repIds.length > 0) {
          const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', repIds);
          const repList = (repAssigns || []).map(r => {
            const u = (users || []).find(u => u.id === r.user_id);
            return { id: r.user_id, name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown', managerId: userId };
          });
          setReps(repList);
        }
      }
    };
    fetchTeam();
  }, [userId, role]);

  const toggleManager = (mgrId) => {
    const next = new Set(selectedManagers);
    if (next.has(mgrId)) {
      next.delete(mgrId);
      // Remove reps under this manager
      const nextReps = new Set(selectedReps);
      reps.filter(r => r.managerId === mgrId).forEach(r => nextReps.delete(r.id));
      setSelectedReps(nextReps);
    } else {
      next.add(mgrId);
    }
    setSelectedManagers(next);
  };

  const selectAllReps = (mgrId) => {
    const next = new Set(selectedReps);
    reps.filter(r => r.managerId === mgrId).forEach(r => next.add(r.id));
    setSelectedReps(next);
  };

  const toggleRep = (repId) => {
    const next = new Set(selectedReps);
    if (next.has(repId)) next.delete(repId);
    else next.add(repId);
    setSelectedReps(next);
  };

  const applyFilter = () => {
    const userIds = [...selectedManagers, ...selectedReps];
    if (userIds.length === 0) {
      clearFilter();
      return;
    }
    onFilterChange(userIds);
    setApplied(true);
    setOpen(false);
  };

  const clearFilter = () => {
    setSelectedManagers(new Set());
    setSelectedReps(new Set());
    setApplied(false);
    onFilterChange(null);
    setOpen(false);
  };

  // Visible reps based on selected managers (VP view)
  const visibleReps = role === 'vp'
    ? (selectedManagers.size > 0 ? reps.filter(r => selectedManagers.has(r.managerId)) : reps)
    : reps;

  const totalSelected = selectedManagers.size + selectedReps.size;

  if (role !== 'vp' && role !== 'manager') return null;
  if (managers.length === 0 && reps.length === 0) return null;

  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        ...styles.filterBtn,
        backgroundColor: applied ? '#1e3a8a' : '#ffffff',
        color: applied ? '#ffffff' : '#1e3a8a',
        border: applied ? '1px solid #1e3a8a' : '1px solid #e2e8f0',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        Filter by Role {applied && `(${totalSelected})`}
      </button>

      {open && (
        <div style={styles.panel}>
          {/* Managers (VP only) */}
          {role === 'vp' && managers.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Managers</span>
              {managers.map(mgr => {
                const isSelected = selectedManagers.has(mgr.id);
                const mgrReps = reps.filter(r => r.managerId === mgr.id);
                return (
                  <div key={mgr.id}>
                    <div style={styles.row}>
                      <button onClick={() => toggleManager(mgr.id)} style={{
                        ...styles.chip,
                        backgroundColor: isSelected ? '#dbeafe' : '#f8fafc',
                        border: isSelected ? '1px solid #1e40af' : '1px solid #e2e8f0',
                        color: isSelected ? '#1e40af' : '#475569',
                      }}>
                        {isSelected ? '+' : ''} {mgr.name}
                      </button>
                      {isSelected && mgrReps.length > 0 && (
                        <button onClick={() => selectAllReps(mgr.id)} style={styles.selectAll}>Select All Reps</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reps */}
          {visibleReps.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Reps</span>
              <div style={styles.chipGrid}>
                {visibleReps.map(rep => {
                  const isSelected = selectedReps.has(rep.id);
                  return (
                    <button key={rep.id} onClick={() => toggleRep(rep.id)} style={{
                      ...styles.chip,
                      backgroundColor: isSelected ? '#dcfce7' : '#f8fafc',
                      border: isSelected ? '1px solid #059669' : '1px solid #e2e8f0',
                      color: isSelected ? '#059669' : '#475569',
                    }}>
                      {isSelected ? '+' : ''} {rep.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={styles.actions}>
            <button onClick={clearFilter} style={styles.clearBtn}>Clear</button>
            <button onClick={applyFilter} style={styles.applyBtn}>
              Apply Filter {totalSelected > 0 ? `(${totalSelected})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  panel: {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  selectAll: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
  },
  clearBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  applyBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default TeamFilter;
