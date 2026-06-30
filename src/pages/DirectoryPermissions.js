import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DirectoryPermissions = () => {
  const navigate = useNavigate();
  const [permission, setPermission] = useState(
    localStorage.getItem('directoryPermission') || 'all'
  );

  const handleSelect = (value) => {
    setPermission(value);
    localStorage.setItem('directoryPermission', value);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Directory Permissions</h1>
          <div style={styles.headerSpacer} />
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Intro */}
          <p style={styles.introText}>
            Control who appears in the company directory. This setting affects all users when they view the directory.
          </p>

          {/* Options */}
          <div style={styles.optionsSection}>
            <h2 style={styles.sectionTitle}>Who can be seen in the directory?</h2>

            {/* All Users Option */}
            <button
              style={{
                ...styles.optionCard,
                ...(permission === 'all' ? styles.optionCardActive : {}),
              }}
              onClick={() => handleSelect('all')}
            >
              <div style={{
                ...styles.optionIcon,
                ...(permission === 'all' ? styles.optionIconActive : {}),
              }}>
                <UsersIcon />
              </div>
              <div style={styles.optionContent}>
                <h3 style={styles.optionTitle}>All Users</h3>
                <p style={styles.optionDescription}>
                  Everyone in the organization will appear in the directory. This promotes transparency and makes it easy for team members to find each other.
                </p>
              </div>
              <div style={{
                ...styles.optionCheck,
                ...(permission === 'all' ? styles.optionCheckActive : {}),
              }}>
                {permission === 'all' && <CheckIcon />}
              </div>
            </button>

            {/* Admins Only Option */}
            <button
              style={{
                ...styles.optionCard,
                ...(permission === 'admins' ? styles.optionCardActive : {}),
              }}
              onClick={() => handleSelect('admins')}
            >
              <div style={{
                ...styles.optionIcon,
                ...(permission === 'admins' ? styles.optionIconActive : {}),
              }}>
                <ShieldIcon />
              </div>
              <div style={styles.optionContent}>
                <h3 style={styles.optionTitle}>Admins Only</h3>
                <p style={styles.optionDescription}>
                  Only administrators will be visible in the directory. Use this for organizations that require more privacy or have sensitive contact information.
                </p>
              </div>
              <div style={{
                ...styles.optionCheck,
                ...(permission === 'admins' ? styles.optionCheckActive : {}),
              }}>
                {permission === 'admins' && <CheckIcon />}
              </div>
            </button>
          </div>

          {/* Note */}
          <div style={styles.noteBox}>
            <p style={styles.noteText}>
              <strong>Note:</strong> This setting takes effect immediately. Users will only see the allowed profiles the next time they open the directory.
            </p>
          </div>

          <div style={{ height: '40px' }} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--background-off-white)',
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
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  headerSpacer: {
    width: '40px',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto 16px auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.15)',
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
  introText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  optionsSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 16px 0',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    marginBottom: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
  },
  optionCardActive: {
    borderColor: 'var(--primary-blue)',
    backgroundColor: '#fafbff',
  },
  optionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  optionIconActive: {
    backgroundColor: '#eff6ff',
    color: 'var(--primary-blue)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 6px 0',
  },
  optionDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  optionCheck: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '4px',
  },
  optionCheckActive: {
    backgroundColor: 'var(--primary-blue)',
    borderColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  noteBox: {
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    padding: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#fef3c7',
  },
  noteText: {
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.5',
    margin: 0,
  },
};

export default DirectoryPermissions;
