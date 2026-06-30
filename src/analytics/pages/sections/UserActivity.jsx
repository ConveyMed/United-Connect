import { useEffect } from 'react'
import { HiOutlineUsers, HiOutlineUserGroup, HiOutlineClock } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import PieChart from '../../components/charts/PieChart'
import LoadingSpinner from '../../components/LoadingSpinner'
import useUserActivity from '../../hooks/useUserActivity'
import { formatNumber, formatDuration } from '../../components/export/exportUtils'

export default function UserActivity() {
  const { data, loading, error, fetchData } = useUserActivity()

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
      title: 'Active Users',
      value: formatNumber(data.activeUsers),
      subtitle: 'Users with activity in timeframe',
      icon: HiOutlineUserGroup
    },
    {
      title: 'Inactive Users',
      value: formatNumber(data.inactiveUsers),
      subtitle: 'No activity in timeframe'
    },
    {
      title: 'Engagement Rate',
      value: `${data.engagementRatio}%`,
      subtitle: 'Active / Total users'
    },
    {
      title: 'Total Sessions',
      value: formatNumber(data.totalSessions)
    },
    {
      title: 'Sessions per User',
      value: data.sessionsPerUser,
      subtitle: 'Average for active users'
    },
    {
      title: 'Avg Session Duration',
      value: formatDuration(data.avgDuration),
      icon: HiOutlineClock
    }
  ] : []

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Activity</h1>
          <p style={styles.subtitle}>Session and engagement metrics</p>
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

          <div style={styles.chartSection}>
            <PieChart
              title="User Engagement Breakdown"
              series={[data.activeUsers, data.inactiveUsers]}
              labels={['Active Users', 'Inactive Users']}
              height={350}
            />
          </div>
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
    maxWidth: '500px'
  }
}
