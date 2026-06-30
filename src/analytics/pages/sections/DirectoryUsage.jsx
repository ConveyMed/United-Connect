import { useEffect } from 'react'
import { HiOutlineUserGroup, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useDirectoryUsage from '../../hooks/useDirectoryUsage'
import { formatNumber } from '../../components/export/exportUtils'

export default function DirectoryUsage() {
  const { data, loading, error, fetchData } = useDirectoryUsage()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Profile Views',
      value: formatNumber(data.totalProfileViews),
      icon: HiOutlineEye
    },
    {
      title: 'Directory Searches',
      value: formatNumber(data.totalSearches),
      icon: HiOutlineSearch
    },
    {
      title: 'Users Who Searched',
      value: formatNumber(data.usersWhoSearched),
      icon: HiOutlineUserGroup
    }
  ] : []

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'views', label: 'Profile Views', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Directory Usage</h1>
          <p style={styles.subtitle}>Profile views and directory searches</p>
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

          {data.mostViewedProfiles.length > 0 ? (
            <DataTable
              title="Most Viewed Profiles"
              columns={columns}
              data={data.mostViewedProfiles}
              defaultSortColumn="views"
            />
          ) : (
            <div style={styles.empty}>
              No directory usage found in this timeframe.
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
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)'
  }
}
