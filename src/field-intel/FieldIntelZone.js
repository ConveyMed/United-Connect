import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import FieldIntelHeader from './FieldIntelHeader';
import FieldIntelNav from './FieldIntelNav';
import { useFieldIntel } from './FieldIntelContext';

const FieldIntelZone = () => {
  const { role, loading, isActualAdmin, adminOverride, toggleAdminOverride } = useFieldIntel();
  const navigate = useNavigate();

  // Hide bottom nav when in the zone
  useEffect(() => {
    document.body.classList.add('field-intel-active');
    return () => {
      document.body.classList.remove('field-intel-active');
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <FieldIntelHeader />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div style={styles.container}>
        <FieldIntelHeader />
        {isActualAdmin && adminOverride && <FieldIntelNav />}
        <div style={styles.noAccessContainer}>
          <div style={styles.noAccessIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={styles.noAccessTitle}>No Role Assigned</h2>
          <p style={styles.noAccessText}>
            {isActualAdmin && adminOverride
              ? 'You don\'t have a hierarchy role assigned. This is what unassigned users see.'
              : 'You don\'t have a role assigned in the Field Intelligence module. Contact your administrator for access.'}
          </p>
          {isActualAdmin && adminOverride && (
            <button
              style={styles.backToAdminBtn}
              onClick={() => { toggleAdminOverride(); navigate('/field-intel'); }}
            >
              Back to Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <FieldIntelHeader />
      <FieldIntelNav />
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  noAccessContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    textAlign: 'center',
  },
  noAccessIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  noAccessTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  noAccessText: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
    maxWidth: '300px',
  },
  backToAdminBtn: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#1e3a8a',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default FieldIntelZone;
