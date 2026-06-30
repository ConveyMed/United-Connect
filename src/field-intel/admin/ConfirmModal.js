import React from 'react';

const ConfirmModal = ({
  title,
  message,
  subtitle,
  confirmLabel = 'Continue',
  confirmColor = '#1e3a8a',
  onConfirm,
  secondLabel,
  secondColor = '#dc2626',
  onSecond,
  onCancel,
}) => {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.desc}>{message}</p>
        {subtitle && (
          <p style={styles.subtitle}>{subtitle}</p>
        )}
        <div style={styles.actions}>
          <button onClick={onConfirm} style={{ ...styles.actionBtn, backgroundColor: confirmColor }}>
            {confirmLabel}
          </button>
          {secondLabel && onSecond && (
            <button onClick={onSecond} style={{ ...styles.actionBtn, backgroundColor: secondColor }}>
              {secondLabel}
            </button>
          )}
          <button onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.5',
    textDecoration: 'underline',
    textDecorationColor: '#cbd5e1',
    textUnderlineOffset: '3px',
  },
  desc: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  actionBtn: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  cancelBtn: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'center',
  },
};

export default ConfirmModal;
