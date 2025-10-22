import { useState, useEffect, useCallback } from 'react';

interface SecurityMetrics {
  pageViews: number;
  loadTime: number;
  renderTime: number;
  securityScore: number;
  threats: string[];
  lastSecurityCheck: string;
}

interface RateLimitStatus {
  isLimited: boolean;
  requestCount: number;
  resetTime: number;
  maxRequests: number;
}

export const usePageSecurity = (pageName: string) => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    pageViews: 0,
    loadTime: 0,
    renderTime: 0,
    securityScore: 100,
    threats: [],
    lastSecurityCheck: new Date().toISOString()
  });

  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    isLimited: false,
    requestCount: 0,
    resetTime: Date.now() + 3600000, // 1 hour
    maxRequests: 100
  });

  // Basic rate limiting for public pages
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const storageKey = `rate-limit-${pageName}`;
    const rateLimitData = localStorage.getItem(storageKey);
    
    if (rateLimitData) {
      const { count, resetTime } = JSON.parse(rateLimitData);
      
      if (now < resetTime) {
        if (count >= 100) { // 100 requests per hour
          setRateLimitStatus({
            isLimited: true,
            requestCount: count,
            resetTime,
            maxRequests: 100
          });
          return false;
        }
        
        // Increment counter
        localStorage.setItem(storageKey, JSON.stringify({
          count: count + 1,
          resetTime
        }));
        
        setRateLimitStatus({
          isLimited: false,
          requestCount: count + 1,
          resetTime,
          maxRequests: 100
        });
      } else {
        // Reset counter
        localStorage.setItem(storageKey, JSON.stringify({
          count: 1,
          resetTime: now + 3600000
        }));
        
        setRateLimitStatus({
          isLimited: false,
          requestCount: 1,
          resetTime: now + 3600000,
          maxRequests: 100
        });
      }
    } else {
      // First visit
      localStorage.setItem(storageKey, JSON.stringify({
        count: 1,
        resetTime: now + 3600000
      }));
      
      setRateLimitStatus({
        isLimited: false,
        requestCount: 1,
        resetTime: now + 3600000,
        maxRequests: 100
      });
    }
    
    return true;
  }, [pageName]);

  // Security monitoring
  const performSecurityCheck = useCallback((): SecurityMetrics => {
    const threats: string[] = [];
    let securityScore = 100;

    // Check for suspicious activity
    const userAgent = navigator.userAgent.toLowerCase();
    const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    
    if (suspiciousPatterns.some(pattern => userAgent.includes(pattern))) {
      threats.push('Potential bot activity detected');
      securityScore -= 10;
    }

    // Check for rapid page access
    if (rateLimitStatus.requestCount > 50) {
      threats.push('High request frequency detected');
      securityScore -= 15;
    }

    // Check for suspicious referrers
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      const suspiciousDomains = ['malware', 'phishing', 'spam'];
      if (suspiciousDomains.some(domain => document.referrer.includes(domain))) {
        threats.push('Suspicious referrer detected');
        securityScore -= 20;
      }
    }

    // Check for development tools (basic detection)
    const devtools = /./;
    devtools.toString = function() {
      threats.push('Developer tools detected');
      securityScore -= 5;
      return 'devtools';
    };
    console.log('%c', devtools);

    const updatedMetrics: SecurityMetrics = {
      ...securityMetrics,
      securityScore,
      threats,
      lastSecurityCheck: new Date().toISOString()
    };

    setSecurityMetrics(updatedMetrics);
    return updatedMetrics;
  }, [securityMetrics, rateLimitStatus]);

  // Log security events
  const logSecurityEvent = useCallback((eventType: string, details: any) => {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      page: pageName,
      eventType,
      details,
      userAgent: navigator.userAgent.slice(0, 100),
      url: window.location.href,
      referrer: document.referrer || 'direct'
    };

    // Store in localStorage for development (in production, send to security service)
    const existingEvents = JSON.parse(localStorage.getItem('security-events') || '[]');
    existingEvents.push(securityEvent);
    
    // Keep only last 100 events
    if (existingEvents.length > 100) {
      existingEvents.splice(0, existingEvents.length - 100);
    }
    
    localStorage.setItem('security-events', JSON.stringify(existingEvents));
    
    console.info('Security event logged:', securityEvent);
  }, [pageName]);

  // Track page performance
  const trackPerformance = useCallback(() => {
    const startTime = performance.now();
    
    // Track page load
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      setSecurityMetrics(prev => ({
        ...prev,
        loadTime
      }));
      
      logSecurityEvent('page_load', {
        loadTime,
        performanceScore: loadTime < 1000 ? 'excellent' : loadTime < 3000 ? 'good' : 'poor'
      });
    });

    // Track render time
    const renderTime = performance.now() - startTime;
    setSecurityMetrics(prev => ({
      ...prev,
      renderTime
    }));
  }, [logSecurityEvent]);

  // Initialize security monitoring
  useEffect(() => {
    // Check rate limits
    const canProceed = checkRateLimit();
    
    if (!canProceed) {
      logSecurityEvent('rate_limit_exceeded', {
        requestCount: rateLimitStatus.requestCount,
        maxRequests: rateLimitStatus.maxRequests
      });
      return;
    }

    // Track page views
    const views = parseInt(localStorage.getItem(`${pageName}-views`) || '0') + 1;
    localStorage.setItem(`${pageName}-views`, views.toString());
    setSecurityMetrics(prev => ({ ...prev, pageViews: views }));

    // Perform security check
    performSecurityCheck();

    // Track performance
    trackPerformance();

    // Log page access
    logSecurityEvent('page_access', {
      timestamp: new Date().toISOString(),
      page: pageName,
      userAgent: navigator.userAgent.slice(0, 50),
      referrer: document.referrer || 'direct'
    });
  }, [pageName, checkRateLimit, performSecurityCheck, trackPerformance, logSecurityEvent, rateLimitStatus]);

  return {
    securityMetrics,
    rateLimitStatus,
    performSecurityCheck,
    logSecurityEvent,
    isSecure: securityMetrics.securityScore >= 80,
    hasThreats: securityMetrics.threats.length > 0
  };
};











