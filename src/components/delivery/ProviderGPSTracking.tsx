/**
 * ProviderGPSTracking Component
 * 
 * Allows delivery providers to share their real-time GPS location
 * while making deliveries. This data is used by builders to track
 * their deliveries in real-time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Navigation, 
  Play, 
  Pause, 
  Radio,
  Battery,
  Wifi,
  WifiOff,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Signal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { realTimeGPSService } from "@/services/RealTimeGPSService";
import { format } from "date-fns";

interface ActiveDelivery {
  id: string;
  tracking_number: string;
  pickup_address: string;
  delivery_address: string;
  material_type: string;
  status: string;
  builder_name?: string;
}

export const ProviderGPSTracking: React.FC = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch provider's active deliveries
  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor battery level
  useEffect(() => {
    const checkBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        }
      } catch (error) {
        console.log('Battery API not available');
      }
    };
    checkBattery();
  }, []);

  const fetchActiveDeliveries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get provider ID
      const { data: providerData } = await supabase
        .from('delivery_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!providerData) return;

      // Fetch active deliveries for this provider
      const { data: deliveries, error } = await supabase
        .from('delivery_requests')
        .select(`
          id,
          tracking_number,
          pickup_address,
          delivery_address,
          material_type,
          status,
          builder:builder_id (
            full_name
          )
        `)
        .eq('provider_id', providerData.id)
        .in('status', ['accepted', 'in_transit', 'pending_pickup'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveDeliveries(deliveries?.map(d => ({
        ...d,
        builder_name: (d.builder as any)?.full_name || 'Unknown Builder'
      })) || []);

      // Auto-select first delivery if available
      if (deliveries && deliveries.length > 0 && !selectedDeliveryId) {
        setSelectedDeliveryId(deliveries[0].id);
      }
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  const startTracking = useCallback(() => {
    if (!selectedDeliveryId) {
      toast({
        title: "Select a Delivery",
        description: "Please select an active delivery to track",
        variant: "destructive"
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError(null);
    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        setCurrentLocation(position.coords);
        setLastUpdate(new Date());
        setLocationError(null);

        // Submit location to database
        try {
          await realTimeGPSService.submitLocation(selectedDeliveryId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            altitude: position.coords.altitude || undefined,
            batteryLevel,
            networkStatus
          });
        } catch (error) {
          console.error('Error submitting location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    setWatchId(id);

    toast({
      title: "📍 GPS Tracking Started",
      description: "Your location is now being shared with the builder",
    });
  }, [selectedDeliveryId, batteryLevel, networkStatus, toast]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);

    toast({
      title: "GPS Tracking Stopped",
      description: "Location sharing has been paused",
    });
  }, [watchId, toast]);

  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your GPS settings.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown error occurred while getting your location.';
    }
  };

  const updateDeliveryStatus = async (newStatus: string) => {
    if (!selectedDeliveryId) return;

    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDeliveryId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Delivery status changed to ${newStatus.replace('_', ' ')}`,
      });

      // Refresh deliveries
      fetchActiveDeliveries();

      // If delivered, stop tracking
      if (newStatus === 'delivered') {
        stopTracking();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive"
      });
    }
  };

  const selectedDelivery = activeDeliveries.find(d => d.id === selectedDeliveryId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                GPS Location Sharing
              </CardTitle>
              <CardDescription>
                Share your real-time location with builders during deliveries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Network Status */}
              <Badge variant={networkStatus === 'online' ? 'default' : 'destructive'}>
                {networkStatus === 'online' ? (
                  <><Wifi className="h-3 w-3 mr-1" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                )}
              </Badge>
              
              {/* Battery Level */}
              <Badge variant="outline">
                <Battery className="h-3 w-3 mr-1" />
                {batteryLevel}%
              </Badge>
              
              {/* Live Status */}
              {isTracking && (
                <Badge className="bg-green-500 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Delivery Selector */}
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Active Delivery</label>
                <Select value={selectedDeliveryId} onValueChange={setSelectedDeliveryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a delivery to track" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDeliveries.map(delivery => (
                      <SelectItem key={delivery.id} value={delivery.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <span>{delivery.tracking_number || delivery.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="ml-2">{delivery.status}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={fetchActiveDeliveries} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Delivery Info */}
            {selectedDelivery && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="text-sm font-medium">{selectedDelivery.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery</p>
                    <p className="text-sm font-medium">{selectedDelivery.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Builder: {selectedDelivery.builder_name}
                  </span>
                  <Badge>{selectedDelivery.material_type}</Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Error */}
      {locationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      )}

      {/* Current Location */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Latitude</p>
                <p className="font-mono text-sm">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Longitude</p>
                <p className="font-mono text-sm">{currentLocation.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="font-mono text-sm">{currentLocation.accuracy?.toFixed(0) || 'N/A'} m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="font-mono text-sm">
                  {currentLocation.speed ? `${(currentLocation.speed * 3.6).toFixed(1)} km/h` : 'N/A'}
                </p>
              </div>
            </div>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {format(lastUpdate, 'HH:mm:ss')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracking Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Start/Stop Tracking */}
            {!isTracking ? (
              <Button 
                onClick={startTracking} 
                className="bg-green-600 hover:bg-green-700"
                disabled={!selectedDeliveryId}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
            ) : (
              <Button 
                onClick={stopTracking} 
                variant="destructive"
              >
                <Pause className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            )}

            {/* Status Update Buttons */}
            {selectedDelivery && (
              <>
                {selectedDelivery.status === 'accepted' && (
                  <Button 
                    onClick={() => updateDeliveryStatus('pending_pickup')}
                    variant="outline"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    En Route to Pickup
                  </Button>
                )}
                {selectedDelivery.status === 'pending_pickup' && (
                  <Button 
                    onClick={() => updateDeliveryStatus('in_transit')}
                    variant="outline"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Picked Up - In Transit
                  </Button>
                )}
                {selectedDelivery.status === 'in_transit' && (
                  <Button 
                    onClick={() => updateDeliveryStatus('delivered')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Alert>
        <Signal className="h-4 w-4" />
        <AlertTitle>Privacy Notice</AlertTitle>
        <AlertDescription>
          Your location is only shared while tracking is active and only for the selected delivery. 
          The builder can see your real-time position to track their delivery progress. 
          Location sharing automatically stops when you mark the delivery as complete.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ProviderGPSTracking;



















