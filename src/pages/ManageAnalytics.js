import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AnalyticsApp from '../analytics/AnalyticsApp';

const DesktopIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export default function ManageAnalytics() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const isAdmin = userProfile?.is_admin === true || userProfile?.role === 'admin' || userProfile?.role === 'editor' || userProfile?.is_owner === true;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAdmin) {
    navigate('/home', { replace: true });
    return null;
  }

  if (!isDesktop) {
    return (
      <div style={styles.mobileGate}>
        <DesktopIcon />
        <h2 style={styles.mobileTitle}>Desktop Only</h2>
        <p style={styles.mobileText}>
          The Analytics Dashboard is available on desktop only. Please visit this page from a computer.
        </p>
        <button style={styles.mobileBackButton} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return <AnalyticsApp />;
}

const styles = {
  mobileGate: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  },
  mobileTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginTop: '16px',
    marginBottom: '8px',
  },
  mobileText: {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: '1.5',
    maxWidth: '300px',
    marginBottom: '24px',
  },
  mobileBackButton: {
    padding: '12px 32px',
    borderRadius: '10px',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
