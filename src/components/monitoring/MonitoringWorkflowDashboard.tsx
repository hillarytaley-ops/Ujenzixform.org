import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Activity, 
  Camera, 
  Truck, 
  Package, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Shield,
  Zap,
  Server,
  Wifi,
  Battery,
  MapPin,
  RefreshCw,
  Download,
  Settings,
  Bell,
  Play,
  Pause,
  Square
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemMetrics {
  totalSites: number;
  activeCameras: number;
  onlineDeliveries: number;
  systemUptime: number;
  avgResponseTime: number;
  errorRate: number;
  dataTransfer: number;
  storageUsed: number;
}

interface MonitoringAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
}

interface SiteStatus {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  cameras: number;
  activeCameras: number;
  lastUpdate: string;
  uptime: number;
  issues: number;
}

interface DeliveryTracking {
  id: string;
  vehicleId: string;
  driverName: string;
  status: 'in_transit' | 'delivered' | 'delayed' | 'offline';
  location: { lat: number; lng: number };
  destination: string;
  eta: string;
  batteryLevel: number;
  signalStrength: number;
}

interface MonitoringWorkflowDashboardProps {
  userRole?: string;
  userId?: string;
  selectedProjects?: string[];
}

export const MonitoringWorkflowDashboard: React.FC<MonitoringWorkflowDashboardProps> = ({ userRole, userId, selectedProjects = [] }) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalSites: 0,
    activeCameras: 0,
    onlineDeliveries: 0,
    systemUptime: 0,
    avgResponseTime: 0,
    errorRate: 0,
    dataTransfer: 0,
    storageUsed: 0
  });
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [sites, setSites] = useState<SiteStatus[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Check if user is admin
  const isAdmin = userRole === 'admin';
  const canControlSystem = isAdmin;

  useEffect(() => {
    loadMonitoringData();
    
    if (isMonitoring) {
      const interval = setInterval(loadMonitoringData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockMetrics: SystemMetrics = {
        totalSites: 24,
        activeCameras: 156,
        onlineDeliveries: 18,
        systemUptime: 99.7,
        avgResponseTime: 245,
        errorRate: 0.3,
        dataTransfer: 2.4,
        storageUsed: 67.8
      };

      const mockAlerts: MonitoringAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Camera Offline',
          message: 'Camera CAM-045 at Westlands Site has been offline for 15 minutes',
          timestamp: new Date().toISOString(),
          source: 'Camera System',
          acknowledged: false
        },
        {
          id: '2',
          type: 'info',
          title: 'Delivery Update',
          message: 'Vehicle KCA-123A has completed delivery to Kilimani Site',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          source: 'Delivery Tracking',
          acknowledged: true
        },
        {
          id: '3',
          type: 'critical',
          title: 'System Alert',
          message: 'High CPU usage detected on monitoring server',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          source: 'System Monitor',
          acknowledged: false
        }
      ];

      const mockSites: SiteStatus[] = [
        {
          id: 'site-001',
          name: 'Westlands Commercial Complex',
          location: 'Westlands, Nairobi',
          status: 'online',
          cameras: 8,
          activeCameras: 7,
          lastUpdate: new Date().toISOString(),
          uptime: 98.5,
          issues: 1
        },
        {
          id: 'site-002',
          name: 'Kilimani Residential Project',
          location: 'Kilimani, Nairobi',
          status: 'online',
          cameras: 6,
          activeCameras: 6,
          lastUpdate: new Date().toISOString(),
          uptime: 100,
          issues: 0
        },
        {
          id: 'site-003',
          name: 'Karen Shopping Mall',
          location: 'Karen, Nairobi',
          status: 'maintenance',
          cameras: 12,
          activeCameras: 0,
          lastUpdate: new Date(Date.now() - 3600000).toISOString(),
          uptime: 95.2,
          issues: 3
        }
      ];

      const mockDeliveries: DeliveryTracking[] = [
        {
          id: 'del-001',
          vehicleId: 'KCA-123A',
          driverName: 'John Mwangi',
          status: 'in_transit',
          location: { lat: -1.2921, lng: 36.8219 },
          destination: 'Westlands Site',
          eta: '14:30',
          batteryLevel: 78,
          signalStrength: 85
        },
        {
          id: 'del-002',
          vehicleId: 'KBZ-456B',
          driverName: 'Mary Wanjiku',
          status: 'delivered',
          location: { lat: -1.3032, lng: 36.8083 },
          destination: 'Kilimani Site',
          eta: 'Completed',
          batteryLevel: 92,
          signalStrength: 78
        },
        {
          id: 'del-003',
          vehicleId: 'KCD-789C',
          driverName: 'Peter Kamau',
          status: 'delayed',
          location: { lat: -1.2500, lng: 36.8000 },
          destination: 'Karen Site',
          eta: '16:45',
          batteryLevel: 23,
          signalStrength: 45
        }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setSites(mockSites);
      setDeliveries(mockDeliveries);
      setLastUpdate(new Date());

    } catch (error: any) {
      console.error('Error loading monitoring data:', error);
      toast({
        title: "Error",
        description: "Failed to load monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
      
      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'in_transit': case 'delivered': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline': case 'delayed': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Workflow Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Real-time system monitoring and site surveillance" : "View your construction project monitoring data"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? "Live Monitoring" : "Monitoring Paused"}
            </Badge>
            {!isAdmin && (
              <Badge variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                View Only Access
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Last updated: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {canControlSystem && (
            <Button
              variant="outline"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={loadMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSites}</div>
            <p className="text-xs text-muted-foreground">
              {sites.filter(s => s.status === 'online').length} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Cameras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCameras}</div>
            <p className="text-xs text-muted-foreground">
              Across all sites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onlineDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {deliveries.filter(d => d.status === 'in_transit').length} in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(a => a.type === 'critical' && !a.acknowledged).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical System Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => a.type === 'critical' && !a.acknowledged).length} critical alerts require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Monitoring Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Response Time</span>
                    <span>{metrics.avgResponseTime}ms</span>
                  </div>
                  <Progress value={Math.max(0, 100 - (metrics.avgResponseTime / 10))} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Error Rate</span>
                    <span>{metrics.errorRate}%</span>
                  </div>
                  <Progress value={Math.max(0, 100 - (metrics.errorRate * 20))} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage Used</span>
                    <span>{metrics.storageUsed}%</span>
                  </div>
                  <Progress value={metrics.storageUsed} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Camera className="h-6 w-6 mb-2" />
                    View Cameras
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Truck className="h-6 w-6 mb-2" />
                    Track Deliveries
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Bell className="h-6 w-6 mb-2" />
                    Manage Alerts
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{alert.title}</span>
                        <Badge className={getAlertColor(alert.type)}>
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(alert.timestamp), 'MMM dd, HH:mm')}</span>
                        <span>{alert.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Construction Sites</CardTitle>
              <CardDescription>Monitor all construction site cameras and systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sites.map((site) => (
                  <div key={site.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{site.name}</h3>
                        <p className="text-sm text-muted-foreground">{site.location}</p>
                      </div>
                      <Badge className={getStatusColor(site.status)}>
                        {site.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cameras:</span>
                        <div className="font-medium">{site.activeCameras}/{site.cameras} active</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <div className="font-medium">{site.uptime}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Issues:</span>
                        <div className="font-medium">{site.issues}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Update:</span>
                        <div className="font-medium">{format(new Date(site.lastUpdate), 'HH:mm')}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Cameras
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Tracking</CardTitle>
              <CardDescription>Real-time tracking of delivery vehicles and drivers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{delivery.vehicleId}</h3>
                        <p className="text-sm text-muted-foreground">Driver: {delivery.driverName}</p>
                      </div>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <div className="font-medium">{delivery.destination}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ETA:</span>
                        <div className="font-medium">{delivery.eta}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Battery className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{delivery.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{delivery.signalStrength}%</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Location
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Driver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Monitor and manage system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`border rounded-lg p-4 ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{alert.title}</h3>
                            <Badge className={getAlertColor(alert.type)}>
                              {alert.type}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline">Acknowledged</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                            <span>Source: {alert.source}</span>
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">System Uptime</span>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +2.1%
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <div className="flex items-center text-green-600">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    -15ms
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <div className="flex items-center text-green-600">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    -0.1%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Network I/O</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
