import { useEffect } from 'react'
import { HiOutlineEye } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import BarChart from '../../components/charts/BarChart'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useScreenEngagement from '../../hooks/useScreenEngagement'
import { formatNumber } from '../../components/export/exportUtils'

export default function ScreenEngagement() {
  const { data, loading, error, fetchData } = useScreenEngagement()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total Screen Views',
      value: formatNumber(data.totalViews),
      icon: HiOutlineEye
    },
    {
      title: 'Unique Screens',
      value: formatNumber(data.screens.length),
      subtitle: 'Different screens viewed'
    }
  ] : []

  const columns = [
    { key: 'screenName', label: 'Screen Name' },
    { key: 'views', label: 'Views', align: 'right' },
    { key: 'uniqueUsers', label: 'Unique Users', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Screen Engagement</h1>
          <p style={styles.subtitle}>Which screens users visit most</p>
        </div>
        <TimeframeSelector onApply={fetchData} />
      </div>

      {error && (
        <div style={styles.error}>Error: {error}</div>
      )}

      {loading && !data ? (
        <LoadingSpinner />
      ) : data ? (
        <>
          <StatCardGrid stats={stats} />

          {data.topScreens.length > 0 && (
            <>
              <div style={styles.chartSection}>
                <BarChart
                  title="Most Viewed Screens"
                  series={[{
                    name: 'Views',
                    data: data.topScreens.slice(0, 10).map(s => s.views)
                  }]}
                  categories={data.topScreens.slice(0, 10).map(s => s.screenName)}
                  horizontal
                  height={400}
                />
              </div>

              <div style={styles.tableSection}>
                <DataTable
                  title="All Screen Views"
                  columns={columns}
                  data={data.screens}
                  defaultSortColumn="views"
                />
              </div>
            </>
          )}

          {data.topScreens.length === 0 && (
            <div style={styles.empty}>
              No screen view data available for this timeframe.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  error: {
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    color: 'var(--error)',
    marginBottom: '24px'
  },
  chartSection: {
    marginBottom: '24px'
  },
  tableSection: {
    marginTop: '24px'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)'
  }
}
