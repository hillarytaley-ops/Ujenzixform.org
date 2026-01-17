/**
 * Real-Time GPS Tracking Service
 * Handles live GPS location updates using Supabase real-time subscriptions
 */

import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface GPSLocation {
  id: string;
  delivery_id: string;
  provider_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed_kmh: number | null;
  heading_degrees: number | null;
  battery_level: number | null;
  signal_strength: number | null;
  device_id: string | null;
  status: string;
  location_description: string | null;
  traffic_conditions: string | null;
  recorded_at: string;
  created_at: string;
}

export interface VehicleLocation {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: 'idle' | 'loading' | 'in_transit' | 'delivering' | 'returning' | 'offline';
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  };
  destination?: {
    lat: number;
    lng: number;
    address: string;
  };
  batteryLevel: number;
  signalStrength: number;
  speed: number;
  lastUpdate: Date;
  deliveryId?: string;
  providerId: string;
}

export interface TrackingSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

type LocationUpdateCallback = (location: GPSLocation) => void;
type VehicleUpdateCallback = (vehicle: VehicleLocation) => void;

class RealTimeGPSService {
  private subscriptions: Map<string, TrackingSubscription> = new Map();
  private locationCallbacks: Map<string, LocationUpdateCallback[]> = new Map();

  /**
   * Subscribe to real-time GPS updates for a specific delivery
   */
  async subscribeToDelivery(
    deliveryId: string,
    onLocationUpdate: LocationUpdateCallback
  ): Promise<TrackingSubscription> {
    const existingSubscription = this.subscriptions.get(`delivery-${deliveryId}`);
    if (existingSubscription) {
      // Add callback to existing subscription
      const callbacks = this.locationCallbacks.get(`delivery-${deliveryId}`) || [];
      callbacks.push(onLocationUpdate);
      this.locationCallbacks.set(`delivery-${deliveryId}`, callbacks);
      return existingSubscription;
    }

    const channel = supabase
      .channel(`delivery-tracking-${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `delivery_id=eq.${deliveryId}`
        },
        (payload) => {
          const location = payload.new as GPSLocation;
          const callbacks = this.locationCallbacks.get(`delivery-${deliveryId}`) || [];
          callbacks.forEach(cb => cb(location));
        }
      )
      .subscribe();

    const subscription: TrackingSubscription = {
      channel,
      unsubscribe: () => {
        channel.unsubscribe();
        this.subscriptions.delete(`delivery-${deliveryId}`);
        this.locationCallbacks.delete(`delivery-${deliveryId}`);
      }
    };

    this.subscriptions.set(`delivery-${deliveryId}`, subscription);
    this.locationCallbacks.set(`delivery-${deliveryId}`, [onLocationUpdate]);

    return subscription;
  }

  /**
   * Subscribe to all GPS updates (admin only)
   */
  async subscribeToAllTracking(
    onLocationUpdate: LocationUpdateCallback
  ): Promise<TrackingSubscription> {
    const existingSubscription = this.subscriptions.get('all-tracking');
    if (existingSubscription) {
      const callbacks = this.locationCallbacks.get('all-tracking') || [];
      callbacks.push(onLocationUpdate);
      this.locationCallbacks.set('all-tracking', callbacks);
      return existingSubscription;
    }

    const channel = supabase
      .channel('all-delivery-tracking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_tracking'
        },
        (payload) => {
          const location = payload.new as GPSLocation;
          const callbacks = this.locationCallbacks.get('all-tracking') || [];
          callbacks.forEach(cb => cb(location));
        }
      )
      .subscribe();

    const subscription: TrackingSubscription = {
      channel,
      unsubscribe: () => {
        channel.unsubscribe();
        this.subscriptions.delete('all-tracking');
        this.locationCallbacks.delete('all-tracking');
      }
    };

    this.subscriptions.set('all-tracking', subscription);
    this.locationCallbacks.set('all-tracking', [onLocationUpdate]);

    return subscription;
  }

  /**
   * Get current GPS location for a delivery
   */
  async getDeliveryLocation(deliveryId: string): Promise<GPSLocation | null> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching delivery location:', error);
      return null;
    }

    return data as GPSLocation;
  }

  /**
   * Get all active vehicle locations (admin only)
   */
  async getAllActiveVehicles(): Promise<VehicleLocation[]> {
    try {
      // Get the latest tracking data for each active delivery
      const { data: trackingData, error: trackingError } = await supabase
        .from('delivery_tracking')
        .select(`
          *,
          delivery:deliveries!delivery_id (
            id,
            status,
            delivery_address,
            pickup_address
          ),
          provider:delivery_providers!provider_id (
            id,
            company_name,
            contact_name,
            contact_phone,
            vehicle_type,
            vehicle_registration
          )
        `)
        .gte('recorded_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('recorded_at', { ascending: false });

      if (trackingError) {
        console.error('Error fetching tracking data:', trackingError);
        return [];
      }

      // Group by provider and get latest location for each
      const latestByProvider = new Map<string, any>();
      trackingData?.forEach(record => {
        if (!latestByProvider.has(record.provider_id)) {
          latestByProvider.set(record.provider_id, record);
        }
      });

      const vehicles: VehicleLocation[] = Array.from(latestByProvider.values()).map(record => ({
        id: record.id,
        vehicleNumber: record.provider?.vehicle_registration || 'Unknown',
        driverName: record.provider?.contact_name || 'Unknown Driver',
        driverPhone: record.provider?.contact_phone || 'N/A',
        status: this.mapDeliveryStatus(record.status || record.delivery?.status),
        currentLocation: {
          lat: parseFloat(record.latitude),
          lng: parseFloat(record.longitude),
          address: record.location_description || 'Location updating...',
          accuracy: parseFloat(record.accuracy) || 10
        },
        destination: record.delivery?.delivery_address ? {
          lat: 0, // Would need geocoding
          lng: 0,
          address: record.delivery.delivery_address
        } : undefined,
        batteryLevel: record.battery_level || 100,
        signalStrength: record.signal_strength || 100,
        speed: parseFloat(record.speed_kmh) || 0,
        lastUpdate: new Date(record.recorded_at),
        deliveryId: record.delivery_id,
        providerId: record.provider_id
      }));

      return vehicles;
    } catch (error) {
      console.error('Error in getAllActiveVehicles:', error);
      return [];
    }
  }

  /**
   * Get tracking history for a delivery
   */
  async getTrackingHistory(deliveryId: string, limit: number = 50): Promise<GPSLocation[]> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching tracking history:', error);
      return [];
    }

    return (data as GPSLocation[]) || [];
  }

  /**
   * Submit GPS location update (for delivery providers)
   */
  async submitLocation(
    deliveryId: string,
    providerId: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number;
      speed?: number;
      heading?: number;
      batteryLevel?: number;
      signalStrength?: number;
      deviceId?: string;
      status: string;
      locationDescription?: string;
      trafficConditions?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .insert({
          delivery_id: deliveryId,
          provider_id: providerId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          speed_kmh: location.speed,
          heading_degrees: location.heading,
          battery_level: location.batteryLevel,
          signal_strength: location.signalStrength,
          device_id: location.deviceId,
          status: location.status,
          location_description: location.locationDescription,
          traffic_conditions: location.trafficConditions,
          recorded_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error submitting location:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in submitLocation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start continuous GPS tracking from browser (for delivery providers)
   */
  startBrowserTracking(
    deliveryId: string,
    providerId: string,
    options: {
      intervalMs?: number;
      onError?: (error: string) => void;
      onLocationUpdate?: (location: GeolocationPosition) => void;
    } = {}
  ): { stop: () => void } {
    const { intervalMs = 10000, onError, onLocationUpdate } = options;
    let watchId: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let lastSubmitTime = 0;

    const submitCurrentLocation = (position: GeolocationPosition) => {
      const now = Date.now();
      // Throttle submissions to prevent overwhelming the database
      if (now - lastSubmitTime < intervalMs) return;
      lastSubmitTime = now;

      onLocationUpdate?.(position);

      this.submitLocation(deliveryId, providerId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // m/s to km/h
        heading: position.coords.heading || undefined,
        status: 'in_transit'
      });
    };

    if ('geolocation' in navigator) {
      // Use watchPosition for continuous updates
      watchId = navigator.geolocation.watchPosition(
        submitCurrentLocation,
        (error) => {
          console.error('Geolocation error:', error);
          onError?.(error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );

      // Also set up interval for regular updates even if position hasn't changed significantly
      intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          submitCurrentLocation,
          (error) => {
            console.error('Geolocation error:', error);
            onError?.(error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          }
        );
      }, intervalMs);
    } else {
      onError?.('Geolocation is not supported by this browser');
    }

    return {
      stop: () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (intervalId !== null) {
          clearInterval(intervalId);
        }
      }
    };
  }

  /**
   * Unsubscribe from all tracking
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    this.locationCallbacks.clear();
  }

  /**
   * Map delivery status to vehicle status
   */
  private mapDeliveryStatus(status: string): VehicleLocation['status'] {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return 'idle';
      case 'loading':
      case 'pickup':
        return 'loading';
      case 'in_transit':
      case 'in_progress':
        return 'in_transit';
      case 'delivering':
      case 'arrived':
        return 'delivering';
      case 'returning':
        return 'returning';
      case 'completed':
      case 'cancelled':
      default:
        return 'offline';
    }
  }

  /**
   * Reverse geocode coordinates to address (uses free Nominatim API)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'UjenziXform-DeliveryTracking/1.0'
          }
        }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
}

// Export singleton instance
export const realTimeGPSService = new RealTimeGPSService();
export default realTimeGPSService;





















