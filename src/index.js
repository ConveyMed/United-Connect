import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Setup safe areas based on platform
const setupSafeAreas = async () => {
  const platform = Capacitor.getPlatform();
  const root = document.documentElement;

  if (platform === 'ios') {
    // iOS: Use native env() values
    root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');
  } else if (platform === 'android') {
    // Android: Configure status bar and set defaults
    // MainActivity.java will inject actual values via --safe-area-top/bottom
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.log('StatusBar setup error:', e);
    }
    // Set safe defaults until MainActivity injects real values
    root.style.setProperty('--safe-area-top', '28px');
    root.style.setProperty('--safe-area-bottom', '45px');
    root.style.setProperty('--safe-area-left', '0px');
    root.style.setProperty('--safe-area-right', '0px');
  }
  // Web: defaults (0px) from CSS are fine
};

// Run setup
setupSafeAreas();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for offline support (web only)
if ('serviceWorker' in navigator && Capacitor.getPlatform() === 'web') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
