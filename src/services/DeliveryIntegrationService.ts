/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🚚 DELIVERY INTEGRATION SERVICE - Connect Orders with Delivery Providers          ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Find available delivery providers based on location                     │   ║
 * ║   │  ✅ Calculate delivery costs based on distance and weight                   │   ║
 * ║   │  ✅ Auto-assign delivery providers using rotation algorithm                 │   ║
 * ║   │  ✅ Real-time delivery tracking                                              │   ║
 * ║   │  ✅ Delivery provider notifications                                          │   ║
 * ║   │  ✅ Delivery scheduling and time slots                                       │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from './NotificationService';

// Types
export interface DeliveryProvider {
  id: string;
  user_id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  phone: string;
  email?: string;
  vehicle_type: 'motorcycle' | 'van' | 'pickup' | 'truck' | 'trailer';
  vehicle_capacity_kg: number;
  service_counties: string[];
  rating: number;
  total_deliveries: number;
  on_time_rate: number;
  pricing_per_km: number;
  minimum_charge: number;
  is_available: boolean;
  current_location?: { lat: number; lng: number };
}

export interface DeliveryRequest {
  id?: string;
  order_id: string;
  pickup_address: string;
  pickup_county: string;
  delivery_address: string;
  delivery_county: string;
  total_weight_kg: number;
  total_volume_m3?: number;
  material_types: string[];
  urgency: 'normal' | 'urgent' | 'same_day';
  preferred_date?: string;
  preferred_time_slot?: string;
  special_instructions?: string;
  estimated_cost?: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  provider_id?: string;
  created_at?: string;
}

export interface DeliveryQuote {
  provider_id: string;
  provider_name: string;
  provider_rating: number;
  vehicle_type: string;
  estimated_cost: number;
  estimated_time_hours: number;
  available_slots: string[];
}

// Kenya counties with coordinates for distance calculation
const COUNTY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
  'Mombasa': { lat: -4.0435, lng: 39.6682 },
  'Kisumu': { lat: -0.1022, lng: 34.7617 },
  'Nakuru': { lat: -0.3031, lng: 36.0800 },
  'Eldoret': { lat: 0.5143, lng: 35.2698 },
  'Thika': { lat: -1.0334, lng: 37.0692 },
  'Machakos': { lat: -1.5177, lng: 37.2634 },
  'Nyeri': { lat: -0.4197, lng: 36.9553 },
  'Meru': { lat: 0.0500, lng: 37.6500 },
  'Kiambu': { lat: -1.1714, lng: 36.8356 },
  // Add more counties as needed
};

// Base pricing
const BASE_PRICING = {
  motorcycle: { perKm: 15, minCharge: 200, maxWeight: 50 },
  van: { perKm: 25, minCharge: 500, maxWeight: 500 },
  pickup: { perKm: 35, minCharge: 800, maxWeight: 1000 },
  truck: { perKm: 50, minCharge: 1500, maxWeight: 5000 },
  trailer: { perKm: 80, minCharge: 3000, maxWeight: 20000 }
};

export class DeliveryIntegrationService {
  /**
   * Find available delivery providers for an order
   */
  static async findProviders(
    request: DeliveryRequest
  ): Promise<DeliveryProvider[]> {
    try {
      // Get all active providers
      const { data: providers, error } = await supabase
        .from('delivery_providers')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .contains('service_counties', [request.pickup_county, request.delivery_county]);

      if (error) throw error;

      // Filter by capacity and availability
      const suitableProviders = (providers || []).filter((p: any) => {
        // Check weight capacity
        if (p.vehicle_capacity_kg && p.vehicle_capacity_kg < request.total_weight_kg) {
          return false;
        }
        // Check availability status
        if (p.availability_status !== 'available') {
          return false;
        }
        return true;
      });

      // Sort by rating and on-time delivery rate
      return suitableProviders.sort((a: any, b: any) => {
        const scoreA = (a.rating || 0) * 0.6 + (a.on_time_delivery_rate || 0) * 0.4;
        const scoreB = (b.rating || 0) * 0.6 + (b.on_time_delivery_rate || 0) * 0.4;
        return scoreB - scoreA;
      }) as DeliveryProvider[];
    } catch (error) {
      console.error('Error finding providers:', error);
      return [];
    }
  }

