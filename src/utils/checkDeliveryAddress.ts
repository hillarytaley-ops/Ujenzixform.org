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
    const { data, error } = await supabase
      .from('delivery_requests')
      .select('id, delivery_address, delivery_coordinates, purchase_order_id, status, created_at, builder_id')
      .eq('id', deliveryRequestId)
      .single();

    if (error) {
      console.error('❌ Error checking delivery address:', error);
      return null;
    }

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
    console.error('❌ Exception checking delivery address:', error);
    return null;
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
