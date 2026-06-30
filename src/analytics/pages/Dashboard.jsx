import { useState, useEffect, useCallback } from 'react'
import { HiOutlineDownload, HiOutlineUsers, HiOutlineEye, HiOutlineChat } from 'react-icons/hi'
import TimeframeSelector from '../components/TimeframeSelector'
import StatCardGrid from '../components/charts/StatCardGrid'
import PieChart from '../components/charts/PieChart'
import BarChart from '../components/charts/BarChart'
import LoadingSpinner from '../components/LoadingSpinner'
import ExportModal from '../components/export/ExportModal'
import useUserActivity from '../hooks/useUserActivity'
import useScreenEngagement from '../hooks/useScreenEngagement'
import useFeedActivity from '../hooks/useFeedActivity'
import useLibraryAssets from '../hooks/useLibraryAssets'
import useTrainingAssets from '../hooks/useTrainingAssets'
import useDownloads from '../hooks/useDownloads'
import useAIUsage from '../hooks/useAIUsage'
import useChatActivity from '../hooks/useChatActivity'
import useDirectoryUsage from '../hooks/useDirectoryUsage'
import useNotifications from '../hooks/useNotifications'
import useGrowthRetention from '../hooks/useGrowthRetention'
import { formatNumber, formatDuration, downloadExcel } from '../components/export/exportUtils'
import { useAppContext } from '../context/AppContext'
import useUserReport from '../hooks/useUserReport'

