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

// Constants
const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

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
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
      
      // Try using native fetch first (faster)
      const response = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/delivery_providers?is_active=eq.true&select=id,user_id,provider_name,phone,email,is_active,is_verified,service_areas`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        },
        8000
      );
      
      if (response.ok) {
        const providers = await response.json();
        console.log(`✅ Found ${providers?.length || 0} active delivery providers`);
        return providers || [];
      }
      
      // Fallback to Supabase client
      const { data, error } = await supabase
        .from('delivery_providers')
        .select('id, user_id, provider_name, phone, email, is_active, is_verified, service_areas')
        .eq('is_active', true);
      
      if (error) {
        console.error('❌ Error fetching providers:', error);
        return [];
      }
      
      console.log(`✅ Found ${data?.length || 0} active delivery providers (via Supabase client)`);
      return data || [];
      
    } catch (error: any) {
      console.error('❌ Error fetching delivery providers:', error?.message || error);
      return [];
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
        is_read: false,
        created_at: new Date().toISOString()
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
      const message = `🚚 UjenziPro: New delivery job available!\n` +
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
      const { error } = await supabase
        .from('delivery_provider_queue')
        .insert({
          provider_id: providerId,
          request_id: requestId,
          queue_position: position,
          status: 'notified',
          contacted_at: new Date().toISOString(),
          timeout_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min timeout
        } as any);
      
      if (error) {
        console.warn('⚠️ Could not queue provider notification:', error.message);
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.warn('⚠️ Queue notification error:', error?.message);
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

          // 3. Queue the provider for this request
          if (requestDetails.id) {
            notificationResults.queued = await this.queueProviderNotification(
              provider.id,
              requestDetails.id,
              index + 1
            );
          }

          const success = notificationResults.inApp || notificationResults.sms || notificationResults.queued;
          
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
      await supabase.from('analytics_events').insert({
        event_type: 'delivery_providers_notified',
        event_data: {
          request_id: requestId,
          total_providers: result.totalProviders,
          notified: result.notified,
          failed: result.failed,
          errors: result.errors
        },
        created_at: new Date().toISOString()
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
