import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const EDITABLE_FIELDS = [
  { key: 'full_name', label: 'Full Name', group: 'Contact' },
  { key: 'address', label: 'Address', group: 'Contact' },
  { key: 'city', label: 'City', group: 'Contact' },
  { key: 'state', label: 'State', group: 'Contact' },
  { key: 'zip', label: 'ZIP', group: 'Contact' },
  { key: 'phone', label: 'Phone', group: 'Contact' },
  { key: 'email', label: 'Email', group: 'Contact' },
  { key: 'fax', label: 'Fax', group: 'Contact' },
  { key: 'specialty', label: 'Specialty', group: 'Practice' },
  { key: 'hospital', label: 'Hospital / Practice', group: 'Practice' },
  { key: 'site_of_care', label: 'Site of Care', group: 'Practice' },
];

const ChangeRequest = () => {
  const { surgeonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [surgeon, setSurgeon] = useState(null);
  const [cptData, setCptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Track which fields are being changed
  const [changes, setChanges] = useState({});
  const [cptChanges, setCptChanges] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!surgeonId) return;
    const fetch = async () => {
      setLoading(true);
      const [surgeonRes, cptRes] = await Promise.all([
        supabase.from('surgeons').select('*').eq('id', surgeonId).single(),
        supabase.from('surgeon_cpt_data').select('*').eq('surgeon_id', surgeonId),
      ]);
      if (surgeonRes.data) setSurgeon(surgeonRes.data);
      if (cptRes.data) setCptData(cptRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [surgeonId]);

  const handleFieldChange = (key, value) => {
    if (value === (surgeon[key] || '')) {
      const next = { ...changes };
      delete next[key];
      setChanges(next);
    } else {
      setChanges(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleCptChange = (cptId, field, value) => {
    const cptRow = cptData.find(c => c.id === cptId);
    const original = String(cptRow[field] || '');
    const k = `${cptId}_${field}`;

    if (value === original) {
      const next = { ...cptChanges };
      delete next[k];
      setCptChanges(next);
    } else {
      setCptChanges(prev => ({ ...prev, [k]: { cpt_id: cptId, field, value, original } }));
    }
  };

  const hasChanges = Object.keys(changes).length > 0 || Object.keys(cptChanges).length > 0;

  const handleSubmit = async () => {
    if (!hasChanges) return;
    setSaving(true);

    try {
      const requested_changes = {
        surgeon_fields: {},
        cpt_fields: [],
      };

      // Build surgeon field changes with old/new
      for (const [key, newVal] of Object.entries(changes)) {
        requested_changes.surgeon_fields[key] = {
          old: surgeon[key] || null,
          new: newVal,
        };
      }

      // Build CPT changes
      for (const change of Object.values(cptChanges)) {
        requested_changes.cpt_fields.push({
          cpt_id: change.cpt_id,
          field: change.field,
          old: change.original,
          new: change.value,
        });
      }

      const surgeonName = surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();

      const { error } = await supabase.from('leads').insert({
        submitted_by: user.id,
        first_name: surgeon.first_name,
        last_name: surgeon.last_name,
        type: 'change_request',
        surgeon_id: surgeonId,
        requested_changes,
        notes: notes.trim() || `Change request for ${surgeonName}`,
        status: 'pending',
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('[ChangeRequest] Error:', err);
      alert('Failed to submit change request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading surgeon data...</span>
        </div>
      </div>
    );
  }

  if (!surgeon) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#64748b' }}>Surgeon not found.</p>
      </div>
    );
  }

  const surgeonName = surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <SuccessIcon />
          <h3 style={styles.successTitle}>Change Request Submitted</h3>
          <p style={styles.successText}>
            Your requested changes for {surgeonName} have been submitted for admin review.
          </p>
          <div style={styles.successActions}>
            <button onClick={() => navigate(`/field-intel/dossier/${surgeonId}`)} style={styles.doneBtn}>
              Back to Dossier
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Group fields
  const groups = {};
  EDITABLE_FIELDS.forEach(f => {
    if (!groups[f.group]) groups[f.group] = [];
    groups[f.group].push(f);
  });

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <BackIcon /> Back
      </button>

      <h2 style={styles.pageTitle}>Request Changes</h2>
      <p style={styles.description}>
        Submit changes for <strong>{surgeonName}</strong> (NPI: {surgeon.npi || 'N/A'}). An admin will review and approve or reject your request.
      </p>

      <div style={styles.infoBar}>
        <InfoIcon />
        <span>Only change the fields that need updating. Unchanged fields will be ignored.</span>
      </div>

      {Object.entries(groups).map(([groupName, fields]) => (
        <div key={groupName}>
          <div style={styles.groupLabel}>{groupName} Information</div>
          {fields.map(f => {
            const currentVal = surgeon[f.key] || '';
            const isChanged = changes[f.key] !== undefined;
            return (
              <div key={f.key} style={styles.fieldRow}>
                <label style={styles.label}>{f.label}</label>
                <div style={styles.currentVal}>Current: {currentVal || '(empty)'}</div>
                <input
                  type="text"
                  placeholder={currentVal || `Enter ${f.label.toLowerCase()}`}
                  value={changes[f.key] !== undefined ? changes[f.key] : ''}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  style={{
                    ...styles.input,
                    ...(isChanged ? styles.inputChanged : {}),
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* CPT / Procedure Data */}
      {cptData.length > 0 && (
        <div>
          <div style={styles.groupLabel}>Procedure Information</div>
          {cptData.map(cpt => (
            <div key={cpt.id} style={styles.cptCard}>
              <div style={styles.cptHeader}>
                {cpt.cpt_code} - {cpt.cpt_description || 'No description'}
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.label}>Annual Volume</label>
                <div style={styles.currentVal}>Current: {cpt.annual_volume != null ? cpt.annual_volume.toLocaleString() : '(empty)'}</div>
                <input
                  type="number"
                  placeholder={String(cpt.annual_volume || '')}
                  value={cptChanges[`${cpt.id}_annual_volume`]?.value || ''}
                  onChange={(e) => handleCptChange(cpt.id, 'annual_volume', e.target.value)}
                  style={{
                    ...styles.input,
                    ...(cptChanges[`${cpt.id}_annual_volume`] ? styles.inputChanged : {}),
                  }}
                />
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.label}>Site of Care</label>
                <div style={styles.currentVal}>Current: {cpt.site_of_care || '(empty)'}</div>
                <input
                  type="text"
                  placeholder={cpt.site_of_care || 'Enter site of care'}
                  value={cptChanges[`${cpt.id}_site_of_care`]?.value || ''}
                  onChange={(e) => handleCptChange(cpt.id, 'site_of_care', e.target.value)}
                  style={{
                    ...styles.input,
                    ...(cptChanges[`${cpt.id}_site_of_care`] ? styles.inputChanged : {}),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.fieldRow}>
        <label style={styles.label}>Notes (reason for changes)</label>
        <textarea
          placeholder="Why are these changes needed?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={styles.textarea}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !hasChanges}
        style={{
          ...styles.submitBtn,
          ...((saving || !hasChanges) ? styles.btnDisabled : {}),
        }}
      >
        {saving ? 'Submitting...' : `Submit Change Request (${Object.keys(changes).length + Object.keys(cptChanges).length} changes)`}
      </button>
    </div>
  );
};

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
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
    paddingBottom: '32px',
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
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#eff6ff',
    borderLeft: '3px solid #2563eb',
    borderRadius: '0 6px 6px 0',
    fontSize: '12px',
    color: '#1e40af',
  },
  groupLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: '8px',
    paddingLeft: '2px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  currentVal: {
    fontSize: '11px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.15s ease',
  },
  inputChanged: {
    border: '2px solid #f59e0b',
    backgroundColor: '#fffbeb',
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
  cptCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  cptHeader: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  submitBtn: {
    padding: '14px',
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'default',
  },
  successCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    marginTop: '40px',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  successText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
  },
  successActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  doneBtn: {
    padding: '10px 18px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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

export default ChangeRequest;
