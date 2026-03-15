/**
 * Utility function to check delivery address in database
 * This helps verify if addresses are being saved correctly
 */

import { supabase } from '@/integrations/supabase/client';

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
 * Check delivery address for a specific delivery request
 */
export async function checkDeliveryAddress(deliveryRequestId: string): Promise<DeliveryAddressCheck | null> {
  const startTime = Date.now();
  
  try {
    if (!deliveryRequestId || typeof deliveryRequestId !== 'string' || deliveryRequestId.trim() === '') {
      console.error('❌ Invalid deliveryRequestId:', deliveryRequestId);
      throw new Error(`Invalid delivery request ID: ${deliveryRequestId}`);
    }

    console.log('🔍 checkDeliveryAddress: Querying database for delivery_request_id:', deliveryRequestId);
    
    // Create the query promise
    const queryPromise = supabase
      .from('delivery_requests')
      .select('id, delivery_address, delivery_coordinates, purchase_order_id, status, created_at, builder_id')
      .eq('id', deliveryRequestId)
      .single();
    
    // Create a timeout promise that rejects after 10 seconds
    const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout: Database query took longer than 10 seconds for delivery_request_id: ${deliveryRequestId}`));
      }, 10000);
    });
    
    console.log('⏳ checkDeliveryAddress: Starting query with 10-second timeout...');
    
    // Race between the query and timeout
    let queryResult: { data: any; error: any };
    try {
      queryResult = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);
    } catch (raceError: any) {
      // If timeout wins, it will reject
      if (raceError?.message?.includes('timeout')) {
        const totalTime = Date.now() - startTime;
        console.error('⏰ checkDeliveryAddress: Query timed out after 10 seconds', {
          deliveryRequestId,
          totalTime: `${totalTime}ms`
        });
        throw new Error(`Query timeout: The database query took longer than 10 seconds. Please try again or contact support if this persists.`);
      }
      // Re-throw other errors
      throw raceError;
    }
    
    const { data, error } = queryResult;
    
    const queryTime = Date.now() - startTime;
    console.log(`⏱️ checkDeliveryAddress: Query completed in ${queryTime}ms`);

    if (error) {
      console.error('❌ Supabase error checking delivery address:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        deliveryRequestId,
        queryTime: `${queryTime}ms`
      });
      
      // If it's a "not found" error, return null with a specific message
      if (error.code === 'PGRST116') {
        console.warn('⚠️ Delivery request not found in database:', deliveryRequestId);
        throw new Error(`Delivery request with ID ${deliveryRequestId} not found in database.`);
      }
      
      throw new Error(`Database error: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
    }

    if (!data) {
      console.warn('⚠️ No data returned from database for delivery_request_id:', deliveryRequestId);
      return null;
    }

    console.log('✅ checkDeliveryAddress: Successfully retrieved data:', {
      id: data.id,
      has_address: !!data.delivery_address,
      address_preview: data.delivery_address ? `${data.delivery_address.substring(0, 50)}...` : 'NULL',
      has_coordinates: !!data.delivery_coordinates,
      coordinates: data.delivery_coordinates || 'NULL',
      status: data.status,
      queryTime: `${queryTime}ms`
    });

    return {
      delivery_request_id: data.id,
      delivery_address: data.delivery_address,
      delivery_coordinates: data.delivery_coordinates,
      purchase_order_id: data.purchase_order_id,
      status: data.status,
      created_at: data.created_at,
      builder_id: data.builder_id
    };
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
 */
export async function checkDeliveryAddressesByPO(purchaseOrderId: string): Promise<DeliveryAddressCheck[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_requests')
      .select('id, delivery_address, delivery_coordinates, purchase_order_id, status, created_at, builder_id')
      .eq('purchase_order_id', purchaseOrderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error checking delivery addresses:', error);
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
  } catch (error: any) {
    console.error('❌ Exception checking delivery addresses:', error);
    return [];
  }
}