export default function Dashboard() {
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { supabase, dateRange } = useAppContext()

  const userReport = useUserReport()
  const userActivity = useUserActivity()
  const screenEngagement = useScreenEngagement()
  const feedActivity = useFeedActivity()
  const libraryAssets = useLibraryAssets()
  const trainingAssets = useTrainingAssets()
  const downloads = useDownloads()
  const aiUsage = useAIUsage()
  const chatActivity = useChatActivity()
  const directoryUsage = useDirectoryUsage()
  const notifications = useNotifications()
  const growthRetention = useGrowthRetention()

  const loading = userActivity.loading || screenEngagement.loading || feedActivity.loading

  const fetchAllData = useCallback(() => {
    userActivity.fetchData()
    screenEngagement.fetchData()
    feedActivity.fetchData()
    libraryAssets.fetchData()
    trainingAssets.fetchData()
    downloads.fetchData()
    aiUsage.fetchData()
    chatActivity.fetchData()
    directoryUsage.fetchData()
    notifications.fetchData()
    growthRetention.fetchData()
  }, [
    userActivity.fetchData, screenEngagement.fetchData, feedActivity.fetchData,
    libraryAssets.fetchData, trainingAssets.fetchData, downloads.fetchData,
    aiUsage.fetchData, chatActivity.fetchData, directoryUsage.fetchData,
    notifications.fetchData, growthRetention.fetchData
  ])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleExport = async ({ sections, format, csvType = 'combined', includeUserReport: includeReport = true }) => {
    setExporting(true)

    try {
      const exportSections = []

      // Fetch flat user report rows if requested
      let userReportRows = []
      let reportCategories = []
      let reportScreenNames = []
      if (includeReport) {
        const result = await userReport.fetchAllUsersData()
        userReportRows = result.rows || []
        reportCategories = result.categories || []
        reportScreenNames = result.screenNames || []
      }

      // Build date range string
      let dateRangeStr = 'All Time'
      if (dateRange.startDate && dateRange.endDate) {
        dateRangeStr = `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
      } else if (dateRange.startDate) {
        dateRangeStr = `From ${dateRange.startDate.toLocaleDateString()}`
      }

      if (sections.includes('userActivity') && userActivity.data) {
        exportSections.push({
          id: 'userActivity',
          title: 'User Activity',
          stats: [
            { title: 'Total Users', value: formatNumber(userActivity.data.totalUsers) },
            { title: 'Active Users', value: formatNumber(userActivity.data.activeUsers) },
            { title: 'Inactive Users', value: formatNumber(userActivity.data.inactiveUsers) },
            { title: 'Engagement Rate', value: `${userActivity.data.engagementRatio}%` },
            { title: 'Total Sessions', value: formatNumber(userActivity.data.totalSessions) },
            { title: 'Avg Session Duration', value: formatDuration(userActivity.data.avgDuration) }
          ]
        })
      }

      if (sections.includes('screenEngagement') && screenEngagement.data) {
        exportSections.push({
          id: 'screenEngagement',
          title: 'Screen Engagement',
          stats: [{ title: 'Total Views', value: formatNumber(screenEngagement.data.totalViews) }],
          columns: [
            { key: 'screenName', label: 'Screen' },
            { key: 'views', label: 'Views' },
            { key: 'uniqueUsers', label: 'Unique Users' }
          ],
          tableData: screenEngagement.data.topScreens
        })
      }

      if (sections.includes('feedActivity') && feedActivity.data) {
        exportSections.push({
          id: 'feedActivity',
          title: 'Feed Activity',
          stats: [
            { title: 'Total Posts', value: formatNumber(feedActivity.data.totalPosts) },
            { title: 'Posts with Engagement', value: formatNumber(feedActivity.data.postsWithEngagement) },
            { title: 'Engagement Rate', value: `${feedActivity.data.engagementRate}%` },
            { title: 'No Response Posts', value: formatNumber(feedActivity.data.postsNoEngagement) }
          ],
          columns: [
            { key: 'title', label: 'Post' },
            { key: 'likes', label: 'Likes' },
            { key: 'comments', label: 'Comments' },
            { key: 'points', label: 'Points' }
          ],
          tableData: feedActivity.data.topPosts
        })
      }

      if (sections.includes('libraryAssets') && libraryAssets.data) {
        exportSections.push({
          id: 'libraryAssets',
          title: 'Library Assets',
          stats: [
            { title: 'Total Interactions', value: formatNumber(libraryAssets.data.totalInteractions) },
            { title: 'Unique Users', value: formatNumber(libraryAssets.data.uniqueUsers) }
          ],
          columns: [
            { key: 'assetName', label: 'Asset' },
            { key: 'category', label: 'Category' },
            { key: 'interactions', label: 'Interactions' },
            { key: 'uniqueUsers', label: 'Unique Users' }
          ],
          tableData: libraryAssets.data.topAssets
        })
      }

      if (sections.includes('trainingAssets') && trainingAssets.data) {
        exportSections.push({
          id: 'trainingAssets',
          title: 'Training Assets',
          stats: [
            { title: 'Total Interactions', value: formatNumber(trainingAssets.data.totalInteractions) },
            { title: 'Unique Users', value: formatNumber(trainingAssets.data.uniqueUsers) }
          ],
          columns: [
            { key: 'assetName', label: 'Asset' },
            { key: 'category', label: 'Category' },
            { key: 'interactions', label: 'Interactions' },
            { key: 'uniqueUsers', label: 'Unique Users' }
          ],
          tableData: trainingAssets.data.topAssets
        })
      }

      if (sections.includes('downloads') && downloads.data) {
        exportSections.push({
          id: 'downloads',
          title: 'Downloads',
          stats: [
            { title: 'Total Users', value: formatNumber(downloads.data.totalUsers) },
            { title: 'Users Who Downloaded', value: formatNumber(downloads.data.usersWhoDownloaded) },
            { title: 'Download Rate', value: `${downloads.data.downloadRate}%` },
            { title: 'Total Downloads', value: formatNumber(downloads.data.totalDownloads) }
          ],
          columns: [
            { key: 'name', label: 'User' },
            { key: 'downloads', label: 'Downloads' }
          ],
          tableData: downloads.data.topDownloaders
        })
      }

      if (sections.includes('aiUsage') && aiUsage.data) {
        exportSections.push({
          id: 'aiUsage',
          title: 'AI Usage',
          stats: [
            { title: 'Total Queries', value: formatNumber(aiUsage.data.totalQueries) },
            { title: 'Users Who Used AI', value: formatNumber(aiUsage.data.usersWhoUsedAI) },
            { title: 'Avg Queries per User', value: aiUsage.data.avgQueriesPerUser }
          ],
          columns: [
            { key: 'name', label: 'User' },
            { key: 'queries', label: 'Queries' }
          ],
          tableData: aiUsage.data.topUsers
        })
      }

      if (sections.includes('chatActivity') && chatActivity.data) {
        exportSections.push({
          id: 'chatActivity',
          title: 'Chat Activity',
          stats: [
            { title: 'Total Messages', value: formatNumber(chatActivity.data.totalMessages) },
            { title: 'Active Chatters', value: formatNumber(chatActivity.data.activeChatters) },
            { title: 'Avg Messages per User', value: chatActivity.data.avgMessagesPerUser }
          ],
          columns: [
            { key: 'name', label: 'User' },
            { key: 'messages', label: 'Messages' }
          ],
          tableData: chatActivity.data.topChatters
        })
      }

      if (sections.includes('directoryUsage') && directoryUsage.data) {
        exportSections.push({
          id: 'directoryUsage',
          title: 'Directory Usage',
          stats: [
            { title: 'Profile Views', value: formatNumber(directoryUsage.data.totalProfileViews) },
            { title: 'Directory Searches', value: formatNumber(directoryUsage.data.totalSearches) },
            { title: 'Users Who Searched', value: formatNumber(directoryUsage.data.usersWhoSearched) }
          ],
          columns: [
            { key: 'name', label: 'User' },
            { key: 'views', label: 'Profile Views' }
          ],
          tableData: directoryUsage.data.mostViewedProfiles
        })
      }

      if (sections.includes('notifications') && notifications.data) {
        exportSections.push({
          id: 'notifications',
          title: 'Notifications',
          stats: [
            { title: 'Total Sent', value: formatNumber(notifications.data.totalSent) },
            { title: 'Post Notifications', value: formatNumber(notifications.data.postPushCount) },
            { title: 'Updates', value: formatNumber(notifications.data.updateCount) },
            { title: 'Events', value: formatNumber(notifications.data.eventCount) },
            { title: 'Total Reads', value: formatNumber(notifications.data.totalReads) },
            { title: 'Push Clicks', value: formatNumber(notifications.data.totalClicks) }
          ],
          columns: [
            { key: 'type', label: 'Type' },
            { key: 'count', label: 'Count' }
          ],
          tableData: notifications.data.breakdown
        })
      }

      if (sections.includes('growthRetention') && growthRetention.data) {
        exportSections.push({
          id: 'growthRetention',
          title: 'Growth & Retention',
          stats: [
            { title: 'Total Users', value: formatNumber(growthRetention.data.totalUsers) },
            { title: 'New Signups', value: formatNumber(growthRetention.data.newSignups) },
            { title: 'Active Users', value: formatNumber(growthRetention.data.activeUsers) },
            { title: 'Inactive Users', value: formatNumber(growthRetention.data.inactiveUsers) }
          ]
        })
      }

      const exportOptions = {
          companyName: 'Analytics',
          dateRange: dateRangeStr,
          userReportRows: userReportRows.length > 0 ? userReportRows : null,
          categories: reportCategories,
          screenNames: reportScreenNames
        }

      await downloadExcel(exportSections, 'analytics-report', exportOptions)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
      setShowExport(false)
    }
  }

  const stats = userActivity.data ? [
    {
      title: 'Total Users',
      value: formatNumber(userActivity.data.totalUsers),
      icon: HiOutlineUsers
    },
    {
      title: 'Active Users',
      value: formatNumber(userActivity.data.activeUsers),
      subtitle: `${userActivity.data.engagementRatio}% engagement`
    },
    {
      title: 'Total Sessions',
      value: formatNumber(userActivity.data.totalSessions),
      subtitle: `${userActivity.data.sessionsPerUser} per user`
    },
    {
      title: 'Avg Session',
      value: formatDuration(userActivity.data.avgDuration),
      icon: HiOutlineEye
    }
  ] : []

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Overview of key metrics</p>
        </div>
        <div style={styles.controls}>
          <TimeframeSelector onApply={fetchAllData} />
          <button onClick={() => setShowExport(true)} style={styles.exportButton}>
            <HiOutlineDownload />
            Export
          </button>
        </div>
      </div>

      {loading && !userActivity.data ? (
        <LoadingSpinner />
      ) : (
        <>
          <StatCardGrid stats={stats} />

          <div style={styles.chartsGrid}>
            {userActivity.data && (
              <PieChart
                title="User Engagement"
                series={[userActivity.data.activeUsers, userActivity.data.inactiveUsers]}
                labels={['Active', 'Inactive']}
                height={300}
              />
            )}

            {screenEngagement.data && screenEngagement.data.topScreens.length > 0 && (
              <BarChart
                title="Top Screens"
                series={[{
                  name: 'Views',
                  data: screenEngagement.data.topScreens.slice(0, 6).map(s => s.views)
                }]}
                categories={screenEngagement.data.topScreens.slice(0, 6).map(s => s.screenName)}
                height={300}
              />
            )}
          </div>

          {feedActivity.data && (
            <div style={styles.feedSection}>
              <h3 style={styles.sectionTitle}>Feed Activity</h3>
              <StatCardGrid stats={[
                {
                  title: 'Total Posts',
                  value: formatNumber(feedActivity.data.totalPosts),
                  icon: HiOutlineChat
                },
                {
                  title: 'Posts with Engagement',
                  value: formatNumber(feedActivity.data.postsWithEngagement),
                  subtitle: `${feedActivity.data.engagementRate}% rate`
                },
                {
                  title: 'Avg Users per Post',
                  value: feedActivity.data.avgUniqueUsersAll
                },
                {
                  title: 'No Response',
                  value: formatNumber(feedActivity.data.postsNoEngagement)
                }
              ]} />
            </div>
          )}
        </>
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
        loading={exporting}
      />
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
  controls: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap'
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  feedSection: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '16px'
  }
}
