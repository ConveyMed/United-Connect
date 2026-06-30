import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

// Process raw data into a flat user row
function buildUserRow(profile, sessions, screenViews, assetEvents, categories, screenNames) {
  const name = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.email || 'Unknown'

  const totalSessions = sessions?.length || 0
  const totalDuration = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0
  const totalDurationMin = Math.round(totalDuration / 60)
  const avgSessionMin = totalSessions > 0 ? Math.round(totalDurationMin / totalSessions) : 0

  // Aggregate screen views
  const screenCounts = {}
  screenViews?.forEach(sv => {
    screenCounts[sv.screen_name] = (screenCounts[sv.screen_name] || 0) + 1
  })
  const totalScreenViews = screenViews?.length || 0

  // Aggregate asset events by category
  const categoryCounts = {}
  assetEvents?.forEach(ae => {
    const cat = ae.category || 'Uncategorized'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })
  const totalAssetClicks = assetEvents?.length || 0

  // Aggregate asset events by individual asset name
  const assetNameCounts = {}
  assetEvents?.forEach(ae => {
    const name = ae.asset_name || 'Unknown'
    assetNameCounts[name] = (assetNameCounts[name] || 0) + 1
  })
  // Alphabetized asset name rows
  const assetNameRows = Object.entries(assetNameCounts)
    .map(([name, count]) => ({ asset: name, count }))
    .sort((a, b) => a.asset.localeCompare(b.asset))

  // Build flat row
  const row = {
    name,
    totalSessions,
    totalDurationMin,
    avgSessionMin,
  }

  // Screen columns - dynamic
  screenNames.forEach(s => {
    row[`screen_${s}`] = screenCounts[s] || 0
  })
  row.screenViewsTotal = totalScreenViews

  // Asset columns - dynamic by category
  row.totalAssets = totalAssetClicks
  categories.forEach(cat => {
    row[`asset_${cat}`] = categoryCounts[cat] || 0
  })

  // Asset name columns - dynamic by individual asset name
  assetNameRows.forEach(({ asset }) => {
    row[`assetname_${asset}`] = assetNameCounts[asset] || 0
  })

  return { row, assetNameRows }
}

