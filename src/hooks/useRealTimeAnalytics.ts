import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subHours, eachDayOfInterval, eachHourOfInterval } from 'date-fns';

interface RealTimeMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedAlerts: number;
  activeDeliveries: number;
  completedDeliveries: number;
  pendingRequests: number;
  lastUpdate: Date;
}

interface DailyData {
  date: string;
  alerts: number;
  resolved: number;
  deliveries: number;
  requests: number;
}

interface AlertTypeData {
  name: string;
  value: number;
  color: string;
}

const ALERT_TYPE_COLORS: Record<string, string> = {
  'camera_offline': '#ef4444',
  'camera_low_battery': '#f97316',
  'motion_detected': '#3b82f6',
  'intrusion_detected': '#dc2626',
  'delivery_delayed': '#eab308',
  'delivery_arrived': '#22c55e',
  'route_deviation': '#8b5cf6',
  'system_error': '#6b7280',
  'maintenance_required': '#f59e0b',
  'access_request': '#6366f1',
  'security_breach': '#991b1b',
  'material_quality': '#ea580c'
};

export const useRealTimeAnalytics = (timeRange: string = '7days') => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    totalAlerts: 0,
    criticalAlerts: 0,
    resolvedAlerts: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    pendingRequests: 0,
    lastUpdate: new Date()
  });
  
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [alertTypeData, setAlertTypeData] = useState<AlertTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  
  const channelsRef = useRef<any[]>([]);

  const getDateRange = useCallback(() => {
    const endDate = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '24hours':
        startDate = subHours(endDate, 24);
        break;
      case '7days':
        startDate = subDays(endDate, 7);
        break;
      case '30days':
        startDate = subDays(endDate, 30);
        break;
      default:
        startDate = subDays(endDate, 7);
    }
    
    return { startDate, endDate };
  }, [timeRange]);

  const fetchData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange();

      const [alertsRes, deliveriesRes, requestsRes] = await Promise.all([
        supabase
          .from('monitoring_alerts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('delivery_routes')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('camera_access_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const alerts = alertsRes.data || [];
      const deliveries = deliveriesRes.data || [];
      const requests = requestsRes.data || [];

      // Update real-time metrics
      setMetrics({
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
        resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
        activeDeliveries: deliveries.filter(d => d.status === 'in_transit' || d.status === 'near_destination').length,
        completedDeliveries: deliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        lastUpdate: new Date()
      });

      // Process daily data
      if (timeRange !== '24hours') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyMap = new Map<string, DailyData>();
        
        days.forEach(day => {
          const dateStr = format(day, 'MMM dd');
          dailyMap.set(dateStr, {
            date: dateStr,
            alerts: 0,
            resolved: 0,
            deliveries: 0,
            requests: 0
          });
        });

        alerts.forEach(a => {
          const dateStr = format(new Date(a.created_at), 'MMM dd');
          if (dailyMap.has(dateStr)) {
            const data = dailyMap.get(dateStr)!;
            data.alerts++;
            if (a.status === 'resolved') data.resolved++;
          }
        });

        deliveries.forEach(d => {
          const dateStr = format(new Date(d.created_at), 'MMM dd');
          if (dailyMap.has(dateStr)) {
            dailyMap.get(dateStr)!.deliveries++;
          }
        });

        requests.forEach(r => {
          const dateStr = format(new Date(r.created_at), 'MMM dd');
          if (dailyMap.has(dateStr)) {
            dailyMap.get(dateStr)!.requests++;
          }
        });

        setDailyData(Array.from(dailyMap.values()));
      }

      // Alert type distribution
      const typeCount: Record<string, number> = {};
      alerts.forEach(a => {
        typeCount[a.alert_type] = (typeCount[a.alert_type] || 0) + 1;
      });
      
      setAlertTypeData(
        Object.entries(typeCount)
          .map(([name, value]) => ({
            name: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            value,
            color: ALERT_TYPE_COLORS[name] || '#6b7280'
          }))
          .sort((a, b) => b.value - a.value)
      );

    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, timeRange]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchData();

    if (!isLive) return;

    // Subscribe to monitoring_alerts changes
    const alertsChannel = supabase
      .channel('realtime-alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'monitoring_alerts'
      }, (payload) => {
        console.log('Real-time alert update:', payload);
        fetchData(); // Refetch on any change
        
        if (payload.eventType === 'INSERT') {
          const alert = payload.new as any;
          if (alert.severity === 'critical' || alert.severity === 'emergency') {
            toast.error(`New ${alert.severity} alert: ${alert.title}`, {
              duration: 10000
            });
          }
        }
      })
      .subscribe();

    // Subscribe to delivery_routes changes
    const deliveriesChannel = supabase
      .channel('realtime-deliveries')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_routes'
      }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to camera_access_requests changes
    const requestsChannel = supabase
      .channel('realtime-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'camera_access_requests'
      }, () => {
        fetchData();
      })
      .subscribe();

    channelsRef.current = [alertsChannel, deliveriesChannel, requestsChannel];

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchData, isLive]);

  // Refetch when time range changes
  useEffect(() => {
    fetchData();
  }, [timeRange, fetchData]);

  const toggleLive = () => {
    setIsLive(prev => !prev);
    if (!isLive) {
      toast.success('Real-time updates enabled');
    } else {
      toast.info('Real-time updates paused');
    }
  };

  return {
    metrics,
    dailyData,
    alertTypeData,
    loading,
    isLive,
    toggleLive,
    refresh: fetchData
  };
};

export default useRealTimeAnalytics;














