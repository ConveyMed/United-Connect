const DashboardMetrics = ({ metrics = [] }) => {
  if (metrics.length === 0) return null;

  return (
    <div style={styles.container}>
      {metrics.map((metric, index) => (
        <div key={index} style={styles.card}>
          {metric.icon && (
            <div style={{ ...styles.iconWrap, backgroundColor: (metric.color || '#1e3a8a') + '15' }}>
              {metric.icon}
            </div>
          )}
          <span style={{ ...styles.value, color: metric.color || '#1e293b' }}>
            {metric.value}
          </span>
          <span style={styles.label}>{metric.label}</span>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    flex: '1 0 0',
    minWidth: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '14px 10px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  iconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2px',
  },
  value: {
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: '1',
  },
  label: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    lineHeight: '1.2',
  },
};

export default DashboardMetrics;
