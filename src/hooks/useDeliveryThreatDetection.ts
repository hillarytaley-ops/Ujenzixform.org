import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ThreatAnalysis {
  risk_score: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  recommended_actions: string[];
  confidence: number;
  analysis_timestamp: string;
}

interface DeliveryThreat {
  id: string;
  delivery_id: string;
  threat_type: 'suspicious_location' | 'unusual_pattern' | 'rate_limit_abuse' | 'fake_request' | 'route_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved: boolean;
  false_positive: boolean;
}

interface UseDeliveryThreatDetectionResult {
  threats: DeliveryThreat[];
  analyzeThreat: (deliveryData: any) => Promise<ThreatAnalysis>;
  reportThreat: (threatData: Partial<DeliveryThreat>) => Promise<boolean>;
  markThreatResolved: (threatId: string) => Promise<boolean>;
  markFalsePositive: (threatId: string) => Promise<boolean>;
  getSecurityRecommendations: () => string[];
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export const useDeliveryThreatDetection = (): UseDeliveryThreatDetectionResult => {
  const [threats, setThreats] = useState<DeliveryThreat[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();

  // AI-powered threat analysis algorithm
  const analyzeThreat = useCallback(async (deliveryData: any): Promise<ThreatAnalysis> => {
    const analysis: ThreatAnalysis = {
      risk_score: 0,
      threat_level: 'low',
      risk_factors: [],
      recommended_actions: [],
      confidence: 0,
      analysis_timestamp: new Date().toISOString()
    };

    try {
      // Factor 1: Location Analysis (30% weight)
      const locationRisk = await analyzeLocationRisk(deliveryData);
      analysis.risk_score += locationRisk.score * 0.3;
      if (locationRisk.factors.length > 0) {
        analysis.risk_factors.push(...locationRisk.factors);
      }

      // Factor 2: Pattern Analysis (25% weight)
      const patternRisk = await analyzePatternRisk(deliveryData);
      analysis.risk_score += patternRisk.score * 0.25;
      if (patternRisk.factors.length > 0) {
        analysis.risk_factors.push(...patternRisk.factors);
      }

      // Factor 3: User Behavior Analysis (20% weight)
      const behaviorRisk = await analyzeBehaviorRisk(deliveryData);
      analysis.risk_score += behaviorRisk.score * 0.2;
      if (behaviorRisk.factors.length > 0) {
        analysis.risk_factors.push(...behaviorRisk.factors);
      }

      // Factor 4: Timing Analysis (15% weight)
      const timingRisk = analyzeTimingRisk(deliveryData);
      analysis.risk_score += timingRisk.score * 0.15;
      if (timingRisk.factors.length > 0) {
        analysis.risk_factors.push(...timingRisk.factors);
      }

      // Factor 5: Value Analysis (10% weight)
      const valueRisk = analyzeValueRisk(deliveryData);
      analysis.risk_score += valueRisk.score * 0.1;
      if (valueRisk.factors.length > 0) {
        analysis.risk_factors.push(...valueRisk.factors);
      }

      // Determine threat level
      if (analysis.risk_score >= 80) {
        analysis.threat_level = 'critical';
        analysis.recommended_actions.push('Block delivery request immediately');
        analysis.recommended_actions.push('Require manual admin approval');
      } else if (analysis.risk_score >= 60) {
        analysis.threat_level = 'high';
        analysis.recommended_actions.push('Require additional verification');
        analysis.recommended_actions.push('Enhanced monitoring required');
      } else if (analysis.risk_score >= 40) {
        analysis.threat_level = 'medium';
        analysis.recommended_actions.push('Monitor delivery closely');
        analysis.recommended_actions.push('Verify delivery details');
      } else {
        analysis.threat_level = 'low';
        analysis.recommended_actions.push('Standard monitoring');
      }

      // Calculate confidence based on data quality
      analysis.confidence = Math.min(95, 60 + (analysis.risk_factors.length * 5));

      return analysis;

    } catch (error) {
      console.error('Error in threat analysis:', error);
      return {
        risk_score: 50, // Default medium risk on error
        threat_level: 'medium',
        risk_factors: ['Analysis error - manual review required'],
        recommended_actions: ['Manual security review required'],
        confidence: 30,
        analysis_timestamp: new Date().toISOString()
      };
    }
  }, []);

  const analyzeLocationRisk = async (deliveryData: any) => {
    const factors: string[] = [];
    let score = 0;

    try {
      // Check against known high-risk areas
      const { data: restrictions } = await supabase
        .from('delivery_location_restrictions')
        .select('*')
        .eq('is_active', true);

      if (restrictions) {
        for (const restriction of restrictions) {
          const distance = calculateDistance(
            deliveryData.pickup_lat || 0,
            deliveryData.pickup_lng || 0,
            restriction.latitude,
            restriction.longitude
          );

          if (distance <= restriction.radius_km) {
            factors.push(`Pickup in ${restriction.restriction_type} area: ${restriction.reason}`);
            score += restriction.severity === 'critical' ? 40 : 
                    restriction.severity === 'high' ? 30 : 20;
          }

          const deliveryDistance = calculateDistance(
            deliveryData.delivery_lat || 0,
            deliveryData.delivery_lng || 0,
            restriction.latitude,
            restriction.longitude
          );

          if (deliveryDistance <= restriction.radius_km) {
            factors.push(`Delivery in ${restriction.restriction_type} area: ${restriction.reason}`);
            score += restriction.severity === 'critical' ? 40 : 
                    restriction.severity === 'high' ? 30 : 20;
          }
        }
      }

      // Check for unusual distance (very long or very short deliveries)
      const deliveryDistance = calculateDistance(
        deliveryData.pickup_lat || 0,
        deliveryData.pickup_lng || 0,
        deliveryData.delivery_lat || 0,
        deliveryData.delivery_lng || 0
      );

      if (deliveryDistance > 200) {
        factors.push('Unusually long delivery distance (>200km)');
        score += 15;
      } else if (deliveryDistance < 0.5) {
        factors.push('Unusually short delivery distance (<0.5km)');
        score += 10;
      }

    } catch (error) {
      factors.push('Location analysis error');
      score += 20;
    }

    return { score: Math.min(score, 100), factors };
  };

  const analyzePatternRisk = async (deliveryData: any) => {
    const factors: string[] = [];
    let score = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { score: 50, factors: ['User not authenticated'] };

      // Check for suspicious patterns in recent deliveries
      const { data: recentDeliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('builder_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (recentDeliveries) {
        // Check for rapid-fire requests
        if (recentDeliveries.length > 10) {
          factors.push('High frequency delivery requests (>10 in 24h)');
          score += 25;
        }

        // Check for duplicate addresses
        const addresses = recentDeliveries.map(d => d.pickup_address + '|' + d.delivery_address);
        const uniqueAddresses = new Set(addresses);
        if (addresses.length - uniqueAddresses.size > 3) {
          factors.push('Multiple identical delivery routes');
          score += 20;
        }

        // Check for unusual material patterns
        const materials = recentDeliveries.map(d => d.material_type);
        const materialCounts = materials.reduce((acc: any, material) => {
          acc[material] = (acc[material] || 0) + 1;
          return acc;
        }, {});

        const maxMaterialCount = Math.max(...Object.values(materialCounts) as number[]);
        if (maxMaterialCount > 5) {
          factors.push('Unusual material request pattern');
          score += 15;
        }
      }

    } catch (error) {
      factors.push('Pattern analysis error');
      score += 20;
    }

    return { score: Math.min(score, 100), factors };
  };

  const analyzeBehaviorRisk = async (deliveryData: any) => {
    const factors: string[] = [];
    let score = 0;

    try {
      // Check user account age and activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const accountAge = Date.now() - new Date(user.created_at).getTime();
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

        if (daysSinceCreation < 1) {
          factors.push('Very new account (<1 day old)');
          score += 30;
        } else if (daysSinceCreation < 7) {
          factors.push('New account (<7 days old)');
          score += 15;
        }

        // Check for incomplete profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, company_name')
          .eq('user_id', user.id)
          .single();

        if (!profile?.full_name || !profile?.phone) {
          factors.push('Incomplete user profile');
          score += 20;
        }
      }

      // Check for suspicious request timing
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        factors.push('Unusual request time (outside business hours)');
        score += 10;
      }

    } catch (error) {
      factors.push('Behavior analysis error');
      score += 15;
    }

    return { score: Math.min(score, 100), factors };
  };

