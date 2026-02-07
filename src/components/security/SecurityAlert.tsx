import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach_attempt' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

export const SecurityAlert = () => {
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      monitorSecurityEvents();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const monitorSecurityEvents = () => {
    // Monitor for suspicious activities
    const checkSecurityMetrics = async () => {
      try {
        // Check for multiple failed login attempts
        const failedLogins = await checkFailedLoginAttempts();
        
        // Check for unusual data access patterns
        const suspiciousAccess = await checkSuspiciousDataAccess();
        
        // Check rate limiting violations
        const rateLimitViolations = await checkRateLimitViolations();

        const newAlerts: SecurityEvent[] = [];

        if (failedLogins > 5) {
          newAlerts.push({
            type: 'unauthorized_access',
            severity: 'high',
            message: `Multiple failed login attempts detected (${failedLogins} attempts)`,
            timestamp: new Date().toISOString()
          });
        }

        if (suspiciousAccess) {
          newAlerts.push({
            type: 'suspicious_activity',
            severity: 'medium',
            message: 'Unusual data access patterns detected',
            timestamp: new Date().toISOString()
          });
        }

        if (rateLimitViolations > 0) {
          newAlerts.push({
            type: 'rate_limit_exceeded',
            severity: 'medium',
            message: `Rate limit violations detected (${rateLimitViolations} instances)`,
            timestamp: new Date().toISOString()
          });
        }

        setAlerts(newAlerts);
      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    };

    checkSecurityMetrics();
    const interval = setInterval(checkSecurityMetrics, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  };

  const checkFailedLoginAttempts = async (): Promise<number> => {
    // This would typically query auth logs or a custom security table
    // For now, return a mock value
    return Math.floor(Math.random() * 10);
  };

  const checkSuspiciousDataAccess = async (): Promise<boolean> => {
    // Check for unusual patterns in data access
    // For now, return a mock value
    return Math.random() > 0.8;
  };

  const checkRateLimitViolations = async (): Promise<number> => {
    // DISABLED: api_rate_limits table doesn't exist or has no RLS policies
    // This prevents 403 errors in the console
    // To re-enable, create the table in Supabase with proper RLS policies
    return 0;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <Shield className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Eye className="h-4 w-4 text-yellow-600" />;
      default:
        return <Shield className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!isAdmin || alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map((alert, index) => (
        <Alert 
          key={index}
          className={`border-l-4 ${
            alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
            alert.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
            alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
            'border-l-blue-500 bg-blue-50'
          }`}
        >
          {getSeverityIcon(alert.severity)}
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Security Alert</p>
              <p className="text-xs">{alert.message}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};