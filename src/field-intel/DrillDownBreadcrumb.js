import { useNavigate } from 'react-router-dom';

const DrillDownBreadcrumb = ({ trail = [] }) => {
  const navigate = useNavigate();

  if (trail.length === 0) return null;

  return (
    <div style={styles.container}>
      {trail.map((crumb, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={crumb.userId || index} style={styles.crumbWrapper}>
            {index > 0 && <span style={styles.separator}>/</span>}
            {isLast ? (
              <span style={styles.crumbCurrent}>{crumb.name}</span>
            ) : (
              <button
                onClick={() => crumb.userId && navigate(`/field-intel/drill/${crumb.userId}`)}
                style={styles.crumbLink}
              >
                {crumb.name}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  crumbWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  separator: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 4px',
  },
  crumbLink: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease',
  },
  crumbCurrent: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e293b',
    padding: '2px 4px',
  },
};

export default DrillDownBreadcrumb;
