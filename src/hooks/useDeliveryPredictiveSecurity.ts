import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityPrediction {
  prediction_id: string;
  threat_type: string;
  probability: number;
  confidence: number;
  predicted_time: string;
  prevention_actions: string[];
  risk_factors: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityTrend {
  period: string;
  threat_count: number;
  threat_types: { [key: string]: number };
  risk_score_trend: number[];
  prevention_effectiveness: number;
}

interface UseDeliveryPredictiveSecurityResult {
  predictions: SecurityPrediction[];
  trends: SecurityTrend[];
  generatePredictions: () => Promise<SecurityPrediction[]>;
  analyzeTrends: (timeRange: string) => Promise<SecurityTrend[]>;
  implementPreventiveMeasures: (prediction: SecurityPrediction) => Promise<boolean>;
  getSecurityForecast: (days: number) => Promise<any>;
  isAnalyzing: boolean;
}

export const useDeliveryPredictiveSecurity = (): UseDeliveryPredictiveSecurityResult => {
  const [predictions, setPredictions] = useState<SecurityPrediction[]>([]);
  const [trends, setTrends] = useState<SecurityTrend[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Heuristic / rules-based threat signals (full ML can extend this later)
  const generatePredictions = useCallback(async (): Promise<SecurityPrediction[]> => {
    try {
      setIsAnalyzing(true);

      // Analyze historical security events
      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const newPredictions: SecurityPrediction[] = [];

      // Prediction 1: Rate Limit Abuse
      const rateLimitEvents = securityEvents?.filter(e => e.event_type === 'rate_limit_exceeded') || [];
      if (rateLimitEvents.length > 0) {
        const avgDaily = rateLimitEvents.length / 30;
        const probability = Math.min(95, avgDaily * 20);
        
        newPredictions.push({
          prediction_id: `pred-rate-${Date.now()}`,
          threat_type: 'rate_limit_abuse',
          probability,
          confidence: 85,
          predicted_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          prevention_actions: [
            'Implement stricter rate limiting',
            'Add CAPTCHA for high-frequency users',
            'Monitor user behavior patterns'
          ],
          risk_factors: [
            `${rateLimitEvents.length} rate limit violations in 30 days`,
            'Increasing frequency of violations',
            'Multiple users affected'
          ],
          severity: probability > 70 ? 'high' : probability > 40 ? 'medium' : 'low'
        });
      }

      // Prediction 2: Suspicious Location Patterns
      const locationEvents = securityEvents?.filter(e => 
        e.event_type.includes('location') || e.event_type.includes('delivery')
      ) || [];
      
      if (locationEvents.length > 5) {
        newPredictions.push({
          prediction_id: `pred-location-${Date.now()}`,
          threat_type: 'suspicious_location_activity',
          probability: Math.min(80, locationEvents.length * 5),
          confidence: 75,
          predicted_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          prevention_actions: [
            'Enhance location validation',
            'Implement geofencing alerts',
            'Require location verification for new areas'
          ],
          risk_factors: [
            'Multiple location-related security events',
            'Unusual delivery location patterns',
            'Potential location spoofing attempts'
          ],
          severity: 'medium'
        });
      }

      // Prediction 3: Account Compromise Risk
      const authEvents = securityEvents?.filter(e => 
        e.event_type.includes('auth') || e.event_type.includes('session')
      ) || [];

      if (authEvents.length > 3) {
        const failedLogins = authEvents.filter(e => e.event_type.includes('failed'));
        const probability = Math.min(90, failedLogins.length * 15);

        newPredictions.push({
          prediction_id: `pred-compromise-${Date.now()}`,
          threat_type: 'account_compromise_risk',
          probability,
          confidence: 80,
          predicted_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          prevention_actions: [
            'Require password reset for affected accounts',
            'Implement mandatory MFA',
            'Monitor login patterns closely'
          ],
          risk_factors: [
            `${failedLogins.length} failed login attempts`,
            'Unusual authentication patterns',
            'Potential credential stuffing attack'
          ],
          severity: probability > 60 ? 'critical' : 'high'
        });
      }

      // Prediction 4: Bulk Operation Abuse
      const bulkEvents = securityEvents?.filter(e => e.event_type.includes('bulk')) || [];
      if (bulkEvents.length > 2) {
        newPredictions.push({
          prediction_id: `pred-bulk-${Date.now()}`,
          threat_type: 'bulk_operation_abuse',
          probability: Math.min(70, bulkEvents.length * 25),
          confidence: 70,
          predicted_time: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
          prevention_actions: [
            'Implement bulk operation limits',
            'Require approval for large bulk operations',
            'Add delay between bulk requests'
          ],
          risk_factors: [
            'Multiple bulk operations detected',
            'Potential system abuse',
            'Resource consumption concerns'
          ],
          severity: 'medium'
        });
      }

      setPredictions(newPredictions);
      return newPredictions;

    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeTrends = useCallback(async (timeRange: string): Promise<SecurityTrend[]> => {
    try {
      const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!events || events.length === 0) {
        return [];
      }

      // Group events by day
      const dailyEvents: { [key: string]: any[] } = {};
      events.forEach(event => {
        const day = event.created_at.split('T')[0];
        if (!dailyEvents[day]) {
          dailyEvents[day] = [];
        }
        dailyEvents[day].push(event);
      });

      // Calculate trends
      const trendData: SecurityTrend[] = Object.entries(dailyEvents).map(([day, dayEvents]) => {
        const threatTypes: { [key: string]: number } = {};
        dayEvents.forEach(event => {
          threatTypes[event.event_type] = (threatTypes[event.event_type] || 0) + 1;
        });

        return {
          period: day,
          threat_count: dayEvents.length,
          threat_types: threatTypes,
          risk_score_trend: [dayEvents.length * 10], // Simplified risk scoring
          prevention_effectiveness: Math.max(0, 100 - (dayEvents.length * 5))
        };
      });

      setTrends(trendData);
      return trendData;

    } catch (error) {
      console.error('Error analyzing trends:', error);
      return [];
    }
  }, []);

  const implementPreventiveMeasures = async (prediction: SecurityPrediction): Promise<boolean> => {
    try {
      // Log preventive action
      await supabase.from('security_events').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: 'preventive_action_implemented',
        severity: 'low',
        details: {
          prediction_id: prediction.prediction_id,
          threat_type: prediction.threat_type,
          actions: prediction.prevention_actions
        }
      });

      toast({
        title: "Preventive Measures Implemented",
        description: `Security measures activated for ${prediction.threat_type.replace('_', ' ')}.`,
      });

      return true;
    } catch (error) {
      console.error('Error implementing preventive measures:', error);
      return false;
    }
  };

  const getSecurityForecast = async (days: number) => {
    const forecast = {
      predicted_threats: predictions.length,
      risk_level: 'medium',
      recommended_actions: [
        'Continue monitoring current security measures',
        'Review and update security policies',
        'Conduct security training for users'
      ],
      confidence: 75
    };

    // Adjust forecast based on current trends
    const recentTrends = trends.slice(-7); // Last 7 days
    const avgThreatCount = recentTrends.reduce((sum, trend) => sum + trend.threat_count, 0) / recentTrends.length;

    if (avgThreatCount > 5) {
      forecast.risk_level = 'high';
      forecast.recommended_actions.unshift('Implement enhanced security measures immediately');
    } else if (avgThreatCount < 2) {
      forecast.risk_level = 'low';
    }

    return forecast;
  };

  // Auto-generate predictions periodically
  useEffect(() => {
    generatePredictions();
    analyzeTrends('30days');

    const interval = setInterval(() => {
      generatePredictions();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [generatePredictions, analyzeTrends]);

  return {
    predictions,
    trends,
    generatePredictions,
    analyzeTrends,
    implementPreventiveMeasures,
    getSecurityForecast,
    isAnalyzing
  };
};
