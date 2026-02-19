/**
 * Tracking Number Service
 * 
 * Generates and manages tracking numbers for delivery requests.
 * 
 * FLOW:
 * 1. Builder requests delivery → No tracking number yet
 * 2. Delivery Provider ACCEPTS → Tracking number generated and sent to builder
 * 3. If provider cancels → Tracking number remains active for next provider
 * 4. New provider accepts → Same tracking number is used
 */

import { supabase } from '@/integrations/supabase/client';

export interface TrackingNumberResult {
  trackingNumber: string;
  isNew: boolean;
  deliveryRequestId: string;
}

export interface BuilderNotification {
  builderId: string;
  builderEmail?: string;
  builderPhone?: string;
  trackingNumber: string;
  providerName: string;
  pickupAddress: string;
  deliveryAddress: string;
  materialType: string;
  estimatedPickupDate: string;
}

class TrackingNumberService {
  /**
   * Generate a unique tracking number
   * Format: TRK-YYYYMMDD-XXXXX (e.g., TRK-20251213-A7B3C)
   */
  private generateTrackingNumber(): string {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    
    // Generate random 5-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `TRK-${dateStr}-${code}`;
  }

  /**
   * Called when a delivery provider ACCEPTS a delivery request.
   * Implements FIRST-COME-FIRST-SERVED: Only the first provider to accept gets the job.
   * Generates a tracking number (or reuses existing one) and notifies the builder.
   * 
   * DATE-BASED SCHEDULING (Updated Feb 19, 2026):
   * - Provider CAN accept deliveries for FUTURE dates even if they have active deliveries TODAY
   * - Provider can only have ONE active delivery per day
   * - Example: If I accepted a delivery for tomorrow, I can still pick orders for today
   */
  async onProviderAcceptsDelivery(
    deliveryRequestId: string,
    providerId: string
  ): Promise<TrackingNumberResult | null> {
    try {
      // First, get the delivery request to check its expected delivery date
      const { data: requestToAccept, error: requestError } = await supabase
        .from('delivery_requests')
        .select('id, pickup_date, delivery_date, expected_delivery_date, status, provider_id')
        .eq('id', deliveryRequestId)
        .single();

      if (requestError) {
        console.error('Error fetching delivery request:', requestError);
        throw requestError;
      }

      // Determine the delivery date for the request being accepted
      // Priority: delivery_date > expected_delivery_date > pickup_date > today
      const requestDeliveryDate = requestToAccept.delivery_date 
        || requestToAccept.expected_delivery_date 
        || requestToAccept.pickup_date 
        || new Date().toISOString().split('T')[0];
      
      const requestDateStr = new Date(requestDeliveryDate).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      console.log(`📅 Request delivery date: ${requestDateStr}, Today: ${todayStr}`);

      // CHECK: Does this provider already have an active delivery FOR THE SAME DATE?
      // Provider CAN accept future deliveries while having active deliveries for today
      const { data: activeDeliveries, error: activeError } = await supabase
        .from('delivery_requests')
        .select('id, status, tracking_number, pickup_date, delivery_date, expected_delivery_date')
        .eq('provider_id', providerId)
        .in('status', ['accepted', 'picked_up', 'in_transit', 'assigned'])
        .neq('id', deliveryRequestId); // Exclude the current request

      if (activeError) {
        console.error('Error checking active deliveries:', activeError);
      }

      // Check if any active delivery conflicts with the same date
      if (activeDeliveries && activeDeliveries.length > 0) {
        for (const activeDelivery of activeDeliveries) {
          const activeDeliveryDate = activeDelivery.delivery_date 
            || activeDelivery.expected_delivery_date 
            || activeDelivery.pickup_date 
            || todayStr;
          const activeDateStr = new Date(activeDeliveryDate).toISOString().split('T')[0];
          
          // Only block if the dates are the same
          if (activeDateStr === requestDateStr) {
            console.log(`Provider ${providerId} already has active delivery for ${requestDateStr}: ${activeDelivery.id}`);
            throw new Error(`You already have an active delivery scheduled for ${requestDateStr} (${activeDelivery.tracking_number || 'ID: ' + activeDelivery.id.slice(0, 8)}). Complete it first or accept deliveries for a different date.`);
          }
        }
        
        // Provider has active deliveries but for different dates - allow acceptance
        console.log(`✅ Provider has ${activeDeliveries.length} active deliveries but none for ${requestDateStr} - allowing acceptance`);
      }

      // First, check if this delivery request is still available (FIRST-COME-FIRST-SERVED check)
      const { data: existingRequest, error: fetchError } = await supabase
        .from('delivery_requests')
        .select('*, tracking_number, builder_id, status, provider_id')
        .eq('id', deliveryRequestId)
        .single();

      if (fetchError) {
        console.error('Error fetching delivery request:', fetchError);
        throw fetchError;
      }

      // FIRST-COME-FIRST-SERVED: Check if another provider already accepted
      if (existingRequest.status === 'accepted' && existingRequest.provider_id && existingRequest.provider_id !== providerId) {
        console.log(`Delivery ${deliveryRequestId} already accepted by provider ${existingRequest.provider_id}`);
        throw new Error('This delivery has already been accepted by another provider. First-come-first-served!');
      }

      // Also check if status is not pending (could be cancelled, completed, etc.)
      if (!['pending', 'assigned', 'accepted'].includes(existingRequest.status)) {
        console.log(`Delivery ${deliveryRequestId} is no longer available (status: ${existingRequest.status})`);
        throw new Error(`This delivery is no longer available (status: ${existingRequest.status})`);
      }

      let trackingNumber: string;
      let isNew = false;

      if (existingRequest.tracking_number) {
        // Reuse existing tracking number (provider may have changed due to reassignment)
        trackingNumber = existingRequest.tracking_number;
        console.log(`Reusing existing tracking number: ${trackingNumber}`);
      } else {
        // Generate new tracking number
        trackingNumber = this.generateTrackingNumber();
        isNew = true;
        console.log(`Generated new tracking number: ${trackingNumber}`);
      }

      // ATOMIC UPDATE: Use a conditional update to ensure first-come-first-served
      // Only update if the status is still 'pending' or 'assigned' OR if we're the same provider
      const { data: updateResult, error: updateError } = await supabase
        .from('delivery_requests')
        .update({
          tracking_number: trackingNumber,
          provider_id: providerId,
          status: 'accepted',
          provider_response: 'accepted',
          response_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRequestId)
        .or(`status.eq.pending,status.eq.assigned,provider_id.eq.${providerId}`)
        .select();

      // Check if update was successful (row was actually updated)
      if (!updateResult || updateResult.length === 0) {
        console.log(`Failed to accept delivery ${deliveryRequestId} - likely already accepted by another provider`);
        throw new Error('This delivery has already been accepted by another provider. First-come-first-served!');
      }

      const { error: checkError } = { error: updateError };

      if (checkError) {
        console.error('Error updating delivery request:', checkError);
        throw checkError;
      }

      console.log(`✅ Provider ${providerId} successfully accepted delivery ${deliveryRequestId} (First-come-first-served)`);

      // Fetch builder info and provider info for notification
      const [builderResult, providerResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone, email:user_id')
          .eq('id', existingRequest.builder_id)
          .single(),
        supabase
          .from('delivery_providers')
          .select('provider_name, phone, company_name')
          .eq('id', providerId)
          .single()
      ]);

      // Get builder's email from auth
      let builderEmail = '';
      if (builderResult.data) {
        const { data: userData } = await supabase.auth.admin.getUserById(
          builderResult.data.email as string
        ).catch(() => ({ data: null }));
        builderEmail = userData?.user?.email || '';
      }

      // Send notification to builder
      await this.notifyBuilder({
        builderId: existingRequest.builder_id,
        builderEmail,
        builderPhone: builderResult.data?.phone || '',
        trackingNumber,
        providerName: providerResult.data?.company_name || providerResult.data?.provider_name || 'Delivery Provider',
        pickupAddress: existingRequest.pickup_address,
        deliveryAddress: existingRequest.delivery_address,
        materialType: existingRequest.material_type,
        estimatedPickupDate: existingRequest.pickup_date
      });

      // Create a delivery tracking entry (initialize GPS tracking)
      await this.initializeDeliveryTracking(deliveryRequestId, providerId, trackingNumber);

      return {
        trackingNumber,
        isNew,
        deliveryRequestId
      };

    } catch (error) {
      console.error('Error in onProviderAcceptsDelivery:', error);
      return null;
    }
  }

