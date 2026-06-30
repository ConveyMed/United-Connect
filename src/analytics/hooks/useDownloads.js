import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useDownloads() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get total users
      let totalUsersQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (orgUserIds) {
        totalUsersQuery = totalUsersQuery.in('id', orgUserIds)
      }

      const { count: totalUsers } = await totalUsersQuery

      // Get download events from asset_events where event_type = 'download'
      let query = supabase
        .from('asset_events')
        .select('user_id, asset_id, asset_name, created_at')
        .eq('event_type', 'download')

      if (orgUserIds) {
        query = query.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: downloads, error: downloadsError } = await query

      if (downloadsError) throw downloadsError

      // Calculate user download stats
      const userDownloads = {}
      const contentDownloads = {}

      ;(downloads || []).forEach(d => {
        if (!userDownloads[d.user_id]) {
          userDownloads[d.user_id] = 0
        }
        userDownloads[d.user_id]++

        const key = d.asset_id || d.asset_name
        if (!contentDownloads[key]) {
          contentDownloads[key] = {
            contentId: d.asset_id,
            contentName: d.asset_name || 'Unknown',
            downloads: 0
          }
        }
        contentDownloads[key].downloads++
      })

      const usersWhoDownloaded = Object.keys(userDownloads).length
      const usersNeverDownloaded = (totalUsers || 0) - usersWhoDownloaded
      const downloadRate = totalUsers > 0 ? ((usersWhoDownloaded / totalUsers) * 100).toFixed(1) : 0
      const avgDownloadsPerUser = usersWhoDownloaded > 0
        ? ((downloads || []).length / usersWhoDownloaded).toFixed(1)
        : 0

      // Get top downloaders with names
      const topUserIds = Object.entries(userDownloads)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId)

      let topDownloaders = []
      if (topUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', topUserIds)

        const userMap = {}
        ;(users || []).forEach(u => {
          userMap[u.id] = u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : u.email || u.id
        })

        topDownloaders = Object.entries(userDownloads)
          .map(([userId, count]) => ({
            userId,
            name: userMap[userId] || userId,
            downloads: count
          }))
          .sort((a, b) => b.downloads - a.downloads)
          .slice(0, 10)
      }

      // Most downloaded content
      const mostDownloadedRaw = Object.values(contentDownloads)
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 10)

      // Check which content items still exist
      const contentIds = mostDownloadedRaw.map(d => d.contentId).filter(Boolean)
      let existingContentIds = new Set()
      if (contentIds.length > 0) {
        const { data: existing } = await supabase
          .from('content_items')
          .select('id')
          .in('id', contentIds)
        existingContentIds = new Set((existing || []).map(e => e.id))
      }

      const mostDownloaded = mostDownloadedRaw.map(d => ({
        ...d,
        inApp: d.contentId ? existingContentIds.has(d.contentId) : false
      }))

      setData({
        totalUsers: totalUsers || 0,
        usersWhoDownloaded,
        usersNeverDownloaded,
        downloadRate,
        totalDownloads: (downloads || []).length,
        avgDownloadsPerUser,
        topDownloaders,
        mostDownloaded
      })
    } catch (err) {
      console.error('Error fetching downloads:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
