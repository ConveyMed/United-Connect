import React, { useState, useEffect, useRef } from 'react';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { useActivityNotifications } from '../context/ActivityNotificationsContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { NotificationBell, NotificationBanner, NotificationPanel, NewCommentsDivider } from '../components/ActivityNotifications';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { openInAppBrowser } from '../utils/browser';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Icons
const HeartIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PlusIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const PinIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const FeedbackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const BellIcon = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    {off && <line x1="1" y1="1" x2="23" y2="23" />}
  </svg>
);

const EyeIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Edit Icon
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// Post Component
const Post = ({ post, currentUserId, isAdmin, onEditPost }) => {
  const {
    toggleLike,
    isPostLiked,
    toggleBookmark,
    isPostBookmarked,
    addComment,
    deleteComment,
    pinPost,
    unpinPost,
    deletePost,
    togglePostMute,
    togglePostWatch,
    isPostMuted,
    isPostWatching,
    globalPushCommentsEnabled,
  } = usePosts();

  const {
    trackPostRead,
    getNewCommentsStartIndex,
  } = useActivityNotifications();

  const { canDeleteComments, settings } = useAppSettings();
  // One-way feed (admin-broadcast apps like United Connect): hide like/comment/save.
  // Defaults ON so normal apps are unaffected; set app_settings.show_post_interactions='false' to hide.
  const showPostInteractions = settings?.show_post_interactions !== false && settings?.show_post_interactions !== 'false';

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleComments, setVisibleComments] = useState(3);
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState(null); // comment id to delete
  const [newDividerIndex, setNewDividerIndex] = useState(null);

  const isLiked = isPostLiked(post.id);
  const isBookmarked = isPostBookmarked(post.id);

  // Track when comments are viewed and set the "New" divider position
  useEffect(() => {
    if (showComments && post.comments?.length > 0) {
      const startIndex = getNewCommentsStartIndex(post.id);
      if (startIndex < post.comments.length) {
        setNewDividerIndex(startIndex);
      } else {
        setNewDividerIndex(null);
      }
      // Track this read after a short delay (so user actually sees the comments)
      const timer = setTimeout(() => {
        trackPostRead(post.id, post.comments.length);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showComments, post.id, post.comments?.length, trackPostRead, getNewCommentsStartIndex]);

  const handlePin = () => {
    if (post.isPinned) {
      unpinPost(post.id);
    } else {
      pinPost(post.id);
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deletePost(post.id);
    setShowDeleteConfirm(false);
  };

  const handleFeedback = () => {
    setShowMenu(false);
    setShowFeedbackModal(true);
  };

  const handleEdit = () => {
    setShowMenu(false);
    if (onEditPost) {
      onEditPost(post);
    }
  };

  const submitFeedback = () => {
    // For now just close - would send to admin/support
    console.log('Feedback for post:', post.id, feedbackText);
    alert('Thank you for your feedback!');
    setFeedbackText('');
    setShowFeedbackModal(false);
  };

  const handleLike = () => {
    toggleLike(post.id);
  };

  const handleBookmark = () => {
    toggleBookmark(post.id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(post.id, newComment);
      setNewComment('');
      // Immediately update the read count so our own comment doesn't show as "New"
      trackPostRead(post.id, (post.comments?.length || 0) + 1);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    setVisibleComments(prev => prev + 5);
  };

  // Get the most recent comment for preview (last in array since oldest-first order)
  const previewComment = post.comments?.[post.comments.length - 1];
  const totalComments = post.commentsCount || post.comments?.length || 0;
  // Show most recent comments, slice from end of array
  const startIndex = Math.max(0, (post.comments?.length || 0) - visibleComments);
  const displayedComments = post.comments?.slice(startIndex) || [];
  const hasMoreComments = startIndex > 0;

  return (
    <article id={`post-${post.id}`} style={styles.post}>
      {/* Pinned Badge */}
      {post.isPinned && (
        <div style={styles.pinnedBadge}>
          <PinIcon filled />
          <span>Pinned</span>
        </div>
      )}

      {/* Post Header */}
      <div style={styles.postHeader}>
        {post.author.avatar ? (
          <img
            src={post.author.avatar}
            alt={post.author.name}
            style={styles.avatar}
          />
        ) : (
          <div style={styles.avatarPlaceholder}>
            <UserIcon />
          </div>
        )}
        <div style={styles.authorInfo}>
          <span style={styles.authorName}>{post.author.name}</span>
          <span style={styles.authorTitle}>{post.author.title}</span>
        </div>
        <span style={styles.timeAgo}>{post.timeAgo}</span>

        {/* More Menu Button */}
        <div style={styles.menuContainer}>
          <button
            style={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreIcon />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div style={styles.menuBackdrop} onClick={() => setShowMenu(false)} />
              <div style={styles.menuDropdown}>
                <button style={styles.menuItem} onClick={handleFeedback}>
                  <FeedbackIcon />
                  <span>Give Feedback</span>
                </button>
                {isAdmin && (
                  <>
                    <button style={styles.menuItem} onClick={handleEdit}>
                      <EditIcon />
                      <span>Edit Post</span>
                    </button>
                    <button style={styles.menuItem} onClick={handlePin}>
                      <PinIcon filled={post.isPinned} />
                      <span>{post.isPinned ? 'Unpin Post' : 'Pin Post'}</span>
                    </button>
                    <button style={{ ...styles.menuItem, ...styles.menuItemDanger }} onClick={handleDelete}>
                      <TrashIcon />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                {/* Show Mute if global ON, Show Watch if global OFF */}
                {globalPushCommentsEnabled ? (
                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      togglePostMute(post.id);
                      setShowMenu(false);
                    }}
                  >
                    <BellIcon off={isPostMuted(post.id)} />
                    <span>{isPostMuted(post.id) ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                  </button>
                ) : (
                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      togglePostWatch(post.id);
                      setShowMenu(false);
                    }}
                  >
                    <EyeIcon filled={isPostWatching(post.id)} />
                    <span>{isPostWatching(post.id) ? 'Stop Watching' : 'Watch Post'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={styles.feedbackOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.feedbackModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.feedbackTitle}>Give Feedback</h3>
            <p style={styles.feedbackSubtitle}>Help us improve by sharing your thoughts about this post.</p>
            <textarea
              style={styles.feedbackTextarea}
              placeholder="What's on your mind?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />
            <div style={styles.feedbackButtons}>
              <button style={styles.feedbackCancelBtn} onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </button>
              <button
                style={{
                  ...styles.feedbackSubmitBtn,
                  opacity: feedbackText.trim() ? 1 : 0.5,
                }}
                onClick={submitFeedback}
                disabled={!feedbackText.trim()}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.feedbackOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={styles.deleteIconContainer}>
              <TrashIcon />
            </div>
            <h3 style={styles.deleteTitle}>Delete Post?</h3>
            <p style={styles.deleteSubtitle}>This action cannot be undone. The post will be permanently removed.</p>
            <div style={styles.feedbackButtons}>
              <button style={styles.feedbackCancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button style={styles.deleteConfirmBtn} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Delete Confirmation Modal */}
      {showCommentDeleteConfirm && (
        <div style={styles.feedbackOverlay} onClick={() => setShowCommentDeleteConfirm(null)}>
          <div style={styles.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={styles.deleteIconContainer}>
              <TrashIcon />
            </div>
            <h3 style={styles.deleteTitle}>Delete Comment?</h3>
            <p style={styles.deleteSubtitle}>This action cannot be undone. The comment will be permanently removed.</p>
            <div style={styles.feedbackButtons}>
              <button style={styles.feedbackCancelBtn} onClick={() => setShowCommentDeleteConfirm(null)}>
                Cancel
              </button>
              <button style={styles.deleteConfirmBtn} onClick={() => {
                deleteComment(post.id, showCommentDeleteConfirm);
                setShowCommentDeleteConfirm(null);
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Content */}
      <p style={styles.postContent}>{post.content}</p>

      {/* Post Media Carousel */}
      {(() => {
        const allMedia = [
          ...(post.images || []).map(url => ({ url, type: 'image' })),
          ...(post.videos || []).map(url => ({ url, type: 'video' })),
        ];
        // Fallback to single image/video for backward compat
        if (allMedia.length === 0 && post.image) {
          allMedia.push({ url: post.image, type: 'image' });
        }
        if (allMedia.length === 0 && post.video) {
          allMedia.push({ url: post.video, type: 'video' });
        }

        if (allMedia.length === 0) return null;

        if (allMedia.length === 1) {
          const media = allMedia[0];
          return (
            <div style={styles.imageContainer}>
              {media.type === 'video' ? (
                <video src={media.url} style={styles.postImage} controls playsInline />
              ) : (
                <img src={media.url} alt="Post" style={styles.postImage} loading="lazy" />
              )}
            </div>
          );
        }

        return (
          <div style={styles.carouselContainer}>
            <Swiper
              modules={[Pagination, Navigation]}
              pagination={{ clickable: true }}
              navigation
              spaceBetween={0}
              slidesPerView={1}
              style={{ width: '100%' }}
            >
              {allMedia.map((media, i) => (
                <SwiperSlide key={i}>
                  <div style={styles.carouselSlide}>
                    {media.type === 'video' ? (
                      <video src={media.url} style={styles.carouselMedia} controls playsInline />
                    ) : (
                      <img src={media.url} alt={`Post ${i + 1}`} style={styles.carouselMedia} loading="lazy" />
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        );
      })()}

      {/* Post Links */}
      {post.links && post.links.length > 0 && (
        <div style={styles.postLinks}>
          {post.links.map((link, i) => (
            <button
              key={i}
              onClick={() => openInAppBrowser(link.url)}
              style={styles.postLink}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {link.name}
            </button>
          ))}
        </div>
      )}

      {/* Engagement Stats */}
      <div style={styles.engagementStats}>
        <span style={styles.stat}>
          <span style={styles.likeIcon}>
            <HeartIcon filled={true} />
          </span>
          {post.likes} likes
        </span>
        <span style={styles.stat}>{totalComments} comments</span>
      </div>

      {/* Action Buttons (hidden on one-way / admin-broadcast feeds) */}
      {showPostInteractions && (
      <div style={styles.actionButtons}>
        <button
          style={{
            ...styles.actionButton,
            ...(isLiked ? styles.actionButtonActive : {}),
          }}
          onClick={handleLike}
        >
          <HeartIcon filled={isLiked} />
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>
        <button
          style={styles.actionButton}
          onClick={() => setShowComments(!showComments)}
        >
          <CommentIcon />
          <span>Comment</span>
        </button>
        <button
          style={{
            ...styles.actionButton,
            ...(isBookmarked ? styles.actionButtonBookmarked : {}),
          }}
          onClick={handleBookmark}
        >
          <BookmarkIcon filled={isBookmarked} />
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>
      )}

      {/* Comment Preview (when collapsed) */}
      {!showComments && previewComment && (
        <div
          style={styles.commentPreview}
          onClick={() => setShowComments(true)}
        >
          <div style={styles.commentPreviewRow}>
            <span style={styles.commentPreviewAuthor}>{previewComment.author}</span>
            <span style={styles.commentPreviewText}>{previewComment.text}</span>
          </div>
          {totalComments > 1 && (
            <span style={styles.commentPreviewMore}>
              View all {totalComments} comments
            </span>
          )}
        </div>
      )}

      {/* Expanded Comments Section */}
      {showComments && (
        <div style={styles.commentsSection}>
          {/* Comments list */}
          {displayedComments.length > 0 ? (
            <div style={styles.commentsList}>
              {/* Load older comments button at top */}
              {hasMoreComments && (
                <button
                  style={styles.loadMoreButton}
                  onClick={handleLoadMore}
                >
                  Load older comments ({startIndex} more)
                </button>
              )}

              {displayedComments.map((comment, idx) => {
                // Calculate absolute index in all comments
                const absoluteIndex = startIndex + idx;
                // Show "New" divider before this comment if it's the first new one
                const showNewDivider = newDividerIndex !== null && absoluteIndex === newDividerIndex;
                // Check if current user can delete this comment
                const canDelete = canDeleteComments(comment.userId);

                return (
                  <React.Fragment key={comment.id}>
                    {showNewDivider && <NewCommentsDivider />}
                    <div style={styles.comment}>
                      <div style={styles.commentBubble}>
                        <div style={styles.commentHeader}>
                          <span style={styles.commentAuthor}>{comment.author}</span>
                          <span style={styles.commentTime}>{comment.timeAgo}</span>
                          {canDelete && (
                            <button
                              style={styles.commentDeleteBtn}
                              onClick={() => setShowCommentDeleteConfirm(comment.id)}
                              title="Delete comment"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                        <p style={styles.commentText}>{comment.text}</p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <p style={styles.noComments}>No comments yet. Be the first!</p>
          )}

          {/* Add comment input at bottom */}
          <div style={styles.addCommentRow}>
            <textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={styles.commentInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              disabled={isSubmitting}
              rows={1}
            />
            <button
              style={{
                ...styles.sendButton,
                opacity: newComment.trim() && !isSubmitting ? 1 : 0.5,
              }}
              onClick={handleAddComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              <SendIcon />
            </button>
          </div>

          {/* Collapse button */}
          <button
            style={styles.collapseButton}
            onClick={() => setShowComments(false)}
          >
            <ChevronUpIcon />
            <span>Hide comments</span>
          </button>
        </div>
      )}
    </article>
  );
};

// Close Icon for Edit Modal
const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const VideoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const LinkIconSmall = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Edit Post Modal Component
const EditPostModal = ({ post, onClose, onSave }) => {
  const { user } = useAuth();
  const [content, setContent] = useState(post?.content || '');
  const [existingImages, setExistingImages] = useState(post?.images || []);
  const [existingVideos, setExistingVideos] = useState(post?.videos || []);
  const [links, setLinks] = useState(post?.links || []);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const imageInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkName.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setLinks(prev => [...prev, { url, name: linkName.trim() }]);
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
  };

  const removeLink = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index) => {
    setExistingVideos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewMedia = (index) => {
    setNewMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleMediaSelect = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalMedia = existingImages.length + existingVideos.length + newMediaFiles.length;
    const remainingSlots = 10 - totalMedia;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more file(s). Max 10 total.`);
    }

    for (const file of filesToAdd) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Max file size is 50MB.`);
        continue;
      }

      setNewMediaFiles(prev => [...prev, {
        file,
        preview: URL.createObjectURL(file),
        type,
      }]);
    }

    e.target.value = '';
  };

  const uploadMedia = async (mediaItem) => {
    if (!mediaItem?.file || !user?.id) return null;

    const { supabase } = await import('../config/supabase');
    const fileExt = mediaItem.file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const folderPath = mediaItem.type === 'video' ? 'posts/videos' : 'posts/images';
    const filePath = `${folderPath}/${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, mediaItem.file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, type: mediaItem.type };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upload new media
      let newImages = [];
      let newVideos = [];

      for (const media of newMediaFiles) {
        const result = await uploadMedia(media);
        if (result) {
          if (result.type === 'image') {
            newImages.push(result.url);
          } else {
            newVideos.push(result.url);
          }
        }
      }

      const updatedData = {
        content,
        images: [...existingImages, ...newImages],
        videos: [...existingVideos, ...newVideos],
        links,
      };

      await onSave(updatedData);
      handleClose();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSaving) {
      handleClose();
    }
  };

  if (!post) return null;

  return (
    <div
      style={{
        ...editModalStyles.backdrop,
        opacity: isAnimating ? 1 : 0,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          ...editModalStyles.modal,
          transform: isAnimating
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(100%)',
        }}
      >
        {/* Handle bar */}
        <div style={editModalStyles.handleBar}>
          <div style={editModalStyles.handle} />
        </div>

        {/* Header */}
        <div style={editModalStyles.header}>
          <button style={editModalStyles.closeButton} onClick={handleClose} disabled={isSaving}>
            <CloseIcon />
          </button>
          <h2 style={editModalStyles.title}>Edit Post</h2>
          <button
            style={{
              ...editModalStyles.saveButton,
              opacity: isSaving ? 0.5 : 1,
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Content area */}
        <div style={editModalStyles.contentArea}>
          <textarea
            style={editModalStyles.textarea}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            disabled={isSaving}
          />

          {/* Existing Media */}
          {(existingImages.length > 0 || existingVideos.length > 0 || newMediaFiles.length > 0) && (
            <div style={editModalStyles.mediaGrid}>
              {existingImages.map((url, index) => (
                <div key={`img-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button
                      style={editModalStyles.removeMediaBtn}
                      onClick={() => removeExistingImage(index)}
                    >
                      <XIcon />
                    </button>
                  )}
                  <img src={url} alt={`Upload ${index + 1}`} style={editModalStyles.mediaPreview} />
                </div>
              ))}
              {existingVideos.map((url, index) => (
                <div key={`vid-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button
                      style={editModalStyles.removeMediaBtn}
                      onClick={() => removeExistingVideo(index)}
                    >
                      <XIcon />
                    </button>
                  )}
                  <video src={url} style={editModalStyles.mediaPreview} />
                </div>
              ))}
              {newMediaFiles.map((media, index) => (
                <div key={`new-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button
                      style={editModalStyles.removeMediaBtn}
                      onClick={() => removeNewMedia(index)}
                    >
                      <XIcon />
                    </button>
                  )}
                  {media.type === 'video' ? (
                    <video src={media.preview} style={editModalStyles.mediaPreview} />
                  ) : (
                    <img src={media.preview} alt={`New ${index + 1}`} style={editModalStyles.mediaPreview} />
                  )}
                  <div style={editModalStyles.newBadge}>NEW</div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div style={editModalStyles.linksContainer}>
              {links.map((link, index) => (
                <div key={index} style={editModalStyles.linkItem}>
                  <LinkIconSmall />
                  <span style={editModalStyles.linkText}>{link.name}</span>
                  {!isSaving && (
                    <button
                      style={editModalStyles.removeLinkBtn}
                      onClick={() => removeLink(index)}
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link Input */}
          {showLinkInput && (
            <div style={editModalStyles.linkInputContainer}>
              <div style={editModalStyles.linkInputFields}>
                <input
                  type="url"
                  placeholder="Paste URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={editModalStyles.linkInput}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Name (e.g. Training Video)"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  style={editModalStyles.linkInput}
                />
              </div>
              <div style={editModalStyles.linkInputButtons}>
                <button
                  style={{
                    ...editModalStyles.linkAddBtn,
                    opacity: linkUrl.trim() && linkName.trim() ? 1 : 0.5,
                  }}
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim() || !linkName.trim()}
                >
                  Add
                </button>
                <button
                  style={editModalStyles.linkCancelBtn}
                  onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleMediaSelect(e, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleMediaSelect(e, 'video')}
        />

        {/* Actions */}
        <div style={editModalStyles.actions}>
          <button
            style={editModalStyles.actionButton}
            onClick={() => imageInputRef.current?.click()}
            disabled={isSaving}
          >
            <ImageIcon />
            <span>Photo</span>
          </button>
          <button
            style={editModalStyles.actionButton}
            onClick={() => videoInputRef.current?.click()}
            disabled={isSaving}
          >
            <VideoIcon />
            <span>Video</span>
          </button>
          <button
            style={editModalStyles.actionButton}
            onClick={() => setShowLinkInput(true)}
            disabled={isSaving || showLinkInput}
          >
            <LinkIconSmall />
            <span>Link</span>
          </button>
        </div>

        {/* Bottom safe area */}
        <div style={{ height: 'calc(var(--safe-area-bottom, 0px) + 16px)' }} />
      </div>
    </div>
  );
};

// Edit Scheduled Post Modal
const EditScheduledPostModal = ({ post, onClose, onSave, onDelete }) => {
  const { user } = useAuth();
  const [content, setContent] = useState(post?.content || '');
  const [existingImages, setExistingImages] = useState(post?.images || []);
  const [existingVideos, setExistingVideos] = useState(post?.videos || []);
  const [links, setLinks] = useState(post?.links || []);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Schedule and notify state
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (post?.scheduledAt) {
      const date = new Date(post.scheduledAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
    }
    return '';
  });
  const [notifyPush, setNotifyPush] = useState(post?.notifyPush || false);

  const imageInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  const getCurrentDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const isScheduledForFuture = scheduledAt && new Date(scheduledAt) > new Date();

  React.useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkName.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setLinks(prev => [...prev, { url, name: linkName.trim() }]);
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
  };

  const removeLink = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index) => {
    setExistingVideos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewMedia = (index) => {
    setNewMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleMediaSelect = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalMedia = existingImages.length + existingVideos.length + newMediaFiles.length;
    const remainingSlots = 10 - totalMedia;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more file(s). Max 10 total.`);
    }

    for (const file of filesToAdd) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Max file size is 50MB.`);
        continue;
      }

      setNewMediaFiles(prev => [...prev, {
        file,
        preview: URL.createObjectURL(file),
        type,
      }]);
    }

    e.target.value = '';
  };

  const uploadMedia = async (mediaItem) => {
    if (!mediaItem?.file || !user?.id) return null;

    const { supabase } = await import('../config/supabase');
    const fileExt = mediaItem.file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const folderPath = mediaItem.type === 'video' ? 'posts/videos' : 'posts/images';
    const filePath = `${folderPath}/${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, mediaItem.file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, type: mediaItem.type };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let newImages = [];
      let newVideos = [];

      for (const media of newMediaFiles) {
        const result = await uploadMedia(media);
        if (result) {
          if (result.type === 'image') {
            newImages.push(result.url);
          } else {
            newVideos.push(result.url);
          }
        }
      }

      const scheduleTime = scheduledAt && new Date(scheduledAt) > new Date()
        ? new Date(scheduledAt).toISOString()
        : new Date().toISOString();

      const updatedData = {
        content,
        images: [...existingImages, ...newImages],
        videos: [...existingVideos, ...newVideos],
        links,
        scheduledAt: scheduleTime,
        notifyPush,
      };

      await onSave(updatedData);
      handleClose();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete();
      handleClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSaving) {
      handleClose();
    }
  };

  if (!post) return null;

  return (
    <div
      style={{
        ...editModalStyles.backdrop,
        opacity: isAnimating ? 1 : 0,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          ...editModalStyles.modal,
          transform: isAnimating
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(100%)',
        }}
      >
        <div style={editModalStyles.handleBar}>
          <div style={editModalStyles.handle} />
        </div>

        <div style={editModalStyles.header}>
          <button style={editModalStyles.closeButton} onClick={handleClose} disabled={isSaving}>
            <CloseIcon />
          </button>
          <h2 style={editModalStyles.title}>Edit Scheduled Post</h2>
          <button
            style={{
              ...editModalStyles.saveButton,
              opacity: isSaving ? 0.5 : 1,
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div style={editModalStyles.contentArea}>
          <textarea
            style={editModalStyles.textarea}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            disabled={isSaving}
          />

          {(existingImages.length > 0 || existingVideos.length > 0 || newMediaFiles.length > 0) && (
            <div style={editModalStyles.mediaGrid}>
              {existingImages.map((url, index) => (
                <div key={`img-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button style={editModalStyles.removeMediaBtn} onClick={() => removeExistingImage(index)}>
                      <XIcon />
                    </button>
                  )}
                  <img src={url} alt={`Upload ${index + 1}`} style={editModalStyles.mediaPreview} />
                </div>
              ))}
              {existingVideos.map((url, index) => (
                <div key={`vid-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button style={editModalStyles.removeMediaBtn} onClick={() => removeExistingVideo(index)}>
                      <XIcon />
                    </button>
                  )}
                  <video src={url} style={editModalStyles.mediaPreview} />
                </div>
              ))}
              {newMediaFiles.map((media, index) => (
                <div key={`new-${index}`} style={editModalStyles.mediaGridItem}>
                  {!isSaving && (
                    <button style={editModalStyles.removeMediaBtn} onClick={() => removeNewMedia(index)}>
                      <XIcon />
                    </button>
                  )}
                  {media.type === 'video' ? (
                    <video src={media.preview} style={editModalStyles.mediaPreview} />
                  ) : (
                    <img src={media.preview} alt={`New ${index + 1}`} style={editModalStyles.mediaPreview} />
                  )}
                  <div style={editModalStyles.newBadge}>NEW</div>
                </div>
              ))}
            </div>
          )}

          {links.length > 0 && (
            <div style={editModalStyles.linksContainer}>
              {links.map((link, index) => (
                <div key={index} style={editModalStyles.linkItem}>
                  <LinkIconSmall />
                  <span style={editModalStyles.linkText}>{link.name}</span>
                  {!isSaving && (
                    <button style={editModalStyles.removeLinkBtn} onClick={() => removeLink(index)}>
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showLinkInput && (
            <div style={editModalStyles.linkInputContainer}>
              <div style={editModalStyles.linkInputFields}>
                <input
                  type="url"
                  placeholder="Paste URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={editModalStyles.linkInput}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Name (e.g. Training Video)"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  style={editModalStyles.linkInput}
                />
              </div>
              <div style={editModalStyles.linkInputButtons}>
                <button
                  style={{ ...editModalStyles.linkAddBtn, opacity: linkUrl.trim() && linkName.trim() ? 1 : 0.5 }}
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim() || !linkName.trim()}
                >
                  Add
                </button>
                <button
                  style={editModalStyles.linkCancelBtn}
                  onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleMediaSelect(e, 'image')} />
        <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={(e) => handleMediaSelect(e, 'video')} />

        {/* Schedule Section */}
        <div style={editModalStyles.scheduleSection}>
          <div style={editModalStyles.scheduleHeader}>
            <ClockIcon />
            <span style={editModalStyles.scheduleLabel}>Schedule</span>
          </div>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={getCurrentDatetime()}
            style={editModalStyles.scheduleInput}
            disabled={isSaving}
          />
          {scheduledAt && !isScheduledForFuture && (
            <span style={editModalStyles.scheduleHint}>Posts now or in the past will be sent immediately</span>
          )}
          {isScheduledForFuture && (
            <span style={editModalStyles.scheduleConfirm}>
              Will post on {new Date(scheduledAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </span>
          )}
        </div>

        {/* Notify Section */}
        <div style={editModalStyles.notifySection}>
          <span style={editModalStyles.notifyLabel}>Notify members:</span>
          <div style={editModalStyles.notifyOptions}>
            <button style={editModalStyles.notifyOption} onClick={() => setNotifyPush(!notifyPush)} disabled={isSaving}>
              <div style={{ ...editModalStyles.checkbox, ...(notifyPush ? editModalStyles.checkboxActive : {}) }}>
                {notifyPush && <CheckIcon />}
              </div>
              <BellIcon />
              <span>Push</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={editModalStyles.actions}>
          <button style={editModalStyles.actionButton} onClick={() => imageInputRef.current?.click()} disabled={isSaving}>
            <ImageIcon />
            <span>Photo</span>
          </button>
          <button style={editModalStyles.actionButton} onClick={() => videoInputRef.current?.click()} disabled={isSaving}>
            <VideoIcon />
            <span>Video</span>
          </button>
          <button style={editModalStyles.actionButton} onClick={() => setShowLinkInput(true)} disabled={isSaving || showLinkInput}>
            <LinkIconSmall />
            <span>Link</span>
          </button>
          <button style={editModalStyles.deleteButton} onClick={() => setShowDeleteConfirm(true)} disabled={isSaving}>
            <TrashIcon />
            <span>Delete</span>
          </button>
        </div>

        <div style={{ height: 'calc(var(--safe-area-bottom, 0px) + 16px)' }} />

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div style={editModalStyles.deleteOverlay}>
            <div style={editModalStyles.deleteModal}>
              <h3 style={editModalStyles.deleteTitle}>Delete Scheduled Post?</h3>
              <p style={editModalStyles.deleteText}>This action cannot be undone.</p>
              <div style={editModalStyles.deleteButtons}>
                <button style={editModalStyles.deleteCancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button style={editModalStyles.deleteConfirmBtn} onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Edit Modal Styles
const editModalStyles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    transition: 'opacity 0.3s ease',
  },
  modal: {
    position: 'absolute',
    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%) translateY(100%)',
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    maxHeight: 'calc(100vh - 100px - env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
  },
  handleBar: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '12px',
    paddingBottom: '4px',
  },
  handle: {
    width: '36px',
    height: '4px',
    backgroundColor: 'var(--border-light)',
    borderRadius: '2px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  closeButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  title: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  contentArea: {
    flex: 1,
    padding: '16px',
    minHeight: '120px',
    overflow: 'auto',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    lineHeight: '1.5',
    color: 'var(--text-dark)',
    resize: 'none',
    fontFamily: 'inherit',
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    marginTop: '12px',
  },
  mediaGridItem: {
    position: 'relative',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-light)',
    aspectRatio: '1',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    zIndex: 10,
    padding: 0,
  },
  newBadge: {
    position: 'absolute',
    bottom: '2px',
    left: '2px',
    padding: '2px 4px',
    backgroundColor: '#22c55e',
    borderRadius: '3px',
    fontSize: '8px',
    color: '#ffffff',
    fontWeight: '700',
  },
  linksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
  },
  linkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '10px',
    color: 'var(--primary-blue)',
  },
  linkText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  removeLinkBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: 0,
  },
  linkInputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  linkInputFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  linkInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  linkInputButtons: {
    display: 'flex',
    gap: '8px',
  },
  linkAddBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  linkCancelBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    color: 'var(--text-muted)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid #f1f5f9',
    gap: '8px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '20px',
    cursor: 'pointer',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
    marginLeft: 'auto',
  },
  // Schedule section
  scheduleSection: {
    padding: '12px 16px',
    borderTop: '1px solid #f1f5f9',
  },
  scheduleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  scheduleLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  scheduleInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    color: 'var(--text-dark)',
    backgroundColor: 'var(--background-off-white)',
    outline: 'none',
    cursor: 'pointer',
    marginBottom: '6px',
  },
  scheduleHint: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: '500',
  },
  scheduleConfirm: {
    fontSize: '13px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
  },
  // Notify section
  notifySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderTop: '1px solid #f1f5f9',
  },
  notifyLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  notifyOptions: {
    display: 'flex',
    gap: '8px',
  },
  notifyOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#475569',
    fontWeight: '500',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: 'var(--primary-blue)',
    borderColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  // Delete confirmation
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    borderRadius: '24px',
  },
  deleteModal: {
    padding: '24px',
    textAlign: 'center',
    maxWidth: '280px',
  },
  deleteTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  deleteText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 20px 0',
  },
  deleteButtons: {
    display: 'flex',
    gap: '12px',
  },
  deleteCancelBtn: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'var(--bg-light)',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Loading skeleton component
const PostSkeleton = () => (
  <div style={styles.postSkeleton}>
    <div style={styles.skeletonHeader}>
      <div style={styles.skeletonAvatar} />
      <div style={styles.skeletonAuthorInfo}>
        <div style={styles.skeletonName} />
        <div style={styles.skeletonTitle} />
      </div>
    </div>
    <div style={styles.skeletonContent}>
      <div style={styles.skeletonLine} />
      <div style={{ ...styles.skeletonLine, width: '80%' }} />
      <div style={{ ...styles.skeletonLine, width: '60%' }} />
    </div>
    <div style={styles.skeletonImage} />
  </div>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const Home = () => {
  const { posts, scheduledPosts, loading, openCreateModal, isPostBookmarked, updatePost, loadScheduledPosts, updateScheduledPost, deleteScheduledPost, refreshPosts } = usePosts();
  const { user, userProfile } = useAuth();
  const { triggerBanner, scrollTarget, clearScrollTarget } = useActivityNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingScheduledPost, setEditingScheduledPost] = useState(null);
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'scheduled'

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const feedContainerRef = useRef(null);

  // Ref for the bell icon (for banner animation target)
  const bellRef = useRef(null);

  // Trigger notification banner on mount
  useEffect(() => {
    // Small delay to ensure everything is rendered
    const timer = setTimeout(() => {
      triggerBanner();
    }, 500);
    return () => clearTimeout(timer);
  }, [triggerBanner]);

  // Handle scroll to post when notification is tapped
  useEffect(() => {
    if (scrollTarget?.postId) {
      const postElement = document.getElementById(`post-${scrollTarget.postId}`);
      if (postElement) {
        // Small delay to ensure panel is closed
        setTimeout(() => {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the post briefly
          postElement.style.transition = 'box-shadow 0.3s';
          postElement.style.boxShadow = '0 0 0 3px var(--primary-blue)';
          setTimeout(() => {
            postElement.style.boxShadow = '';
          }, 2000);
        }, 300);
      }
      clearScrollTarget();
    }
  }, [scrollTarget, clearScrollTarget]);

  // Check if user is admin or editor
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'editor' || userProfile?.is_admin === true;

  // Load scheduled posts when switching to scheduled view (only for admins)
  React.useEffect(() => {
    if (viewMode === 'scheduled' && isAdmin) {
      loadScheduledPosts();
    }
  }, [viewMode, isAdmin, loadScheduledPosts]);

  // Pull-to-refresh handlers
  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e) => {
    if (feedContainerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (isRefreshing) return;
    if (feedContainerRef.current?.scrollTop > 0) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;

    if (distance > 0 && touchStartY.current > 0) {
      // Apply resistance to the pull
      const resistance = 0.4;
      setPullDistance(Math.min(distance * resistance, PULL_THRESHOLD * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await refreshPosts();
        // Also refresh scheduled posts if in that view
        if (viewMode === 'scheduled' && isAdmin) {
          await loadScheduledPosts();
        }
      } catch (err) {
        console.error('Error refreshing:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  // Sort posts: pinned first, then by date
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // Keep original order (already sorted by date)
  });

  const handleEditPost = (post) => {
    setEditingPost(post);
  };

  const handleSaveEdit = async (updatedData) => {
    if (updatePost) {
      await updatePost(editingPost.id, updatedData);
    }
    setEditingPost(null);
  };

  const handleEditScheduledPost = (post) => {
    setEditingScheduledPost(post);
  };

  const handleSaveScheduledEdit = async (updatedData) => {
    if (updateScheduledPost && editingScheduledPost) {
      await updateScheduledPost(editingScheduledPost.id, updatedData);
    }
    setEditingScheduledPost(null);
  };

  const handleDeleteScheduledPost = async () => {
    if (deleteScheduledPost && editingScheduledPost) {
      await deleteScheduledPost(editingScheduledPost.id);
    }
    setEditingScheduledPost(null);
  };

  // Filter posts based on search and bookmarks
  const filteredPosts = sortedPosts.filter(post => {
    // Bookmark filter
    if (showBookmarks && !isPostBookmarked(post.id)) {
      return false;
    }

    // Search filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.content?.toLowerCase().includes(query) ||
      post.author?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div style={styles.container}>
      {/* Notification Banner */}
      <NotificationBanner bellRef={bellRef} />

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Push Notification Prompt - shows if not enabled */}
      <PushNotificationPrompt />

      {/* Header - full width */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Company Feed</h1>
          <div style={styles.bellWrapper}>
            <NotificationBell bellRef={bellRef} />
          </div>
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Feed - constrained width */}
      <div
        ref={feedContainerRef}
        style={styles.feedContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div style={{
            ...styles.pullIndicator,
            height: `${pullDistance}px`,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
          }}>
            <div style={{
              ...styles.pullSpinner,
              transform: isRefreshing ? 'rotate(360deg)' : `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <span style={styles.pullText}>
              {isRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
        <div style={styles.feed}>
          {/* View Toggle (Feed/Scheduled) - Only for admins */}
          {isAdmin && (
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === 'feed' ? styles.viewToggleBtnActive : {}),
                }}
                onClick={() => setViewMode('feed')}
              >
                Feed
              </button>
              <button
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === 'scheduled' ? styles.viewToggleBtnActive : {}),
                }}
                onClick={() => setViewMode('scheduled')}
              >
                <CalendarIcon />
                Scheduled {scheduledPosts.length > 0 && `(${scheduledPosts.length})`}
              </button>
            </div>
          )}

          {/* Search Bar - Only show in feed mode */}
          {viewMode === 'feed' && (
          <div style={styles.searchRow}>
            <div style={styles.searchContainer}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <button
              style={{
                ...styles.bookmarkButton,
                ...(showBookmarks ? styles.bookmarkButtonActive : {}),
              }}
              onClick={() => setShowBookmarks(!showBookmarks)}
              title={showBookmarks ? 'Show all posts' : 'Show saved posts'}
            >
              <BookmarkIcon filled={showBookmarks} />
            </button>
          </div>
          )}

          {/* Feed View */}
          {viewMode === 'feed' && (
            <>
              {/* Loading state */}
              {loading ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : filteredPosts.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    {searchQuery ? <SearchIcon /> : showBookmarks ? <BookmarkIcon filled={false} /> : <PlusIcon />}
                  </div>
                  <h3 style={styles.emptyTitle}>
                    {searchQuery
                      ? 'No results found'
                      : showBookmarks
                      ? 'No saved posts'
                      : 'No posts yet'}
                  </h3>
                  <p style={styles.emptyText}>
                    {searchQuery
                      ? `No posts matching "${searchQuery}"`
                      : showBookmarks
                      ? 'Save posts to see them here'
                      : 'Be the first to share something with the team'}
                  </p>
                  {!searchQuery && !showBookmarks && (
                    <button style={styles.emptyButton} onClick={openCreateModal}>
                      Create Post
                    </button>
                  )}
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <Post key={post.id} post={post} currentUserId={user?.id} isAdmin={isAdmin} onEditPost={handleEditPost} />
                ))
              )}
            </>
          )}

          {/* Scheduled View */}
          {viewMode === 'scheduled' && (
            <>
              {scheduledPosts.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <CalendarIcon />
                  </div>
                  <h3 style={styles.emptyTitle}>No scheduled posts</h3>
                  <p style={styles.emptyText}>
                    Posts scheduled for the future will appear here
                  </p>
                  <button style={styles.emptyButton} onClick={openCreateModal}>
                    Schedule a Post
                  </button>
                </div>
              ) : (
                scheduledPosts.map((post) => {
                  const allMedia = [
                    ...(post.images || []).map(url => ({ url, type: 'image' })),
                    ...(post.videos || []).map(url => ({ url, type: 'video' })),
                  ];

                  return (
                    <article key={post.id} style={styles.post}>
                      {/* Scheduled Badge */}
                      <div style={styles.scheduledBadge}>
                        <ClockIcon />
                        <span>{post.scheduledTime}</span>
                      </div>

                      {/* Post Header */}
                      <div style={styles.postHeader}>
                        {post.author.avatar ? (
                          <img src={post.author.avatar} alt={post.author.name} style={styles.avatar} />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            <UserIcon />
                          </div>
                        )}
                        <div style={styles.authorInfo}>
                          <span style={styles.authorName}>{post.author.name}</span>
                          <span style={styles.authorTitle}>{post.author.title}</span>
                        </div>
                        <button
                          style={styles.editScheduledBtn}
                          onClick={() => handleEditScheduledPost(post)}
                        >
                          <EditIcon />
                        </button>
                      </div>

                      {/* Post Content */}
                      {post.content && <p style={styles.postContent}>{post.content}</p>}

                      {/* Post Media */}
                      {allMedia.length === 1 && (
                        <div style={styles.imageContainer}>
                          {allMedia[0].type === 'video' ? (
                            <video src={allMedia[0].url} style={styles.postImage} controls playsInline />
                          ) : (
                            <img src={allMedia[0].url} alt="Post" style={styles.postImage} loading="lazy" />
                          )}
                        </div>
                      )}
                      {allMedia.length > 1 && (
                        <div style={styles.carouselContainer}>
                          <Swiper
                            modules={[Pagination, Navigation]}
                            pagination={{ clickable: true }}
                            navigation
                            spaceBetween={0}
                            slidesPerView={1}
                            style={{ width: '100%' }}
                          >
                            {allMedia.map((media, i) => (
                              <SwiperSlide key={i}>
                                <div style={styles.carouselSlide}>
                                  {media.type === 'video' ? (
                                    <video src={media.url} style={styles.carouselMedia} controls playsInline />
                                  ) : (
                                    <img src={media.url} alt={`Post ${i + 1}`} style={styles.carouselMedia} loading="lazy" />
                                  )}
                                </div>
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        </div>
                      )}

                      {/* Post Links */}
                      {post.links && post.links.length > 0 && (
                        <div style={styles.postLinks}>
                          {post.links.map((link, i) => (
                            <button
                              key={i}
                              onClick={() => openInAppBrowser(link.url)}
                              style={styles.postLink}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                              {link.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Notification indicators */}
                      {post.notifyPush && (
                        <div style={styles.scheduledNotifyRow}>
                          <span style={styles.scheduledNotifyBadge}>
                            <BellIcon off={false} />
                            Push
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </>
          )}

          {/* Bottom padding for nav */}
          <div style={{ height: '100px' }} />
        </div>
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Edit Scheduled Post Modal */}
      {editingScheduledPost && (
        <EditScheduledPostModal
          post={editingScheduledPost}
          onClose={() => setEditingScheduledPost(null)}
          onSave={handleSaveScheduledEdit}
          onDelete={handleDeleteScheduledPost}
        />
      )}

      {/* Admin FAB - Create Post */}
      {isAdmin && (
        <button
          style={styles.fab}
          onClick={openCreateModal}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
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
  fab: {
    position: 'fixed',
    bottom: 'calc(90px + var(--safe-area-bottom, 0px))',
    right: '20px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(var(--primary-blue-rgb), 0.4)',
    zIndex: 999,
    transition: 'all 0.2s ease',
  },
  // Header - fixed at top
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
    position: 'relative',
  },
  bellWrapper: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  feedContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'auto',
  },
  pullIndicator: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  pullSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pullText: {
    fontSize: '13px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    textAlign: 'center',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto 16px auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.15)',
    borderRadius: '1px',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '12px',
    padding: '10px 14px',
    color: 'var(--text-muted)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '15px',
    color: 'var(--text-dark)',
  },
  bookmarkButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'all 0.2s ease',
  },
  bookmarkButtonActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  // View Toggle
  viewToggle: {
    display: 'flex',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '12px',
    padding: '4px',
    gap: '4px',
    marginBottom: '12px',
  },
  viewToggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  viewToggleBtnActive: {
    backgroundColor: '#ffffff',
    color: 'var(--primary-blue)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  // Scheduled Post Styles
  scheduledBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#dbeafe',
    color: 'var(--primary-blue)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '12px',
    width: 'fit-content',
  },
  editScheduledBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
    transition: 'all 0.2s ease',
  },
  scheduledNotifyRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  scheduledNotifyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  // Feed styles
  feed: {
    width: '100%',
    maxWidth: '600px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
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
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // Post styles
  post: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'visible',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    gap: '12px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0',
  },
  avatarPlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  authorInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  authorName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  authorTitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  timeAgo: {
    fontSize: '12px',
    color: 'var(--text-light)',
    marginRight: '8px',
  },
  // Menu styles
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'background-color 0.2s ease',
  },
  menuBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 100,
    minWidth: '200px',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#334155',
    textAlign: 'left',
    transition: 'background-color 0.2s ease',
  },
  menuItemDanger: {
    color: '#dc2626',
  },
  pinnedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: '600',
  },
  // Feedback Modal
  feedbackOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  feedbackModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  feedbackTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  feedbackSubtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 16px 0',
  },
  feedbackTextarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  feedbackButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  feedbackCancelBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  feedbackSubmitBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // Delete Modal
  deleteModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '320px',
    width: '100%',
    textAlign: 'center',
  },
  deleteIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    color: '#dc2626',
  },
  deleteTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  deleteSubtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 20px 0',
    lineHeight: '1.4',
  },
  deleteConfirmBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  postContent: {
    padding: '0 16px 16px',
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#334155',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  postLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '0 16px 12px',
  },
  postLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    color: 'var(--primary-blue)',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: 'var(--bg-light)',
  },
  carouselContainer: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  carouselSlide: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  carouselMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  postImage: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
  },
  engagementStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  likeIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#ef4444',
    transform: 'scale(0.7)',
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    borderBottom: '1px solid #f1f5f9',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  actionButtonActive: {
    color: '#ef4444',
  },
  actionButtonBookmarked: {
    color: 'var(--primary-blue)',
  },
  // Comment preview styles
  commentPreview: {
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  commentPreviewRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  commentPreviewAuthor: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  commentPreviewText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  commentPreviewMore: {
    display: 'block',
    fontSize: '13px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
    marginTop: '6px',
  },
  // Comments section styles
  commentsSection: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#fafbfc',
  },
  addCommentRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
  },
  commentInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text-dark)',
    backgroundColor: '#ffffff',
    resize: 'none',
    minHeight: '40px',
    maxHeight: '120px',
    overflow: 'auto',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  sendButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'opacity 0.2s ease',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  comment: {
    display: 'flex',
    flexDirection: 'column',
  },
  commentBubble: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  commentAuthor: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  commentTime: {
    fontSize: '11px',
    color: 'var(--text-light)',
    flex: 1,
  },
  commentDeleteBtn: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-light)',
    padding: 0,
    marginLeft: '8px',
    transition: 'all 0.2s',
  },
  commentText: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
  },
  loadMoreButton: {
    padding: '10px',
    backgroundColor: 'transparent',
    border: '1px dashed #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  noComments: {
    textAlign: 'center',
    color: 'var(--text-light)',
    fontSize: '14px',
    padding: '16px 0',
    margin: 0,
  },
  collapseButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: '500',
  },
  // Loading skeleton styles
  postSkeleton: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    padding: '16px',
  },
  skeletonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  skeletonAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--border-light)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonAuthorInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  skeletonName: {
    width: '140px',
    height: '14px',
    borderRadius: '4px',
    backgroundColor: 'var(--border-light)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonTitle: {
    width: '100px',
    height: '12px',
    borderRadius: '4px',
    backgroundColor: 'var(--border-light)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  skeletonLine: {
    width: '100%',
    height: '12px',
    borderRadius: '4px',
    backgroundColor: 'var(--border-light)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonImage: {
    width: '100%',
    height: '200px',
    borderRadius: '12px',
    backgroundColor: 'var(--border-light)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default Home;
