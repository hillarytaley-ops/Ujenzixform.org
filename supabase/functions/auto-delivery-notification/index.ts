import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeliveryNotificationRequest {
  requestId: string;
  requestType: 'purchase_order' | 'material_order';
  builderId: string;
  supplierId?: string;
  pickupAddress: string;
  deliveryAddress: string;
  materialDetails: any[];
  priorityLevel?: 'low' | 'normal' | 'high';
  radiusKm?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, requestType, builderId, supplierId, pickupAddress, deliveryAddress, materialDetails, priorityLevel = 'normal', radiusKm = 25 }: DeliveryNotificationRequest = await req.json();

    console.log('Processing delivery notification request:', { requestId, requestType, builderId });

    // Create delivery notification
    const { data: notification, error: notificationError } = await supabaseClient
      .from('delivery_notifications')
      .insert({
        request_id: requestId,
        builder_id: builderId,
        supplier_id: supplierId,
        request_type: requestType,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        material_details: materialDetails,
        status: 'pending',
        priority_level: priorityLevel,
        notification_radius_km: radiusKm
      })
      .select()
      .single();

    if (notificationError) {
      throw notificationError;
    }

    console.log('Created delivery notification:', notification.id);

    // Get coordinates for pickup and delivery (simplified - in production use geocoding service)
    const defaultPickupLat = -1.2921; // Default to Nairobi coordinates
    const defaultPickupLng = 36.8219;
    const defaultDeliveryLat = -1.2921;
    const defaultDeliveryLng = 36.8219;

    // Find nearby delivery providers using the existing function
    const { data: nearbyProviders, error: providersError } = await supabaseClient
      .rpc('notify_nearby_delivery_providers', {
        _notification_id: notification.id,
        _pickup_lat: defaultPickupLat,
        _pickup_lng: defaultPickupLng,
        _delivery_lat: defaultDeliveryLat,
        _delivery_lng: defaultDeliveryLng,
        _radius_km: radiusKm
      });

    if (providersError) {
      console.error('Error finding nearby providers:', providersError);
    } else {
      console.log(`Found ${nearbyProviders?.length || 0} nearby providers`);
    }

    // Create communications for nearby providers
    if (nearbyProviders && nearbyProviders.length > 0) {
      const communications = nearbyProviders.map((provider: any) => ({
        delivery_request_id: requestId,
        sender_id: 'system',
        sender_type: 'system',
        sender_name: 'BuildConnect Delivery System',
        message_type: 'delivery_request_notification',
        content: `New delivery request available: ${materialDetails.map(m => m.type || 'Material').join(', ')} from ${pickupAddress} to ${deliveryAddress}. Distance: ${provider.distance_km}km`,
        metadata: {
          notification_id: notification.id,
          provider_id: provider.provider_id,
          distance_km: provider.distance_km,
          priority_level: priorityLevel,
          request_type: requestType,
          estimated_budget: materialDetails.find(m => m.total_amount)?.total_amount
        }
      }));

      const { error: commError } = await supabaseClient
        .from('delivery_communications')
        .insert(communications);

      if (commError) {
        console.error('Error creating communications:', commError);
      } else {
        console.log(`Created ${communications.length} provider notifications`);
      }
    }

    // Update notification status
    await supabaseClient
      .from('delivery_notifications')
      .update({ 
        status: nearbyProviders && nearbyProviders.length > 0 ? 'notified' : 'no_providers_found'
      })
      .eq('id', notification.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        providers_notified: nearbyProviders?.length || 0,
        message: 'Delivery providers notified successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in auto-delivery-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Failed to process delivery notification'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});