  /**
   * Called when a provider cancels/rejects after initially accepting.
   * The tracking number remains active - will be used by next provider.
   */
  async onProviderCancelsDelivery(
    deliveryRequestId: string,
    providerId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Get current tracking number
      const { data: request, error: fetchError } = await supabase
        .from('delivery_requests')
        .select('tracking_number, builder_id, attempted_providers')
        .eq('id', deliveryRequestId)
        .single();

      if (fetchError) throw fetchError;

      // Add this provider to attempted list
      const attemptedProviders = request.attempted_providers || [];
      if (!attemptedProviders.includes(providerId)) {
        attemptedProviders.push(providerId);
      }

      // Update delivery request - keep tracking number, reset provider
      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update({
          provider_id: null,
          status: 'pending', // Back to pending for next provider
          provider_response: null,
          response_notes: `Previous provider cancelled: ${reason}`,
          attempted_providers: attemptedProviders,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryRequestId);

      if (updateError) throw updateError;

      // Notify builder that their delivery is being reassigned
      // but tracking number remains the same
      if (request.tracking_number) {
        await this.notifyBuilderOfReassignment(
          request.builder_id,
          request.tracking_number,
          reason
        );
      }

      console.log(`Provider ${providerId} cancelled. Tracking number ${request.tracking_number} remains active.`);
      return true;

    } catch (error) {
      console.error('Error in onProviderCancelsDelivery:', error);
      return false;
    }
  }

