import React from 'react';

const CallHistory = ({ callLogs = [], surgeonId, onLogCall }) => {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <CallIcon />
        <h3 style={styles.title}>Call Log</h3>
        {callLogs.length > 0 && (
          <span style={styles.count}>{callLogs.length}</span>
        )}
        {onLogCall && (
          <button onClick={onLogCall} style={styles.logBtn}>
            <PlusIcon /> Log Call
          </button>
        )}
      </div>

      {callLogs.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>No calls logged yet</span>
          {onLogCall && (
            <button onClick={onLogCall} style={styles.emptyBtn}>Log your first call</button>
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Call Log</th>
              </tr>
            </thead>
            <tbody>
              {callLogs.map((log, idx) => {
                const repName = log.rep
                  ? `${log.rep.first_name || ''} ${log.rep.last_name || ''}`.trim()
                  : '';
                return (
                  <tr key={log.id || idx}>
                    <td style={styles.tdDate}>
                      {(() => {
                        const d = String(log.call_date);
                        const safe = d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d);
                        return safe.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                      })()}
                    </td>
                    <td style={styles.tdStage}>
                      {log.buying_stage_update || '-'}
                    </td>
                    <td style={styles.td}>
                      <div>{log.summary || '-'}</div>
                      {repName && (
                        <div style={styles.repByline}>by {repName}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const CallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
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
    flex: 1,
  },
  count: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '1px 6px',
    borderRadius: '8px',
  },
  logBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 8px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 0',
  },
  emptyText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  emptyBtn: {
    padding: '4px 10px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 8px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '5px 8px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  tdDate: {
    padding: '5px 8px',
    color: '#1e293b',
    fontWeight: '500',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  tdStage: {
    padding: '5px 8px',
    color: '#1e3a8a',
    fontWeight: '500',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  repByline: {
    fontSize: '11px',
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: '3px',
  },
};

export default CallHistory;
