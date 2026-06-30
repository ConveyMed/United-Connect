import React, { useEffect, useRef } from 'react';
import { useActivityNotifications } from '../context/ActivityNotificationsContext';

// Bell Icon
const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// Close Icon
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Message Icon (for comments)
const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// Post Icon
const PostIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

// ============================================
// NOTIFICATION BELL
// ============================================
export const NotificationBell = ({ bellRef }) => {
  const { hasNew, hasUnread, openPanel } = useActivityNotifications();

  // Show "new" badge if there are NEW items (after last_checked_at)
  // Show dot if there are unread items but nothing "new"
  const showNewBadge = hasNew();
  const showDot = !showNewBadge && hasUnread();

  return (
    <button
      ref={bellRef}
      style={styles.bellButton}
      onClick={openPanel}
      aria-label="Notifications"
    >
      <BellIcon />
      {showNewBadge && (
        <span style={styles.newBadge}>new</span>
      )}
      {showDot && (
        <span style={styles.unreadDotBadge} />
      )}
    </button>
  );
};

// ============================================
// NOTIFICATION BANNER
// ============================================
export const NotificationBanner = ({ bellRef }) => {
  const {
    showBanner,
    bannerAnimatingOut,
    dismissBanner,
    getGroupedNotifications,
    openPanel,
  } = useActivityNotifications();

  const bannerRef = useRef(null);

  if (!showBanner) return null;

  const grouped = getGroupedNotifications();
  const hasNewPosts = grouped.newPosts?.length > 0;
  const hasNewComments = Object.keys(grouped.commentsByPost || {}).length > 0;

  // Build message
  const postCount = grouped.newPosts?.length || 0;
  const commentPostCount = Object.keys(grouped.commentsByPost || {}).length;

  let message = 'You have ';
  if (hasNewPosts && hasNewComments) {
    message += `${postCount} new post${postCount > 1 ? 's' : ''} and new comments`;
  } else if (hasNewPosts) {
    message += `${postCount} new post${postCount > 1 ? 's' : ''}`;
  } else if (hasNewComments) {
    message += `new comments on ${commentPostCount} post${commentPostCount > 1 ? 's' : ''}`;
  }

  const handleTap = () => {
    dismissBanner();
    openPanel();
  };

  return (
    <div
      ref={bannerRef}
      style={{
        ...styles.banner,
        ...(bannerAnimatingOut ? styles.bannerAnimatingOut : {}),
      }}
      onClick={handleTap}
    >
      <div style={styles.bannerContent}>
        <BellIcon />
        <span style={styles.bannerText}>{message}</span>
      </div>
      <button
        style={styles.bannerClose}
        onClick={(e) => {
          e.stopPropagation();
          dismissBanner();
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
};

// ============================================
// NOTIFICATION PANEL
// ============================================
export const NotificationPanel = ({ onNavigate }) => {
  const {
    panelOpen,
    closePanel,
    getGroupedNotifications,
    getUnreadNotifications,
    isNotificationRead,
    markAllAsRead,
    navigateToNotification,
  } = useActivityNotifications();

  if (!panelOpen) return null;

  const grouped = getGroupedNotifications();
  const unread = getUnreadNotifications();
  const hasAny = grouped.totalNew > 0 || grouped.totalOlder > 0;

  const handleItemClick = (notification) => {
    navigateToNotification(notification);
    if (onNavigate) {
      onNavigate(notification);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncate = (str, len) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={closePanel} />

      {/* Panel */}
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Activity</h2>
          <div style={styles.panelHeaderRight}>
            {hasAny && (
              <button style={styles.markAllReadBtn} onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
            <button style={styles.closeBtn} onClick={closePanel}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={styles.panelContent}>
          {!hasAny ? (
            <div style={styles.emptyState}>
              <BellIcon />
              <p style={styles.emptyText}>You're all caught up!</p>
            </div>
          ) : (
            <>
              {/* New Posts Section */}
              {grouped.newPosts?.length > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <PostIcon />
                    <span style={styles.sectionTitle}>
                      {grouped.newPosts.length} New Post{grouped.newPosts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {grouped.newPosts.map(notification => (
                    <div
                      key={notification.id}
                      style={{
                        ...styles.notificationItem,
                        ...(notification.isRead ? styles.notificationItemRead : {}),
                      }}
                      onClick={() => handleItemClick(notification)}
                    >
                      <div style={styles.itemAvatar}>
                        {notification.actor?.profile_image_url ? (
                          <img
                            src={notification.actor.profile_image_url}
                            alt=""
                            style={styles.avatarImg}
                          />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            {notification.actor?.first_name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div style={styles.itemContent}>
                        <p style={{
                          ...styles.itemText,
                          ...(notification.isRead ? styles.itemTextRead : {}),
                        }}>
                          <strong>
                            {notification.actor?.first_name} {notification.actor?.last_name}
                          </strong>
                          {' '}posted
                        </p>
                        <p style={styles.itemPreview}>
                          {truncate(notification.content_preview, 60)}
                        </p>
                        <p style={styles.itemTime}>{formatTime(notification.created_at)}</p>
                      </div>
                      {!notification.isRead && <div style={styles.unreadDot} />}
                    </div>
                  ))}
                </div>
              )}

              {/* New Comments Section */}
              {Object.keys(grouped.commentsByPost || {}).length > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <MessageIcon />
                    <span style={styles.sectionTitle}>New Comments</span>
                  </div>
                  {Object.entries(grouped.commentsByPost).map(([postId, data]) => {
                    // Check if any comment in this group is unread
                    const hasUnreadComment = data.comments.some(c => !c.isRead);
                    return (
                      <div
                        key={postId}
                        style={{
                          ...styles.notificationItem,
                          ...(!hasUnreadComment ? styles.notificationItemRead : {}),
                        }}
                        onClick={() => handleItemClick(data.comments[0])}
                      >
                        <div style={styles.itemAvatar}>
                          {data.latestActor?.profile_image_url ? (
                            <img
                              src={data.latestActor.profile_image_url}
                              alt=""
                              style={styles.avatarImg}
                            />
                          ) : (
                            <div style={styles.avatarPlaceholder}>
                              {data.latestActor?.first_name?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div style={styles.itemContent}>
                          <p style={{
                            ...styles.itemText,
                            ...(!hasUnreadComment ? styles.itemTextRead : {}),
                          }}>
                            <strong>
                              {data.latestActor?.first_name} {data.latestActor?.last_name}
                            </strong>
                            {data.comments.length > 1
                              ? ` and ${data.comments.length - 1} other${data.comments.length > 2 ? 's' : ''} commented`
                              : ' commented'}
                          </p>
                          <p style={styles.itemPreview}>
                            on "{truncate(data.post?.content, 40)}"
                          </p>
                          <p style={styles.itemTime}>
                            {formatTime(data.comments[0].created_at)}
                          </p>
                        </div>
                        {hasUnreadComment && <div style={styles.unreadDot} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Earlier This Week Section */}
              {grouped.totalOlder > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>Earlier This Week</span>
                  </div>
                  {/* Older Posts */}
                  {grouped.olderPosts?.map(notification => (
                    <div
                      key={notification.id}
                      style={{
                        ...styles.notificationItem,
                        ...(notification.isRead ? styles.notificationItemRead : {}),
                      }}
                      onClick={() => handleItemClick(notification)}
                    >
                      <div style={styles.itemAvatar}>
                        {notification.actor?.profile_image_url ? (
                          <img
                            src={notification.actor.profile_image_url}
                            alt=""
                            style={styles.avatarImg}
                          />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            {notification.actor?.first_name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div style={styles.itemContent}>
                        <p style={{
                          ...styles.itemText,
                          ...(notification.isRead ? styles.itemTextRead : {}),
                        }}>
                          <strong>
                            {notification.actor?.first_name} {notification.actor?.last_name}
                          </strong>
                          {' '}posted
                        </p>
                        <p style={styles.itemPreview}>
                          {truncate(notification.content_preview, 60)}
                        </p>
                        <p style={styles.itemTime}>{formatTime(notification.created_at)}</p>
                      </div>
                      {!notification.isRead && <div style={styles.unreadDot} />}
                    </div>
                  ))}
                  {/* Older Comments */}
                  {grouped.olderComments?.map(notification => (
                    <div
                      key={notification.id}
                      style={{
                        ...styles.notificationItem,
                        ...(notification.isRead ? styles.notificationItemRead : {}),
                      }}
                      onClick={() => handleItemClick(notification)}
                    >
                      <div style={styles.itemAvatar}>
                        {notification.actor?.profile_image_url ? (
                          <img
                            src={notification.actor.profile_image_url}
                            alt=""
                            style={styles.avatarImg}
                          />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            {notification.actor?.first_name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div style={styles.itemContent}>
                        <p style={{
                          ...styles.itemText,
                          ...(notification.isRead ? styles.itemTextRead : {}),
                        }}>
                          <strong>
                            {notification.actor?.first_name} {notification.actor?.last_name}
                          </strong>
                          {' '}commented
                        </p>
                        <p style={styles.itemPreview}>
                          on "{truncate(notification.post?.content, 40)}"
                        </p>
                        <p style={styles.itemTime}>{formatTime(notification.created_at)}</p>
                      </div>
                      {!notification.isRead && <div style={styles.unreadDot} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ============================================
// NEW COMMENTS DIVIDER
// ============================================
export const NewCommentsDivider = () => {
  return (
    <div style={styles.newDivider}>
      <div style={styles.newDividerLine} />
      <span style={styles.newDividerText}>New</span>
      <div style={styles.newDividerLine} />
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  // Bell
  bellButton: {
    position: 'relative',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
    borderRadius: '12px',
  },
  newBadge: {
    position: 'absolute',
    top: '4px',
    right: '2px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 4px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  unreadDotBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
  },

  // Banner
  banner: {
    position: 'fixed',
    top: 'calc(var(--safe-area-top, 0px) + 60px)',
    left: '16px',
    right: '16px',
    maxWidth: '568px',
    margin: '0 auto',
    backgroundColor: 'var(--primary-blue)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 20px rgba(var(--primary-blue-rgb), 0.3)',
    zIndex: 1000,
    animation: 'slideInBanner 0.3s ease-out',
    cursor: 'pointer',
  },
  bannerAnimatingOut: {
    animation: 'slideOutBanner 0.5s ease-in forwards',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#ffffff',
  },
  bannerText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  bannerClose: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#ffffff',
  },

  // Panel
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1999,
  },
  panel: {
    position: 'fixed',
    top: 'var(--safe-area-top, 0px)',
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInPanel 0.3s ease-out',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-dark)',
    margin: 0,
  },
  panelHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  markAllReadBtn: {
    padding: '6px 12px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--primary-blue)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  panelContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: 'var(--text-light)',
  },
  emptyText: {
    marginTop: '16px',
    fontSize: '15px',
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    color: 'var(--text-muted)',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Notification item
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  notificationItemRead: {
    backgroundColor: '#ffffff',
    opacity: 0.7,
  },
  itemAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemText: {
    fontSize: '14px',
    color: 'var(--text-dark)',
    margin: '0 0 4px 0',
  },
  itemTextRead: {
    fontWeight: 'normal',
    color: 'var(--text-muted)',
  },
  itemPreview: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 4px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemTime: {
    fontSize: '12px',
    color: 'var(--text-light)',
    margin: 0,
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    flexShrink: 0,
    marginTop: '6px',
  },

  // New comments divider
  newDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0',
  },
  newDividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--primary-blue)',
  },
  newDividerText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--primary-blue)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

// Add keyframe animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideInBanner {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideOutBanner {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
    }
    @keyframes slideInPanel {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `;
  if (!document.querySelector('style[data-activity-notifications]')) {
    styleSheet.setAttribute('data-activity-notifications', 'true');
    document.head.appendChild(styleSheet);
  }
}
