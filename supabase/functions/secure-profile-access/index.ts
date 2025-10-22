import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileRequest {
  action: 'get_own' | 'get_business_contact' | 'update_own' | 'search_public';
  profile_id?: string;
  search_query?: string;
  update_data?: any;
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

    const requestData: ProfileRequest = await req.json()

    switch (requestData.action) {
      case 'get_own':
        return await handleGetOwnProfile(supabaseClient, user.id)
      
      case 'get_business_contact':
        if (!requestData.profile_id) {
          throw new Error('Profile ID required')
        }
        return await handleGetBusinessContact(supabaseClient, user.id, requestData.profile_id)
      
      case 'update_own':
        if (!requestData.update_data) {
          throw new Error('Update data required')
        }
        return await handleUpdateOwnProfile(supabaseClient, user.id, requestData.update_data)
      
      case 'search_public':
        return await handleSearchPublicProfiles(supabaseClient, user.id, requestData.search_query)
      
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

async function handleGetOwnProfile(supabaseClient: any, userId: string) {
  // User can get their own complete profile
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    throw new Error(`Profile access error: ${error.message}`)
  }

  // Log access
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: userId,
      event_type: 'profile_access',
      severity: 'low',
      details: {
        action: 'get_own_profile',
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data,
      message: 'Profile retrieved securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetBusinessContact(supabaseClient: any, requesterId: string, targetProfileId: string) {
  // Use the secure function to get safe profile data
  const { data, error } = await supabaseClient
    .rpc('get_user_profile_safe', { profile_user_id: targetProfileId })

  if (error) {
    throw new Error(`Access denied: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('Profile not found or access denied')
  }

  // Log the business contact access
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: requesterId,
      event_type: 'business_contact_access',
      severity: 'medium',
      details: {
        action: 'get_business_contact',
        target_profile_id: targetProfileId,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data[0],
      message: 'Business contact retrieved securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUpdateOwnProfile(supabaseClient: any, userId: string, updateData: any) {
  // Sanitize and validate update data
  const allowedFields = [
    'full_name',
    'company_name', 
    'location',
    'phone',
    'description',
    'specialties',
    'years_experience',
    'user_type',
    'is_professional'
  ]

  // Filter to only allowed fields
  const sanitizedData: any = {}
  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      // Sanitize string inputs
      if (typeof value === 'string') {
        sanitizedData[key] = (value as string)
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
      } else {
        sanitizedData[key] = value
      }
    }
  }

  // Validate phone number if provided
  if (sanitizedData.phone) {
    const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/
    if (!phoneRegex.test(sanitizedData.phone.replace(/\s+/g, ''))) {
      throw new Error('Invalid Kenyan phone number format')
    }
  }

  // Update the profile
  const { data, error } = await supabaseClient
    .from('profiles')
    .update({
      ...sanitizedData,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('id, full_name, company_name, location, role, updated_at')

  if (error) {
    throw new Error(`Update failed: ${error.message}`)
  }

  // Log the update
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: userId,
      event_type: 'profile_update',
      severity: 'medium',
      details: {
        action: 'update_own_profile',
        updated_fields: Object.keys(sanitizedData),
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: data[0],
      message: 'Profile updated securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSearchPublicProfiles(supabaseClient: any, requesterId: string, searchQuery?: string) {
  // Only return basic business information for search
  let query = supabaseClient
    .from('profiles')
    .select('id, user_type, role, company_name, location, rating, is_professional, created_at')
    .eq('is_active', true)

  if (searchQuery) {
    query = query.or(`company_name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
  }

  // Limit results to prevent data scraping
  query = query.limit(50)

  const { data, error } = await query

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  // Filter out personal information, keep only business info
  const sanitizedData = (data || []).map((profile: any) => ({
    id: profile.id,
    business_name: profile.company_name || 'Individual Professional',
    location: profile.location,
    role: profile.role,
    is_professional: profile.is_professional,
    rating: profile.rating,
    member_since: profile.created_at
  }))

  // Log the search
  await supabaseClient
    .from('security_events')
    .insert({
      user_id: requesterId,
      event_type: 'profile_search',
      severity: 'low',
      details: {
        action: 'search_public_profiles',
        search_query: searchQuery || 'all',
        results_count: sanitizedData.length,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ 
      data: sanitizedData,
      count: sanitizedData.length,
      message: 'Public profiles retrieved securely'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
