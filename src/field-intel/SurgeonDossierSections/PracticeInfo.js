import React from 'react';

const PracticeInfo = ({ surgeon }) => {
  if (!surgeon) return null;

  const hasData = surgeon.site_of_care || surgeon.hospital || surgeon.specialty;
  if (!hasData) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <PracticeIcon />
        <h3 style={styles.title}>Practice Information</h3>
      </div>
      <div style={styles.grid}>
        {surgeon.specialty && (
          <div style={styles.field}>
            <span style={styles.label}>Specialty</span>
            <span style={styles.value}>{surgeon.specialty}</span>
          </div>
        )}
        {surgeon.hospital && (
          <div style={styles.field}>
            <span style={styles.label}>Hospital / Practice</span>
            <span style={styles.value}>{surgeon.hospital}</span>
          </div>
        )}
        {surgeon.site_of_care && (
          <div style={styles.field}>
            <span style={styles.label}>Site of Care</span>
            <span style={styles.value}>{surgeon.site_of_care}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const PracticeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: '500',
  },
};

export default PracticeInfo;
