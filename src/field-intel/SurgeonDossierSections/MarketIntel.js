import React from 'react';

const MarketIntel = ({ surgeon }) => {
  if (!surgeon) return null;

  const hasData = surgeon.competitor_products || surgeon.contract_status || surgeon.buying_stage || surgeon.forecast_close_date;
  if (!hasData) return null;

  const rows = [
    { label: 'Contract Status', value: surgeon.contract_status },
    { label: 'Current Stage', value: surgeon.buying_stage },
    { label: 'Forecast Close Date', value: surgeon.forecast_close_date ? new Date(surgeon.forecast_close_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null },
    { label: 'Competitor Products', value: surgeon.competitor_products },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <MarketIcon />
        <h3 style={styles.title}>Contract & Stage</h3>
      </div>
      <div style={styles.rows}>
        {rows.map((r) => (
          <div key={r.label} style={styles.row}>
            <span style={styles.label}>{r.label}</span>
            <span style={styles.value}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
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
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    minWidth: '130px',
    flexShrink: 0,
  },
  value: {
    fontSize: '12px',
    color: '#1e293b',
    fontWeight: '500',
  },
};

export default MarketIntel;
