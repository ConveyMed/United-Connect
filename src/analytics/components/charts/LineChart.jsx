import Chart from 'react-apexcharts'
import { useTheme } from '../../context/ThemeContext'
import { getChartOptions } from '../../config/themes'

export default function LineChart({
  title,
  series,
  categories,
  height = 350,
  showArea = false
}) {
  const { theme } = useTheme()

  // Guard against empty or invalid series data
  if (!series || series.length === 0 || !series[0]?.data || series[0].data.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No data available</div>
      </div>
    )
  }

  const options = getChartOptions(theme, {
    chart: {
      type: showArea ? 'area' : 'line',
      height: height,
      zoom: {
        enabled: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: showArea ? {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    } : undefined,
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: 'var(--text-secondary)'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--text-secondary)'
        }
      }
    },
    title: title ? {
      text: title,
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--text-primary)'
      }
    } : undefined,
    markers: {
      size: 4,
      hover: {
        size: 6
      }
    }
  })

  return (
    <div style={styles.container}>
      <Chart
        options={options}
        series={series}
        type={showArea ? 'area' : 'line'}
        height={height}
      />
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border)'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  }
}
