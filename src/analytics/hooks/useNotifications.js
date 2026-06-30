import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useNotifications() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get posts that triggered push notifications
      let postsQuery = supabase
        .from('posts')
        .select('id, content, notify_push, created_at')
        .eq('notify_push', true)

      if (dateRange.startDate) {
        postsQuery = postsQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        postsQuery = postsQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: pushPosts } = await postsQuery

      // Get updates/events from notifications table
      let notifQuery = supabase
        .from('notifications')
        .select('id, type, title, created_at')

      if (dateRange.startDate) {
        notifQuery = notifQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        notifQuery = notifQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: notifications } = await notifQuery

      // Get user_notifications for read stats
      let readsQuery = supabase
        .from('user_notifications')
        .select('notification_id, user_id, is_read, created_at')

      if (dateRange.startDate) {
        readsQuery = readsQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        readsQuery = readsQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: userNotifs } = await readsQuery

      // Get notification clicks (push taps)
      let clicksQuery = supabase
        .from('notification_clicks')
        .select('notification_type, user_id, created_at')

      if (orgUserIds) {
        clicksQuery = clicksQuery.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        clicksQuery = clicksQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        clicksQuery = clicksQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: clicks } = await clicksQuery

      // Calculate stats
      const postPushCount = (pushPosts || []).length
      const updateCount = (notifications || []).filter(n => n.type === 'update').length
      const eventCount = (notifications || []).filter(n => n.type === 'event').length
      const totalSent = postPushCount + (notifications || []).length

      const totalReads = (userNotifs || []).filter(n => n.is_read).length
      const uniqueReaders = new Set((userNotifs || []).filter(n => n.is_read).map(n => n.user_id)).size

      const totalClicks = (clicks || []).length
      const uniqueClickers = new Set((clicks || []).map(c => c.user_id)).size

      // Build breakdown
      const breakdown = []
      if (postPushCount > 0) breakdown.push({ type: 'Post Notifications', count: postPushCount })
      if (updateCount > 0) breakdown.push({ type: 'Updates', count: updateCount })
      if (eventCount > 0) breakdown.push({ type: 'Events', count: eventCount })

      // Recent items
      const recentItems = [
        ...(pushPosts || []).map(p => ({
          id: p.id,
          title: p.content?.substring(0, 50) || 'Post',
          type: 'Post',
          createdAt: p.created_at
        })),
        ...(notifications || []).map(n => ({
          id: n.id,
          title: n.title || 'Untitled',
          type: n.type === 'event' ? 'Event' : 'Update',
          createdAt: n.created_at
        }))
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)

      setData({
        totalSent,
        postPushCount,
        updateCount,
        eventCount,
        totalReads,
        uniqueReaders,
        totalClicks,
        uniqueClickers,
        breakdown,
        recentItems
      })
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
