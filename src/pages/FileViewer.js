import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { renderAsync } from 'docx-preview';
import { useDownloads } from '../context/DownloadsContext';
import { openInAppBrowser } from '../utils/browser';

// PDF viewer styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const FileIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// PDF Viewer Component
const PDFViewer = ({ fileUrl }) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [defaultTabs[0]], // Only show thumbnails tab
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--text-dark)',
      }}
    >
      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
          theme="dark"
        />
      </Worker>
    </div>
  );
};

// Excel/Spreadsheet Viewer Component
const SpreadsheetViewer = ({ fileUrl, fileName }) => {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSpreadsheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  const loadSpreadsheet = async () => {
    try {
      setLoading(true);
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsedSheets = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
        return { name, html };
      });

      setSheets(parsedSheets);
    } catch (err) {
      console.error('Error loading spreadsheet:', err);
      setError('Failed to load spreadsheet. Please delete and reinstall the app before contacting support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading spreadsheet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.spreadsheetContainer}>
      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <div style={styles.sheetTabs}>
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              style={{
                ...styles.sheetTab,
                ...(activeSheet === index ? styles.sheetTabActive : {}),
              }}
              onClick={() => setActiveSheet(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Sheet Content */}
      <div style={styles.sheetContent}>
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(sheets[activeSheet]?.html || '', {
              FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
              FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'href'],
            }),
          }}
          style={styles.spreadsheetHtml}
        />
      </div>
    </div>
  );
};

// Word Document Viewer Component
const DocumentViewer = ({ fileUrl }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, containerRef.current, null, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document. Please delete and reinstall the app before contacting support.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.documentContainer}>
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading document...</p>
        </div>
      )}
      <div ref={containerRef} style={styles.documentContent} />
    </div>
  );
};

// Main FileViewer Component
const FileViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openDownloadedFile } = useDownloads();

  const [fileData, setFileData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const loadFile = async () => {
    try {
      setLoading(true);
      const result = await openDownloadedFile(id);

      if (!result) {
        setError('File not found');
        return;
      }

      setFileData(result.data);
      setFileUrl(result.url);
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Failed to load file. Please delete and reinstall the app before contacting support.');
    } finally {
      setLoading(false);
    }
  };

  const handleExternalOpen = () => {
    if (fileUrl) {
      openInAppBrowser(fileUrl);
    }
  };

  const renderContent = () => {
    if (!fileData || !fileUrl) return null;

    switch (fileData.file_type) {
      case 'pdf':
        return <PDFViewer fileUrl={fileUrl} />;

      case 'spreadsheet':
        return <SpreadsheetViewer fileUrl={fileUrl} fileName={fileData.file_name} />;

      case 'document':
        return <DocumentViewer fileUrl={fileUrl} />;

      case 'image':
        return (
          <div style={styles.imageContainer}>
            <img src={fileUrl} alt={fileData.title} style={styles.image} />
          </div>
        );

      case 'video':
        return (
          <div style={styles.videoContainer}>
            <video src={fileUrl} controls style={styles.video} />
          </div>
        );

      case 'presentation':
      default:
        // For presentations and unknown files, show a preview card
        return (
          <div style={styles.officeContainer}>
            <div style={styles.officeCard}>
              <FileIcon />
              <h3 style={styles.officeTitle}>{fileData.title}</h3>
              <p style={styles.officeFileName}>{fileData.file_name}</p>
              <p style={styles.officeNote}>
                {fileData.file_type === 'presentation'
                  ? 'PowerPoint files open in your default app'
                  : 'This file will open in your default app'}
              </p>
              <button style={styles.openExternalBtn} onClick={handleExternalOpen}>
                <ExternalLinkIcon />
                <span>Open File</span>
              </button>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Error</h1>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryBtn} onClick={() => navigate('/downloads')}>
            Back to Downloads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>
          {fileData?.title?.length > 25
            ? fileData.title.substring(0, 25) + '...'
            : fileData?.title}
        </h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        {renderContent()}
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    backgroundColor: 'var(--text-dark)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
    backgroundColor: '#0f172a',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  backBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#ffffff',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    textAlign: 'center',
    flex: 1,
    padding: '0 12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '16px',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    zIndex: 10,
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--text-light)',
    fontSize: '14px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '16px',
    padding: '20px',
  },
  errorText: {
    color: '#f87171',
    fontSize: '16px',
  },
  retryBtn: {
    padding: '12px 24px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  contentContainer: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  // Spreadsheet styles
  spreadsheetContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  sheetTabs: {
    display: 'flex',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-light)',
    borderBottom: '1px solid #e2e8f0',
    overflowX: 'auto',
  },
  sheetTab: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  sheetTabActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    borderColor: 'var(--primary-blue)',
  },
  sheetContent: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  },
  spreadsheetHtml: {
    fontSize: '13px',
  },
  // Document styles
  documentContainer: {
    flex: 1,
    backgroundColor: 'var(--background-off-white)',
    overflow: 'auto',
    position: 'relative',
  },
  documentContent: {
    padding: '20px',
    minHeight: '100%',
  },
  // Image styles
  imageContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    flex: 1,
  },
  image: {
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 100px)',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  // Video styles
  videoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    flex: 1,
  },
  video: {
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 100px)',
    borderRadius: '8px',
  },
  // Office/fallback styles
  officeContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '20px',
  },
  officeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: '320px',
    width: '100%',
  },
  officeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '16px 0 8px 0',
  },
  officeFileName: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 16px 0',
    wordBreak: 'break-all',
  },
  officeNote: {
    fontSize: '14px',
    color: 'var(--text-light)',
    lineHeight: '1.4',
    margin: '0 0 24px 0',
  },
  openExternalBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
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

// Add global styles for spreadsheet tables
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .spreadsheetHtml table {
    border-collapse: collapse;
    width: 100%;
  }
  .spreadsheetHtml td, .spreadsheetHtml th {
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    text-align: left;
  }
  .spreadsheetHtml th {
    background-color: #f1f5f9;
    font-weight: 600;
  }
  .spreadsheetHtml tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* docx-preview styles */
  .docx-wrapper {
    background: white;
    padding: 20px;
  }
  .docx-wrapper > section.docx {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    padding: 40px;
    background: white;
  }
`;
document.head.appendChild(styleSheet);

export default FileViewer;
