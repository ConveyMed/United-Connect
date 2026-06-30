import React from 'react';

const WifiOffIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const OfflineLoginScreen = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.iconWrapper}>
          <WifiOffIcon />
        </div>
        <h1 style={styles.title}>You're Offline</h1>
        <p style={styles.subtitle}>
          Connect to the internet to sign in and access the app.
        </p>
        <p style={styles.hint}>
          Once you've signed in at least once, you'll be able to access your downloaded files offline.
        </p>
        <button style={styles.retryButton} onClick={handleRetry}>
          Try Again
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background-off-white)',
    padding: '20px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '320px',
  },
  iconWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-dark)',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#475569',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  hint: {
    fontSize: '14px',
    color: 'var(--text-light)',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  retryButton: {
    padding: '14px 32px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
};

export default OfflineLoginScreen;
