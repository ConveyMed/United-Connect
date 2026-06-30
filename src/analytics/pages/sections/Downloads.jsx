import { useEffect } from 'react'
import { HiOutlineDownload, HiOutlineUsers } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useDownloads from '../../hooks/useDownloads'
import { formatNumber } from '../../components/export/exportUtils'

export default function Downloads() {
  const { data, loading, error, fetchData } = useDownloads()

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
      title: 'Users Who Downloaded',
      value: formatNumber(data.usersWhoDownloaded),
      subtitle: `${data.downloadRate}% of users`
    },
    {
      title: 'Never Downloaded',
      value: formatNumber(data.usersNeverDownloaded)
    },
    {
      title: 'Total Downloads',
      value: formatNumber(data.totalDownloads),
      icon: HiOutlineDownload
    },
    {
      title: 'Avg per Downloader',
      value: data.avgDownloadsPerUser
    }
  ] : []

  const userColumns = [
    { key: 'name', label: 'User' },
    { key: 'downloads', label: 'Downloads', align: 'right' }
  ]

  const contentColumns = [
    {
      key: 'contentName',
      label: 'Content Name',
      render: (val, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {val}
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: row.inApp ? '#dcfce7' : '#fee2e2',
            color: row.inApp ? '#166534' : '#991b1b',
            whiteSpace: 'nowrap'
          }}>
            {row.inApp ? 'In App' : 'Removed'}
          </span>
        </span>
      )
    },
    { key: 'downloads', label: 'Downloads', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Downloads</h1>
          <p style={styles.subtitle}>Content download activity</p>
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

          <div style={styles.tablesGrid}>
            {data.topDownloaders.length > 0 && (
              <DataTable
                title="Top Downloaders"
                columns={userColumns}
                data={data.topDownloaders}
                defaultSortColumn="downloads"
              />
            )}

            {data.mostDownloaded.length > 0 && (
              <DataTable
                title="Most Downloaded Content"
                columns={contentColumns}
                data={data.mostDownloaded}
                defaultSortColumn="downloads"
              />
            )}
          </div>

          {data.totalDownloads === 0 && (
            <div style={styles.empty}>
              No downloads found in this timeframe.
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
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px'
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
