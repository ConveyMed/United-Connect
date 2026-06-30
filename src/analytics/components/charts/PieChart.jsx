import Chart from 'react-apexcharts'
import { useTheme } from '../../context/ThemeContext'
import { getChartOptions } from '../../config/themes'

export default function PieChart({
  title,
  series,
  labels,
  height = 350,
  showLegend = true
}) {
  const { theme } = useTheme()

  // Guard against empty or all-zero series
  const total = (series || []).reduce((sum, val) => sum + (val || 0), 0)
  if (!series || series.length === 0 || total === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No data available</div>
      </div>
    )
  }

  const options = getChartOptions(theme, {
    chart: {
      type: 'donut',
      height: height
    },
    labels,
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              color: 'var(--text-primary)'
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--text-primary)'
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }
          }
        }
      }
    },
    legend: {
      show: showLegend,
      position: 'bottom',
      horizontalAlign: 'center'
    },
    dataLabels: {
      enabled: false
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
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: '100%'
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  })

  return (
    <div style={styles.container}>
      <Chart
        options={options}
        series={series}
        type="donut"
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
