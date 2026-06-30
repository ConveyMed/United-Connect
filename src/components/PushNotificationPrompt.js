import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import {
  checkAndRequestPermission,
  isPushEnabled,
  registerDeviceForUser
} from '../services/onesignal';

/**
 * PushNotificationPrompt
 *
 * Shows a dismissible banner for users who haven't enabled push notifications.
 * Handles: Never prompted, previously denied, stale subscription
 */
const PushNotificationPrompt = () => {
  const { user, isProfileComplete } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [permissionState, setPermissionState] = useState(null); // 'unknown', 'denied', 'not_prompted', 'enabled'
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !isProfileComplete || dismissed) {
      return;
    }

    const checkStatus = async () => {
      try {
        const OneSignal = window.plugins?.OneSignal || window.OneSignal;
        if (!OneSignal) {
          console.log('[PushPrompt] OneSignal not available');
          return;
        }

        // Check if push is enabled
        const enabled = await isPushEnabled();

        if (enabled) {
          // Already enabled - make sure device is registered
          await registerDeviceForUser(user.id);
          setPermissionState('enabled');
          setShowBanner(false);
          return;
        }

        // Not enabled - check why
        // Try to get permission status
        let permStatus = 'not_prompted';

        if (OneSignal.Notifications?.getPermissionAsync) {
          await new Promise((resolve) => {
            OneSignal.Notifications.getPermissionAsync((granted) => {
              // If not granted, could be denied or not prompted
              // Unfortunately SDK doesn't distinguish - assume not prompted for now
              permStatus = granted ? 'enabled' : 'not_prompted';
              resolve();
            });
          });
        }

        setPermissionState(permStatus);
        setShowBanner(true);

      } catch (err) {
        console.error('[PushPrompt] Error checking status:', err);
      }
    };

    // Delay check to let app stabilize
    const timer = setTimeout(checkStatus, 3000);
    return () => clearTimeout(timer);
  }, [user, isProfileComplete, dismissed]);

  const handleEnableNotifications = async () => {
    try {
      const granted = await checkAndRequestPermission(user.id);

      if (granted) {
        setPermissionState('enabled');
        setShowBanner(false);
      } else {
        // They denied - show instructions to enable in settings
        setPermissionState('denied');
      }
    } catch (err) {
      console.error('[PushPrompt] Error requesting permission:', err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    // Store dismissal so we don't show again this session
    sessionStorage.setItem('pushPromptDismissed', 'true');
  };

  const handleOpenSettings = () => {
    // On iOS, this opens app settings where they can enable notifications
    if (window.cordova?.plugins?.settings) {
      window.cordova.plugins.settings.open('application_details');
    } else {
      // Fallback: show instructions
      alert('To enable notifications:\n\n1. Open Settings\n2. Find this app\n3. Tap Notifications\n4. Enable Allow Notifications');
    }
  };

  if (!showBanner) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <div style={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div style={styles.text}>
          {permissionState === 'denied' ? (
            <>
              <strong>Notifications are disabled</strong>
              <p style={styles.subtext}>Enable in Settings to stay updated</p>
            </>
          ) : (
            <>
              <strong>Stay in the loop</strong>
              <p style={styles.subtext}>Get notified about posts, messages & updates</p>
            </>
          )}
        </div>
      </div>
      <div style={styles.actions}>
        {permissionState === 'denied' ? (
          <button style={styles.button} onClick={handleOpenSettings}>
            Open Settings
          </button>
        ) : (
          <button style={styles.button} onClick={handleEnableNotifications}>
            Enable
          </button>
        )}
        <button style={styles.dismissButton} onClick={handleDismiss}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--primary-blue)',
    color: 'white',
    padding: '12px 16px',
    margin: '8px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
  subtext: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    opacity: 0.9,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    backgroundColor: 'white',
    color: 'var(--primary-blue)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    opacity: 0.7,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default PushNotificationPrompt;
