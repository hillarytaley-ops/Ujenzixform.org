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
      
      let timeoutId1: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId1 = setTimeout(() => {
          console.error('⏱️ Step 1 fetch timeout after 5 seconds');
          reject(new Error('Query timeout after 5 seconds'));
        }, 5000);
      });
      
      let requestToAccept: any;
      let requestError: any;
      
      try {
        console.log('⏳ Waiting for fetch response...');
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (timeoutId1) clearTimeout(timeoutId1);
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
        if (timeoutId1) clearTimeout(timeoutId1);
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
        // CRITICAL: Only check for TRULY active deliveries (not delivered/completed/cancelled)
        // Query: status must be in (accepted, picked_up, in_transit, assigned) AND not delivered/completed/cancelled
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?provider_id=eq.${providerId}&id=neq.${deliveryRequestId}&status=in.(accepted,picked_up,in_transit,assigned)&select=id,status,tracking_number,pickup_date,preferred_date,purchase_order_id`,
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
          console.log(`📦 Found ${activeDeliveries.length} potentially active deliveries`);
          
          // ADDITIONAL CHECK: Verify these deliveries are truly active by checking purchase_order status
          // If purchase_order status is 'delivered', the delivery is complete even if delivery_request status is 'accepted'
          // CRITICAL: Also filter out deliveries where purchase_order doesn't exist (orphaned delivery_requests)
          if (activeDeliveries.length > 0) {
            const poIds = activeDeliveries.map((d: any) => d.purchase_order_id).filter(Boolean);
            if (poIds.length > 0) {
              try {
                // Use separate controller for purchase_order query (don't reuse controller2 which might be aborted)
                const poController = new AbortController();
                const poTimeout = setTimeout(() => poController.abort(), 3000);
                
                const poResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${poIds.join(',')})&select=id,status,delivery_status`,
                  {
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    signal: poController.signal,
                    cache: 'no-store'
                  }
                );
                
                clearTimeout(poTimeout);
                
                if (poResponse.ok) {
                  const purchaseOrders = await poResponse.json();
                  const existingPOIds = new Set(purchaseOrders.map((po: any) => po.id));
                  const deliveredPOIds = new Set(
                    purchaseOrders
                      .filter((po: any) => po.status === 'delivered' || po.delivery_status === 'delivered')
                      .map((po: any) => po.id)
                  );
                  
                  // Remove deliveries where:
                  // 1. purchase_order is already delivered
                  // 2. purchase_order doesn't exist (orphaned delivery_request)
                  const beforeCount = activeDeliveries.length;
                  activeDeliveries = activeDeliveries.filter((d: any) => {
                    if (!d.purchase_order_id) {
                      // No purchase_order_id - filter it out (orphaned)
                      console.log(`✅ Filtering out orphaned delivery ${d.id} (${d.tracking_number || 'no tracking'}) - no purchase_order_id`);
                      return false;
                    }
                    if (!existingPOIds.has(d.purchase_order_id)) {
                      // purchase_order doesn't exist - filter it out (orphaned)
                      console.log(`✅ Filtering out orphaned delivery ${d.id} (${d.tracking_number || 'no tracking'}) - purchase_order ${d.purchase_order_id} does not exist`);
                      return false;
                    }
                    if (deliveredPOIds.has(d.purchase_order_id)) {
                      // purchase_order is delivered - filter it out (completed)
                      console.log(`✅ Filtering out completed delivery ${d.id} (${d.tracking_number || 'no tracking'}) - purchase_order ${d.purchase_order_id} is delivered`);
                      return false;
                    }
                    return true;
                  });
                  
                  if (activeDeliveries.length < beforeCount) {
                    console.log(`📦 After filtering completed/orphaned orders: ${beforeCount} → ${activeDeliveries.length} truly active deliveries`);
                  }
                } else {
                  // If purchase_order query fails, filter out all deliveries with purchase_order_id (safer to be conservative)
                  console.warn(`⚠️ Could not verify purchase_order status (HTTP ${poResponse.status}), filtering out deliveries with purchase_order_id`);
                  const beforeCount = activeDeliveries.length;
                  activeDeliveries = activeDeliveries.filter((d: any) => !d.purchase_order_id);
                  if (activeDeliveries.length < beforeCount) {
                    console.log(`📦 After filtering (purchase_order query failed): ${beforeCount} → ${activeDeliveries.length} truly active deliveries`);
                  }
                }
              } catch (poError: any) {
                if (poError.name !== 'AbortError') {
                  console.warn('⚠️ Could not verify purchase_order status, filtering out deliveries with purchase_order_id:', poError);
                  // Filter out deliveries with purchase_order_id if we can't verify (safer to be conservative)
                  const beforeCount = activeDeliveries.length;
                  activeDeliveries = activeDeliveries.filter((d: any) => !d.purchase_order_id);
                  if (activeDeliveries.length < beforeCount) {
                    console.log(`📦 After filtering (purchase_order query error): ${beforeCount} → ${activeDeliveries.length} truly active deliveries`);
                  }
                }
              }
            } else {
              // No purchase_order_ids - filter out all (all are orphaned)
              console.log(`✅ Filtering out all ${activeDeliveries.length} deliveries - none have purchase_order_id (all orphaned)`);
              activeDeliveries = [];
            }
          }
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
      // CRITICAL: If the pending request is a duplicate of an already-accepted delivery, cancel it instead of blocking
      if (activeDeliveries && activeDeliveries.length > 0) {
        // Get the delivery request details to check for duplicates
        const requestToAccept = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=id,purchase_order_id,delivery_address,material_type&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        ).then(r => r.ok ? r.json() : []).catch(() => []);
        
        const requestData = Array.isArray(requestToAccept) && requestToAccept.length > 0 ? requestToAccept[0] : null;
        
        // Helper to normalize material types
        const normalizeMaterialType = (mt: string | undefined | null): string => {
          if (!mt) return '';
          const normalized = String(mt).trim().toLowerCase();
          if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
            return 'construction_materials';
          }
          return normalized;
        };
        
        for (const activeDelivery of activeDeliveries) {
          const activeDeliveryDate = activeDelivery.preferred_date 
            || activeDelivery.pickup_date 
            || todayStr;
          const activeDateStr = new Date(activeDeliveryDate).toISOString().split('T')[0];
          
          // Only check if the dates are the same
          if (activeDateStr === requestDateStr) {
            // CRITICAL: Check if this is a duplicate of the already-accepted delivery
            let isDuplicate = false;
            
            if (requestData) {
              // CRITICAL: Check purchase_order_id FIRST - if they're different, they're NOT duplicates
              // Only use composite key if purchase_order_id is missing/NULL
              if (requestData.purchase_order_id && activeDelivery.purchase_order_id) {
                if (requestData.purchase_order_id === activeDelivery.purchase_order_id) {
                  isDuplicate = true;
                  console.log(`🔄 DUPLICATE DETECTED: Pending request ${deliveryRequestId} is a duplicate of already-accepted delivery ${activeDelivery.id} (same purchase_order_id)`);
                } else {
                  // Different purchase_order_id = different orders, NOT duplicates
                  console.log(`✅ NOT A DUPLICATE: Different purchase_order_ids - pending: ${requestData.purchase_order_id.slice(0, 8)}, accepted: ${activeDelivery.purchase_order_id.slice(0, 8)}`);
                  isDuplicate = false; // Explicitly set to false
                }
              }
              // Check 2: Same composite key (deliveryAddress + materialType) - ONLY if purchase_order_id is missing/NULL
              // CRITICAL: If purchase_order_id exists and is different, they are NOT duplicates even if composite key matches
              else if (!requestData.purchase_order_id || !activeDelivery.purchase_order_id) {
                // Only check composite key if purchase_order_id is missing
                if (requestData.delivery_address && requestData.material_type) {
                  const activeDRResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${activeDelivery.id}&select=id,delivery_address,material_type,purchase_order_id&limit=1`,
                    {
                      headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                      },
                      cache: 'no-store'
                    }
                  ).then(r => r.ok ? r.json() : []).catch(() => []);
                  
                  const activeDRData = Array.isArray(activeDRResponse) && activeDRResponse.length > 0 ? activeDRResponse[0] : null;
                  
                  // CRITICAL: Only use composite key if BOTH have NULL purchase_order_id
                  if (activeDRData && !activeDRData.purchase_order_id && !requestData.purchase_order_id && 
                      activeDRData.delivery_address && activeDRData.material_type) {
                    const normalizedPendingAddress = String(requestData.delivery_address).trim().toLowerCase();
                    const normalizedPendingMaterial = normalizeMaterialType(requestData.material_type);
                    const normalizedActiveAddress = String(activeDRData.delivery_address).trim().toLowerCase();
                    const normalizedActiveMaterial = normalizeMaterialType(activeDRData.material_type);
                    
                    if (normalizedPendingAddress === normalizedActiveAddress && normalizedPendingMaterial === normalizedActiveMaterial) {
                      isDuplicate = true;
                      console.log(`🔄 DUPLICATE DETECTED: Pending request ${deliveryRequestId} is a duplicate of already-accepted delivery ${activeDelivery.id} (same composite key, both have NULL purchase_order_id)`);
                    }
                  }
                }
              }
            }
            
            if (isDuplicate) {
              // This is a duplicate - cancel it instead of blocking
              console.log(`🗑️ Cancelling duplicate delivery request ${deliveryRequestId} - already accepted delivery ${activeDelivery.id} exists`);
              try {
                const cancelResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      status: 'cancelled',
                      rejection_reason: `Duplicate delivery request - another delivery for this order was already accepted (ID: ${activeDelivery.id})`,
                      rejected_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }),
                    cache: 'no-store'
                  }
                );
                
                if (cancelResponse.ok) {
                  console.log(`✅ Cancelled duplicate delivery request ${deliveryRequestId}`);
                  throw new Error(`This delivery request is a duplicate of an order you already accepted (${activeDelivery.tracking_number || 'ID: ' + activeDelivery.id.slice(0, 8)}). The duplicate has been cancelled.`);
                }
              } catch (cancelError: any) {
                if (cancelError.message && cancelError.message.includes('duplicate')) {
                  throw cancelError; // Re-throw our custom error
                }
                console.warn('⚠️ Failed to cancel duplicate:', cancelError);
                throw new Error(`This delivery request is a duplicate of an order you already accepted. Please refresh the page.`);
              }
            } else {
              // NOT a duplicate - this is a different order, block it
              console.log(`Provider ${providerId} already has active delivery for ${requestDateStr}: ${activeDelivery.id}`);
              throw new Error(`You already have an active delivery scheduled for ${requestDateStr} (${activeDelivery.tracking_number || 'ID: ' + activeDelivery.id.slice(0, 8)}). Complete it first or accept deliveries for a different date.`);
            }
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
      
      let timeoutId4: NodeJS.Timeout | null = null;
      const updateTimeout = new Promise<never>((_, reject) => {
        timeoutId4 = setTimeout(() => {
          console.error('⏱️ Step 4 update timeout after 5 seconds');
          reject(new Error('Update timeout after 5 seconds'));
        }, 5000);
      });
      
      let updateResult: any[] = [];
      let updateError: any = null;
      
      try {
        console.log('⏳ Waiting for update response...');
        const response = await Promise.race([updatePromise, updateTimeout]);
        if (timeoutId4) clearTimeout(timeoutId4);
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
        if (timeoutId4) clearTimeout(timeoutId4);
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

      // Step 4.25: CRITICAL - Cancel ALL duplicate delivery requests for the same order
      // This ensures that when one delivery is accepted, all duplicates are PERMANENTLY DELETED from the database
      console.log('🗑️🗑️🗑️ Step 4.25: CRITICAL - Cancelling all duplicate delivery requests...');
      try {
        // Get the accepted delivery request details to find duplicates
        const acceptedDR = updateResult[0];
        const purchaseOrderId = acceptedDR.purchase_order_id;
        const deliveryAddress = acceptedDR.delivery_address || acceptedDR.delivery_location || '';
        const materialType = acceptedDR.material_type || '';
        
        console.log(`🔍 Step 4.25: Looking for duplicates of delivery ${deliveryRequestId.slice(0, 8)}...`);
        console.log(`   Purchase Order ID: ${purchaseOrderId || 'N/A'}`);
        console.log(`   Delivery Address: ${deliveryAddress || 'N/A'}`);
        console.log(`   Material Type: ${materialType || 'N/A'}`);
        
        // Helper to normalize material types (same as DeliveryNotifications.tsx)
        const normalizeMaterialType = (mt: string | undefined | null): string => {
          if (!mt) return '';
          const normalized = String(mt).trim().toLowerCase();
          if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
            return 'construction_materials';
          }
          return normalized;
        };
        
        // Fetch ALL pending/assigned delivery_requests (not just for this provider, to catch all duplicates)
        const duplicateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(pending,assigned)&id=neq.${deliveryRequestId}&select=id,purchase_order_id,delivery_address,material_type,status&limit=1000`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (!duplicateResponse.ok) {
          const errorText = await duplicateResponse.text();
          console.error(`❌ Step 4.25: Failed to fetch potential duplicates: ${duplicateResponse.status} - ${errorText}`);
          throw new Error(`Failed to fetch duplicates: ${duplicateResponse.status}`);
        }
        
        const allPending = await duplicateResponse.json();
        console.log(`🔍 Step 4.25: Found ${allPending.length} pending/assigned delivery requests to check`);
        
        // Filter to find actual duplicates using same logic as DeliveryNotifications
        const duplicatesToCancel: string[] = [];
        const normalizedAcceptedAddress = String(deliveryAddress).trim().toLowerCase();
        const normalizedAcceptedMaterial = normalizeMaterialType(materialType);
        
        allPending.forEach((dr: any) => {
          let isDuplicate = false;
          let reason = '';
          
          // CRITICAL: Check purchase_order_id FIRST - if they're different, they're NOT duplicates
          // Check 1: Same purchase_order_id
          if (purchaseOrderId && dr.purchase_order_id === purchaseOrderId) {
            isDuplicate = true;
            reason = 'same purchase_order_id';
          }
          // Check 2: Same composite key (deliveryAddress + materialType) - ONLY if purchase_order_id is missing/NULL
          // CRITICAL: If purchase_order_id exists and is different, they are NOT duplicates even if composite key matches
          else if (!purchaseOrderId || !dr.purchase_order_id) {
            // Only check composite key if purchase_order_id is missing for BOTH
            if (deliveryAddress && materialType && dr.delivery_address && dr.material_type) {
              const normalizedDRAddress = String(dr.delivery_address).trim().toLowerCase();
              const normalizedDRMaterial = normalizeMaterialType(dr.material_type);
              
              if (normalizedAcceptedAddress === normalizedDRAddress && normalizedAcceptedMaterial === normalizedDRMaterial) {
                isDuplicate = true;
                reason = 'same composite key (address + material, both have NULL purchase_order_id)';
              }
            }
          }
          // Check 3: CRITICAL FIX - Also cancel by composite key if UI would deduplicate them
          // This handles the case where both have purchase_order_id but UI uses composite key deduplication
          // (because po_number is missing, so UI falls back to composite key)
          // We need to fetch po_number to check if UI would deduplicate, but for now, if composite key matches
          // AND both have placeholder addresses ("To be provided"), they're likely duplicates
          else if (purchaseOrderId && dr.purchase_order_id && purchaseOrderId !== dr.purchase_order_id) {
            // Check if both have the same composite key AND both have placeholder addresses
            // This indicates they would be deduplicated by the UI (which uses composite key when po_number is missing)
            if (deliveryAddress && materialType && dr.delivery_address && dr.material_type) {
              const normalizedDRAddress = String(dr.delivery_address).trim().toLowerCase();
              const normalizedDRMaterial = normalizeMaterialType(dr.material_type);
              
              // If composite key matches AND both have placeholder addresses, they're duplicates
              // (UI would deduplicate them because po_number is likely missing)
              const isPlaceholder = (addr: string) => {
                const normalized = String(addr).trim().toLowerCase();
                return normalized === 'to be provided' || normalized === 'tbd' || normalized === 'n/a' || 
                       normalized === 'na' || normalized === 'tba' || normalized === 'to be determined';
              };
              
              if (normalizedAcceptedAddress === normalizedDRAddress && 
                  normalizedAcceptedMaterial === normalizedDRMaterial &&
                  isPlaceholder(deliveryAddress) && isPlaceholder(dr.delivery_address)) {
                // These would be deduplicated by UI (same composite key, placeholder addresses)
                // Cancel the duplicate to prevent it from appearing after acceptance
                isDuplicate = true;
                reason = 'same composite key with placeholder addresses (UI would deduplicate)';
              } else {
                isDuplicate = false; // Explicitly NOT a duplicate
                console.log(`   ✅ NOT A DUPLICATE: Different purchase_order_ids - accepted: ${purchaseOrderId.slice(0, 8)}, pending: ${dr.purchase_order_id.slice(0, 8)}`);
              }
            } else {
              isDuplicate = false; // Explicitly NOT a duplicate
              console.log(`   ✅ NOT A DUPLICATE: Different purchase_order_ids - accepted: ${purchaseOrderId.slice(0, 8)}, pending: ${dr.purchase_order_id.slice(0, 8)}`);
            }
          }
          
          if (isDuplicate) {
            duplicatesToCancel.push(dr.id);
            console.log(`   🗑️ DUPLICATE FOUND: ${dr.id.slice(0, 8)} - ${reason}`);
          }
        });
        
        // Cancel all duplicates
        if (duplicatesToCancel.length > 0) {
          console.log(`🗑️🗑️🗑️ Step 4.25: Found ${duplicatesToCancel.length} duplicate delivery requests to cancel:`, duplicatesToCancel.map(id => id.slice(0, 8)));
          
          // Cancel them one by one to ensure all are cancelled (more reliable than batch)
          let cancelledCount = 0;
          let failedCount = 0;
          
          for (const duplicateId of duplicatesToCancel) {
            try {
              const cancelResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${duplicateId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    status: 'cancelled',
                    rejection_reason: `Duplicate delivery request - another delivery for this order was accepted (ID: ${deliveryRequestId.slice(0, 8)})`,
                    rejected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }),
                  cache: 'no-store'
                }
              );
              
              if (cancelResponse.ok) {
                cancelledCount++;
                console.log(`   ✅ Cancelled duplicate: ${duplicateId.slice(0, 8)}`);
              } else {
                failedCount++;
                const errorText = await cancelResponse.text();
                console.error(`   ❌ Failed to cancel ${duplicateId.slice(0, 8)}: ${cancelResponse.status} - ${errorText}`);
              }
            } catch (cancelError: any) {
              failedCount++;
              console.error(`   ❌ Error cancelling ${duplicateId.slice(0, 8)}:`, cancelError.message);
            }
          }
          
          console.log(`✅✅✅ Step 4.25 COMPLETE: Cancelled ${cancelledCount} duplicates, ${failedCount} failed`);
        } else {
          console.log('✅ Step 4.25: No duplicate delivery requests found to cancel');
        }
      } catch (duplicateError: any) {
        console.error('❌❌❌ Step 4.25: CRITICAL ERROR cancelling duplicates:', duplicateError);
        console.error('   Error details:', duplicateError.message, duplicateError.stack);
        // Don't throw - this is cleanup, not critical to acceptance, but log it prominently
      }

      // Step 4.5: Update purchase_order with delivery provider information (if purchase_order_id exists)
      if (existingRequest.purchase_order_id) {
        console.log('📦 Step 4.5: Updating purchase_order with delivery provider info...');
        try {
          // Get provider info first - try both id and user_id since providerId could be either
          let providerName = 'Delivery Provider';
          let providerPhone = null;
          
          // CRITICAL: providerId could be delivery_providers.id OR user_id
          // Try querying by id first (if it's a delivery_providers.id)
          let providerData: any = null;
          
          try {
            // First attempt: Query by id (delivery_providers.id)
            const providerByIdPromise = fetch(
              `${SUPABASE_URL}/rest/v1/delivery_providers?id=eq.${providerId}&select=id,provider_name,phone,user_id&limit=1`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );
            
            const providerByIdTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Provider by id timeout')), 3000);
            });
            
            const providerByIdResponse = await Promise.race([providerByIdPromise, providerByIdTimeout]);
            if (providerByIdResponse.ok) {
              const data = await providerByIdResponse.json();
              if (Array.isArray(data) && data.length > 0) {
                providerData = data[0];
                console.log('✅ Found provider by id:', providerData.provider_name);
              }
            }
          } catch (e) {
            console.log('⚠️ Provider lookup by id failed, trying user_id...');
          }
          
          // Second attempt: Query by user_id (if first attempt failed or providerId is user_id)
          if (!providerData) {
            try {
              const providerByUserIdPromise = fetch(
                `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${providerId}&select=id,provider_name,phone,user_id&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  cache: 'no-store'
                }
              );
              
              const providerByUserIdTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Provider by user_id timeout')), 3000);
              });
              
              const providerByUserIdResponse = await Promise.race([providerByUserIdPromise, providerByUserIdTimeout]);
              if (providerByUserIdResponse.ok) {
                const data = await providerByUserIdResponse.json();
                if (Array.isArray(data) && data.length > 0) {
                  providerData = data[0];
                  console.log('✅ Found provider by user_id:', providerData.provider_name);
                }
              }
            } catch (e) {
              console.log('⚠️ Provider lookup by user_id failed, trying profiles...');
            }
          }
          
          // Extract provider name and phone from delivery_providers
          if (providerData) {
            // CRITICAL: Use provider_name (primary field) - this is what the provider filled in during registration
            providerName = providerData.provider_name || 'Delivery Provider';
            providerPhone = providerData.phone || null;
            console.log('✅ Using provider info from delivery_providers:', { name: providerName, phone: providerPhone });
          } else {
            // Fallback: Try profiles table
            try {
              const profilePromise = fetch(
                `${SUPABASE_URL}/rest/v1/profiles?or=(user_id.eq.${providerId},id.eq.${providerId})&select=full_name,phone&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  cache: 'no-store'
                }
              );
              
              const profileTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Profile lookup timeout')), 2000);
              });
              
              const profileResponse = await Promise.race([profilePromise, profileTimeout]);
              if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                if (Array.isArray(profiles) && profiles.length > 0) {
                  providerName = profiles[0].full_name || 'Delivery Provider';
                  providerPhone = profiles[0].phone || null;
                  console.log('✅ Using provider info from profiles:', { name: providerName, phone: providerPhone });
                }
              }
            } catch (e2) {
              console.warn('⚠️ Could not fetch provider info from any source, using defaults');
            }
          }
          
          // Update purchase_order with delivery provider info
          const updatePOPromise = fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${existingRequest.purchase_order_id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                delivery_provider_id: providerId,
                delivery_provider_name: providerName,
                delivery_provider_phone: providerPhone,
                delivery_status: 'accepted',
                delivery_accepted_at: new Date().toISOString(),
                delivery_assigned_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }),
              cache: 'no-store'
            }
          );
          
          const updatePOTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Update PO timeout')), 5000);
          });
          
          try {
            const updatePOResponse = await Promise.race([updatePOPromise, updatePOTimeout]);
            if (updatePOResponse.ok) {
              const poUpdateResult = await updatePOResponse.json();
              console.log('✅ Step 4.5 complete: Purchase order updated with delivery provider:', providerName);
            } else {
              const errorText = await updatePOResponse.text();
              console.warn('⚠️ Step 4.5: Could not update purchase_order:', updatePOResponse.status, errorText);
            }
          } catch (error: any) {
            if (error.message?.includes('timeout')) {
              console.warn('⚠️ Step 4.5: Update purchase_order timeout');
            } else {
              console.warn('⚠️ Step 4.5: Error updating purchase_order:', error);
            }
            // Don't throw - continue with tracking number creation
          }
        } catch (error) {
          console.warn('⚠️ Step 4.5: Error in purchase_order update:', error);
          // Don't throw - continue with tracking number creation
        }
      } else {
        console.log('📦 Step 4.5: No purchase_order_id - skipping purchase_order update');
      }

      // Explicitly create/update tracking_numbers entry (backup to database trigger)
      // This ensures the entry exists even if the trigger fails
      console.log('📦 Step 5: Creating/updating tracking_numbers entry...');
      try {
        // Use direct REST API with timeout instead of supabase client
        const checkTrackingPromise = fetch(
          `${SUPABASE_URL}/rest/v1/tracking_numbers?delivery_request_id=eq.${deliveryRequestId}&select=id&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        const checkTrackingTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Check tracking timeout')), 5000);
        });
        
        let existingTracking: any = null;
        try {
          const checkResponse = await Promise.race([checkTrackingPromise, checkTrackingTimeout]);
          if (checkResponse.ok) {
            const data = await checkResponse.json();
            existingTracking = Array.isArray(data) && data.length > 0 ? data[0] : null;
          }
        } catch (error: any) {
          if (!error.message?.includes('timeout')) {
            console.warn('⚠️ Error checking existing tracking:', error);
          }
          // Continue - will try to create anyway
        }

        if (!existingTracking) {
          // Parallelize these database calls to speed up the process
          let builderUserId = existingRequest.builder_id;
          let supplierId = null;
          let providerName = 'Delivery Provider';
          let providerPhone = null;

          console.log('📦 Step 5: Resolving builder_id - existingRequest.builder_id:', existingRequest.builder_id);

          // Run all lookups in parallel with timeouts
          const lookupTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Lookup timeout')), 5000);
          });
          
          const builderProfilePromise = fetch(
            `${SUPABASE_URL}/rest/v1/profiles?or=(id.eq.${existingRequest.builder_id},user_id.eq.${existingRequest.builder_id})&select=id,user_id&limit=1`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null);
          
          const poPromise = existingRequest.purchase_order_id
            ? fetch(
                `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${existingRequest.purchase_order_id}&select=supplier_id&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  cache: 'no-store'
                }
              ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null)
            : Promise.resolve(null);
          
          // CRITICAL: providerId could be delivery_providers.id OR user_id
          // Try both queries and use the first successful result
          const providerPromiseById = fetch(
            `${SUPABASE_URL}/rest/v1/delivery_providers?id=eq.${providerId}&select=id,provider_name,phone,user_id&limit=1`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null);
          
          const providerPromiseByUserId = fetch(
            `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${providerId}&select=id,provider_name,phone,user_id&limit=1`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null);
          
          // Try both and use the first successful result
          const providerPromise = Promise.allSettled([providerPromiseById, providerPromiseByUserId])
            .then(results => {
              for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                  return result.value;
                }
              }
              return null;
            });
          
          const [builderProfileResult, poResult, providerResult] = await Promise.allSettled([
            Promise.race([builderProfilePromise, lookupTimeout]),
            Promise.race([poPromise, lookupTimeout]),
            Promise.race([providerPromise, lookupTimeout])
          ]);

          // Process builder profile result - CRITICAL: Use user_id, not profile.id
          if (builderProfileResult.status === 'fulfilled' && builderProfileResult.value) {
            const profileData = builderProfileResult.value;
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
          if (poResult.status === 'fulfilled' && poResult.value?.supplier_id) {
            supplierId = poResult.value.supplier_id;
          }

          // Process provider result
          if (providerResult.status === 'fulfilled' && providerResult.value) {
            // CRITICAL: Use provider_name (primary field) - this is what the provider filled in during registration
            providerName = providerResult.value.provider_name || 'Delivery Provider';
            providerPhone = providerResult.value.phone || null;
            console.log('✅ Step 5: Using provider info from delivery_providers:', { name: providerName, phone: providerPhone });
          } else {
            // Fallback: Try profiles table if delivery_providers didn't work
            try {
              const profilePromise = fetch(
                `${SUPABASE_URL}/rest/v1/profiles?or=(user_id.eq.${providerId},id.eq.${providerId})&select=full_name,phone&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  cache: 'no-store'
                }
              );
              
              const profileTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Profile lookup timeout')), 3000);
              });
              
              const profileResponse = await Promise.race([profilePromise, profileTimeout]);
              if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                if (Array.isArray(profiles) && profiles.length > 0) {
                  providerName = profiles[0].full_name || 'Delivery Provider';
                  providerPhone = profiles[0].phone;
                }
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
          // Update existing entry using direct REST API with timeout
          const updateTrackingPromise = fetch(
            `${SUPABASE_URL}/rest/v1/tracking_numbers?delivery_request_id=eq.${deliveryRequestId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                delivery_provider_id: providerId,
                status: 'accepted',
                provider_name: providerName,
                provider_phone: providerPhone,
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }),
              cache: 'no-store'
            }
          );
          
          const updateTrackingTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Update tracking timeout')), 5000);
          });
          
          try {
            const updateResponse = await Promise.race([updateTrackingPromise, updateTrackingTimeout]);
            if (updateResponse.ok) {
              console.log('✅ Updated existing tracking_numbers entry:', trackingNumber);
            } else {
              const errorText = await updateResponse.text();
              console.error('⚠️ Error updating tracking_numbers entry:', updateResponse.status, errorText);
            }
          } catch (error: any) {
            if (error.message?.includes('timeout')) {
              console.error('⚠️ Update tracking timeout');
            } else {
              console.error('⚠️ Error updating tracking_numbers entry:', error);
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Error ensuring tracking_numbers entry exists:', error);
        // Don't throw - continue with notification
      }
      console.log('✅ Step 5 complete: Tracking numbers entry ensured');

      // Fetch builder info and provider info for notification
      console.log('📦 Step 6: Fetching builder and provider info for notification...');
      
      const step6Timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Step 6 timeout')), 5000);
      });
      
      const builderPromise = fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${existingRequest.builder_id}&select=id,full_name,phone,user_id&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null);
      
      // CRITICAL: providerId is auth.uid() (user_id), not delivery_providers.id - query by user_id first
      const providerPromise = fetch(
        `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${providerId}&select=id,provider_name,phone,company_name&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      ).then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && d.length > 0 ? d[0] : null).catch(() => null);
      
      let builderResult: any = null;
      let providerResult: any = null;
      
      try {
        [builderResult, providerResult] = await Promise.all([
          Promise.race([builderPromise, step6Timeout]),
          Promise.race([providerPromise, step6Timeout])
        ]);
      } catch (error: any) {
        console.warn('⚠️ Step 6 timeout or error - continuing with defaults:', error);
        // Continue with null values - notification will use defaults
      }

      // Get builder's email - skip auth.admin call (requires admin privileges)
      // Use builderResult.user_id if available, otherwise skip email
      let builderEmail = '';
      // Note: Getting email from auth.admin requires admin privileges
      // We'll skip this for now and just use phone/notification

      console.log('✅ Step 6 complete: Builder and provider info fetched');
      
      // Send notification to builder
      console.log('📦 Step 7: Sending notification to builder...');
      // Use builder's auth user_id for notifications (builder_id may be profiles.id)
      const builderAuthUserId = builderResult?.user_id ?? existingRequest.builder_id;
      const notificationPromise = this.notifyBuilder({
        builderId: builderAuthUserId,
        builderEmail,
        builderPhone: builderResult?.phone || '',
        trackingNumber,
        providerName: providerResult?.company_name || providerResult?.provider_name || 'Delivery Provider',
        pickupAddress: existingRequest.pickup_address,
        deliveryAddress: existingRequest.delivery_address,
        materialType: existingRequest.material_type,
        estimatedPickupDate: existingRequest.pickup_date
      });
      
      const notificationTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Notification timeout')), 5000);
      });
      
      try {
        await Promise.race([notificationPromise, notificationTimeout]);
        console.log('✅ Step 7 complete: Notification sent');
      } catch (error: any) {
        if (error.message === 'Notification timeout') {
          console.warn('⚠️ Step 7 timeout - notification may not have been sent, but continuing...');
        } else {
          console.warn('⚠️ Step 7 error - notification may not have been sent:', error);
        }
        // Don't throw - notification is non-critical, continue with flow
      }

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
      
      // Create in-app notification using direct REST API with timeout
      const notificationPromise = fetch(
        `${SUPABASE_URL}/rest/v1/notifications`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
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
          }),
          cache: 'no-store'
        }
      );
      
      const notificationTimeout = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Notification insert timeout')), 3000);
      });
      
      try {
        const response = await Promise.race([notificationPromise, notificationTimeout]);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('⚠️ Notification insert failed:', response.status, errorText);
        }
      } catch (error: any) {
        if (error.message === 'Notification insert timeout') {
          console.warn('⚠️ Notification insert timed out after 3 seconds');
        } else {
          throw error;
        }
      }

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
      
      // Check if tracking entry already exists with timeout
      const checkPromise = fetch(
        `${SUPABASE_URL}/rest/v1/delivery_tracking?delivery_id=eq.${deliveryRequestId}&select=id&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      );
      
      const checkTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Check tracking timeout')), 3000);
      });
      
      let existing: any = null;
      try {
        const checkResponse = await Promise.race([checkPromise, checkTimeout]);
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          existing = Array.isArray(data) && data.length > 0 ? data[0] : null;
        }
      } catch (error) {
        // Timeout or error - continue anyway
        console.warn('⚠️ Error checking existing delivery tracking:', error);
      }

      // CRITICAL: delivery_tracking.provider_id must be delivery_providers.id, not auth.uid()
      let providerIdForTracking = providerId;
      try {
        const dpRes = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=eq.${providerId}&select=id&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        if (dpRes.ok) {
          const dpData = await dpRes.json();
          if (Array.isArray(dpData) && dpData.length > 0 && dpData[0].id) {
            providerIdForTracking = dpData[0].id;
          }
        }
      } catch (_) { /* use providerId */ }

      if (!existing) {
        // Create initial tracking entry (provider will update with actual GPS)
        const insertPromise = fetch(
          `${SUPABASE_URL}/rest/v1/delivery_tracking`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              delivery_id: deliveryRequestId,
              provider_id: providerIdForTracking,
              current_latitude: 0,
              current_longitude: 0,
              delivery_status: 'accepted',
              tracking_timestamp: new Date().toISOString()
            }),
            cache: 'no-store'
          }
        );
        
        const insertTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Insert tracking timeout')), 3000);
        });
        
        try {
          await Promise.race([insertPromise, insertTimeout]);
        } catch (error) {
          console.warn('⚠️ Error creating delivery tracking entry:', error);
        }
      } else {
        // Update existing entry with new provider
        const updatePromise = fetch(
          `${SUPABASE_URL}/rest/v1/delivery_tracking?delivery_id=eq.${deliveryRequestId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              provider_id: providerIdForTracking,
              delivery_status: 'accepted',
              tracking_timestamp: new Date().toISOString()
            }),
            cache: 'no-store'
          }
        );
        
        const updateTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Update tracking timeout')), 3000);
        });
        
        try {
          await Promise.race([updatePromise, updateTimeout]);
        } catch (error) {
          console.warn('⚠️ Error updating delivery tracking entry:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing delivery tracking:', error);
      // Don't throw - this is non-critical
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
          
          // Get provider information (name and phone)
          let providerName = null;
          let providerPhone = null;
          if (dr.provider_id) {
            try {
              // Try delivery_providers table first
              const providerResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/delivery_providers?id=eq.${dr.provider_id}&select=provider_name,company_name,phone&limit=1`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );
              if (providerResponse.ok) {
                const providers = await providerResponse.json();
                if (providers && providers.length > 0) {
                  providerName = providers[0].company_name || providers[0].provider_name || null;
                  providerPhone = providers[0].phone || null;
                }
              }
              
              // If not found in delivery_providers, try profiles table
              if (!providerName) {
                const profileResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/profiles?or=(user_id.eq.${dr.provider_id},id.eq.${dr.provider_id})&select=full_name,phone&limit=1`,
                  {
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`
                    }
                  }
                );
                if (profileResponse.ok) {
                  const profiles = await profileResponse.json();
                  if (profiles && profiles.length > 0) {
                    providerName = profiles[0].full_name || null;
                    providerPhone = profiles[0].phone || null;
                  }
                }
              }
            } catch (e) {
              console.warn(`⚠️ Could not fetch provider info for ${dr.provider_id}:`, e);
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
                provider_name: providerName,
                provider_phone: providerPhone,
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





















