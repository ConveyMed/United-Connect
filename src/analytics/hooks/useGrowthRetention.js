import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useGrowthRetention() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get all users with creation dates
      let usersQuery = supabase
        .from('users')
        .select('id, created_at')
        .order('created_at')

      if (orgUserIds) {
        usersQuery = usersQuery.in('id', orgUserIds)
      }

      const { data: users, error: usersError } = await usersQuery

      if (usersError) throw usersError

      // Get users with any activity in timeframe (sessions)
      let activityQuery = supabase
        .from('user_sessions')
        .select('user_id')

      if (orgUserIds) {
        activityQuery = activityQuery.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        activityQuery = activityQuery.gte('started_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        activityQuery = activityQuery.lte('started_at', dateRange.endDate.toISOString())
      }

      const { data: activeSessions, error: activityError } = await activityQuery

      if (activityError) throw activityError

      const activeUserIds = new Set(activeSessions?.map(s => s.user_id) || [])
      const totalUsers = users?.length || 0
      const activeUsers = activeUserIds.size
      const inactiveUsers = totalUsers - activeUsers

      // Filter new signups in timeframe
      let newSignups = users || []
      if (dateRange.startDate) {
        newSignups = newSignups.filter(u =>
          new Date(u.created_at) >= dateRange.startDate
        )
      }
      if (dateRange.endDate) {
        newSignups = newSignups.filter(u =>
          new Date(u.created_at) <= dateRange.endDate
        )
      }

      // Group signups by date for chart
      const signupsByDate = {}
      newSignups.forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString()
        signupsByDate[date] = (signupsByDate[date] || 0) + 1
      })

      // Create running total for growth chart
      const growthData = []
      let runningTotal = 0
      const sortedUsers = [...(users || [])].sort((a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
      )

      sortedUsers.forEach(u => {
        runningTotal++
        const date = new Date(u.created_at).toLocaleDateString()
        // Only keep the last entry for each date
        const existingIndex = growthData.findIndex(g => g.date === date)
        if (existingIndex >= 0) {
          growthData[existingIndex].total = runningTotal
        } else {
          growthData.push({ date, total: runningTotal })
        }
      })

      // Limit to last 30 data points for readability
      const recentGrowth = growthData.slice(-30)

      setData({
        totalUsers,
        activeUsers,
        inactiveUsers,
        newSignups: newSignups.length,
        signupsByDate: Object.entries(signupsByDate).map(([date, count]) => ({ date, count })),
        growthOverTime: recentGrowth
      })
    } catch (err) {
      console.error('Error fetching growth & retention:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
