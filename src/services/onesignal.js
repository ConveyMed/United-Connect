import { supabase } from '../config/supabase';
import { Capacitor } from '@capacitor/core';

// IMPORTANT: Replace this fallback with the client's OneSignal App ID
// Also update .env AND Netlify env vars (REACT_APP_ONESIGNAL_APP_ID + REACT_APP_ONESIGNAL_REST_API_KEY)
// See ~/Apps/onesignal.md for full setup checklist
const ONESIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID || 'REPLACE_WITH_CLIENT_APP_ID';

let isSDKInitialized = false;
let currentUserId = null;
let subscriptionListener = null;
let hasCalledOptIn = false;

/**
 * Get OneSignal instance (handles both import styles)
 */
const getOneSignal = () => {
  return window.plugins?.OneSignal || window.OneSignal;
};

/**
 * Initialize OneSignal SDK (call once on app start, before auth)
 */
export const initializeOneSignalSDK = () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('[OneSignal] Web platform - skipping SDK init');
    return;
  }

  if (isSDKInitialized) {
    console.log('[OneSignal] SDK already initialized');
    return;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.log('[OneSignal] Plugin not available');
    return;
  }

  try {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    isSDKInitialized = true;
    console.log('[OneSignal] SDK initialized with app:', ONESIGNAL_APP_ID);

    // Set up notification click handler for deep linking
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('[OneSignal] Notification clicked:', event);
      const data = event.notification?.additionalData;
      if (data) {
        localStorage.setItem('pendingDeepLink', JSON.stringify(data));
      }
    });
  } catch (err) {
    console.error('[OneSignal] SDK init error:', err);
  }
};

/**
 * Register device for push notifications (call after auth)
 * Can be called multiple times - will update subscription if changed
 */
export const registerDeviceForUser = async (userId) => {
  if (!Capacitor.isNativePlatform() || !userId) {
    console.log('[OneSignal] Skipping device registration (web or no user)');
    return;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.log('[OneSignal] Plugin not available for registration');
    return;
  }

  // Make sure SDK is initialized
  if (!isSDKInitialized) {
    initializeOneSignalSDK();
  }

  currentUserId = userId;

  try {
    // Link external user ID
    OneSignal.login(userId);
    console.log('[OneSignal] Logged in with userId:', userId);

    // Remove old listener if exists
    if (subscriptionListener) {
      OneSignal.User.pushSubscription.removeEventListener('change', subscriptionListener);
    }

    // Add subscription change listener with CORRECT event path
    subscriptionListener = async (event) => {
      console.log('[OneSignal] Subscription change event:', event);
      // CRITICAL: Use event.current.id, NOT event.id
      const subscriptionId = event?.current?.id;
      console.log('[OneSignal] Subscription ID from event.current.id:', subscriptionId);

      if (subscriptionId && currentUserId) {
        await saveSubscriptionId(currentUserId, subscriptionId);
      }
    };
    OneSignal.User.pushSubscription.addEventListener('change', subscriptionListener);

    // Check for existing subscription ID (async method is preferred)
    let subscriptionId = null;
    if (OneSignal.User.pushSubscription.getIdAsync) {
      subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    } else {
      subscriptionId = OneSignal.User.pushSubscription?.id;
    }

    console.log('[OneSignal] Current subscription ID:', subscriptionId);

    // Check optedIn status
    const isOptedIn = OneSignal.User.pushSubscription?.optedIn;
    console.log('[OneSignal] Current optedIn status:', isOptedIn);

    if (subscriptionId) {
      // If we have a subscription but not opted in, fix it (only once)
      if (!isOptedIn && !hasCalledOptIn) {
        console.log('[OneSignal] Has subscription but not opted in - calling optIn()');
        hasCalledOptIn = true;
        OneSignal.User.pushSubscription.optIn();
      }
      await saveSubscriptionId(userId, subscriptionId);
    } else {
      console.log('[OneSignal] No subscription ID yet - waiting for permission/change event');
    }

  } catch (err) {
    console.error('[OneSignal] Device registration error:', err);
  }
};

