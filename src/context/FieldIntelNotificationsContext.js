import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const FieldIntelNotificationsContext = createContext({});

export const useFieldIntelNotifications = () => {
  const context = useContext(FieldIntelNotificationsContext);
  if (!context) {
    throw new Error('useFieldIntelNotifications must be used within a FieldIntelNotificationsProvider');
  }
  return context;
};

export const FieldIntelNotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadIds, setUnreadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const totalUnread = unreadIds.size;

  // Initial + refresh fetch of unread call_log IDs visible to this user.
  // RLS on call_logs handles visibility; we exclude rows authored by self and rows already read.
  const fetchUnread = useCallback(async () => {
    if (!user?.id) {
      setUnreadIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const [callsRes, readsRes] = await Promise.all([
        supabase
          .from('call_logs')
          .select('id, user_id')
          .neq('user_id', user.id)
          .order('call_date', { ascending: false })
          .limit(500),
        supabase
          .from('field_intel_notification_reads')
          .select('call_log_id')
          .eq('user_id', user.id),
      ]);

      const readSet = new Set((readsRes.data || []).map(r => r.call_log_id));
      const unread = new Set();
      (callsRes.data || []).forEach(c => {
        if (!readSet.has(c.id)) unread.add(c.id);
      });
      setUnreadIds(unread);
    } catch (err) {
      console.error('[FieldIntelNotifications] fetchUnread error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markRead = useCallback(async (callLogId) => {
    if (!user?.id || !callLogId) return;
    // Optimistic remove
    setUnreadIds(prev => {
      if (!prev.has(callLogId)) return prev;
      const next = new Set(prev);
      next.delete(callLogId);
      return next;
    });
    const { error } = await supabase.rpc('mark_call_log_read', { p_call_log_id: callLogId });
    if (error) {
      console.error('[FieldIntelNotifications] markRead error:', error);
      // Reverse optimistic update on failure
      fetchUnread();
    }
  }, [user?.id, fetchUnread]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic clear
    setUnreadIds(new Set());
    const { error } = await supabase.rpc('mark_all_call_logs_read');
    if (error) {
      console.error('[FieldIntelNotifications] markAllRead error:', error);
      fetchUnread();
    }
  }, [user?.id, fetchUnread]);

  const isUnread = useCallback((callLogId) => unreadIds.has(callLogId), [unreadIds]);

  // Realtime: new call_log INSERT → add to unread set (if not authored by me).
  useEffect(() => {
    if (!user?.id) return;
    fetchUnread();

    const channel = supabase
      .channel('field-intel-call-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_logs' },
        (payload) => {
          const row = payload.new;
          if (!row || row.user_id === user.id) return;
          setUnreadIds(prev => {
            if (prev.has(row.id)) return prev;
            const next = new Set(prev);
            next.add(row.id);
            return next;
          });
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id, fetchUnread]);

  const value = {
    unreadIds,
    totalUnread,
    loading,
    isUnread,
    markRead,
    markAllRead,
    refresh: fetchUnread,
  };

  return (
    <FieldIntelNotificationsContext.Provider value={value}>
      {children}
    </FieldIntelNotificationsContext.Provider>
  );
};
