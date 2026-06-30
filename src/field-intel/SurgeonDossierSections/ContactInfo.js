import React from 'react';

const formatPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

const ContactInfo = ({ surgeon }) => {
  if (!surgeon) return null;

  const name = surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
  const location = [surgeon.city, surgeon.state].filter(Boolean).join(', ');
  const zipLine = surgeon.zip ? (location ? `${location} ${surgeon.zip}` : surgeon.zip) : location;
  const formattedPhone = formatPhone(surgeon.phone);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <ContactIcon />
        <h3 style={styles.title}>Contact Information</h3>
      </div>
      <div style={styles.grid}>
        {name && (
          <div style={styles.field}>
            <span style={styles.label}>Name</span>
            <span style={styles.value}>{name}</span>
          </div>
        )}
        {surgeon.npi && (
          <div style={styles.field}>
            <span style={styles.label}>NPI</span>
            <span style={styles.value}>{surgeon.npi}</span>
          </div>
        )}
        {surgeon.address && (
          <div style={styles.field}>
            <span style={styles.label}>Address</span>
            <span style={styles.value}>{surgeon.address}</span>
          </div>
        )}
        {zipLine && (
          <div style={styles.field}>
            <span style={styles.label}>City / State / Zip</span>
            <span style={styles.value}>{zipLine}</span>
          </div>
        )}
        {formattedPhone && (
          <div style={styles.field}>
            <span style={styles.label}>Phone</span>
            <a href={`tel:${surgeon.phone}`} style={styles.link}>{formattedPhone}</a>
          </div>
        )}
        {surgeon.email && (
          <div style={styles.field}>
            <span style={styles.label}>Email</span>
            <a href={`mailto:${surgeon.email}`} style={styles.link}>{surgeon.email}</a>
          </div>
        )}
        {surgeon.fax && (
          <div style={styles.field}>
            <span style={styles.label}>Fax</span>
            <span style={styles.value}>{formatPhone(surgeon.fax)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ContactIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
    flex: 1,
    minWidth: 0,
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
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: '500',
  },
  link: {
    fontSize: '13px',
    color: '#1e3a8a',
    fontWeight: '500',
    textDecoration: 'none',
  },
};

export default ContactInfo;
