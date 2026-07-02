// Branded boot screen shown while auth/session state resolves.
// Background matches capacitor.config.ts SplashScreen.backgroundColor (#01040F)
// so the handoff from the native splash is seamless, no flash.
const AnimatedSplash = () => (
  <div style={styles.container}>
    <div style={styles.glow} />
    <div style={styles.logoWrap}>
      <img src="/company-logo.png" alt="United Connect" style={styles.logo} />
    </div>
    <div style={styles.dots}>
      <span style={{ ...styles.dot, animationDelay: '0ms' }} />
      <span style={{ ...styles.dot, animationDelay: '160ms' }} />
      <span style={{ ...styles.dot, animationDelay: '320ms' }} />
    </div>
  </div>
);

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#01040F',
    overflow: 'hidden',
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(76, 172, 135, 0.35) 0%, rgba(76, 172, 135, 0) 70%)',
    animation: 'splashGlow 2.6s ease-in-out infinite',
  },
  logoWrap: {
    position: 'relative',
    animation: 'splashLogoIn 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
  },
  logo: {
    width: '96px',
    height: '96px',
    objectFit: 'contain',
    borderRadius: '20px',
  },
  dots: {
    position: 'relative',
    display: 'flex',
    gap: '6px',
    marginTop: '36px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#4CAC87',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
};

export default AnimatedSplash;
