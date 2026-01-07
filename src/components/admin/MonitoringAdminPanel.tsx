import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Camera, 
  Truck, 
  Bell, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  MapPin,
  Users,
  Settings,
  Send,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Mail,
  Calendar,
  Layers,
  Printer,
  ArrowUpCircle,
  Webhook,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MonitoringAnalytics } from './MonitoringAnalytics';
import { MonitoringCharts, ChartFilters } from './MonitoringCharts';
import { EmailTemplatesManager } from './EmailTemplatesManager';
import { AdvancedCharts } from './AdvancedCharts';
import { ScheduledReportsManager } from './ScheduledReportsManager';
import { AnalyticsFilters, FilterConfig } from './AnalyticsFilters';
import { PrintableReport } from './PrintableReport';
import { AlertEscalationManager } from './AlertEscalationManager';
import { WebhookIntegrations } from './WebhookIntegrations';
import { GeofenceManager } from './GeofenceManager';

interface CameraAccessRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  project_name: string;
  reason: string;
  access_type: string;
  requested_duration: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

interface MonitoringAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  target_role?: string;
}

interface DeliveryRoute {
  id: string;
  provider_name: string;
  origin_address: string;
  destination_address: string;
  status: string;
  current_lat?: number;
  current_lng?: number;
  estimated_arrival?: string;
}

