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
import { captureError, captureMessage } from '@/lib/sentry';
import {
  filterProvidersByProximity,
  haversineKm,
  resolveJobCoordinates,
  serviceAreaMatchesAddress,
  type JobCoordinates,
} from '@/utils/deliveryProximity';

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
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
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
  current_latitude?: number | null;
  current_longitude?: number | null;
}

export interface NotificationResult {
  totalProviders: number;
  notified: number;
  failed: number;
  errors: string[];
  /** Providers matched by proximity / service area (when location used) */
  inRangeCount?: number;
}

const DEFAULT_RADIUS_KM = 75;

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
        .select(
          'id, user_id, provider_name, phone, email, is_active, is_verified, service_areas, current_latitude, current_longitude'
        )
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
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('⚠️ Email notification error:', msg);
      if (e instanceof Error) {
        captureError(e, { channel: 'delivery_email', requestId: requestDetails.id });
      } else {
        captureMessage(`delivery_notify_email: ${msg}`, 'warning');
      }
      return false;
    }
  }

  /**
   * Create in-app notification for a delivery provider
   */
  async createInAppNotification(
    userId: string,
    requestDetails: DeliveryRequestDetails,
    dataExtras?: Record<string, unknown> | null
  ): Promise<boolean> {
    try {
      // Always persist request_id as a real JSON key when present (undefined is omitted by JSON
      // serialization and breaks RLS: dr.id = notifications.data->>'request_id').
      const baseData: Record<string, unknown> = {
        ...(requestDetails.id != null && String(requestDetails.id).trim() !== ''
          ? { request_id: String(requestDetails.id) }
          : {}),
        po_number: requestDetails.po_number,
        pickup_address: requestDetails.pickup_address,
        delivery_address: requestDetails.delivery_address,
        pickup_date: requestDetails.pickup_date,
        material_type: requestDetails.material_type,
        quantity: requestDetails.quantity,
        weight_kg: requestDetails.weight_kg,
        budget_range: requestDetails.budget_range,
        ...(dataExtras && Object.keys(dataExtras).length ? dataExtras : {}),
      };
      const nearby = Boolean(dataExtras?.nearby_job);
      const notificationData = {
        user_id: userId,
        type: 'delivery_request',
        title: nearby ? '📍 Delivery near you' : '🚚 New Delivery Request Available!',
        message: `New delivery: ${requestDetails.pickup_address} → ${requestDetails.delivery_address}. Material: ${requestDetails.material_type || 'Construction materials'}. Date: ${new Date(requestDetails.pickup_date).toLocaleDateString()}.`,
        data: baseData,
        read: false
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData as any);
      
      if (error) {
        console.warn('⚠️ Could not create in-app notification:', error.message);
        captureMessage(`delivery_notify_in_app: ${error.message}`, 'warning');
        return false;
      }
      
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ In-app notification error:', msg);
      if (error instanceof Error) {
        captureError(error, { channel: 'delivery_in_app' });
      }
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ SMS notification error:', msg);
      if (error instanceof Error) {
        captureError(error, { channel: 'delivery_sms', requestId: requestDetails.id });
      } else {
        captureMessage(`delivery_notify_sms: ${msg}`, 'warning');
      }
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
        // 500 = common when Vercel is missing SUPABASE_SERVICE_ROLE_KEY; fall back to direct insert (RLS permitting).
        if (response.status !== 404) {
          console.warn(
            '⚠️ /api/delivery-provider-queue failed, trying direct insert:',
            payload.error || response.statusText
          );
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

  private proximityExtrasForProvider(
    provider: DeliveryProvider,
    job: JobCoordinates | null | undefined,
    radiusKm: number,
    addressBlob: string
  ): Record<string, unknown> | null {
    if (!job) return null;
    const plat = provider.current_latitude;
    const plng = provider.current_longitude;
    const hasGps =
      typeof plat === 'number' &&
      typeof plng === 'number' &&
      Number.isFinite(plat) &&
      Number.isFinite(plng);
    if (hasGps) {
      const d = haversineKm(job.lat, job.lng, plat, plng);
      return {
        nearby_job: d <= radiusKm,
        distance_km: Math.round(d * 10) / 10,
        job_lat: job.lat,
        job_lng: job.lng,
        job_coordinate_source: job.source,
        proximity_radius_km: radiusKm,
      };
    }
    const areaMatch = serviceAreaMatchesAddress(provider.service_areas || [], addressBlob);
    return {
      nearby_job: areaMatch,
      distance_km: null,
      job_lat: job.lat,
      job_lng: job.lng,
      job_coordinate_source: job.source,
      proximity_radius_km: radiusKm,
      matched_by_service_area: areaMatch,
    };
  }

  /**
   * Notify a specific list of providers (shared by broadcast and nearby flows).
   */
  async notifyProviderList(
    providers: DeliveryProvider[],
    requestDetails: DeliveryRequestDetails,
    options?: {
      jobCoords?: JobCoordinates | null;
      radiusKm?: number;
    }
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      totalProviders: providers.length,
      notified: 0,
      failed: 0,
      errors: [],
    };

    const job = options?.jobCoords ?? null;
    const radiusKm = options?.radiusKm ?? DEFAULT_RADIUS_KM;
    const addressBlob = `${requestDetails.pickup_address}\n${requestDetails.delivery_address}`;

    if (providers.length === 0) {
      return result;
    }

    console.log(`📢 Notifying ${providers.length} delivery provider(s)...`);

    const notificationPromises = providers.map(async (provider, index) => {
      try {
        const notificationResults = {
          inApp: false,
          sms: false,
          email: false,
          queued: false,
        };

        const extras = this.proximityExtrasForProvider(provider, job, radiusKm, addressBlob);

        if (provider.user_id) {
          notificationResults.inApp = await this.createInAppNotification(
            provider.user_id,
            requestDetails,
            extras
          );
        }

        if (provider.phone) {
          notificationResults.sms = await this.sendSMSNotification(provider.phone, requestDetails);
        }

        if (provider.email?.includes('@')) {
          notificationResults.email = await this.sendEmailNotification(provider.email, requestDetails);
        }

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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error notifying ${provider.provider_name}:`, msg);
        return false;
      }
    });

    const NOTIFICATION_DEADLINE_MS = 25000;
    let deadlineId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<boolean[]>((resolve) => {
      deadlineId = setTimeout(() => {
        console.warn(
          '⏱️ Notification deadline reached; some provider channels may still be in flight'
        );
        resolve(providers.map(() => false));
      }, NOTIFICATION_DEADLINE_MS);
    });

    const allDone = Promise.all(notificationPromises).then((r) => {
      clearTimeout(deadlineId);
      return r;
    });

    const results = await Promise.race([allDone, timeoutPromise]);

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
  }

  /**
   * Admin / staff: only providers within range (GPS) or matching service areas (no GPS).
   * Does not fall back to all providers.
   */
  async notifyNearbyProviders(
    requestDetails: DeliveryRequestDetails,
    opts?: { radiusKm?: number }
  ): Promise<NotificationResult> {
    if (requestDetails.id != null && String(requestDetails.id).trim() !== '') {
      const { data: drGate } = await supabase
        .from('delivery_requests')
        .select('status')
        .eq('id', requestDetails.id)
        .maybeSingle();
      if (!drGate) {
        return {
          totalProviders: 0,
          notified: 0,
          failed: 0,
          errors: ['Delivery request not found; alerts were not sent.'],
          inRangeCount: 0,
        };
      }
      if (drGate.status !== 'delivery_quote_paid') {
        return {
          totalProviders: 0,
          notified: 0,
          failed: 0,
          errors: [
            'Driver alerts are only sent after the builder pays the delivery quote (status must be delivery_quote_paid).',
          ],
          inRangeCount: 0,
        };
      }
    } else {
      return {
        totalProviders: 0,
        notified: 0,
        failed: 0,
        errors: ['Missing delivery request id; alerts were not sent.'],
        inRangeCount: 0,
      };
    }

    const radiusKm = opts?.radiusKm ?? DEFAULT_RADIUS_KM;
    const job = resolveJobCoordinates({
      delivery_latitude: requestDetails.delivery_latitude,
      delivery_longitude: requestDetails.delivery_longitude,
      pickup_latitude: requestDetails.pickup_latitude,
      pickup_longitude: requestDetails.pickup_longitude,
      delivery_address: requestDetails.delivery_address,
      pickup_address: requestDetails.pickup_address,
    });

    if (!job) {
      console.warn(
        'notifyNearbyProviders: no coordinates on request; notifying all active providers (same as broadcast).'
      );
      const allNoCoords = await this.getActiveProviders();
      if (allNoCoords.length === 0) {
        return {
          totalProviders: 0,
          notified: 0,
          failed: 0,
          errors: ['No active delivery providers available.'],
          inRangeCount: 0,
        };
      }
      const broadcast = await this.notifyProviderList(allNoCoords, requestDetails, {
        jobCoords: null,
        radiusKm,
      });
      broadcast.inRangeCount = allNoCoords.length;
      return broadcast;
    }

    const all = await this.getActiveProviders();
    const addressBlob = `${requestDetails.pickup_address}\n${requestDetails.delivery_address}`;
    const filtered = filterProvidersByProximity(all, job.lat, job.lng, radiusKm, addressBlob);

    if (filtered.length === 0) {
      return {
        totalProviders: 0,
        notified: 0,
        failed: 0,
        errors: [
          `No active providers within ${radiusKm} km (or with a matching service area for this address). Widen the radius or ask drivers to update GPS / service areas.`,
        ],
        inRangeCount: 0,
      };
    }

    console.log('🔔 Nearby provider alert:', {
      requestId: requestDetails.id,
      radiusKm,
      matched: filtered.length,
      job,
    });

    const result = await this.notifyProviderList(filtered, requestDetails, {
      jobCoords: job,
      radiusKm,
    });
    result.inRangeCount = filtered.length;
    return result;
  }

  /**
   * Notify delivery providers about a new delivery request.
   * When coordinates exist, prefers nearby providers (GPS or service area); falls back to all if none match.
   */
  async notifyAllProviders(requestDetails: DeliveryRequestDetails): Promise<NotificationResult> {
    try {
      console.log('🔔 Starting delivery provider notifications...');
      console.log('📦 Request details:', {
        id: requestDetails.id,
        pickup: requestDetails.pickup_address,
        delivery: requestDetails.delivery_address,
        date: requestDetails.pickup_date,
      });

      if (requestDetails.id != null && String(requestDetails.id).trim() !== '') {
        const { data: drGate } = await supabase
          .from('delivery_requests')
          .select('status')
          .eq('id', requestDetails.id)
          .maybeSingle();
        if (!drGate) {
          return {
            totalProviders: 0,
            notified: 0,
            failed: 0,
            errors: ['Delivery request not found; provider alerts were not sent.'],
          };
        }
        if (drGate.status !== 'delivery_quote_paid') {
          console.log(
            '📵 notifyAllProviders skipped: status is not delivery_quote_paid —',
            drGate.status
          );
          return {
            totalProviders: 0,
            notified: 0,
            failed: 0,
            errors: [
              'Provider alerts are sent only after the builder pays the delivery quote (delivery_quote_paid).',
            ],
          };
        }
      } else {
        return {
          totalProviders: 0,
          notified: 0,
          failed: 0,
          errors: ['Missing delivery request id; provider alerts were not sent.'],
        };
      }

      const all = await this.getActiveProviders();
      if (all.length === 0) {
        console.log('⚠️ No active delivery providers found');
        return {
          totalProviders: 0,
          notified: 0,
          failed: 0,
          errors: ['No active delivery providers available'],
        };
      }

      const job = resolveJobCoordinates({
        delivery_latitude: requestDetails.delivery_latitude,
        delivery_longitude: requestDetails.delivery_longitude,
        pickup_latitude: requestDetails.pickup_latitude,
        pickup_longitude: requestDetails.pickup_longitude,
        delivery_address: requestDetails.delivery_address,
        pickup_address: requestDetails.pickup_address,
      });

      const addressBlob = `${requestDetails.pickup_address}\n${requestDetails.delivery_address}`;
      let target = all;
      let inRangeCount: number | undefined;

      if (job) {
        const filtered = filterProvidersByProximity(all, job.lat, job.lng, DEFAULT_RADIUS_KM, addressBlob);
        if (filtered.length > 0) {
          target = filtered;
          inRangeCount = filtered.length;
          console.log(`📍 Proximity filter: ${filtered.length} provider(s) in range / service area (of ${all.length})`);
        } else {
          console.log('📍 No providers matched proximity; notifying all active providers');
          target = all;
        }
      }

      const result = await this.notifyProviderList(target, requestDetails, {
        jobCoords: job,
        radiusKm: DEFAULT_RADIUS_KM,
      });
      result.inRangeCount = inRangeCount;
      if (job && target === all && inRangeCount === undefined) {
        result.errors.push(
          'No drivers matched nearby filters; all active providers were notified.'
        );
      }
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in notifyAllProviders:', msg);
      return {
        totalProviders: 0,
        notified: 0,
        failed: 0,
        errors: [msg || 'Unknown error'],
      };
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
