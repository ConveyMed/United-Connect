import Chart from 'react-apexcharts'
import { useTheme } from '../../context/ThemeContext'
import { getChartOptions } from '../../config/themes'

export default function BarChart({
  title,
  series,
  categories,
  horizontal = false,
  height = 350,
  showDataLabels = false
}) {
  const { theme } = useTheme()

  const options = getChartOptions(theme, {
    chart: {
      type: 'bar',
      height: height
    },
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: showDataLabels,
      offsetY: horizontal ? 0 : -20,
      style: {
        fontSize: '12px',
        colors: ['var(--text-secondary)']
      }
    },
    xaxis: {
      categories,
      labels: {
        rotate: 0,
        trim: false,
        hideOverlappingLabels: false,
        style: {
          colors: 'var(--text-secondary)',
          fontSize: '11px'
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
    } : undefined
  })

  return (
    <div style={styles.container}>
      <Chart
        options={options}
        series={series}
        type="bar"
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
  }
}
