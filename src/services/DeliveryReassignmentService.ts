/**
 * Delivery Reassignment Service
 * 
 * Handles automatic re-alerting of delivery providers when:
 * 1. A provider cancels an accepted delivery
 * 2. A provider doesn't respond within timeout
 * 3. A delivery is rejected by all providers
 */

import { supabase } from '@/integrations/supabase/client';

interface DeliveryRequest {
  id: string;
  delivery_id: string;
  material_type: string;
  quantity: string;
  pickup_address: string;
  delivery_address: string;
  contact_name: string;
  contact_phone: string;
  estimated_cost: number;
  distance_km: number;
  urgency: 'normal' | 'urgent';
  status: string;
  assigned_provider_id?: string;
  rejected_by_providers?: string[]; // Track who declined
  reassignment_count: number; // Track how many times re-alerted
  last_reassigned_at?: string;
}

interface AlertChannel {
  sms: boolean;
  email: boolean;
  push: boolean;
  sound: boolean;
}

export class DeliveryReassignmentService {
  
  /**
   * Main function: Handle delivery cancellation and automatic reassignment
   */
  static async handleDeliveryCancellation(
    deliveryId: string, 
    cancelledProviderId: string,
    cancellationReason: string
  ): Promise<void> {
    try {
      console.log(`🔄 Processing cancellation for delivery ${deliveryId} by provider ${cancelledProviderId}`);

      // Step 1: Update delivery status to pending
      const { data: delivery, error: updateError } = await supabase
        .from('delivery_requests')
        .update({
          status: 'pending',
          assigned_provider_id: null,
          reassignment_count: supabase.sql`reassignment_count + 1`,
          last_reassigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating delivery:', updateError);
        throw updateError;
      }

      // Step 2: Add cancelling provider to rejected list (don't alert them again)
      await supabase
        .from('delivery_requests')
        .update({
          rejected_by_providers: supabase.sql`
            COALESCE(rejected_by_providers, ARRAY[]::text[]) || ARRAY[${cancelledProviderId}]::text[]
          `
        })
        .eq('id', deliveryId);

      // Step 3: Log the cancellation
      await supabase
        .from('delivery_cancellations')
        .insert({
          delivery_id: deliveryId,
          provider_id: cancelledProviderId,
          reason: cancellationReason,
          cancelled_at: new Date().toISOString()
        });

      // Step 4: Automatically re-alert ALL other delivery providers
      await this.reAlertAllProviders(delivery as DeliveryRequest, cancelledProviderId);

      // Step 5: Notify the builder about the cancellation
      await this.notifyBuilderOfCancellation(delivery as DeliveryRequest, cancellationReason);

      // Step 6: If urgent or reassigned > 3 times, increase payment offer
      if (delivery.urgency === 'urgent' || delivery.reassignment_count > 3) {
        await this.increasePayout(deliveryId, delivery.reassignment_count);
      }

    } catch (error) {
      console.error('Error in reassignment service:', error);
      throw error;
    }
  }

  /**
   * Re-alert all delivery providers (except those who rejected)
   */
  static async reAlertAllProviders(
    delivery: DeliveryRequest, 
    excludeProviderId: string
  ): Promise<void> {
    try {
      // Get all active delivery providers in the service area
      const { data: providers, error } = await supabase
        .from('delivery_providers')
        .select('*')
        .eq('status', 'active')
        .eq('is_available', true)
        .neq('id', excludeProviderId); // Exclude the cancelling provider

      if (error) throw error;

      if (!providers || providers.length === 0) {
        console.warn('No available providers found for reassignment');
        await this.escalateToAdmin(delivery);
        return;
      }

      // Filter out providers who already rejected this delivery
      const eligibleProviders = providers.filter(provider => 
        !delivery.rejected_by_providers?.includes(provider.id)
      );

      if (eligibleProviders.length === 0) {
        console.warn('All providers have rejected this delivery');
        await this.escalateToAdmin(delivery);
        return;
      }

      console.log(`🚨 RE-ALERTING ${eligibleProviders.length} providers for delivery ${delivery.delivery_id}`);

      // Send alerts to all eligible providers
      const alertPromises = eligibleProviders.map(provider => 
        this.sendMultiChannelAlert(provider, delivery, true) // true = is reassignment
      );

      await Promise.all(alertPromises);

      // Log the reassignment
      console.log(`✅ Successfully re-alerted ${eligibleProviders.length} providers`);

    } catch (error) {
      console.error('Error re-alerting providers:', error);
      throw error;
    }
  }

  /**
   * Send multi-channel alerts to a provider
   */
  static async sendMultiChannelAlert(
    provider: any,
    delivery: DeliveryRequest,
    isReassignment: boolean = false
  ): Promise<void> {
    const urgencyBoost = delivery.urgency === 'urgent' ? 1.2 : 1;
    const reassignmentBoost = isReassignment ? 1.15 : 1; // 15% more for reassignments
    const finalCost = delivery.estimated_cost * urgencyBoost * reassignmentBoost;

    const alertData = {
      providerId: provider.id,
      providerName: provider.name,
      providerPhone: provider.phone,
      providerEmail: provider.email,
      delivery: {
        ...delivery,
        estimated_cost: finalCost, // Increased payment for reassignments
        is_reassignment: isReassignment
      }
    };

    // 1. Browser Push Notification
    await this.sendPushNotification(alertData);

    // 2. SMS Alert
    await this.sendSMSAlert(alertData);

    // 3. Email Alert
    await this.sendEmailAlert(alertData);

    // 4. In-App Notification (via Supabase Realtime)
    await this.createInAppNotification(alertData);

    // 5. Sound/Vibration (handled client-side when notification received)
  }

  /**
   * Send browser push notification
   */
  static async sendPushNotification(alertData: any): Promise<void> {
    // In production, use Web Push API or service like OneSignal
    console.log('📱 Push notification sent:', {
      to: alertData.providerName,
      title: alertData.delivery.is_reassignment 
        ? '🔄 REASSIGNED: Delivery Available' 
        : '🚚 New Delivery Request',
      body: `${alertData.delivery.quantity} ${alertData.delivery.material_type} - ${alertData.delivery.distance_km}km - KES ${alertData.delivery.estimated_cost.toLocaleString()}`,
      urgent: alertData.delivery.urgency === 'urgent'
    });
  }

  /**
   * Send SMS alert via Africa's Talking
   */
  static async sendSMSAlert(alertData: any): Promise<void> {
    const message = alertData.delivery.is_reassignment
      ? `🔄 REASSIGNED DELIVERY (Provider cancelled)

Job: ${alertData.delivery.delivery_id}
${alertData.delivery.quantity} ${alertData.delivery.material_type}
${alertData.delivery.pickup_address} → ${alertData.delivery.delivery_address}
Distance: ${alertData.delivery.distance_km}km
PAY: KES ${alertData.delivery.estimated_cost.toLocaleString()} (+15% reassignment bonus!)

Accept: ujenzipro.com/delivery/accept/${alertData.delivery.delivery_id}

Reply ACCEPT to claim this job
- UjenziPro`
      : `🚚 NEW DELIVERY REQUEST

Job: ${alertData.delivery.delivery_id}
${alertData.delivery.quantity} ${alertData.delivery.material_type}
${alertData.delivery.distance_km}km - KES ${alertData.delivery.estimated_cost.toLocaleString()}

Login to accept
- UjenziPro`;

    // In production, integrate with Africa's Talking
    console.log('📱 SMS sent to:', alertData.providerPhone);
    console.log('Message:', message);

    /* Production code:
    const africasTalking = require('africastalking')({
      apiKey: process.env.AFRICASTALKING_API_KEY,
      username: process.env.AFRICASTALKING_USERNAME
    });

    const sms = africasTalking.SMS;
    await sms.send({
      to: [alertData.providerPhone],
      message: message,
      from: 'UjenziPro'
    });
    */
  }

  /**
   * Send email alert
   */
  static async sendEmailAlert(alertData: any): Promise<void> {
    console.log('📧 Email sent to:', alertData.providerEmail);

    /* Production code using Resend/SendGrid:
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'UjenziPro <delivery@ujenzipro.com>',
        to: alertData.providerEmail,
        subject: alertData.delivery.is_reassignment 
          ? '🔄 REASSIGNED: Delivery Request Available' 
          : '🚚 New Delivery Request',
        html: generateEmailHTML(alertData)
      })
    });
    */
  }

  /**
   * Create in-app notification record
   */
  static async createInAppNotification(alertData: any): Promise<void> {
    await supabase
      .from('provider_notifications')
      .insert({
        provider_id: alertData.providerId,
        delivery_id: alertData.delivery.id,
        type: alertData.delivery.is_reassignment ? 'reassignment' : 'new_request',
        title: alertData.delivery.is_reassignment 
          ? 'Delivery Reassigned - Provider Cancelled' 
          : 'New Delivery Request',
        message: `${alertData.delivery.quantity} ${alertData.delivery.material_type}`,
        is_read: false,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Notify builder that their delivery was cancelled
   */
  static async notifyBuilderOfCancellation(
    delivery: DeliveryRequest,
    reason: string
  ): Promise<void> {
    console.log('📧 Notifying builder of cancellation...');
    
    // Send notification to builder
    const message = `⚠️ Delivery Update for ${delivery.delivery_id}

Your delivery provider has cancelled. 
Reason: ${reason}

✅ DON'T WORRY: We're automatically finding another provider for you.
✅ No action needed - you'll be notified once reassigned.
✅ Your delivery will proceed as scheduled.

- UjenziPro Team`;

    console.log('Builder notification:', message);

    // Create in-app notification for builder
    // Send SMS/Email to builder
    // Add to builder's notification center
  }

  /**
   * Escalate to admin if no providers available
   */
  static async escalateToAdmin(delivery: DeliveryRequest): Promise<void> {
    console.log('🚨 ESCALATING TO ADMIN - No providers available');

    await supabase
      .from('admin_alerts')
      .insert({
        type: 'delivery_no_providers',
        delivery_id: delivery.id,
        message: `URGENT: Delivery ${delivery.delivery_id} has no available providers. Manual assignment needed.`,
        priority: 'high',
        created_at: new Date().toISOString()
      });

    // Send urgent notification to all admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        // Send urgent admin notification
        console.log('🚨 Admin alert sent to:', admin.user_id);
      }
    }
  }

  /**
   * Increase payout for difficult-to-assign deliveries
   */
  static async increasePayout(deliveryId: string, reassignmentCount: number): Promise<void> {
    // Increase payment by 5% for each reassignment (max 25%)
    const bonusPercentage = Math.min(reassignmentCount * 5, 25);
    
    await supabase
      .from('delivery_requests')
      .update({
        bonus_percentage: bonusPercentage,
        bonus_reason: `Reassigned ${reassignmentCount} times - increased payout to attract providers`
      })
      .eq('id', deliveryId);

    console.log(`💰 Increased payout by ${bonusPercentage}% for delivery ${deliveryId}`);
  }

  /**
   * Handle timeout if provider doesn't respond
   */
  static async handleProviderTimeout(deliveryId: string, providerId: string): Promise<void> {
    console.log(`⏰ Provider timeout for delivery ${deliveryId}`);

    // Same as cancellation - re-alert all providers
    await this.handleDeliveryCancellation(
      deliveryId,
      providerId,
      'Provider did not respond within timeout (30 minutes)'
    );
  }

  /**
   * Setup real-time listener for cancellations
   */
  static setupCancellationListener(): void {
    // Listen for delivery cancellations in real-time
    supabase
      .channel('delivery-cancellations')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_cancellations'
        },
        async (payload) => {
          const cancellation = payload.new as any;
          
          console.log('🔔 Cancellation detected:', cancellation);

          // Automatically trigger reassignment
          await this.handleDeliveryCancellation(
            cancellation.delivery_id,
            cancellation.provider_id,
            cancellation.reason
          );
        }
      )
      .subscribe();

    console.log('✅ Cancellation listener active - will auto-reassign deliveries');
  }

  /**
   * Get available providers for a delivery (excluding those who rejected)
   */
  static async getAvailableProviders(
    delivery: DeliveryRequest,
    excludeProviderIds: string[] = []
  ): Promise<any[]> {
    const { data: providers } = await supabase
      .from('delivery_providers')
      .select('*')
      .eq('status', 'active')
      .eq('is_available', true)
      .not('id', 'in', `(${excludeProviderIds.join(',')})`)
      // Add service area filtering in production
      .limit(10);

    return providers || [];
  }

  /**
   * Track reassignment metrics
   */
  static async trackReassignmentMetrics(deliveryId: string): Promise<void> {
    await supabase
      .from('delivery_metrics')
      .insert({
        delivery_id: deliveryId,
        metric_type: 'reassignment',
        timestamp: new Date().toISOString()
      });
  }
}

/**
 * Initialize the reassignment service
 */
export const initializeReassignmentService = () => {
  DeliveryReassignmentService.setupCancellationListener();
  console.log('🚀 Delivery Reassignment Service initialized');
};

