import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, set, del, keys, entries } from 'idb-keyval';
import { useAuth } from './AuthContext';

const DownloadsContext = createContext({});

export const useDownloads = () => {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
};

// File type detection
const getFileType = (url, fileName) => {
  const ext = (fileName || url || '').split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  return 'file';
};

export const DownloadsProvider = ({ children }) => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState([]);
  const [downloading, setDownloading] = useState({}); // { contentId: progress 0-100 }
  const [loading, setLoading] = useState(true);

  // Load downloads from IndexedDB on mount
  useEffect(() => {
    loadDownloads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadDownloads = async () => {
    if (!user?.id) {
      setDownloads([]);
      setLoading(false);
      return;
    }

    try {
      const allEntries = await entries();
      const userDownloads = allEntries
        .filter(([key]) => key.startsWith(`download_${user.id}_`))
        .map(([key, value]) => ({
          ...value,
          key,
        }))
        .sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));

      setDownloads(userDownloads);
    } catch (err) {
      console.error('Error loading downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download a file and store it locally
  const downloadFile = useCallback(async (contentItem) => {
    if (!user?.id || !contentItem.file_url) return false;

    const contentId = contentItem.id;
    const key = `download_${user.id}_${contentId}`;

    // Check if already downloaded
    const existing = await get(key);
    if (existing) {
      return true; // Already downloaded
    }

    // Start download
    setDownloading(prev => ({ ...prev, [contentId]: 0 }));

    try {
      // Fetch the file
      const response = await fetch(contentItem.file_url);

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10) || 0;

      // Read the response as a stream to track progress
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          const progress = Math.round((received / total) * 100);
          setDownloading(prev => ({ ...prev, [contentId]: progress }));
        } else {
          // If no content-length, show indeterminate progress
          setDownloading(prev => ({ ...prev, [contentId]: -1 }));
        }
      }

      // Combine chunks into a blob
      const blob = new Blob(chunks);

      // Convert blob to base64 for storage
      const base64 = await blobToBase64(blob);

      // Also cache the thumbnail for offline use
      let thumbnailData = null;
      if (contentItem.thumbnail_url) {
        try {
          const thumbResponse = await fetch(contentItem.thumbnail_url);
          if (thumbResponse.ok) {
            const thumbBlob = await thumbResponse.blob();
            thumbnailData = await blobToBase64(thumbBlob);
          }
        } catch (e) {
          console.log('Could not cache thumbnail:', e);
        }
      }

      // Store in IndexedDB
      const downloadData = {
        id: contentId,
        title: contentItem.title,
        description: contentItem.description,
        thumbnail_url: contentItem.thumbnail_url,
        thumbnail_data: thumbnailData, // Cached thumbnail for offline
        file_url: contentItem.file_url,
        file_name: contentItem.file_name,
        file_data: base64,
        file_size: blob.size,
        file_type: getFileType(contentItem.file_url, contentItem.file_name),
        mime_type: blob.type || 'application/octet-stream',
        categoryTitle: contentItem.categoryTitle,
        categoryType: contentItem.categoryType,
        downloadedAt: new Date().toISOString(),
      };

      await set(key, downloadData);

      // Update local state
      setDownloads(prev => [downloadData, ...prev]);
      setDownloading(prev => {
        const next = { ...prev };
        delete next[contentId];
        return next;
      });

      return true;
    } catch (err) {
      console.error('Error downloading file:', err);
      setDownloading(prev => {
        const next = { ...prev };
        delete next[contentId];
        return next;
      });
      return false;
    }
  }, [user?.id]);

  // Remove a download
  const removeDownload = useCallback(async (contentId) => {
    if (!user?.id) return;

    const key = `download_${user.id}_${contentId}`;

    try {
      await del(key);
      setDownloads(prev => prev.filter(d => d.id !== contentId));
    } catch (err) {
      console.error('Error removing download:', err);
    }
  }, [user?.id]);

  // Check if a file is downloaded
  const isDownloaded = useCallback((contentId) => {
    return downloads.some(d => d.id === contentId);
  }, [downloads]);

  // Get download progress for a content item
  const getDownloadProgress = useCallback((contentId) => {
    return downloading[contentId];
  }, [downloading]);

  // Get a downloaded file's data
  const getDownloadedFile = useCallback(async (contentId) => {
    if (!user?.id) return null;

    const key = `download_${user.id}_${contentId}`;
    const data = await get(key);
    return data;
  }, [user?.id]);

  // Open/view a downloaded file
  const openDownloadedFile = useCallback(async (contentId) => {
    const data = await getDownloadedFile(contentId);
    if (!data) return null;

    // Convert base64 back to blob
    const blob = base64ToBlob(data.file_data, data.mime_type);
    const url = URL.createObjectURL(blob);

    return { url, data };
  }, [getDownloadedFile]);

  // Get storage usage
  const getStorageUsage = useCallback(() => {
    const totalBytes = downloads.reduce((sum, d) => sum + (d.file_size || 0), 0);
    return {
      bytes: totalBytes,
      formatted: formatBytes(totalBytes),
      count: downloads.length,
    };
  }, [downloads]);

  // Clear all downloads
  const clearAllDownloads = useCallback(async () => {
    if (!user?.id) return;

    try {
      const allKeys = await keys();
      const userKeys = allKeys.filter(key => key.startsWith(`download_${user.id}_`));

      for (const key of userKeys) {
        await del(key);
      }

      setDownloads([]);
    } catch (err) {
      console.error('Error clearing downloads:', err);
    }
  }, [user?.id]);

  const value = {
    downloads,
    loading,
    downloading,
    downloadFile,
    removeDownload,
    isDownloaded,
    getDownloadProgress,
    getDownloadedFile,
    openDownloadedFile,
    getStorageUsage,
    clearAllDownloads,
    loadDownloads,
  };

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
};

// Helper: Convert Blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Convert Base64 to Blob
const base64ToBlob = (base64, mimeType) => {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
};

// Helper: Format bytes to human readable
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
