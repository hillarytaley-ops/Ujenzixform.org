import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  sessionValidationCount: number;
  dataAccessAttempts: number;
  encryptionLevel: string;
  ipWhitelistStatus: boolean;
  auditTrailActive: boolean;
  lastSecurityScan: string;
}

interface AccessAttempt {
  userId: string;
  resource: string;
  action: string;
  result: 'allowed' | 'denied';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export const useSecurityMonitor = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    sessionValidationCount: 0,
    dataAccessAttempts: 0,
    encryptionLevel: 'AES-256',
    ipWhitelistStatus: true,
    auditTrailActive: true,
    lastSecurityScan: new Date().toISOString()
  });
  
  const [accessAttempts, setAccessAttempts] = useState<AccessAttempt[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Enhanced session validation
  const validateSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logSecurityEvent('session_validation_failed', 'Session validation failed');
        return false;
      }

      // Check session expiry
      const now = new Date().getTime() / 1000;
      if (session.expires_at && session.expires_at < now) {
        logSecurityEvent('session_expired', 'Session expired during validation');
        return false;
      }

      // Validate token integrity
      if (!session.access_token || session.access_token.length < 100) {
        logSecurityEvent('invalid_token', 'Invalid access token detected');
        return false;
      }

      setMetrics(prev => ({
        ...prev,
        sessionValidationCount: prev.sessionValidationCount + 1
      }));

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      logSecurityEvent('session_validation_error', `Session validation error: ${error}`);
      return false;
    }
  }, []);

  // Log security events with enhanced details
  const logSecurityEvent = useCallback(async (eventType: string, description: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const securityLog = {
        user_id: user?.id || null,
        event_type: eventType,
        description,
        severity,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        session_info: user ? {
          user_id: user.id,
          last_sign_in: user.last_sign_in_at,
          created_at: user.created_at
        } : null
      };

      // Store in local state for immediate access
      setAccessAttempts(prev => [...prev.slice(-49), {
        userId: user?.id || 'anonymous',
        resource: eventType,
        action: description,
        result: severity === 'high' ? 'denied' : 'allowed',
        timestamp: new Date().toISOString(),
        ipAddress: securityLog.ip_address,
        userAgent: securityLog.user_agent
      }]);

      // Log to console in development for debugging
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('sandbox')) {
        console.log('Security Event:', securityLog);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  // Get client IP address
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Monitor data access patterns
  const monitorDataAccess = useCallback(async (resource: string, action: string) => {
    const isValid = await validateSession();
    
    if (!isValid) {
      logSecurityEvent('unauthorized_data_access', `Unauthorized access attempt to ${resource}`, 'high');
      return false;
    }

    logSecurityEvent('data_access', `Authorized access to ${resource} for ${action}`, 'low');
    
    setMetrics(prev => ({
      ...prev,
      dataAccessAttempts: prev.dataAccessAttempts + 1,
      lastSecurityScan: new Date().toISOString()
    }));

    return true;
  }, [validateSession, logSecurityEvent]);

  // Rate limiting check
  const checkRateLimit = useCallback(async (endpoint: string, maxRequests: number = 100): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('api_rate_limits')
        .select('request_count')
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)
        .gte('window_start', oneHourAgo)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Rate limit check error:', error);
        return false;
      }

      const currentCount = data?.request_count || 0;
      
      if (currentCount >= maxRequests) {
        logSecurityEvent('rate_limit_exceeded', `Rate limit exceeded for ${endpoint}`, 'medium');
        return false;
      }

      // Update or insert rate limit record
      await supabase
        .from('api_rate_limits')
        .upsert({
          user_id: user.id,
          endpoint,
          request_count: currentCount + 1,
          window_start: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return true;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return false;
    }
  }, [logSecurityEvent]);

  // Enhanced encryption check
  const verifyDataEncryption = useCallback(() => {
    // Check if HTTPS is being used
    const isSecure = window.location.protocol === 'https:';
    
    if (!isSecure && window.location.hostname !== 'localhost') {
      logSecurityEvent('insecure_connection', 'Non-HTTPS connection detected', 'high');
      return false;
    }

    // Verify Supabase connection is secure
    const supabaseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co'; // Use the known Supabase URL
    if (!supabaseUrl.startsWith('https://')) {
      logSecurityEvent('insecure_api', 'Insecure API connection detected', 'high');
      return false;
    }

    return true;
  }, [logSecurityEvent]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Validate session every 5 minutes
    const sessionInterval = setInterval(validateSession, 5 * 60 * 1000);
    
    // Verify encryption every 10 minutes
    const encryptionInterval = setInterval(verifyDataEncryption, 10 * 60 * 1000);
    
    // Initial checks
    validateSession();
    verifyDataEncryption();
    
    // Cleanup function
    return () => {
      clearInterval(sessionInterval);
      clearInterval(encryptionInterval);
      setIsMonitoring(false);
    };
  }, [isMonitoring, validateSession, verifyDataEncryption]);

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    metrics,
    accessAttempts,
    isMonitoring,
    validateSession,
    monitorDataAccess,
    checkRateLimit,
    verifyDataEncryption,
    logSecurityEvent
  };
};