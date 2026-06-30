// ApexCharts theme configurations

export const THEMES = {
  light: {
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
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    chart: {
      background: '#1f2937',
      foreColor: '#f9fafb',
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
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'],
    grid: {
      borderColor: '#374151',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark'
    },
    legend: {
      labels: {
        colors: '#9ca3af'
      }
    },
    xaxis: {
      labels: {
        style: {
          colors: '#9ca3af'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9ca3af'
        }
      }
    }
  },
  colorful: {
    id: 'colorful',
    name: 'Colorful',
    chart: {
      background: '#ffffff',
      foreColor: '#581c87',
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
    colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#22c55e', '#eab308'],
    grid: {
      borderColor: '#e9d5ff',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'light'
    },
    legend: {
      labels: {
        colors: '#7c3aed'
      }
    },
    xaxis: {
      labels: {
        style: {
          colors: '#7c3aed'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#7c3aed'
        }
      }
    }
  }
}

export const DEFAULT_THEME = 'light'

// Helper to get ApexCharts options with theme applied
export function getChartOptions(themeId, customOptions = {}) {
  const theme = THEMES[themeId] || THEMES.light

  return {
    chart: {
      ...theme.chart,
      ...customOptions.chart
    },
    colors: customOptions.colors || theme.colors,
    grid: {
      ...theme.grid,
      ...customOptions.grid
    },
    tooltip: {
      ...theme.tooltip,
      ...customOptions.tooltip
    },
    legend: {
      ...theme.legend,
      ...customOptions.legend
    },
    xaxis: {
      ...theme.xaxis,
      ...customOptions.xaxis
    },
    yaxis: {
      ...theme.yaxis,
      ...customOptions.yaxis
    },
    ...customOptions
  }
}
