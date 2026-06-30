import React from 'react';

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const PersonSelector = ({ people = [], selectedPersonId, onSelect, onEditLabel }) => {
  return (
    <div style={styles.list}>
      {people.length === 0 && (
        <div style={styles.emptyState}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span style={styles.emptyText}>No team members found</span>
        </div>
      )}
      {people.map((person) => {
        const isActive = selectedPersonId === person.id;
        const roleBadgeColor = person.role === 'vp'
          ? '#7c3aed'
          : person.role === 'manager'
            ? '#2563eb'
            : '#059669';

        return (
          <button
            key={person.id}
            onClick={() => onSelect(person.id)}
            style={{
              ...styles.card,
              ...(isActive ? styles.cardActive : {}),
            }}
          >
            <div style={styles.avatar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={styles.cardInfo}>
              <div style={styles.cardNameRow}>
                <span style={styles.cardName}>{person.name}</span>
                {onEditLabel && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditLabel(person.id, person.label || ''); }}
                    style={styles.editBtn}
                  >
                    <EditIcon />
                  </button>
                )}
              </div>
              {person.label && (
                <span style={styles.labelText}>{person.label}</span>
              )}
              <div style={styles.cardMeta}>
                <span style={{ ...styles.roleBadge, backgroundColor: roleBadgeColor }}>
                  {person.role?.toUpperCase()}
                </span>
                <span style={styles.statsText}>
                  {person.assignedCount || 0} / {person.totalCount || 0} assigned
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const styles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '24px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  cardActive: {
    border: '2px solid #2563eb',
    backgroundColor: '#f0f7ff',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  cardNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  editBtn: {
    padding: '3px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    flexShrink: 0,
  },
  labelText: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  statsText: {
    fontSize: '12px',
    color: '#64748b',
  },
};

export default PersonSelector;