  /**
   * Notify builder of their new tracking number
   */
  private async notifyBuilder(notification: BuilderNotification): Promise<void> {
    try {
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: notification.builderId,
        type: 'delivery_accepted',
        title: '🚚 Delivery Provider Assigned!',
        message: `Your delivery has been accepted! Track it with: ${notification.trackingNumber}`,
        data: {
          tracking_number: notification.trackingNumber,
          provider_name: notification.providerName,
          pickup_address: notification.pickupAddress,
          delivery_address: notification.deliveryAddress,
          material_type: notification.materialType,
          estimated_pickup: notification.estimatedPickupDate
        },
        read: false,
        created_at: new Date().toISOString()
      });

      // Log the tracking number assignment
      console.log(`
        ========================================
        📦 TRACKING NUMBER GENERATED
        ========================================
        Tracking Number: ${notification.trackingNumber}
        Builder ID: ${notification.builderId}
        Provider: ${notification.providerName}
        Material: ${notification.materialType}
        Pickup: ${notification.pickupAddress}
        Delivery: ${notification.deliveryAddress}
        ========================================
      `);

      // TODO: Send SMS notification if phone available
      // TODO: Send Email notification if email available
      // These would integrate with actual SMS/Email services

    } catch (error) {
      console.error('Error notifying builder:', error);
    }
  }

  /**
   * Notify builder that delivery is being reassigned but tracking number stays same
   */
  private async notifyBuilderOfReassignment(
    builderId: string,
    trackingNumber: string,
    reason: string
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: builderId,
        type: 'delivery_reassigned',
        title: '🔄 Delivery Being Reassigned',
        message: `Your delivery provider had to cancel. We're finding a new provider. Your tracking number ${trackingNumber} remains the same.`,
        data: {
          tracking_number: trackingNumber,
          reason: reason
        },
        read: false,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error notifying builder of reassignment:', error);
    }
  }

  /**
   * Initialize delivery tracking entry for GPS tracking
   */
  private async initializeDeliveryTracking(
    deliveryRequestId: string,
    providerId: string,
    trackingNumber: string
  ): Promise<void> {
    try {
      // Check if tracking entry already exists
      const { data: existing } = await supabase
        .from('delivery_tracking')
        .select('id')
        .eq('delivery_id', deliveryRequestId)
        .maybeSingle();

      if (!existing) {
        // Create initial tracking entry (provider will update with actual GPS)
        await supabase.from('delivery_tracking').insert({
          delivery_id: deliveryRequestId,
          provider_id: providerId,
          current_latitude: 0,
          current_longitude: 0,
          delivery_status: 'accepted',
          tracking_timestamp: new Date().toISOString()
        });
      } else {
        // Update existing entry with new provider
        await supabase
          .from('delivery_tracking')
          .update({
            provider_id: providerId,
            delivery_status: 'accepted',
            tracking_timestamp: new Date().toISOString()
          })
          .eq('delivery_id', deliveryRequestId);
      }
    } catch (error) {
      console.error('Error initializing delivery tracking:', error);
    }
  }

  /**
   * Get tracking info by tracking number
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          provider:provider_id (
            provider_name,
            company_name,
            phone,
            vehicle_types
          ),
          builder:builder_id (
            full_name,
            phone
          )
        `)
        .eq('tracking_number', trackingNumber)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error getting tracking info:', error);
      return null;
    }
  }

  /**
   * Get all deliveries for a builder with their tracking numbers
   */
  async getBuilderDeliveries(builderId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          id,
          tracking_number,
          status,
          material_type,
          pickup_address,
          delivery_address,
          pickup_date,
          created_at,
          provider:provider_id (
            provider_name,
            company_name
          )
        `)
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting builder deliveries:', error);
      return [];
    }
  }
}

export const trackingNumberService = new TrackingNumberService();
export default trackingNumberService;





















