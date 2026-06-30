import { useEffect } from 'react'
import { HiOutlineAcademicCap, HiOutlineCursorClick } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useTrainingAssets from '../../hooks/useTrainingAssets'
import { formatNumber } from '../../components/export/exportUtils'

export default function TrainingAssets() {
  const { data, loading, error, fetchData } = useTrainingAssets()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total Interactions',
      value: formatNumber(data.totalInteractions),
      icon: HiOutlineCursorClick,
      subtitle: 'Clicks inside expanded views'
    },
    {
      title: 'Unique Users',
      value: formatNumber(data.totalUniqueUsers),
      icon: HiOutlineAcademicCap,
      subtitle: 'Users who interacted'
    },
    {
      title: 'Training Accessed',
      value: formatNumber(data.assets.length),
      subtitle: 'Different training items'
    }
  ] : []

  const columns = [
    {
      key: 'assetName',
      label: 'Training Name',
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
    { key: 'interactions', label: 'Total Interactions', align: 'right' },
    { key: 'uniqueUsers', label: 'Unique Users', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Training Assets</h1>
          <p style={styles.subtitle}>Engagement with training content</p>
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

          {data.assets.length > 0 ? (
            <DataTable
              title="Training Asset Engagement"
              columns={columns}
              data={data.assets}
              defaultSortColumn="interactions"
            />
          ) : (
            <div style={styles.empty}>
              No training interactions found in this timeframe.
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
