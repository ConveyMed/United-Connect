import { useState, useEffect, useRef } from 'react';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

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

const LinkIcon = () => (
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

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckCircle = ({ checked }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={checked ? 'var(--primary-blue)' : 'none'} stroke={checked ? 'var(--primary-blue)' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    {checked && <polyline points="9 12 11 14 15 10" stroke="#ffffff" strokeWidth="2" />}
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// Format bytes to readable size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase free tier limit)

const CreatePostModal = () => {
  const { createModalOpen, closeCreateModal, addPost } = usePosts();
  const { userProfile, user } = useAuth();
  const [content, setContent] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Upload state
  const [uploadState, setUploadState] = useState(null);

  // File too large modal
  const [fileTooLarge, setFileTooLarge] = useState(null);

  // Notify members
  const [notifyPush, setNotifyPush] = useState(false);

  // Helper to get current datetime in local format for input
  const getCurrentDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Schedule post - default to current time
  const [scheduledAt, setScheduledAt] = useState(getCurrentDatetime());

  // Check if scheduled time is in the future
  const isScheduledForFuture = scheduledAt && new Date(scheduledAt) > new Date();

  // Handle open/close animation
  useEffect(() => {
    if (createModalOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [createModalOpen]);

  const clearAllMedia = () => {
    mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
    setLinks([]);
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
    setNotifyPush(false);
    setScheduledAt(getCurrentDatetime());
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkName.trim()) return;

    // Basic URL validation
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

  const removeMedia = (index) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleClose = () => {
    if (content.trim() || mediaFiles.length > 0) {
      if (!window.confirm('Discard this post?')) {
        return;
      }
    }
    setContent('');
    clearAllMedia();
    closeCreateModal();
  };

  const handleMediaSelect = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 10 - mediaFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more file(s). Max 10 total.`);
    }

    for (const file of filesToAdd) {
      if (file.size > MAX_FILE_SIZE) {
        setFileTooLarge({
          name: file.name,
          size: file.size,
          type: type,
        });
        continue;
      }

      setMediaFiles(prev => [...prev, {
        file,
        preview: URL.createObjectURL(file),
        type,
      }]);
    }

    e.target.value = '';
  };

  const uploadMedia = async (mediaItem, index, total) => {
    if (!mediaItem?.file || !user?.id) return null;

    setUploadState({ current: index + 1, total, currentFile: mediaItem.file.name });

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

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0 && links.length === 0) return;

    setUploadState({ current: 0, total: mediaFiles.length, currentFile: '' });

    try {
      let uploadedMedia = [];

      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const result = await uploadMedia(mediaFiles[i], i, mediaFiles.length);
          if (result) uploadedMedia.push(result);
        }
      }

      // If scheduledAt is empty or in the past, use null (immediate posting)
      const scheduleTime = scheduledAt && new Date(scheduledAt) > new Date()
        ? new Date(scheduledAt).toISOString()
        : null;
      await addPost(content.trim(), uploadedMedia, links, { notifyPush, scheduledAt: scheduleTime });
      setContent('');
      clearAllMedia();
      closeCreateModal();
    } catch (error) {
      console.error('Post error:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploadState(null);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  const isUploading = uploadState !== null;

  return (
    <div
      style={{
        ...styles.backdrop,
        opacity: isAnimating ? 1 : 0,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          ...styles.modal,
          transform: isAnimating
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(100%)',
        }}
      >
        {/* Handle bar */}
        <div style={styles.handleBar}>
          <div style={styles.handle} />
        </div>

        {/* Header */}
        <div style={styles.header}>
          <button style={styles.closeButton} onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </button>
          <h2 style={styles.title}>Create Post</h2>
          <button
            style={{
              ...styles.postButton,
              opacity: (content.trim() || mediaFiles.length > 0 || links.length > 0) ? 1 : 0.5,
            }}
            onClick={handlePost}
            disabled={(!content.trim() && mediaFiles.length === 0 && links.length === 0) || isUploading}
          >
            {isUploading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Scrollable body - everything below header scrolls */}
        <div style={styles.scrollBody}>

        {/* Author info */}
        <div style={styles.authorSection}>
          {userProfile?.profile_image_url ? (
            <img
              src={userProfile.profile_image_url}
              alt="Your avatar"
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              <UserIcon />
            </div>
          )}
          <div style={styles.authorInfo}>
            <span style={styles.authorName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </span>
            {userProfile?.title && (
              <span style={styles.authorTitle}>{userProfile.title}</span>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={styles.contentArea}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            disabled={isUploading}
          />

          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div style={styles.mediaGrid}>
              {mediaFiles.map((media, index) => (
                <div key={index} style={styles.mediaGridItem}>
                  {!isUploading && (
                    <button
                      style={styles.removeMediaBtn}
                      onClick={() => removeMedia(index)}
                    >
                      <XIcon />
                    </button>
                  )}
                  {media.type === 'video' ? (
                    <video
                      src={media.preview}
                      style={styles.mediaPreview}
                    />
                  ) : (
                    <img
                      src={media.preview}
                      alt={`Selected ${index + 1}`}
                      style={styles.mediaPreview}
                    />
                  )}
                  <div style={styles.fileSizeBadge}>
                    {formatFileSize(media.file.size)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div style={styles.linksContainer}>
              {links.map((link, index) => (
                <div key={index} style={styles.linkItem}>
                  <LinkIcon />
                  <span style={styles.linkText}>{link.name}</span>
                  {!isUploading && (
                    <button
                      style={styles.removeLinkBtn}
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
            <div style={styles.linkInputContainer}>
              <div style={styles.linkInputFields}>
                <input
                  type="url"
                  placeholder="Paste URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={styles.linkInput}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Name (e.g. Training Video)"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  style={styles.linkInput}
                />
              </div>
              <div style={styles.linkInputButtons}>
                <button
                  style={{
                    ...styles.linkAddBtn,
                    opacity: linkUrl.trim() && linkName.trim() ? 1 : 0.5,
                  }}
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim() || !linkName.trim()}
                >
                  Add
                </button>
                <button
                  style={styles.linkCancelBtn}
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

        {/* Notify Members */}
        <div style={styles.notifySection}>
          <span style={styles.notifyLabel}>Notify members:</span>
          <div style={styles.notifyOptions}>
            <button
              style={styles.notifyOption}
              onClick={() => setNotifyPush(!notifyPush)}
              disabled={isUploading}
            >
              <CheckCircle checked={notifyPush} />
              <BellIcon />
              <span>Push</span>
            </button>
          </div>
        </div>

        {/* Schedule Post */}
        <div style={styles.scheduleSection}>
          <div style={styles.scheduleHeader}>
            <ClockIcon />
            <span style={styles.scheduleLabel}>Schedule</span>
          </div>
          <div style={styles.scheduleInputWrapper}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={getCurrentDatetime()}
              style={styles.scheduleInput}
              disabled={isUploading}
            />
            {scheduledAt && !isScheduledForFuture && (
              <span style={styles.scheduleHint}>Posts now or in the past will be sent immediately</span>
            )}
            {isScheduledForFuture && (
              <span style={styles.scheduleConfirm}>
                Will post on {new Date(scheduledAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            style={styles.actionButton}
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageIcon />
            <span>Photo</span>
          </button>
          <button
            style={styles.actionButton}
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploading}
          >
            <VideoIcon />
            <span>Video</span>
          </button>
          <button
            style={styles.actionButton}
            onClick={() => setShowLinkInput(true)}
            disabled={isUploading || showLinkInput}
          >
            <LinkIcon />
            <span>Link</span>
          </button>
        </div>

        {/* Bottom safe area */}
        <div style={{ height: 'calc(var(--safe-area-bottom, 0px) + 16px)' }} />

        </div>{/* end scrollBody */}

        {/* Upload Progress Overlay */}
        {isUploading && (
          <div style={styles.uploadOverlay}>
            <div style={styles.uploadModal}>
              <div style={styles.uploadSpinner}>
                <div style={styles.spinner} />
              </div>
              <h3 style={styles.uploadTitle}>Uploading...</h3>
              {uploadState.total > 0 && (
                <>
                  <p style={styles.uploadText}>
                    File {uploadState.current} of {uploadState.total}
                  </p>
                  <div style={styles.uploadProgressBar}>
                    <div
                      style={{
                        ...styles.uploadProgressFill,
                        width: `${(uploadState.current / uploadState.total) * 100}%`,
                      }}
                    />
                  </div>
                  {uploadState.currentFile && (
                    <p style={styles.uploadFileName}>{uploadState.currentFile}</p>
                  )}
                </>
              )}
              {uploadState.total === 0 && (
                <p style={styles.uploadText}>Creating your post...</p>
              )}
            </div>
          </div>
        )}

        {/* File Too Large Modal */}
        {fileTooLarge && (
          <div style={styles.errorOverlay}>
            <div style={styles.errorModal}>
              <div style={styles.errorIcon}>
                <AlertIcon />
              </div>
              <h3 style={styles.errorTitle}>File Too Large</h3>
              <p style={styles.errorText}>
                <strong>{fileTooLarge.name}</strong> is {formatFileSize(fileTooLarge.size)}.
              </p>
              <p style={styles.errorText}>
                The maximum file size is <strong>50MB</strong>.
              </p>
              <div style={styles.errorTip}>
                <strong>Options:</strong>
                <ul style={styles.errorList}>
                  <li>Use a free tool like HandBrake to compress your {fileTooLarge.type}</li>
                  <li>Upload to YouTube, Vimeo, or Google Drive and paste the link in your post</li>
                  <li>Trim or resize your {fileTooLarge.type} to reduce file size</li>
                </ul>
              </div>
              <button
                style={styles.errorButton}
                onClick={() => setFileTooLarge(null)}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
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
    maxHeight: 'calc(100dvh - 100px - env(safe-area-inset-bottom, 0px))',
    overflow: 'hidden',
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
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  postButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  authorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
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
  scrollBody: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
    WebkitOverflowScrolling: 'touch',
  },
  contentArea: {
    padding: '0 16px',
    minHeight: '120px',
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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
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
  fileSizeBadge: {
    position: 'absolute',
    bottom: '2px',
    left: '2px',
    padding: '2px 4px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '3px',
    fontSize: '9px',
    color: '#ffffff',
    fontWeight: '500',
  },
  // Link styles
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
  // Notify Members
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
    transition: 'all 0.2s ease',
  },
  // Schedule styles
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
  scheduleInputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  scheduleInput: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    color: 'var(--text-dark)',
    backgroundColor: 'var(--background-off-white)',
    outline: 'none',
    cursor: 'pointer',
  },
  scheduleHint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  scheduleConfirm: {
    fontSize: '13px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
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
    padding: '12px 18px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  // Upload Overlay
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    borderRadius: '24px',
  },
  uploadModal: {
    padding: '32px 24px',
    textAlign: 'center',
    maxWidth: '280px',
  },
  uploadSpinner: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 12px 0',
  },
  uploadText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 12px 0',
  },
  uploadProgressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--border-light)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: 'var(--primary-blue)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  uploadFileName: {
    fontSize: '12px',
    color: 'var(--text-light)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Error Modal Styles
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 100,
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    paddingTop: '40px',
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  errorModal: {
    textAlign: 'center',
    width: '100%',
  },
  errorIcon: {
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
  errorTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  errorText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 4px 0',
    lineHeight: '1.4',
  },
  errorTip: {
    backgroundColor: 'var(--bg-light)',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '12px',
    color: '#475569',
    lineHeight: '1.4',
    textAlign: 'left',
    marginTop: '12px',
  },
  errorList: {
    margin: '6px 0 0 0',
    paddingLeft: '16px',
  },
  errorButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
  },
};

export default CreatePostModal;
