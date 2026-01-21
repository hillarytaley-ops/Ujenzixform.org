import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Offline Status Indicator Component
 * Shows network status and provides sync functionality
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      toast({
        title: '🌐 Back Online',
        description: 'Your connection has been restored. Syncing data...',
      });
      
      // Auto-hide after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
      
      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-orders');
          registration.sync.register('sync-cart');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      toast({
        title: '📴 You\'re Offline',
        description: 'Don\'t worry, you can still browse cached content.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner initially if offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot Sync',
        description: 'Please connect to the internet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      // Trigger sync via service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-orders');
          await (registration as any).sync.register('sync-cart');
        }
      }
      
      toast({
        title: '✅ Sync Complete',
        description: 'Your data has been synchronized.',
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync Failed',
        description: 'Could not sync data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  // Don't show anything if online and banner dismissed
  if (isOnline && !showBanner) {
    return null;
  }

  return (
    <>
      {/* Floating offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </div>
        </div>
      )}

      {/* Banner notification */}
      {showBanner && (
        <div 
          className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
            isOnline 
              ? 'bg-green-600' 
              : 'bg-gradient-to-r from-red-600 to-orange-600'
          }`}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <>
                    <Cloud className="h-5 w-5 text-white animate-pulse" />
                    <span className="text-white font-medium">
                      Back online! Your data is syncing...
                    </span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-5 w-5 text-white" />
                    <div className="text-white">
                      <span className="font-medium">You're offline</span>
                      <span className="hidden sm:inline"> - You can still browse cached content</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isOnline && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Hook to check online status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook to save data for offline use
 */
export const useOfflineStorage = () => {
  const saveForOffline = async (key: string, data: unknown) => {
    try {
      // Save to localStorage as fallback
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
      
      // Also save via service worker if available
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const messageChannel = new MessageChannel();
        
        registration.active?.postMessage(
          { type: 'SAVE_OFFLINE', data: { key, value: data, timestamp: Date.now() } },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const getOfflineData = async (key: string) => {
    try {
      // Try localStorage first
      const localData = localStorage.getItem(`offline_${key}`);
      if (localData) {
        return JSON.parse(localData);
      }
      
      // Try service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        return new Promise((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data?.data?.value);
          };
          
          registration.active?.postMessage(
            { type: 'GET_OFFLINE_DATA', key },
            [messageChannel.port2]
          );
          
          // Timeout after 1 second
          setTimeout(() => resolve(null), 1000);
        });
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  };

  const clearOfflineData = (key: string) => {
    localStorage.removeItem(`offline_${key}`);
  };

  return { saveForOffline, getOfflineData, clearOfflineData };
};

export default OfflineIndicator;

