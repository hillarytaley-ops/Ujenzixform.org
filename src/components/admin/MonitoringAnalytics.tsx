import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Camera, 
  Truck, 
  Bell, 
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Activity,
  Eye,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsSummary {
  total_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
  total_access_requests: number;
  approved_requests: number;
  rejected_requests: number;
  completed_deliveries: number;
  delayed_deliveries: number;
  avg_resolution_time_min: number;
}

interface DailyMetric {
  date: string;
  alerts_created: number;
  alerts_resolved: number;
  deliveries_completed: number;
  access_requests_created: number;
}

interface AlertTypeBreakdown {
  alert_type: string;
  count: number;
  percentage: number;
}

interface EmailStats {
  total_sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

export const MonitoringAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [alertBreakdown, setAlertBreakdown] = useState<AlertTypeBreakdown[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [previousSummary, setPreviousSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case '24hours':
        startDate = subDays(endDate, 1);
        break;
      case '7days':
        startDate = subDays(endDate, 7);
        break;
      case '30days':
        startDate = subDays(endDate, 30);
        break;
      case '90days':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }
    
    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      // Fetch current period metrics
      const [alertsData, accessData, deliveriesData, emailData] = await Promise.all([
        // Alerts
        supabase
          .from('monitoring_alerts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Access requests
        supabase
          .from('camera_access_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Deliveries
        supabase
          .from('delivery_routes')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Email logs
        supabase
          .from('email_notification_log')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      // Calculate summary
      const alerts = alertsData.data || [];
      const accessRequests = accessData.data || [];
      const deliveries = deliveriesData.data || [];
      const emails = emailData.data || [];

      const currentSummary: AnalyticsSummary = {
        total_alerts: alerts.length,
        critical_alerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
        resolved_alerts: alerts.filter(a => a.status === 'resolved').length,
        total_access_requests: accessRequests.length,
        approved_requests: accessRequests.filter(r => r.status === 'approved').length,
        rejected_requests: accessRequests.filter(r => r.status === 'rejected').length,
        completed_deliveries: deliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length,
        delayed_deliveries: deliveries.filter(d => d.status === 'cancelled').length,
        avg_resolution_time_min: calculateAvgResolutionTime(alerts)
      };

      setSummary(currentSummary);

      // Calculate alert type breakdown
      const typeCount: Record<string, number> = {};
      alerts.forEach(a => {
        typeCount[a.alert_type] = (typeCount[a.alert_type] || 0) + 1;
      });
      
      const breakdown = Object.entries(typeCount).map(([type, count]) => ({
        alert_type: type,
        count,
        percentage: alerts.length > 0 ? (count / alerts.length) * 100 : 0
      })).sort((a, b) => b.count - a.count);
      
      setAlertBreakdown(breakdown);

      // Email stats
      setEmailStats({
        total_sent: emails.length,
        delivered: emails.filter(e => e.status === 'delivered' || e.status === 'sent').length,
        failed: emails.filter(e => e.status === 'failed' || e.status === 'bounced').length,
        pending: emails.filter(e => e.status === 'pending').length
      });

      // Calculate daily metrics
      const dailyMap = new Map<string, DailyMetric>();
      
      // Initialize days
      for (let i = 0; i < getDaysCount(); i++) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        dailyMap.set(date, {
          date,
          alerts_created: 0,
          alerts_resolved: 0,
          deliveries_completed: 0,
          access_requests_created: 0
        });
      }

      // Fill in data
      alerts.forEach(a => {
        const date = format(new Date(a.created_at), 'yyyy-MM-dd');
        if (dailyMap.has(date)) {
          const metric = dailyMap.get(date)!;
          metric.alerts_created++;
          if (a.status === 'resolved') metric.alerts_resolved++;
        }
      });

      deliveries.forEach(d => {
        const date = d.completed_at ? format(new Date(d.completed_at), 'yyyy-MM-dd') : null;
        if (date && dailyMap.has(date)) {
          dailyMap.get(date)!.deliveries_completed++;
        }
      });

      accessRequests.forEach(r => {
        const date = format(new Date(r.created_at), 'yyyy-MM-dd');
        if (dailyMap.has(date)) {
          dailyMap.get(date)!.access_requests_created++;
        }
      });

      setDailyMetrics(Array.from(dailyMap.values()).reverse());

      // Fetch previous period for comparison
      const prevStartDate = subDays(startDate, getDaysCount());
      const prevEndDate = subDays(endDate, getDaysCount());
      
      const [prevAlerts, prevAccess, prevDeliveries] = await Promise.all([
        supabase.from('monitoring_alerts').select('*')
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString()),
        supabase.from('camera_access_requests').select('*')
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString()),
        supabase.from('delivery_routes').select('*')
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString())
      ]);

      const pAlerts = prevAlerts.data || [];
      const pAccess = prevAccess.data || [];
      const pDeliveries = prevDeliveries.data || [];

      setPreviousSummary({
        total_alerts: pAlerts.length,
        critical_alerts: pAlerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
        resolved_alerts: pAlerts.filter(a => a.status === 'resolved').length,
        total_access_requests: pAccess.length,
        approved_requests: pAccess.filter(r => r.status === 'approved').length,
        rejected_requests: pAccess.filter(r => r.status === 'rejected').length,
        completed_deliveries: pDeliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length,
        delayed_deliveries: pDeliveries.filter(d => d.status === 'cancelled').length,
        avg_resolution_time_min: calculateAvgResolutionTime(pAlerts)
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getDaysCount = () => {
    switch (dateRange) {
      case '24hours': return 1;
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
    }
  };

  const calculateAvgResolutionTime = (alerts: any[]): number => {
    const resolved = alerts.filter(a => a.resolved_at && a.created_at);
    if (resolved.length === 0) return 0;
    
    const totalMinutes = resolved.reduce((sum, a) => {
      const created = new Date(a.created_at).getTime();
      const resolvedAt = new Date(a.resolved_at).getTime();
      return sum + ((resolvedAt - created) / (1000 * 60));
    }, 0);
    
    return Math.round(totalMinutes / resolved.length);
  };

  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
  };

  const getAlertTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getAlertTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'camera_offline': 'bg-red-500',
      'camera_low_battery': 'bg-orange-500',
      'motion_detected': 'bg-blue-500',
      'intrusion_detected': 'bg-red-600',
      'delivery_delayed': 'bg-yellow-500',
      'delivery_arrived': 'bg-green-500',
      'route_deviation': 'bg-purple-500',
      'system_error': 'bg-gray-500',
      'maintenance_required': 'bg-amber-500',
      'access_request': 'bg-indigo-500',
      'security_breach': 'bg-red-700'
    };
    return colors[type] || 'bg-gray-400';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Monitoring Analytics
          </h2>
          <p className="text-muted-foreground">
            Track monitoring system performance and trends
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_alerts || 0}</div>
            {previousSummary && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {(() => {
                  const change = calculateChange(summary?.total_alerts || 0, previousSummary.total_alerts);
                  return (
                    <>
                      {change.isPositive ? (
                        <ArrowUp className="h-3 w-3 text-red-500 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
                      )}
                      <span className={change.isPositive ? 'text-red-500' : 'text-green-500'}>
                        {change.value}%
                      </span>
                      <span className="ml-1">vs previous period</span>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.critical_alerts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.total_alerts ? 
                `${((summary.critical_alerts / summary.total_alerts) * 100).toFixed(1)}% of total` : 
                'No alerts'}
            </p>
          </CardContent>
        </Card>

        {/* Completed Deliveries */}
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.completed_deliveries || 0}</div>
            {previousSummary && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {(() => {
                  const change = calculateChange(summary?.completed_deliveries || 0, previousSummary.completed_deliveries);
                  return (
                    <>
                      {change.isPositive ? (
                        <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={change.isPositive ? 'text-green-500' : 'text-red-500'}>
                        {change.value}%
                      </span>
                      <span className="ml-1">vs previous period</span>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Requests</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_access_requests || 0}</div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                {summary?.approved_requests || 0} approved
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Types Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alert Types Distribution</CardTitle>
            <CardDescription>Breakdown of alerts by type</CardDescription>
          </CardHeader>
          <CardContent>
            {alertBreakdown.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No alerts in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertBreakdown.slice(0, 6).map((item) => (
                  <div key={item.alert_type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getAlertTypeColor(item.alert_type)}`} />
                        {getAlertTypeLabel(item.alert_type)}
                      </span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
            <CardDescription>System performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resolution Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Alert Resolution Rate</span>
                <span className="text-sm text-muted-foreground">
                  {summary?.total_alerts ? 
                    `${((summary.resolved_alerts / summary.total_alerts) * 100).toFixed(1)}%` : 
                    '0%'}
                </span>
              </div>
              <Progress 
                value={summary?.total_alerts ? (summary.resolved_alerts / summary.total_alerts) * 100 : 0} 
                className="h-3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.resolved_alerts || 0} of {summary?.total_alerts || 0} alerts resolved
              </p>
            </div>

            {/* Avg Resolution Time */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                  <p className="text-2xl font-bold">
                    {summary?.avg_resolution_time_min || 0} min
                  </p>
                </div>
              </div>
              {previousSummary && previousSummary.avg_resolution_time_min > 0 && (
                <div className="text-right">
                  {summary?.avg_resolution_time_min < previousSummary.avg_resolution_time_min ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Improved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Slower
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Access Request Approval Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Request Approval Rate</span>
                <span className="text-sm text-muted-foreground">
                  {summary?.total_access_requests ? 
                    `${((summary.approved_requests / summary.total_access_requests) * 100).toFixed(1)}%` : 
                    '0%'}
                </span>
              </div>
              <Progress 
                value={summary?.total_access_requests ? (summary.approved_requests / summary.total_access_requests) * 100 : 0} 
                className="h-3 bg-muted [&>div]:bg-green-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Notifications Stats */}
      {emailStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>Email delivery statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">{emailStats.total_sent}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{emailStats.delivered}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{emailStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{emailStats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Activity Trend
          </CardTitle>
          <CardDescription>Daily metrics over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data available for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-center py-2 px-3">Alerts</th>
                    <th className="text-center py-2 px-3">Resolved</th>
                    <th className="text-center py-2 px-3">Deliveries</th>
                    <th className="text-center py-2 px-3">Access Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyMetrics.map((metric) => (
                    <tr key={metric.date} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">
                        {format(new Date(metric.date), 'MMM dd')}
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline">{metric.alerts_created}</Badge>
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {metric.alerts_resolved}
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {metric.deliveries_completed}
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline">{metric.access_requests_created}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringAnalytics;














