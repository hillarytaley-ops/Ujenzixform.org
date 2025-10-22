import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface BusinessInsight {
  category: string;
  insight: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export const useAdvancedAnalytics = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch comprehensive analytics data
      // SECURITY: Only select columns needed for analytics, exclude sensitive contact info
      const [
        { data: deliveries },
        { data: suppliers },
        { data: builderRoles },
        { data: orders },
        { data: payments }
      ] = await Promise.all([
        supabase.from('deliveries').select('id, status, created_at, updated_at, material_type, quantity'),
        supabase.from('suppliers').select('id, is_verified, created_at, rating, specialties'),
        supabase.from('user_roles').select('user_id').eq('role', 'builder'),
        supabase.from('purchase_orders').select('id, status, total_amount, created_at, delivery_date'),
        supabase.from('payments').select('id, status, created_at, amount')
      ]);
      
      // Get builders profiles based on user_roles
      // SECURITY: Only select non-sensitive columns for analytics
      const builderUserIds = builderRoles?.map(r => r.user_id) || [];
      const { data: builders } = builderUserIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('id, user_id, created_at, user_type, is_professional')
            .in('user_id', builderUserIds)
        : { data: [] };

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate metrics
      const calculatedMetrics: AnalyticsMetric[] = [
        {
          name: 'Total Deliveries',
          value: deliveries?.length || 0,
          change: calculateGrowth(deliveries, 'created_at', lastMonth, thisMonth),
          trend: calculateTrend(deliveries, 'created_at', lastMonth, thisMonth)
        },
        {
          name: 'Active Suppliers',
          value: suppliers?.filter(s => s.is_verified).length || 0,
          change: calculateGrowth(suppliers, 'created_at', lastMonth, thisMonth),
          trend: calculateTrend(suppliers, 'created_at', lastMonth, thisMonth)
        },
        {
          name: 'Registered Builders',
          value: builders?.length || 0,
          change: calculateGrowth(builders, 'created_at', lastMonth, thisMonth),
          trend: calculateTrend(builders, 'created_at', lastMonth, thisMonth)
        },
        {
          name: 'Total Orders Value',
          value: orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
          change: calculateValueGrowth(orders, 'total_amount', 'created_at', lastMonth, thisMonth),
          trend: calculateValueTrend(orders, 'total_amount', 'created_at', lastMonth, thisMonth)
        },
        {
          name: 'Payment Success Rate',
          value: payments?.length ? (payments.filter(p => p.status === 'completed').length / payments.length) * 100 : 0,
          change: calculateSuccessRateChange(payments, lastMonth, thisMonth),
          trend: calculateSuccessRateTrend(payments, lastMonth, thisMonth)
        }
      ];

      setMetrics(calculatedMetrics);

      // Generate business insights
      const generatedInsights = generateBusinessInsights(deliveries, suppliers, builders, orders, payments);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Analytics generation failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateGrowth = (data: any[], dateField: string, startDate: Date, endDate: Date): number => {
    if (!data) return 0;
    const previousCount = data.filter(item => {
      const date = new Date(item[dateField]);
      return date < startDate;
    }).length;
    const currentCount = data.filter(item => {
      const date = new Date(item[dateField]);
      return date >= startDate && date < endDate;
    }).length;
    
    return previousCount === 0 ? 100 : ((currentCount - previousCount) / previousCount) * 100;
  };

  const calculateTrend = (data: any[], dateField: string, startDate: Date, endDate: Date): 'up' | 'down' | 'stable' => {
    const growth = calculateGrowth(data, dateField, startDate, endDate);
    if (growth > 5) return 'up';
    if (growth < -5) return 'down';
    return 'stable';
  };

  const calculateValueGrowth = (data: any[], valueField: string, dateField: string, startDate: Date, endDate: Date): number => {
    if (!data) return 0;
    const previousValue = data.filter(item => {
      const date = new Date(item[dateField]);
      return date < startDate;
    }).reduce((sum, item) => sum + (item[valueField] || 0), 0);
    
    const currentValue = data.filter(item => {
      const date = new Date(item[dateField]);
      return date >= startDate && date < endDate;
    }).reduce((sum, item) => sum + (item[valueField] || 0), 0);
    
    return previousValue === 0 ? 100 : ((currentValue - previousValue) / previousValue) * 100;
  };

  const calculateValueTrend = (data: any[], valueField: string, dateField: string, startDate: Date, endDate: Date): 'up' | 'down' | 'stable' => {
    const growth = calculateValueGrowth(data, valueField, dateField, startDate, endDate);
    if (growth > 5) return 'up';
    if (growth < -5) return 'down';
    return 'stable';
  };

  const calculateSuccessRateChange = (payments: any[], startDate: Date, endDate: Date): number => {
    if (!payments) return 0;
    const previousPayments = payments.filter(p => new Date(p.created_at) < startDate);
    const currentPayments = payments.filter(p => {
      const date = new Date(p.created_at);
      return date >= startDate && date < endDate;
    });
    
    const previousRate = previousPayments.length ? 
      (previousPayments.filter(p => p.status === 'completed').length / previousPayments.length) * 100 : 0;
    const currentRate = currentPayments.length ? 
      (currentPayments.filter(p => p.status === 'completed').length / currentPayments.length) * 100 : 0;
    
    return currentRate - previousRate;
  };

  const calculateSuccessRateTrend = (payments: any[], startDate: Date, endDate: Date): 'up' | 'down' | 'stable' => {
    const change = calculateSuccessRateChange(payments, startDate, endDate);
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'stable';
  };

  const generateBusinessInsights = (deliveries: any[], suppliers: any[], builders: any[], orders: any[], payments: any[]): BusinessInsight[] => {
    const insights: BusinessInsight[] = [];

    // Delivery performance insights
    if (deliveries && deliveries.length > 0) {
      const delayedDeliveries = deliveries.filter(d => 
        d.actual_delivery_time && d.estimated_delivery_time &&
        new Date(d.actual_delivery_time) > new Date(d.estimated_delivery_time)
      );
      
      if (delayedDeliveries.length / deliveries.length > 0.2) {
        insights.push({
          category: 'Delivery Performance',
          insight: `${Math.round((delayedDeliveries.length / deliveries.length) * 100)}% of deliveries are delayed. Consider optimizing logistics or adjusting time estimates.`,
          impact: 'high',
          actionable: true
        });
      }
    }

    // Supplier diversity insights
    if (suppliers && suppliers.length > 0) {
      const verifiedSuppliers = suppliers.filter(s => s.is_verified);
      if (verifiedSuppliers.length / suppliers.length < 0.7) {
        insights.push({
          category: 'Supplier Management',
          insight: 'Low supplier verification rate. Implement verification incentives to improve trust.',
          impact: 'medium',
          actionable: true
        });
      }
    }

    // Payment insights
    if (payments && payments.length > 0) {
      const failedPayments = payments.filter(p => p.status === 'failed');
      if (failedPayments.length / payments.length > 0.1) {
        insights.push({
          category: 'Payment Processing',
          insight: 'High payment failure rate detected. Review payment provider integrations.',
          impact: 'high',
          actionable: true
        });
      }
    }

    // Growth opportunities
    if (builders && builders.length > 0 && orders && orders.length > 0) {
      const activeBuilders = builders.filter(b => 
        orders.some(o => o.buyer_id === b.id && 
          new Date(o.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        )
      );
      
      if (activeBuilders.length / builders.length < 0.3) {
        insights.push({
          category: 'User Engagement',
          insight: 'Low builder engagement. Consider implementing retention campaigns.',
          impact: 'medium',
          actionable: true
        });
      }
    }

    return insights;
  };

  return {
    metrics,
    insights,
    loading,
    generateMetrics
  };
};