import React from 'react';

const DragConfirmModal = ({ personName, fromRole, toRole, subordinateCount, onKeep, onRemove, onCancel }) => {
  const ROLE_LABELS = { vp: 'VP', manager: 'Manager', rep: 'Rep' };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Role Change</h3>
        <p style={styles.desc}>
          <strong>{personName}</strong> will change from {ROLE_LABELS[fromRole]} to {ROLE_LABELS[toRole]}.
        </p>
        <p style={styles.desc}>
          {subordinateCount} {subordinateCount === 1 ? 'person reports' : 'people report'} to this person.
        </p>

        <div style={styles.actions}>
          <button onClick={onKeep} style={styles.keepBtn}>
            Keep reporting to {personName}
          </button>
          <button onClick={onRemove} style={styles.removeBtn}>
            Remove their relationship
          </button>
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
    maxWidth: '380px',
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
  keepBtn: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  removeBtn: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
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

export default DragConfirmModal;
