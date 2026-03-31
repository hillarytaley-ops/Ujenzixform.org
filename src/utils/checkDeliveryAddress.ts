import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
/**
 * Utility function to check delivery address in database
 * This helps verify if addresses are being saved correctly
 * 
 * Uses direct REST API calls instead of Supabase client to avoid timeout issues
 */

export interface DeliveryAddressCheck {
  delivery_request_id: string;
  delivery_address: string | null;
  delivery_coordinates: string | null;
  purchase_order_id: string | null;
  status: string;
  created_at: string;
  builder_id: string | null;
}

/**
 * Get authentication headers for Supabase REST API
 */
function getAuthHeaders(): { url: string; headers: Record<string, string> } {
  try {
    const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    let accessToken = '';
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed.access_token || '';
    }
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return { url: SUPABASE_URL, headers };
  } catch (e) {
    return {
      url: SUPABASE_URL,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    };
  }
}

/**
 * Check delivery address for a specific delivery request
 * Uses direct REST API call to avoid Supabase client timeout issues
 */
export async function checkDeliveryAddress(deliveryRequestId: string): Promise<DeliveryAddressCheck | null> {
  const startTime = Date.now();
  
  try {
    if (!deliveryRequestId || typeof deliveryRequestId !== 'string' || deliveryRequestId.trim() === '') {
      console.error('❌ Invalid deliveryRequestId:', deliveryRequestId);
      throw new Error(`Invalid delivery request ID: ${deliveryRequestId}`);
    }

    console.log('🔍 checkDeliveryAddress: Querying database via REST API for delivery_request_id:', deliveryRequestId);
    
    const { url, headers } = getAuthHeaders();
    const queryUrl = `${url}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=id,delivery_address,delivery_coordinates,purchase_order_id,status,created_at,builder_id&limit=1`;
    
    console.log('⏳ checkDeliveryAddress: Starting REST API query with 8-second timeout...');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      const queryTime = Date.now() - startTime;
      console.log(`⏱️ checkDeliveryAddress: REST API query completed in ${queryTime}ms, status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ REST API error checking delivery address:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          deliveryRequestId,
          queryTime: `${queryTime}ms`
        });
        
        if (response.status === 404 || response.status === 406) {
          throw new Error(`Delivery request with ID ${deliveryRequestId} not found in database.`);
        }
        
        throw new Error(`Database error: ${response.statusText} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ No data returned from database for delivery_request_id:', deliveryRequestId);
        throw new Error(`Delivery request with ID ${deliveryRequestId} not found in database.`);
      }
      
      const deliveryRequest = data[0];
      
      console.log('✅ checkDeliveryAddress: Successfully retrieved data:', {
        id: deliveryRequest.id,
        has_address: !!deliveryRequest.delivery_address,
        address_preview: deliveryRequest.delivery_address ? `${deliveryRequest.delivery_address.substring(0, 50)}...` : 'NULL',
        has_coordinates: !!deliveryRequest.delivery_coordinates,
        coordinates: deliveryRequest.delivery_coordinates || 'NULL',
        status: deliveryRequest.status,
        queryTime: `${queryTime}ms`
      });

      return {
        delivery_request_id: deliveryRequest.id,
        delivery_address: deliveryRequest.delivery_address,
        delivery_coordinates: deliveryRequest.delivery_coordinates,
        purchase_order_id: deliveryRequest.purchase_order_id,
        status: deliveryRequest.status,
        created_at: deliveryRequest.created_at,
        builder_id: deliveryRequest.builder_id
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const totalTime = Date.now() - startTime;
      
      if (fetchError.name === 'AbortError') {
        console.error('⏰ checkDeliveryAddress: Query timed out after 8 seconds', {
          deliveryRequestId,
          totalTime: `${totalTime}ms`
        });
        throw new Error(`Query timeout: The database query took longer than 8 seconds. Please try again or contact support if this persists.`);
      }
      
      // Re-throw if it's already an Error with a message
      if (fetchError instanceof Error) {
        throw fetchError;
      }
      
      throw new Error(`Network error: ${fetchError?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Exception in checkDeliveryAddress:', {
      error,
      message: error?.message,
      stack: error?.stack,
      deliveryRequestId,
      totalTime: `${totalTime}ms`,
      errorType: error?.name || typeof error,
      isTimeout: error?.message?.includes('timeout') || false
    });
    
    // Re-throw the error so the calling code can handle it properly
    throw error;
  }
}

/**
 * Check all delivery requests for a specific purchase order
 * Uses direct REST API call to avoid Supabase client timeout issues
 */
export async function checkDeliveryAddressesByPO(purchaseOrderId: string): Promise<DeliveryAddressCheck[]> {
  try {
    const { url, headers } = getAuthHeaders();
    const queryUrl = `${url}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrderId}&select=id,delivery_address,delivery_coordinates,purchase_order_id,status,created_at,builder_id&order=created_at.desc`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('❌ Error checking delivery addresses:', {
          status: response.status,
          statusText: response.statusText
        });
        return [];
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(dr => ({
        delivery_request_id: dr.id,
        delivery_address: dr.delivery_address,
        delivery_coordinates: dr.delivery_coordinates,
        purchase_order_id: dr.purchase_order_id,
        status: dr.status,
        created_at: dr.created_at,
        builder_id: dr.builder_id
      }));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Query timed out after 8 seconds');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ Exception checking delivery addresses:', error);
    return [];
  }
}
