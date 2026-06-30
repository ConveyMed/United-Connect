import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useScreenEngagement() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('screen_views')
        .select('screen_name, user_id, created_at')

      if (orgUserIds) {
        query = query.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: views, error: viewsError } = await query

      if (viewsError) throw viewsError

      // Aggregate by screen name
      const screenStats = {}
      views.forEach(view => {
        if (!screenStats[view.screen_name]) {
          screenStats[view.screen_name] = {
            screenName: view.screen_name,
            views: 0,
            uniqueUsers: new Set()
          }
        }
        screenStats[view.screen_name].views++
        screenStats[view.screen_name].uniqueUsers.add(view.user_id)
      })

      // Convert to array and sort by views
      const screenData = Object.values(screenStats)
        .map(s => ({
          screenName: s.screenName,
          views: s.views,
          uniqueUsers: s.uniqueUsers.size
        }))
        .sort((a, b) => b.views - a.views)

      const totalViews = views.length

      setData({
        totalViews,
        screens: screenData,
        topScreens: screenData.slice(0, 10)
      })
    } catch (err) {
      console.error('Error fetching screen engagement:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
