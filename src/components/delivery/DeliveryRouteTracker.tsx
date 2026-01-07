import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle, 
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  Phone,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DeliveryRoute {
  id: string;
  delivery_id: string;
  provider_id: string;
  provider_name: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  current_lat?: number;
  current_lng?: number;
  current_address?: string;
  heading?: number;
  speed?: number;
  status: string;
  estimated_arrival?: string;
  distance_km?: number;
  duration_minutes?: number;
  started_at?: string;
}

interface DeliveryRouteTrackerProps {
  deliveryId?: string; // Optional - if provided, shows only this delivery
}

export const DeliveryRouteTracker: React.FC<DeliveryRouteTrackerProps> = ({ deliveryId }) => {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<DeliveryRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchRoutes();

    // Real-time updates
    const channel = supabase
      .channel('delivery_routes_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'delivery_routes' 
      }, () => {
        fetchRoutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [deliveryId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchRoutes = async () => {
    try {
      let query = supabase
        .from('delivery_routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (deliveryId) {
        query = query.eq('delivery_id', deliveryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRoutes(data || []);
      
      // Set active route if in transit
      const inTransit = (data || []).find(r => r.status === 'in_transit');
      if (inTransit) {
        setActiveRoute(inTransit);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTracking = useCallback(async (route: DeliveryRoute) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setActiveRoute(route);
    setTracking(true);

    // Update route status to in_transit
    await supabase
      .from('delivery_routes')
      .update({ 
        status: 'in_transit',
        started_at: new Date().toISOString()
      })
      .eq('id', route.id);

    toast.success('Route tracking started');

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading, speed } = position.coords;

        // Update position in database
        await supabase.rpc('update_route_position', {
          p_route_id: route.id,
          p_lat: latitude,
          p_lng: longitude,
          p_heading: heading || null,
          p_speed: speed ? speed * 3.6 : null // Convert m/s to km/h
        });

        // Check if near destination (within 500m)
        if (route.destination_lat && route.destination_lng) {
          const distance = calculateDistance(
            latitude, longitude,
            route.destination_lat, route.destination_lng
          );
          
          if (distance < 0.5) { // 500 meters
            await supabase
              .from('delivery_routes')
              .update({ status: 'near_destination' })
              .eq('id', route.id);
            
            toast.info('Approaching destination!', {
              description: 'Less than 500m away'
            });
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Error getting location');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );

    setWatchId(id);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
    toast.info('Tracking paused');
  }, [watchId]);

  const completeDelivery = async (route: DeliveryRoute) => {
    try {
      await supabase
        .from('delivery_routes')
        .update({ 
          status: 'arrived',
          actual_arrival: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', route.id);

      // Create alert for admin
      await supabase.rpc('create_monitoring_alert', {
        p_alert_type: 'delivery_arrived',
        p_severity: 'info',
        p_title: 'Delivery Completed',
        p_message: `Delivery to ${route.destination_address} has been completed.`,
        p_target_role: 'admin'
      });

      stopTracking();
      toast.success('Delivery marked as complete!');
      fetchRoutes();
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Failed to complete delivery');
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'near_destination': return 'bg-yellow-100 text-yellow-800';
      case 'arrived': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'near_destination': return <MapPin className="h-4 w-4" />;
      case 'arrived': case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Navigation className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-600" />
            Delivery Route Tracker
          </CardTitle>
          <CardDescription>
            Track your delivery routes in real-time
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Tracking Banner */}
      {tracking && activeRoute && (
        <Alert className="bg-blue-50 border-blue-200">
          <Navigation className="h-4 w-4 animate-pulse" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Currently tracking:</strong> {activeRoute.destination_address}
              {activeRoute.speed && (
                <span className="ml-2 text-sm text-muted-foreground">
                  Speed: {activeRoute.speed.toFixed(1)} km/h
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={stopTracking}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button size="sm" onClick={() => completeDelivery(activeRoute)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Routes List */}
      {routes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No delivery routes assigned</p>
            <p className="text-sm">Routes will appear here when you have deliveries</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <Card key={route.id} className={
              route.status === 'in_transit' ? 'border-blue-300 bg-blue-50/30' :
              route.status === 'near_destination' ? 'border-yellow-300 bg-yellow-50/30' :
              route.status === 'arrived' || route.status === 'completed' ? 'border-green-300 bg-green-50/30' : ''
            }>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(route.status)}
                      <Badge className={getStatusColor(route.status)}>
                        {route.status?.replace('_', ' ')}
                      </Badge>
                      {route.estimated_arrival && route.status !== 'completed' && (
                        <span className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          ETA: {format(new Date(route.estimated_arrival), 'p')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">From:</span>
                        <p className="font-medium">{route.origin_address}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>
                        <p className="font-medium">{route.destination_address}</p>
                      </div>
                    </div>

                    {route.distance_km && route.duration_minutes && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {route.distance_km.toFixed(1)} km
                        </span>
                        <span>
                          <Clock className="h-3 w-3 inline mr-1" />
                          ~{route.duration_minutes} min
                        </span>
                      </div>
                    )}

                    {route.current_lat && route.current_lng && route.status === 'in_transit' && (
                      <div className="text-xs text-muted-foreground">
                        Current position: {route.current_lat.toFixed(4)}, {route.current_lng.toFixed(4)}
                        {route.current_address && ` (${route.current_address})`}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {route.status === 'pending' && (
                      <Button onClick={() => startTracking(route)}>
                        <Play className="h-4 w-4 mr-1" />
                        Start Route
                      </Button>
                    )}
                    
                    {route.status === 'in_transit' && !tracking && (
                      <Button onClick={() => startTracking(route)}>
                        <Navigation className="h-4 w-4 mr-1" />
                        Resume Tracking
                      </Button>
                    )}

                    {(route.status === 'in_transit' || route.status === 'near_destination') && (
                      <Button variant="default" onClick={() => completeDelivery(route)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete Delivery
                      </Button>
                    )}

                    {route.status === 'completed' && (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress indicator for in-transit deliveries */}
                {route.status === 'in_transit' && route.distance_km && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Origin</span>
                      <span>Destination</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryRouteTracker;














