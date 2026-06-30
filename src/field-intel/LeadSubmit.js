import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const LeadSubmit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('leads').insert({
        submitted_by: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        specialty: specialty.trim() || null,
        notes: notes.trim() || null,
        status: 'pending',
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('[LeadSubmit] Error:', err);
      alert('Failed to submit lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <SuccessIcon />
          <h3 style={styles.successTitle}>Lead Submitted</h3>
          <p style={styles.successText}>
            {firstName} {lastName} has been submitted for review. An admin will review and approve or reject this lead.
          </p>
          <div style={styles.successActions}>
            <button onClick={() => {
              setFirstName(''); setLastName(''); setCity(''); setState('');
              setSpecialty(''); setNotes(''); setSuccess(false);
            }} style={styles.anotherBtn}>
              Submit Another
            </button>
            <button onClick={() => navigate(-1)} style={styles.doneBtn}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <BackIcon /> Back
      </button>

      <h2 style={styles.pageTitle}>Submit New Lead</h2>
      <p style={styles.description}>
        Submit a new physician lead for admin review. Once approved, they'll be added to the surgeon database.
      </p>

      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>First Name *</label>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Last Name *</label>
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>City</label>
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>State</label>
          <input
            type="text"
            placeholder="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={styles.input}
            maxLength={2}
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Specialty</label>
        <input
          type="text"
          placeholder="e.g. Orthopedic Surgery"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Notes</label>
        <textarea
          placeholder="Any additional context about this lead..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={styles.textarea}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !firstName.trim() || !lastName.trim()}
        style={{
          ...styles.submitBtn,
          ...((saving || !firstName.trim() || !lastName.trim()) ? styles.btnDisabled : {}),
        }}
      >
        {saving ? 'Submitting...' : 'Submit Lead'}
      </button>
    </div>
  );
};

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
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
  row: {
    display: 'flex',
    gap: '10px',
  },
  fieldGroup: {
    flex: 1,
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
  submitBtn: {
    padding: '14px',
    backgroundColor: '#1e3a8a',
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
  anotherBtn: {
    padding: '10px 18px',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: '1px solid #1e3a8a',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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
};

export default LeadSubmit;
