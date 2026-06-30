import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useChatActivity() {
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

      // Get chats started in timeframe
      let convoQuery = supabase
        .from('chats')
        .select('id, created_at', { count: 'exact' })

      if (dateRange.startDate) {
        convoQuery = convoQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        convoQuery = convoQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { count: conversationsStarted } = await convoQuery

      // Get messages
      let msgQuery = supabase
        .from('messages')
        .select('sender_id, created_at')

      if (orgUserIds) {
        msgQuery = msgQuery.in('sender_id', orgUserIds)
      }

      if (dateRange.startDate) {
        msgQuery = msgQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        msgQuery = msgQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: messages, error: msgError } = await msgQuery

      if (msgError) throw msgError

      // Calculate stats
      const userMessages = {}
      ;(messages || []).forEach(m => {
        if (!userMessages[m.sender_id]) {
          userMessages[m.sender_id] = 0
        }
        userMessages[m.sender_id]++
      })

      const activeChatters = Object.keys(userMessages).length
      const silentUsers = (totalUsers || 0) - activeChatters
      const avgMessagesPerChatter = activeChatters > 0
        ? ((messages || []).length / activeChatters).toFixed(1)
        : 0

      // Get top chatters with names
      const topUserIds = Object.entries(userMessages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId)

      let topChatters = []
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

        topChatters = Object.entries(userMessages)
          .map(([userId, count]) => ({
            userId,
            name: userMap[userId] || userId,
            messages: count
          }))
          .sort((a, b) => b.messages - a.messages)
          .slice(0, 10)
      }

      setData({
        conversationsStarted: conversationsStarted || 0,
        totalMessages: (messages || []).length,
        activeChatters,
        silentUsers,
        avgMessagesPerChatter,
        topChatters
      })
    } catch (err) {
      console.error('Error fetching chat activity:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
