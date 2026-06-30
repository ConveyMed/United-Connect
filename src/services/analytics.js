/**
 * Analytics Service
 * Tracks user events for ConveyMed Analytics dashboard
 * Uses idb-keyval for offline queue when network unavailable
 */

import { supabase } from '../config/supabase';
import { supabaseUrl, supabaseAnonKey } from '../config/supabase';
import { get, set } from 'idb-keyval';

// Keys for offline queue
const OFFLINE_QUEUE_KEY = 'analytics_offline_queue';

/**
 * Queue an event for later if offline
 */
const queueEvent = async (tableName, data) => {
  try {
    const queue = await get(OFFLINE_QUEUE_KEY) || [];
    queue.push({ tableName, data, timestamp: Date.now() });
    await set(OFFLINE_QUEUE_KEY, queue);
  } catch (e) {
    console.error('[Analytics] Failed to queue event:', e);
  }
};

/**
 * Process queued events when back online
 */
export const processOfflineQueue = async () => {
  try {
    const queue = await get(OFFLINE_QUEUE_KEY) || [];
    if (queue.length === 0) return;

    const failedItems = [];

    for (const item of queue) {
      try {
        const { error } = await supabase
          .from(item.tableName)
          .insert(item.data);

        if (error) {
          console.error(`[Analytics] Failed to sync ${item.tableName}:`, error);
          failedItems.push(item);
        }
      } catch (e) {
        failedItems.push(item);
      }
    }

    // Keep only failed items in queue
    await set(OFFLINE_QUEUE_KEY, failedItems);
  } catch (e) {
    console.error('[Analytics] Failed to process offline queue:', e);
  }
};

/**
 * Generic insert helper with offline fallback
 */
const insertEvent = async (tableName, data) => {
  if (!navigator.onLine) {
    await queueEvent(tableName, data);
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`[Analytics] ${tableName} insert error:`, error);
      await queueEvent(tableName, data);
      return null;
    }

    return result;
  } catch (e) {
    console.error(`[Analytics] ${tableName} error:`, e);
    await queueEvent(tableName, data);
    return null;
  }
};

// ============================================
// SESSION TRACKING
// ============================================

/**
 * Start a new session when user logs in or returns from 10+ min background
 * @returns {Promise<string|null>} Session ID or null on error
 */
// Track session start times locally so we don't need a round trip on end
const sessionStartTimes = {};