export const MonitoringAdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<CameraAccessRequest[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CameraAccessRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Analytics filters state
  const [analyticsFilters, setAnalyticsFilters] = useState<FilterConfig | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    pendingRequests: 0,
    activeAlerts: 0,
    activeRoutes: 0,
    criticalAlerts: 0
  });

  // New alert form
  const [newAlert, setNewAlert] = useState({
    alertType: 'system_error',
    severity: 'info',
    title: '',
    message: '',
    targetRole: 'all'
  });

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions
    const requestsChannel = supabase
      .channel('camera_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_access_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchAlerts(), fetchRoutes()]);
    setLoading(false);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('camera_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      setStats(prev => ({ ...prev, pendingRequests: (data || []).filter(r => r.status === 'pending').length }));
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
      const active = (data || []).filter(a => a.status === 'active');
      setStats(prev => ({ 
        ...prev, 
        activeAlerts: active.length,
        criticalAlerts: active.filter(a => a.severity === 'critical' || a.severity === 'emergency').length
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select('*')
        .in('status', ['pending', 'in_transit', 'near_destination'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
      setStats(prev => ({ ...prev, activeRoutes: (data || []).length }));
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleApproveRequest = async (request: CameraAccessRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const accessDuration = {
        '1_day': 1,
        '7_days': 7,
        '30_days': 30,
        '90_days': 90,
        'permanent': 365 * 10
      }[request.requested_duration] || 30;

      const accessExpires = new Date();
      accessExpires.setDate(accessExpires.getDate() + accessDuration);

      const { error } = await supabase
        .from('camera_access_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
          access_starts_at: new Date().toISOString(),
          access_expires_at: accessExpires.toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      // Create notification for the requester
      await supabase.rpc('create_monitoring_alert', {
        p_alert_type: 'access_request',
        p_severity: 'info',
        p_title: 'Camera Access Approved',
        p_message: `Your request for camera access to ${request.project_name} has been approved.`,
        p_target_user_id: request.requester_id
      });

      toast.success('Access request approved');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (request: CameraAccessRequest) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('camera_access_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
          rejection_reason: rejectionReason
        })
        .eq('id', request.id);

      if (error) throw error;

      // Create notification for the requester
      await supabase.rpc('create_monitoring_alert', {
        p_alert_type: 'access_request',
        p_severity: 'warning',
        p_title: 'Camera Access Denied',
        p_message: `Your request for camera access to ${request.project_name} has been denied. Reason: ${rejectionReason}`,
        p_target_user_id: request.requester_id
      });

      toast.success('Access request rejected');
      setSelectedRequest(null);
      setAdminNotes('');
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('monitoring_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('monitoring_alerts')
        .update({
          status: 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert resolved');
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.title.trim() || !newAlert.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_monitoring_alert', {
        p_alert_type: newAlert.alertType,
        p_severity: newAlert.severity,
        p_title: newAlert.title,
        p_message: newAlert.message,
        p_target_role: newAlert.targetRole === 'all' ? null : newAlert.targetRole
      });

      if (error) throw error;

      toast.success('Alert created and sent');
      setNewAlert({
        alertType: 'system_error',
        severity: 'info',
        title: '',
        message: '',
        targetRole: 'all'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Camera access requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalAlerts > 0 && (
                <span className="text-red-600">{stats.criticalAlerts} critical</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRoutes}</div>
            <p className="text-xs text-muted-foreground">Deliveries in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Monitoring Administration
          </CardTitle>
          <CardDescription>
            Manage camera access requests, alerts, and delivery routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-13">
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Requests
                {stats.pendingRequests > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {stats.pendingRequests}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alerts
                {stats.activeAlerts > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {stats.activeAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="routes" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Routes
              </TabsTrigger>
              <TabsTrigger value="send" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Alert
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled
              </TabsTrigger>
              <TabsTrigger value="print" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </TabsTrigger>
              <TabsTrigger value="escalation" className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                Escalation
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="geofencing" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Geofencing
              </TabsTrigger>
            </TabsList>

            {/* Camera Access Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Camera Access Requests</h3>
                <Button variant="outline" size="sm" onClick={fetchRequests}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No camera access requests</p>
                    </div>
                  ) : (
                    requests.map((request) => (
                      <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-200 bg-yellow-50/50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{request.requester_name || 'Unknown User'}</span>
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{request.requester_email}</p>
                              <p className="text-sm"><strong>Project:</strong> {request.project_name}</p>
                              <p className="text-sm"><strong>Access Type:</strong> {request.access_type?.replace('_', ' ')}</p>
                              <p className="text-sm"><strong>Duration:</strong> {request.requested_duration?.replace('_', ' ')}</p>
                              <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                              <p className="text-xs text-muted-foreground">
                                Requested: {format(new Date(request.created_at), 'PPp')}
                              </p>
                            </div>
                            
                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    handleApproveRequest(request);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>

                          {selectedRequest?.id === request.id && request.status === 'pending' && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              <div>
                                <Label>Admin Notes (optional)</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes for this decision..."
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label>Rejection Reason (required for rejection)</Label>
                                <Textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Why is this request being rejected?"
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedRequest(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectRequest(request)}
                                >
                                  Confirm Rejection
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Monitoring Alerts</h3>
                <Button variant="outline" size="sm" onClick={fetchAlerts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No alerts</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <Card key={alert.id} className={alert.status === 'active' && alert.severity === 'critical' ? 'border-red-300 bg-red-50/50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(alert.severity)}>
                                  {alert.severity}
                                </Badge>
                                <Badge className={getStatusColor(alert.status)}>
                                  {alert.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {alert.alert_type?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(alert.created_at), 'PPp')}
                                {alert.target_role && ` • Target: ${alert.target_role}`}
                              </p>
                            </div>
                            
                            {alert.status === 'active' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcknowledgeAlert(alert.id)}
                                >
                                  Acknowledge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleResolveAlert(alert.id)}
                                >
                                  Resolve
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Routes Tab */}
            <TabsContent value="routes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Delivery Routes</h3>
                <Button variant="outline" size="sm" onClick={fetchRoutes}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {routes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active delivery routes</p>
                    </div>
                  ) : (
                    routes.map((route) => (
                      <Card key={route.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                <span className="font-medium">{route.provider_name || 'Unknown Provider'}</span>
                                <Badge className={getStatusColor(route.status)}>
                                  {route.status?.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm">
                                <strong>From:</strong> {route.origin_address}
                              </p>
                              <p className="text-sm">
                                <strong>To:</strong> {route.destination_address}
                              </p>
                              {route.estimated_arrival && (
                                <p className="text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  ETA: {format(new Date(route.estimated_arrival), 'PPp')}
                                </p>
                              )}
                              {route.current_lat && route.current_lng && (
                                <p className="text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  Current: {route.current_lat.toFixed(4)}, {route.current_lng.toFixed(4)}
                                </p>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Track
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Send Alert Tab */}
            <TabsContent value="send" className="space-y-4">
              <h3 className="text-lg font-semibold">Send New Alert</h3>
              
              <div className="grid gap-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Alert Type</Label>
                    <Select value={newAlert.alertType} onValueChange={(v) => setNewAlert({ ...newAlert, alertType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system_error">System Error</SelectItem>
                        <SelectItem value="maintenance_required">Maintenance Required</SelectItem>
                        <SelectItem value="security_breach">Security Breach</SelectItem>
                        <SelectItem value="camera_offline">Camera Offline</SelectItem>
                        <SelectItem value="camera_low_battery">Camera Low Battery</SelectItem>
                        <SelectItem value="motion_detected">Motion Detected</SelectItem>
                        <SelectItem value="intrusion_detected">Intrusion Detected</SelectItem>
                        <SelectItem value="delivery_delayed">Delivery Delayed</SelectItem>
                        <SelectItem value="delivery_arrived">Delivery Arrived</SelectItem>
                        <SelectItem value="route_deviation">Route Deviation</SelectItem>
                        <SelectItem value="material_quality">Material Quality Issue</SelectItem>
                        <SelectItem value="access_request">Access Request Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Severity</Label>
                    <Select value={newAlert.severity} onValueChange={(v) => setNewAlert({ ...newAlert, severity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Target Audience</Label>
                  <Select value={newAlert.targetRole} onValueChange={(v) => setNewAlert({ ...newAlert, targetRole: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="builder">Builders Only</SelectItem>
                      <SelectItem value="supplier">Suppliers Only</SelectItem>
                      <SelectItem value="delivery_provider">Delivery Providers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Alert Title</Label>
                  <Input
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    placeholder="Enter alert title..."
                  />
                </div>

                <div>
                  <Label>Alert Message</Label>
                  <Textarea
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    placeholder="Enter alert message..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleCreateAlert} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Alert
                </Button>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Filters Section */}
              <AnalyticsFilters
                onFilterChange={(filters) => setAnalyticsFilters(filters)}
              />

              {/* Charts Section - Connected to Filters */}
              <MonitoringCharts 
                externalFilters={analyticsFilters ? {
                  cameras: analyticsFilters.cameras,
                  projects: analyticsFilters.projects,
                  alertTypes: analyticsFilters.alertTypes,
                  severities: analyticsFilters.severities,
                  showResolved: analyticsFilters.showResolved
                } : undefined}
              />

              {/* Detailed Analytics Section */}
              <div className="border-t pt-6">
                <MonitoringAnalytics />
              </div>
            </TabsContent>

            {/* Email Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <EmailTemplatesManager />
            </TabsContent>

            {/* Advanced Charts Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <AdvancedCharts />
            </TabsContent>

            {/* Scheduled Reports Tab */}
            <TabsContent value="scheduled" className="space-y-4">
              <ScheduledReportsManager />
            </TabsContent>

            {/* Printable Reports Tab */}
            <TabsContent value="print" className="space-y-4">
              <PrintableReport />
            </TabsContent>

            {/* Alert Escalation Tab */}
            <TabsContent value="escalation" className="space-y-4">
              <AlertEscalationManager />
            </TabsContent>

            {/* Webhook Integrations Tab */}
            <TabsContent value="webhooks" className="space-y-4">
              <WebhookIntegrations />
            </TabsContent>

            {/* Geofencing Tab */}
            <TabsContent value="geofencing" className="space-y-4">
              <GeofenceManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringAdminPanel;














