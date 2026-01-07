/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📱 PWA HOOK - Progressive Web App Utilities                                       ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Install prompt management                                                │   ║
 * ║   │  ✅ Service worker registration and updates                                  │   ║
 * ║   │  ✅ Online/offline detection                                                 │   ║
 * ║   │  ✅ Push notification subscription                                           │   ║
 * ║   │  ✅ Background sync registration                                             │   ║
 * ║   │  ✅ App update notifications                                                 │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Global flag to prevent multiple service worker registrations
let swRegistered = false;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  swVersion: string | null;
}

interface UsePWAReturn extends PWAState {
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  registerBackgroundSync: (tag: string) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  getSwVersion: () => Promise<string | null>;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    isPushSupported: false,
    isPushSubscribed: false,
    swVersion: null
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      setState(prev => ({ ...prev, isInstalled: isStandalone || isIosStandalone }));
    };

    checkInstalled();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled);

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkInstalled);
    };
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
      console.log('PWA installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker (only once globally)
  useEffect(() => {
    if ('serviceWorker' in navigator && !swRegistered) {
      swRegistered = true; // Mark as registered immediately to prevent race conditions
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setSwRegistration(registration);
          console.log('Service Worker registered successfully');

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              });
            }
          });

          // Check push support
          if ('PushManager' in window) {
            setState(prev => ({ ...prev, isPushSupported: true }));
            
            registration.pushManager.getSubscription().then((subscription) => {
              setState(prev => ({ ...prev, isPushSubscribed: !!subscription }));
            });
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  // Install app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update app
  const updateApp = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [swRegistration]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!swRegistration || !('PushManager' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      // In production, get VAPID key from server
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
      
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      console.log('Push subscription:', JSON.stringify(subscription));
      
      setState(prev => ({ ...prev, isPushSubscribed: true }));
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }, [swRegistration]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!swRegistration) {
      return false;
    }

    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setState(prev => ({ ...prev, isPushSubscribed: false }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }, [swRegistration]);

  // Register background sync
  const registerBackgroundSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!swRegistration || !('sync' in swRegistration)) {
      return false;
    }

    try {
      await (swRegistration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, [swRegistration]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.success || false);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }, []);

  // Get service worker version
  const getSwVersion = useCallback(async (): Promise<string | null> => {
    if (!navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        const version = event.data?.version || null;
        setState(prev => ({ ...prev, swVersion: version }));
        resolve(version);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }, []);

  return {
    ...state,
    installApp,
    updateApp,
    subscribeToPush,
    unsubscribeFromPush,
    registerBackgroundSync,
    clearCache,
    getSwVersion
  };
}

// Helper function
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePWA;







