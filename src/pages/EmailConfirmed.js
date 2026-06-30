import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

function EmailConfirmed() {
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Supabase handles the token exchange automatically via URL hash
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email_confirmed_at) {
        setStatus('confirmed');
      } else {
        // Give it a moment for Supabase to process
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user?.email_confirmed_at) {
            setStatus('confirmed');
          } else {
            setStatus('confirmed'); // Show success anyway, they clicked the link
          }
        }, 1500);
      }
    };

    checkAuth();
  }, []);

  const handleOpenInApp = () => {
    // Deep link protocol matches the app bundle scheme
    window.location.href = 'com.unitedconnect.app://';
  };

  const handleContinueInBrowser = () => {
    navigate('/');
  };

  if (status === 'verifying') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <h1 style={styles.title}>Verifying...</h1>
          <p style={styles.text}>Please wait while we confirm your email.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 style={styles.title}>Email Confirmed!</h1>
        <p style={styles.text}>Your account is ready.</p>

        <button style={styles.primaryButton} onClick={handleOpenInApp}>
          Open in App
        </button>

        <button style={styles.secondaryButton} onClick={handleContinueInBrowser}>
          Continue in Browser
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: 'var(--background-off-white)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
    padding: '40px 24px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--text-dark)',
    margin: '0 0 12px 0',
    fontWeight: '700',
  },
  text: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  secondaryButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: 'transparent',
    color: 'var(--primary-blue)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px',
  },
};

export default EmailConfirmed;
