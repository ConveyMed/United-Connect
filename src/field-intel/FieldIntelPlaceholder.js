const FieldIntelPlaceholder = ({ label = 'Field Intelligence' }) => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <h2 style={styles.title}>{label}</h2>
        <p style={styles.text}>This section is being built. Check back soon.</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    minHeight: '300px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    maxWidth: '360px',
    width: '100%',
  },
  iconContainer: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 76, 117, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  text: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
};

export default FieldIntelPlaceholder;