  /**
   * Get delivery quotes from available providers
   */
  static async getQuotes(request: DeliveryRequest): Promise<DeliveryQuote[]> {
    try {
      const providers = await this.findProviders(request);
      const distance = this.calculateDistance(request.pickup_county, request.delivery_county);

      const quotes: DeliveryQuote[] = providers.map((provider: any) => {
        const vehicleType = provider.vehicle_type || 'pickup';
        const pricing = BASE_PRICING[vehicleType as keyof typeof BASE_PRICING] || BASE_PRICING.pickup;
        
        // Calculate cost
        let cost = Math.max(
          pricing.minCharge,
          distance * (provider.pricing_per_km || pricing.perKm)
        );

        // Add urgency surcharge
        if (request.urgency === 'urgent') {
          cost *= 1.5;
        } else if (request.urgency === 'same_day') {
          cost *= 2;
        }

        // Add weight surcharge for heavy loads
        if (request.total_weight_kg > pricing.maxWeight * 0.8) {
          cost *= 1.2;
        }

        // Estimate delivery time (average 40km/h including loading)
        const estimatedHours = distance / 40 + 1; // +1 hour for loading/unloading

        return {
          provider_id: provider.id,
          provider_name: provider.provider_name,
          provider_rating: provider.rating || 4.5,
          vehicle_type: vehicleType,
          estimated_cost: Math.round(cost),
          estimated_time_hours: Math.round(estimatedHours * 10) / 10,
          available_slots: this.generateTimeSlots(request.preferred_date)
        };
      });

      // Sort by cost
      return quotes.sort((a, b) => a.estimated_cost - b.estimated_cost);
    } catch (error) {
      console.error('Error getting quotes:', error);
      return [];
    }
  }