export default function useUserReport() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])

  const dateFilter = useCallback((query) => {
    if (dateRange.startDate) {
      query = query.gte('created_at', dateRange.startDate.toISOString())
    }
    if (dateRange.endDate) {
      query = query.lte('created_at', dateRange.endDate.toISOString())
    }
    return query
  }, [dateRange])

  // Fetch all users for dropdown
  const fetchUsers = useCallback(async () => {
    if (!supabase) return

    try {
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .order('first_name')

      if (orgUserIds) {
        query = query.in('id', orgUserIds)
      }

      const { data: profiles, error: profilesError } = await query

      if (profilesError) throw profilesError

      setUsers(profiles || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }, [supabase, orgUserIds])

  // Fetch specific user's data
  const fetchUserData = useCallback(async (userId) => {
    if (!supabase || !userId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch content categories for dynamic asset grouping
      const { data: cats } = await supabase
        .from('content_categories')
        .select('title')
        .eq('is_active', true)
        .order('sort_order')
      const categoryNames = (cats || []).map(c => c.title)

      // Fetch all distinct screen names for dynamic screen columns
      const { data: allScreenNames } = await supabase
        .from('screen_views')
        .select('screen_name')
      const screenNames = [...new Set((allScreenNames || []).map(s => s.screen_name))].sort()

      const { data: profile } = await supabase
        .from('users').select('*').eq('id', userId).single()

      let sessionsQ = supabase.from('user_sessions').select('*').eq('user_id', userId)
      sessionsQ = dateFilter(sessionsQ)
      const { data: sessions } = await sessionsQ

      let screensQ = supabase.from('screen_views').select('screen_name').eq('user_id', userId)
      screensQ = dateFilter(screensQ)
      const { data: screenViews } = await screensQ

      let assetsQ = supabase.from('asset_events').select('asset_name, event_type, category').eq('user_id', userId)
      assetsQ = dateFilter(assetsQ)
      const { data: assetEvents } = await assetsQ

      const { row, assetNameRows } = buildUserRow(profile, sessions, screenViews, assetEvents, categoryNames, screenNames)

      // Also keep structured data for the UI display
      setData({
        profile,
        categories: categoryNames,
        screenNames,
        totalSessions: row.totalSessions,
        totalDurationMin: row.totalDurationMin,
        avgSessionMin: row.avgSessionMin,
        screenRows: screenNames.map(name => ({ screen: name, count: row[`screen_${name}`] })),
        totalScreenViews: row.screenViewsTotal,
        categoryRows: categoryNames.map(name => ({ asset: name, count: row[`asset_${name}`] })),
        assetNameRows,
        totalAssetClicks: row.totalAssets,
        flatRow: row,
        allAssetNames: assetNameRows.map(r => r.asset),
      })
    } catch (err) {
      console.error('Error fetching user report:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateFilter])

  // Fetch ALL users' data for bulk export
  const fetchAllUsersData = useCallback(async () => {
    if (!supabase) return { rows: [], categories: [], screenNames: [] }

    try {
      // Fetch content categories for dynamic asset grouping
      const { data: cats } = await supabase
        .from('content_categories')
        .select('title')
        .eq('is_active', true)
        .order('sort_order')
      const categoryNames = (cats || []).map(c => c.title)

      let profilesQuery = supabase
        .from('users').select('*').order('first_name')

      if (orgUserIds) {
        profilesQuery = profilesQuery.in('id', orgUserIds)
      }

      const { data: profiles } = await profilesQuery

      if (!profiles || profiles.length === 0) return { rows: [], categories: categoryNames, screenNames: [] }

      // Fetch all sessions, screen views, asset events in bulk
      let sessionsQ = supabase.from('user_sessions').select('*')
      if (orgUserIds) {
        sessionsQ = sessionsQ.in('user_id', orgUserIds)
      }
      sessionsQ = dateFilter(sessionsQ)
      const { data: allSessions } = await sessionsQ

      let screensQ = supabase.from('screen_views').select('user_id, screen_name')
      if (orgUserIds) {
        screensQ = screensQ.in('user_id', orgUserIds)
      }
      screensQ = dateFilter(screensQ)
      const { data: allScreenViews } = await screensQ

      // Derive unique screen names from the data
      const screenNames = [...new Set((allScreenViews || []).map(s => s.screen_name))].sort()

      let assetsQ = supabase.from('asset_events').select('user_id, asset_name, event_type, category')
      if (orgUserIds) {
        assetsQ = assetsQ.in('user_id', orgUserIds)
      }
      assetsQ = dateFilter(assetsQ)
      const { data: allAssetEvents } = await assetsQ

      // Group by user_id
      const sessionsByUser = {}
      ;(allSessions || []).forEach(s => {
        if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = []
        sessionsByUser[s.user_id].push(s)
      })

      const screensByUser = {}
      ;(allScreenViews || []).forEach(sv => {
        if (!screensByUser[sv.user_id]) screensByUser[sv.user_id] = []
        screensByUser[sv.user_id].push(sv)
      })

      const assetsByUser = {}
      ;(allAssetEvents || []).forEach(ae => {
        if (!assetsByUser[ae.user_id]) assetsByUser[ae.user_id] = []
        assetsByUser[ae.user_id].push(ae)
      })

      // Build a flat row for each user
      const allAssetNames = new Set()
      const rows = profiles.map(profile => {
        const { row, assetNameRows } = buildUserRow(
          profile,
          sessionsByUser[profile.id] || [],
          screensByUser[profile.id] || [],
          assetsByUser[profile.id] || [],
          categoryNames,
          screenNames
        )
        assetNameRows.forEach(r => allAssetNames.add(r.asset))
        return row
      })
      const assetNames = [...allAssetNames].sort()
      return { rows, categories: categoryNames, screenNames, assetNames }
    } catch (err) {
      console.error('Error fetching all users data:', err)
      return { rows: [], categories: [], screenNames: [] }
    }
  }, [supabase, dateFilter, orgUserIds])

  return { data, loading, error, users, fetchUsers, fetchUserData, fetchAllUsersData }
}
