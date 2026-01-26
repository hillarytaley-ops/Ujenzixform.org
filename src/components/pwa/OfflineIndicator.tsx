/**
 * Offline Indicator Component
 * Shows when the user is offline
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-white text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>You're back online!</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>You're offline. Some features may be limited.</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 ml-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;

