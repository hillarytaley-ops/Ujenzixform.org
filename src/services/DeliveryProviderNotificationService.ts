/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🚚 DELIVERY PROVIDER NOTIFICATION SERVICE                                         ║
 * ║                                                                                      ║
 * ║   Created: February 12, 2026                                                        ║
 * ║   Purpose: Alert all registered delivery providers when a new delivery request      ║
 * ║            is created. First-come-first-served matching system.                     ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '@/integrations/supabase/client';
import notificationService from './NotificationService';
import { sendEmailViaEdgeFunction } from '@/lib/email';

export interface DeliveryRequestDetails {
  id?: string;
  po_number?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  material_type?: string;
  quantity?: number;
  weight_kg?: number;
  budget_range?: string;
  special_instructions?: string;
  builder_name?: string;
}

interface DeliveryProvider {
  id: string;
  user_id: string;
  provider_name: string;
  phone: string;
  email?: string;
  is_active: boolean;
  is_verified: boolean;
  service_areas?: string[];
}

interface NotificationResult {
  totalProviders: number;
  notified: number;
  failed: number;
  errors: string[];
}

/**
 * Service to notify all registered delivery providers about new delivery requests
 */
class DeliveryProviderNotificationService {
  
  /**
   * Get all active and verified delivery providers
   */
  async getActiveProviders(): Promise<DeliveryProvider[]> {
    try {
      console.log('🚚 Fetching active delivery providers...');
      const { data, error } = await supabase
        .from('delivery_providers')
        .select('id, user_id, provider_name, phone, email, is_active, is_verified, service_areas')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching providers:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} active delivery providers`);
      return data || [];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error fetching delivery providers:', msg);
      return [];
    }
  }

  /**
   * Email via Supabase Edge Function `send-email` (see sendEmailViaEdgeFunction).
   */
  async sendEmailNotification(
    email: string,
    requestDetails: DeliveryRequestDetails
  ): Promise<boolean> {
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    try {
      const subject = 'UjenziXform: New delivery request';
      const html = `
        <p>A new delivery job is available.</p>
        <ul>
          <li><strong>Pickup:</strong> ${safe(requestDetails.pickup_address)}</li>
          <li><strong>Delivery:</strong> ${safe(requestDetails.delivery_address)}</li>
          <li><strong>Date:</strong> ${safe(new Date(requestDetails.pickup_date).toLocaleString())}</li>
          <li><strong>Material:</strong> ${safe(requestDetails.material_type || 'Construction materials')}</li>
        </ul>
        <p>Sign in to the delivery dashboard to accept.</p>
      `;
      const { success } = await sendEmailViaEdgeFunction({ to: email, subject, html });
      return success;
    } catch (e: unknown) {
      console.warn('⚠️ Email notification error:', e instanceof Error ? e.message : e);
      return false;
    }
  }

  /**
   * Create in-app notification for a delivery provider
   */
  async createInAppNotification(
    userId: string,
    requestDetails: DeliveryRequestDetails
  ): Promise<boolean> {
    try {
      const notificationData = {
        user_id: userId,
        type: 'delivery_request',
        title: '🚚 New Delivery Request Available!',
        message: `New delivery: ${requestDetails.pickup_address} → ${requestDetails.delivery_address}. Material: ${requestDetails.material_type || 'Construction materials'}. Date: ${new Date(requestDetails.pickup_date).toLocaleDateString()}.`,
        data: {
          request_id: requestDetails.id,
          po_number: requestDetails.po_number,
          pickup_address: requestDetails.pickup_address,
          delivery_address: requestDetails.delivery_address,
          pickup_date: requestDetails.pickup_date,
          material_type: requestDetails.material_type,
          quantity: requestDetails.quantity,
          weight_kg: requestDetails.weight_kg,
          budget_range: requestDetails.budget_range
        },
        read: false
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData as any);
      
      if (error) {
        // Table might not exist - log but don't fail
        console.warn('⚠️ Could not create in-app notification:', error.message);
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.warn('⚠️ In-app notification error:', error?.message);
      return false;
    }
  }

  /**
   * Send SMS notification to a delivery provider
   */
  async sendSMSNotification(
    phone: string,
    requestDetails: DeliveryRequestDetails
  ): Promise<boolean> {
    try {
      const message = `🚚 UjenziXform: New delivery job available!\n` +
        `📍 From: ${requestDetails.pickup_address}\n` +
        `📍 To: ${requestDetails.delivery_address}\n` +
        `📅 Date: ${new Date(requestDetails.pickup_date).toLocaleDateString()}\n` +
        `📦 Material: ${requestDetails.material_type || 'Construction materials'}\n` +
        `${requestDetails.budget_range ? `💰 Budget: ${requestDetails.budget_range}\n` : ''}` +
        `\nFirst to accept gets the job! Login to accept.`;

      const result = await notificationService.sendSMS({
        to: phone,
        message
      });

      return result.success;
    } catch (error: any) {
      console.warn('⚠️ SMS notification error:', error?.message);
      return false;
    }
  }

  /**
   * Store delivery provider notification in queue table
   */
  async queueProviderNotification(
    providerId: string,
    requestId: string,
    position: number
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      if (origin && token) {
        const response = await fetch(`${origin}/api/delivery-provider-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            providerId,
            requestId,
            queuePosition: position,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (response.ok) {
          return true;
        }
        if (response.status !== 404) {
          console.warn('⚠️ Could not queue provider notification:', payload.error || response.statusText);
          return false;
        }
      }

