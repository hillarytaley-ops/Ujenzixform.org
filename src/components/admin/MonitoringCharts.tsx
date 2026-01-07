import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  RefreshCw,
  Bell,
  Truck,
  Camera,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subHours, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval } from 'date-fns';
import { AnalyticsExportButton } from './AnalyticsExportButton';

interface DailyData {
  date: string;
  alerts: number;
  resolved: number;
  deliveries: number;
  requests: number;
}

interface HourlyData {
  hour: string;
  alerts: number;
  deliveries: number;
}

interface AlertTypeData {
  name: string;
  value: number;
  color: string;
}

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  alerts: '#ef4444',
  resolved: '#22c55e',
  deliveries: '#3b82f6',
  requests: '#8b5cf6',
  critical: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  emergency: '#7f1d1d'
};

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

export interface ChartFilters {
  cameras?: string[];
  projects?: string[];
  alertTypes?: string[];
  severities?: string[];
  showResolved?: boolean;
}

interface MonitoringChartsProps {
  externalFilters?: ChartFilters;
  onFiltersApplied?: () => void;
}

export const MonitoringCharts: React.FC<MonitoringChartsProps> = ({ 
  externalFilters,
  onFiltersApplied 
}) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [alertTypeData, setAlertTypeData] = useState<AlertTypeData[]>([]);
  const [severityData, setSeverityData] = useState<SeverityData[]>([]);
  const [resolutionTimeData, setResolutionTimeData] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

  // Refetch when external filters change
  useEffect(() => {
    if (externalFilters) {
      fetchChartData();
      onFiltersApplied?.();
    }
  }, [externalFilters]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isLive) return;

    const alertsChannel = supabase
      .channel('charts-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_alerts' }, () => {
        fetchChartData();
        setLastUpdate(new Date());
      })
      .subscribe();

    const deliveriesChannel = supabase
      .channel('charts-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_routes' }, () => {
        fetchChartData();
        setLastUpdate(new Date());
      })
      .subscribe();

    const requestsChannel = supabase
      .channel('charts-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_access_requests' }, () => {
        fetchChartData();
        setLastUpdate(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(deliveriesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [isLive]);

  const toggleLive = () => {
    setIsLive(prev => !prev);
    toast(isLive ? 'Real-time updates paused' : 'Real-time updates enabled');
  };

  const fetchChartData = async () => {
    setLoading(true);
    setLastUpdate(new Date());
    try {
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

      // Build filtered queries
      let alertsQuery = supabase
        .from('monitoring_alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      let deliveriesQuery = supabase
        .from('delivery_routes')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      let requestsQuery = supabase
        .from('camera_access_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Apply external filters if provided
      if (externalFilters) {
        if (externalFilters.alertTypes && externalFilters.alertTypes.length > 0) {
          alertsQuery = alertsQuery.in('alert_type', externalFilters.alertTypes);
        }
        if (externalFilters.severities && externalFilters.severities.length > 0) {
          alertsQuery = alertsQuery.in('severity', externalFilters.severities);
        }
        if (externalFilters.showResolved === false) {
          alertsQuery = alertsQuery.neq('status', 'resolved');
        }
        if (externalFilters.cameras && externalFilters.cameras.length > 0) {
          alertsQuery = alertsQuery.in('camera_id', externalFilters.cameras);
        }
      }

      // Fetch all data in parallel
      const [alertsRes, deliveriesRes, requestsRes] = await Promise.all([
        alertsQuery,
        deliveriesQuery,
        requestsQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const alerts = alertsRes.data || [];
      const deliveries = deliveriesRes.data || [];
      const requests = requestsRes.data || [];

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
      } else {
        // Hourly data for 24 hours
        const hours = eachHourOfInterval({ start: startDate, end: endDate });
        const hourlyMap = new Map<string, HourlyData>();
        
        hours.forEach(hour => {
          const hourStr = format(hour, 'HH:00');
          hourlyMap.set(hourStr, { hour: hourStr, alerts: 0, deliveries: 0 });
        });

        alerts.forEach(a => {
          const hourStr = format(new Date(a.created_at), 'HH:00');
          if (hourlyMap.has(hourStr)) {
            hourlyMap.get(hourStr)!.alerts++;
          }
        });

        deliveries.forEach(d => {
          const hourStr = format(new Date(d.created_at), 'HH:00');
          if (hourlyMap.has(hourStr)) {
            hourlyMap.get(hourStr)!.deliveries++;
          }
        });

        setHourlyData(Array.from(hourlyMap.values()));
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

      // Severity distribution
      const severityCount: Record<string, number> = { info: 0, warning: 0, critical: 0, emergency: 0 };
      alerts.forEach(a => {
        if (severityCount.hasOwnProperty(a.severity)) {
          severityCount[a.severity]++;
        }
      });
      
      setSeverityData([
        { name: 'Info', value: severityCount.info, color: COLORS.info },
        { name: 'Warning', value: severityCount.warning, color: COLORS.warning },
        { name: 'Critical', value: severityCount.critical, color: COLORS.critical },
        { name: 'Emergency', value: severityCount.emergency, color: COLORS.emergency }
      ].filter(d => d.value > 0));

      // Resolution time data
      const resolvedAlerts = alerts.filter(a => a.resolved_at && a.created_at);
      const resolutionBuckets: Record<string, number> = {
        '< 5 min': 0,
        '5-15 min': 0,
        '15-30 min': 0,
        '30-60 min': 0,
        '> 1 hour': 0
      };
      
      resolvedAlerts.forEach(a => {
        const minutes = (new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60);
        if (minutes < 5) resolutionBuckets['< 5 min']++;
        else if (minutes < 15) resolutionBuckets['5-15 min']++;
        else if (minutes < 30) resolutionBuckets['15-30 min']++;
        else if (minutes < 60) resolutionBuckets['30-60 min']++;
        else resolutionBuckets['> 1 hour']++;
      });
      
      setResolutionTimeData(
        Object.entries(resolutionBuckets).map(([name, value]) => ({ name, value }))
      );

    } catch (error) {
      console.error('Error fetching chart data:', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Charts
            {isLive && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Live
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Visual insights into monitoring performance
            {isLive && (
              <span className="ml-2 text-xs">
                • Last update: {format(lastUpdate, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={isLive ? "default" : "outline"} 
            size="sm" 
            onClick={toggleLive}
            className={isLive ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isLive ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <AnalyticsExportButton 
            dailyData={dailyData}
            alertTypeData={alertTypeData}
            severityData={severityData}
            dateRange={timeRange}
            disabled={loading}
          />
          <Button variant="outline" size="icon" onClick={fetchChartData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Activity Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activity Trend
          </CardTitle>
          <CardDescription>
            {timeRange === '24hours' ? 'Hourly' : 'Daily'} breakdown of system activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {timeRange === '24hours' ? (
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="alertsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.alerts} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.alerts} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="deliveriesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.deliveries} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.deliveries} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="alerts" name="Alerts" stroke={COLORS.alerts} fill="url(#alertsGradient)" />
                <Area type="monotone" dataKey="deliveries" name="Deliveries" stroke={COLORS.deliveries} fill="url(#deliveriesGradient)" />
              </AreaChart>
            ) : (
              <ComposedChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="alerts" name="Alerts" fill={COLORS.alerts} radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill={COLORS.resolved} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke={COLORS.deliveries} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="requests" name="Access Requests" stroke={COLORS.requests} strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Alert Type Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of alerts by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <Bell className="h-12 w-12 opacity-30" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={alertTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {alertTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Severity Breakdown
            </CardTitle>
            <CardDescription>
              Alerts categorized by severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <Bell className="h-12 w-12 opacity-30" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolution Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alert Resolution Time
          </CardTitle>
          <CardDescription>
            How quickly alerts are being resolved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resolutionTimeData.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p>No resolved alerts in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resolutionTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Alerts" fill="#22c55e" radius={[4, 4, 0, 0]}>
                  {resolutionTimeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 2 ? '#22c55e' : index < 4 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-700">
              {dailyData.reduce((sum, d) => sum + d.alerts, 0) || hourlyData.reduce((sum, d) => sum + d.alerts, 0)}
            </p>
            <p className="text-sm text-red-600">Total Alerts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <Truck className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-700">
              {dailyData.reduce((sum, d) => sum + d.deliveries, 0) || hourlyData.reduce((sum, d) => sum + d.deliveries, 0)}
            </p>
            <p className="text-sm text-green-600">Deliveries</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <Camera className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-purple-700">
              {dailyData.reduce((sum, d) => sum + d.requests, 0)}
            </p>
            <p className="text-sm text-purple-600">Access Requests</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-700">
              {dailyData.reduce((sum, d) => sum + d.resolved, 0)}
            </p>
            <p className="text-sm text-blue-600">Resolved</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringCharts;














