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
  try {
    if (!deliveryRequestId || typeof deliveryRequestId !== 'string' || deliveryRequestId.trim() === '') {
      console.error('❌ Invalid deliveryRequestId:', deliveryRequestId);
      throw new Error(`Invalid delivery request ID: ${deliveryRequestId}`);
    }

    console.log('🔍 checkDeliveryAddress: Querying database for delivery_request_id:', deliveryRequestId);
    
    const { data, error } = await supabase
      .from('delivery_requests')
      .select('id, delivery_address, delivery_coordinates, purchase_order_id, status, created_at, builder_id')
      .eq('id', deliveryRequestId)
      .single();

    if (error) {
      console.error('❌ Supabase error checking delivery address:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        deliveryRequestId
      });
      
      // If it's a "not found" error, return null with a specific message
      if (error.code === 'PGRST116') {
        console.warn('⚠️ Delivery request not found in database:', deliveryRequestId);
        throw new Error(`Delivery request with ID ${deliveryRequestId} not found in database.`);
      }
      
      throw new Error(`Database error: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      console.warn('⚠️ No data returned from database for delivery_request_id:', deliveryRequestId);
      return null;
    }

    console.log('✅ checkDeliveryAddress: Successfully retrieved data:', {
      id: data.id,
      has_address: !!data.delivery_address,
      has_coordinates: !!data.delivery_coordinates,
      status: data.status
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
    console.error('❌ Exception in checkDeliveryAddress:', {
      error,
      message: error?.message,
      stack: error?.stack,
      deliveryRequestId
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
