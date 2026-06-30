import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const RegionManager = () => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const regionsRes = await supabase.from('regions').select('*').order('name');
      const regionData = regionsRes.data || [];

      const regionSummaries = await Promise.all(regionData.map(async (region) => {
        const [vpRes, countRes] = await Promise.all([
          supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('region_id', region.id)
            .eq('role_tier', 'vp')
            .limit(1),
          supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .eq('region_id', region.id),
        ]);

        let vpName = 'No VP assigned';
        let vpUserId = null;
        if (vpRes.data?.[0]) {
          vpUserId = vpRes.data[0].user_id;
          const { data: vpUser } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', vpUserId)
            .single();
          if (vpUser) {
            vpName = `${vpUser.first_name || ''} ${vpUser.last_name || ''}`.trim() || 'Unknown';
          }
        }

        return {
          ...region,
          vpName,
          vpUserId,
          accountCount: (countRes.data || []).length,
        };
      }));

      setRegions(regionSummaries);
    } catch (err) {
      console.error('[RegionManager] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingRegion(null);
    setFormName('');
    setFormDescription('');
    setShowModal(true);
  };

  const openEdit = (region) => {
    setEditingRegion(region);
    setFormName(region.name);
    setFormDescription(region.description || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    if (editingRegion) {
      const { error } = await supabase
        .from('regions')
        .update({ name: formName.trim(), description: formDescription.trim() || null })
        .eq('id', editingRegion.id);
      if (error) {
        console.error('[RegionManager] Update error:', error);
        alert('Failed to update region: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('regions')
        .insert({ name: formName.trim(), description: formDescription.trim() || null });
      if (error) {
        console.error('[RegionManager] Insert error:', error);
        alert('Failed to create region: ' + error.message);
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('regions').delete().eq('id', id);
    if (error) {
      console.error('[RegionManager] Delete error:', error);
      alert('Failed to delete region: ' + error.message);
    }
    setDeleteConfirmId(null);
    fetchData();
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/field-intel')} style={styles.backBtn}>
          <ArrowLeftIcon />
        </button>
        <h2 style={styles.title}>Regions</h2>
        <button onClick={openCreate} style={styles.addBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Region
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      ) : regions.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span style={styles.emptyTitle}>No regions yet</span>
          <span style={styles.emptyText}>Create your first region to start organizing territories</span>
        </div>
      ) : (
        <div style={styles.list}>
          {regions.map((region) => (
            <div
              key={region.id}
              style={styles.card}
              onClick={() => region.vpUserId ? navigate(`/field-intel/drill/${region.vpUserId}`) : null}
            >
              <div style={styles.cardBody}>
                <div style={styles.cardNameRow}>
                  <span style={styles.cardName}>{region.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(region); }}
                    style={styles.editBtn}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <span style={styles.vpName}>{region.vpName}</span>
                {region.description && (
                  <span style={styles.cardDesc}>{region.description}</span>
                )}
              </div>
              <div style={styles.cardRight}>
                <span style={styles.accountCount}>{region.accountCount}</span>
                {deleteConfirmId === region.id ? (
                  <div style={styles.deleteConfirm}>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(region.id); }} style={styles.confirmYes}>Yes</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} style={styles.confirmNo}>No</button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(region.id); }} style={styles.deleteBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
                <ArrowRightIcon />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingRegion ? 'Edit Region' : 'New Region'}
            </h3>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Region Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Southwest"
                style={styles.input}
                autoFocus
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Description (optional)</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description"
                style={styles.input}
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!formName.trim() || saving}
                style={{
                  ...styles.saveBtn,
                  opacity: !formName.trim() || saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : editingRegion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 0',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    maxWidth: '260px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  cardBody: {
    flex: 1,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  cardNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  editBtn: {
    padding: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  vpName: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  accountCount: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  cardDesc: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  deleteBtn: {
    padding: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  deleteConfirm: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  confirmYes: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmNo: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
  },
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
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
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
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  cancelBtn: {
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
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default RegionManager;
