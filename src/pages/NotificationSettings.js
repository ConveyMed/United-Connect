import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { ENABLE_FIELD_INTEL } from '../config/features';
import {
  requestPushPermission,
  isPushEnabled,
  registerDeviceForUser,
  checkAndRequestPermission
} from '../services/onesignal';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Default preferences
const defaultPreferences = {
  push_new_posts: true,
  push_post_likes: true,
  push_post_comments: true,
  push_comment_replies: true,
  push_bookmarked_comments: true,
  push_direct_messages: true,
  push_group_messages: true,
  push_chat_added: true,
  push_chat_removed: true,
  push_new_events: true,
  push_event_reminders: true,
  call_log_notification_preference: 'off',
};

// Field Intel call-log push modes (only surfaced when ENABLE_FIELD_INTEL is true)
const CALL_LOG_PREFERENCE_OPTIONS = [
  { value: 'off', label: 'Off', hint: 'In-app badges still work, no push notifications' },
  { value: 'daily_summary', label: 'Daily Summary', hint: 'One push at 8 AM your local time with the unread count' },
  { value: 'per_log', label: 'Per Call Log', hint: 'One push per new teammate activity (can be a lot)' },
];

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin || false;
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const [statusModal, setStatusModal] = useState({ show: false, status: null, message: '', devices: [] });
  const isNative = Capacitor.isNativePlatform();

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error);
        }

        if (data) {
          setPreferences({
            push_new_posts: data.push_new_posts ?? true,
            push_post_likes: data.push_post_likes ?? true,
            push_post_comments: data.push_post_comments ?? true,
            push_comment_replies: data.push_comment_replies ?? true,
            push_bookmarked_comments: data.push_bookmarked_comments ?? true,
            push_direct_messages: data.push_direct_messages ?? true,
            push_group_messages: data.push_group_messages ?? true,
            push_chat_added: data.push_chat_added ?? true,
            push_chat_removed: data.push_chat_removed ?? true,
            push_new_events: data.push_new_events ?? true,
            push_event_reminders: data.push_event_reminders ?? true,
            call_log_notification_preference: data.call_log_notification_preference ?? 'off',
          });
        }

        // Check push permission status
        const enabled = await isPushEnabled();
        setPushPermission(enabled);

        // Get device count for this user
        if (user?.id) {
          const { data: devices } = await supabase
            .from('user_devices')
            .select('id')
            .eq('user_id', user.id);
          setDeviceCount(devices?.length || 0);
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Manual status check function
  const handleCheckStatus = async () => {
    // For web, just show devices without checking native permissions
    if (!isNative) {
      setStatusChecking(true);
      setStatusModal({ show: true, status: 'loading', message: 'Loading devices...', devices: [] });

      try {
        const { data: devices } = await supabase
          .from('user_devices')
          .select('onesignal_subscription_id, platform, last_active_at')
          .eq('user_id', user.id)
          .order('last_active_at', { ascending: false });

        setDeviceCount(devices?.length || 0);

        setStatusModal({
          show: true,
          status: devices?.length > 0 ? 'success' : 'info',
          message: devices?.length > 0
            ? `You have ${devices.length} device${devices.length > 1 ? 's' : ''} registered for push notifications.`
            : 'No devices registered. Open the app on your phone to register.',
          devices: devices || []
        });
      } catch (err) {
        setStatusModal({
          show: true,
          status: 'error',
          message: 'Failed to load devices.',
          devices: []
        });
      } finally {
        setStatusChecking(false);
      }
      return;
    }

    setStatusChecking(true);
    setStatusModal({ show: true, status: 'loading', message: 'Checking notification status...', devices: [] });

    try {
      // Check current permission
      const enabled = await isPushEnabled();
      setPushPermission(enabled);

      if (enabled) {
        // Re-register device to ensure subscription ID is current
        await registerDeviceForUser(user.id);

        // Refresh device list
        const { data: devices } = await supabase
          .from('user_devices')
          .select('onesignal_subscription_id, platform, last_active_at')
          .eq('user_id', user.id)
          .order('last_active_at', { ascending: false });

        setDeviceCount(devices?.length || 0);
        setLastChecked(new Date().toLocaleTimeString());

        setStatusModal({
          show: true,
          status: 'success',
          message: 'Push notifications are enabled!',
          devices: devices || []
        });
      } else {
        // Not enabled - offer to enable
        setStatusModal({ show: true, status: 'loading', message: 'Requesting permission...', devices: [] });

        const granted = await checkAndRequestPermission(user.id);
        setPushPermission(granted);

        if (granted) {
          // Refresh device list
          const { data: devices } = await supabase
            .from('user_devices')
            .select('onesignal_subscription_id, platform, last_active_at')
            .eq('user_id', user.id)
            .order('last_active_at', { ascending: false });

          setDeviceCount(devices?.length || 0);
          setLastChecked(new Date().toLocaleTimeString());

          setStatusModal({
            show: true,
            status: 'success',
            message: 'Push notifications enabled successfully!',
            devices: devices || []
          });
        } else {
          setStatusModal({
            show: true,
            status: 'error',
            message: 'Push notifications are disabled. Please enable them in Settings > Notifications.',
            devices: []
          });
        }
      }
    } catch (err) {
      console.error('Error checking status:', err);
      setStatusModal({
        show: true,
        status: 'error',
        message: 'Error checking notification status. Please try again.',
        devices: []
      });
    } finally {
      setStatusChecking(false);
    }
  };

  // Update a single preference
  const updatePreference = async (key, value) => {
    if (!user?.id) return;

    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving preference:', error);
        // Revert on error
        setPreferences(prev => ({ ...prev, [key]: !value }));
      }
    } catch (err) {
      console.error('Error saving preference:', err);
      setPreferences(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  // Handle push permission request
  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushPermission(granted);
  };

  // Toggle component
  const Toggle = ({ value, onChange, disabled }) => (
    <button
      style={{
        ...styles.toggle,
        backgroundColor: value ? 'var(--primary-blue)' : 'var(--border-light)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
    >
      <div style={{
        ...styles.toggleKnob,
        transform: value ? 'translateX(20px)' : 'translateX(0)',
      }} />
    </button>
  );

  // Option row component
  const OptionRow = ({ label, hint, value, onChange, isPush = false, isLast = false }) => (
    <div
      style={{ ...styles.option, borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}
      title={isPush ? "This setting applies to all your devices" : undefined}
    >
      <div style={styles.optionInfo}>
        <span style={styles.optionLabel}>{label}</span>
        <span style={styles.optionHint}>{hint}</span>
      </div>
      <Toggle
        value={value}
        onChange={onChange}
      />
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Notifications</h1>
          <div style={styles.headerSpacer}>
            {saving && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving...</span>}
          </div>
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Push Permission Banner */}
          {!pushPermission && isNative && (
            <div style={styles.permissionBanner}>
              <div style={styles.permissionContent}>
                <BellIcon />
                <div style={styles.permissionText}>
                  <strong>Enable Push Notifications</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    Get instant alerts on your device
                  </p>
                </div>
              </div>
              <button style={styles.enableButton} onClick={handleEnablePush}>
                Enable
              </button>
            </div>
          )}

          {/* Push Status Check Section */}
          {isNative && (
            <div style={styles.statusSection}>
              <div style={styles.statusHeader}>
                <div style={styles.statusInfo}>
                  <strong>Push Notification Status</strong>
                  <p style={styles.statusDetail}>
                    {pushPermission ? (
                      <span style={{ color: '#16a34a' }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>Disabled</span>
                    )}
                    {deviceCount > 0 && ` - ${deviceCount} device${deviceCount > 1 ? 's' : ''} registered`}
                  </p>
                  {lastChecked && (
                    <p style={styles.statusDetail}>Last checked: {lastChecked}</p>
                  )}
                </div>
                <button
                  style={styles.checkButton}
                  onClick={handleCheckStatus}
                  disabled={statusChecking}
                >
                  {statusChecking ? 'Checking...' : 'Check Status'}
                </button>
              </div>
            </div>
          )}

          {/* Web Browser Info Banner + Debug Info */}
          {!isNative && (
            <div style={styles.webInfoBanner}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-muted)' }}>
                Push notifications are delivered to your iOS and Android devices only, not web browsers.
                Changes here apply to all your registered devices.
              </p>

              {/* User ID */}
              {user?.id && (
                <div style={styles.webDebugSection}>
                  <p style={styles.webDebugLabel}>Your User ID:</p>
                  <p
                    style={styles.webDebugValue}
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      alert('User ID copied!');
                    }}
                  >
                    {user.id}
                  </p>
                </div>
              )}

              {/* Registered Devices */}
              {deviceCount > 0 ? (
                <div style={styles.webDebugSection}>
                  <p style={styles.webDebugLabel}>Registered Devices ({deviceCount}):</p>
                  <button
                    style={styles.webCheckButton}
                    onClick={handleCheckStatus}
                    disabled={statusChecking}
                  >
                    {statusChecking ? 'Loading...' : 'View Devices'}
                  </button>
                </div>
              ) : (
                <div style={styles.webDebugSection}>
                  <p style={styles.webDebugLabel}>Registered Devices:</p>
                  <p style={{ ...styles.webDebugValue, color: '#dc2626' }}>
                    No devices registered
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Posts Note */}
          <div style={styles.noteBox}>
            <p style={styles.noteText}>
              <strong>Note:</strong> You can mute or watch specific posts from the post menu to override these defaults.
            </p>
          </div>

          {/* Posts & Feed Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <BellIcon />
              </div>
              <div style={styles.sectionHeaderText}>
                <h2 style={styles.sectionTitle}>Posts & Feed</h2>
                <p style={styles.sectionDescription}>
                  Notifications for new posts and interactions
                </p>
              </div>
            </div>

            <div style={styles.optionsList}>
              <OptionRow
                label="New Posts"
                hint="Get notified when new posts are published"
                value={preferences.push_new_posts}
                onChange={(v) => updatePreference('push_new_posts', v)}
                isPush
              />
              <OptionRow
                label="Comments"
                hint="Get notified when comments are added to posts"
                value={preferences.push_post_comments}
                onChange={(v) => updatePreference('push_post_comments', v)}
                isPush
                isLast={!isAdmin}
              />
              {isAdmin && (
                <OptionRow
                  label="Post Likes"
                  hint="Get notified when users like posts"
                  value={preferences.push_post_likes}
                  onChange={(v) => updatePreference('push_post_likes', v)}
                  isPush
                  isLast
                />
              )}
            </div>
          </div>

          {/* Chat Note */}
          <div style={styles.noteBox}>
            <p style={styles.noteText}>
              <strong>Note:</strong> You can mute specific conversations from the chat menu to override these defaults.
            </p>
          </div>

          {/* Chat Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <ChatIcon />
              </div>
              <div style={styles.sectionHeaderText}>
                <h2 style={styles.sectionTitle}>Chat</h2>
                <p style={styles.sectionDescription}>
                  Message and conversation notifications
                </p>
              </div>
            </div>

            <div style={styles.optionsList}>
              <OptionRow
                label="Direct Messages"
                hint="When you receive a direct message"
                value={preferences.push_direct_messages}
                onChange={(v) => updatePreference('push_direct_messages', v)}
                isPush
              />
              <OptionRow
                label="Group Messages"
                hint="When a message is sent in a group"
                value={preferences.push_group_messages}
                onChange={(v) => updatePreference('push_group_messages', v)}
                isPush
              />
              <OptionRow
                label="Added to Chat"
                hint="When you're added to a group chat"
                value={preferences.push_chat_added}
                onChange={(v) => updatePreference('push_chat_added', v)}
                isPush
              />
              <OptionRow
                label="Removed from Chat"
                hint="When you're removed from a group chat"
                value={preferences.push_chat_removed}
                onChange={(v) => updatePreference('push_chat_removed', v)}
                isPush
                isLast
              />
            </div>
          </div>

          {/* Field Intel Section — only shown when ENABLE_FIELD_INTEL is true */}
          {ENABLE_FIELD_INTEL && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <BellIcon />
                </div>
                <div style={styles.sectionHeaderText}>
                  <h2 style={styles.sectionTitle}>Field Intel</h2>
                  <p style={styles.sectionDescription}>
                    When teammates log calls on accounts you're assigned to
                  </p>
                </div>
              </div>

              <div style={styles.optionsList}>
                {CALL_LOG_PREFERENCE_OPTIONS.map((opt, idx) => {
                  const selected = preferences.call_log_notification_preference === opt.value;
                  const isLast = idx === CALL_LOG_PREFERENCE_OPTIONS.length - 1;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updatePreference('call_log_notification_preference', opt.value)}
                      style={{
                        ...styles.option,
                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                        backgroundColor: selected ? '#eef2ff' : 'transparent',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                      }}
                    >
                      <div style={styles.optionInfo}>
                        <span style={styles.optionLabel}>{opt.label}</span>
                        <span style={styles.optionHint}>{opt.hint}</span>
                      </div>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: selected ? '6px solid #1e40af' : '2px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                      }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Updates & Events Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <CalendarIcon />
              </div>
              <div style={styles.sectionHeaderText}>
                <h2 style={styles.sectionTitle}>Updates & Events</h2>
                <p style={styles.sectionDescription}>
                  Organization announcements and events
                </p>
              </div>
            </div>

            <div style={styles.optionsList}>
              <OptionRow
                label="New Events"
                hint="When new events are created"
                value={preferences.push_new_events}
                onChange={(v) => updatePreference('push_new_events', v)}
                isPush
              />
              <OptionRow
                label="Event Reminders"
                hint="Reminders before events start"
                value={preferences.push_event_reminders}
                onChange={(v) => updatePreference('push_event_reminders', v)}
                isPush
                isLast
              />
            </div>
          </div>

          {/* Bottom padding */}
          <div style={{ height: '40px' }} />
        </div>
      </div>

      {/* Status Check Modal */}
      {statusModal.show && (
        <div style={styles.modalOverlay} onClick={() => statusModal.status !== 'loading' && setStatusModal({ ...statusModal, show: false })}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Status Icon */}
            <div style={styles.modalIcon}>
              {statusModal.status === 'loading' && (
                <div style={styles.spinner} />
              )}
              {statusModal.status === 'success' && (
                <div style={{ ...styles.statusIcon, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {statusModal.status === 'error' && (
                <div style={{ ...styles.statusIcon, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              )}
              {statusModal.status === 'info' && (
                <div style={{ ...styles.statusIcon, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
              )}
            </div>

            {/* Message */}
            <p style={styles.modalMessage}>{statusModal.message}</p>

            {/* User ID */}
            {user?.id && (
              <div style={styles.debugInfo}>
                <p style={styles.debugLabel}>User ID:</p>
                <p
                  style={styles.debugValue}
                  onClick={() => {
                    navigator.clipboard.writeText(user.id);
                    alert('User ID copied!');
                  }}
                >
                  {user.id}
                </p>
              </div>
            )}

            {/* Device List */}
            {statusModal.devices.length > 0 && (
              <div style={styles.deviceList}>
                <p style={styles.deviceListTitle}>Registered Devices:</p>
                {statusModal.devices.map((device, i) => (
                  <div key={i} style={styles.deviceItem}>
                    <span style={styles.devicePlatform}>
                      {device.platform === 'ios' ? 'iPhone/iPad' : device.platform === 'android' ? 'Android' : device.platform}
                    </span>
                    <span
                      style={styles.deviceId}
                      onClick={() => {
                        navigator.clipboard.writeText(device.onesignal_subscription_id);
                        alert('Subscription ID copied!');
                      }}
                    >
                      {device.onesignal_subscription_id}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Close Button */}
            {statusModal.status !== 'loading' && (
              <button
                style={styles.modalButton}
                onClick={() => setStatusModal({ ...statusModal, show: false })}
              >
                {statusModal.status === 'success' ? 'Done' : 'OK'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--background-off-white)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  backButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  headerSpacer: {
    width: '60px',
    textAlign: 'right',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto 16px auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.15)',
    borderRadius: '1px',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    overflow: 'auto',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    padding: '8px 16px 24px',
  },
  permissionBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #bfdbfe',
  },
  webInfoBanner: {
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  webDebugSection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  webDebugLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    margin: '0 0 4px 0',
  },
  webDebugValue: {
    fontSize: '12px',
    color: 'var(--text-dark)',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    margin: 0,
    cursor: 'pointer',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  webCheckButton: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  permissionContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--primary-blue)',
  },
  permissionText: {
    fontSize: '14px',
    color: 'var(--text-dark)',
  },
  enableButton: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  statusDetail: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  checkButton: {
    backgroundColor: 'var(--bg-light)',
    color: 'var(--primary-blue)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#fafbfc',
  },
  sectionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--primary-blue)',
    flexShrink: 0,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 4px 0',
  },
  sectionDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    margin: 0,
  },
  optionsList: {
    padding: '0',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
  },
  optionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  optionLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-dark)',
  },
  optionHint: {
    fontSize: '12px',
    color: 'var(--text-light)',
  },
  toggle: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s ease',
    padding: 0,
    flexShrink: 0,
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: '2px',
    left: '2px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease',
  },
  noteBox: {
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #fef3c7',
  },
  noteText: {
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.5',
    margin: 0,
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '320px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalIcon: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  statusIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  modalMessage: {
    fontSize: '16px',
    color: 'var(--text-dark)',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  deviceList: {
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  deviceListTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  },
  deviceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  devicePlatform: {
    fontSize: '14px',
    color: 'var(--text-dark)',
    fontWeight: '500',
  },
  deviceId: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    textAlign: 'right',
    flex: 1,
    marginLeft: '8px',
    cursor: 'pointer',
  },
  debugInfo: {
    backgroundColor: 'var(--bg-light)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  debugLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    margin: '0 0 4px 0',
  },
  debugValue: {
    fontSize: '11px',
    color: 'var(--text-dark)',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    margin: 0,
    cursor: 'pointer',
  },
  modalButton: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
};

export default NotificationSettings;
