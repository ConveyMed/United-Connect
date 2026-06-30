import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';

const ActivityNotificationsContext = createContext({});

export const useActivityNotifications = () => {
  const context = useContext(ActivityNotificationsContext);
  if (!context) {
    throw new Error('useActivityNotifications must be used within an ActivityNotificationsProvider');
  }
  return context;
};

export const ActivityNotificationsProvider = ({ children }) => {
  const { user, userProfile } = useAuth();

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [userState, setUserState] = useState(null); // last_checked_at, last_banner_shown_at
  const [notificationReads, setNotificationReads] = useState(new Set()); // Set of read notification IDs
  const [postReads, setPostReads] = useState({}); // { post_id: { last_seen_comment_count, last_read_at } }
  const [loading, setLoading] = useState(true);

  // Banner state
  const [showBanner, setShowBanner] = useState(false);
  const [bannerAnimatingOut, setBannerAnimatingOut] = useState(false);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);

  // Scroll target (when user taps a notification)
  const [scrollTarget, setScrollTarget] = useState(null); // { postId, commentIndex }

  // Track if initial load done
  const initialLoadDone = useRef(false);

  // Load data when user changes
  useEffect(() => {
    if (user?.id) {
      loadActivityData();
    } else {
      setNotifications([]);
      setUserState(null);
      setNotificationReads(new Set());
      setPostReads({});
      setLoading(false);
    }
  }, [user?.id]);

  // Load all activity data.
  // `silent` skips the loading flag for background re-pulls (focus / realtime),
  // so the bell + panel update in place with no spinner (stale-while-revalidate).
  const loadActivityData = async ({ silent = false } = {}) => {
    if (!user?.id) return;

    try {
      if (!silent) setLoading(true);

      // Load in parallel
      const [notificationsResult, stateResult, postReadsResult, notifReadsResult] = await Promise.all([
        supabase
          .from('activity_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_notification_state')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_post_reads')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user.id)
      ]);

      // Process notifications
      if (!notificationsResult.error && notificationsResult.data?.length > 0) {

        // Get unique actor and post IDs
        const actorIds = [...new Set(notificationsResult.data.map(n => n.actor_id).filter(Boolean))];
        const postIds = [...new Set(notificationsResult.data.map(n => n.post_id).filter(Boolean))];

        // Fetch actors and posts in parallel
        const [actorsResult, postsResult] = await Promise.all([
          actorIds.length > 0
            ? supabase.from('users').select('id, first_name, last_name, profile_image_url').in('id', actorIds)
            : Promise.resolve({ data: [] }),
          postIds.length > 0
            ? supabase.from('posts').select('id, content').in('id', postIds)
            : Promise.resolve({ data: [] })
        ]);

        // Build lookup maps
        const actorsMap = (actorsResult.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
        const postsMap = (postsResult.data || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

        // Enrich notifications with actor and post data
        const enrichedNotifications = notificationsResult.data.map(n => ({
          ...n,
          actor: actorsMap[n.actor_id] || null,
          post: postsMap[n.post_id] || null,
        }));

        setNotifications(enrichedNotifications);
      } else if (!notificationsResult.error) {
        // Only clear on a confirmed-empty result. On a transient fetch error we
        // keep the existing list so a background refresh never blanks the bell.
        setNotifications([]);
      }

      // Process user state (create if doesn't exist)
      if (stateResult.error?.code === 'PGRST116') {
        // No row found, create one with last_checked_at = user's creation date
        const userCreatedAt = userProfile?.created_at || user?.created_at || new Date().toISOString();
        const { data: newState } = await supabase
          .from('user_notification_state')
          .insert({
            user_id: user.id,
            last_checked_at: userCreatedAt
          })
          .select()
          .single();
        setUserState(newState);
      } else if (!stateResult.error) {
        setUserState(stateResult.data);
      }

      // Process post reads
      if (!postReadsResult.error) {
        const readsMap = {};
        (postReadsResult.data || []).forEach(r => {
          readsMap[r.post_id] = r;
        });
        setPostReads(readsMap);
      }

      // Process notification reads
      if (!notifReadsResult.error) {
        const readIds = new Set((notifReadsResult.data || []).map(r => r.notification_id));
        setNotificationReads(readIds);
      }

      initialLoadDone.current = true;
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Keep the bell live without a re-login. loadActivityData only runs on user.id
  // change, so on its own the bell goes stale the moment a teammate posts. These
  // two layers fix that:
  //
  //   1. Focus/foreground/reconnect re-pull (the reliable layer). Fires when the
  //      app returns to the foreground (iOS resume), the network reconnects, or
  //      this provider mounts. This is what makes a new post show up after the
  //      user backgrounds + reopens the app, which native sockets miss.
  //   2. Realtime INSERT subscription (the live layer). Updates the bell while
  //      the app is open and foregrounded, without waiting for a focus event.
  //
  // useRefreshOnFocus keeps the latest loadActivityData in a ref, so the empty
  // dep array below is correct and never re-subscribes.
  useRefreshOnFocus(() => { loadActivityData({ silent: true }); });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('activity_notifications_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_notifications' },
        () => { loadActivityData({ silent: true }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Get "NEW" notifications (created after last_checked_at) - controls bell badge
  const getNewNotifications = useCallback(() => {
    // Use user creation date as fallback if no last_checked_at
    const lastChecked = userState?.last_checked_at || userProfile?.created_at || user?.created_at;
    if (!lastChecked) return [];

    const lastCheckedAt = new Date(lastChecked);
    return notifications.filter(n => {
      // Don't show user's own activity
      if (n.actor_id === user?.id) return false;
      return new Date(n.created_at) > lastCheckedAt;
    });
  }, [notifications, userState, userProfile, user]);

  // Get UNREAD notifications (not in notification_reads) - controls bold/unbold in list
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => {
      // Don't show user's own activity
      if (n.actor_id === user?.id) return false;
      return !notificationReads.has(n.id);
    });
  }, [notifications, notificationReads, user?.id]);

  // Check if notification is read
  const isNotificationRead = useCallback((notificationId) => {
    return notificationReads.has(notificationId);
  }, [notificationReads]);

  // Compute values directly (not as callbacks) to ensure they update properly
  const newNotificationsList = getNewNotifications();
  const unreadNotificationsList = getUnreadNotifications();

  // Check if there are NEW items (for bell badge)
  const hasNew = useCallback(() => {
    return newNotificationsList.length > 0;
  }, [newNotificationsList]);

  // Get new count (for badge)
  const newCount = useCallback(() => {
    return newNotificationsList.length;
  }, [newNotificationsList]);

  // Check if there are unread items
  const hasUnread = useCallback(() => {
    return unreadNotificationsList.length > 0;
  }, [unreadNotificationsList]);

  // Get unread count
  const unreadCount = useCallback(() => {
    return unreadNotificationsList.length;
  }, [unreadNotificationsList]);

  // Get all notifications for panel (excluding own activity)
  // Read items: expire after 24 hours
  // Unread items: expire after 72 hours
  const getNotificationsForPanel = useCallback(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    return notifications.filter(n => {
      if (n.actor_id === user?.id) return false;

      const createdAt = new Date(n.created_at);
      const isRead = notificationReads.has(n.id);

      if (isRead) {
        // Read items expire after 24 hours
        return createdAt > twentyFourHoursAgo;
      } else {
        // Unread items expire after 72 hours
        return createdAt > seventyTwoHoursAgo;
      }
    });
  }, [notifications, user?.id, notificationReads]);

  // Group notifications for display
  const getGroupedNotifications = useCallback(() => {
    const allNotifs = getNotificationsForPanel();
    const newNotifs = getNewNotifications();
    const newIds = new Set(newNotifs.map(n => n.id));

    // Separate into new and older (include ALL older items, read or unread)
    const newItems = allNotifs.filter(n => newIds.has(n.id));
    const olderItems = allNotifs.filter(n => !newIds.has(n.id));

    // Group new posts (with read status)
    const newPosts = newItems.filter(n => n.type === 'new_post').map(n => ({
      ...n,
      isRead: notificationReads.has(n.id)
    }));
    const newComments = newItems.filter(n => n.type === 'new_comment');

    // Group comments by post
    const commentsByPost = {};
    newComments.forEach(n => {
      if (!commentsByPost[n.post_id]) {
        commentsByPost[n.post_id] = {
          post: n.post,
          comments: [],
          latestActor: n.actor,
        };
      }
      commentsByPost[n.post_id].comments.push({
        ...n,
        isRead: notificationReads.has(n.id)
      });
      if (new Date(n.created_at) > new Date(commentsByPost[n.post_id].latestTime || 0)) {
        commentsByPost[n.post_id].latestActor = n.actor;
        commentsByPost[n.post_id].latestTime = n.created_at;
      }
    });

    // Group older items (with read status)
    const olderPosts = olderItems.filter(n => n.type === 'new_post').map(n => ({
      ...n,
      isRead: notificationReads.has(n.id)
    }));
    const olderComments = olderItems.filter(n => n.type === 'new_comment').map(n => ({
      ...n,
      isRead: notificationReads.has(n.id)
    }));

    return {
      newPosts,
      commentsByPost,
      olderPosts,
      olderComments,
      totalNew: newItems.length,
      totalOlder: olderItems.length,
    };
  }, [getNotificationsForPanel, getNewNotifications, notificationReads]);

  // Show banner (called when navigating to Home)
  const triggerBanner = useCallback(() => {
    if (!hasNew()) return;

    // Check if we should show banner (not shown in last 30 seconds)
    const lastShown = userState?.last_banner_shown_at;
    if (lastShown) {
      const timeSince = Date.now() - new Date(lastShown).getTime();
      if (timeSince < 30000) return;
    }

    setShowBanner(true);

    // Update last_banner_shown_at
    if (user?.id) {
      supabase
        .from('user_notification_state')
        .update({ last_banner_shown_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {
          setUserState(prev => prev ? { ...prev, last_banner_shown_at: new Date().toISOString() } : prev);
        });
    }

    // Auto-hide banner after 4 seconds
    setTimeout(() => {
      setBannerAnimatingOut(true);
      setTimeout(() => {
        setShowBanner(false);
        setBannerAnimatingOut(false);
      }, 500);
    }, 4000);
  }, [hasNew, userState, user?.id]);

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    setBannerAnimatingOut(true);
    setTimeout(() => {
      setShowBanner(false);
      setBannerAnimatingOut(false);
    }, 500);
  }, []);

  // Open notification panel and clear "new" badge
  const openPanel = useCallback(() => {
    setPanelOpen(true);
    // Clear "new" badge by updating last_checked_at
    if (user?.id) {
      const now = new Date().toISOString();
      setUserState(prev => prev ? { ...prev, last_checked_at: now } : prev);
      supabase
        .from('user_notification_state')
        .update({ last_checked_at: now })
        .eq('user_id', user.id)
        .then(() => {})
        .catch(err => console.error('Error updating last_checked_at:', err));
    }
  }, [user?.id]);

  // Close notification panel
  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!user?.id || notificationReads.has(notificationId)) return;

    // Optimistic update
    setNotificationReads(prev => new Set([...prev, notificationId]));

    try {
      await supabase
        .from('notification_reads')
        .insert({ user_id: user.id, notification_id: notificationId });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user?.id, notificationReads]);

  // Update last_checked_at to NOW (moves the "new" marker)
  const updateLastChecked = useCallback(async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();

    // Optimistic update
    setUserState(prev => prev ? { ...prev, last_checked_at: now } : prev);

    try {
      await supabase
        .from('user_notification_state')
        .update({ last_checked_at: now })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error updating last_checked_at:', err);
    }
  }, [user?.id]);

  // Mark all as read (marks individual notifications AND updates last_checked_at)
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const unread = getUnreadNotifications();
    const now = new Date().toISOString();

    // Optimistic updates
    setNotificationReads(prev => {
      const newSet = new Set(prev);
      unread.forEach(n => newSet.add(n.id));
      return newSet;
    });
    setUserState(prev => prev ? { ...prev, last_checked_at: now } : prev);

    try {
      // Insert all unread notifications as read
      if (unread.length > 0) {
        const inserts = unread.map(n => ({ user_id: user.id, notification_id: n.id }));
        await supabase.from('notification_reads').upsert(inserts, { onConflict: 'user_id,notification_id' });
      }

      // Update last_checked_at
      await supabase
        .from('user_notification_state')
        .update({ last_checked_at: now })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [user?.id, getUnreadNotifications]);

  // Navigate to a specific notification
  const navigateToNotification = useCallback((notification) => {
    // Mark this notification as read (but DON'T move the "new" marker)
    markAsRead(notification.id);

    // Close panel
    closePanel();

    // Set scroll target
    if (notification.type === 'new_post') {
      setScrollTarget({ postId: notification.post_id, type: 'post' });
    } else if (notification.type === 'new_comment') {
      const postRead = postReads[notification.post_id];
      const startIndex = postRead?.last_seen_comment_count || 0;
      setScrollTarget({
        postId: notification.post_id,
        type: 'comment',
        commentStartIndex: startIndex
      });
    }

    return scrollTarget;
  }, [markAsRead, closePanel, postReads, scrollTarget]);

  // Clear scroll target
  const clearScrollTarget = useCallback(() => {
    setScrollTarget(null);
  }, []);

  // Track when user views a post's comments
  const trackPostRead = useCallback(async (postId, commentCount) => {
    if (!user?.id) return;

    const now = new Date().toISOString();

    setPostReads(prev => ({
      ...prev,
      [postId]: {
        post_id: postId,
        user_id: user.id,
        last_seen_comment_count: commentCount,
        last_read_at: now,
      }
    }));

    try {
      await supabase
        .from('user_post_reads')
        .upsert({
          user_id: user.id,
          post_id: postId,
          last_seen_comment_count: commentCount,
          last_read_at: now,
        }, {
          onConflict: 'user_id,post_id'
        });
    } catch (err) {
      console.error('Error tracking post read:', err);
    }
  }, [user?.id]);

  // Get the "new comments" start index for a post
  const getNewCommentsStartIndex = useCallback((postId) => {
    const postRead = postReads[postId];
    return postRead?.last_seen_comment_count || 0;
  }, [postReads]);

  // Check if a post has new comments
  const hasNewComments = useCallback((postId, currentCommentCount) => {
    const postRead = postReads[postId];
    if (!postRead) return currentCommentCount > 0;
    return currentCommentCount > postRead.last_seen_comment_count;
  }, [postReads]);

  // Get new comments count for a post
  const getNewCommentsCount = useCallback((postId, currentCommentCount) => {
    const postRead = postReads[postId];
    if (!postRead) return currentCommentCount;
    return Math.max(0, currentCommentCount - postRead.last_seen_comment_count);
  }, [postReads]);

  const value = {
    // Data
    notifications,
    loading,

    // New (for bell badge)
    hasNew,
    newCount,
    getNewNotifications,

    // Unread (for list styling)
    hasUnread,
    unreadCount,
    getUnreadNotifications,
    isNotificationRead,

    // Panel data
    getNotificationsForPanel,
    getGroupedNotifications,

    // Banner
    showBanner,
    bannerAnimatingOut,
    triggerBanner,
    dismissBanner,

    // Panel
    panelOpen,
    openPanel,
    closePanel,

    // Actions
    markAsRead,
    markAllAsRead,
    updateLastChecked,
    navigateToNotification,

    // Scroll
    scrollTarget,
    clearScrollTarget,

    // Post reads (for "New" divider)
    trackPostRead,
    getNewCommentsStartIndex,
    hasNewComments,
    getNewCommentsCount,

    // Refresh
    refresh: loadActivityData,
  };

  return (
    <ActivityNotificationsContext.Provider value={value}>
      {children}
    </ActivityNotificationsContext.Provider>
  );
};
