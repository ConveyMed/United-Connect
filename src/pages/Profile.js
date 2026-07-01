import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DirectoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const TrainingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const BugIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88L16 2" />
    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
    <path d="M12 20v-9" />
    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
    <path d="M6 13H2" />
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
    <path d="M22 13h-4" />
    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const Profile = () => {
  const { signOut, resetIntake, userProfile, user } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const navigate = useNavigate();

  // Check if user is owner
  const isOwner = userProfile?.is_owner === true || userProfile?.role === 'owner';

  // Check if user is admin/editor
  const isAdmin = userProfile?.is_admin === true || userProfile?.role === 'admin' || userProfile?.role === 'editor';

  // Visibility settings from global app_settings (defaults to true)
  const showChat = settings.show_chat !== false && settings.show_chat !== 'false';
  const showDirectory = settings.show_directory !== false && settings.show_directory !== 'false';
  const showAIShortcut = settings.show_ai_shortcut !== false && settings.show_ai_shortcut !== 'false';
  const [appVersion, setAppVersion] = useState('');

  // Get app version from native (Capacitor) or fallback
  useEffect(() => {
    const getVersion = async () => {
      try {
        const info = await App.getInfo();
        setAppVersion(`v${info.version} (${info.build})`);
      } catch {
        // Web fallback
        setAppVersion('Web');
      }
    };
    getVersion();
  }, []);


  const toggleChat = () => updateSetting('show_chat', !showChat);
  const toggleDirectory = () => updateSetting('show_directory', !showDirectory);
  const toggleAIShortcut = () => updateSetting('show_ai_shortcut', !showAIShortcut);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut();
    }
  };

  const handleResetIntake = async () => {
    if (window.confirm('This will let you redo the profile setup. Continue?')) {
      await resetIntake();
      navigate('/profile-complete');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header - full width */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Profile</h1>
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Profile Card */}
          <div style={styles.profileCard}>
            <div style={styles.avatarContainer}>
              {userProfile?.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt="Profile"
                  style={styles.avatar}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  <UserIcon />
                </div>
              )}
            </div>
            <div style={styles.profileInfo}>
              <h2 style={styles.profileName}>
                {userProfile?.first_name} {userProfile?.last_name}
              </h2>
              {userProfile?.title && (
                <p style={styles.profileTitle}>{userProfile.title}</p>
              )}
              <p style={styles.profileEmail}>{user?.email}</p>
            </div>
          </div>

          {/* Profile Settings */}
          <div style={styles.sectionLabel}>Profile</div>
          <div style={styles.menuSection}>
            <button style={styles.menuItem} onClick={() => navigate('/edit-profile')}>
              <span style={styles.menuText}>Edit Profile</span>
              <ChevronRightIcon />
            </button>
            <button style={styles.menuItem} onClick={() => navigate('/notifications')}>
              <div style={styles.menuItemWithIcon}>
                <BellIcon />
                <span style={styles.menuText}>Notification Settings</span>
              </div>
              <ChevronRightIcon />
            </button>
            <button style={{...styles.menuItem, borderBottom: 'none'}} onClick={handleResetIntake}>
              <div style={styles.menuItemWithIcon}>
                <RefreshIcon />
                <span style={styles.menuText}>Reset Profile Intake</span>
              </div>
              <ChevronRightIcon />
            </button>
          </div>

          {/* Admin Controls - Only visible to admins */}
          {isAdmin && (
            <>
              <div style={styles.sectionLabel}>Admin Controls</div>
              <div style={styles.menuSection}>
                <button style={styles.menuItem} onClick={() => navigate('/manage-users')}>
                  <div style={styles.menuItemWithIcon}>
                    <UsersIcon />
                    <span style={styles.menuText}>Manage Users</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <button style={styles.menuItem} onClick={() => navigate('/manage-library')}>
                  <div style={styles.menuItemWithIcon}>
                    <LibraryIcon />
                    <span style={styles.menuText}>Manage Sales Tools</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <button style={styles.menuItem} onClick={() => navigate('/manage-training')}>
                  <div style={styles.menuItemWithIcon}>
                    <TrainingIcon />
                    <span style={styles.menuText}>Manage Training</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <button style={styles.menuItem} onClick={() => navigate('/manage-forms')}>
                  <div style={styles.menuItemWithIcon}>
                    <DocumentIcon />
                    <span style={styles.menuText}>Manage Forms</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <button style={styles.menuItem} onClick={() => navigate('/directory-permissions')}>
                  <div style={styles.menuItemWithIcon}>
                    <ShieldIcon />
                    <span style={styles.menuText}>Directory Permissions</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                {showChat && (
                  <button style={styles.menuItem} onClick={() => navigate('/manage-chat')}>
                    <div style={styles.menuItemWithIcon}>
                      <ChatIcon />
                      <span style={styles.menuText}>Manage Chat</span>
                    </div>
                    <ChevronRightIcon />
                  </button>
                )}
                <button style={styles.menuItem} onClick={() => navigate('/manage-analytics')}>
                  <div style={styles.menuItemWithIcon}>
                    <AnalyticsIcon />
                    <span style={styles.menuText}>Analytics Dashboard</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <button style={{...styles.menuItem, borderBottom: 'none'}} onClick={() => navigate('/manage-org-code')}>
                  <div style={styles.menuItemWithIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    <span style={styles.menuText}>Organization Code</span>
                  </div>
                  <ChevronRightIcon />
                </button>
              </div>
            </>
          )}

          {/* Owner Controls - Only visible to owners */}
          {isOwner && (
            <>
              <div style={styles.sectionLabel}>Owner Controls</div>
              <div style={styles.menuSection}>
                <button style={styles.menuItem} onClick={() => navigate('/manage-ai')}>
                  <div style={styles.menuItemWithIcon}>
                    <AIIcon />
                    <span style={styles.menuText}>Gemini AI</span>
                  </div>
                  <ChevronRightIcon />
                </button>
                <div style={styles.toggleItem}>
                  <div style={styles.menuItemWithIcon}>
                    <AIIcon />
                    <span style={styles.menuText}>Gemini AI Shortcut</span>
                  </div>
                  <button
                    style={{
                      ...styles.toggle,
                      backgroundColor: showAIShortcut ? 'var(--primary-blue)' : 'var(--border-light)',
                    }}
                    onClick={toggleAIShortcut}
                  >
                    <div style={{
                      ...styles.toggleKnob,
                      transform: showAIShortcut ? 'translateX(20px)' : 'translateX(0)',
                    }} />
                  </button>
                </div>
                <div style={styles.toggleItem}>
                  <div style={styles.menuItemWithIcon}>
                    <ChatIcon />
                    <span style={styles.menuText}>Show Chat</span>
                  </div>
                  <button
                    style={{
                      ...styles.toggle,
                      backgroundColor: showChat ? 'var(--primary-blue)' : 'var(--border-light)',
                    }}
                    onClick={toggleChat}
                  >
                    <div style={{
                      ...styles.toggleKnob,
                      transform: showChat ? 'translateX(20px)' : 'translateX(0)',
                    }} />
                  </button>
                </div>
                <div style={{...styles.toggleItem, borderBottom: 'none'}}>
                  <div style={styles.menuItemWithIcon}>
                    <DirectoryIcon />
                    <span style={styles.menuText}>Show Directory</span>
                  </div>
                  <button
                    style={{
                      ...styles.toggle,
                      backgroundColor: showDirectory ? 'var(--primary-blue)' : 'var(--border-light)',
                    }}
                    onClick={toggleDirectory}
                  >
                    <div style={{
                      ...styles.toggleKnob,
                      transform: showDirectory ? 'translateX(20px)' : 'translateX(0)',
                    }} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Legal & Support */}
          <div style={styles.sectionLabel}>Legal & Support</div>
          <div style={styles.menuSection}>
            <button style={styles.menuItem} onClick={() => navigate('/terms')}>
              <div style={styles.menuItemWithIcon}>
                <DocumentIcon />
                <span style={styles.menuText}>Terms & Conditions</span>
              </div>
              <ChevronRightIcon />
            </button>
            <button style={styles.menuItem} onClick={() => navigate('/privacy')}>
              <div style={styles.menuItemWithIcon}>
                <DocumentIcon />
                <span style={styles.menuText}>Privacy Policy</span>
              </div>
              <ChevronRightIcon />
            </button>
            <button style={styles.menuItem} onClick={() => window.open('https://forms.monday.com/forms/8ca3d8d4267c571e4b687f37ad901b20?r=use1', '_blank')}>
              <div style={styles.menuItemWithIcon}>
                <BugIcon />
                <span style={styles.menuText}>Report a Bug</span>
              </div>
              <ExternalLinkIcon />
            </button>
            <button style={{...styles.menuItem, borderBottom: 'none'}} onClick={() => navigate('/delete-account')}>
              <div style={styles.menuItemWithIcon}>
                <TrashIcon />
                <span style={{...styles.menuText, color: '#dc2626'}}>Delete Account</span>
              </div>
              <ChevronRightIcon />
            </button>
          </div>

          {/* Logout Button */}
          <button style={styles.logoutButton} onClick={handleLogout}>
            <LogoutIcon />
            <span>Log Out</span>
          </button>

          {/* Version */}
          {appVersion && (
            <p style={styles.versionText}>{appVersion}</p>
          )}

          {/* User ID (for debugging) */}
          {user?.id && (
            <p
              style={styles.userIdText}
              onClick={() => {
                navigator.clipboard.writeText(user.id);
                alert('User ID copied!');
              }}
            >
              ID: {user.id}
            </p>
          )}

          {/* Bottom padding for nav */}
          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
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
    justifyContent: 'center',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
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
    padding: '16px',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginBottom: '24px',
  },
  avatarContainer: {
    flexShrink: 0,
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #e2e8f0',
  },
  avatarPlaceholder: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: '3px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 2px 0',
  },
  profileTitle: {
    fontSize: '14px',
    color: 'var(--primary-blue)',
    margin: '0 0 4px 0',
    fontWeight: '500',
  },
  profileEmail: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginLeft: '4px',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginBottom: '24px',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'background-color 0.2s ease',
  },
  menuText: {
    fontSize: '15px',
    color: 'var(--text-dark)',
  },
  menuItemWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-muted)',
  },
  toggleItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
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
  logoutButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#dc2626',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  versionText: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-light)',
    margin: '16px 0 0 0',
  },
  userIdText: {
    textAlign: 'center',
    fontSize: '10px',
    color: '#cbd5e1',
    margin: '8px 0 0 0',
    cursor: 'pointer',
    wordBreak: 'break-all',
  },
};

export default Profile;
