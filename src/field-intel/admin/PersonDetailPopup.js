import React, { useState, useEffect } from 'react';

const ROLE_COLORS = { vp: '#7c3aed', manager: '#2563eb', rep: '#059669' };
const ROLE_LABELS = { vp: 'VP', manager: 'Manager', rep: 'Rep' };
const ROLE_ORDER = ['rep', 'manager', 'vp'];

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const getName = (user) => {
  if (!user) return 'Unknown';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
};

const PersonDetailPopup = ({
  userId,
  users,
  assignments,
  regions,
  canGoBack,
  onBack,
  onClose,
  onSave,
  onRemove,
  onPromote,
  onDemote,
  onNavigate,
  onAssign,
  accountCount = 0,
}) => {
  const user = users.find(u => u.id === userId);
  const userAssigns = assignments.filter(a => a.user_id === userId);
  const role = userAssigns[0]?.role_tier;

  // Editable state
  const [editLabel, setEditLabel] = useState(userAssigns[0]?.custom_label || '');
  const [editParentIds, setEditParentIds] = useState(
    [...new Set(userAssigns.map(a => a.parent_user_id).filter(Boolean))]
  );
  const [editRegionIds, setEditRegionIds] = useState(
    userAssigns.map(a => a.region_id).filter(Boolean)
  );
  const [saving, setSaving] = useState(false);
  const [assignStep, setAssignStep] = useState(null);

  // Reset when userId changes
  useEffect(() => {
    setEditLabel(userAssigns[0]?.custom_label || '');
    setEditParentIds([...new Set(userAssigns.map(a => a.parent_user_id).filter(Boolean))]);
    setEditRegionIds(userAssigns.map(a => a.region_id).filter(Boolean));
    setAssignStep(null);
  }, [userId]);

  // Parents
  const parentIds = [...new Set(userAssigns.map(a => a.parent_user_id).filter(Boolean))];
  const parentUsers = parentIds.map(id => {
    const u = users.find(x => x.id === id);
    const r = assignments.find(a => a.user_id === id)?.role_tier;
    return { user: u, role: r };
  }).filter(p => p.user);

  // Subordinates
  const subordinateAssigns = assignments.filter(a => a.parent_user_id === userId);
  const subUserIds = [...new Set(subordinateAssigns.map(a => a.user_id))];
  const subordinates = subUserIds.map(id => {
    const u = users.find(x => x.id === id);
    const r = subordinateAssigns.find(a => a.user_id === id)?.role_tier;
    return { user: u, role: r };
  }).filter(s => s.user);

  // Regions (VP only)
  const userRegionIds = userAssigns.map(a => a.region_id).filter(Boolean);
  const userRegions = userRegionIds.map(id => regions.find(r => r.id === id)).filter(Boolean);

  // Valid parents for editing
  const vpUsers = [...new Map(
    assignments.filter(a => a.role_tier === 'vp').map(a => [a.user_id, users.find(u => u.id === a.user_id)])
  ).entries()].filter(([, u]) => u && u.id !== userId).map(([id, u]) => ({ userId: id, user: u, role: 'vp' }));

  const managerUsers = [...new Map(
    assignments.filter(a => a.role_tier === 'manager').map(a => [a.user_id, users.find(u => u.id === a.user_id)])
  ).entries()].filter(([, u]) => u && u.id !== userId).map(([id, u]) => ({ userId: id, user: u, role: 'manager' }));

  const canPromote = role === 'rep' || role === 'manager';
  const canDemote = role === 'vp' || role === 'manager';

  const handleSave = async () => {
    setSaving(true);
    await onSave(userId, {
      role,
      label: editLabel.trim() || null,
      parentIds: role === 'vp' ? [] : editParentIds,
      regionIds: role === 'vp' ? editRegionIds : [],
    });
    setSaving(false);
  };

  if (!user) return null;

  // VP and Manager lists for parent picking during assign
  const allVpUsers = [...new Map(
    assignments.filter(a => a.role_tier === 'vp').map(a => [a.user_id, users.find(u => u.id === a.user_id)])
  ).entries()].filter(([, u]) => u).map(([id, u]) => ({ userId: id, user: u }));

  const allManagerUsers = [...new Map(
    assignments.filter(a => a.role_tier === 'manager').map(a => [a.user_id, users.find(u => u.id === a.user_id)])
  ).entries()].filter(([, u]) => u).map(([id, u]) => ({ userId: id, user: u }));

  // Unassigned user view
  if (!role) {
    const handleAssignRole = async (selectedRole, parentUserId) => {
      if (onAssign) {
        setSaving(true);
        await onAssign(userId, selectedRole, parentUserId || null);
        setSaving(false);
        onClose();
      }
    };

    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              {canGoBack && (
                <button onClick={onBack} style={styles.iconBtn}><BackIcon /></button>
              )}
              <div style={styles.headerInfo}>
                <span style={styles.headerName}>{getName(user)}</span>
                <span style={{ ...styles.headerBadge, backgroundColor: '#94a3b8' }}>Unassigned</span>
              </div>
            </div>
            <button onClick={onClose} style={styles.iconBtn}><CloseIcon /></button>
          </div>

          {user.email && (
            <span style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</span>
          )}

          <div style={styles.divider} />

          {!assignStep ? (
            <div style={styles.actions}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Assign as...</span>
              <button
                style={styles.assignBtn}
                onClick={() => handleAssignRole('vp', null)}
                disabled={saving}
              >
                <div style={{ ...styles.assignDot, backgroundColor: ROLE_COLORS.vp }} />
                VP
              </button>
              <button
                style={styles.assignBtn}
                onClick={() => {
                  if (allVpUsers.length === 0 && allManagerUsers.length === 0) {
                    handleAssignRole('manager', null);
                  } else {
                    setAssignStep('manager');
                  }
                }}
                disabled={saving}
              >
                <div style={{ ...styles.assignDot, backgroundColor: ROLE_COLORS.manager }} />
                Manager
              </button>
              <button
                style={styles.assignBtn}
                onClick={() => {
                  if (allManagerUsers.length === 0 && allVpUsers.length === 0) {
                    handleAssignRole('rep', null);
                  } else {
                    setAssignStep('rep');
                  }
                }}
                disabled={saving}
              >
                <div style={{ ...styles.assignDot, backgroundColor: ROLE_COLORS.rep }} />
                Rep
              </button>
              <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <div style={styles.actions}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                {assignStep === 'manager' ? 'Reports to which VP or Manager?' : 'Reports to which Manager?'}
              </span>
              <div style={styles.checkboxList}>
                {(assignStep === 'manager' ? [...allVpUsers, ...allManagerUsers] : [...allManagerUsers, ...allVpUsers]).map(p => (
                  <button
                    key={p.userId}
                    onClick={() => handleAssignRole(assignStep, p.userId)}
                    disabled={saving}
                    style={styles.pickerRow}
                  >
                    <div style={{ ...styles.assignDot, backgroundColor: ROLE_COLORS[assignStep === 'manager' ? 'vp' : 'manager'] }} />
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{getName(p.user)}</span>
                  </button>
                ))}
              </div>
              <button
                style={styles.assignBtn}
                onClick={() => handleAssignRole(assignStep, null)}
                disabled={saving}
              >
                No parent (standalone)
              </button>
              <button onClick={() => setAssignStep(null)} style={styles.cancelBtn}>Back</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {canGoBack && (
              <button onClick={onBack} style={styles.iconBtn}>
                <BackIcon />
              </button>
            )}
            <div style={styles.headerInfo}>
              <span style={styles.headerName}>{getName(user)}</span>
              <span style={{ ...styles.headerBadge, backgroundColor: ROLE_COLORS[role] }}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={styles.iconBtn}>
            <CloseIcon />
          </button>
        </div>

        <div style={styles.divider} />

        {/* Reports to */}
        {parentUsers.length > 0 && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Reports to</span>
            <div style={styles.chipList}>
              {parentUsers.map(p => (
                <button
                  key={p.user.id}
                  onClick={() => onNavigate(p.user.id)}
                  style={styles.personChip}
                >
                  <div style={{ ...styles.chipDot, backgroundColor: ROLE_COLORS[p.role] }} />
                  {getName(p.user)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct reports */}
        {subordinates.length > 0 && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Direct reports ({subordinates.length})</span>
            <div style={styles.chipList}>
              {subordinates.map(s => (
                <button
                  key={s.user.id}
                  onClick={() => onNavigate(s.user.id)}
                  style={styles.personChip}
                >
                  <div style={{ ...styles.chipDot, backgroundColor: ROLE_COLORS[s.role] }} />
                  {getName(s.user)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accounts */}
        {accountCount > 0 && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Accounts</span>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>
              {accountCount} assigned
            </span>
          </div>
        )}

        {/* Regions (VP) */}
        {role === 'vp' && userRegions.length > 0 && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Regions</span>
            <div style={styles.chipList}>
              {userRegions.map(r => (
                <span key={r.id} style={styles.regionChip}>{r.name}</span>
              ))}
            </div>
          </div>
        )}

        <div style={styles.divider} />

        {/* Edit: Custom label */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Custom Label</label>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="e.g. Regional VP - West"
            style={styles.input}
          />
        </div>

        {/* Edit: Parent assignment (rep/manager) */}
        {(role === 'rep' || role === 'manager') && (
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Reports to {role === 'manager' ? '(VPs / Managers)' : '(Managers / VPs)'}
            </label>
            <div style={styles.checkboxList}>
              {(role === 'manager' ? [...vpUsers, ...managerUsers.filter(m => m.userId !== userId)] : [...vpUsers, ...managerUsers]).map(parent => {
                const checked = editParentIds.includes(parent.userId);
                return (
                  <button
                    key={parent.userId}
                    onClick={() => {
                      if (checked) {
                        setEditParentIds(editParentIds.filter(id => id !== parent.userId));
                      } else {
                        setEditParentIds([...editParentIds, parent.userId]);
                      }
                    }}
                    style={styles.checkboxRow}
                  >
                    <div style={{
                      ...styles.checkbox,
                      ...(checked ? styles.checkboxChecked : {}),
                    }}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={styles.checkboxLabel}>{getName(parent.user)}</span>
                    <span style={{ ...styles.miniRoleBadge, backgroundColor: ROLE_COLORS[parent.role] }}>
                      {ROLE_LABELS[parent.role]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit: Region assignment (VP) */}
        {role === 'vp' && (
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Regions</label>
            <div style={styles.checkboxList}>
              {regions.map(r => {
                const checked = editRegionIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (checked) {
                        setEditRegionIds(editRegionIds.filter(id => id !== r.id));
                      } else {
                        setEditRegionIds([...editRegionIds, r.id]);
                      }
                    }}
                    style={styles.checkboxRow}
                  >
                    <div style={{
                      ...styles.checkbox,
                      ...(checked ? styles.checkboxChecked : {}),
                    }}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={styles.checkboxLabel}>{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={styles.divider} />

        {/* Actions */}
        <div style={styles.actions}>
          {canPromote && (
            <button
              onClick={() => onPromote(userId)}
              style={styles.promoteBtn}
            >
              Promote to {ROLE_LABELS[ROLE_ORDER[ROLE_ORDER.indexOf(role) + 1]]}
            </button>
          )}
          {canDemote && (
            <button
              onClick={() => onDemote(userId)}
              style={styles.demoteBtn}
            >
              Demote to {ROLE_LABELS[ROLE_ORDER[ROLE_ORDER.indexOf(role) - 1]]}
            </button>
          )}
          <button onClick={() => onRemove(userId)} style={styles.removeBtn}>
            Unassign
          </button>
          <div style={styles.actionRow}>
            <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },
  headerBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  iconBtn: {
    padding: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  personChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b',
  },
  chipDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  regionChip: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#1e3a8a',
    border: '2px solid #1e3a8a',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  miniRoleBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '1px 5px',
    borderRadius: '3px',
    letterSpacing: '0.5px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  promoteBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  demoteBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fffbeb',
    color: '#b45309',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  removeBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  assignBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  assignDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  pickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
};

export default PersonDetailPopup;
