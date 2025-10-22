import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityConfig {
  enableDeviceFingerprinting: boolean;
  enableBehavioralAnalysis: boolean;
  enableGeofencing: boolean;
  maxFailedAttempts: number;
  sessionTimeout: number;
  requireMFA: boolean;
}

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
}

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: number;
  deviceFingerprint?: DeviceFingerprint;
}

export const useAdvancedSecurity = () => {
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    enableDeviceFingerprinting: true,
    enableBehavioralAnalysis: true,
    enableGeofencing: false,
    maxFailedAttempts: 5,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    requireMFA: false
  });

  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityEvent[]>([]);
  const [isDeviceTrusted, setIsDeviceTrusted] = useState(false);

  // Generate device fingerprint
  const generateDeviceFingerprint = useCallback((): DeviceFingerprint => {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory
    };
  }, []);

  // Log security events
  const logSecurityEvent = useCallback(async (event: Omit<SecurityEvent, 'timestamp' | 'deviceFingerprint'>) => {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
      deviceFingerprint: deviceFingerprint || undefined
    };

    setSecurityAlerts(prev => [securityEvent, ...prev.slice(0, 99)]); // Keep last 100 events

    // Log to Supabase
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from('security_events').insert({
          user_id: user.id,
          event_type: event.type,
          severity: event.severity,
          details: event.details as any,
          device_fingerprint: deviceFingerprint as any
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [deviceFingerprint]);

  // Validate device trust
  const validateDeviceTrust = useCallback(async (fingerprint: DeviceFingerprint) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return false;

      const { data: trustedDevices } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('fingerprint_hash', btoa(JSON.stringify(fingerprint)));

      const isTrusted = trustedDevices && trustedDevices.length > 0;
      setIsDeviceTrusted(isTrusted);

      if (!isTrusted) {
        await logSecurityEvent({
          type: 'untrusted_device_access',
          severity: 'medium',
          details: { fingerprint }
        });
      }

      return isTrusted;
    } catch (error) {
      console.error('Device trust validation failed:', error);
      return false;
    }
  }, [logSecurityEvent]);

  // Monitor suspicious activities
  const monitorSuspiciousActivity = useCallback(async () => {
    // Check for rapid consecutive requests
    const recentEvents = securityAlerts.filter(
      event => Date.now() - event.timestamp < 60000 // Last minute
    );

    if (recentEvents.length > 10) {
      await logSecurityEvent({
        type: 'rapid_requests_detected',
        severity: 'high',
        details: { eventCount: recentEvents.length }
      });
    }

    // Check for unusual location access
    if ('geolocation' in navigator && securityConfig.enableGeofencing) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Here you would compare with known safe locations
        // For now, just log the location access
        await logSecurityEvent({
          type: 'location_access',
          severity: 'low',
          details: { latitude, longitude }
        });
      });
    }
  }, [securityAlerts, securityConfig, logSecurityEvent]);

  // Enhanced session management
  const enhanceSessionSecurity = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    
    if (session?.session) {
      // Check session age (using expires_at instead of created_at)
      const sessionAge = Date.now() - (session.session.expires_at ? new Date(session.session.expires_at).getTime() - (session.session.expires_in || 3600) * 1000 : Date.now());
      
      if (sessionAge > securityConfig.sessionTimeout) {
        await logSecurityEvent({
          type: 'session_timeout',
          severity: 'medium',
          details: { sessionAge }
        });
        
        await supabase.auth.signOut();
      }

      // Refresh token periodically
      if (sessionAge > 15 * 60 * 1000) { // 15 minutes
        await supabase.auth.refreshSession();
      }
    }
  }, [securityConfig.sessionTimeout, logSecurityEvent]);

  // Initialize security monitoring
  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);
    validateDeviceTrust(fingerprint);

    // Set up periodic monitoring
    const monitoringInterval = setInterval(() => {
      monitorSuspiciousActivity();
      enhanceSessionSecurity();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(monitoringInterval);
  }, [generateDeviceFingerprint, validateDeviceTrust, monitorSuspiciousActivity, enhanceSessionSecurity]);

  // Real-time threat detection
  const detectThreat = useCallback(async (activityType: string, details: any) => {
    const threatLevel = analyzeThreatLevel(activityType, details);
    
    if (threatLevel >= 0.7) {
      await logSecurityEvent({
        type: 'threat_detected',
        severity: 'critical',
        details: { activityType, threatLevel, ...details }
      });

      // Implement automatic threat response
      if (threatLevel >= 0.9) {
        await supabase.auth.signOut();
      }
    }
  }, [logSecurityEvent]);

  // Simple threat level analysis
  const analyzeThreatLevel = (activityType: string, details: any): number => {
    let score = 0;

    // Add scoring logic based on activity type and details
    if (activityType === 'failed_login' && details.attempts > 3) score += 0.5;
    if (activityType === 'data_access' && details.sensitive) score += 0.3;
    if (!isDeviceTrusted) score += 0.4;

    return Math.min(score, 1.0);
  };

  return {
    securityConfig,
    setSecurityConfig,
    deviceFingerprint,
    securityAlerts,
    isDeviceTrusted,
    logSecurityEvent,
    detectThreat,
    validateDeviceTrust
  };
};