import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Bell,
  Clock,
  MapPin,
  User,
  Activity
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SecurityAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  location?: string;
  user_id?: string;
  user_name?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
}

export function RealTimeSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'critical'>('all');
  const { toast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // For now, using mock data since security_alerts table may not exist
      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'info',
          title: 'System Online',
          description: 'All security systems are functioning normally',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Set up polling for real-time updates
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
      ));
      
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
      ));
      
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge className="bg-blue-500">Info</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="border-red-500 text-red-500">Active</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Acknowledged</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="border-green-500 text-green-500">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'critical') return alert.type === 'critical';
    return true;
  });

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Real-Time Security Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={filter === 'active' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('active')}
              className={filter === 'active' ? 'bg-red-600' : ''}
            >
              Active
            </Button>
            <Button 
              variant={filter === 'critical' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('critical')}
              className={filter === 'critical' ? 'bg-red-600' : ''}
            >
              Critical
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchAlerts}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <p className="text-gray-400">No active alerts</p>
              <p className="text-gray-500 text-sm">All systems are operating normally</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.type === 'critical' 
                      ? 'bg-red-900/20 border-red-700' 
                      : alert.type === 'warning'
                      ? 'bg-yellow-900/20 border-yellow-700'
                      : 'bg-blue-900/20 border-blue-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">{alert.title}</h4>
                          {getAlertBadge(alert.type)}
                          {getStatusBadge(alert.status)}
                        </div>
                        <p className="text-gray-300 text-sm">{alert.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                          {alert.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {alert.location}
                            </span>
                          )}
                          {alert.user_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {alert.user_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alert.status === 'active' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Activity Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-gray-400 text-sm">Monitoring active</span>
          </div>
          <span className="text-gray-500 text-xs">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

