import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useUnansweredQuestions() {
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
        .from('ai_queries')
        .select('id, user_id, query_text, product_name, created_at')
        .eq('confidence', 'none')
        .order('created_at', { ascending: false })
        .limit(500)

      if (orgUserIds) {
        query = query.in('user_id', orgUserIds)
      }
      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: rows, error: rowsError } = await query
      if (rowsError) throw rowsError

      const userIds = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))]

      let userMap = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
        ;(users || []).forEach(u => {
          userMap[u.id] = {
            name: u.first_name && u.last_name
              ? `${u.first_name} ${u.last_name}`
              : (u.email || u.id),
            email: u.email || ''
          }
        })
      }

      const enriched = (rows || []).map(r => ({
        id: r.id,
        question: r.query_text,
        product: r.product_name || '—',
        askedBy: userMap[r.user_id]?.name || r.user_id,
        email: userMap[r.user_id]?.email || '',
        askedAt: r.created_at,
      }))

      const productCounts = {}
      enriched.forEach(r => {
        productCounts[r.product] = (productCounts[r.product] || 0) + 1
      })
      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([product, count]) => ({ product, count }))

      setData({
        total: enriched.length,
        rows: enriched,
        topProducts,
      })
    } catch (err) {
      console.error('Error fetching unanswered questions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
