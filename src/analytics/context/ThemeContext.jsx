import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext(null)

const LIGHT_THEME = {
  id: 'light',
  name: 'Light',
  chart: {
    background: '#ffffff',
    foreColor: '#1a2a35',
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: false,
        zoom: false,
        zoomin: false,
        zoomout: false,
        pan: false,
        reset: false
      }
    }
  },
  colors: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  grid: {
    borderColor: '#e2e8f0',
    strokeDashArray: 4
  },
  tooltip: {
    theme: 'light'
  },
  legend: {
    labels: {
      colors: '#64748b'
    }
  },
  xaxis: {
    labels: {
      style: {
        colors: '#64748b'
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: '#64748b'
      }
    }
  }
}

const CSS_VARS = {
  '--bg-primary': '#f1f5f9',
  '--bg-surface': '#ffffff',
  '--bg-secondary': '#f8fafc',
  '--border': '#e2e8f0',
  '--text-primary': '#1e293b',
  '--text-secondary': '#64748b',
  '--accent': '#3b82f6',
  '--success': '#22c55e',
  '--error': '#ef4444'
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement
    Object.entries(CSS_VARS).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [])

  const value = {
    theme: 'light',
    setTheme: () => {},
    currentTheme: LIGHT_THEME,
    availableThemes: [LIGHT_THEME]
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
