import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface SecurityContextType {
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  isSecure: boolean;
  threats: string[];
  securityScore: number;
  lastCheck: string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface ContentSecurityProviderProps {
  children: React.ReactNode;
  pageName: string;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const ContentSecurityProvider: React.FC<ContentSecurityProviderProps> = ({
  children,
  pageName,
  securityLevel = 'medium'
}) => {
  const [securityState, setSecurityState] = useState<SecurityContextType>({
    securityLevel,
    isSecure: true,
    threats: [],
    securityScore: 100,
    lastCheck: new Date().toISOString()
  });

  const [showSecurityBanner, setShowSecurityBanner] = useState(false);

  useEffect(() => {
    const performSecurityCheck = () => {
      const threats: string[] = [];
      let securityScore = 100;

      // Check for mixed content
      if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        threats.push('Insecure HTTP connection');
        securityScore -= 30;
      }

      // Check for suspicious user agents
      const userAgent = navigator.userAgent.toLowerCase();
      const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper', 'hack'];
      
      if (suspiciousPatterns.some(pattern => userAgent.includes(pattern))) {
        threats.push('Suspicious user agent detected');
        securityScore -= 20;
      }

      // Check for developer tools (basic detection)
      let devtools = { open: false, orientation: null };
      const threshold = 160;

      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            threats.push('Developer tools opened');
            securityScore -= 10;
            setSecurityState(prev => ({
              ...prev,
              threats: [...prev.threats, 'Developer tools detected'],
              securityScore: prev.securityScore - 10
            }));
          }
        } else {
          devtools.open = false;
        }
      }, 500);

      // Check for content integrity
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        if (!script.hasAttribute('integrity') && script.getAttribute('src')?.startsWith('http')) {
          threats.push('External script without integrity check');
          securityScore -= 15;
        }
      });

      // Update security state
      setSecurityState({
        securityLevel,
        isSecure: securityScore >= 70,
        threats,
        securityScore,
        lastCheck: new Date().toISOString()
      });

      // Show security banner if threats detected
      if (threats.length > 0) {
        setShowSecurityBanner(true);
      }
    };

    // Initial security check
    performSecurityCheck();

    // Periodic security checks
    const securityInterval = setInterval(performSecurityCheck, 30000); // Every 30 seconds

    // Log page access for security monitoring
    console.info(`Security check for ${pageName}:`, {
      timestamp: new Date().toISOString(),
      securityLevel,
      userAgent: navigator.userAgent.slice(0, 50),
      url: window.location.href
    });

    return () => {
      clearInterval(securityInterval);
    };
  }, [pageName, securityLevel]);

  const getSecurityBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getSecurityIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4" />;
    if (score >= 70) return <Shield className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <SecurityContext.Provider value={securityState}>
      {/* Security Banner */}
      {showSecurityBanner && securityState.threats.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <Alert variant={securityState.isSecure ? "default" : "destructive"} className="max-w-4xl mx-auto">
            {getSecurityIcon(securityState.securityScore)}
            <AlertTitle className="flex items-center justify-between">
              <span>Security Notice</span>
              <Badge className={getSecurityBadgeColor(securityState.securityScore)}>
                Score: {securityState.securityScore}/100
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>Security monitoring is active for this page.</p>
                {securityState.threats.length > 0 && (
                  <div>
                    <p className="font-semibold">Detected Issues:</p>
                    <ul className="list-disc list-inside text-sm">
                      {securityState.threats.map((threat, index) => (
                        <li key={index}>{threat}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setShowSecurityBanner(false)}
                  className="text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Security Status Indicator (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-40">
          <Badge className={getSecurityBadgeColor(securityState.securityScore)}>
            {getSecurityIcon(securityState.securityScore)}
            Security: {securityState.securityScore}/100
          </Badge>
        </div>
      )}

      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a ContentSecurityProvider');
  }
  return context;
};
















