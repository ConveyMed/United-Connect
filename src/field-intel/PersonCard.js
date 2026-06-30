import { useNavigate } from 'react-router-dom';

const ROLE_COLORS = {
  vp: '#7c3aed',
  manager: '#2563eb',
  rep: '#059669',
};

const ROLE_LABELS = {
  vp: 'VP',
  manager: 'Manager',
  rep: 'Rep',
};

const PersonCard = ({ person, clickable = true }) => {
  const navigate = useNavigate();

  if (!person) return null;

  const name = person.name
    || `${person.first_name || ''} ${person.last_name || ''}`.trim()
    || person.email
    || 'Unknown';
  const role = person.role_tier || person.role || 'rep';
  const color = ROLE_COLORS[role] || '#64748b';
  const label = person.custom_label || ROLE_LABELS[role] || role;
  const accountCount = person.accountCount ?? 0;
  const lastActivity = person.lastActivity;

  const daysSince = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isStale = daysSince !== null && daysSince >= 14;
  const isWarning = daysSince !== null && daysSince >= 7 && daysSince < 14;

  return (
    <button
      onClick={() => clickable && navigate(`/field-intel/drill/${person.userId || person.id}`)}
      style={{ ...styles.card, cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={styles.topRow}>
        <div style={styles.nameRow}>
          <div style={{ ...styles.roleDot, backgroundColor: color }} />
          <span style={styles.name}>{name}</span>
        </div>
        <span style={{ ...styles.roleBadge, backgroundColor: color }}>
          {label}
        </span>
      </div>
      <div style={styles.metaRow}>
        <span style={styles.metaText}>{accountCount} account{accountCount !== 1 ? 's' : ''}</span>
        {lastActivity && (
          <span style={{
            ...styles.metaText,
            color: isStale ? '#dc2626' : isWarning ? '#d97706' : '#64748b',
          }}>
            Last activity: {new Date(lastActivity).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
            {isStale && (
              <span style={styles.staleIndicator}>
                {daysSince}d ago
              </span>
            )}
            {isWarning && !isStale && (
              <span style={styles.warningIndicator}>
                {daysSince}d ago
              </span>
            )}
          </span>
        )}
        {!lastActivity && (
          <span style={{ ...styles.metaText, color: '#94a3b8' }}>No activity</span>
        )}
      </div>
    </button>
  );
};

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  roleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  metaText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  staleIndicator: {
    marginLeft: '4px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  warningIndicator: {
    marginLeft: '4px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#d97706',
    backgroundColor: '#fefce8',
    padding: '1px 4px',
    borderRadius: '3px',
  },
};

export default PersonCard;
