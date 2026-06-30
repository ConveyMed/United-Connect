import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const OfflineContext = createContext({});

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      // Web: use navigator.onLine + events
      const handleOnline = () => {
        setIsOffline(false);
        // Track that we came back online (for showing "back online" message)
        if (wasOffline) {
          setTimeout(() => setWasOffline(false), 3000);
        }
      };

      const handleOffline = () => {
        setIsOffline(true);
        setWasOffline(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Native (iOS/Android): use Capacitor Network plugin
      const setupNativeNetwork = async () => {
        try {
          const { Network } = await import('@capacitor/network');

          // Get initial status
          const status = await Network.getStatus();
          setIsOffline(!status.connected);

          // Listen for changes
          Network.addListener('networkStatusChange', (status) => {
            const offline = !status.connected;
            if (!offline && isOffline) {
              setWasOffline(true);
              setTimeout(() => setWasOffline(false), 3000);
            }
            setIsOffline(offline);
          });
        } catch (e) {
          // Network plugin not available, fall back to navigator.onLine
          console.log('Capacitor Network plugin not available, using navigator.onLine');
        }
      };

      setupNativeNetwork();
    }
  }, [wasOffline, isOffline]);

  const value = {
    isOffline,
    wasOffline,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};
