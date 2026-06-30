import { useNavigate } from 'react-router-dom';

// Parse date-only strings safely (avoids timezone rollover where "2026-04-08" shows as Apr 7)
const safeDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (str.length === 10) return new Date(str + 'T12:00:00');
  return new Date(str);
};

const BUYING_STAGES = [
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
];

const Highlight = ({ text, query }) => {
  if (!query || !text) return text || null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: '#fef08a', padding: 0, borderRadius: '2px' }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const AccountCard = ({ surgeon, latestCall, assignedRep, cptData, cptPriceMap, searchQuery, unread = false, onMarkRead }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (unread && typeof onMarkRead === 'function') onMarkRead();
    navigate(`/field-intel/dossier/${surgeon.id}`);
  };

  const name = surgeon.full_name
    || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim()
    || 'Unknown';
  const stageInfo = BUYING_STAGES.find(s => s.key === surgeon.buying_stage);
  const repName = assignedRep
    ? `${assignedRep.first_name || ''} ${assignedRep.last_name || ''}`.trim()
    : null;
  const callRepName = latestCall?.rep
    ? `${latestCall.rep.first_name || ''} ${latestCall.rep.last_name || ''}`.trim()
    : null;

  // CPT totals
  const cptItems = cptData || [];
  const totalVolume = cptItems.reduce((sum, c) => sum + (c.annual_volume || 0), 0);
  const totalValue = cptItems.reduce((sum, c) => {
    const price = cptPriceMap?.[c.cpt_code] || 0;
    return sum + ((c.annual_volume || 0) * price);
  }, 0);

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.card,
        ...(unread ? styles.cardUnread : {}),
        position: 'relative',
      }}
    >
      {unread && <span style={styles.unreadDot} aria-label="unread" />}
      {/* Top row: info left, stage+rep right */}
      <div style={styles.topRow}>
        <div style={styles.infoCol}>
          <span style={styles.name}><Highlight text={name} query={searchQuery} /></span>
          <span style={styles.location}>
            <Highlight text={[surgeon.city, surgeon.state].filter(Boolean).join(', ')} query={searchQuery} />
            {surgeon.npi ? <> | NPI: <Highlight text={surgeon.npi} query={searchQuery} /></> : ''}
          </span>
        </div>
        <div style={styles.rightCol}>
          {stageInfo && (
            <span style={{ ...styles.stagePill, backgroundColor: stageInfo.bg, color: stageInfo.color }}>
              {surgeon.buying_stage}
            </span>
          )}
          {repName && <span style={styles.repName}>{repName}</span>}
        </div>
      </div>

      {/* CPT row */}
      {cptItems.length > 0 && (
        <div style={styles.cptSection}>
          {cptItems.map((c, i) => {
            const price = cptPriceMap?.[c.cpt_code] || 0;
            const value = (c.annual_volume || 0) * price;
            return (
              <div key={i} style={styles.cptRow}>
                <span style={styles.cptCode}>{c.cpt_code}</span>
                <span style={styles.cptMeta}>Vol: {c.annual_volume || 0}</span>
                {price > 0 && <span style={styles.cptMeta}>${value.toLocaleString()}</span>}
              </div>
            );
          })}
          {cptItems.length > 1 && (
            <div style={styles.cptTotalRow}>
              <span style={styles.cptTotalLabel}>Total</span>
              <span style={styles.cptMeta}>Vol: {totalVolume}</span>
              {totalValue > 0 && <span style={styles.cptMeta}>${totalValue.toLocaleString()}</span>}
            </div>
          )}
        </div>
      )}

      {/* Call log row */}
      {latestCall && (
        <div style={styles.callSection}>
          <div style={styles.callMeta}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {callRepName && <span style={styles.callRep}>{callRepName}</span>}
              {latestCall.repRole && <span style={styles.callRole}>{latestCall.repRole}</span>}
              {latestCall.managerName && <span style={styles.callManager}>({latestCall.managerName})</span>}
            </div>
            <span style={styles.callDate}>
              {safeDate(latestCall.call_date)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          {latestCall.summary && (
            <span style={styles.callSummary}>{latestCall.summary}</span>
          )}
        </div>
      )}

      {/* Close date */}
      {surgeon.forecast_close_date && (
        <span style={styles.closeDate}>
          Close: {safeDate(surgeon.forecast_close_date)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )}
    </button>
  );
};

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  cardUnread: {
    border: '1px solid #fecaca',
    backgroundColor: '#fffbfb',
  },
  unreadDot: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    boxShadow: '0 0 0 2px #ffffff',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  location: {
    fontSize: '12px',
    color: '#64748b',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  stagePill: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  repName: {
    fontSize: '11px',
    color: '#475569',
    fontWeight: '500',
  },
  cptSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  cptRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cptCode: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e3a8a',
    minWidth: '60px',
  },
  cptMeta: {
    fontSize: '11px',
    color: '#64748b',
  },
  cptTotalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '3px',
    borderTop: '1px dashed #e2e8f0',
  },
  cptTotalLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1e293b',
    minWidth: '60px',
  },
  callSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  callMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callRep: {
    fontSize: '12px',
    color: '#475569',
    fontWeight: '500',
  },
  callRole: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  callManager: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  callDate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  callSummary: {
    fontSize: '12px',
    color: '#334155',
    lineHeight: '1.4',
  },
  closeDate: {
    fontSize: '11px',
    color: '#d97706',
    fontWeight: '600',
  },
};

export default AccountCard;
