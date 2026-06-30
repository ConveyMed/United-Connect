import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16 4l4 4-1 1-1-1-3 3v3l-1 1-4-4-4 4-1-1 4-4-4-4 1-1 3 0 3-3-1-1z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const ChatIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const MuteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const MoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    chats,
    loading,
    typingUsers,
    totalUnread,
    fetchChats,
    togglePin,
    toggleArchive,
    toggleMute
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
  const [showNewChat, setShowNewChat] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  // Refresh chats when page loads
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Filter chats based on search and tab
  const filteredChats = chats.filter(chat => {
    const matchesSearch = !searchQuery ||
      chat.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'active' ? !chat.is_archived : chat.is_archived;

    return matchesSearch && matchesTab;
  });

  // Separate pinned and regular chats
  const pinnedChats = filteredChats.filter(c => c.is_pinned && !c.is_archived);
  const regularChats = filteredChats.filter(c => !c.is_pinned || c.is_archived);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Today - show time
    if (diff < 86400000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return 'Yesterday';
    }

    // This week - show day name
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    // Older - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTypingText = (chatId) => {
    const typing = typingUsers[chatId];
    if (!typing || Object.keys(typing).length === 0) return null;

    const names = Object.values(typing);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Several people are typing...';
  };

  const handleChatClick = (chat) => {
    navigate(`/chat/${chat.id}`);
  };

  const handleMenuAction = (action, chatId, e) => {
    e.stopPropagation();
    setMenuOpen(null);

    switch (action) {
      case 'pin':
        togglePin(chatId);
        break;
      case 'archive':
        toggleArchive(chatId);
        break;
      case 'mute':
        toggleMute(chatId);
        break;
      default:
        break;
    }
  };

  const renderChatCard = (chat) => {
    const typingText = getTypingText(chat.id);

    return (
      <div
        key={chat.id}
        style={styles.chatCard}
        onClick={() => handleChatClick(chat)}
      >
        {/* Avatar */}
        <div style={styles.avatarContainer}>
          {chat.display_avatar ? (
            <img
              src={chat.display_avatar}
              alt={chat.display_name}
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {chat.is_group ? <UsersIcon /> : <UserIcon />}
            </div>
          )}
          {chat.unread_count > 0 && (
            <div style={styles.unreadBadge}>
              {chat.unread_count > 99 ? '99+' : chat.unread_count}
            </div>
          )}
        </div>

        {/* Chat Info */}
        <div style={styles.chatInfo}>
          <div style={styles.chatHeader}>
            <div style={styles.chatNameRow}>
              {chat.is_pinned && <span style={styles.pinIndicator}><PinIcon /></span>}
              {chat.is_muted && <span style={styles.muteIndicator}><MuteIcon /></span>}
              <span style={{
                ...styles.chatName,
                fontWeight: chat.unread_count > 0 ? '700' : '600'
              }}>
                {chat.display_name || 'Chat'}
              </span>
            </div>
            <span style={styles.chatTime}>{formatTime(chat.last_message_at)}</span>
          </div>
          <p style={{
            ...styles.chatPreview,
            fontWeight: chat.unread_count > 0 ? '500' : '400',
            color: typingText ? 'var(--primary-blue)' : (chat.unread_count > 0 ? 'var(--text-dark)' : 'var(--text-muted)')
          }}>
            {typingText || chat.last_message_preview || 'No messages yet'}
          </p>
        </div>

        {/* Menu Button */}
        <button
          style={styles.menuButton}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(menuOpen === chat.id ? null : chat.id);
          }}
        >
          <MoreIcon />
        </button>

        {/* Dropdown Menu */}
        {menuOpen === chat.id && (
          <div style={styles.dropdown}>
            <button
              style={styles.dropdownItem}
              onClick={(e) => handleMenuAction('pin', chat.id, e)}
            >
              {chat.is_pinned ? 'Unpin' : 'Pin to top'}
            </button>
            <button
              style={styles.dropdownItem}
              onClick={(e) => handleMenuAction('mute', chat.id, e)}
            >
              {chat.is_muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              style={styles.dropdownItem}
              onClick={(e) => handleMenuAction('archive', chat.id, e)}
            >
              {chat.is_archived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [menuOpen]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Messages</h1>
          {totalUnread > 0 && (
            <span style={styles.headerBadge}>{totalUnread}</span>
          )}
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Search Bar */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchIcon}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'active' ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab('active')}
            >
              Chats
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'archived' ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab('archived')}
            >
              <ArchiveIcon style={{ width: 16, height: 16 }} />
              Archived
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading conversations...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <ChatIcon />
              </div>
              <h3 style={styles.emptyTitle}>
                {activeTab === 'archived' ? 'No archived chats' : 'No conversations yet'}
              </h3>
              <p style={styles.emptyText}>
                {activeTab === 'archived'
                  ? 'Archived conversations will appear here'
                  : 'Start a new conversation to connect with others'}
              </p>
              {activeTab === 'active' && (
                <button
                  style={styles.emptyButton}
                  onClick={() => setShowNewChat(true)}
                >
                  Start Chatting
                </button>
              )}
            </div>
          ) : (
            <div style={styles.chatList}>
              {/* Pinned Section */}
              {pinnedChats.length > 0 && activeTab === 'active' && (
                <>
                  <div style={styles.sectionLabel}>Pinned</div>
                  {pinnedChats.map(renderChatCard)}
                </>
              )}

              {/* Regular Chats */}
              {regularChats.length > 0 && (
                <>
                  {pinnedChats.length > 0 && activeTab === 'active' && (
                    <div style={styles.sectionLabel}>All Messages</div>
                  )}
                  {regularChats.map(renderChatCard)}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB - New Chat */}
      {activeTab === 'active' && (
        <button
          style={styles.fab}
          onClick={() => setShowNewChat(true)}
        >
          <PlusIcon />
        </button>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
};

// New Chat Modal Component
const NewChatModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { createChat } = useChat();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_image_url')
        .neq('id', user?.id)
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const chat = await createChat(
        selectedUsers,
        isGroup || selectedUsers.length > 1,
        isGroup ? groupName : null
      );

      if (chat) {
        onClose();
        navigate(`/chat/${chat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Conversation</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Group Toggle */}
        <div style={styles.groupToggle}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.toggleText}>Create group chat</span>
          </label>
        </div>

        {/* Group Name Input */}
        {isGroup && (
          <input
            type="text"
            placeholder="Group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={styles.groupNameInput}
          />
        )}

        {/* Search */}
        <div style={styles.modalSearchWrapper}>
          <div style={styles.searchIcon}>
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Selected Users Pills */}
        {selectedUsers.length > 0 && (
          <div style={styles.selectedPills}>
            {selectedUsers.map(userId => {
              const u = users.find(usr => usr.id === userId);
              return (
                <span key={userId} style={styles.pill}>
                  {u?.first_name} {u?.last_name}
                  <button
                    style={styles.pillRemove}
                    onClick={() => toggleUser(userId)}
                  >
                    x
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* User List */}
        <div style={styles.userList}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p style={styles.noResults}>No users found</p>
          ) : (
            filteredUsers.map(u => (
              <button
                key={u.id}
                style={{
                  ...styles.userItem,
                  backgroundColor: selectedUsers.includes(u.id) ? '#eff6ff' : 'transparent'
                }}
                onClick={() => toggleUser(u.id)}
              >
                {u.profile_image_url ? (
                  <img src={u.profile_image_url} alt="" style={styles.userAvatar} />
                ) : (
                  <div style={styles.userAvatarPlaceholder}>
                    <UserIcon />
                  </div>
                )}
                <div style={styles.userInfo}>
                  <span style={styles.userName}>
                    {u.first_name} {u.last_name}
                  </span>
                  <span style={styles.userEmail}>{u.email}</span>
                </div>
                {selectedUsers.includes(u.id) && (
                  <div style={styles.checkmark}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Create Button */}
        <button
          style={{
            ...styles.createButton,
            opacity: selectedUsers.length === 0 || creating ? 0.5 : 1
          }}
          onClick={handleCreate}
          disabled={selectedUsers.length === 0 || creating}
        >
          {creating ? 'Creating...' : `Start Chat${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--background-off-white)',
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
    gap: '10px',
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
  headerBadge: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
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
    paddingBottom: '100px',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    padding: '16px',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-light)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: '15px',
    color: 'var(--text-dark)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    color: '#cbd5e1',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 24px 0',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  chatList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 4px',
    marginTop: '8px',
  },
  chatCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  unreadBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    border: '2px solid #ffffff',
  },
  chatInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  chatNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pinIndicator: {
    color: 'var(--primary-blue)',
    display: 'flex',
  },
  muteIndicator: {
    color: 'var(--text-light)',
    display: 'flex',
  },
  chatName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatTime: {
    fontSize: '12px',
    color: 'var(--text-light)',
    flexShrink: 0,
  },
  chatPreview: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menuButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '50px',
    right: '10px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 100,
    minWidth: '140px',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: 'var(--text-dark)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  fab: {
    position: 'fixed',
    bottom: 'calc(var(--safe-area-bottom, 0px) + 100px)',
    right: '20px',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(var(--primary-blue-rgb), 0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
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
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    paddingBottom: '80px', // Account for bottom nav
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: 'calc(85vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    margin: '0 16px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  groupToggle: {
    padding: '16px 20px 0',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--primary-blue)',
  },
  toggleText: {
    fontSize: '14px',
    color: 'var(--text-dark)',
  },
  groupNameInput: {
    margin: '12px 20px 0',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    outline: 'none',
  },
  modalSearchWrapper: {
    position: 'relative',
    padding: '16px 20px',
  },
  selectedPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '0 20px 12px',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: '#eff6ff',
    borderRadius: '16px',
    fontSize: '13px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
  },
  pillRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-blue)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 2px',
  },
  userList: {
    flex: 1,
    overflow: 'auto',
    padding: '0 12px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s ease',
  },
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userAvatarPlaceholder: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-dark)',
  },
  userEmail: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  checkmark: {
    flexShrink: 0,
  },
  noResults: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '20px',
    fontSize: '14px',
  },
  createButton: {
    margin: '16px 20px 20px',
    padding: '14px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default Chat;
