import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAnalytics } from '../context/AnalyticsContext';

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const Directory = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const { trackProfileView, trackDirectorySearch } = useAnalytics();
  const searchDebounceRef = useRef(null);

  // Get directory permission setting
  const directoryMode = localStorage.getItem('directoryPermission') || 'all';

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const results = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const title = (user.title || '').toLowerCase();
        return fullName.includes(query) || title.includes(query);
      });
      setFilteredUsers(results);

      // Debounced search tracking
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        trackDirectorySearch(searchQuery, results.length);
      }, 1000);
    }
  }, [searchQuery, users, trackDirectorySearch]);

  const loadUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, title, phone, email, profile_image_url, bio, is_admin, member_type')
        // United Connect: Corporate Directory only — only the United Team appears.
        // Visible to everyone, but Independent Agents/Reps are never listed.
        .eq('member_type', 'United Team')
        .order('first_name', { ascending: true });

      // If directory is admins only, filter further
      if (directoryMode === 'admins') {
        query = query.eq('is_admin', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = (user) => {
    setSelectedUser(user);
    trackProfileView(user.id);
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Directory</h1>
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
              placeholder="Search by name or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* User Count */}
          <div style={styles.countText}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'}
          </div>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <UserIcon />
              <p style={styles.emptyText}>
                {searchQuery ? 'No results found' : 'No users in directory'}
              </p>
            </div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  style={styles.userCard}
                  onClick={() => openUserDetail(user)}
                >
                  <div style={styles.userAvatar}>
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt="" style={styles.avatarImage} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        <UserIcon />
                      </div>
                    )}
                  </div>
                  <div style={styles.userInfo}>
                    <span style={styles.userName}>
                      {user.first_name} {user.last_name}
                    </span>
                    <span style={styles.userTitle}>{user.title || 'Team Member'}</span>
                    {user.email && <span style={styles.userEmail}>{user.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ height: '40px' }} />
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={styles.modalOverlay} onClick={closeUserDetail}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Close Button */}
            <button style={styles.closeButton} onClick={closeUserDetail}>
              <CloseIcon />
            </button>

            {/* Profile Section */}
            <div style={styles.profileSection}>
              <div style={styles.profileAvatar}>
                {selectedUser.profile_image_url ? (
                  <img src={selectedUser.profile_image_url} alt="" style={styles.profileImage} />
                ) : (
                  <div style={styles.profilePlaceholder}>
                    <span style={styles.profileInitials}>
                      {(selectedUser.first_name?.[0] || '')}{(selectedUser.last_name?.[0] || '')}
                    </span>
                  </div>
                )}
              </div>
              <h2 style={styles.profileName}>
                {selectedUser.first_name} {selectedUser.last_name}
              </h2>
              {selectedUser.title && (
                <span style={styles.profileTitle}>{selectedUser.title}</span>
              )}
            </div>

            {/* Contact Info */}
            <div style={styles.contactSection}>
              {selectedUser.email && (
                <a href={`mailto:${selectedUser.email}`} style={styles.contactRow}>
                  <div style={styles.contactIcon}>
                    <MailIcon />
                  </div>
                  <span style={styles.contactText}>{selectedUser.email}</span>
                </a>
              )}

              {selectedUser.phone && (
                <a href={`tel:${selectedUser.phone}`} style={styles.contactRow}>
                  <div style={styles.contactIcon}>
                    <PhoneIcon />
                  </div>
                  <span style={styles.contactText}>{selectedUser.phone}</span>
                </a>
              )}

              {selectedUser.title && (
                <div style={styles.contactRow}>
                  <div style={styles.contactIcon}>
                    <BriefcaseIcon />
                  </div>
                  <span style={styles.contactText}>{selectedUser.title}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {selectedUser.bio && (
              <div style={styles.bioSection}>
                <h3 style={styles.bioLabel}>About</h3>
                <p style={styles.bioText}>{selectedUser.bio}</p>
              </div>
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
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'var(--background-off-white)',
    fontSize: '15px',
    color: 'var(--text-dark)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  countText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500',
    marginBottom: '16px',
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
    color: 'var(--text-light)',
  },
  emptyText: {
    marginTop: '12px',
    color: 'var(--text-muted)',
    fontSize: '15px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  userAvatar: {
    flexShrink: 0,
  },
  avatarImage: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    objectFit: 'cover',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
  },
  avatarPlaceholder: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  userTitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    fontSize: '12px',
    color: 'var(--text-light)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    borderRadius: '24px',
    width: '100%',
    maxWidth: '360px',
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    zIndex: 10,
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px 24px',
    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
  },
  profileAvatar: {
    marginBottom: '16px',
  },
  profileImage: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  profilePlaceholder: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '4px solid #ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  profileName: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-dark)',
    margin: '0 0 4px 0',
    textAlign: 'center',
  },
  profileTitle: {
    fontSize: '14px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
  },
  contactSection: {
    padding: '0 24px',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9',
    textDecoration: 'none',
    color: 'inherit',
  },
  contactIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  contactText: {
    fontSize: '14px',
    color: 'var(--text-dark)',
  },
  bioSection: {
    padding: '20px 24px 24px',
  },
  bioLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  bioText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default Directory;
