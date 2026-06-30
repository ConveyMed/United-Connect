import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const CustomFieldManager = () => {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      setFields(data || []);
    } catch (err) {
      console.error('[CustomFields] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFields(); }, []);

  const handleToggleActive = async (field) => {
    try {
      const { error } = await supabase
        .from('custom_fields')
        .update({ is_active: !field.is_active })
        .eq('id', field.id);
      if (error) throw error;
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_active: !f.is_active } : f));
    } catch (err) {
      console.error('[CustomFields] Toggle error:', err);
    }
  };

  const handleMoveUp = async (idx) => {
    if (idx === 0) return;
    const updated = [...fields];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setFields(updated);
    await saveOrder(updated);
  };

  const handleMoveDown = async (idx) => {
    if (idx === fields.length - 1) return;
    const updated = [...fields];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setFields(updated);
    await saveOrder(updated);
  };

  const saveOrder = async (ordered) => {
    try {
      for (let i = 0; i < ordered.length; i++) {
        await supabase
          .from('custom_fields')
          .update({ sort_order: i })
          .eq('id', ordered[i].id);
      }
    } catch (err) {
      console.error('[CustomFields] Reorder error:', err);
    }
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm('Delete this field? Values will be permanently removed.')) return;
    try {
      const { error } = await supabase.from('custom_fields').delete().eq('id', fieldId);
      if (error) throw error;
      setFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {
      console.error('[CustomFields] Delete error:', err);
    }
  };

  const handleSaveField = async (fieldData) => {
    try {
      if (editingField) {
        const { error } = await supabase
          .from('custom_fields')
          .update({
            field_name: fieldData.field_name,
            field_type: fieldData.field_type,
            dropdown_options: fieldData.dropdown_options,
          })
          .eq('id', editingField.id);
        if (error) throw error;
      } else {
        const maxOrder = fields.length > 0 ? Math.max(...fields.map(f => f.sort_order || 0)) + 1 : 0;
        const { error } = await supabase
          .from('custom_fields')
          .insert({
            field_name: fieldData.field_name,
            field_type: fieldData.field_type,
            dropdown_options: fieldData.dropdown_options,
            sort_order: maxOrder,
            is_active: true,
          });
        if (error) throw error;
      }
      setShowEditor(false);
      setEditingField(null);
      fetchFields();
    } catch (err) {
      console.error('[CustomFields] Save error:', err);
      alert('Failed to save field.');
    }
  };

  const typeLabels = { text: 'Text', dropdown: 'Dropdown', date: 'Date', currency: 'Currency' };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading custom fields...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/field-intel')} style={styles.backBtn}>
        <BackIcon /> Back to Settings
      </button>

      <div style={styles.topRow}>
        <h2 style={styles.pageTitle}>Custom Fields</h2>
        <button onClick={() => { setEditingField(null); setShowEditor(true); }} style={styles.addBtn}>
          <PlusIcon /> Add Field
        </button>
      </div>

      <p style={styles.description}>
        Define custom data fields that appear on surgeon dossiers and call log forms.
      </p>

      {/* Editor Modal */}
      {showEditor && (
        <FieldEditor
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => { setShowEditor(false); setEditingField(null); }}
        />
      )}

      <div style={styles.list}>
        {fields.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span style={styles.emptyText}>No custom fields defined yet</span>
          </div>
        )}

        {fields.map((field, idx) => (
          <div key={field.id} style={{
            ...styles.card,
            ...(field.is_active ? {} : styles.cardInactive),
          }}>
            <div style={styles.cardLeft}>
              <div style={styles.reorderBtns}>
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  style={styles.arrowBtn}
                >
                  <UpIcon />
                </button>
                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === fields.length - 1}
                  style={styles.arrowBtn}
                >
                  <DownIcon />
                </button>
              </div>
              <div style={styles.cardInfo}>
                <span style={styles.fieldName}>{field.field_name}</span>
                <div style={styles.fieldMeta}>
                  <span style={styles.typeBadge}>{typeLabels[field.field_type] || field.field_type}</span>
                  {!field.is_active && <span style={styles.inactiveBadge}>Hidden</span>}
                  {field.field_type === 'dropdown' && field.dropdown_options && (
                    <span style={styles.optionCount}>
                      {field.dropdown_options.length} option{field.dropdown_options.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={styles.cardActions}>
              <button
                onClick={() => handleToggleActive(field)}
                style={styles.toggleBtn}
                title={field.is_active ? 'Hide field' : 'Show field'}
              >
                {field.is_active ? <EyeIcon /> : <EyeOffIcon />}
              </button>
              <button
                onClick={() => { setEditingField(field); setShowEditor(true); }}
                style={styles.editBtn}
              >
                <EditIcon />
              </button>
              <button onClick={() => handleDelete(field.id)} style={styles.deleteBtn}>
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FieldEditor = ({ field, onSave, onCancel }) => {
  const [name, setName] = useState(field?.field_name || '');
  const [type, setType] = useState(field?.field_type || 'text');
  const [options, setOptions] = useState(
    field?.dropdown_options ? field.dropdown_options.join('\n') : ''
  );

  const handleSave = () => {
    if (!name.trim()) return;
    const data = {
      field_name: name.trim(),
      field_type: type,
      dropdown_options: type === 'dropdown'
        ? options.split('\n').map(o => o.trim()).filter(Boolean)
        : null,
    };
    onSave(data);
  };

  return (
    <div style={styles.editorCard}>
      <h3 style={styles.editorTitle}>{field ? 'Edit Field' : 'New Field'}</h3>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Field Name *</label>
        <input
          type="text"
          placeholder="e.g. Decision Maker"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          autoFocus
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Field Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
          <option value="text">Text</option>
          <option value="dropdown">Dropdown</option>
          <option value="date">Date</option>
          <option value="currency">Currency</option>
        </select>
      </div>

      {type === 'dropdown' && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Options (one per line)</label>
          <textarea
            placeholder="Option A&#10;Option B&#10;Option C"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            rows={4}
            style={styles.textarea}
          />
        </div>
      )}

      <div style={styles.editorActions}>
        <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            ...styles.saveBtn,
            ...(!name.trim() ? styles.btnDisabled : {}),
          }}
        >
          {field ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
};

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const UpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const DownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#1e3a8a',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    alignSelf: 'flex-start',
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
  addBtn: {
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
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
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
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },
  cardInactive: {
    opacity: 0.5,
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  reorderBtns: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  arrowBtn: {
    padding: '2px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  fieldName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  fieldMeta: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  inactiveBadge: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  optionCount: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  cardActions: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  },
  toggleBtn: {
    padding: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  editBtn: {
    padding: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  editorCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #93c5fd',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  editorTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  editorActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'default',
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

export default CustomFieldManager;