/**
 * Check and request notification permission for returning users
 * Call this for users who completed onboarding but may be on new device
 */
export const checkAndRequestPermission = async (userId) => {
  if (!Capacitor.isNativePlatform()) return false;

  const OneSignal = getOneSignal();
  if (!OneSignal) return false;

  try {
    // Check current iOS permission status
    const hasPermission = await new Promise((resolve) => {
      if (OneSignal.Notifications.getPermissionAsync) {
        OneSignal.Notifications.getPermissionAsync((perm) => resolve(perm));
      } else {
        // Fallback for older SDK
        resolve(OneSignal.Notifications.permission);
      }
    });

    console.log('[OneSignal] Current iOS permission:', hasPermission);

    // Check if OneSignal is opted in (different from iOS permission)
    const isOptedIn = OneSignal.User.pushSubscription?.optedIn;
    console.log('[OneSignal] Current optedIn status:', isOptedIn);

    if (!hasPermission) {
      // iOS permission not granted - request it
      console.log('[OneSignal] Requesting iOS permission...');
      const granted = await OneSignal.Notifications.requestPermission(true);
      console.log('[OneSignal] Permission granted:', granted);

      if (granted) {
        // Opt in to OneSignal and register device
        console.log('[OneSignal] Opting in after permission granted...');
        OneSignal.User.pushSubscription.optIn();
        if (userId) {
          await registerDeviceForUser(userId);
        }
      }
      return granted;
    } else if (!isOptedIn) {
      // iOS permission is granted but OneSignal not opted in - opt in now
      console.log('[OneSignal] iOS permission granted but not opted in - opting in...');
      OneSignal.User.pushSubscription.optIn();
      if (userId) {
        await registerDeviceForUser(userId);
      }
      return true;
    }

    return hasPermission;
  } catch (err) {
    console.error('[OneSignal] Permission check error:', err);
    return false;
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use initializeOneSignalSDK() + registerDeviceForUser() instead
 */
export const initializeOneSignal = async (userId) => {
  console.log('[OneSignal] initializeOneSignal called (legacy) for:', userId);
  initializeOneSignalSDK();
  await registerDeviceForUser(userId);
};

/**
 * Create default notification preferences for a user
 * Called when device is first registered to ensure preferences exist
 */
const createDefaultPreferences = async (userId) => {
  console.log('[OneSignal] Creating default notification preferences for:', userId);

  try {
    // Check if preferences already exist
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      console.log('[OneSignal] Preferences already exist, skipping');
      return;
    }

    // Create default preferences (all enabled)
    const { error } = await supabase
      .from('user_notification_preferences')
      .insert({
        user_id: userId,
        push_new_posts: true,
        push_post_likes: true,
        push_post_comments: true,
        push_comment_replies: true,
        push_bookmarked_comments: true,
        push_direct_messages: true,
        push_group_messages: true,
        push_chat_added: true,
        push_chat_removed: true,
        push_new_updates: true,
        push_new_events: true,
        push_event_reminders: true,
      });

    if (error) {
      console.error('[OneSignal] Error creating default preferences:', error);
    } else {
      console.log('[OneSignal] Default preferences created successfully');
    }
  } catch (err) {
    console.error('[OneSignal] Exception creating default preferences:', err);
  }
};

/**
 * Save subscription ID to database (multi-device support)
 * Uses user_devices table with composite unique (user_id, subscription_id)
 */
const saveSubscriptionId = async (userId, subscriptionId) => {
  console.log('[OneSignal] === SAVING DEVICE ===');
  console.log('[OneSignal] User ID:', userId);
  console.log('[OneSignal] Subscription ID:', subscriptionId);

  try {
    // Get platform info
    const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

    // Upsert to user_devices table (multi-device support)
    const { data, error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        onesignal_subscription_id: subscriptionId,
        platform: platform,
        device_name: `${platform} device`,
        last_active_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,onesignal_subscription_id',  // Composite key!
      })
      .select();

    if (error) {
      console.error('[OneSignal] Error saving subscription ID:', error);
    } else {
      console.log('[OneSignal] Subscription ID saved successfully:', data);
    }

    // Ensure default notification preferences exist
    await createDefaultPreferences(userId);
  } catch (err) {
    console.error('[OneSignal] Exception saving subscription ID:', err);
  }
};

