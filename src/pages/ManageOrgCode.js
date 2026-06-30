import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ManageOrgCode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orgCode, setOrgCode] = useState('');
  const [lastChanged, setLastChanged] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('organization_code')
        .select('*')
        .limit(1)
        .single();
      if (data) {
        setOrgCode(data.code);
        setLastChanged(data.updated_at);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!newCode.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('organization_code')
      .update({ code: newCode.trim(), updated_at: new Date().toISOString(), updated_by: user?.id })
      .not('id', 'is', null);
    if (!error) {
      setOrgCode(newCode.trim());
      setLastChanged(new Date().toISOString());
      setEditing(false);
      setNewCode('');
    }
    setSaving(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backButton} onClick={() => navigate('/profile')}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Organization Code</h1>
          <div style={{ width: '24px' }} />
        </div>
        <div style={styles.headerBorder} />
      </header>

      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>Loading...</div>
          ) : (
            <>
              <p style={styles.description}>
                This code is required for all users to access the app. Share it with your team members so they can log in.
              </p>

              <div style={styles.card}>
                <div style={styles.label}>Current Code</div>
                {!editing ? (
                  <>
                    <div style={styles.codeDisplay}>{orgCode || '---'}</div>
                    {lastChanged && (
                      <div style={styles.timestamp}>
                        Last changed {new Date(lastChanged).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                    <button style={styles.editButton} onClick={() => { setEditing(true); setNewCode(orgCode); }}>
                      Change Code
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Enter new code"
                      autoFocus
                      style={styles.input}
                    />
                    <div style={styles.buttonRow}>
                      <button style={styles.cancelButton} onClick={() => { setEditing(false); setNewCode(''); }}>
                        Cancel
                      </button>
                      <button
                        style={{ ...styles.saveButton, opacity: saving || !newCode.trim() ? 0.6 : 1 }}
                        onClick={handleSave}
                        disabled={saving || !newCode.trim()}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
    backgroundColor: 'var(--background-off-white, #f8fafc)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--primary-blue, #1e40af)',
    padding: '4px',
  },
  headerTitle: {
    color: 'var(--primary-blue, #1e40af)',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb, 30, 64, 175), 0.15)',
    borderRadius: '1px',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    overflow: 'auto',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    padding: '24px 16px',
  },
  description: {
    fontSize: '15px',
    color: 'var(--text-muted, #64748b)',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  codeDisplay: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-dark, #1e293b)',
    letterSpacing: '6px',
    textAlign: 'center',
    padding: '20px 0',
  },
  timestamp: {
    fontSize: '13px',
    color: 'var(--text-light, #94a3b8)',
    textAlign: 'center',
    marginBottom: '20px',
  },
  editButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--primary-blue, #1e40af)',
    backgroundColor: 'rgba(var(--primary-blue-rgb, 30, 64, 175), 0.08)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '20px',
    border: '2px solid var(--primary-blue, #1e40af)',
    borderRadius: '12px',
    outline: 'none',
    textAlign: 'center',
    letterSpacing: '4px',
    fontWeight: '600',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-muted, #64748b)',
    backgroundColor: 'var(--bg-light, #f1f5f9)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'var(--primary-blue, #1e40af)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
};

export default ManageOrgCode;
