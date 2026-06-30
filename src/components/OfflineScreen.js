import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDownloads } from '../context/DownloadsContext';

const WifiOffIcon = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const OfflineScreen = () => {
  const navigate = useNavigate();
  const { downloads } = useDownloads();

  const downloadCount = downloads?.length || 0;
  const hasDownloads = downloadCount > 0;

  const handleViewDownloads = () => {
    navigate('/downloads');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.iconWrapper}>
            <WifiOffIcon />
          </div>

          <h1 style={styles.title}>You're Offline</h1>
          <p style={styles.subtitle}>
            No internet connection detected
          </p>

          <button style={styles.primaryButton} onClick={handleViewDownloads}>
            <DownloadIcon />
            <span>
              {hasDownloads
                ? `View Downloads (${downloadCount})`
                : 'View Downloads'
              }
            </span>
          </button>

          <p style={styles.hint}>
            {hasDownloads
              ? `You have ${downloadCount} file${downloadCount === 1 ? '' : 's'} available for offline viewing`
              : 'Download files while online to view them offline'
            }
          </p>
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
    zIndex: 9999,
    backgroundColor: 'var(--background-off-white)',
  },
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    paddingTop: 'max(20px, env(safe-area-inset-top))',
    paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
  },
  content: {
    textAlign: 'center',
    maxWidth: '320px',
  },
  iconWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    marginBottom: '28px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 32px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '20px',
  },
  hint: {
    fontSize: '14px',
    color: 'var(--text-light)',
    margin: 0,
    lineHeight: '1.5',
  },
};

export default OfflineScreen;
