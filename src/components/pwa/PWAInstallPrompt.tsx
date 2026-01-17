/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📱 PWA INSTALL PROMPT - Beautiful Install Banner                                  ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import { 
  X, 
  Download, 
  Smartphone, 
  Zap, 
  Wifi, 
  Bell,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface PWAInstallPromptProps {
  delay?: number; // Delay before showing prompt (ms)
  position?: 'top' | 'bottom';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ 
  delay = 5000,
  position = 'bottom' 
}) => {
  const { isInstallable, isInstalled, installApp, isOnline } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    // Show prompt after delay
    if (isInstallable && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isDismissed, delay]);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    setIsInstalling(false);
    
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0' 
    : 'bottom-0 left-0 right-0';

  return (
    <div className={`fixed ${positionClasses} z-50 p-4 animate-in slide-in-from-bottom duration-500`}>
      <Card className="max-w-lg mx-auto shadow-2xl border-primary/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        
        <CardContent className="relative p-4">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <img 
                  src="/mradipro-logo-circular.svg" 
                  alt="UjenziXform" 
                  className="w-10 h-10"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">Install UjenziXform</h3>
                <Badge variant="secondary" className="text-xs">
                  Free
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Get the full app experience on your device
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span>Faster</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span>Works Offline</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bell className="h-3 w-3 text-blue-500" />
                  <span>Notifications</span>
                </div>
              </div>

              {/* Install Button */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex-1 gap-2"
                >
                  {isInstalling ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Install App
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// iOS Install Instructions
export const IOSInstallInstructions: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isInstalled } = usePWA();

  useEffect(() => {
    // Check if iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    
    if (isIOS && isSafari && !isStandalone && !isInstalled) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setIsVisible(true), 3000);
      }
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ios-install-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom">
      <Card className="max-w-lg mx-auto shadow-2xl">
        <CardContent className="p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-bold mb-2">Add to Home Screen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Install UjenziXform on your iPhone for the best experience
            </p>

            <div className="space-y-3 text-left bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  1
                </div>
                <span className="text-sm">
                  Tap the <strong>Share</strong> button in Safari
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  2
                </div>
                <span className="text-sm">
                  Scroll and tap <strong>"Add to Home Screen"</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <span className="text-sm">
                  Tap <strong>"Add"</strong> to install
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Update Available Banner
export const PWAUpdateBanner: React.FC = () => {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setIsVisible(true);
    }
  }, [isUpdateAvailable]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-3 animate-in slide-in-from-top">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">A new version is available!</span>
        </div>
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => {
            updateApp();
            setIsVisible(false);
          }}
          className="gap-1"
        >
          Update Now
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Offline Banner
export const OfflineBanner: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 p-2 text-center animate-in slide-in-from-top">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Wifi className="h-4 w-4" />
        You're offline. Some features may be limited.
      </div>
    </div>
  );
};

export default PWAInstallPrompt;








