import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck, 
  Route, 
  Battery, 
  Wifi, 
  Play, 
  Pause,
  RefreshCw,
  Maximize2,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Radio
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { realTimeGPSService, GPSLocation as RealTimeGPSLocation, TrackingSubscription } from "@/services/RealTimeGPSService";

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  altitude?: number;
}

interface DeliveryRoute {
  id: string;
  delivery_id: string;
  start_location: GPSLocation;
  end_location: GPSLocation;
  current_location: GPSLocation;
  waypoints: GPSLocation[];
  total_distance: number;
  estimated_duration: number;
  actual_duration?: number;
  traffic_conditions: 'light' | 'moderate' | 'heavy';
  route_status: 'planned' | 'active' | 'completed' | 'delayed';
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  current_location: GPSLocation;
  battery_level: number;
  signal_strength: number;
  is_online: boolean;
  last_update: string;
}

interface GPSTrackerProps {
  deliveryId: string;
  userRole?: string;
  showDriverContact?: boolean;
  autoRefresh?: boolean;
}

export const GPSTracker: React.FC<GPSTrackerProps> = ({ 
  deliveryId, 
  userRole = 'builder',
  showDriverContact = false,
  autoRefresh = true 
}) => {
  const [route, setRoute] = useState<DeliveryRoute | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<RealTimeGPSLocation[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle real-time location updates
  const handleLocationUpdate = useCallback((location: RealTimeGPSLocation) => {
    // Update current location
    setRoute(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        current_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 10,
          timestamp: location.recorded_at,
          speed: location.speed_kmh || 0,
          heading: location.heading_degrees || 0,
          altitude: location.altitude || undefined
        },
        route_status: location.status === 'completed' ? 'completed' : 'active'
      };
    });

    // Update vehicle info
    setVehicle(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        current_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 10,
          timestamp: location.recorded_at,
          speed: location.speed_kmh || 0,
          heading: location.heading_degrees || 0
        },
        battery_level: location.battery_level || prev.battery_level,
        signal_strength: location.signal_strength || prev.signal_strength,
        is_online: true,
        last_update: location.recorded_at
      };
    });

    // Add to tracking history
    setTrackingHistory(prev => [location, ...prev.slice(0, 49)]);
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let subscription: TrackingSubscription | null = null;

    const setupRealTimeTracking = async () => {
      if (!deliveryId || !isTracking) return;

      try {
        subscription = await realTimeGPSService.subscribeToDelivery(deliveryId, handleLocationUpdate);
        setIsLiveConnected(true);
        toast({
          title: 'Live Tracking Active',
          description: 'Receiving real-time GPS updates for this delivery',
        });
      } catch (error) {
        console.error('Failed to set up real-time tracking:', error);
        setIsLiveConnected(false);
      }
    };

    if (isTracking) {
      setupRealTimeTracking();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        setIsLiveConnected(false);
      }
    };
  }, [deliveryId, isTracking, handleLocationUpdate, toast]);

  // Initial data load
  useEffect(() => {
    loadTrackingData();
    
    if (autoRefresh) {
      const interval = setInterval(loadTrackingData, 15000); // Update every 15 seconds as fallback
      return () => clearInterval(interval);
    }
  }, [deliveryId, autoRefresh]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real GPS data from database
      const currentLocation = await realTimeGPSService.getDeliveryLocation(deliveryId);
      const history = await realTimeGPSService.getTrackingHistory(deliveryId, 20);
      
      if (currentLocation) {
        // We have real data
        const realRoute: DeliveryRoute = {
          id: `route-${deliveryId}`,
          delivery_id: deliveryId,
          start_location: history.length > 0 ? {
            latitude: history[history.length - 1].latitude,
            longitude: history[history.length - 1].longitude,
            accuracy: history[history.length - 1].accuracy || 10,
            timestamp: history[history.length - 1].recorded_at,
            speed: history[history.length - 1].speed_kmh || 0,
            heading: history[history.length - 1].heading_degrees || 0
          } : {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy || 10,
            timestamp: currentLocation.recorded_at,
            speed: 0,
            heading: 0
          },
          end_location: {
            latitude: 0, // Would need delivery destination from deliveries table
            longitude: 0,
            accuracy: 10,
            timestamp: new Date().toISOString(),
            speed: 0,
            heading: 0
          },
          current_location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy || 10,
            timestamp: currentLocation.recorded_at,
            speed: currentLocation.speed_kmh || 0,
            heading: currentLocation.heading_degrees || 0,
            altitude: currentLocation.altitude || undefined
          },
          waypoints: history.slice(1).map(h => ({
            latitude: h.latitude,
            longitude: h.longitude,
            accuracy: h.accuracy || 10,
            timestamp: h.recorded_at,
            speed: h.speed_kmh || 0
          })),
          total_distance: 0, // Would need route calculation
          estimated_duration: 0,
          actual_duration: 0,
          traffic_conditions: (currentLocation.traffic_conditions as 'light' | 'moderate' | 'heavy') || 'moderate',
          route_status: currentLocation.status === 'completed' ? 'completed' : 'active'
        };

        // Fetch vehicle/provider details
        const { data: providerData } = await supabase
          .from('delivery_providers')
          .select('company_name, contact_name, contact_phone, vehicle_registration')
          .eq('id', currentLocation.provider_id)
          .single();

        const realVehicle: Vehicle = {
          id: currentLocation.provider_id,
          vehicle_number: providerData?.vehicle_registration || 'Unknown',
          driver_name: showDriverContact ? (providerData?.contact_name || 'Driver') : 'Driver Available',
          driver_phone: showDriverContact ? (providerData?.contact_phone || 'N/A') : 'Contact via Admin',
          current_location: realRoute.current_location,
          battery_level: currentLocation.battery_level || 100,
          signal_strength: currentLocation.signal_strength || 100,
          is_online: true,
          last_update: currentLocation.recorded_at
        };

        setRoute(realRoute);
        setVehicle(realVehicle);
        setTrackingHistory(history);
        setIsTracking(realRoute.route_status === 'active');

      } else {
        // No real data - use mock data as fallback
        const mockRoute: DeliveryRoute = {
          id: 'route-001',
          delivery_id: deliveryId,
          start_location: {
            latitude: -1.2921,
            longitude: 36.8219,
            accuracy: 10,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            speed: 0,
            heading: 0
          },
          end_location: {
            latitude: -1.3032,
            longitude: 36.8856,
            accuracy: 10,
            timestamp: new Date().toISOString(),
            speed: 0,
            heading: 0
          },
          current_location: {
            latitude: -1.2976,
            longitude: 36.8537,
            accuracy: 8,
            timestamp: new Date(Date.now() - 300000).toISOString(),
            speed: 45,
            heading: 135,
            altitude: 1650
          },
          waypoints: [
            {
              latitude: -1.2950,
              longitude: 36.8400,
              accuracy: 12,
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              speed: 35
            },
            {
              latitude: -1.2980,
              longitude: 36.8500,
              accuracy: 9,
              timestamp: new Date(Date.now() - 900000).toISOString(),
              speed: 40
            }
          ],
          total_distance: 12.5,
          estimated_duration: 35,
          actual_duration: 25,
          traffic_conditions: 'moderate',
          route_status: 'active'
        };

        const mockVehicle: Vehicle = {
          id: 'vehicle-001',
          vehicle_number: 'KCA 123A',
          driver_name: showDriverContact ? 'John Kamau' : 'Driver Available',
          driver_phone: showDriverContact ? '+254 712 345 678' : 'Contact via Admin',
          current_location: mockRoute.current_location,
          battery_level: 78,
          signal_strength: 85,
          is_online: true,
          last_update: new Date(Date.now() - 300000).toISOString()
        };

        setRoute(mockRoute);
        setVehicle(mockVehicle);
        setIsTracking(mockRoute.route_status === 'active');
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError('Failed to load GPS tracking data');
      toast({
        title: 'Tracking Error',
        description: 'Unable to load GPS tracking information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!route) return 0;
    
    // Simple progress calculation based on time
    const totalTime = route.estimated_duration;
    const elapsedTime = route.actual_duration || 0;
    return Math.min((elapsedTime / totalTime) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'light': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>GPS Tracking Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* GPS Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Live GPS Tracking
              </CardTitle>
              <CardDescription>
                Real-time location and route monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={route ? getStatusColor(route.route_status) : 'bg-gray-100 text-gray-800'}>
                {route?.route_status || 'Unknown'}
              </Badge>
              {vehicle?.is_online && (
                <Badge className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {route && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Delivery Progress</span>
                  <span>{Math.round(calculateProgress())}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
              </div>

              {/* Route Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Distance</div>
                    <div className="text-xs text-muted-foreground">{route.total_distance} km</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium">Duration</div>
                    <div className="text-xs text-muted-foreground">
                      {route.actual_duration || route.estimated_duration} min
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Truck className={`h-4 w-4 ${getTrafficColor(route.traffic_conditions)}`} />
                  <div>
                    <div className="text-sm font-medium">Traffic</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {route.traffic_conditions}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Status */}
      {vehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{vehicle.vehicle_number}</div>
                  <div className="text-sm text-muted-foreground">Vehicle</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Battery className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">{vehicle.battery_level}%</div>
                  <div className="text-sm text-muted-foreground">Battery</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Wifi className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">{vehicle.signal_strength}%</div>
                  <div className="text-sm text-muted-foreground">Signal</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {format(new Date(vehicle.last_update), 'HH:mm')}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Update</div>
                </div>
              </div>
            </div>

            {/* Driver Information */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-full p-2">
                    <Navigation className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{vehicle.driver_name}</div>
                    <div className="text-sm text-muted-foreground">Driver</div>
                  </div>
                </div>
                
                {showDriverContact && userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      {vehicle.driver_phone}
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Map */}
      <Card className={mapExpanded ? 'fixed inset-4 z-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live Location Map
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTracking(!isTracking)}
              >
                {isTracking ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapExpanded(!mapExpanded)}
              >
                {mapExpanded ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef}
            className={`bg-gray-100 rounded-lg flex items-center justify-center ${
              mapExpanded ? 'h-[calc(100vh-200px)]' : 'h-64 md:h-80'
            }`}
          >
            {/* Mock Map Interface */}
            <div className="text-center space-y-4">
              <div className="bg-primary/10 rounded-full p-4 mx-auto w-fit">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Live GPS Map</h3>
                <p className="text-sm text-muted-foreground">
                  Interactive map showing real-time vehicle location
                </p>
                {route && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs">
                      Current: {route.current_location.latitude.toFixed(4)}, {route.current_location.longitude.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Speed: {route.current_location.speed || 0} km/h | 
                      Accuracy: {route.current_location.accuracy}m
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Details */}
          {route && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Start Location</h4>
                <div className="text-xs text-muted-foreground">
                  {route.start_location.latitude.toFixed(6)}, {route.start_location.longitude.toFixed(6)}
                </div>
                <div className="text-xs">
                  Started: {format(new Date(route.start_location.timestamp), 'HH:mm:ss')}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Destination</h4>
                <div className="text-xs text-muted-foreground">
                  {route.end_location.latitude.toFixed(6)}, {route.end_location.longitude.toFixed(6)}
                </div>
                <div className="text-xs">
                  ETA: {format(new Date(Date.now() + (route.estimated_duration - (route.actual_duration || 0)) * 60000), 'HH:mm')}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking History */}
      {route && route.waypoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Route History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {route.waypoints.map((waypoint, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="bg-primary/10 rounded-full p-1">
                    <MapPin className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      Waypoint {index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {waypoint.latitude.toFixed(4)}, {waypoint.longitude.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {format(new Date(waypoint.timestamp), 'HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {waypoint.speed || 0} km/h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GPS Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracking Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={loadTrackingData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Location
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsTracking(!isTracking)}
            >
              {isTracking ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Tracking
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Tracking
                </>
              )}
            </Button>

            {userRole === 'admin' && (
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Full Route
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GPSTracker;



















