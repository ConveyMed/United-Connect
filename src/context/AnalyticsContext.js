/**
 * Analytics Context
 * Manages session state, screen tracking, and provides analytics hooks to components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthContext';
import {
  logSessionStart,
  logSessionEnd,
  logSessionEndBeacon,
  logScreenView,
  logAssetEvent,
  logAIQuery,
  logProfileView,
  logDirectorySearch,
  logNotificationClick,
  processOfflineQueue,
} from '../services/analytics';

const AnalyticsContext = createContext({});

// Map routes to screen names for cleaner analytics
const SCREEN_NAMES = {
  '/home': 'Home',
  '/profile': 'Profile',
  '/edit-profile': 'Edit Profile',
  '/notifications': 'Notification Settings',
  '/directory': 'Directory',
  '/directory-permissions': 'Directory Permissions',
  '/library': 'Library',
  '/training': 'Training',
  '/manage-library': 'Manage Library',
  '/manage-training': 'Manage Training',
  '/updates': 'Updates',
  '/manage-updates': 'Manage Updates',
  '/manage-ai': 'Manage AI',
  '/downloads': 'Downloads',
  '/chat': 'Chat',
  '/manage-chat': 'Manage Chat',
  '/manage-users': 'Manage Users',
  '/manage-analytics': 'Analytics Dashboard',
};

// Routes to skip tracking (auth flow, etc)
const SKIP_ROUTES = ['/', '/signup', '/confirm-email', '/email-confirmed', '/forgot-password', '/reset-password', '/profile-complete'];

// 10 minutes in milliseconds for background threshold
const BACKGROUND_THRESHOLD_MS = 10 * 60 * 1000;

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const AnalyticsProvider = ({ children }) => {
  const { user, isAuthenticated, isProfileComplete } = useAuth();
  const location = useLocation();

  const [currentSessionId, setCurrentSessionId] = useState(null);
  const backgroundTimeRef = useRef(null);
  const lastScreenRef = useRef(null);

  // Get device info for session tracking
  const getDeviceInfo = useCallback(() => {
    return {
      platform: Capacitor.getPlatform(),
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  }, []);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user?.id) return;

    const sessionId = await logSessionStart(user.id, getDeviceInfo());
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [user?.id, getDeviceInfo]);

  // End current session
  const endSession = useCallback(async () => {
    if (currentSessionId) {
      await logSessionEnd(currentSessionId);
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  // Start session on login (when user becomes authenticated with complete profile)
  useEffect(() => {
    if (isAuthenticated && isProfileComplete && user?.id && !currentSessionId) {
      startSession();
      // Process any queued offline events
      processOfflineQueue();
    }
  }, [isAuthenticated, isProfileComplete, user?.id, currentSessionId, startSession]);

  // Handle app background/foreground for native apps
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated || !isProfileComplete) return;

    const handleAppStateChange = async (state) => {
      if (!state.isActive) {
        // App going to background - fire beacon immediately (survives swipe-up kill)
        backgroundTimeRef.current = Date.now();
        if (currentSessionId) {
          logSessionEndBeacon(currentSessionId);
          setCurrentSessionId(null);
        }
      } else {
        // App coming to foreground
        const backgroundTime = backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        if (backgroundTime) {
          const timeInBackground = Date.now() - backgroundTime;

          if (timeInBackground >= BACKGROUND_THRESHOLD_MS) {
            // Was in background for 10+ minutes - start new session
            await startSession();
          } else {
            // Was in background for less than 10 minutes - continue existing session
            // Just restart the session since we ended it when going to background
            await startSession();
          }
        } else {
          // No background time recorded, start fresh session
          await startSession();
        }

        // Process any queued offline events
        processOfflineQueue();
      }
    };

    CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [isAuthenticated, isProfileComplete, startSession, endSession]);

  // Handle web tab close / navigate away (non-native only)
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !isAuthenticated || !isProfileComplete) return;

    const sessionIdRef = { current: currentSessionId };
    sessionIdRef.current = currentSessionId;

    const handleBeforeUnload = () => {
      // Use beacon/keepalive since page is closing
      if (sessionIdRef.current) {
        logSessionEndBeacon(sessionIdRef.current);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Tab hidden - end session with beacon as backup
        if (sessionIdRef.current) {
          logSessionEndBeacon(sessionIdRef.current);
        }
      } else if (document.visibilityState === 'visible') {
        // Tab visible again - start new session
        await startSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isProfileComplete, currentSessionId, startSession]);

  // Handle logout - end session
  useEffect(() => {
    if (!isAuthenticated && currentSessionId) {
      endSession();
    }
  }, [isAuthenticated, currentSessionId, endSession]);

  // Track screen views on navigation
  useEffect(() => {
    if (!isAuthenticated || !isProfileComplete || !user?.id) return;

    const path = location.pathname;

    // Skip auth routes
    if (SKIP_ROUTES.includes(path)) return;

    // Get screen name (handle dynamic routes like /chat/:id)
    let screenName = SCREEN_NAMES[path];
    if (!screenName) {
      if (path.startsWith('/chat/')) {
        screenName = 'Chat Conversation';
      } else if (path.startsWith('/view-file/')) {
        screenName = 'File Viewer';
      } else {
        screenName = path; // Fallback to raw path
      }
    }

    // Don't log duplicate consecutive screens
    if (lastScreenRef.current === screenName) return;
    lastScreenRef.current = screenName;

    logScreenView(user.id, screenName, currentSessionId);
  }, [location.pathname, isAuthenticated, isProfileComplete, user?.id, currentSessionId]);

  // Exposed logging functions (wrapped to include user ID automatically)
  const trackAssetEvent = useCallback((assetId, assetName, category, categoryType, eventType) => {
    if (!user?.id) return;
    logAssetEvent(user.id, assetId, assetName, category, categoryType, eventType);
  }, [user?.id]);

  const trackAIQuery = useCallback((queryText, productName) => {
    if (!user?.id) return;
    logAIQuery(user.id, queryText, productName);
  }, [user?.id]);

  const trackProfileView = useCallback((viewedUserId) => {
    if (!user?.id) return;
    logProfileView(user.id, viewedUserId);
  }, [user?.id]);

  const trackDirectorySearch = useCallback((searchQuery, resultsCount) => {
    if (!user?.id) return;
    logDirectorySearch(user.id, searchQuery, resultsCount);
  }, [user?.id]);

  const trackNotificationClick = useCallback((notificationId, notificationType) => {
    if (!user?.id) return;
    logNotificationClick(user.id, notificationId, notificationType);
  }, [user?.id]);

  const value = {
    currentSessionId,
    trackAssetEvent,
    trackAIQuery,
    trackProfileView,
    trackDirectorySearch,
    trackNotificationClick,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};
