import { useEffect, useState } from 'react'
import { HiOutlineLightBulb, HiOutlineUsers, HiOutlineQuestionMarkCircle } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import UnansweredQuestionsModal from '../../components/UnansweredQuestionsModal'
import useAIUsage from '../../hooks/useAIUsage'
import { formatNumber } from '../../components/export/exportUtils'

export default function AIUsage() {
  const { data, loading, error, fetchData } = useAIUsage()
  const [showUnanswered, setShowUnanswered] = useState(false)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total AI Queries',
      value: formatNumber(data.totalQueries),
      icon: HiOutlineLightBulb
    },
    {
      title: 'Users Who Used AI',
      value: formatNumber(data.usersWhoUsedAI),
      icon: HiOutlineUsers
    },
    {
      title: 'Never Used AI',
      value: formatNumber(data.usersNeverUsedAI)
    },
    {
      title: 'Avg Queries per User',
      value: data.avgQueriesPerUser,
      subtitle: 'For users who used AI'
    }
  ] : []

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'queries', label: 'AI Queries', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Usage</h1>
          <p style={styles.subtitle}>AI feature adoption and usage</p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setShowUnanswered(true)}
            style={styles.unansweredButton}
          >
            <HiOutlineQuestionMarkCircle style={styles.buttonIcon} />
            View Unanswered Questions
          </button>
          <TimeframeSelector onApply={fetchData} />
        </div>
      </div>

      <UnansweredQuestionsModal
        isOpen={showUnanswered}
        onClose={() => setShowUnanswered(false)}
      />

      {error && (
        <div style={styles.error}>Error: {error}</div>
      )}

      {loading && !data ? (
        <LoadingSpinner />
      ) : data ? (
        <>
          <StatCardGrid stats={stats} />

          {data.topAIUsers.length > 0 ? (
            <DataTable
              title="Top AI Users"
              columns={columns}
              data={data.topAIUsers}
              defaultSortColumn="queries"
            />
          ) : (
            <div style={styles.empty}>
              No AI usage found in this timeframe.
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
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  unansweredButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  buttonIcon: {
    fontSize: '16px',
    color: 'var(--accent)'
  }
}
