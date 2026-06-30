import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useContent } from '../context/ContentContext';
import { useDownloads } from '../context/DownloadsContext';
import { useAnalytics } from '../context/AnalyticsContext';
import { openInAppBrowser } from '../utils/browser';
import { getSecureEmbedUrl, getBunnyVideoStatus } from '../services/bunnyVideo';
import { supabase } from '../config/supabase';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const DownloadIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const QuizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const VideoBadgeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const OfflineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
    <path d="M7 3.34V5a3 3 0 0 0 3 3h0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17" />
    <path d="M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

// Download Progress Circle
const ProgressCircle = ({ progress }) => {
  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={styles.progressCircleContainer}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progress === -1 ? 0 : offset}
          strokeLinecap="round"
          style={progress === -1 ? { animation: 'spin 1s linear infinite' } : {}}
        />
      </svg>
      <span style={styles.progressText}>
        {progress === -1 ? '...' : `${progress}%`}
      </span>
    </div>
  );
};

// Content Thumbnail Card
const ContentCard = ({ item, onClick, isDownloaded, downloadProgress }) => {
  const isDownloading = downloadProgress !== undefined;

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            style={styles.thumbnail}
            loading="lazy"
          />
        ) : (
          <div style={styles.thumbnailPlaceholder}>
            <FileIcon />
          </div>
        )}
        {isDownloading && (
          <div style={styles.downloadingOverlay}>
            <ProgressCircle progress={downloadProgress} />
          </div>
        )}
        {!isDownloading && isDownloaded && (
          <div style={styles.downloadedBadge}>
            <CheckIcon />
          </div>
        )}
        {item.bunny_video_id && (
          <div style={styles.videoBadge}>
            <VideoBadgeIcon />
          </div>
        )}
      </div>
      <p style={styles.cardTitle}>{item.title}</p>
    </div>
  );
};

// Category Section
const CategorySection = ({ category, onItemClick, isDownloaded, getDownloadProgress }) => {
  return (
    <div style={styles.categorySection}>
      <h3 style={styles.categoryTitle}>{category.title}</h3>
      <div style={styles.horizontalScroll}>
        {category.items.map(item => (
          <ContentCard
            key={item.id}
            item={item}
            onClick={() => onItemClick({ ...item, categoryTitle: category.title, categoryType: category.type })}
            isDownloaded={isDownloaded(item.id)}
            downloadProgress={getDownloadProgress(item.id)}
          />
        ))}
        {category.items.length === 0 && (
          <p style={styles.emptyCategory}>No content yet</p>
        )}
      </div>
    </div>
  );
};

