import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useUserActivity() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get total users count
      let usersQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (orgUserIds) {
        usersQuery = usersQuery.in('id', orgUserIds)
      }

      const { count: totalUsers, error: usersError } = await usersQuery

      if (usersError) throw usersError

      // Build session query with date filter
      let sessionQuery = supabase
        .from('user_sessions')
        .select('user_id, started_at, ended_at, duration_seconds')

      if (orgUserIds) {
        sessionQuery = sessionQuery.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        sessionQuery = sessionQuery.gte('started_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        sessionQuery = sessionQuery.lte('started_at', dateRange.endDate.toISOString())
      }

      const { data: sessions, error: sessionsError } = await sessionQuery

      if (sessionsError) throw sessionsError

      // Calculate metrics
      const activeUserIds = new Set(sessions.map(s => s.user_id))
      const activeUsers = activeUserIds.size
      const inactiveUsers = (totalUsers || 0) - activeUsers
      const totalSessions = sessions.length
      const sessionsPerUser = activeUsers > 0 ? (totalSessions / activeUsers).toFixed(1) : 0

      // Calculate average session duration
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
      const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0

      // Engagement ratio
      const engagementRatio = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0

      setData({
        totalUsers: totalUsers || 0,
        activeUsers,
        inactiveUsers,
        engagementRatio,
        totalSessions,
        sessionsPerUser,
        avgDuration
      })
    } catch (err) {
      console.error('Error fetching user activity:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