  /**
   * Create delivery request and notify providers
   */
  static async createDeliveryRequest(
    request: DeliveryRequest
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Calculate estimated cost
      const distance = this.calculateDistance(request.pickup_county, request.delivery_county);
      const estimatedCost = this.estimateCost(distance, request.total_weight_kg, request.urgency);

      // Create delivery request
      const { data, error } = await supabase
        .from('delivery_requests')
        .insert({
          order_id: request.order_id,
          pickup_address: request.pickup_address,
          pickup_county: request.pickup_county,
          delivery_address: request.delivery_address,
          delivery_county: request.delivery_county,
          total_weight_kg: request.total_weight_kg,
          material_types: request.material_types,
          urgency: request.urgency,
          preferred_date: request.preferred_date,
          preferred_time_slot: request.preferred_time_slot,
          special_instructions: request.special_instructions,
          estimated_cost: estimatedCost,
          distance_km: distance,
          status: 'pending',
          created_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Notify available providers
      await this.notifyProviders(data as any);

      return { success: true, requestId: data.id };
    } catch (error: any) {
      console.error('Error creating delivery request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign delivery to a provider
   */
  static async assignProvider(
    requestId: string,
    providerId: string,
    estimatedDelivery: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update delivery request
      const { error } = await supabase
        .from('delivery_requests')
        .update({
          provider_id: providerId,
          status: 'assigned',
          estimated_delivery: estimatedDelivery,
          assigned_at: new Date().toISOString()
        } as any)
        .eq('id', requestId);

      if (error) throw error;

      // Get request details for notifications
      const { data: request } = await supabase
        .from('delivery_requests')
        .select('*, orders(*)')
        .eq('id', requestId)
        .single();

      // Notify builder
      if (request?.orders?.builder_id) {
        await NotificationService.send(
          request.orders.builder_id,
          'delivery_assigned',
          {
            orderNumber: request.orders.order_number,
            estimatedDelivery
          }
        );
      }

      // Update provider availability
      await supabase
        .from('delivery_providers')
        .update({ availability_status: 'busy' } as any)
        .eq('id', providerId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-assign delivery using rotation algorithm
   */
  static async autoAssign(requestId: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      // Get request details
      const { data: request } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Find available providers
      const providers = await this.findProviders(request as any);
      
      if (providers.length === 0) {
        return { success: false, error: 'No available providers' };
      }

      // Use rotation: pick provider with fewest recent assignments
      const { data: recentAssignments } = await supabase
        .from('delivery_requests')
        .select('provider_id')
        .in('provider_id', providers.map(p => p.id))
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const assignmentCounts = new Map<string, number>();
      (recentAssignments || []).forEach((a: any) => {
        assignmentCounts.set(a.provider_id, (assignmentCounts.get(a.provider_id) || 0) + 1);
      });

      // Sort by assignment count, then by rating
      const sortedProviders = [...providers].sort((a, b) => {
        const countA = assignmentCounts.get(a.id) || 0;
        const countB = assignmentCounts.get(b.id) || 0;
        if (countA !== countB) return countA - countB;
        return (b.rating || 0) - (a.rating || 0);
      });

      const selectedProvider = sortedProviders[0];
      const estimatedDelivery = this.calculateEstimatedDelivery(
        request.distance_km || 50,
        request.urgency
      );

      await this.assignProvider(requestId, selectedProvider.id, estimatedDelivery);

      return { success: true, providerId: selectedProvider.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update delivery status
   */
  static async updateStatus(
    requestId: string,
    status: DeliveryRequest['status'],
    location?: { lat: number; lng: number },
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (location) {
        updateData.current_location = location;
      }

      if (status === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Log status update
      await supabase.from('delivery_tracking').insert({
        request_id: requestId,
        status,
        location,
        notes,
        timestamp: new Date().toISOString()
      } as any);

      // Notify builder of status update
      const { data: request } = await supabase
        .from('delivery_requests')
        .select('*, orders(*)')
        .eq('id', requestId)
        .single();

      if (request?.orders?.builder_id) {
        await NotificationService.send(
          request.orders.builder_id,
          'delivery_update',
          {
            orderNumber: request.orders.order_number,
            status,
            message: this.getStatusMessage(status)
          }
        );
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get delivery tracking history
   */
  static async getTrackingHistory(requestId: string): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('request_id', requestId)
        .order('timestamp', { ascending: true });

      return data || [];
    } catch (error) {
      console.error('Error getting tracking history:', error);
      return [];
    }
  }

  /**
   * Rate delivery provider
   */
  static async rateProvider(
    requestId: string,
    rating: number,
    review?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get request details
      const { data: request } = await supabase
        .from('delivery_requests')
        .select('provider_id')
        .eq('id', requestId)
        .single();

      if (!request?.provider_id) throw new Error('Provider not found');

      // Save review
      await supabase.from('delivery_reviews').insert({
        request_id: requestId,
        provider_id: request.provider_id,
        rating,
        review,
        created_at: new Date().toISOString()
      } as any);

      // Update provider's average rating
      const { data: reviews } = await supabase
        .from('delivery_reviews')
        .select('rating')
        .eq('provider_id', request.provider_id);

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
        
        await supabase
          .from('delivery_providers')
          .update({ rating: Math.round(avgRating * 10) / 10 } as any)
          .eq('id', request.provider_id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private static calculateDistance(fromCounty: string, toCounty: string): number {
    const from = COUNTY_COORDINATES[fromCounty] || COUNTY_COORDINATES['Nairobi'];
    const to = COUNTY_COORDINATES[toCounty] || COUNTY_COORDINATES['Nairobi'];

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(to.lat - from.lat);
    const dLon = this.toRad(to.lng - from.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) * Math.cos(this.toRad(to.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return Math.round(R * c);
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static estimateCost(distance: number, weight: number, urgency: string): number {
    // Determine vehicle type based on weight
    let vehicleType: keyof typeof BASE_PRICING = 'pickup';
    if (weight <= 50) vehicleType = 'motorcycle';
    else if (weight <= 500) vehicleType = 'van';
    else if (weight <= 1000) vehicleType = 'pickup';
    else if (weight <= 5000) vehicleType = 'truck';
    else vehicleType = 'trailer';

    const pricing = BASE_PRICING[vehicleType];
    let cost = Math.max(pricing.minCharge, distance * pricing.perKm);

    // Urgency surcharge
    if (urgency === 'urgent') cost *= 1.5;
    else if (urgency === 'same_day') cost *= 2;

    return Math.round(cost);
  }

  private static calculateEstimatedDelivery(distance: number, urgency: string): string {
    const now = new Date();
    let hoursToAdd = Math.ceil(distance / 40) + 2; // Base time + buffer

    if (urgency === 'same_day') {
      hoursToAdd = Math.min(hoursToAdd, 8);
    } else if (urgency === 'urgent') {
      hoursToAdd = Math.min(hoursToAdd, 24);
    } else {
      hoursToAdd = Math.max(hoursToAdd, 24); // Minimum 24 hours for normal
    }

    now.setHours(now.getHours() + hoursToAdd);
    return now.toISOString();
  }

  private static generateTimeSlots(preferredDate?: string): string[] {
    const slots = [
      '08:00 - 10:00',
      '10:00 - 12:00',
      '12:00 - 14:00',
      '14:00 - 16:00',
      '16:00 - 18:00'
    ];
    return slots;
  }

  private static async notifyProviders(request: any): Promise<void> {
    try {
      // Get available providers
      const providers = await this.findProviders(request);

      // Send notifications to all available providers
      for (const provider of providers.slice(0, 10)) { // Limit to top 10
        await NotificationService.send(
          provider.user_id,
          'delivery_update',
          {
            message: `New delivery request: ${request.pickup_county} → ${request.delivery_county}. Est. KES ${request.estimated_cost}`,
            url: `/delivery-dashboard?request=${request.id}`
          },
          ['push', 'sms', 'in_app']
        );
      }
    } catch (error) {
      console.error('Error notifying providers:', error);
    }
  }

  private static getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      assigned: 'A delivery provider has been assigned to your order.',
      picked_up: 'Your materials have been picked up and are on the way!',
      in_transit: 'Your delivery is in transit.',
      delivered: 'Your delivery has been completed. Thank you!',
      cancelled: 'The delivery has been cancelled.'
    };
    return messages[status] || 'Delivery status updated.';
  }
}

export default DeliveryIntegrationService;








