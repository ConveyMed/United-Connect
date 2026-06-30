import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useAIUsage() {
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

      // Get AI queries
      let query = supabase
        .from('ai_queries')
        .select('user_id, created_at')

      if (orgUserIds) {
        query = query.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: queries, error: queriesError } = await query

      if (queriesError) throw queriesError

      // Calculate stats
      const userQueries = {}
      ;(queries || []).forEach(q => {
        if (!userQueries[q.user_id]) {
          userQueries[q.user_id] = 0
        }
        userQueries[q.user_id]++
      })

      const usersWhoUsedAI = Object.keys(userQueries).length
      const usersNeverUsedAI = (totalUsers || 0) - usersWhoUsedAI
      const avgQueriesPerUser = usersWhoUsedAI > 0
        ? ((queries || []).length / usersWhoUsedAI).toFixed(1)
        : 0

      // Get top AI users with names
      const topUserIds = Object.entries(userQueries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId)

      let topAIUsers = []
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

        topAIUsers = Object.entries(userQueries)
          .map(([userId, count]) => ({
            userId,
            name: userMap[userId] || userId,
            queries: count
          }))
          .sort((a, b) => b.queries - a.queries)
          .slice(0, 10)
      }

      setData({
        totalQueries: (queries || []).length,
        usersWhoUsedAI,
        usersNeverUsedAI,
        avgQueriesPerUser,
        topAIUsers
      })
    } catch (err) {
      console.error('Error fetching AI usage:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
