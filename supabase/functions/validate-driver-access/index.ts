import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DriverAccessRequest {
  delivery_id: string;
  access_reason: string;
  user_context?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { delivery_id, access_reason, user_context }: DriverAccessRequest = await req.json();

    // Validate that the user has legitimate access to driver information
    const { data: deliveryData, error: deliveryError } = await supabaseClient
      .rpc('get_secure_delivery_info', { delivery_uuid: delivery_id });

    if (deliveryError) {
      console.error('Error validating delivery access:', deliveryError);
      return new Response(
        JSON.stringify({ 
          error: 'Access validation failed',
          can_access: false,
          reason: 'Unable to verify delivery access permissions'
        }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const delivery = deliveryData?.[0];
    if (!delivery) {
      return new Response(
        JSON.stringify({ 
          error: 'Delivery not found',
          can_access: false,
          reason: 'Invalid delivery ID or insufficient permissions'
        }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enhanced security logging for driver contact access
    const securityLog = {
      delivery_id,
      access_reason,
      user_context,
      can_access_driver: delivery.can_view_driver_contact,
      security_message: delivery.security_message,
      timestamp: new Date().toISOString(),
      access_granted: delivery.can_view_driver_contact
    };

    console.log('Driver contact access request:', securityLog);

    // Log the access attempt in the audit table
    await supabaseClient
      .from('driver_info_access_log')
      .insert({
        delivery_id,
        access_type: `api_request_${access_reason}`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    return new Response(
      JSON.stringify({
        can_access_driver: delivery.can_view_driver_contact,
        driver_display_name: delivery.driver_display_name,
        driver_contact_info: delivery.can_view_driver_contact ? delivery.driver_contact_info : null,
        security_message: delivery.security_message,
        access_controlled: true,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in secure driver access function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Security validation failed',
        can_access: false,
        reason: 'Internal security validation error'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});