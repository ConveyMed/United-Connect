import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { notifyNewPost, notifyPostLiked, notifyPostCommented } from '../services/notifications';

const PostsContext = createContext({});

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};

// Helper to format time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return past.toLocaleDateString();
};

export const PostsProvider = ({ children }) => {
  const { userProfile, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Track user's likes and bookmarks
  const [userLikes, setUserLikes] = useState(new Set());
  const [userBookmarks, setUserBookmarks] = useState(new Set());

  // Comments cache by post ID (for future use)
  // eslint-disable-next-line no-unused-vars
  const [commentsCache, setCommentsCache] = useState({});

  // Track user's per-post notification settings (muted/watching posts)
  const [userPostNotificationSettings, setUserPostNotificationSettings] = useState({});

  // Track user's global push_post_comments preference (for showing mute vs watch button)
  const [globalPushCommentsEnabled, setGlobalPushCommentsEnabled] = useState(true);

  // Load user's likes and bookmarks
  const loadUserInteractions = useCallback(async () => {
    if (!user?.id) {
      setUserLikes(new Set());
      setUserBookmarks(new Set());
      return;
    }

    try {
      // Load likes
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      setUserLikes(new Set((likesData || []).map(l => l.post_id)));

      // Load bookmarks
      const { data: bookmarksData } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      setUserBookmarks(new Set((bookmarksData || []).map(b => b.post_id)));
    } catch (err) {
      console.error('Error loading user interactions:', err);
    }
  }, [user?.id]);

  // Load user's per-post notification settings (muted/watching) and global preference
  const loadUserPostNotificationSettings = useCallback(async () => {
    if (!user?.id) {
      setUserPostNotificationSettings({});
      setGlobalPushCommentsEnabled(true);
      return;
    }

    try {
      // Load per-post settings and global preference in parallel
      const [postSettingsResult, globalPrefResult] = await Promise.all([
        supabase
          .from('post_notification_settings')
          .select('post_id, is_muted, is_watching')
          .eq('user_id', user.id),
        supabase
          .from('user_notification_preferences')
          .select('push_post_comments')
          .eq('user_id', user.id)
          .single()
      ]);

      // Handle per-post settings
      if (!postSettingsResult.error) {
        const settingsMap = (postSettingsResult.data || []).reduce((acc, s) => {
          acc[s.post_id] = { isMuted: s.is_muted, isWatching: s.is_watching };
          return acc;
        }, {});
        setUserPostNotificationSettings(settingsMap);
      }

      // Handle global preference (default true if no row or error)
      if (!globalPrefResult.error && globalPrefResult.data) {
        setGlobalPushCommentsEnabled(globalPrefResult.data.push_post_comments ?? true);
      } else {
        setGlobalPushCommentsEnabled(true);
      }
    } catch (err) {
      console.error('Error loading post notification settings:', err);
    }
  }, [user?.id]);

  // Toggle mute for a post
  const togglePostMute = async (postId) => {
    if (!user?.id) return;

    const currentSetting = userPostNotificationSettings[postId] || { isMuted: false, isWatching: false };
    const newMuted = !currentSetting.isMuted;

    // Optimistic update
    setUserPostNotificationSettings(prev => ({
      ...prev,
      [postId]: { ...currentSetting, isMuted: newMuted }
    }));

    try {
      const { error } = await supabase
        .from('post_notification_settings')
        .upsert({
          post_id: postId,
          user_id: user.id,
          is_muted: newMuted,
          is_watching: currentSetting.isWatching,
          updated_at: new Date().toISOString()
        }, { onConflict: 'post_id,user_id' });

      if (error) throw error;
    } catch (err) {
      // Revert on error
      setUserPostNotificationSettings(prev => ({
        ...prev,
        [postId]: currentSetting
      }));
      console.error('Error toggling post mute:', err);
    }
  };

  // Toggle watch for a post
  const togglePostWatch = async (postId) => {
    if (!user?.id) return;

    const currentSetting = userPostNotificationSettings[postId] || { isMuted: false, isWatching: false };
    const newWatching = !currentSetting.isWatching;

    // Optimistic update
    setUserPostNotificationSettings(prev => ({
      ...prev,
      [postId]: { ...currentSetting, isWatching: newWatching }
    }));

    try {
      const { error } = await supabase
        .from('post_notification_settings')
        .upsert({
          post_id: postId,
          user_id: user.id,
          is_muted: currentSetting.isMuted,
          is_watching: newWatching,
          updated_at: new Date().toISOString()
        }, { onConflict: 'post_id,user_id' });

      if (error) throw error;
    } catch (err) {
      // Revert on error
      setUserPostNotificationSettings(prev => ({
        ...prev,
        [postId]: currentSetting
      }));
      console.error('Error toggling post watch:', err);
    }
  };

  // Helper to check if post is muted/watching
  const isPostMuted = (postId) => userPostNotificationSettings[postId]?.isMuted || false;
  const isPostWatching = (postId) => userPostNotificationSettings[postId]?.isWatching || false;

  // Load user interactions when user changes (likes/bookmarks/post notification settings)
  useEffect(() => {
    if (user?.id) {
      loadUserInteractions();
      loadUserPostNotificationSettings();
    }
  }, [user?.id, loadUserInteractions, loadUserPostNotificationSettings]);

  // Initial load (only once)
  useEffect(() => {
    if (!initialLoaded) {
      loadPosts();
    }
  }, [initialLoaded]);

  // Real-time subscription for live post updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const post = payload.new;
          if (post.is_archived) return;
          if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) return;
          if (post.user_id === user.id) return;
          loadPosts(true);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        () => {
          loadPosts(true);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        () => {
          loadPosts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen for refresh requests from notification deep links
  useEffect(() => {
    const handleRefresh = () => loadPosts(true);
    window.addEventListener('refreshPosts', handleRefresh);
    return () => window.removeEventListener('refreshPosts', handleRefresh);
  }, []);

  // Computed loading - only true if actually loading AND no data yet
  const isLoading = loading && posts.length === 0;

  const loadPosts = async (forceRefresh = false) => {
    // Skip if already loaded (unless forcing refresh)
    if (initialLoaded && !forceRefresh) return;

    try {
      // Get posts (exclude archived, only show posts where scheduled_at <= now)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('is_archived', false)
        .lte('scheduled_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        return;
      }

      // Get unique user IDs and post IDs
      const userIds = [...new Set(postsData?.map(p => p.user_id).filter(Boolean))];
      const postIds = postsData?.map(p => p.id) || [];

      // Fetch users and comments in parallel
      const [usersResult, commentsResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from('users').select('id, first_name, last_name, title, profile_image_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] })
      ]);

      // Build users map
      const usersMap = (usersResult.data || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});

      // Process comments
      let commentsPreviewMap = {};
      const commentsData = commentsResult.data || [];

      if (commentsData.length > 0) {
        // Get unique commenter IDs (filter out ones we already have)
        const commenterIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id && !usersMap[id]))];

        // Fetch any missing commenter profiles
        if (commenterIds.length > 0) {
          const { data: commentersData } = await supabase
            .from('users')
            .select('id, first_name, last_name, profile_image_url')
            .in('id', commenterIds);

          (commentersData || []).forEach(u => {
            usersMap[u.id] = u;
          });
        }

        // Group by post_id - keep all comments
        commentsData.forEach(comment => {
          const commenter = usersMap[comment.user_id];
          const formatted = {
            id: comment.id,
            author: commenter ? `${commenter.first_name || ''} ${commenter.last_name || ''}`.trim() : 'Unknown',
            authorAvatar: commenter?.profile_image_url || null,
            text: comment.content,
            timeAgo: getTimeAgo(comment.created_at),
            userId: comment.user_id,
          };

          if (!commentsPreviewMap[comment.post_id]) {
            commentsPreviewMap[comment.post_id] = [];
          }
          commentsPreviewMap[comment.post_id].push(formatted);
        });
      }

      // Transform to match our post format
      const formattedPosts = (postsData || []).map(post => {
        const author = usersMap[post.user_id];
        const comments = commentsPreviewMap[post.id] || [];

        return {
          id: post.id,
          author: {
            name: author ? `${author.first_name || ''} ${author.last_name || ''}`.trim() : 'Unknown',
            title: author?.title || '',
            avatar: author?.profile_image_url || null,
          },
          content: post.content || '',
          images: post.images || [],
          videos: post.videos || [],
          links: post.links || [],
          image: post.images?.[0] || null,
          video: post.videos?.[0] || null,
          timeAgo: getTimeAgo(post.created_at),
          likes: post.likes_count || 0,
          commentsCount: post.comments_count || 0,
          comments: comments, // All comments loaded
          userId: post.user_id,
          isPinned: post.is_pinned || false,
          notifyPush: post.notify_push || false,
          scheduledAt: post.scheduled_at,
        };
      });

      setPosts(formattedPosts);
      setInitialLoaded(true);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load scheduled posts (future posts - only for admins/post authors)
  const loadScheduledPosts = async () => {
    if (!user?.id) return;

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('is_archived', false)
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (postsError) {
        console.error('Error loading scheduled posts:', postsError);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData?.map(p => p.user_id).filter(Boolean))];

      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, title, profile_image_url')
          .in('id', userIds);

        usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }

      const formattedPosts = (postsData || []).map(post => {
        const author = usersMap[post.user_id];
        return {
          id: post.id,
          author: {
            name: author ? `${author.first_name || ''} ${author.last_name || ''}`.trim() : 'Unknown',
            title: author?.title || '',
            avatar: author?.profile_image_url || null,
          },
          content: post.content || '',
          images: post.images || [],
          videos: post.videos || [],
          links: post.links || [],
          image: post.images?.[0] || null,
          video: post.videos?.[0] || null,
          scheduledAt: post.scheduled_at,
          scheduledTime: new Date(post.scheduled_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          userId: post.user_id,
          notifyPush: post.notify_push || false,
        };
      });

      setScheduledPosts(formattedPosts);
    } catch (err) {
      console.error('Error loading scheduled posts:', err);
    }
  };

  // Like a post
  const likePost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserLikes(prev => new Set([...prev, postId]));
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    ));

    try {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (error) {
        // Revert on error
        setUserLikes(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes: p.likes - 1 } : p
        ));
        console.error('Error liking post:', error);
      } else {
        // Send notification to post author
        const post = posts.find(p => p.id === postId);
        if (post && post.userId && post.userId !== user.id) {
          notifyPostLiked({
            senderId: user.id,
            senderName: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
            postId,
            postAuthorId: post.userId,
          }).catch(err => console.error('Notification error:', err));
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  // Unlike a post
  const unlikePost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserLikes(prev => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p
    ));

    try {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert on error
        setUserLikes(prev => new Set([...prev, postId]));
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes: p.likes + 1 } : p
        ));
        console.error('Error unliking post:', error);
      }
    } catch (err) {
      console.error('Error unliking post:', err);
    }
  };

  // Toggle like
  const toggleLike = async (postId) => {
    if (userLikes.has(postId)) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  };

  // Bookmark a post
  const bookmarkPost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserBookmarks(prev => new Set([...prev, postId]));

    try {
      const { error } = await supabase
        .from('post_bookmarks')
        .insert({ post_id: postId, user_id: user.id });

      if (error) {
        // Revert on error
        setUserBookmarks(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        console.error('Error bookmarking post:', error);
      }
    } catch (err) {
      console.error('Error bookmarking post:', err);
    }
  };

  // Unbookmark a post
  const unbookmarkPost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserBookmarks(prev => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });

    try {
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert on error
        setUserBookmarks(prev => new Set([...prev, postId]));
        console.error('Error unbookmarking post:', error);
      }
    } catch (err) {
      console.error('Error unbookmarking post:', err);
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (postId) => {
    if (userBookmarks.has(postId)) {
      await unbookmarkPost(postId);
    } else {
      await bookmarkPost(postId);
    }
  };

  // Add a comment
  const addComment = async (postId, content) => {
    if (!user?.id || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newComment = {
      id: tempId,
      author: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
      authorAvatar: userProfile?.profile_image_url || null,
      text: content,
      timeAgo: 'Just now',
      userId: user.id,
    };

    // Optimistic update - add to end (oldest first, newest at bottom)
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newComment],
          commentsCount: p.commentsCount + 1,
        };
      }
      return p;
    }));

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        // Revert on error
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.filter(c => c.id !== tempId),
              commentsCount: Math.max(0, p.commentsCount - 1),
            };
          }
          return p;
        }));
        console.error('Error adding comment:', error);
        throw error;
      }

      // Update with real ID
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments.map(c =>
              c.id === tempId ? { ...c, id: data.id } : c
            ),
          };
        }
        return p;
      }));

      // Send notification to ALL users (except commenter) - new enhanced version
      const post = posts.find(p => p.id === postId);
      if (post) {
        notifyPostCommented({
          senderId: user.id,
          senderName: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          postId,
          postAuthorId: post.userId,
          commentText: content.trim().substring(0, 100),
        }).catch(err => console.error('Notification error:', err));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  // Delete a comment
  const deleteComment = async (postId, commentId) => {
    if (!user?.id) return;

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.filter(c => c.id !== commentId),
          commentsCount: Math.max(0, p.commentsCount - 1),
        };
      }
      return p;
    }));

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting comment:', error);
        // Could revert here but would need to cache the comment
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const addPost = async (content, media = [], links = [], options = {}) => {
    if (!user?.id) return;

    const images = media.filter(m => m.type === 'image').map(m => m.url);
    const videos = media.filter(m => m.type === 'video').map(m => m.url);
    const { notifyPush = false, scheduledAt = null } = options;

    // If scheduledAt is provided and in the future, it's a scheduled post
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          images,
          videos,
          links,
          notify_push: notifyPush,
          scheduled_at: scheduledAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error.message || error);
        throw new Error(error.message || 'Failed to create post');
      }

      // Add to local state
      const newPost = {
        id: data.id,
        author: {
          name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          title: userProfile?.title || '',
          avatar: userProfile?.profile_image_url || null,
        },
        content,
        images,
        videos,
        links,
        image: images[0] || null,
        video: videos[0] || null,
        timeAgo: 'Just now',
        likes: 0,
        commentsCount: 0,
        comments: [],
        userId: user.id,
        scheduledAt: data.scheduled_at,
      };

      if (isScheduled) {
        // Add to scheduled posts
        const scheduledPost = {
          ...newPost,
          scheduledTime: new Date(data.scheduled_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        };
        setScheduledPosts(prev => [scheduledPost, ...prev]);
      } else {
        // Add to regular posts
        setPosts(prev => [newPost, ...prev]);

        // Send notifications if enabled (only for immediate posts)
        if (notifyPush) {
          notifyNewPost({
            senderId: user.id,
            senderName: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
            postId: data.id,
            postPreview: content.substring(0, 100),
            notifyPush,
          }).catch(err => console.error('Notification error:', err));
        }
      }
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const deletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Pin a post (admin function)
  const pinPost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isPinned: true } : p
    ));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: true })
        .eq('id', postId);

      if (error) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, isPinned: false } : p
        ));
        console.error('Error pinning post:', error);
      }
    } catch (err) {
      console.error('Error pinning post:', err);
    }
  };

  // Unpin a post (admin function)
  const unpinPost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isPinned: false } : p
    ));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: false })
        .eq('id', postId);

      if (error) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, isPinned: true } : p
        ));
        console.error('Error unpinning post:', error);
      }
    } catch (err) {
      console.error('Error unpinning post:', err);
    }
  };

  // Archive a post (soft delete)
  const archivePost = async (postId) => {
    if (!user?.id) return;

    // Optimistic update - remove from UI
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_archived: true })
        .eq('id', postId);

      if (error) {
        // Reload posts on error
        loadPosts();
        console.error('Error archiving post:', error);
      }
    } catch (err) {
      console.error('Error archiving post:', err);
    }
  };

  // Update a post (for admins)
  const updatePost = async (postId, updates) => {
    if (!user?.id) return;

    // Prepare DB update
    const dbUpdates = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.videos !== undefined) dbUpdates.videos = updates.videos;
    if (updates.links !== undefined) dbUpdates.links = updates.links;

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          content: updates.content !== undefined ? updates.content : p.content,
          images: updates.images !== undefined ? updates.images : p.images,
          videos: updates.videos !== undefined ? updates.videos : p.videos,
          links: updates.links !== undefined ? updates.links : p.links,
          image: updates.images?.[0] || p.image,
          video: updates.videos?.[0] || p.video,
        };
      }
      return p;
    }));

    try {
      const { error } = await supabase
        .from('posts')
        .update(dbUpdates)
        .eq('id', postId);

      if (error) {
        // Reload posts on error
        loadPosts();
        console.error('Error updating post:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error updating post:', err);
      throw err;
    }
  };

  // Update a scheduled post (includes schedule time and notify options)
  const updateScheduledPost = async (postId, updates) => {
    if (!user?.id) return;

    // Prepare DB update
    const dbUpdates = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.videos !== undefined) dbUpdates.videos = updates.videos;
    if (updates.links !== undefined) dbUpdates.links = updates.links;
    if (updates.scheduledAt !== undefined) dbUpdates.scheduled_at = updates.scheduledAt;
    if (updates.notifyPush !== undefined) dbUpdates.notify_push = updates.notifyPush;

    try {
      const { error } = await supabase
        .from('posts')
        .update(dbUpdates)
        .eq('id', postId);

      if (error) {
        console.error('Error updating scheduled post:', error);
        throw error;
      }

      // Reload scheduled posts to reflect changes
      await loadScheduledPosts();
    } catch (err) {
      console.error('Error updating scheduled post:', err);
      throw err;
    }
  };

  // Delete a scheduled post
  const deleteScheduledPost = async (postId) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove from local state
      setScheduledPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting scheduled post:', err);
      throw err;
    }
  };

  // Get bookmarked posts
  const getBookmarkedPosts = () => {
    return posts.filter(p => userBookmarks.has(p.id));
  };

  // Check if post is liked/bookmarked
  const isPostLiked = (postId) => userLikes.has(postId);
  const isPostBookmarked = (postId) => userBookmarks.has(postId);

  const openCreateModal = () => setCreateModalOpen(true);
  const closeCreateModal = () => setCreateModalOpen(false);

  // Force refresh posts (for pull-to-refresh, etc.)
  const refreshPosts = () => loadPosts(true);

  const value = {
    posts,
    scheduledPosts,
    loading: isLoading, // Only true when actually loading with no data
    addPost,
    deletePost,
    loadPosts,
    refreshPosts,
    loadScheduledPosts,
    createModalOpen,
    openCreateModal,
    closeCreateModal,
    // Likes
    toggleLike,
    isPostLiked,
    userLikes,
    // Bookmarks
    toggleBookmark,
    isPostBookmarked,
    userBookmarks,
    getBookmarkedPosts,
    // Comments
    addComment,
    deleteComment,
    // Pin/Archive/Update
    pinPost,
    unpinPost,
    archivePost,
    updatePost,
    // Scheduled posts
    updateScheduledPost,
    deleteScheduledPost,
    // Post notification settings (mute/watch)
    togglePostMute,
    togglePostWatch,
    isPostMuted,
    isPostWatching,
    globalPushCommentsEnabled,
  };

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};
