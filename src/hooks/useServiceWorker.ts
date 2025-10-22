import { useState, useEffect } from 'react';

interface ServiceWorkerUpdate {
  available: boolean;
  installing: boolean;
  waiting: boolean;
}

export const useServiceWorker = () => {
  const [updateAvailable, setUpdateAvailable] = useState<ServiceWorkerUpdate>({
    available: false,
    installing: false,
    waiting: false
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        setUpdateAvailable(prev => ({ ...prev, installing: true }));
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                setUpdateAvailable({
                  available: true,
                  installing: false,
                  waiting: true
                });
              }
            }
          });
        }
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const skipWaiting = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
      window.location.reload();
    }
  };

  return {
    updateAvailable,
    isOnline,
    skipWaiting
  };
};