/**
 * Request push notification permission
 * Returns true if permission granted
 */
export const requestPushPermission = async () => {
  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.log('[OneSignal] Not available for permission request');
    return false;
  }

  try {
    console.log('[OneSignal] Requesting permission...');
    const permission = await OneSignal.Notifications.requestPermission(true);
    console.log('[OneSignal] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[OneSignal] Error requesting permission:', error);
    return false;
  }
};

/**
 * Check if push notifications are enabled
 */
export const isPushEnabled = async () => {
  const OneSignal = getOneSignal();
  if (!OneSignal) return false;

  try {
    const optedIn = OneSignal.User.pushSubscription?.optedIn;
    console.log('[OneSignal] isPushEnabled check - optedIn:', optedIn);
    return optedIn;
  } catch (error) {
    console.log('[OneSignal] isPushEnabled error:', error);
    return false;
  }
};

/**
 * Opt out of push notifications
 */
export const optOutPush = async () => {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  try {
    OneSignal.User.pushSubscription.optOut();
    console.log('[OneSignal] Opted out of push notifications');
  } catch (error) {
    console.error('[OneSignal] Error opting out:', error);
  }
};

/**
 * Opt in to push notifications
 */
export const optInPush = async () => {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  try {
    OneSignal.User.pushSubscription.optIn();
    console.log('[OneSignal] Opted in to push notifications');
  } catch (error) {
    console.error('[OneSignal] Error opting in:', error);
  }
};

/**
 * Logout from OneSignal (call on user signout)
 */
export const logoutOneSignal = async () => {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  try {
    // Skip if we never logged in — calling OneSignal.logout() with no external ID
    // throws inside the SDK (LoginManager: cannot read 'Qe' of undefined).
    if (currentUserId) {
      await OneSignal.logout();
    }
    currentUserId = null;
    if (subscriptionListener) {
      OneSignal.User.pushSubscription.removeEventListener('change', subscriptionListener);
      subscriptionListener = null;
    }
    console.log('[OneSignal] Logout complete');
  } catch (error) {
    console.error('[OneSignal] Error logging out:', error);
  }
};

/**
 * Debug function to check current OneSignal state
 */
export const debugOneSignalState = async () => {
  const OneSignal = getOneSignal();

  console.log('=== ONESIGNAL DEBUG STATE ===');
  console.log('isSDKInitialized:', isSDKInitialized);
  console.log('currentUserId:', currentUserId);
  console.log('OneSignal available:', !!OneSignal);

  if (OneSignal) {
    let subscriptionId = null;
    if (OneSignal.User.pushSubscription.getIdAsync) {
      subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    } else {
      subscriptionId = OneSignal.User.pushSubscription?.id;
    }
    console.log('subscriptionId:', subscriptionId);
    console.log('optedIn:', OneSignal.User.pushSubscription?.optedIn);
  }

  // Check database for devices (multi-device table)
  const { data, error } = await supabase
    .from('user_devices')
    .select('user_id, onesignal_subscription_id, platform, last_active_at')
    .order('last_active_at', { ascending: false });

  console.log('Devices in database:');
  console.log('- data:', data);
  console.log('- error:', error);
  console.log('=== END DEBUG ===');
};

/**
 * Remove current device from database (call on explicit logout if desired)
 */
export const removeCurrentDevice = async (userId) => {
  const OneSignal = getOneSignal();
  if (!OneSignal || !userId) return;

  try {
    let subscriptionId = null;
    if (OneSignal.User.pushSubscription.getIdAsync) {
      subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    } else {
      subscriptionId = OneSignal.User.pushSubscription?.id;
    }

    if (subscriptionId) {
      await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .eq('onesignal_subscription_id', subscriptionId);

      console.log('[OneSignal] Device removed from database');
    }
  } catch (err) {
    console.error('[OneSignal] Error removing device:', err);
  }
};
