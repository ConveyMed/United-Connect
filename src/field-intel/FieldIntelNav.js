import { useNavigate, useLocation } from 'react-router-dom';
import { useFieldIntel } from './FieldIntelContext';
import { useFieldIntelNotifications } from '../context/FieldIntelNotificationsContext';

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const tabsByRole = {
  rep: [
    { label: 'Dashboard', path: '/field-intel/dashboard' },
    { label: 'Activity', path: '/field-intel/activity' },
    { label: 'Search', path: '/field-intel/dossier' },
  ],
  manager: [
    { label: 'Dashboard', path: '/field-intel/team' },
    { label: 'Activity', path: '/field-intel/activity' },
    { label: 'Search', path: '/field-intel/dossier' },
  ],
  vp: [
    { label: 'Dashboard', path: '/field-intel/dashboard' },
    { label: 'Activity', path: '/field-intel/activity' },
    { label: 'Search', path: '/field-intel/dossier' },
  ],
  admin: [
    { label: 'Dashboard', path: '/field-intel/dashboard' },
    { label: 'Activity', path: '/field-intel/activity' },
    { label: 'Search', path: '/field-intel/dossier' },
  ],
};

const FieldIntelNav = () => {
  const { role, isActualAdmin, adminOverride, toggleAdminOverride } = useFieldIntel();
  const { totalUnread } = useFieldIntelNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = tabsByRole[role] || [];

  const handleViewSwitch = () => {
    toggleAdminOverride();
    navigate('/field-intel');
  };

  const isActive = (path) => {
    if (path === '/field-intel/territory' && location.pathname === '/field-intel') return true;
    if (path === '/field-intel/dashboard' && location.pathname === '/field-intel') return true;
    if (path === '/field-intel/team' && location.pathname === '/field-intel') return true;

    if (path === '/field-intel/dossier' && location.pathname.startsWith('/field-intel/dossier')) return true;
    if (path === '/field-intel/call-log' && location.pathname.startsWith('/field-intel/call-log')) return true;
    if (path === '/field-intel/leads' && location.pathname.startsWith('/field-intel/leads')) return true;
    if (path === '/field-intel/team' && location.pathname.startsWith('/field-intel/drill')) return true;
    if (path === '/field-intel/dashboard' && location.pathname.startsWith('/field-intel/drill')) return true;
    if (path === '/field-intel/activity' && location.pathname.startsWith('/field-intel/activity')) return true;
    if (path === '/field-intel/deal-review' && location.pathname.startsWith('/field-intel/deal-review')) return true;
    return location.pathname === path;
  };

  if (tabs.length === 0 && !isActualAdmin) return null;

  return (
    <div style={styles.navContainer}>
      <div style={styles.navRow}>
        {tabs.map((tab) => {
          const showBadge = tab.path === '/field-intel/activity' && totalUnread > 0;
          return (
            <button
              key={tab.path}
              style={{
                ...styles.tab,
                ...(isActive(tab.path) ? styles.tabActive : {}),
              }}
              onClick={() => navigate(tab.path)}
            >
              <span style={styles.tabInner}>
                {tab.label}
                {showBadge && (
                  <span style={styles.tabBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>
                )}
              </span>
            </button>
          );
        })}
        {isActualAdmin && !adminOverride && (
          <button
            style={{ ...styles.tab, ...styles.switchViewTab }}
            onClick={handleViewSwitch}
          >
            <EyeIcon />
            <span>Switch View</span>
          </button>
        )}
        {isActualAdmin && adminOverride && (
          <button
            style={{ ...styles.tab, ...styles.adminBackTab }}
            onClick={handleViewSwitch}
          >
            <ShieldIcon />
            <span>Admin</span>
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  navContainer: {
    backgroundColor: '#1e3a8a',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 99,
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '0 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    fontWeight: '600',
  },
  tabInner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  tabBadge: {
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    borderRadius: '9px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  switchViewTab: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    color: '#fbbf24',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    flex: 'none',
    padding: '8px 14px',
  },
  adminBackTab: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    flex: 'none',
    padding: '8px 14px',
  },
};

export default FieldIntelNav;
