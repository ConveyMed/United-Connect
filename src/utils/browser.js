import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * Opens a URL in the in-app browser (iOS/Android) or new tab (web)
 * This keeps users within the app experience on mobile
 */
export const openInAppBrowser = async (url) => {
  if (!url) return;

  // Ensure URL has protocol
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = 'https://' + url;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      // Native: Use Capacitor Browser (SFSafariViewController / Chrome Custom Tabs)
      await Browser.open({
        url: fullUrl,
        presentationStyle: 'popover', // iOS: shows as overlay
        toolbarColor: '#4CAC87', // United Green
      });
    } else {
      // Web: Open in new tab
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error('Error opening browser:', error);
    // Fallback to window.open
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Close the in-app browser (if open)
 */
export const closeInAppBrowser = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.close();
    }
  } catch (error) {
    console.error('Error closing browser:', error);
  }
};
