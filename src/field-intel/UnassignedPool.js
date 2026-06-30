import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChevronIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const UnassignedPool = ({ accounts = [], people = [], accountCount }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const actualAccountCount = accountCount != null ? accountCount : accounts.length;
  const totalCount = actualAccountCount + people.length;

  if (totalCount === 0) return null;

  return (
    <div style={styles.container}>
      <button onClick={() => setExpanded(!expanded)} style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Unassigned</span>
          <span style={styles.badge}>{totalCount}</span>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div style={styles.body}>
          {people.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>People ({people.length})</span>
              {people.map(person => {
                const name = person.name
                  || `${person.first_name || ''} ${person.last_name || ''}`.trim()
                  || person.email || 'Unknown';
                return (
                  <button
                    key={person.id}
                    onClick={() => navigate('/field-intel/settings/hierarchy')}
                    style={styles.row}
                  >
                    <span style={styles.rowName}>{name}</span>
                    <span style={styles.rowMeta}>{person.role_tier || person.role || ''}</span>
                  </button>
                );
              })}
            </div>
          )}

          {accounts.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>Accounts ({actualAccountCount})</span>
              {accounts.slice(0, 20).map(account => {
                const name = account.full_name
                  || `${account.first_name || ''} ${account.last_name || ''}`.trim()
                  || 'Unknown';
                return (
                  <button
                    key={account.id}
                    onClick={() => navigate(`/field-intel/dossier/${account.id}`)}
                    style={styles.row}
                  >
                    <span style={styles.rowName}>{name}</span>
                    <span style={styles.rowMeta}>{account.specialty || ''}</span>
                  </button>
                );
              })}
              {actualAccountCount > 20 && (
                <span style={styles.moreText}>+{actualAccountCount - 20} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#fffbeb',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: '#92400e',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#d97706',
    padding: '1px 6px',
    borderRadius: '10px',
    minWidth: '20px',
    textAlign: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px 14px',
    borderTop: '1px solid #fde68a',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  rowName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b',
  },
  rowMeta: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  moreText: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '4px 0',
  },
};

export default UnassignedPool;