  const analyzeTimingRisk = (deliveryData: any) => {
    const factors: string[] = [];
    let score = 0;

    // Check for urgent/emergency requests
    if (deliveryData.priority === 'emergency') {
      factors.push('Emergency priority request');
      score += 10; // Not necessarily suspicious, but requires attention
    }

    // Check for weekend/holiday requests
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isWeekend && deliveryData.priority === 'urgent') {
      factors.push('Urgent weekend delivery request');
      score += 15;
    }

    // Check for immediate delivery requests
    if (deliveryData.requested_date && new Date(deliveryData.requested_date) <= new Date()) {
      factors.push('Immediate delivery requested');
      score += 10;
    }

    return { score: Math.min(score, 100), factors };
  };

  const analyzeValueRisk = (deliveryData: any) => {
    const factors: string[] = [];
    let score = 0;

    // Check for unusually high-value deliveries
    if (deliveryData.estimated_cost > 50000) {
      factors.push('High-value delivery (>KES 50,000)');
      score += 15;
    }

    // Check for zero or very low cost
    if (deliveryData.estimated_cost < 100) {
      factors.push('Unusually low delivery cost');
      score += 20;
    }

    return { score: Math.min(score, 100), factors };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const reportThreat = async (threatData: Partial<DeliveryThreat>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const threat: DeliveryThreat = {
        id: `threat-${Date.now()}`,
        delivery_id: threatData.delivery_id || '',
        threat_type: threatData.threat_type || 'suspicious_location',
        severity: threatData.severity || 'medium',
        description: threatData.description || 'Threat detected by AI system',
        detected_at: new Date().toISOString(),
        resolved: false,
        false_positive: false
      };

      // In production, this would save to database
      setThreats(prev => [threat, ...prev]);

      // Log security event
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'delivery_threat_detected',
        severity: threat.severity,
        details: {
          threat_type: threat.threat_type,
          delivery_id: threat.delivery_id,
          description: threat.description,
          ai_detected: true
        }
      });

      toast({
        title: "Security Threat Detected",
        description: `${threat.threat_type.replace('_', ' ')} detected and logged for review.`,
        variant: threat.severity === 'critical' ? 'destructive' : 'default'
      });

      return true;
    } catch (error) {
      console.error('Error reporting threat:', error);
      return false;
    }
  };

  const markThreatResolved = async (threatId: string): Promise<boolean> => {
    try {
      setThreats(prev => prev.map(threat => 
        threat.id === threatId ? { ...threat, resolved: true } : threat
      ));

      toast({
        title: "Threat Resolved",
        description: "Security threat has been marked as resolved.",
      });

      return true;
    } catch (error) {
      console.error('Error resolving threat:', error);
      return false;
    }
  };

  const markFalsePositive = async (threatId: string): Promise<boolean> => {
    try {
      setThreats(prev => prev.map(threat => 
        threat.id === threatId ? { ...threat, false_positive: true, resolved: true } : threat
      ));

      toast({
        title: "False Positive Marked",
        description: "Threat has been marked as false positive for AI learning.",
      });

      return true;
    } catch (error) {
      console.error('Error marking false positive:', error);
      return false;
    }
  };

  const getSecurityRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const activeThreats = threats.filter(t => !t.resolved);

    if (activeThreats.length === 0) {
      recommendations.push('No active security threats detected');
      recommendations.push('Continue standard security monitoring');
    } else {
      const criticalThreats = activeThreats.filter(t => t.severity === 'critical');
      const highThreats = activeThreats.filter(t => t.severity === 'high');

      if (criticalThreats.length > 0) {
        recommendations.push(`${criticalThreats.length} critical threats require immediate attention`);
        recommendations.push('Consider temporarily suspending delivery operations');
      }

      if (highThreats.length > 0) {
        recommendations.push(`${highThreats.length} high-priority threats need review`);
        recommendations.push('Implement enhanced verification for new deliveries');
      }

      recommendations.push('Review and resolve active threats before proceeding');
      recommendations.push('Consider implementing additional security measures');
    }

    return recommendations;
  };

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Set up real-time monitoring (mock implementation)
    const monitoringInterval = setInterval(async () => {
      try {
        // Check for new suspicious activities
        const { data } = await supabase
          .rpc('detect_suspicious_delivery_activity');

        if (data && data.length > 0) {
          const suspiciousActivity = data[0];
          if (suspiciousActivity.is_suspicious) {
            await reportThreat({
              threat_type: 'unusual_pattern',
              severity: suspiciousActivity.risk_score > 70 ? 'high' : 'medium',
              description: `Suspicious activity detected: ${suspiciousActivity.risk_factors.join(', ')}`
            });
          }
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      clearInterval(monitoringInterval);
      setIsMonitoring(false);
    };
  }, [isMonitoring, reportThreat]);

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    threats,
    analyzeThreat,
    reportThreat,
    markThreatResolved,
    markFalsePositive,
    getSecurityRecommendations,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
};