      const { error } = await supabase
        .from('delivery_provider_queue')
        .insert({
          provider_id: providerId,
          request_id: requestId,
          queue_position: position,
          status: 'notified',
          contacted_at: new Date().toISOString(),
          timeout_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        } as any);

      if (error) {
        console.warn('⚠️ Could not queue provider notification:', error.message);
        return false;
      }

      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Queue notification error:', msg);
      return false;
    }
  }

  /**
   * Notify ALL registered delivery providers about a new delivery request
   * This implements the "first-come-first-served" matching system
   */
  async notifyAllProviders(requestDetails: DeliveryRequestDetails): Promise<NotificationResult> {
    const result: NotificationResult = {
      totalProviders: 0,
      notified: 0,
      failed: 0,
      errors: []
    };

    try {
      console.log('🔔 Starting delivery provider notifications...');
      console.log('📦 Request details:', {
        id: requestDetails.id,
        pickup: requestDetails.pickup_address,
        delivery: requestDetails.delivery_address,
        date: requestDetails.pickup_date
      });

      // Get all active providers
      const providers = await this.getActiveProviders();
      result.totalProviders = providers.length;

      if (providers.length === 0) {
        console.log('⚠️ No active delivery providers found');
        result.errors.push('No active delivery providers available');
        return result;
      }

      console.log(`📢 Notifying ${providers.length} delivery providers...`);

      // Notify each provider in parallel (with limit)
      const notificationPromises = providers.map(async (provider, index) => {
        try {
          const notificationResults = {
            inApp: false,
            sms: false,
            email: false,
            queued: false
          };

          // 1. Create in-app notification
          if (provider.user_id) {
            notificationResults.inApp = await this.createInAppNotification(
              provider.user_id,
              requestDetails
            );
          }

          // 2. Send SMS notification (if phone available)
          if (provider.phone) {
            notificationResults.sms = await this.sendSMSNotification(
              provider.phone,
              requestDetails
            );
          }

          // 3. Email (when address is on file and API route is configured)
          if (provider.email?.includes('@')) {
            notificationResults.email = await this.sendEmailNotification(
              provider.email,
              requestDetails
            );
          }

          // 4. Queue the provider for this request
          if (requestDetails.id) {
            notificationResults.queued = await this.queueProviderNotification(
              provider.id,
              requestDetails.id,
              index + 1
            );
          }

          const success =
            notificationResults.inApp ||
            notificationResults.sms ||
            notificationResults.email ||
            notificationResults.queued;
          
          if (success) {
            console.log(`✅ Notified provider: ${provider.provider_name} (${provider.phone || 'no phone'})`);
          } else {
            console.warn(`⚠️ Failed to notify provider: ${provider.provider_name}`);
          }

          return success;
        } catch (error: any) {
          console.error(`❌ Error notifying ${provider.provider_name}:`, error?.message);
          return false;
        }
      });

      // Wait for all notifications (with 15 second total timeout)
      const timeoutPromise = new Promise<boolean[]>((resolve) => {
        setTimeout(() => {
          console.log('⏱️ Notification timeout reached');
          resolve(providers.map(() => false));
        }, 15000);
      });

      const results = await Promise.race([
        Promise.all(notificationPromises),
        timeoutPromise
      ]);

      // Count successes and failures
      results.forEach((success) => {
        if (success) {
          result.notified++;
        } else {
          result.failed++;
        }
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Notification Summary:`);
      console.log(`   Total Providers: ${result.totalProviders}`);
      console.log(`   Successfully Notified: ${result.notified}`);
      console.log(`   Failed: ${result.failed}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return result;

    } catch (error: any) {
      console.error('❌ Error in notifyAllProviders:', error?.message || error);
      result.errors.push(error?.message || 'Unknown error');
      return result;
    }
  }

  /**
   * Log delivery notification event for analytics
   */
  async logNotificationEvent(
    requestId: string,
    result: NotificationResult
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'delivery_providers_notified',
        event_data: {
          request_id: requestId,
          total_providers: result.totalProviders,
          notified: result.notified,
          failed: result.failed,
          errors: result.errors,
        },
        created_at: new Date().toISOString(),
      } as any);
    } catch (error) {
      // Non-critical - just log
      console.log('📝 Analytics log skipped');
    }
  }
}

// Export singleton instance
export const deliveryProviderNotificationService = new DeliveryProviderNotificationService();
export default deliveryProviderNotificationService;
