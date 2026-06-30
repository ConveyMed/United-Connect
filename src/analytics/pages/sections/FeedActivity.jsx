import { useEffect } from 'react'
import { HiOutlineNewspaper, HiOutlineHeart, HiOutlineChatAlt } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import StatCardGrid from '../../components/charts/StatCardGrid'
import BarChart from '../../components/charts/BarChart'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useFeedActivity from '../../hooks/useFeedActivity'
import { formatNumber } from '../../components/export/exportUtils'

export default function FeedActivity() {
  const { data, loading, error, fetchData } = useFeedActivity()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = data ? [
    {
      title: 'Total Posts',
      value: formatNumber(data.totalPosts),
      icon: HiOutlineNewspaper
    },
    {
      title: 'Posts with Engagement',
      value: formatNumber(data.postsWithEngagement),
      subtitle: `${data.engagementRate}% engagement rate`
    },
    {
      title: 'No Response Posts',
      value: formatNumber(data.postsNoEngagement),
      subtitle: 'Zero likes or comments'
    },
    {
      title: 'Avg Unique Users (All)',
      value: data.avgUniqueUsersAll,
      subtitle: 'Per post average'
    },
    {
      title: 'Avg Unique Users (Engaged)',
      value: data.avgUniqueUsersEngaged,
      subtitle: 'Posts with engagement only'
    }
  ] : []

  const columns = [
    {
      key: 'title',
      label: 'Post Title',
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {val}
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            whiteSpace: 'nowrap'
          }}>
            In App
          </span>
        </span>
      )
    },
    {
      key: 'likes',
      label: 'Likes',
      align: 'right',
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
          <HiOutlineHeart style={{ color: 'var(--error)' }} />
          {formatNumber(val)}
        </span>
      )
    },
    {
      key: 'comments',
      label: 'Comments',
      align: 'right',
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
          <HiOutlineChatAlt style={{ color: 'var(--accent)' }} />
          {formatNumber(val)}
        </span>
      )
    },
    { key: 'points', label: 'Points', align: 'right' },
    { key: 'uniqueEngagers', label: 'Unique Users', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Feed Activity</h1>
          <p style={styles.subtitle}>Post engagement and performance</p>
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

          {data.topPosts.length > 0 && (
            <>
              <div style={styles.chartSection}>
                <BarChart
                  title="Top 5 Posts by Engagement Points"
                  series={[{
                    name: 'Points',
                    data: data.topPosts.map(p => p.points)
                  }]}
                  categories={data.topPosts.map(p => {
                    // Split into ~25 char lines for wrapping
                    const words = p.title.split(' ')
                    const lines = []
                    let currentLine = ''
                    words.forEach(word => {
                      if ((currentLine + ' ' + word).trim().length <= 25) {
                        currentLine = (currentLine + ' ' + word).trim()
                      } else {
                        if (currentLine) lines.push(currentLine)
                        currentLine = word
                      }
                    })
                    if (currentLine) lines.push(currentLine)
                    return lines
                  })}
                  height={450}
                />
              </div>

              <div style={styles.tableSection}>
                <DataTable
                  title="Top Performing Posts"
                  columns={columns}
                  data={data.topPosts}
                  defaultSortColumn="points"
                />
              </div>
            </>
          )}

          {data.totalPosts === 0 && (
            <div style={styles.empty}>
              No posts found in this timeframe.
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
