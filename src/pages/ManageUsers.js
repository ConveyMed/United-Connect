import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAppSettings } from '../context/AppSettingsContext';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

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

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ManageUsers = () => {
  const navigate = useNavigate();
  const { getCommentDeletePermission, updateSetting } = useAppSettings();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('member');

  // Settings
  const commentDeletePermission = getCommentDeletePermission();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const title = (user.title || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || title.includes(query);
      }));
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out owner info - don't expose is_owner
      const sanitizedUsers = (data || []).map(user => ({
        ...user,
        is_owner: undefined, // Remove owner flag from client
      }));

      setUsers(sanitizedUsers);
      setFilteredUsers(sanitizedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = (user) => {
    setSelectedUser(user);
    setEditFirstName(user.first_name || '');
    setEditLastName(user.last_name || '');
    setEditTitle(user.title || '');
    setEditPhone(user.phone || '');
    setEditRole(user.is_admin || user.role === 'admin' ? 'admin' : 'member');
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setShowDeleteConfirm(false);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const updateData = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        title: editTitle.trim() || null,
        phone: editPhone.trim() || null,
        is_admin: editRole === 'admin',
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, ...updateData } : u
      ));

      setSelectedUser(prev => ({ ...prev, ...updateData }));
      closeUserDetail();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      closeUserDetail();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (user) => {
    if (user.role === 'admin' || user.is_admin) {
      return { label: 'Admin', color: '#7c3aed', bg: '#f3e8ff' };
    }
    return { label: 'Member', color: 'var(--text-muted)', bg: 'var(--bg-light)' };
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Manage Users</h1>
          <button
            style={{
              ...styles.backButton,
              color: showSettings ? 'var(--primary-blue)' : 'var(--text-muted)',
            }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon />
          </button>
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Settings Panel */}
          {showSettings && (
            <div style={styles.settingsPanel}>
              <h3 style={styles.settingsPanelTitle}>App Settings</h3>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>
                    <TrashIcon />
                    <span>Remove Comments from Posts</span>
                  </div>
                  <p style={styles.settingDescription}>
                    Control who can delete comments on posts
                  </p>
                </div>
                <div style={styles.settingOptions}>
                  <button
                    style={{
                      ...styles.settingOption,
                      ...(commentDeletePermission === 'all_users' ? styles.settingOptionActive : {}),
                    }}
                    onClick={() => updateSetting('comment_delete_permission', 'all_users')}
                  >
                    <span>All Users</span>
                    {commentDeletePermission === 'all_users' && <CheckIcon />}
                  </button>
                  <button
                    style={{
                      ...styles.settingOption,
                      ...(commentDeletePermission === 'admins_only' ? styles.settingOptionActive : {}),
                    }}
                    onClick={() => updateSetting('comment_delete_permission', 'admins_only')}
                  >
                    <span>Admins Only</span>
                    {commentDeletePermission === 'admins_only' && <CheckIcon />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchIcon}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{users.length}</span>
              <span style={styles.statLabel}>Total Users</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statNumber}>
                {users.filter(u => u.is_admin || u.role === 'admin').length}
              </span>
              <span style={styles.statLabel}>Admins</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statNumber}>
                {users.filter(u => !u.is_admin && u.role !== 'admin').length}
              </span>
              <span style={styles.statLabel}>Members</span>
            </div>
          </div>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <UserIcon />
              <p style={styles.emptyText}>
                {searchQuery ? 'No users match your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.map(user => {
                const role = getRoleBadge(user);
                return (
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
                      <div style={styles.userNameRow}>
                        <span style={styles.userName}>
                          {user.first_name} {user.last_name}
                        </span>
                        <span style={{
                          ...styles.roleBadge,
                          color: role.color,
                          backgroundColor: role.bg,
                        }}>
                          {role.label}
                        </span>
                      </div>
                      <span style={styles.userTitle}>{user.title || 'No title'}</span>
                      <span style={styles.userEmail}>{user.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ height: '40px' }} />
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={styles.modalOverlay} onClick={closeUserDetail}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{showDeleteConfirm ? 'Delete User' : 'Edit User'}</h2>
              <button style={styles.closeButton} onClick={closeUserDetail}>
                <CloseIcon />
              </button>
            </div>

            {showDeleteConfirm ? (
              <>
                {/* Delete Confirmation View */}
                <div style={styles.deleteConfirmSection}>
                  <div style={styles.deleteIconWrapper}>
                    <span style={styles.deleteIconLarge}><TrashIcon /></span>
                  </div>
                  <h3 style={styles.deleteConfirmTitle}>
                    Delete {selectedUser.first_name} {selectedUser.last_name}?
                  </h3>
                  <p style={styles.deleteConfirmText}>
                    This will permanently remove this user and all their data. This action cannot be undone.
                  </p>
                </div>
                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    style={styles.deleteConfirmButton}
                    onClick={handleDeleteUser}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete User'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* User Profile Section */}
                <div style={styles.profileSection}>
                  <div style={styles.profileAvatar}>
                    {selectedUser.profile_image_url ? (
                      <img src={selectedUser.profile_image_url} alt="" style={styles.profileImage} />
                    ) : (
                      <div style={styles.profilePlaceholder}>
                        <UserIcon />
                      </div>
                    )}
                  </div>
                  <p style={styles.profileEmail}>{selectedUser.email}</p>
                </div>

                {/* Edit Form */}
                <div style={styles.detailsSection}>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>First Name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Last Name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Job Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={styles.formInput}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={styles.formInput}
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Role</label>
                    <div style={styles.roleSelector}>
                      {['member', 'admin'].map(role => (
                        <button
                          key={role}
                          style={{
                            ...styles.roleOption,
                            ...(editRole === role ? styles.roleOptionActive : {}),
                          }}
                          onClick={() => setEditRole(role)}
                        >
                          {role === 'admin' && <ShieldIcon />}
                          <span style={{ textTransform: 'capitalize' }}>{role}</span>
                          {editRole === role && <CheckIcon />}
                        </button>
                      ))}
                    </div>
                    <p style={styles.roleHint}>
                      {editRole === 'admin' && 'Full access to manage users, posts, and settings'}
                      {editRole === 'member' && 'Can view content and interact with posts'}
                    </p>
                  </div>

                  <div style={styles.joinedInfo}>
                    Joined {getTimeAgo(selectedUser.created_at)}
                  </div>

                  {/* Delete User Button */}
                  <button
                    style={styles.deleteUserButton}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <TrashIcon />
                    <span>Delete User</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelButton}
                    onClick={closeUserDetail}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    style={styles.saveButton}
                    onClick={handleSaveUser}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
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
    width: '40px',
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
  statsBar: {
    backgroundColor: '#ffffff',
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    borderRadius: '14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--primary-blue)',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  statDivider: {
    width: '1px',
    backgroundColor: 'var(--border-light)',
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
    border: '2px solid #e2e8f0',
  },
  avatarPlaceholder: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: '2px solid #e2e8f0',
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
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
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
    paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '420px',
    maxHeight: 'calc(100vh - 140px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: '1px solid #f1f5f9',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px',
    backgroundColor: '#fafbfc',
    borderBottom: '1px solid #f1f5f9',
  },
  profileAvatar: {
    marginBottom: '12px',
  },
  profileImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  profilePlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: '3px solid #ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  profileEmail: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '8px 0 0 0',
  },
  detailsSection: {
    padding: '20px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  detailIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '12px',
    color: 'var(--text-light)',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '15px',
    color: 'var(--text-dark)',
  },
  joinedInfo: {
    marginTop: '16px',
    fontSize: '13px',
    color: 'var(--text-light)',
    textAlign: 'center',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  formGroup: {
    marginBottom: '16px',
    flex: 1,
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    color: 'var(--text-dark)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  roleSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roleOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
  },
  roleOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: 'var(--primary-blue)',
    color: 'var(--primary-blue)',
  },
  roleHint: {
    fontSize: '12px',
    color: 'var(--text-light)',
    marginTop: '8px',
    lineHeight: '1.4',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #f1f5f9',
  },
  editButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // Settings panel styles
  settingsPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  settingsPanelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 16px 0',
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  settingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-dark)',
  },
  settingDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    paddingLeft: '24px',
  },
  settingOptions: {
    display: 'flex',
    gap: '8px',
  },
  settingOption: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 14px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '500',
  },
  settingOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: 'var(--primary-blue)',
    color: 'var(--primary-blue)',
  },
  // Delete user styles
  deleteUserButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  deleteConfirmSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  deleteIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#dc2626',
    marginBottom: '16px',
  },
  deleteIconLarge: {
    display: 'flex',
    transform: 'scale(2)',
  },
  deleteConfirmTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  deleteConfirmText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5',
    maxWidth: '280px',
  },
  deleteConfirmButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default ManageUsers;
