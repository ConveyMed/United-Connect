import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDownloads } from '../context/DownloadsContext';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const PdfIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const SheetsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </svg>
);

const PresentationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <rect x="8" y="12" width="8" height="6" />
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const StorageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const DownloadCloudIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 12 21 16 17" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
  </svg>
);

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'pdf': return <PdfIcon />;
    case 'spreadsheet': return <SheetsIcon />;
    case 'presentation': return <PresentationIcon />;
    default: return <FileIcon />;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DownloadItem = ({ item, onView, onDelete }) => {
  // Use cached thumbnail_data for offline, fall back to thumbnail_url
  const thumbnailSrc = item.thumbnail_data || item.thumbnail_url;

  return (
    <div style={styles.downloadCard}>
      <div style={styles.fileIconContainer}>
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt="" style={styles.thumbnail} />
        ) : (
          getFileIcon(item.file_type)
        )}
      </div>
      <div style={styles.downloadInfo} onClick={() => onView(item)}>
        <p style={styles.downloadTitle}>{item.title}</p>
        <p style={styles.downloadMeta}>
          {formatBytes(item.file_size)} | {formatDate(item.downloadedAt)}
        </p>
        <span style={styles.categoryBadge}>
          {item.categoryType === 'library' ? 'Library' : 'Training'}
        </span>
      </div>
      <button style={styles.deleteBtn} onClick={() => onDelete(item.id)}>
        <TrashIcon />
      </button>
    </div>
  );
};

const Downloads = () => {
  const navigate = useNavigate();
  const {
    downloads,
    loading,
    removeDownload,
    getStorageUsage,
    clearAllDownloads,
  } = useDownloads();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'library', 'training'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  const storage = getStorageUsage();

  // Filter downloads
  const filteredDownloads = downloads.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || item.categoryType === filter;
    return matchesSearch && matchesFilter;
  });

  const handleView = async (item) => {
    // Navigate to viewer with the item id
    navigate(`/view-file/${item.id}`);
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await removeDownload(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleClearAll = async () => {
    await clearAllDownloads();
    setClearConfirm(false);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Downloads</h1>
        </div>
        <div style={styles.headerBorder} />
      </header>

      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Storage Info */}
          <div style={styles.storageBar}>
            <div style={styles.storageInfo}>
              <StorageIcon />
              <span style={styles.storageText}>
                {storage.count} files | {storage.formatted}
              </span>
            </div>
            {downloads.length > 0 && (
              <button style={styles.clearBtn} onClick={() => setClearConfirm(true)}>
                Clear All
              </button>
            )}
          </div>

          {/* Search */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchIcon}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Filter Tabs */}
          <div style={styles.filterTabs}>
            {['all', 'library', 'training'].map(tab => (
              <button
                key={tab}
                style={{
                  ...styles.filterTab,
                  ...(filter === tab ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilter(tab)}
              >
                {tab === 'all' ? 'All' : tab === 'library' ? 'Library' : 'Training'}
              </button>
            ))}
          </div>

          {/* Downloads List */}
          {filteredDownloads.length > 0 ? (
            <div style={styles.downloadsList}>
              {filteredDownloads.map(item => (
                <DownloadItem
                  key={item.id}
                  item={item}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <DownloadCloudIcon />
              <h3 style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : 'No downloads yet'}
              </h3>
              <p style={styles.emptyText}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Downloaded files from Library and Training will appear here for offline access'}
              </p>
            </div>
          )}

          {/* Bottom padding for nav */}
          <div style={{ height: '100px' }} />
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Remove Download?</h2>
            <p style={styles.modalText}>
              This will remove the file from your device. You can download it again from the Library or Training section.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button style={styles.confirmDeleteBtn} onClick={confirmDelete}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation */}
      {clearConfirm && (
        <div style={styles.modalOverlay} onClick={() => setClearConfirm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Clear All Downloads?</h2>
            <p style={styles.modalText}>
              This will remove all {downloads.length} downloaded files from your device. This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setClearConfirm(false)}>
                Cancel
              </button>
              <button style={styles.confirmDeleteBtn} onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        </div>
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: 'var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  storageBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  storageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--text-muted)',
  },
  storageText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  clearBtn: {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
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
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  filterTab: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#ffffff',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterTabActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  downloadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  downloadCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  fileIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  downloadInfo: {
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  downloadTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  downloadMeta: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '2px 0 6px 0',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e0e7ff',
    color: 'var(--primary-blue)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  deleteBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#dc2626',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: 'var(--text-light)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#475569',
    margin: '16px 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    textAlign: 'center',
    lineHeight: '1.5',
    maxWidth: '280px',
  },
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
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '340px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 12px 0',
  },
  modalText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-dark)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add keyframe animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('style[data-downloads]')) {
    styleSheet.setAttribute('data-downloads', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default Downloads;
