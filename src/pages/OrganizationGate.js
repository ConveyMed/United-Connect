import { useState } from 'react';
import { supabase } from '../config/supabase';

const OrganizationGate = ({ onVerified }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_code')
        .select('code')
        .limit(1)
        .single();

      if (fetchError) {
        setError('Unable to verify code. Please try again.');
        setLoading(false);
        return;
      }

      if (data.code === code.trim()) {
        onVerified();
      } else {
        setError('Incorrect organization code.');
      }
    } catch (err) {
      setError('Unable to verify code. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue, #1e40af)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 style={styles.title}>Organization Access</h1>
        <p style={styles.subtitle}>Please enter your organization code to continue.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="Enter code"
            style={styles.input}
            autoComplete="off"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{
              ...styles.button,
              opacity: loading || !code.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--primary-blue, #1e40af)',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  iconContainer: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 28px 0',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    textAlign: 'center',
    letterSpacing: '4px',
    fontWeight: '600',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    margin: '0',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'var(--primary-blue, #1e40af)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default OrganizationGate;
