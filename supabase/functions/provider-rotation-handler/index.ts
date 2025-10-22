import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProviderRotationRequest {
  requestId: string;
  providerId: string;
  action: 'accept' | 'reject' | 'timeout';
  responseMessage?: string;
  estimatedCost?: number;
  estimatedDuration?: number;
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

    const { requestId, providerId, action, responseMessage, estimatedCost, estimatedDuration }: ProviderRotationRequest = await req.json();

    console.log('Processing provider rotation:', { requestId, providerId, action });

    // Get the delivery request
    const { data: deliveryRequest, error: requestError } = await supabaseClient
      .from('delivery_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !deliveryRequest) {
      throw new Error('Delivery request not found');
    }

    // Record provider response
    const { error: responseError } = await supabaseClient
      .from('delivery_provider_responses')
      .insert({
        notification_id: requestId,
        provider_id: providerId,
        response: action,
        response_message: responseMessage,
        estimated_cost: estimatedCost,
        estimated_duration_hours: estimatedDuration,
        responded_at: new Date().toISOString()
      });

    if (responseError) {
      console.error('Error recording provider response:', responseError);
    }

    if (action === 'accept') {
      // Provider accepted - update request status
      const { error: updateError } = await supabaseClient
        .from('delivery_requests')
        .update({
          provider_id: providerId,
          status: 'provider_assigned',
          provider_response: 'accepted',
          response_notes: responseMessage,
          response_date: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Notify builder of acceptance
      await supabaseClient
        .from('delivery_communications')
        .insert({
          delivery_request_id: requestId,
          sender_id: providerId,
          sender_type: 'provider',
          sender_name: 'Delivery Provider',
          message_type: 'provider_acceptance',
          content: `Your delivery request has been accepted! ${responseMessage || 'Provider will contact you with delivery details.'}`,
          metadata: {
            provider_id: providerId,
            estimated_cost: estimatedCost,
            estimated_duration: estimatedDuration,
            action: 'accepted'
          }
        });

      console.log(`Provider ${providerId} accepted request ${requestId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Provider acceptance recorded',
          status: 'accepted'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (action === 'reject' || action === 'timeout') {
      // Provider rejected or timed out - rotate to next provider
      
      // Add provider to attempted list
      const attemptedProviders = deliveryRequest.attempted_providers || [];
      const updatedAttempted = [...attemptedProviders, providerId];

      // Check if we've exceeded max attempts
      const maxAttempts = deliveryRequest.max_rotation_attempts || 5;
      
      if (updatedAttempted.length >= maxAttempts) {
        // All providers exhausted
        await supabaseClient
          .from('delivery_requests')
          .update({
            status: 'rotation_failed',
            attempted_providers: updatedAttempted,
            rotation_completed_at: new Date().toISOString(),
            provider_response: 'failed'
          })
          .eq('id', requestId);

        // Notify builder of failure
        await supabaseClient
          .from('delivery_communications')
          .insert({
            delivery_request_id: requestId,
            sender_id: 'system',
            sender_type: 'system',
            sender_name: 'BuildConnect System',
            message_type: 'rotation_failed',
            content: 'Unfortunately, all nearby providers are unavailable for your delivery request. Please try expanding your search area or adjusting your requirements.',
            metadata: {
              attempted_providers: updatedAttempted.length,
              max_attempts: maxAttempts,
              action: 'rotation_failed'
            }
          });

        console.log(`Rotation failed for request ${requestId} - all providers exhausted`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Rotation failed - all providers exhausted',
            status: 'rotation_failed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Find next provider using the rotation queue function
      const { data: nextProviders, error: rotationError } = await supabaseClient
        .rpc('get_provider_rotation_queue', {
          _request_id: requestId,
          _pickup_lat: deliveryRequest.pickup_latitude || -1.2921,
          _pickup_lng: deliveryRequest.pickup_longitude || 36.8219,
          _max_providers: 1
        });

      if (rotationError) {
        console.error('Error getting next provider:', rotationError);
      }

      if (nextProviders && nextProviders.length > 0) {
        const nextProvider = nextProviders[0];
        
        // Update request with new provider attempt
        await supabaseClient
          .from('delivery_requests')
          .update({
            attempted_providers: updatedAttempted,
            status: 'pending',
            provider_response: null,
            response_notes: `Previous provider ${action === 'reject' ? 'declined' : 'timed out'}. Rotating to next provider.`
          })
          .eq('id', requestId);

        // Notify next provider
        await supabaseClient
          .from('delivery_communications')
          .insert({
            delivery_request_id: requestId,
            sender_id: 'system',
            sender_type: 'system',
            sender_name: 'BuildConnect Delivery System',
            message_type: 'delivery_request_notification',
            content: `New delivery request available: ${deliveryRequest.material_type} from ${deliveryRequest.pickup_address} to ${deliveryRequest.delivery_address}. Distance: ${nextProvider.distance_km}km`,
            metadata: {
              provider_id: nextProvider.provider_id,
              distance_km: nextProvider.distance_km,
              priority_score: nextProvider.priority_score,
              rotation_attempt: updatedAttempted.length + 1,
              max_attempts: maxAttempts
            }
          });

        console.log(`Rotated request ${requestId} to next provider: ${nextProvider.provider_id}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Rotated to next provider',
            status: 'rotated',
            next_provider_id: nextProvider.provider_id,
            attempt: updatedAttempted.length + 1,
            max_attempts: maxAttempts
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        // No more providers available
        await supabaseClient
          .from('delivery_requests')
          .update({
            status: 'no_providers_available',
            attempted_providers: updatedAttempted,
            rotation_completed_at: new Date().toISOString()
          })
          .eq('id', requestId);

        console.log(`No more providers available for request ${requestId}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'No more providers available',
            status: 'no_providers_available'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid action specified'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('Error in provider-rotation-handler function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Failed to process provider rotation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});