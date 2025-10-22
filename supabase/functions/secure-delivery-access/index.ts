import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeliveryRequest {
  delivery_id?: string;
  action: 'list' | 'get' | 'update_status';
  status?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get user profile and role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role, user_type')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    const requestData: DeliveryRequest = await req.json()

    switch (requestData.action) {
      case 'list':
        return await handleListDeliveries(supabaseClient, profile)
      
      case 'get':
        if (!requestData.delivery_id) {
          throw new Error('Delivery ID required')
        }
        return await handleGetDelivery(supabaseClient, profile, requestData.delivery_id)
      
      case 'update_status':
        if (!requestData.delivery_id || !requestData.status) {
          throw new Error('Delivery ID and status required')
        }
        return await handleUpdateStatus(supabaseClient, profile, requestData.delivery_id, requestData.status, requestData.notes)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function handleListDeliveries(supabaseClient: any, profile: any) {
  let query = supabaseClient.from('deliveries_secure').select('*')

  // Apply role-based filtering
  switch (profile.role) {
    case 'admin':
      // Admins can see all deliveries
      break
    
    case 'builder':
      // Builders can only see their own deliveries
      query = query.eq('builder_id', profile.id)
      break
    
    case 'supplier':
      // Suppliers can only see deliveries assigned to them
      const { data: supplierData } = await supabaseClient
        .from('suppliers')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      
      if (supplierData) {
        query = query.eq('supplier_id', supplierData.id)
      } else {
        // No supplier profile, return empty
        return new Response(
          JSON.stringify({ data: [], count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      break
    
    default:
      throw new Error('Unauthorized role')
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // Log the access for audit purposes
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: profile.user_id,
      event_type: 'delivery_data_access',
      severity: 'low',
      details: {
        action: 'list_deliveries',
        role: profile.role,
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data || [], 
      count: count || 0,
      message: 'Deliveries retrieved securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetDelivery(supabaseClient: any, profile: any, deliveryId: string) {
  // Use the secure function we created
  const { data, error } = await supabaseClient
    .rpc('get_delivery_safe', { delivery_id: deliveryId })

  if (error) {
    throw new Error(`Access denied or delivery not found: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('Delivery not found or access denied')
  }

  // Log the access
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: profile.user_id,
      event_type: 'delivery_data_access',
      severity: 'low',
      details: {
        action: 'get_delivery',
        delivery_id: deliveryId,
        role: profile.role,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data[0],
      message: 'Delivery retrieved securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUpdateStatus(
  supabaseClient: any, 
  profile: any, 
  deliveryId: string, 
  status: string, 
  notes?: string
) {
  // Verify user can update this delivery
  const { data: delivery } = await supabaseClient
    .rpc('get_delivery_safe', { delivery_id: deliveryId })

  if (!delivery || delivery.length === 0) {
    throw new Error('Delivery not found or access denied')
  }

  // Only allow certain roles to update status
  if (!['admin', 'supplier'].includes(profile.role)) {
    throw new Error('Insufficient permissions to update delivery status')
  }

  // Update only the status and notes, never driver personal information
  const { data, error } = await supabaseClient
    .from('deliveries')
    .update({ 
      status: status,
      delivery_notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', deliveryId)
    .select('id, status, updated_at')

  if (error) {
    throw new Error(`Update failed: ${error.message}`)
  }

  // Log the update
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: profile.user_id,
      event_type: 'delivery_status_update',
      severity: 'medium',
      details: {
        action: 'update_delivery_status',
        delivery_id: deliveryId,
        old_status: delivery[0]?.status,
        new_status: status,
        role: profile.role,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data[0],
      message: 'Delivery status updated securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
