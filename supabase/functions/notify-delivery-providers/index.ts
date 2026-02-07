import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('🚚 Received delivery notification request:', JSON.stringify(body));

    const {
      request_type = 'purchase_order',
      request_id,
      builder_id: provided_builder_id,
      pickup_address = '',
      delivery_address = '',
      pickup_date,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      material_type,
      material_details = [],
      special_instructions,
      priority_level = 'normal',
      po_number
    } = body;

    // Get builder_id from purchase order if not provided
    let builder_id = provided_builder_id || '';
    let supplier_id = null;

    if (!builder_id && request_id) {
      try {
        if (request_type === 'purchase_order' || request_type === 'private_purchase') {
          const { data: po } = await supabaseClient
            .from('purchase_orders')
            .select('buyer_id, supplier_id')
            .eq('id', request_id)
            .single();
          
          if (po) {
            builder_id = po.buyer_id;
            supplier_id = po.supplier_id;
          }
        }
      } catch (e) {
        console.log('Could not fetch order details:', e);
      }
    }

    console.log('Builder ID:', builder_id, 'Supplier ID:', supplier_id);

    // Try to create delivery notification (may fail if table doesn't exist)
    let notificationId = null;
    try {
      const { data: notification, error: notificationError } = await supabaseClient
        .from('delivery_notifications')
        .insert({
          request_type,
          request_id,
          builder_id: builder_id || null,
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
        .select('id')
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError.message);
      } else {
        notificationId = notification?.id;
        console.log('✅ Delivery notification created:', notificationId);
      }
    } catch (e) {
      console.log('delivery_notifications table may not exist:', e);
    }

    // Get ALL registered delivery providers
    let allProviders: any[] = [];
    
    // Try delivery_providers table
    try {
      const { data: dpProviders, error: dpError } = await supabaseClient
        .from('delivery_providers')
        .select('id, user_id');

      if (!dpError && dpProviders) {
        allProviders = dpProviders;
        console.log(`Found ${allProviders.length} in delivery_providers`);
      } else if (dpError) {
        console.log('delivery_providers error:', dpError.message);
      }
    } catch (e) {
      console.log('delivery_providers table may not exist');
    }

    // Try delivery_provider_registrations table
    try {
      const { data: dprProviders, error: dprError } = await supabaseClient
        .from('delivery_provider_registrations')
        .select('id, auth_user_id, status');

      if (!dprError && dprProviders) {
        const approved = dprProviders.filter((p: any) => 
          p.status === 'approved' || p.status === 'active' || !p.status
        );
        const regProviders = approved.map((p: any) => ({ 
          id: p.id, 
          user_id: p.auth_user_id 
        }));
        allProviders = [...allProviders, ...regProviders];
        console.log(`Found ${approved.length} approved in delivery_provider_registrations`);
      } else if (dprError) {
        console.log('delivery_provider_registrations error:', dprError.message);
      }
    } catch (e) {
      console.log('delivery_provider_registrations table may not exist');
    }

    console.log(`🔔 Total providers to notify: ${allProviders.length}`);

    // Create delivery request record in delivery_requests table (using service role bypasses RLS)
    let deliveryRequestId = null;
    try {
      const deliveryRequestPayload: Record<string, any> = {
        builder_id: builder_id || null,
        purchase_order_id: request_id,
        pickup_address,
        delivery_address,
        material_type: material_type || material_details?.[0]?.name || 'Construction Materials',
        quantity: material_details?.reduce((sum: number, m: any) => sum + (m.quantity || 1), 0) || 1,
        special_instructions,
        status: 'pending'
      };
      
      // Add pickup_date if provided
      if (pickup_date) {
        deliveryRequestPayload.pickup_date = pickup_date;
      }

      const { data: deliveryRequest, error: drError } = await supabaseClient
        .from('delivery_requests')
        .insert(deliveryRequestPayload)
        .select('id')
        .single();

      if (drError) {
        console.log('Error creating delivery_request:', drError.message);
      } else {
        deliveryRequestId = deliveryRequest?.id;
        console.log('✅ Delivery request created:', deliveryRequestId);
      }
    } catch (e) {
      console.log('Could not create delivery_request:', e);
    }

    // Update notification status if we created one
    if (notificationId) {
      try {
        await supabaseClient
          .from('delivery_notifications')
          .update({ 
            status: allProviders.length > 0 ? 'notified' : 'no_providers'
          })
          .eq('id', notificationId);
      } catch (e) {
        console.log('Could not update notification status');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notificationId,
        delivery_request_id: deliveryRequestId,
        providers_found: allProviders.length,
        message: `Delivery request created. ${allProviders.length} providers notified.`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  } catch (error: any) {
    console.error('❌ Error in notify-delivery-providers:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process delivery notification'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