export const logSessionStart = async (userId, deviceInfo = null) => {
  // Close any orphaned sessions for this user (no ended_at = never properly closed)
  try {
    const { data: orphaned } = await supabase
      .from('user_sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(10);

    if (orphaned && orphaned.length > 0) {
      for (const session of orphaned) {
        const startedAt = new Date(session.started_at);
        // Cap orphaned sessions at a reasonable max (e.g. 30 min)
        const maxDuration = 30 * 60;
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        const duration = Math.min(elapsed, maxDuration);

        await supabase
          .from('user_sessions')
          .update({
            ended_at: new Date(startedAt.getTime() + duration * 1000).toISOString(),
            duration_seconds: duration,
          })
          .eq('id', session.id);
      }
    }
  } catch (e) {
    console.error('[Analytics] orphan cleanup error:', e);
  }

  const startedAt = new Date().toISOString();
  const result = await insertEvent('user_sessions', {
    user_id: userId,
    started_at: startedAt,
    device_info: deviceInfo,
  });
  const sessionId = result?.id || null;
  if (sessionId) {
    sessionStartTimes[sessionId] = startedAt;
  }
  return sessionId;
};

/**
 * End a session (on logout, going to background, or tab close)
 * Uses locally cached start time to avoid a round trip on close.
 */
export const logSessionEnd = async (sessionId) => {
  if (!sessionId) return;

  try {
    const endedAt = new Date();
    let startedAt;

    // Use cached start time if available (avoids round trip, critical for beforeunload)
    if (sessionStartTimes[sessionId]) {
      startedAt = new Date(sessionStartTimes[sessionId]);
      delete sessionStartTimes[sessionId];
    } else {
      // Fallback: fetch from DB
      const { data: session } = await supabase
        .from('user_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      if (!session) return;
      startedAt = new Date(session.started_at);
    }

    const durationSeconds = Math.floor((endedAt - startedAt) / 1000);

    await supabase
      .from('user_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[Analytics] logSessionEnd error:', e);
  }
};

/**
 * End session using sendBeacon (for beforeunload when fetch may not complete)
 */
export const logSessionEndBeacon = (sessionId) => {
  if (!sessionId) return;

  const endedAt = new Date();
  let durationSeconds = 0;

  if (sessionStartTimes[sessionId]) {
    const startedAt = new Date(sessionStartTimes[sessionId]);
    durationSeconds = Math.floor((endedAt - startedAt) / 1000);
    delete sessionStartTimes[sessionId];
  }

  const url = `${supabaseUrl}/rest/v1/user_sessions?id=eq.${sessionId}`;
  const body = JSON.stringify({
    ended_at: endedAt.toISOString(),
    duration_seconds: durationSeconds,
  });

  // sendBeacon with headers via fetch keepalive as fallback
  try {
    if (navigator.sendBeacon) {
      // sendBeacon can't set custom headers, so use fetch with keepalive instead
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'return=minimal',
        },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    // Best effort - page is closing
  }
};

// ============================================
// SCREEN TRACKING
// ============================================

/**
 * Log a screen view
 */
export const logScreenView = async (userId, screenName, sessionId = null) => {
  await insertEvent('screen_views', {
    user_id: userId,
    session_id: sessionId,
    screen_name: screenName,
  });
};

// ============================================
// ASSET EVENTS
// ============================================

/**
 * Log an asset interaction (view, click on file/link/quiz)
 * @param {string} eventType - 'view', 'file_click', 'link_click', 'quiz_click'
 */
export const logAssetEvent = async (userId, assetId, assetName, category, categoryType, eventType) => {
  await insertEvent('asset_events', {
    user_id: userId,
    asset_id: assetId,
    asset_name: assetName,
    category: category,
    category_type: categoryType,
    event_type: eventType,
  });
};

// ============================================
// AI QUERIES
// ============================================

/**
 * Log an AI query along with the AI's answer quality.
 * confidence: 'high' | 'medium' | 'low' | 'none' (returned by ai-chat edge function).
 * hasCitation: true when the response included a sectionTitle or pageNumber.
 * Pass nulls if logging before the response (legacy callers).
 */
export const logAIQuery = async (
  userId,
  queryText,
  productName = null,
  confidence = null,
  hasCitation = null
) => {
  await insertEvent('ai_queries', {
    user_id: userId,
    query_text: queryText,
    product_name: productName,
    confidence,
    has_citation: hasCitation,
  });
};

// ============================================
// PROFILE VIEWS
// ============================================

/**
 * Log when a user views another user's profile in Directory
 */
export const logProfileView = async (viewerId, viewedUserId) => {
  // Don't log self-views
  if (viewerId === viewedUserId) return;

  await insertEvent('profile_views', {
    viewer_id: viewerId,
    viewed_user_id: viewedUserId,
  });
};

// ============================================
// DIRECTORY SEARCHES
// ============================================

/**
 * Log a directory search
 */
export const logDirectorySearch = async (userId, searchQuery, resultsCount = null) => {
  // Don't log empty searches
  if (!searchQuery?.trim()) return;

  await insertEvent('directory_searches', {
    user_id: userId,
    search_query: searchQuery.trim(),
    results_count: resultsCount,
  });
};

// ============================================
// NOTIFICATION CLICKS
// ============================================

/**
 * Log when a user taps on a notification
 */
export const logNotificationClick = async (userId, notificationId, notificationType = null) => {
  await insertEvent('notification_clicks', {
    user_id: userId,
    notification_id: notificationId,
    notification_type: notificationType,
  });
};
