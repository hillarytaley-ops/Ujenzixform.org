import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Database, 
  Wifi, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Shield,
  Globe,
  Cloud,
  RefreshCw,
  Download,
  Settings,
  Bell,
  Eye,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemComponent {
  id: string;
  name: string;
  type: 'server' | 'database' | 'api' | 'storage' | 'cdn' | 'monitoring';
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  metrics: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold: {
    warning: number;
    critical: number;
  };
  history: Array<{
    timestamp: Date;
    value: number;
  }>;
}

interface SystemAlert {
  id: string;
  componentId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  autoResolved: boolean;
}

export const SystemHealthMonitor: React.FC = () => {
  const [components, setComponents] = useState<SystemComponent[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSystemData();
    
    if (isMonitoring) {
      const interval = setInterval(loadSystemData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // Mock system data - replace with actual monitoring API
      const mockComponents: SystemComponent[] = [
        {
          id: 'web-server',
          name: 'Web Server',
          type: 'server',
          status: 'healthy',
          uptime: 99.8,
          responseTime: 245,
          errorRate: 0.1,
          lastCheck: new Date(),
          metrics: {
            cpu: 45,
            memory: 62,
            disk: 34,
            network: 78
          }
        },
        {
          id: 'database',
          name: 'PostgreSQL Database',
          type: 'database',
          status: 'healthy',
          uptime: 99.9,
          responseTime: 12,
          errorRate: 0.05,
          lastCheck: new Date(),
          metrics: {
            cpu: 28,
            memory: 71,
            disk: 67,
            network: 45
          }
        },
        {
          id: 'api-gateway',
          name: 'API Gateway',
          type: 'api',
          status: 'warning',
          uptime: 98.5,
          responseTime: 456,
          errorRate: 1.2,
          lastCheck: new Date(),
          metrics: {
            cpu: 78,
            memory: 85,
            disk: 23,
            network: 92
          }
        },
        {
          id: 'file-storage',
          name: 'File Storage',
          type: 'storage',
          status: 'healthy',
          uptime: 99.7,
          responseTime: 89,
          errorRate: 0.2,
          lastCheck: new Date(),
          metrics: {
            disk: 89,
            network: 56
          }
        },
        {
          id: 'cdn',
          name: 'Content Delivery Network',
          type: 'cdn',
          status: 'healthy',
          uptime: 99.95,
          responseTime: 34,
          errorRate: 0.01,
          lastCheck: new Date(),
          metrics: {
            network: 67
          }
        }
      ];

      const mockMetrics: PerformanceMetric[] = [
        {
          id: 'response-time',
          name: 'Average Response Time',
          value: 245,
          unit: 'ms',
          trend: 'down',
          threshold: { warning: 500, critical: 1000 },
          history: [
            { timestamp: new Date(Date.now() - 3600000), value: 267 },
            { timestamp: new Date(Date.now() - 1800000), value: 251 },
            { timestamp: new Date(), value: 245 }
          ]
        },
        {
          id: 'error-rate',
          name: 'Error Rate',
          value: 0.3,
          unit: '%',
          trend: 'stable',
          threshold: { warning: 1, critical: 5 },
          history: [
            { timestamp: new Date(Date.now() - 3600000), value: 0.2 },
            { timestamp: new Date(Date.now() - 1800000), value: 0.4 },
            { timestamp: new Date(), value: 0.3 }
          ]
        },
        {
          id: 'throughput',
          name: 'Request Throughput',
          value: 1250,
          unit: 'req/min',
          trend: 'up',
          threshold: { warning: 2000, critical: 3000 },
          history: [
            { timestamp: new Date(Date.now() - 3600000), value: 1180 },
            { timestamp: new Date(Date.now() - 1800000), value: 1220 },
            { timestamp: new Date(), value: 1250 }
          ]
        }
      ];

      const mockAlerts: SystemAlert[] = [
        {
          id: 'alert-001',
          componentId: 'api-gateway',
          severity: 'warning',
          title: 'High CPU Usage',
          message: 'API Gateway CPU usage is above 75% for the last 10 minutes',
          timestamp: new Date(),
          acknowledged: false,
          autoResolved: false
        },
        {
          id: 'alert-002',
          componentId: 'database',
          severity: 'info',
          title: 'Backup Completed',
          message: 'Daily database backup completed successfully',
          timestamp: new Date(Date.now() - 1800000),
          acknowledged: true,
          autoResolved: true
        }
      ];

      setComponents(mockComponents);
      setMetrics(mockMetrics);
      setAlerts(mockAlerts);

    } catch (error: any) {
      console.error('Error loading system data:', error);
      toast({
        title: "Error",
        description: "Failed to load system health data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'offline': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'server': return <Server className="h-5 w-5" />;
      case 'database': return <Database className="h-5 w-5" />;
      case 'api': return <Zap className="h-5 w-5" />;
      case 'storage': return <HardDrive className="h-5 w-5" />;
      case 'cdn': return <Globe className="h-5 w-5" />;
      case 'monitoring': return <Activity className="h-5 w-5" />;
      default: return <Server className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
      
      toast({
        title: "Alert Acknowledged",
        description: "System alert has been acknowledged",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const healthyComponents = components.filter(c => c.status === 'healthy').length;
  const totalComponents = components.length;
  const systemHealthScore = totalComponents > 0 ? Math.round((healthyComponents / totalComponents) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system health...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-muted-foreground">Monitor system components and performance metrics</p>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={loadSystemData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={systemHealthScore} className="h-4" />
            </div>
            <div className="text-3xl font-bold">
              {systemHealthScore}%
            </div>
            <Badge variant={systemHealthScore > 90 ? 'default' : systemHealthScore > 70 ? 'secondary' : 'destructive'}>
              {systemHealthScore > 90 ? 'Excellent' : systemHealthScore > 70 ? 'Good' : 'Needs Attention'}
            </Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {healthyComponents} of {totalComponents} components healthy
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical System Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length} critical system alerts require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <span className="font-medium">245ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Throughput</span>
                  <span className="font-medium">1,250 req/min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <span className="font-medium">0.3%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Uptime (24h)</span>
                  <span className="font-medium">99.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Uptime (30d)</span>
                  <span className="font-medium">99.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">MTTR</span>
                  <span className="font-medium">4.2 min</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Status Grid */}
          <Card>
            <CardHeader>
              <CardTitle>System Components</CardTitle>
              <CardDescription>Current status of all system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {components.map((component) => (
                  <div key={component.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getComponentIcon(component.type)}
                        <span className="font-medium">{component.name}</span>
                      </div>
                      <Badge className={getStatusColor(component.status)}>
                        {component.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span>{component.uptime}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response:</span>
                        <span>{component.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Error Rate:</span>
                        <span>{component.errorRate}%</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3"
                      onClick={() => setSelectedComponent(component.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
              <CardDescription>Detailed view of system components and their metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {components.map((component) => (
                  <div key={component.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getComponentIcon(component.type)}
                        <div>
                          <h3 className="font-medium">{component.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{component.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(component.status)}
                        <Badge className={getStatusColor(component.status)}>
                          {component.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Uptime:</span>
                        <div className="font-medium">{component.uptime}%</div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Response Time:</span>
                        <div className="font-medium">{component.responseTime}ms</div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Error Rate:</span>
                        <div className="font-medium">{component.errorRate}%</div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Last Check:</span>
                        <div className="font-medium">{format(component.lastCheck, 'HH:mm')}</div>
                      </div>
                    </div>

                    {/* Resource Metrics */}
                    {component.metrics && (
                      <div className="space-y-2">
                        {component.metrics.cpu && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1">
                                <Cpu className="h-3 w-3" />
                                CPU Usage
                              </span>
                              <span>{component.metrics.cpu}%</span>
                            </div>
                            <Progress value={component.metrics.cpu} className="h-2" />
                          </div>
                        )}
                        
                        {component.metrics.memory && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1">
                                <MemoryStick className="h-3 w-3" />
                                Memory Usage
                              </span>
                              <span>{component.metrics.memory}%</span>
                            </div>
                            <Progress value={component.metrics.memory} className="h-2" />
                          </div>
                        )}
                        
                        {component.metrics.disk && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                Disk Usage
                              </span>
                              <span>{component.metrics.disk}%</span>
                            </div>
                            <Progress value={component.metrics.disk} className="h-2" />
                          </div>
                        )}
                        
                        {component.metrics.network && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1">
                                <Wifi className="h-3 w-3" />
                                Network I/O
                              </span>
                              <span>{component.metrics.network}%</span>
                            </div>
                            <Progress value={component.metrics.network} className="h-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{metric.name}</CardTitle>
                    {getTrendIcon(metric.trend)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {metric.value} {metric.unit}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warning:</span>
                      <span>{metric.threshold.warning} {metric.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Critical:</span>
                      <span>{metric.threshold.critical} {metric.unit}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="h-16 bg-muted rounded flex items-end justify-center">
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Trend: {metric.trend}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{alert.title}</h3>
                            <Badge className={
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                              alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            }>
                              {alert.severity}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline">Acknowledged</Badge>
                            )}
                            {alert.autoResolved && (
                              <Badge variant="secondary">Auto-resolved</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(alert.timestamp, 'MMM dd, yyyy HH:mm')}</span>
                            <span>Component: {components.find(c => c.id === alert.componentId)?.name}</span>
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && !alert.autoResolved && (
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
                
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    No system alerts
                    <p className="text-sm">All systems are operating normally</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
