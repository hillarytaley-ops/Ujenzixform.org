/**
 * APP-TO-APP TRACKING MONITOR
 * Secure monitoring of delivery provider apps with real-time status
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Battery, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryProviderApp {
  id: string;
  providerId: string;
  providerName: string;
  isOnline: boolean;
  isInTransit: boolean;
  appVersion: string;
  lastSeen: Date;
  batteryLevel?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  deliveryId?: string;
}

interface AppTrackingProps {
  userRole: string;
  builderId?: string;
  className?: string;
}

export const AppTrackingMonitor: React.FC<AppTrackingProps> = ({
  userRole,
  builderId,
  className = ""
}) => {
  const [providerApps, setProviderApps] = useState<DeliveryProviderApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Security check - only admin and authorized builders can access
  const canAccessTracking = userRole === 'admin' || (userRole === 'builder' && builderId);

  useEffect(() => {
    if (canAccessTracking) {
      fetchProviderApps();
      const interval = setInterval(fetchProviderApps, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [canAccessTracking, builderId]);

  const fetchProviderApps = async () => {
    try {
      // Simulate API call - in production, this would fetch real app status data
      const mockData: DeliveryProviderApp[] = [
        {
          id: 'app-001',
          providerId: 'provider-001',
          providerName: 'Safari Logistics',
          isOnline: true,
          isInTransit: true,
          appVersion: '2.1.4',
          lastSeen: new Date(),
          batteryLevel: 78,
          location: { latitude: -1.2921, longitude: 36.8219 },
          deliveryId: 'del-001'
        },
        {
          id: 'app-002',
          providerId: 'provider-002',
          providerName: 'KenyaTrans',
          isOnline: false,
          isInTransit: false,
          appVersion: '2.0.8',
          lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
          batteryLevel: 23
        },
        {
          id: 'app-003',
          providerId: 'provider-003',
          providerName: 'QuickMove Delivery',
          isOnline: true,
          isInTransit: true,
          appVersion: '2.1.4',
          lastSeen: new Date(),
          batteryLevel: 92,
          location: { latitude: -1.3032, longitude: 36.8083 },
          deliveryId: 'del-003'
        }
      ];

      // Filter based on user access - builders only see their deliveries
      let filteredData = mockData;
      if (userRole === 'builder' && builderId) {
        // In production, filter by builder's deliveries
        filteredData = mockData.filter(app => 
          app.deliveryId && ['del-001', 'del-003'].includes(app.deliveryId)
        );
      }

      setProviderApps(filteredData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch provider app status:', error);
    } finally {
      setLoading(false);
    }
  };

  const logTrackingAccess = async (providerId: string) => {
    try {
      await supabase.from('delivery_access_log').insert({
        action: 'app_tracking_view',
        resource_type: 'provider_app_status',
        resource_id: providerId,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
    } catch (error) {
      console.warn('Tracking access logging failed:', error);
    }
  };

  if (!canAccessTracking) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">App tracking requires authorization</p>
            <Badge variant="outline" className="mt-2">
              {userRole} access insufficient
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Smartphone className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-muted-foreground">Loading app status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (isOnline: boolean, isInTransit: boolean) => {
    if (isOnline && isInTransit) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (isOnline) {
      return <Wifi className="h-4 w-4 text-blue-500" />;
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'text-muted-foreground';
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Status Monitor
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchProviderApps}
              className="h-6 px-2"
            >
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {providerApps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No delivery providers currently tracked</p>
          </div>
        ) : (
          providerApps.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-lg border bg-muted/30"
              onClick={() => logTrackingAccess(app.providerId)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(app.isOnline, app.isInTransit)}
                  <span className="font-medium">{app.providerName}</span>
                  {app.isInTransit && (
                    <Badge variant="default" className="text-xs">
                      In Transit
                    </Badge>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>v{app.appVersion}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {app.lastSeen.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Battery className={`h-4 w-4 ${getBatteryColor(app.batteryLevel)}`} />
                  <span>
                    {app.batteryLevel ? `${app.batteryLevel}%` : 'Unknown'}
                  </span>
                </div>
                
                {app.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-mono text-xs">
                      {app.location.latitude.toFixed(4)}, {app.location.longitude.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {!app.isOnline && (
                <div className="mt-3 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">App offline - contact provider if urgent</span>
                </div>
              )}

              {app.deliveryId && (
                <div className="mt-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Delivery ID: {app.deliveryId}</span>
                </div>
              )}
            </div>
          ))
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-500">
                {providerApps.filter(app => app.isOnline).length}
              </div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-500">
                {providerApps.filter(app => app.isInTransit).length}
              </div>
              <div className="text-xs text-muted-foreground">In Transit</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-500">
                {providerApps.filter(app => !app.isOnline).length}
              </div>
              <div className="text-xs text-muted-foreground">Offline</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};