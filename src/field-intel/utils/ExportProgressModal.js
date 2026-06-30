const PHASE_LABELS = {
  scope: 'Identifying accounts',
  surgeons: 'Loading account details',
  cpt: 'Loading procedure data',
  delegations: 'Loading assignments',
  calls: 'Loading call history',
  hierarchy: 'Resolving territory hierarchy',
  building: 'Building CSV',
  done: 'Done',
};

const ExportProgressModal = ({ open, phase, count, error, onClose }) => {
  if (!open) return null;

  const label = PHASE_LABELS[phase] || 'Working';
  const formatted = typeof count === 'number' ? count.toLocaleString() : '0';
  const isDone = phase === 'done';

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {error ? (
          <>
            <div style={styles.errorIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={styles.title}>Export failed</h3>
            <p style={styles.errorText}>{error}</p>
            <button style={styles.closeBtn} onClick={onClose}>Close</button>
          </>
        ) : isDone ? (
          <>
            <div style={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 style={styles.title}>Export complete</h3>
            <p style={styles.subtitle}>{formatted} account{count === 1 ? '' : 's'} exported</p>
            <button style={styles.closeBtn} onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <div style={styles.spinner} />
            <h3 style={styles.title}>Exporting Field Intel</h3>
            <p style={styles.subtitle}>{label}…</p>
            {count > 0 && <p style={styles.count}>{formatted} records loaded</p>}
            <p style={styles.footnote}>Don't close this tab.</p>
          </>
        )}
      </div>
      <style>{`@keyframes fi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '28px 24px',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'fi-spin 0.9s linear infinite',
  },
  successIcon: { marginBottom: '12px' },
  errorIcon: { marginBottom: '12px' },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 6px 0',
  },
  count: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 12px 0',
    fontVariantNumeric: 'tabular-nums',
  },
  footnote: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '8px 0 0 0',
  },
  errorText: {
    fontSize: '13px',
    color: '#475569',
    margin: '0 0 16px 0',
  },
  closeBtn: {
    marginTop: '8px',
    padding: '10px 22px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default ExportProgressModal;
