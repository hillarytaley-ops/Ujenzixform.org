import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryNotificationRequest {
  request_type: 'purchase_order' | 'private_purchase' | 'quote_accepted' | 'manual_delivery_request';
  request_id: string;
  builder_id?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  material_details: any[];
  special_instructions?: string;
  priority_level?: 'low' | 'normal' | 'high' | 'urgent';
  po_number?: string;
  estimated_weight_kg?: number;
  weight_kg?: number; // For manual requests
  budget_range?: string;
  required_vehicle_type?: string;
  preferred_date?: string;
  preferred_time?: string;
}

// Vehicle capacity mapping (in kg)
const VEHICLE_CAPACITY: Record<string, number> = {
  'motorcycle': 50,
  'tuk_tuk': 300,
  'pickup': 1000,
  'small_truck': 3000,
  'medium_truck': 7000,
  'large_truck': 15000,
  'trailer': 30000
};

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
      builder_id: provided_builder_id,
      pickup_address,
      delivery_address,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      material_details,
      special_instructions,
      priority_level = 'normal',
      po_number,
      estimated_weight_kg,
      weight_kg,
      budget_range,
      required_vehicle_type: manual_vehicle_type,
      preferred_date,
      preferred_time
    }: DeliveryNotificationRequest = await req.json();

    console.log('🚚 Creating delivery notification for:', request_type, request_id);

    // Calculate total weight from materials if not provided
    let totalWeightKg = estimated_weight_kg || weight_kg || 0;
    if (!totalWeightKg && material_details && material_details.length > 0) {
      // Estimate weight based on material type and quantity
      const MATERIAL_WEIGHTS: Record<string, number> = {
        'cement': 50, // 50kg per bag
        'steel': 10, // 10kg per bar average
        'timber': 20, // 20kg per piece average
        'blocks': 15, // 15kg per block
        'sand': 1500, // 1500kg per cubic meter
        'aggregates': 1400, // 1400kg per cubic meter
        'tiles': 25, // 25kg per box
        'default': 50 // default 50kg per item
      };
      
      totalWeightKg = material_details.reduce((sum: number, item: any) => {
        const materialType = (item.material_type || item.name || '').toLowerCase();
        let weightPerUnit = MATERIAL_WEIGHTS['default'];
        
        for (const [key, weight] of Object.entries(MATERIAL_WEIGHTS)) {
          if (materialType.includes(key)) {
            weightPerUnit = weight;
            break;
          }
        }
        
        return sum + (item.quantity || 1) * weightPerUnit;
      }, 0);
    }

    console.log('Estimated total weight:', totalWeightKg, 'kg');

    // Determine minimum vehicle type needed based on weight
    let requiredVehicleType = 'motorcycle';
    for (const [vehicleType, capacity] of Object.entries(VEHICLE_CAPACITY)) {
      if (totalWeightKg <= capacity) {
        requiredVehicleType = vehicleType;
        break;
      }
    }
    console.log('Minimum required vehicle type:', requiredVehicleType);

    // Get request details based on type
    let builder_id: string = provided_builder_id || '';
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
    } else if (request_type === 'private_purchase') {
      const { data: receipt, error: receiptError } = await supabaseClient
        .from('purchase_receipts')
        .select('buyer_id, supplier_id')
        .eq('id', request_id)
        .single();

      if (receiptError) throw receiptError;
      builder_id = receipt.buyer_id;
      supplier_id = receipt.supplier_id;
    } else if (request_type === 'manual_delivery_request') {
      // For manual delivery requests, get builder info from delivery_requests table
      const { data: deliveryReq, error: deliveryReqError } = await supabaseClient
        .from('delivery_requests')
        .select('builder_id')
        .eq('id', request_id)
        .single();

      if (deliveryReqError) {
        console.log('Could not fetch delivery request details:', deliveryReqError.message);
      } else if (deliveryReq) {
        builder_id = deliveryReq.builder_id || provided_builder_id || '';
      }
      console.log('📦 Manual delivery request from builder:', builder_id);
    }
    // For 'quote_accepted', builder_id is already provided

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

    // Filter and notify providers based on vehicle capacity
    if (nearbyProviders && nearbyProviders.length > 0) {
      // Get provider vehicle types to filter by capacity
      const providerIds = nearbyProviders.map((p: any) => p.provider_id);
      
      const { data: providerDetails } = await supabaseClient
        .from('delivery_providers')
        .select('id, vehicle_type, full_name, company_name')
        .in('id', providerIds);

      // Filter providers whose vehicle can handle the load
      const capableProviders = nearbyProviders.filter((provider: any) => {
        const details = providerDetails?.find((d: any) => d.id === provider.provider_id);
        if (!details) return false;
        
        const vehicleType = (details.vehicle_type || 'pickup').toLowerCase().replace(/\s+/g, '_');
        const vehicleCapacity = VEHICLE_CAPACITY[vehicleType] || VEHICLE_CAPACITY['pickup'];
        
        // Only notify if vehicle can handle at least 80% of the load (some buffer)
        const canHandle = vehicleCapacity >= totalWeightKg * 0.8;
        
        if (!canHandle) {
          console.log(`Provider ${details.full_name || details.company_name} (${vehicleType}) capacity ${vehicleCapacity}kg < required ${totalWeightKg}kg - SKIPPED`);
        }
        
        return canHandle;
      });

      console.log(`${capableProviders.length} of ${nearbyProviders.length} providers have adequate vehicle capacity`);

      if (capableProviders.length > 0) {
        const providerNotifications = capableProviders.map((provider: any) => {
          const details = providerDetails?.find((d: any) => d.id === provider.provider_id);
          
          // Build notification message based on request type
          let notificationContent = `🚚 New delivery request! Distance: ${provider.distance_km.toFixed(1)}km | Weight: ${totalWeightKg}kg | Priority: ${priority_level}`;
          
          if (request_type === 'manual_delivery_request') {
            // Add more details for manual requests
            if (budget_range) notificationContent += ` | Budget: ${budget_range}`;
            if (preferred_date) notificationContent += ` | Date: ${preferred_date}`;
            if (preferred_time) notificationContent += ` @ ${preferred_time}`;
          } else if (po_number) {
            notificationContent += ` | PO: ${po_number}`;
          }
          
          if (special_instructions) {
            notificationContent += `. Instructions: ${special_instructions}`;
          }
          
          return {
            sender_id: builder_id,
            sender_type: 'builder',
            sender_name: 'Builder',
            message_type: 'delivery_request',
            content: notificationContent,
            metadata: {
              notification_id: notification.id,
              request_type,
              distance_km: provider.distance_km,
              priority_level,
              pickup_address,
              delivery_address,
              material_details,
              total_weight_kg: totalWeightKg,
              required_vehicle_type: manual_vehicle_type || requiredVehicleType,
              po_number,
              budget_range,
              preferred_date,
              preferred_time
            }
          };
        });

        const { error: commError } = await supabaseClient
          .from('delivery_communications')
          .insert(providerNotifications);

        if (commError) {
          console.error('Error creating provider notifications:', commError);
        } else {
          console.log(`Notified ${capableProviders.length} capable delivery providers`);
        }
      } else {
        console.log('No providers with adequate vehicle capacity found nearby');
      }

      // Update notification status
      await supabaseClient
        .from('delivery_notifications')
        .update({ 
          status: capableProviders.length > 0 ? 'notified' : 'no_capable_providers',
          metadata: {
            total_weight_kg: totalWeightKg,
            required_vehicle_type: requiredVehicleType,
            providers_found: nearbyProviders.length,
            capable_providers: capableProviders.length
          }
        })
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