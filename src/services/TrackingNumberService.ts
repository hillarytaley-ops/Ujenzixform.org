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
   * Public method for use across the application
   */
  generateTrackingNumber(): string {
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
    // Validate inputs
    if (!deliveryRequestId || !providerId || providerId === '') {
      console.error('❌ onProviderAcceptsDelivery: Invalid parameters', { deliveryRequestId, providerId });
      throw new Error('Invalid delivery request ID or provider ID');
    }
    
    console.log('🚚 onProviderAcceptsDelivery called with:', { deliveryRequestId, providerId });
    
    try {
      // First, get the delivery request to check its expected delivery date
      // Use direct REST API call with timeout to avoid Supabase client hanging
      console.log('📦 Step 1: Fetching delivery request...');
      
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token - try localStorage first (faster), then getSession as fallback
      let accessToken = SUPABASE_ANON_KEY;
      try {
        console.log('🔑 Getting access token...');
        
        // Try localStorage first (much faster, no async call)
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed.access_token) {
              accessToken = parsed.access_token;
              console.log('✅ Access token obtained from localStorage');
            }
          } catch (e) {
            console.warn('⚠️ Could not parse stored session');
          }
        }
        
        // If localStorage didn't work, try getSession (with timeout)
        if (accessToken === SUPABASE_ANON_KEY) {
          console.log('🔑 Trying getSession() as fallback...');
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Session timeout')), 2000);
          });
          
          const { data: { session } } = await Promise.race([sessionPromise, sessionTimeout]) as any;
          if (session?.access_token) {
            accessToken = session.access_token;
            console.log('✅ Session token obtained from getSession()');
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not get session token:', e);
        // If we still have anon key, this will fail on UPDATE operations due to RLS
        // But we'll try anyway and show a clear error
      }
      
      if (accessToken === SUPABASE_ANON_KEY) {
        console.warn('⚠️ Using anon key - UPDATE operations may fail due to RLS policies');
      }
      
      // Use direct fetch with timeout - wrap in Promise.race for extra safety
      console.log('🌐 Starting fetch request for delivery request...');
      const fetchPromise = fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=id,pickup_date,preferred_date,status,provider_id`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          cache: 'no-store'
        }
      );
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('⏱️ Step 1 fetch timeout after 5 seconds');
          reject(new Error('Query timeout after 5 seconds'));
        }, 5000);
      });
      
      let requestToAccept: any;
      let requestError: any;
      
      try {
        console.log('⏳ Waiting for fetch response...');
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        console.log('✅ Fetch response received:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          requestError = { message: `HTTP ${response.status}: ${errorText}`, code: response.status.toString() };
          console.error('❌ Fetch response not OK:', response.status, errorText);
        } else {
          const data = await response.json();
          console.log('✅ Fetch data received:', data);
          requestToAccept = Array.isArray(data) && data.length > 0 ? data[0] : null;
          if (!requestToAccept) {
            requestError = { message: 'Delivery request not found', code: '404' };
            console.error('❌ No delivery request found in response');
          }
        }
      } catch (error: any) {
        console.error('❌ Fetch error caught:', error);
        if (error.message?.includes('timeout')) {
          requestError = { message: 'Query timeout after 5 seconds', code: 'TIMEOUT' };
        } else {
          requestError = { message: error.message || 'Network error', code: error.name || 'NETWORK_ERROR' };
        }
      }

      if (requestError) {
        console.error('❌ Error fetching delivery request:', requestError);
        throw new Error(requestError.message || 'Failed to fetch delivery request');
      }
      
      console.log('✅ Step 1 complete: Delivery request fetched', { id: requestToAccept.id, status: requestToAccept.status });

      // Determine the delivery date for the request being accepted
      // Priority: preferred_date > pickup_date > today
      const requestDeliveryDate = requestToAccept.preferred_date 
        || requestToAccept.pickup_date 
        || new Date().toISOString().split('T')[0];
      
      const requestDateStr = new Date(requestDeliveryDate).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      console.log(`📅 Request delivery date: ${requestDateStr}, Today: ${todayStr}`);

      // CHECK: Does this provider already have an active delivery FOR THE SAME DATE?
      // Provider CAN accept future deliveries while having active deliveries for today
      console.log('📦 Step 2: Checking active deliveries...');
      
      // Use direct REST API with timeout
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
      
      let activeDeliveries: any[] = [];
      let activeError: any = null;
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?provider_id=eq.${providerId}&id=neq.${deliveryRequestId}&status=in.(accepted,picked_up,in_transit,assigned)&select=id,status,tracking_number,pickup_date,preferred_date`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            signal: controller2.signal,
            cache: 'no-store'
          }
        );
        
        clearTimeout(timeoutId2);
        
        if (response.ok) {
          activeDeliveries = await response.json();
        } else {
          activeError = { message: `HTTP ${response.status}`, code: response.status.toString() };
        }
      } catch (error: any) {
        clearTimeout(timeoutId2);
        if (error.name === 'AbortError') {
          console.warn('⚠️ Step 2 timeout - continuing anyway');
          activeDeliveries = []; // Continue without blocking
        } else {
          activeError = error;
        }
      }

      if (activeError) {
        console.warn('⚠️ Error checking active deliveries (non-critical):', activeError);
        // Don't throw - this is not critical, continue
      }

      // Check if any active delivery conflicts with the same date
      if (activeDeliveries && activeDeliveries.length > 0) {
        for (const activeDelivery of activeDeliveries) {
          const activeDeliveryDate = activeDelivery.preferred_date 
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
      console.log('✅ Step 2 complete: Active deliveries checked');

      // First, check if this delivery request is still available (FIRST-COME-FIRST-SERVED check)
      console.log('📦 Step 3: Fetching existing request for first-come-first-served check...');
      
      // Use direct REST API with timeout
      const controller3 = new AbortController();
      const timeoutId3 = setTimeout(() => controller3.abort(), 5000);
      
      let existingRequest: any;
      let fetchError: any;
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            signal: controller3.signal,
            cache: 'no-store'
          }
        );
        
        clearTimeout(timeoutId3);
        
        if (!response.ok) {
          const errorText = await response.text();
          fetchError = { message: `HTTP ${response.status}: ${errorText}`, code: response.status.toString() };
        } else {
          const data = await response.json();
          existingRequest = Array.isArray(data) && data.length > 0 ? data[0] : null;
          if (!existingRequest) {
            fetchError = { message: 'Delivery request not found', code: '404' };
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId3);
        if (error.name === 'AbortError') {
          fetchError = { message: 'Query timeout after 5 seconds', code: 'TIMEOUT' };
        } else {
          fetchError = error;
        }
      }

      if (fetchError) {
        console.error('❌ Error fetching delivery request:', fetchError);
        throw new Error(fetchError.message || 'Failed to fetch delivery request');
      }
      
      console.log('✅ Step 3 complete: Existing request fetched');

      // FIRST-COME-FIRST-SERVED: Check if another provider already accepted
      if (existingRequest.status === 'accepted' && existingRequest.provider_id && existingRequest.provider_id !== providerId) {
        console.log(`❌ Delivery ${deliveryRequestId} already accepted by provider ${existingRequest.provider_id}`);
        throw new Error('This delivery has already been accepted by another provider. First-come-first-served!');
      }

      // Also check if status is not pending (could be cancelled, completed, etc.)
      if (!['pending', 'assigned', 'accepted'].includes(existingRequest.status)) {
        console.log(`❌ Delivery ${deliveryRequestId} is no longer available (status: ${existingRequest.status})`);
        throw new Error(`This delivery is no longer available (status: ${existingRequest.status})`);
      }

      let trackingNumber: string;
      let isNew = false;

      if (existingRequest.tracking_number) {
        // Reuse existing tracking number (provider may have changed due to reassignment)
        trackingNumber = existingRequest.tracking_number;
        console.log(`✅ Reusing existing tracking number: ${trackingNumber}`);
      } else {
        // Generate new tracking number
        trackingNumber = this.generateTrackingNumber();
        isNew = true;
        console.log(`✅ Generated new tracking number: ${trackingNumber}`);
      }

      // ATOMIC UPDATE: Use a conditional update to ensure first-come-first-served
      // Only update if the status is still 'pending' or 'assigned' OR if we're the same provider
      console.log('📦 Step 4: Updating delivery request...');
      
      // Use direct REST API with timeout for the update
      const updatePromise = fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            tracking_number: trackingNumber,
            provider_id: providerId,
            status: 'accepted',
            provider_response: 'accepted',
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
          cache: 'no-store'
        }
      );
      
      const updateTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('⏱️ Step 4 update timeout after 5 seconds');
          reject(new Error('Update timeout after 5 seconds'));
        }, 5000);
      });
      
      let updateResult: any[] = [];
      let updateError: any = null;
      
      try {
        console.log('⏳ Waiting for update response...');
        const response = await Promise.race([updatePromise, updateTimeout]);
        console.log('✅ Update response received:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          updateError = { message: `HTTP ${response.status}: ${errorText}`, code: response.status.toString() };
          console.error('❌ Update response not OK:', response.status, errorText);
        } else {
          updateResult = await response.json();
          console.log('✅ Update data received:', updateResult);
        }
      } catch (error: any) {
        console.error('❌ Update error caught:', error);
        if (error.message?.includes('timeout')) {
          updateError = { message: 'Update timeout after 5 seconds', code: 'TIMEOUT' };
        } else {
          updateError = { message: error.message || 'Network error', code: error.name || 'NETWORK_ERROR' };
        }
      }

      // Check if update was successful (row was actually updated)
      if (updateError) {
        console.error('❌ Error updating delivery request:', updateError);
        throw new Error(updateError.message || 'Failed to update delivery request');
      }
      
      if (!updateResult || updateResult.length === 0) {
        console.log(`❌ Failed to accept delivery ${deliveryRequestId} - likely already accepted by another provider`);
        throw new Error('This delivery has already been accepted by another provider. First-come-first-served!');
      }

      console.log(`✅ Step 4 complete: Provider ${providerId} successfully accepted delivery ${deliveryRequestId} (First-come-first-served)`);

      // Explicitly create/update tracking_numbers entry (backup to database trigger)
      // This ensures the entry exists even if the trigger fails
      console.log('📦 Step 5: Creating/updating tracking_numbers entry...');
      try {
        const { data: existingTracking } = await supabase
          .from('tracking_numbers')
          .select('id')
          .eq('delivery_request_id', deliveryRequestId)
          .maybeSingle();

        if (!existingTracking) {
          // Parallelize these database calls to speed up the process
          let builderUserId = existingRequest.builder_id;
          let supplierId = null;
          let providerName = 'Delivery Provider';
          let providerPhone = null;

          console.log('📦 Step 5: Resolving builder_id - existingRequest.builder_id:', existingRequest.builder_id);

          // Run all lookups in parallel
          const [builderProfileResult, poResult, providerResult] = await Promise.allSettled([
            // Get builder's user_id (builder_id might be profile.id)
            // Try both as id and as user_id
            supabase
              .from('profiles')
              .select('id, user_id')
              .or(`id.eq.${existingRequest.builder_id},user_id.eq.${existingRequest.builder_id}`)
              .maybeSingle(),
            // Get supplier_id from purchase_order if exists
            existingRequest.purchase_order_id
              ? supabase
                  .from('purchase_orders')
                  .select('supplier_id')
                  .eq('id', existingRequest.purchase_order_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            // Get provider info
            supabase
              .from('delivery_providers')
              .select('provider_name, phone, company_name')
              .eq('id', providerId)
              .maybeSingle()
          ]);

          // Process builder profile result - CRITICAL: Use user_id, not profile.id
          if (builderProfileResult.status === 'fulfilled' && builderProfileResult.value.data) {
            const profileData = builderProfileResult.value.data;
            // Prefer user_id if available, otherwise check if builder_id is already a user_id
            if (profileData.user_id) {
              builderUserId = profileData.user_id;
              console.log('✅ Step 5: Got builder user_id from profile:', builderUserId);
            } else if (profileData.id === existingRequest.builder_id) {
              // Profile found but no user_id - builder_id might already be user_id
              // Check if it looks like a UUID (user_id format)
              if (existingRequest.builder_id && existingRequest.builder_id.length === 36) {
                builderUserId = existingRequest.builder_id;
                console.log('✅ Step 5: Using builder_id as user_id (UUID format):', builderUserId);
              } else {
                console.warn('⚠️ Step 5: Profile found but no user_id, and builder_id is not UUID format');
              }
            }
          } else {
            // No profile found - builder_id might already be user_id
            if (existingRequest.builder_id && existingRequest.builder_id.length === 36) {
              builderUserId = existingRequest.builder_id;
              console.log('✅ Step 5: No profile found, using builder_id as user_id:', builderUserId);
            } else {
              console.warn('⚠️ Step 5: Could not resolve builder_id - using as-is:', existingRequest.builder_id);
            }
          }
          
          console.log('📦 Step 5: Final builderUserId for tracking_numbers:', builderUserId);

          // Process purchase order result
          if (poResult.status === 'fulfilled' && poResult.value.data?.supplier_id) {
            supplierId = poResult.value.data.supplier_id;
          }

          // Process provider result
          if (providerResult.status === 'fulfilled' && providerResult.value.data) {
            providerName = providerResult.value.data.company_name || providerResult.value.data.provider_name || 'Delivery Provider';
            providerPhone = providerResult.value.data.phone;
          } else {
            // Fallback: Try profiles table if delivery_providers didn't work
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .or(`user_id.eq.${providerId},id.eq.${providerId}`)
                .maybeSingle();
              if (profile) {
                providerName = profile.full_name || 'Delivery Provider';
                providerPhone = profile.phone;
              }
            } catch (e2) {
              // Use defaults
            }
          }

          // Insert tracking number entry using direct REST API with timeout
          console.log('📦 Step 5: Creating tracking_numbers entry with builder_id:', builderUserId);
          
          const trackingInsertPromise = fetch(
            `${SUPABASE_URL}/rest/v1/tracking_numbers`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                tracking_number: trackingNumber,
                delivery_request_id: deliveryRequestId,
                purchase_order_id: existingRequest.purchase_order_id || null,
                builder_id: builderUserId,
                delivery_provider_id: providerId,
                supplier_id: supplierId,
                status: 'accepted',
                delivery_address: existingRequest.delivery_address || 'Address not specified',
                pickup_address: existingRequest.pickup_address || null,
                materials_description: existingRequest.material_type || 'Materials',
                estimated_delivery_date: existingRequest.preferred_date || existingRequest.pickup_date || null,
                provider_name: providerName,
                provider_phone: providerPhone,
                accepted_at: new Date().toISOString()
              }),
              cache: 'no-store'
            }
          );
          
          const trackingInsertTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Tracking insert timeout')), 5000);
          });
          
          try {
            const trackingResponse = await Promise.race([trackingInsertPromise, trackingInsertTimeout]);
            if (!trackingResponse.ok) {
              const errorText = await trackingResponse.text();
              console.error('⚠️ Error creating tracking_numbers entry:', trackingResponse.status, errorText);
              // Don't throw - trigger might have already created it
            } else {
              const insertedData = await trackingResponse.json();
              console.log('✅ Explicitly created tracking_numbers entry:', trackingNumber, 'with builder_id:', builderUserId);
            }
          } catch (error: any) {
            if (error.message?.includes('timeout')) {
              console.error('⚠️ Tracking insert timeout - trigger may have created it');
            } else {
              console.error('⚠️ Error creating tracking_numbers entry:', error);
            }
            // Don't throw - trigger might have already created it
          }
        } else {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('tracking_numbers')
            .update({
              delivery_provider_id: providerId,
              status: 'accepted',
              provider_name: providerName,
              provider_phone: providerPhone,
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('delivery_request_id', deliveryRequestId);

          if (updateError) {
            console.error('⚠️ Error updating tracking_numbers entry:', updateError);
          } else {
            console.log('✅ Updated existing tracking_numbers entry:', trackingNumber);
          }
        }
      } catch (error) {
        console.error('⚠️ Error ensuring tracking_numbers entry exists:', error);
        // Don't throw - continue with notification
      }
      console.log('✅ Step 5 complete: Tracking numbers entry ensured');

      // Fetch builder info and provider info for notification
      console.log('📦 Step 6: Fetching builder and provider info for notification...');
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

      console.log('✅ Step 6 complete: Builder and provider info fetched');
      
      // Send notification to builder
      console.log('📦 Step 7: Sending notification to builder...');
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
      console.log('✅ Step 7 complete: Notification sent');

      // Create a delivery tracking entry (initialize GPS tracking)
      console.log('📦 Step 8: Initializing delivery tracking...');
      await this.initializeDeliveryTracking(deliveryRequestId, providerId, trackingNumber);
      console.log('✅ Step 8 complete: Delivery tracking initialized');

      console.log('🎉 onProviderAcceptsDelivery COMPLETE:', { trackingNumber, isNew, deliveryRequestId });
      return {
        trackingNumber,
        isNew,
        deliveryRequestId
      };

    } catch (error: any) {
      console.error('❌ Error in onProviderAcceptsDelivery:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      throw error; // Re-throw so the caller can handle it
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

  /**
   * Generate missing tracking numbers for accepted delivery requests
   * This is a utility function to fix tracking numbers that weren't created
   * when deliveries were accepted (e.g., due to errors or timing issues)
   */
  async generateMissingTrackingNumbers(builderId?: string): Promise<{ created: number; errors: number }> {
    console.log('🔧 Generating missing tracking numbers...', builderId ? `for builder: ${builderId}` : 'for all builders');
    
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    // Get access token
    let accessToken = SUPABASE_ANON_KEY;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
        }
      }
    } catch (e) {
      // Use anon key
    }
    
    try {
      // Fetch all accepted delivery requests
      let drUrl = `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(accepted,assigned)&select=id,purchase_order_id,builder_id,provider_id,delivery_address,pickup_address,material_type,preferred_date,pickup_date,tracking_number&order=created_at.desc&limit=1000`;
      if (builderId) {
        drUrl += `&builder_id=eq.${builderId}`;
      }
      
      const drResponse = await fetch(drUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!drResponse.ok) {
        throw new Error(`Failed to fetch delivery requests: ${drResponse.status}`);
      }
      
      const deliveryRequests = await drResponse.json();
      console.log(`📦 Found ${deliveryRequests.length} accepted delivery requests`);
      
      // Fetch existing tracking numbers
      const tnResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/tracking_numbers?select=delivery_request_id&limit=1000`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      const existingTracking = tnResponse.ok ? await tnResponse.json() : [];
      const existingDrIds = new Set(existingTracking.map((tn: any) => tn.delivery_request_id));
      
      // Find delivery requests without tracking numbers
      const missingTracking = deliveryRequests.filter((dr: any) => !existingDrIds.has(dr.id));
      console.log(`⚠️ Found ${missingTracking.length} delivery requests without tracking numbers`);
      
      if (missingTracking.length === 0) {
        return { created: 0, errors: 0 };
      }
      
      // Generate tracking numbers for missing ones
      let created = 0;
      let errors = 0;
      
      for (const dr of missingTracking) {
        try {
          // Generate tracking number
          const trackingNumber = dr.tracking_number || this.generateTrackingNumber();
          
          // Resolve builder_id (might be profile.id, need user_id)
          let builderUserId = dr.builder_id;
          try {
            const profileResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?or=(id.eq.${dr.builder_id},user_id.eq.${dr.builder_id})&select=user_id,id&limit=1`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            if (profileResponse.ok) {
              const profiles = await profileResponse.json();
              if (profiles && profiles.length > 0 && profiles[0].user_id) {
                builderUserId = profiles[0].user_id;
              }
            }
          } catch (e) {
            // Use builder_id as-is
          }
          
          // Get supplier_id from purchase_order if exists
          let supplierId = null;
          if (dr.purchase_order_id) {
            try {
              const poResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${dr.purchase_order_id}&select=supplier_id&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );
              if (poResponse.ok) {
                const pos = await poResponse.json();
                if (pos && pos.length > 0) {
                  supplierId = pos[0].supplier_id;
                }
              }
            } catch (e) {
              // Ignore
            }
          }
          
          // Create tracking number entry
          const insertResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/tracking_numbers`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                tracking_number: trackingNumber,
                delivery_request_id: dr.id,
                purchase_order_id: dr.purchase_order_id || null,
                builder_id: builderUserId,
                delivery_provider_id: dr.provider_id || null,
                supplier_id: supplierId,
                status: 'accepted',
                delivery_address: dr.delivery_address || 'Address not specified',
                pickup_address: dr.pickup_address || null,
                materials_description: dr.material_type || 'Materials',
                estimated_delivery_date: dr.preferred_date || dr.pickup_date || null,
                accepted_at: dr.accepted_at || new Date().toISOString()
              })
            }
          );
          
          if (insertResponse.ok) {
            created++;
            console.log(`✅ Created tracking number ${trackingNumber} for delivery_request ${dr.id.slice(0, 8)}`);
          } else {
            errors++;
            const errorText = await insertResponse.text();
            console.error(`❌ Failed to create tracking number for ${dr.id.slice(0, 8)}:`, errorText);
          }
        } catch (error: any) {
          errors++;
          console.error(`❌ Error processing delivery_request ${dr.id?.slice(0, 8)}:`, error);
        }
      }
      
      console.log(`✅ Generated ${created} tracking numbers, ${errors} errors`);
      return { created, errors };
    } catch (error: any) {
      console.error('❌ Error generating missing tracking numbers:', error);
      throw error;
    }
  }
}

export const trackingNumberService = new TrackingNumberService();
export default trackingNumberService;





















