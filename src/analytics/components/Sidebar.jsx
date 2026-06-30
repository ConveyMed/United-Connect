import { NavLink, useNavigate } from 'react-router-dom'
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDeviceMobile,
  HiOutlineNewspaper,
  HiOutlineCollection,
  HiOutlineAcademicCap,
  HiOutlineDownload,
  HiOutlineLightBulb,
  HiOutlineChatAlt2,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlineBell,
  HiOutlineTrendingUp,
  HiOutlineArrowLeft
} from 'react-icons/hi'

const NAV_ITEMS = [
  { path: '/manage-analytics', label: 'Dashboard', icon: HiOutlineHome, end: true },
  { path: '/manage-analytics/user-activity', label: 'User Activity', icon: HiOutlineUsers },
  { path: '/manage-analytics/screens', label: 'Screen Engagement', icon: HiOutlineDeviceMobile },
  { path: '/manage-analytics/feed', label: 'Feed Activity', icon: HiOutlineNewspaper },
  { path: '/manage-analytics/library', label: 'Library Assets', icon: HiOutlineCollection },
  { path: '/manage-analytics/training', label: 'Training Assets', icon: HiOutlineAcademicCap },
  { path: '/manage-analytics/downloads', label: 'Downloads', icon: HiOutlineDownload },
  { path: '/manage-analytics/ai-usage', label: 'AI Usage', icon: HiOutlineLightBulb },
  { path: '/manage-analytics/chat', label: 'Chat Activity', icon: HiOutlineChatAlt2 },
  { path: '/manage-analytics/directory', label: 'Directory Usage', icon: HiOutlineUserGroup },
  { path: '/manage-analytics/user-report', label: 'User Report', icon: HiOutlineUser },
  { path: '/manage-analytics/notifications', label: 'Notifications', icon: HiOutlineBell },
  { path: '/manage-analytics/growth', label: 'Growth & Retention', icon: HiOutlineTrendingUp }
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <button onClick={() => navigate('/profile')} style={styles.backButton}>
          <HiOutlineArrowLeft style={{ fontSize: '16px' }} />
          <span>Back to App</span>
        </button>
        <div style={styles.titleRow}>
          <h1 style={styles.logo}>Analytics</h1>
          <span style={styles.tagline}>Dashboard</span>
        </div>
      </div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {})
            })}
          >
            <Icon style={styles.navIcon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    height: '100vh',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0
  },
  header: {
    padding: '16px 20px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    alignSelf: 'flex-start'
  },
  titleRow: {
    display: 'flex',
    flexDirection: 'column'
  },
  logo: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  tagline: {
    fontSize: '13px',
    color: 'var(--accent)',
    fontWeight: '500'
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 0.15s'
  },
  navItemActive: {
    backgroundColor: 'var(--accent)',
    color: '#ffffff'
  },
  navIcon: {
    fontSize: '18px',
    flexShrink: 0
  }
}
