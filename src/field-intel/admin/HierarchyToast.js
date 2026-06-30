import React from 'react';

const HierarchyToast = ({ toast }) => {
  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669',
      color: '#ffffff',
      padding: '12px 20px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: 300,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      pointerEvents: 'none',
    }}>
      {toast.message}
    </div>
  );
};

export default HierarchyToast;
