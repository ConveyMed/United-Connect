import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { notifyNewUpdate, notifyNewEvent, notifyEventRsvp } from '../services/notifications';

const NotificationsContext = createContext({});

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { user, userProfile } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [userNotifications, setUserNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({ updates: 0, events: 0 });

  // Load notifications and subscribe to real-time updates
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUserNotifications();

      // Subscribe to real-time notifications
      const subscription = supabase
        .channel('notifications-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          () => loadNotifications()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setNotifications([]);
      setUserNotifications({});
      setUnreadCounts({ updates: 0, events: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load all active notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user's notification interactions
  const loadUserNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user notifications:', error);
        return;
      }

      // Convert to lookup object by notification_id
      const lookup = {};
      (data || []).forEach(un => {
        lookup[un.notification_id] = un;
      });
      setUserNotifications(lookup);

      // Calculate unread counts
      calculateUnreadCounts(lookup);
    } catch (err) {
      console.error('Error loading user notifications:', err);
    }
  };

  // Calculate unread counts
  const calculateUnreadCounts = useCallback((userNotifs) => {
    const notifs = userNotifs || userNotifications;
    let updates = 0;
    let events = 0;

    notifications.forEach(n => {
      const userNotif = notifs[n.id];
      const isRead = userNotif?.is_read === true;
      const isArchived = userNotif?.is_archived === true;

      if (!isRead && !isArchived) {
        if (n.type === 'update') updates++;
        else if (n.type === 'event') events++;
      }
    });

    setUnreadCounts({ updates, events });
  }, [notifications, userNotifications]);

  // Recalculate when notifications or user notifications change
  useEffect(() => {
    if (notifications.length > 0) {
      calculateUnreadCounts();
    }
  }, [notifications, userNotifications, calculateUnreadCounts]);

  // Get notification status for a specific notification
  const getNotificationStatus = (notificationId) => {
    return userNotifications[notificationId] || null;
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserNotifications(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        notification_id: notificationId,
        user_id: user.id,
        is_read: true,
        read_at: new Date().toISOString(),
      }
    }));

    try {
      const { error } = await supabase
        .from('user_notifications')
        .upsert({
          notification_id: notificationId,
          user_id: user.id,
          is_read: true,
          read_at: new Date().toISOString(),
        }, { onConflict: 'notification_id,user_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Error marking as read:', err);
      loadUserNotifications();
    }
  };

  // Archive/hide notification
  const archiveNotification = async (notificationId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserNotifications(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        notification_id: notificationId,
        user_id: user.id,
        is_archived: true,
        archived_at: new Date().toISOString(),
      }
    }));

    try {
      const { error } = await supabase
        .from('user_notifications')
        .upsert({
          notification_id: notificationId,
          user_id: user.id,
          is_archived: true,
          archived_at: new Date().toISOString(),
        }, { onConflict: 'notification_id,user_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Error archiving notification:', err);
      loadUserNotifications();
    }
  };

  // Unarchive notification
  const unarchiveNotification = async (notificationId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserNotifications(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        is_archived: false,
        archived_at: null,
      }
    }));

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_archived: false, archived_at: null })
        .eq('notification_id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error unarchiving notification:', err);
      loadUserNotifications();
    }
  };

  // Submit RSVP response
  const submitRsvp = async (notificationId, response) => {
    if (!user?.id) return;

    const now = new Date().toISOString();

    // Optimistic update
    setUserNotifications(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        notification_id: notificationId,
        user_id: user.id,
        rsvp_response: response,
        responded_at: now,
        is_read: true,
        read_at: prev[notificationId]?.read_at || now,
      }
    }));

    try {
      const { error } = await supabase
        .from('user_notifications')
        .upsert({
          notification_id: notificationId,
          user_id: user.id,
          rsvp_response: response,
          responded_at: now,
          is_read: true,
          read_at: now,
        }, { onConflict: 'notification_id,user_id' });

      if (error) throw error;

      // Notify admins of the RSVP
      const notification = notifications.find(n => n.id === notificationId);
      const userName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || 'A member';

      notifyEventRsvp({
        userId: user.id,
        userName,
        eventTitle: notification?.title,
        response,
        notificationId,
      }).catch(err => console.error('RSVP notification error:', err));
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      loadUserNotifications();
    }
  };

  // === ADMIN FUNCTIONS ===

  // Load all notifications (including inactive) for admin
  const loadAllNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error loading all notifications:', err);
      return [];
    }
  };

  // Create notification
  const createNotification = async (notificationData) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          type: notificationData.type,
          title: notificationData.title,
          body: notificationData.body || '',
          link_url: notificationData.link_url || null,
          link_label: notificationData.link_label || null,
          enable_rsvp: notificationData.enable_rsvp || false,
          rsvp_question: notificationData.rsvp_question || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push/email notifications
      if (data.type === 'update') {
        notifyNewUpdate({
          senderId: user?.id,
          notificationId: data.id,
          title: data.title,
          body: data.body,
        }).catch(err => console.error('Notification error:', err));
      } else if (data.type === 'event') {
        notifyNewEvent({
          senderId: user?.id,
          notificationId: data.id,
          title: data.title,
          body: data.body,
        }).catch(err => console.error('Notification error:', err));
      }

      // Refresh notifications list
      loadNotifications();

      return data;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  };

  // Update notification
  const updateNotification = async (notificationId, updates) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update(updates)
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, ...updates } : n
      ));
    } catch (err) {
      console.error('Error updating notification:', err);
      throw err;
    }
  };

  // Delete notification (soft delete by setting is_active to false)
  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  };

  // Get RSVP responses for a notification (admin)
  const getRsvpResponses = async (notificationId) => {
    try {
      // Get RSVP responses
      const { data: responses, error: respError } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .not('rsvp_response', 'is', null);

      if (respError) throw respError;
      if (!responses || responses.length === 0) return [];

      // Get user details for responders
      const userIds = responses.map(r => r.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_image_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Combine responses with user data
      const usersMap = {};
      (users || []).forEach(u => { usersMap[u.id] = u; });

      return responses.map(r => ({
        ...r,
        users: usersMap[r.user_id] || null
      }));
    } catch (err) {
      console.error('Error getting RSVP responses:', err);
      return [];
    }
  };

  // Get filtered notifications
  const getFilteredNotifications = useCallback((type, showArchived = false) => {
    return notifications.filter(n => {
      if (n.type !== type) return false;

      const userNotif = userNotifications[n.id];
      const isArchived = userNotif?.is_archived === true;

      if (showArchived) {
        return isArchived;
      } else {
        return !isArchived;
      }
    });
  }, [notifications, userNotifications]);

  const value = {
    // Data
    notifications,
    userNotifications,
    loading,
    unreadCounts,
    totalUnread: unreadCounts.updates + unreadCounts.events,

    // Read functions
    loadNotifications,
    loadUserNotifications,
    getNotificationStatus,
    getFilteredNotifications,

    // User actions
    markAsRead,
    archiveNotification,
    unarchiveNotification,
    submitRsvp,

    // Admin functions
    loadAllNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    getRsvpResponses,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
