import { useEffect } from 'react'
import { HiOutlineTrendingUp, HiOutlineUsers, HiOutlineUserAdd } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import LineChart from '../../components/charts/LineChart'
import PieChart from '../../components/charts/PieChart'
import LoadingSpinner from '../../components/LoadingSpinner'
import useGrowthRetention from '../../hooks/useGrowthRetention'
import { formatNumber } from '../../components/export/exportUtils'

export default function GrowthRetention() {
  const { data, loading, error, fetchData } = useGrowthRetention()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total Users',
      value: formatNumber(data.totalUsers),
      icon: HiOutlineUsers
    },
    {
      title: 'New Signups',
      value: formatNumber(data.newSignups),
      icon: HiOutlineUserAdd,
      subtitle: 'In selected timeframe'
    },
    {
      title: 'Active Users',
      value: formatNumber(data.activeUsers),
      icon: HiOutlineTrendingUp
    },
    {
      title: 'Inactive Users',
      value: formatNumber(data.inactiveUsers),
      subtitle: 'No activity in timeframe'
    }
  ] : []

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Growth & Retention</h1>
          <p style={styles.subtitle}>User growth and retention trends</p>
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

          <div style={styles.chartsGrid}>
            {data.growthOverTime.length > 0 && (
              <LineChart
                title="Total Users Over Time"
                series={[{
                  name: 'Total Users',
                  data: data.growthOverTime.map(g => g.total)
                }]}
                categories={data.growthOverTime.map(g => g.date)}
                showArea
                height={350}
              />
            )}

            <PieChart
              title="Active vs Inactive"
              series={[data.activeUsers, data.inactiveUsers]}
              labels={['Active', 'Inactive']}
              height={350}
            />
          </div>

          {data.signupsByDate.length > 0 && (
            <div style={styles.signupsChart}>
              <LineChart
                title="New Signups by Day"
                series={[{
                  name: 'Signups',
                  data: data.signupsByDate.map(s => s.count)
                }]}
                categories={data.signupsByDate.map(s => s.date)}
                height={300}
              />
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
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  signupsChart: {
    marginTop: '24px'
  }
}
