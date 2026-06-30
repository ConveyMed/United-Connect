import { useEffect } from 'react'
import { HiOutlineBell, HiOutlineCursorClick, HiOutlineEye, HiOutlineUsers, HiOutlineSpeakerphone } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import BarChart from '../../components/charts/BarChart'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useNotifications from '../../hooks/useNotifications'
import { formatNumber } from '../../components/export/exportUtils'

export default function Notifications() {
  const { data, loading, error, fetchData } = useNotifications()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total Notifications Sent',
      value: formatNumber(data.totalSent),
      icon: HiOutlineBell
    },
    {
      title: 'Post Notifications',
      value: formatNumber(data.postPushCount),
      icon: HiOutlineSpeakerphone,
      subtitle: 'Posts with push enabled'
    },
    {
      title: 'Updates Sent',
      value: formatNumber(data.updateCount)
    },
    {
      title: 'Events Sent',
      value: formatNumber(data.eventCount)
    },
    {
      title: 'Update Reads',
      value: formatNumber(data.totalReads),
      icon: HiOutlineEye,
      subtitle: `${data.uniqueReaders} unique readers`
    },
    {
      title: 'Push Clicks',
      value: formatNumber(data.totalClicks),
      icon: HiOutlineCursorClick,
      subtitle: `${data.uniqueClickers} unique users`
    }
  ] : []

  const breakdownColumns = [
    { key: 'type', label: 'Type' },
    { key: 'count', label: 'Count', align: 'right' }
  ]

  const recentColumns = [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    {
      key: 'createdAt',
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString()
    }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notifications</h1>
          <p style={styles.subtitle}>Post notifications, updates, events, and push activity</p>
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

          {data.breakdown.length > 0 && (
            <div style={styles.grid}>
              <BarChart
                title="Notifications by Type"
                series={[{
                  name: 'Count',
                  data: data.breakdown.map(t => t.count)
                }]}
                categories={data.breakdown.map(t => t.type)}
                height={250}
              />

              <DataTable
                title="Type Breakdown"
                columns={breakdownColumns}
                data={data.breakdown}
                defaultSortColumn="count"
              />
            </div>
          )}

          {data.recentItems.length > 0 && (
            <div style={styles.tableSection}>
              <DataTable
                title="Recent Notifications"
                columns={recentColumns}
                data={data.recentItems}
              />
            </div>
          )}

          {data.totalSent === 0 && (
            <div style={styles.empty}>
              No notifications found in this timeframe.
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
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
