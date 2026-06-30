import React from 'react';

const formatFieldValue = (fieldDef, rawValue) => {
  if (rawValue == null || rawValue === '') return null;

  switch (fieldDef.field_type) {
    case 'currency': {
      const num = parseFloat(rawValue);
      if (isNaN(num)) return rawValue;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    case 'date': {
      const d = new Date(rawValue);
      if (isNaN(d.getTime())) return rawValue;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    default:
      return rawValue;
  }
};

const CustomFields = ({ fields = [], values = [] }) => {
  if (fields.length === 0) return null;

  const valueMap = {};
  values.forEach(v => {
    valueMap[v.field_id] = v.value;
  });

  const fieldsWithValues = fields.filter(f => valueMap[f.id] != null && valueMap[f.id] !== '');
  if (fieldsWithValues.length === 0) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <FieldsIcon />
        <h3 style={styles.title}>Custom Fields</h3>
      </div>
      <div style={styles.grid}>
        {fieldsWithValues.map(field => (
          <div key={field.id} style={styles.field}>
            <span style={styles.label}>{field.field_name}</span>
            <span style={styles.value}>{formatFieldValue(field, valueMap[field.id])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FieldsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
  },
};

export default CustomFields;
