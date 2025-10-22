import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryNotificationRequest {
  request_type: 'purchase_order' | 'private_purchase';
  request_id: string;
  pickup_address: string;
  delivery_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  material_details: any[];
  special_instructions?: string;
  priority_level?: 'low' | 'normal' | 'high' | 'urgent';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      request_type,
      request_id,
      pickup_address,
      delivery_address,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      material_details,
      special_instructions,
      priority_level = 'normal'
    }: DeliveryNotificationRequest = await req.json();

    console.log('Creating delivery notification for:', request_type, request_id);

    // Get request details based on type
    let builder_id: string;
    let supplier_id: string | null = null;

    if (request_type === 'purchase_order') {
      const { data: po, error: poError } = await supabaseClient
        .from('purchase_orders')
        .select('buyer_id, supplier_id')
        .eq('id', request_id)
        .single();

      if (poError) throw poError;
      builder_id = po.buyer_id;
      supplier_id = po.supplier_id;
    } else {
      const { data: receipt, error: receiptError } = await supabaseClient
        .from('purchase_receipts')
        .select('buyer_id, supplier_id')
        .eq('id', request_id)
        .single();

      if (receiptError) throw receiptError;
      builder_id = receipt.buyer_id;
      supplier_id = receipt.supplier_id;
    }

    // Create delivery notification
    const { data: notification, error: notificationError } = await supabaseClient
      .from('delivery_notifications')
      .insert({
        request_type,
        request_id,
        builder_id,
        supplier_id,
        pickup_address,
        delivery_address,
        pickup_latitude,
        pickup_longitude,
        delivery_latitude,
        delivery_longitude,
        material_details,
        special_instructions,
        priority_level,
        status: 'pending'
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    console.log('Delivery notification created:', notification.id);

    // Find nearby delivery providers
    const { data: nearbyProviders, error: providersError } = await supabaseClient
      .rpc('notify_nearby_delivery_providers', {
        _notification_id: notification.id,
        _pickup_lat: pickup_latitude || 0,
        _pickup_lng: pickup_longitude || 0,
        _delivery_lat: delivery_latitude || 0,
        _delivery_lng: delivery_longitude || 0,
        _radius_km: 25
      });

    if (providersError) {
      console.error('Error finding nearby providers:', providersError);
    } else {
      console.log(`Found ${nearbyProviders?.length || 0} nearby delivery providers`);
    }

    // Create notifications for nearby providers
    if (nearbyProviders && nearbyProviders.length > 0) {
      const providerNotifications = nearbyProviders.map((provider: any) => ({
        sender_id: builder_id,
        sender_type: 'builder',
        sender_name: 'Builder',
        message_type: 'delivery_request',
        content: `New delivery request available. Distance: ${provider.distance_km.toFixed(1)}km. Priority: ${priority_level}. ${special_instructions ? `Instructions: ${special_instructions}` : ''}`,
        metadata: {
          notification_id: notification.id,
          distance_km: provider.distance_km,
          priority_level,
          pickup_address,
          delivery_address,
          material_details
        }
      }));

      const { error: commError } = await supabaseClient
        .from('delivery_communications')
        .insert(providerNotifications);

      if (commError) {
        console.error('Error creating provider notifications:', commError);
      } else {
        console.log(`Notified ${nearbyProviders.length} delivery providers`);
      }

      // Update notification status
      await supabaseClient
        .from('delivery_notifications')
        .update({ status: 'notified' })
        .eq('id', notification.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        providers_notified: nearbyProviders?.length || 0,
        message: 'Delivery providers notified successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in notify-delivery-providers function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to notify delivery providers'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);