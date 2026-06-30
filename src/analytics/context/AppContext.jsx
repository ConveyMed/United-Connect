import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '../config/supabase'
import { APPS, DEFAULT_APP } from '../config/apps'

const AppContext = createContext(null)

export const TIMEFRAMES = {
  '30': { label: '30 Days', days: 30 },
  '60': { label: '60 Days', days: 60 },
  '90': { label: '90 Days', days: 90 },
  'all': { label: 'All Time', days: null },
  'custom': { label: 'Custom', days: null }
}

export function AppProvider({ children }) {
  const [selectedAppId, setSelectedAppId] = useState(() => {
    const saved = localStorage.getItem('analytics_selected_app')
    return saved && APPS[saved] ? saved : DEFAULT_APP
  })
  const [timeframe, setTimeframe] = useState('30')
  const [customStartDate, setCustomStartDate] = useState(null)
  const [customEndDate, setCustomEndDate] = useState(null)

  // Org filter state
  const [availableOrgs, setAvailableOrgs] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(null) // null = All
  const [orgUserIds, setOrgUserIds] = useState(null) // null = no filter, array = filter to these IDs

  const currentApp = APPS[selectedAppId]

  // Persist selected app to localStorage
  useEffect(() => {
    localStorage.setItem('analytics_selected_app', selectedAppId)
  }, [selectedAppId])

  const supabase = useMemo(() => {
    if (!currentApp?.supabaseUrl || !currentApp?.supabaseKey) return null
    return getSupabaseClient(currentApp.supabaseUrl, currentApp.supabaseKey)
  }, [currentApp])

  // Fetch organizations when app changes (only for apps with orgs)
  useEffect(() => {
    // Reset org filter when switching apps
    setSelectedOrgId(null)
    setOrgUserIds(null)

    if (!supabase || !currentApp?.hasOrgs) {
      setAvailableOrgs([])
      return
    }

    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, code')
        .eq('is_active', true)
        .order('code')

      if (!error && data && data.length > 0) {
        setAvailableOrgs(data)
      } else {
        setAvailableOrgs([])
      }
    }

    fetchOrgs()
  }, [supabase, currentApp])

  // Fetch user IDs for selected org
  const fetchOrgUserIds = useCallback(async () => {
    if (!supabase || !selectedOrgId) {
      setOrgUserIds(null)
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', selectedOrgId)

    if (!error && data) {
      setOrgUserIds(data.map(u => u.id))
    } else {
      setOrgUserIds([])
    }
  }, [supabase, selectedOrgId])

  useEffect(() => {
    fetchOrgUserIds()
  }, [fetchOrgUserIds])

  const dateRange = useMemo(() => {
    const endDate = new Date()

    if (timeframe === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate || new Date() }
    }

    if (timeframe === 'all') {
      return { startDate: null, endDate: null }
    }

    const days = TIMEFRAMES[timeframe]?.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return { startDate, endDate }
  }, [timeframe, customStartDate, customEndDate])

  const availableApps = Object.values(APPS).filter(
    app => app.supabaseUrl && app.supabaseKey
  )

  return (
    <AppContext.Provider value={{
      selectedAppId,
      setSelectedAppId,
      currentApp,
      availableApps,
      supabase,
      timeframe,
      setTimeframe,
      customStartDate,
      setCustomStartDate,
      customEndDate,
      setCustomEndDate,
      dateRange,
      availableOrgs,
      selectedOrgId,
      setSelectedOrgId,
      orgUserIds
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
