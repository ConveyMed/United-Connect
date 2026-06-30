import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)'
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '24px 32px',
    maxHeight: '100vh'
  }
}
