import React from 'react';

const CSVPreview = ({ columns, rows }) => {
  const previewRows = rows.slice(0, 10);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span style={styles.headerText}>
          Preview ({rows.length} total row{rows.length !== 1 ? 's' : ''}, showing first {previewRows.length})
        </span>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri} style={ri % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                {columns.map((col, ci) => (
                  <td key={ci} style={styles.td}>
                    {row[col] != null ? String(row[col]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  tableWrap: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: 0,
  },
  td: {
    padding: '8px 14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowEven: {
    backgroundColor: '#ffffff',
  },
  rowOdd: {
    backgroundColor: '#f8fafc',
  },
};

export default CSVPreview;
