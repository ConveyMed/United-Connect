import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useDirectoryUsage() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get profile views
      let viewsQuery = supabase
        .from('profile_views')
        .select('viewer_id, viewed_user_id, created_at')

      if (orgUserIds) {
        viewsQuery = viewsQuery.in('viewer_id', orgUserIds)
      }

      if (dateRange.startDate) {
        viewsQuery = viewsQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        viewsQuery = viewsQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: views, error: viewsError } = await viewsQuery

      if (viewsError) throw viewsError

      // Get directory searches
      let searchQuery = supabase
        .from('directory_searches')
        .select('user_id, search_query, created_at')

      if (orgUserIds) {
        searchQuery = searchQuery.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        searchQuery = searchQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        searchQuery = searchQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: searches, error: searchError } = await searchQuery

      if (searchError) throw searchError

      // Calculate profile view stats
      const profileViewCounts = {}
      ;(views || []).forEach(v => {
        if (!profileViewCounts[v.viewed_user_id]) {
          profileViewCounts[v.viewed_user_id] = 0
        }
        profileViewCounts[v.viewed_user_id]++
      })

      // Get most viewed profiles with names
      const topUserIds = Object.entries(profileViewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId)

      let mostViewedProfiles = []
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

        mostViewedProfiles = Object.entries(profileViewCounts)
          .map(([userId, count]) => ({
            userId,
            name: userMap[userId] || userId,
            views: count
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10)
      }

      // Users who searched
      const usersWhoSearched = new Set((searches || []).map(s => s.user_id)).size

      setData({
        totalProfileViews: (views || []).length,
        totalSearches: (searches || []).length,
        usersWhoSearched,
        mostViewedProfiles
      })
    } catch (err) {
      console.error('Error fetching directory usage:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
