export default function LoadingSpinner({ size = 40, fullScreen = false }) {
  if (fullScreen) {
    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.spinner, width: size, height: size }} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.spinner, width: size, height: size }} />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px'
  },
  fullScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    zIndex: 9999
  },
  spinner: {
    border: '3px solid var(--border)',
    borderTop: '3px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
}

// Add keyframe animation via style tag
if (typeof document !== 'undefined' && !document.getElementById('spinner-styles')) {
  const styleTag = document.createElement('style')
  styleTag.id = 'spinner-styles'
  styleTag.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(styleTag)
}
