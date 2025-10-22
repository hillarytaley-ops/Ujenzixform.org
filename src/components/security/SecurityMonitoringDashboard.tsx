import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Activity, 
  Lock, 
  Users, 
  Database,
  TrendingUp,
  RefreshCw,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  created_at: string;
  user_id?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  activeUsers: number;
  failedLogins: number;
  suspiciousActivity: number;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    activeUsers: 0,
    failedLogins: 0,
    suspiciousActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
    
    if (autoRefresh) {
      const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      setEvents(eventsData || []);

      // Calculate metrics
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentEvents = eventsData?.filter(event => 
        new Date(event.created_at) > last24Hours
      ) || [];

      const newMetrics: SecurityMetrics = {
        totalEvents: recentEvents.length,
        criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
        highEvents: recentEvents.filter(e => e.severity === 'high').length,
        mediumEvents: recentEvents.filter(e => e.severity === 'medium').length,
        lowEvents: recentEvents.filter(e => e.severity === 'low').length,
        activeUsers: new Set(recentEvents.map(e => e.user_id).filter(Boolean)).size,
        failedLogins: recentEvents.filter(e => e.event_type.includes('failed_login')).length,
        suspiciousActivity: recentEvents.filter(e => 
          e.severity === 'high' || e.severity === 'critical'
        ).length
      };

      setMetrics(newMetrics);

    } catch (error: any) {
      console.error('Error loading security data:', error);
      toast({
        title: "Security Data Error",
        description: "Failed to load security monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const exportSecurityReport = async () => {
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        metrics,
        events: events.slice(0, 100), // Last 100 events
        summary: {
          securityScore: Math.max(0, 100 - (metrics.criticalEvents * 10 + metrics.highEvents * 5)),
          riskLevel: metrics.criticalEvents > 0 ? 'Critical' : 
                    metrics.highEvents > 5 ? 'High' : 
                    metrics.mediumEvents > 10 ? 'Medium' : 'Low'
        }
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Security report has been downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export security report",
        variant: "destructive"
      });
    }
  };

  const securityScore = Math.max(0, 100 - (metrics.criticalEvents * 10 + metrics.highEvents * 5));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security Monitoring</h1>
          <p className="text-muted-foreground">Real-time security events and system health</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportSecurityReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            size="sm"
            onClick={loadSecurityData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Score (Last 24 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={securityScore} className="h-3" />
            </div>
            <div className="text-2xl font-bold">
              {securityScore}/100
            </div>
            <Badge variant={securityScore > 80 ? 'default' : securityScore > 60 ? 'secondary' : 'destructive'}>
              {securityScore > 80 ? 'Excellent' : securityScore > 60 ? 'Good' : 'Needs Attention'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {metrics.criticalEvents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Security Events Detected</AlertTitle>
          <AlertDescription>
            {metrics.criticalEvents} critical security events in the last 24 hours require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Immediate attention required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Unique active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Lock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{metrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Events Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Events</TabsTrigger>
          <TabsTrigger value="critical">Critical Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest security events across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getSeverityIcon(event.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{event.event_type}</span>
                        <Badge variant={getSeverityColor(event.severity) as any}>
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                      {event.details && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No security events found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Security Events</CardTitle>
              <CardDescription>High-priority events requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events
                  .filter(event => event.severity === 'critical' || event.severity === 'high')
                  .map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.event_type}</span>
                          <Badge variant="destructive">
                            {event.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                        {event.details && (
                          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                
                {events.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    No critical security events detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Critical</span>
                    <span className="text-sm font-medium text-red-500">{metrics.criticalEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">High</span>
                    <span className="text-sm font-medium text-orange-500">{metrics.highEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Medium</span>
                    <span className="text-sm font-medium text-yellow-500">{metrics.mediumEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Low</span>
                    <span className="text-sm font-medium text-blue-500">{metrics.lowEvents}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Security Score</span>
                    <span className="text-sm font-medium">{securityScore}/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk Level</span>
                    <Badge variant={
                      metrics.criticalEvents > 0 ? 'destructive' : 
                      metrics.highEvents > 5 ? 'secondary' : 'default'
                    }>
                      {metrics.criticalEvents > 0 ? 'Critical' : 
                       metrics.highEvents > 5 ? 'High' : 
                       metrics.mediumEvents > 10 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Suspicious Activity</span>
                    <span className="text-sm font-medium">{metrics.suspiciousActivity}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

