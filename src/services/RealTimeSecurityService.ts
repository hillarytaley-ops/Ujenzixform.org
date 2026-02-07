/**
 * Real-Time Security Monitoring Service
 * Provides live security alerts and monitoring for admin dashboard
 */

import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface SecurityAlert {
  id: string;
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach_attempt' | 'rate_limit_exceeded' | 
        'failed_login' | 'permission_violation' | 'api_abuse' | 'gps_anomaly' | 'payment_fraud' | 
        'account_takeover' | 'data_export' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface SecurityMetrics {
  totalAlerts24h: number;
  criticalAlerts: number;
  highAlerts: number;
  failedLogins24h: number;
  suspiciousActivities: number;
  activeThreats: number;
  blockedRequests: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

type AlertCallback = (alert: SecurityAlert) => void;
type MetricsCallback = (metrics: SecurityMetrics) => void;

class RealTimeSecurityService {
  private alertCallbacks: AlertCallback[] = [];
  private metricsCallbacks: MetricsCallback[] = [];
  private channel: RealtimeChannel | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private alerts: SecurityAlert[] = [];

  /**
   * Start real-time security monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Subscribe to security_events table for real-time alerts
      this.channel = supabase
        .channel('security-monitoring')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'security_events'
          },
          (payload) => {
            const event = payload.new;
            const alert = this.convertToAlert(event);
            this.alerts.unshift(alert);
            this.alerts = this.alerts.slice(0, 100); // Keep last 100 alerts
            this.notifyAlertCallbacks(alert);
          }
        )
        .subscribe();

      // Start metrics polling
      this.startMetricsPolling();
      
      // Load initial alerts
      await this.loadRecentAlerts();

      this.isMonitoring = true;
      console.log('Security monitoring started');
    } catch (error) {
      console.error('Failed to start security monitoring:', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Subscribe to security alerts
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: MetricsCallback): () => void {
    this.metricsCallbacks.push(callback);
    return () => {
      this.metricsCallbacks = this.metricsCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(): SecurityAlert[] {
    return this.alerts;
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): SecurityAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const alert = this.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
      }

      // Update in database if we have the alert stored there
      await supabase
        .from('security_events')
        .update({ 
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return true;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  /**
   * Report a security event
   */
  async reportSecurityEvent(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('security_events').insert({
        event_type: type,
        severity: severity,
        details: {
          title,
          message,
          ...metadata
        },
        user_id: user?.id,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }

  /**
   * Check for various security threats
   */
  async performSecurityCheck(): Promise<SecurityAlert[]> {
    const newAlerts: SecurityAlert[] = [];

    try {
      // Check failed login attempts
      const failedLogins = await this.checkFailedLogins();
      if (failedLogins.count > 5) {
        newAlerts.push({
          id: `failed-login-${Date.now()}`,
          type: 'failed_login',
          severity: failedLogins.count > 10 ? 'critical' : 'high',
          title: 'Multiple Failed Login Attempts',
          message: `${failedLogins.count} failed login attempts detected in the last hour`,
          source: 'auth_monitor',
          metadata: { count: failedLogins.count, ips: failedLogins.ips },
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Check for rate limit violations
      const rateLimits = await this.checkRateLimitViolations();
      if (rateLimits.length > 0) {
        newAlerts.push({
          id: `rate-limit-${Date.now()}`,
          type: 'rate_limit_exceeded',
          severity: 'medium',
          title: 'Rate Limit Violations',
          message: `${rateLimits.length} rate limit violations detected`,
          source: 'api_monitor',
          metadata: { violations: rateLimits },
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Check for suspicious data access
      const suspiciousAccess = await this.checkSuspiciousDataAccess();
      if (suspiciousAccess.detected) {
        newAlerts.push({
          id: `suspicious-${Date.now()}`,
          type: 'suspicious_activity',
          severity: 'high',
          title: 'Suspicious Data Access Pattern',
          message: suspiciousAccess.message,
          source: 'data_monitor',
          metadata: suspiciousAccess.details,
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Check GPS anomalies
      const gpsAnomalies = await this.checkGPSAnomalies();
      if (gpsAnomalies.detected) {
        newAlerts.push({
          id: `gps-anomaly-${Date.now()}`,
          type: 'gps_anomaly',
          severity: 'medium',
          title: 'GPS Location Anomaly',
          message: gpsAnomalies.message,
          source: 'gps_monitor',
          metadata: gpsAnomalies.details,
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Add new alerts to the list
      newAlerts.forEach(alert => {
        this.alerts.unshift(alert);
        this.notifyAlertCallbacks(alert);
      });

      this.alerts = this.alerts.slice(0, 100);

    } catch (error) {
      console.error('Security check failed:', error);
    }

    return newAlerts;
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get alerts from last 24 hours
      const { data: recentEvents, count } = await supabase
        .from('security_events')
        .select('*', { count: 'exact' })
        .gte('created_at', oneDayAgo);

      const events = recentEvents || [];
      
      const criticalCount = events.filter(e => e.severity === 'critical').length;
      const highCount = events.filter(e => e.severity === 'high').length;
      const failedLogins = events.filter(e => 
        e.event_type === 'failed_login' || 
        e.event_type?.includes('login_failed')
      ).length;
      const suspicious = events.filter(e => 
        e.event_type === 'suspicious_activity' ||
        e.severity === 'critical' ||
        e.severity === 'high'
      ).length;

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (criticalCount > 0) {
        systemHealth = 'critical';
      } else if (highCount > 2 || suspicious > 5) {
        systemHealth = 'warning';
      }

      return {
        totalAlerts24h: count || 0,
        criticalAlerts: criticalCount,
        highAlerts: highCount,
        failedLogins24h: failedLogins,
        suspiciousActivities: suspicious,
        activeThreats: criticalCount + highCount,
        blockedRequests: events.filter(e => e.event_type === 'blocked_request').length,
        systemHealth
      };
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return {
        totalAlerts24h: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        failedLogins24h: 0,
        suspiciousActivities: 0,
        activeThreats: 0,
        blockedRequests: 0,
        systemHealth: 'healthy'
      };
    }
  }

  // Private methods

  private async loadRecentAlerts(): Promise<void> {
    try {
      const { data } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        this.alerts = data.map(event => this.convertToAlert(event));
      }
    } catch (error) {
      console.error('Failed to load recent alerts:', error);
    }
  }

  private convertToAlert(event: any): SecurityAlert {
    const details = event.details || event.event_details || {};
    return {
      id: event.id,
      type: this.mapEventType(event.event_type),
      severity: event.severity || 'medium',
      title: details.title || this.getTitleForType(event.event_type),
      message: details.message || details.description || event.description || 'Security event detected',
      source: details.source || 'system',
      userId: event.user_id,
      ipAddress: event.ip_address,
      userAgent: event.user_agent,
      metadata: details,
      timestamp: new Date(event.created_at),
      acknowledged: event.acknowledged || false,
      acknowledgedBy: event.acknowledged_by,
      acknowledgedAt: event.acknowledged_at ? new Date(event.acknowledged_at) : undefined
    };
  }

  private mapEventType(eventType: string): SecurityAlert['type'] {
    const typeMap: Record<string, SecurityAlert['type']> = {
      'unauthorized_access': 'unauthorized_access',
      'suspicious_activity': 'suspicious_activity',
      'data_breach_attempt': 'data_breach_attempt',
      'rate_limit_exceeded': 'rate_limit_exceeded',
      'failed_login': 'failed_login',
      'login_failed': 'failed_login',
      'permission_violation': 'permission_violation',
      'api_abuse': 'api_abuse',
      'gps_anomaly': 'gps_anomaly',
      'payment_fraud': 'payment_fraud',
      'account_takeover': 'account_takeover',
      'data_export': 'data_export',
      'system_error': 'system_error'
    };
    return typeMap[eventType] || 'suspicious_activity';
  }

  private getTitleForType(eventType: string): string {
    const titles: Record<string, string> = {
      'unauthorized_access': 'Unauthorized Access Attempt',
      'suspicious_activity': 'Suspicious Activity Detected',
      'data_breach_attempt': 'Potential Data Breach',
      'rate_limit_exceeded': 'Rate Limit Exceeded',
      'failed_login': 'Failed Login Attempt',
      'permission_violation': 'Permission Violation',
      'api_abuse': 'API Abuse Detected',
      'gps_anomaly': 'GPS Location Anomaly',
      'payment_fraud': 'Potential Payment Fraud',
      'account_takeover': 'Account Takeover Attempt',
      'data_export': 'Large Data Export',
      'system_error': 'System Error'
    };
    return titles[eventType] || 'Security Event';
  }

  private startMetricsPolling(): void {
    const pollMetrics = async () => {
      const metrics = await this.getSecurityMetrics();
      this.notifyMetricsCallbacks(metrics);
    };

    pollMetrics();
    this.metricsInterval = setInterval(pollMetrics, 30000); // Every 30 seconds
  }

  private notifyAlertCallbacks(alert: SecurityAlert): void {
    this.alertCallbacks.forEach(cb => cb(alert));
  }

  private notifyMetricsCallbacks(metrics: SecurityMetrics): void {
    this.metricsCallbacks.forEach(cb => cb(metrics));
  }

  private async checkFailedLogins(): Promise<{ count: number; ips: string[] }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('security_events')
        .select('ip_address')
        .or('event_type.eq.failed_login,event_type.ilike.%login_failed%')
        .gte('created_at', oneHourAgo);

      const ips = [...new Set(data?.map(d => d.ip_address).filter(Boolean) || [])];
      return { count: data?.length || 0, ips };
    } catch {
      return { count: 0, ips: [] };
    }
  }

  private async checkRateLimitViolations(): Promise<any[]> {
    // DISABLED: api_rate_limits table doesn't exist or has no RLS policies
    // This prevents 403 errors in the console
    // To re-enable, create the table in Supabase with proper RLS policies
    return [];
  }

  private async checkSuspiciousDataAccess(): Promise<{ detected: boolean; message: string; details: any }> {
    try {
      // Check for bulk data access patterns
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'data_access')
        .gte('created_at', fiveMinutesAgo);

      if (data && data.length > 50) {
        return {
          detected: true,
          message: `Unusual data access pattern: ${data.length} access events in 5 minutes`,
          details: { accessCount: data.length }
        };
      }
      return { detected: false, message: '', details: {} };
    } catch {
      return { detected: false, message: '', details: {} };
    }
  }

  private async checkGPSAnomalies(): Promise<{ detected: boolean; message: string; details: any }> {
    try {
      // Check for impossible GPS movements (teleportation)
      const { data } = await supabase
        .from('delivery_tracking')
        .select('provider_id, latitude, longitude, recorded_at')
        .gte('recorded_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (data && data.length > 1) {
        // Group by provider and check for anomalies
        const byProvider = new Map<string, any[]>();
        data.forEach(d => {
          const existing = byProvider.get(d.provider_id) || [];
          existing.push(d);
          byProvider.set(d.provider_id, existing);
        });

        for (const [providerId, locations] of byProvider) {
          if (locations.length >= 2) {
            const [latest, previous] = locations;
            const distance = this.calculateDistance(
              latest.latitude, latest.longitude,
              previous.latitude, previous.longitude
            );
            const timeDiff = (new Date(latest.recorded_at).getTime() - new Date(previous.recorded_at).getTime()) / 1000;
            const speed = distance / timeDiff * 3600; // km/h

            if (speed > 200) { // Over 200 km/h is suspicious
              return {
                detected: true,
                message: `Impossible GPS movement detected for provider ${providerId}: ${Math.round(speed)} km/h`,
                details: { providerId, speed, distance, timeDiff }
              };
            }
          }
        }
      }
      return { detected: false, message: '', details: {} };
    } catch {
      return { detected: false, message: '', details: {} };
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private async getClientIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const realTimeSecurityService = new RealTimeSecurityService();
export default realTimeSecurityService;





















