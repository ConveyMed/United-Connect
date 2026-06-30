import { useState, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

export default function useFeedActivity() {
  const { supabase, dateRange, orgUserIds } = useAppContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      // Get posts in timeframe
      let postsQuery = supabase
        .from('posts')
        .select('id, content, created_at')

      if (dateRange.startDate) {
        postsQuery = postsQuery.gte('created_at', dateRange.startDate.toISOString())
      }
      if (dateRange.endDate) {
        postsQuery = postsQuery.lte('created_at', dateRange.endDate.toISOString())
      }

      const { data: posts, error: postsError } = await postsQuery

      if (postsError) throw postsError

      if (!posts || posts.length === 0) {
        setData({
          totalPosts: 0,
          postsWithEngagement: 0,
          postsNoEngagement: 0,
          engagementRate: 0,
          avgUniqueUsersAll: 0,
          avgUniqueUsersEngaged: 0,
          topPosts: []
        })
        return
      }

      // Get likes and comments for these posts
      const postIds = posts.map(p => p.id)

      let likesQuery = supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds)

      if (orgUserIds) {
        likesQuery = likesQuery.in('user_id', orgUserIds)
      }

      const { data: likes, error: likesError } = await likesQuery

      if (likesError) throw likesError

      let commentsQuery = supabase
        .from('post_comments')
        .select('post_id, user_id')
        .in('post_id', postIds)

      if (orgUserIds) {
        commentsQuery = commentsQuery.in('user_id', orgUserIds)
      }

      const { data: comments, error: commentsError } = await commentsQuery

      if (commentsError) throw commentsError

      // Calculate engagement per post
      const postEngagement = posts.map(post => {
        const postLikes = (likes || []).filter(l => l.post_id === post.id)
        const postComments = (comments || []).filter(c => c.post_id === post.id)

        const uniqueEngagers = new Set([
          ...postLikes.map(l => l.user_id),
          ...postComments.map(c => c.user_id)
        ])

        const points = postLikes.length + postComments.length

        return {
          id: post.id,
          title: post.content?.substring(0, 50) || 'Untitled',
          likes: postLikes.length,
          comments: postComments.length,
          points,
          uniqueEngagers: uniqueEngagers.size,
          hasEngagement: uniqueEngagers.size > 0
        }
      })

      const totalPosts = posts.length
      const postsWithEngagement = postEngagement.filter(p => p.hasEngagement).length
      const postsNoEngagement = totalPosts - postsWithEngagement
      const engagementRate = totalPosts > 0 ? ((postsWithEngagement / totalPosts) * 100).toFixed(1) : 0

      const totalUniqueEngagers = postEngagement.reduce((sum, p) => sum + p.uniqueEngagers, 0)
      const avgUniqueUsersAll = totalPosts > 0 ? (totalUniqueEngagers / totalPosts).toFixed(1) : 0

      const engagedPosts = postEngagement.filter(p => p.hasEngagement)
      const avgUniqueUsersEngaged = engagedPosts.length > 0
        ? (engagedPosts.reduce((sum, p) => sum + p.uniqueEngagers, 0) / engagedPosts.length).toFixed(1)
        : 0

      const topPosts = [...postEngagement]
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)

      setData({
        totalPosts,
        postsWithEngagement,
        postsNoEngagement,
        engagementRate,
        avgUniqueUsersAll,
        avgUniqueUsersEngaged,
        topPosts
      })
    } catch (err) {
      console.error('Error fetching feed activity:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, orgUserIds])

  return { data, loading, error, fetchData }
}
