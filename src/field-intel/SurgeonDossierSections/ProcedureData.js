import React from 'react';

const formatCurrency = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (value) => {
  if (value == null) return null;
  return Number(value).toLocaleString();
};

const ProcedureData = ({ surgeon, cptData = [], cptPrices = [] }) => {
  const priceMap = {};
  cptPrices.forEach((p) => {
    if (p.average_price != null) {
      priceMap[p.cpt_code] = parseFloat(p.average_price);
    }
  });

  if (cptData && cptData.length > 0) {
    let totalOpportunity = 0;
    let hasAnyPrice = false;

    const rows = cptData.map((item) => {
      const price = priceMap[item.cpt_code];
      const hasPrice = price != null && price > 0;
      const volume = item.annual_volume || 0;
      const opportunity = hasPrice ? volume * price : null;

      if (hasPrice) {
        hasAnyPrice = true;
        totalOpportunity += opportunity || 0;
      }

      return { ...item, price, hasPrice, opportunity };
    });

    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <ProcedureIcon />
          <h3 style={styles.title}>Procedure Information</h3>
          <span style={styles.badge}>{cptData.length}</span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>CPT Code</th>
                <th style={styles.th}>Description</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Volume</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Market</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id || item.cpt_code}>
                  <td style={styles.tdCode}>{item.cpt_code}</td>
                  <td style={styles.td}>{item.cpt_description || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.annual_volume != null ? formatNumber(item.annual_volume) : '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: item.opportunity ? '#059669' : '#1e293b', fontWeight: item.opportunity ? '600' : '400' }}>
                    {item.opportunity ? formatCurrency(item.opportunity) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            {hasAnyPrice && totalOpportunity > 0 && (
              <tfoot>
                <tr>
                  <td style={styles.tfTotal} colSpan="3">Total</td>
                  <td style={{ ...styles.tfTotal, textAlign: 'right', color: '#059669' }}>{formatCurrency(totalOpportunity)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  // Fallback: legacy single-CPT fields on surgeon record
  if (!surgeon) return null;
  const hasData = surgeon.cpt_code || surgeon.cpt_description || surgeon.annual_volume || surgeon.device_price || surgeon.market_opportunity;
  if (!hasData) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <ProcedureIcon />
        <h3 style={styles.title}>Procedure Information</h3>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>CPT Code</th>
              <th style={styles.th}>Description</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Volume</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Market</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdCode}>{surgeon.cpt_code || '-'}</td>
              <td style={styles.td}>{surgeon.cpt_description || '-'}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{surgeon.annual_volume != null ? formatNumber(surgeon.annual_volume) : '-'}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                {surgeon.market_opportunity != null ? (formatCurrency(surgeon.market_opportunity) || surgeon.market_opportunity) : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProcedureIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
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
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '1px 6px',
    borderRadius: '4px',
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
    padding: '6px 8px',
    color: '#1e293b',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
  },
  tdCode: {
    padding: '6px 8px',
    color: '#1e3a8a',
    fontWeight: '600',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  tfTotal: {
    padding: '6px 8px',
    fontWeight: '700',
    fontSize: '12px',
    color: '#1e293b',
    borderTop: '2px solid #e2e8f0',
  },
};

export default ProcedureData;
