import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useTrainingAssets() {
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
        .from('asset_events')
        .select('asset_id, asset_name, user_id, event_type, created_at')
        .eq('category_type', 'training')

      if (orgUserIds) {
        query = query.in('user_id', orgUserIds)
      }

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: events, error: eventsError } = await query

      if (eventsError) throw eventsError

      // Aggregate by asset
      const assetStats = {}
      events.forEach(event => {
        const key = event.asset_id || event.asset_name
        if (!assetStats[key]) {
          assetStats[key] = {
            assetId: event.asset_id,
            assetName: event.asset_name || 'Unknown',
            interactions: 0,
            uniqueUsers: new Set()
          }
        }
        assetStats[key].interactions++
        assetStats[key].uniqueUsers.add(event.user_id)
      })

      // Convert to array
      const assetData = Object.values(assetStats)
        .map(a => ({
          assetId: a.assetId,
          assetName: a.assetName,
          interactions: a.interactions,
          uniqueUsers: a.uniqueUsers.size
        }))
        .sort((a, b) => b.interactions - a.interactions)

      // Check which assets still exist in content_items
      const assetIds = assetData.map(a => a.assetId).filter(Boolean)
      let existingIds = new Set()
      if (assetIds.length > 0) {
        const { data: existing } = await supabase
          .from('content_items')
          .select('id')
          .in('id', assetIds)
        existingIds = new Set((existing || []).map(e => e.id))
      }

      const assetDataWithStatus = assetData.map(a => ({
        ...a,
        inApp: a.assetId ? existingIds.has(a.assetId) : false
      }))

      const totalInteractions = events.length
      const totalUniqueUsers = new Set(events.map(e => e.user_id)).size

      setData({
        totalInteractions,
        totalUniqueUsers,
        assets: assetDataWithStatus,
        topAssets: assetDataWithStatus.slice(0, 10)
      })
    } catch (err) {
      console.error('Error fetching training assets:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
