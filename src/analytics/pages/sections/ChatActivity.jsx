import { useEffect } from 'react'
import { HiOutlineChatAlt2, HiOutlineUsers } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useChatActivity from '../../hooks/useChatActivity'
import { formatNumber } from '../../components/export/exportUtils'

export default function ChatActivity() {
  const { data, loading, error, fetchData } = useChatActivity()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Conversations Started',
      value: formatNumber(data.conversationsStarted),
      icon: HiOutlineChatAlt2
    },
    {
      title: 'Messages Sent',
      value: formatNumber(data.totalMessages)
    },
    {
      title: 'Active Chatters',
      value: formatNumber(data.activeChatters),
      icon: HiOutlineUsers
    },
    {
      title: 'Silent Users',
      value: formatNumber(data.silentUsers),
      subtitle: 'Sent 0 messages'
    },
    {
      title: 'Avg Messages per Chatter',
      value: data.avgMessagesPerChatter
    }
  ] : []

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'messages', label: 'Messages Sent', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Chat Activity</h1>
          <p style={styles.subtitle}>Team communication metrics</p>
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

          {data.topChatters.length > 0 ? (
            <DataTable
              title="Top Chatters"
              columns={columns}
              data={data.topChatters}
              defaultSortColumn="messages"
            />
          ) : (
            <div style={styles.empty}>
              No chat activity found in this timeframe.
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