// Expanded Content Modal
const ContentModal = ({ item, onClose, isDownloaded, onDownload, downloadProgress, onAssetEvent }) => {
  const modalRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const scrollYRef = React.useRef(0);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (item) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.width = '100%';

      // Reset video state when item changes
      setShowVideoPlayer(false);
      setVideoEmbedUrl('');
      setVideoStatus(item?.bunny_video_status || null);

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [item]);

  // Poll for video status when processing or uploading (check immediately, then every 15s)
  React.useEffect(() => {
    if (!item?.bunny_video_id || (videoStatus !== 'processing' && videoStatus !== 'uploading')) return;

    const checkStatus = async () => {
      try {
        const result = await getBunnyVideoStatus(item.bunny_video_id);
        if (result.status === 'ready') {
          setVideoStatus('ready');
          clearInterval(interval);
          // Persist to Supabase so we don't poll next time
          supabase.from('content_items')
            .update({ bunny_video_status: 'ready' })
            .eq('id', item.id)
            .then(() => {});
        }
      } catch (err) {
        console.error('Error polling video status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);

    return () => clearInterval(interval);
  }, [item?.bunny_video_id, videoStatus]);

  // Prevent touch scroll on overlay (allow only on modal)
  const handleTouchMove = React.useCallback((e) => {
    if (modalRef.current && modalRef.current.contains(e.target)) {
      // Allow scrolling inside modal
      return;
    }
    e.preventDefault();
  }, []);

  const handlePlayVideo = useCallback(async () => {
    if (!item?.bunny_video_id) return;
    setVideoLoading(true);
    try {
      const embedUrl = await getSecureEmbedUrl(item.bunny_video_id);
      setVideoEmbedUrl(embedUrl);
      setShowVideoPlayer(true);
      onAssetEvent && onAssetEvent('video_play');
    } catch (err) {
      console.error('Error getting embed URL:', err);
      alert('Failed to load video. Please try again.');
    } finally {
      setVideoLoading(false);
    }
  }, [item?.bunny_video_id, onAssetEvent]);

  if (!item) return null;

  const isDownloading = downloadProgress !== undefined;
  const isVideoReady = item.bunny_video_id && (videoStatus === 'ready' || item.bunny_video_status === 'ready');
  const isVideoProcessing = item.bunny_video_id && !isVideoReady;

  return ReactDOM.createPortal(
    <>
      <div
        ref={overlayRef}
        style={styles.modalOverlay}
        onClick={onClose}
        onTouchMove={handleTouchMove}
      >
        <div ref={modalRef} style={styles.modal} onClick={e => e.stopPropagation()}>
          {/* Close button */}
          <button style={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>

          {/* Large thumbnail */}
          <div style={styles.modalThumbnailContainer}>
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.title}
                style={styles.modalThumbnail}
                loading="lazy"
              />
            ) : (
              <div style={styles.modalThumbnailPlaceholder}>
                <FileIcon />
              </div>
            )}
            {isDownloading && (
              <div style={styles.modalDownloadingOverlay}>
                <ProgressCircle progress={downloadProgress} />
                <p style={styles.downloadingText}>Downloading for offline use...</p>
              </div>
            )}
          </div>

          {/* Title */}
          <h2 style={styles.modalTitle}>{item.title}</h2>

          {/* Timestamp */}
          <p style={styles.modalTimestamp}>
            Added {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          {/* Downloaded indicator */}
          {isDownloaded && !isDownloading && (
            <div style={styles.offlineReadyBadge}>
              <OfflineIcon />
              <span>Available Offline</span>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p style={styles.modalDescription}>{item.description}</p>
          )}

          {/* Action Buttons - Order: Document, Link, Quiz, Video */}
          <div style={styles.actionButtons}>
            {/* View File / Document */}
            {item.file_url && (
              <button
                onClick={() => {
                  onAssetEvent && onAssetEvent('file_click');
                  openInAppBrowser(item.file_url);
                }}
                style={styles.actionBtn}
              >
                <FileIcon />
                <span>{item.file_name || 'View File'}</span>
              </button>
            )}

            {/* External Link */}
            {item.external_link && (
              <button
                onClick={() => {
                  onAssetEvent && onAssetEvent('link_click');
                  openInAppBrowser(item.external_link);
                }}
                style={styles.actionBtn}
              >
                <LinkIcon />
                <span>{item.external_link_label || 'View Link'}</span>
              </button>
            )}

            {/* Quiz Link */}
            {item.quiz_link && (
              <button
                onClick={() => {
                  onAssetEvent && onAssetEvent('quiz_click');
                  openInAppBrowser(item.quiz_link);
                }}
                style={styles.actionBtn}
              >
                <QuizIcon />
                <span>{item.quiz_link_label || 'Take Quiz'}</span>
              </button>
            )}

            {/* Private Video */}
            {isVideoReady && (
              <button
                onClick={handlePlayVideo}
                style={styles.videoActionBtn}
                disabled={videoLoading}
              >
                <PlayIcon />
                <span>{videoLoading ? 'Loading...' : 'Private Video'}</span>
              </button>
            )}
            {isVideoProcessing && (
              <button
                style={styles.videoProcessingBtn}
                disabled
              >
                <LockIcon />
                <span>Video recently added - processing</span>
              </button>
            )}
          </div>

          {/* Download Button */}
          {item.is_downloadable && item.file_url && (
            <button
              style={{
                ...styles.downloadBtn,
                ...(isDownloaded && !isDownloading ? styles.downloadBtnDownloaded : {}),
                ...(isDownloading ? styles.downloadBtnDownloading : {}),
              }}
              onClick={onDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <ProgressCircle progress={downloadProgress} />
                  <span>Downloading... {downloadProgress !== -1 ? `${downloadProgress}%` : ''}</span>
                </>
              ) : isDownloaded ? (
                <>
                  <CheckIcon />
                  <span>Downloaded - Available Offline</span>
                </>
              ) : (
                <>
                  <DownloadIcon filled={false} />
                  <span>Download for Offline Use</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Full-screen Video Player Overlay */}
      {showVideoPlayer && (
        <div
          style={styles.videoPlayerOverlay}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            style={styles.videoCloseBtn}
            onClick={() => setShowVideoPlayer(false)}
          >
            <CloseIcon />
          </button>
          <div style={styles.videoPlayerContainer}>
            <iframe
              src={videoEmbedUrl}
              style={styles.videoIframe}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Private Video"
            />
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

// Main Component
const ContentLibraryScreen = ({ type, title, hideHeader }) => {
  const {
    libraryCategories,
    trainingCategories,
    formsCategories,
    loading: contentLoading,
    refreshContent,
  } = useContent();

  const {
    downloadFile,
    isDownloaded,
    getDownloadProgress,
  } = useDownloads();

  const { trackAssetEvent } = useAnalytics();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Refresh content when screen mounts
  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  // Get categories based on type
  const categories = type === 'library' ? libraryCategories : type === 'forms' ? formsCategories : trainingCategories;

  // Add type to each category for reference
  const categoriesWithType = categories.map(c => ({ ...c, type }));

  // Filter categories/items by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithType;

    const query = searchQuery.toLowerCase();
    return categoriesWithType.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      ),
    })).filter(category => category.items.length > 0);
  }, [categoriesWithType, searchQuery]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    // Track that user opened/viewed this asset
    trackAssetEvent(item.id, item.title, item.categoryTitle, item.categoryType, 'view');
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleDownload = async () => {
    if (!selectedItem) return;

    const success = await downloadFile(selectedItem);
    if (!success) {
      alert('Failed to download file. Please try again.');
    }
  };

  const selectedItemProgress = selectedItem ? getDownloadProgress(selectedItem.id) : undefined;
  const selectedItemDownloaded = selectedItem ? isDownloaded(selectedItem.id) : false;

  if (contentLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}>
            <div style={styles.spinnerInner} />
          </div>
          <p style={styles.loadingText}>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      {!hideHeader && (
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <h1 style={styles.headerTitle}>{title}</h1>
          </div>
          <div style={styles.headerBorder} />
        </header>
      )}

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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Categories */}
          {filteredCategories.length > 0 ? (
            filteredCategories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                onItemClick={handleItemClick}
                isDownloaded={isDownloaded}
                getDownloadProgress={getDownloadProgress}
              />
            ))
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                {searchQuery ? 'No results found' : 'No content available yet'}
              </p>
            </div>
          )}

          {/* Bottom padding for nav */}
          <div style={{ height: '100px' }} />
        </div>
      </div>

      {/* Content Modal */}
      <ContentModal
        item={selectedItem}
        onClose={handleCloseModal}
        isDownloaded={selectedItemDownloaded}
        onDownload={handleDownload}
        downloadProgress={selectedItemProgress}
        onAssetEvent={(eventType) => {
          if (selectedItem) {
            trackAssetEvent(
              selectedItem.id,
              selectedItem.title,
              selectedItem.categoryTitle,
              selectedItem.categoryType,
              eventType
            );
          }
        }}
      />
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
    backgroundColor: '#f8fafc',
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
    color: '#1e40af',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto 16px auto',
    height: '2px',
    backgroundColor: 'rgba(30, 64, 175, 0.15)',
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
  },

  // Search
  searchWrapper: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '15px',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
  },

  // Category Section
  categorySection: {
    marginBottom: '24px',
  },
  categoryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
    paddingBottom: '4px',
    borderBottom: '2px solid #1e40af',
    display: 'inline-block',
  },
  horizontalScroll: {
    display: 'flex',
    overflowX: 'auto',
    gap: '12px',
    paddingBottom: '8px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  emptyCategory: {
    color: '#94a3b8',
    fontSize: '14px',
    fontStyle: 'italic',
  },

  // Content Card
  card: {
    flexShrink: 0,
    width: '120px',
    cursor: 'pointer',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: '8px',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 64, 175, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.3',
  },

  // Progress Circle
  progressCircleContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '15px',
  },

  // Modal
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
    zIndex: 2000,
    padding: '20px',
    paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
    touchAction: 'none',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    zIndex: 10,
  },
  modalThumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: '16px',
  },
  modalThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  modalThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  modalDownloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 64, 175, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  downloadingText: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  modalTimestamp: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  offlineReadyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '12px',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
  },

  // Action Buttons
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    color: '#1e293b',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },

  // Download Button
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#1e40af',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  downloadBtnDownloaded: {
    backgroundColor: '#10b981',
  },
  downloadBtnDownloading: {
    backgroundColor: '#1e40af',
    cursor: 'not-allowed',
  },

  // Video badge on thumbnails
  videoBadge: {
    position: 'absolute',
    bottom: '6px',
    left: '6px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'rgba(30, 64, 175, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },

  // Video action buttons
  videoActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#1e40af',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  videoProcessingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    cursor: 'not-allowed',
    width: '100%',
    textAlign: 'left',
  },

  // Video player overlay
  videoPlayerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCloseBtn: {
    position: 'absolute',
    top: 'calc(16px + env(safe-area-inset-top, 0px))',
    right: '16px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    zIndex: 10,
  },
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    maxWidth: '1200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 16px 16px 16px',
    boxSizing: 'border-box',
  },
  videoIframe: {
    width: '100%',
    aspectRatio: '16 / 9',
    maxHeight: '100%',
    border: 'none',
    borderRadius: '8px',
  },

  // Spinner
  spinner: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerInner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#1e40af',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Add keyframes for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('style[data-content-library]')) {
    styleSheet.setAttribute('data-content-library', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default ContentLibraryScreen;
