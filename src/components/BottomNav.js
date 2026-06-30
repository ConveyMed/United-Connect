import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import { useChat } from '../context/ChatContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { supabase } from '../config/supabase';
import { ENABLE_FIELD_INTEL } from '../config/features';
import { useFieldIntelNotifications } from '../context/FieldIntelNotificationsContext';

// Icons
const FieldIntelIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SalesToolsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const AIIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
  </svg>
);

const DownloadsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const DirectoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const BottomNav = () => {
  const [expanded, setExpanded] = useState(false);
  const [chatEnabledByAdmin, setChatEnabledByAdmin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { openChat } = useAIChat();
  const { totalUnread: chatUnread } = useChat();
  // Safe when Field Intel is dark: the provider isn't mounted, the hook returns a default.
  const { totalUnread: fieldIntelUnread = 0 } = useFieldIntelNotifications();
  const { settings } = useAppSettings();

  // Check admin chat_mode setting
  useEffect(() => {
    const checkChatSetting = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'chat_mode')
          .single();
        setChatEnabledByAdmin(data?.value !== '"off"' && data?.value !== 'off');
      } catch {
        setChatEnabledByAdmin(true);
      }
    };
    checkChatSetting();
  }, []);

  // Visibility settings from global app_settings (defaults to true)
  const showChat = settings.show_chat !== false && settings.show_chat !== 'false';
  const showDirectory = settings.show_directory !== false && settings.show_directory !== 'false';
  const showAIShortcut = settings.show_ai_shortcut !== false && settings.show_ai_shortcut !== 'false';

  // Master ordered list - items always maintain this relative order.
  // Toggle-controlled items are filtered out when disabled.
  // Profile is always last.
  const allItems = useMemo(() => {
    const items = [];

    // 1. Home (always on)
    items.push({ id: 'home', icon: HomeIcon, label: 'Home', path: '/home' });
    // 2. Sales Tools (always on)
    items.push({ id: 'resources', icon: SalesToolsIcon, label: 'Sales Tools', path: '/resources' });
    // Field Intel (dev flag; dark by default)
    if (ENABLE_FIELD_INTEL) {
      items.push({ id: 'field-intel', icon: FieldIntelIcon, label: 'Field Intel', path: '/field-intel', hasBadge: fieldIntelUnread > 0 });
    }
    // 3. Downloads (always on)
    items.push({ id: 'downloads', icon: DownloadsIcon, label: 'Downloads', path: '/downloads' });
    // 4. AI Agent (toggle)
    if (showAIShortcut) {
      items.push({ id: 'ai', icon: AIIcon, label: 'AI Agent', path: '/ai-agent' });
    }
    // 5. Directory (toggle)
    if (showDirectory) {
      items.push({ id: 'directory', icon: DirectoryIcon, label: 'Directory', path: '/directory' });
    }
    // 6. Chat (toggle)
    if (showChat && chatEnabledByAdmin) {
      items.push({ id: 'chat', icon: ChatIcon, label: 'Chat', path: '/chat', hasBadge: chatUnread > 0 });
    }
    // 7. Profile (always last)
    items.push({ id: 'profile', icon: ProfileIcon, label: 'Profile', path: '/profile' });

    return items;
  }, [showAIShortcut, showDirectory, showChat, chatEnabledByAdmin, chatUnread, fieldIntelUnread]);

  // Split into rows
  // Collapsed: first 4 items + More button
  // Expanded: first 5 in row 1, rest in row 2
  const collapsedItems = allItems.slice(0, 4);
  const needsMore = allItems.length > 5;
  const row1 = allItems.slice(0, 5);
  const row2 = allItems.slice(5);

  const getActiveTab = () => {
    const path = location.pathname;
    if (ENABLE_FIELD_INTEL && path.startsWith('/field-intel')) return 'field-intel';
    const tab = allItems.find(t => t.path === path);
    return tab ? tab.id : 'home';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab) => {
    setExpanded(false);
    if (tab.id === 'ai') {
      openChat();
    } else {
      navigate(tab.path);
    }
  };

  const renderTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;

    return (
      <button
        key={tab.id}
        style={{
          ...styles.navBtn,
          ...(isActive ? styles.navBtnActive : {}),
        }}
        onClick={() => handleTabPress(tab)}
      >
        <div style={{
          ...styles.iconContainer,
          ...(isActive ? styles.iconContainerActive : {}),
          position: 'relative',
        }}>
          <Icon />
          {tab.hasBadge && (
            <div style={styles.badge} />
          )}
        </div>
        <span style={{
          ...styles.navLabel,
          ...(isActive ? styles.navLabelActive : {}),
        }}>{tab.label}</span>
      </button>
    );
  };

  const renderMoreButton = () => {
    // Badge on More if any hidden item has a badge
    const hiddenItems = allItems.slice(4);
    const hasHiddenBadge = hiddenItems.some(item => item.hasBadge);

    return (
      <button
        style={styles.navBtn}
        onClick={() => setExpanded(true)}
      >
        <div style={{ ...styles.iconContainer, position: 'relative' }}>
          <ChevronUpIcon />
          {hasHiddenBadge && <div style={styles.badge} />}
        </div>
        <span style={styles.navLabel}>More</span>
      </button>
    );
  };

  return (
    <nav style={styles.bottomNav}>
      {expanded ? (
        <>
          {/* Close bar */}
          <button
            style={styles.closeBar}
            onClick={() => setExpanded(false)}
          >
            <ChevronDownIcon />
            <span style={styles.closeLabel}>Close</span>
          </button>

          {/* Row 1: first 5 items */}
          <div style={styles.navRow}>
            {row1.map(renderTab)}
          </div>

          {/* Row 2: remaining items, padded to 5 columns */}
          {row2.length > 0 && (
            <div style={styles.navRow}>
              {row2.map(renderTab)}
              {Array.from({ length: 5 - row2.length }).map((_, i) => (
                <div key={`spacer-${i}`} style={styles.navBtn} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Collapsed: first 4 + More (or all if 5 or fewer) */
        <div style={styles.navRow}>
          {needsMore ? (
            <>
              {collapsedItems.map(renderTab)}
              {renderMoreButton()}
            </>
          ) : (
            allItems.map(renderTab)
          )}
        </div>
      )}
    </nav>
  );
};

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    borderRadius: '0',
    padding: '8px 4px',
    paddingBottom: 'calc(var(--safe-area-bottom, 0px) - 12px)',
    zIndex: 1000,
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  closeBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 0',
    backgroundColor: 'var(--background-off-white)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    marginBottom: '4px',
    transition: 'all 0.2s ease',
  },
  closeLabel: {
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.3px',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
  },
  navBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '6px 0',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-light)',
    transition: 'all 0.2s ease',
    flex: '1 1 0',
    minWidth: 0,
  },
  navBtnActive: {
    color: 'var(--primary-blue)',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.1)',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: '500',
    color: 'inherit',
  },
  navLabelActive: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    width: '10px',
    height: '10px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    border: '2px solid #ffffff',
  },
};

export default BottomNav;
