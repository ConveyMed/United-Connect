import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FieldIntelHeader = () => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div style={styles.header}>
        <button style={styles.exitBtn} onClick={() => setShowConfirm(true)}>
          <CloseIcon />
        </button>
        <h1 style={styles.title}>Field Intelligence</h1>
        <div style={styles.spacer} />
      </div>

      {showConfirm && (
        <div style={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <span style={styles.modalTitle}>Leave Field Intelligence?</span>
            <span style={styles.modalDesc}>You'll return to the home screen.</span>
            <div style={styles.modalBtnRow}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.modalCancelBtn}
              >
                Stay
              </button>
              <button
                onClick={() => navigate('/home')}
                style={styles.modalConfirmBtn}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  exitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    minWidth: '36px',
    height: '36px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    textAlign: 'center',
    flex: 1,
  },
  spacer: {
    minWidth: '36px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1e293b',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  modalBtnRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default FieldIntelHeader;
