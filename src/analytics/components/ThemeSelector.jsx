import { useTheme } from '../context/ThemeContext'
import { HiOutlineSun, HiOutlineMoon, HiOutlineSparkles } from 'react-icons/hi'

const THEME_ICONS = {
  light: HiOutlineSun,
  dark: HiOutlineMoon,
  colorful: HiOutlineSparkles
}

export default function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme()

  return (
    <div style={styles.container}>
      <label style={styles.label}>Theme</label>
      <div style={styles.buttons}>
        {availableThemes.map((t) => {
          const Icon = THEME_ICONS[t.id]
          const isActive = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                ...styles.button,
                ...(isActive ? styles.buttonActive : {})
              }}
              title={t.name}
            >
              <Icon style={styles.icon} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  buttons: {
    display: 'flex',
    gap: '4px'
  },
  button: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonActive: {
    backgroundColor: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#ffffff'
  },
  icon: {
    fontSize: '18px',
    display: 'block'
  }
}
