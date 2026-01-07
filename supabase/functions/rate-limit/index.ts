// Supabase Edge Function: Rate Limiting
// Deploy with: supabase functions deploy rate-limit

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rate-limit-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  blockDurationMs: number // How long to block after limit exceeded
}

// Rate limit configurations for different actions
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'login': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 5,               // 5 attempts
    blockDurationMs: 30 * 60 * 1000 // 30 minute block
  },
  'admin_login': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 3,               // 3 attempts (stricter)
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  'registration': {
    windowMs: 60 * 60 * 1000,    // 1 hour
    maxRequests: 3,               // 3 registrations
    blockDurationMs: 24 * 60 * 60 * 1000 // 24 hour block
  },
  'contact_form': {
    windowMs: 60 * 60 * 1000,    // 1 hour
    maxRequests: 5,               // 5 submissions
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  'password_reset': {
    windowMs: 60 * 60 * 1000,    // 1 hour
    maxRequests: 3,               // 3 attempts
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  'api_general': {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 100,             // 100 requests
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { action, identifier } = await req.json()
    
    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing action or identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get rate limit config for this action
    const config = RATE_LIMITS[action] || RATE_LIMITS['api_general']
    
    // Create a unique key for this rate limit
    const rateLimitKey = `${action}:${identifier}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Check for existing block
    const { data: blockData } = await supabase
      .from('rate_limit_blocks')
      .select('blocked_until')
      .eq('key', rateLimitKey)
      .single()

    if (blockData && blockData.blocked_until > now) {
      const remainingMs = blockData.blocked_until - now
      const remainingMinutes = Math.ceil(remainingMs / 60000)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          blocked: true,
          remainingMinutes,
          message: `Rate limit exceeded. Try again in ${remainingMinutes} minutes.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count requests in current window
    const { data: requestData, error: countError } = await supabase
      .from('rate_limit_requests')
      .select('id')
      .eq('key', rateLimitKey)
      .gte('created_at', new Date(windowStart).toISOString())

    const requestCount = requestData?.length || 0

    if (requestCount >= config.maxRequests) {
      // Block the identifier
      const blockedUntil = now + config.blockDurationMs
      
      await supabase
        .from('rate_limit_blocks')
        .upsert({
          key: rateLimitKey,
          blocked_until: blockedUntil,
          reason: `Exceeded ${config.maxRequests} ${action} requests`,
          created_at: new Date().toISOString()
        })

      // Log security event
      await supabase
        .from('activity_logs')
        .insert({
          action: 'rate_limit_exceeded',
          category: 'security',
          details: `Rate limit exceeded for ${action} by ${identifier}`,
          metadata: {
            action,
            identifier,
            requestCount,
            maxRequests: config.maxRequests,
            blockedUntilMs: blockedUntil
          }
        })

      const blockMinutes = Math.ceil(config.blockDurationMs / 60000)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          blocked: true,
          remainingMinutes: blockMinutes,
          message: `Too many ${action} attempts. Blocked for ${blockMinutes} minutes.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record this request
    await supabase
      .from('rate_limit_requests')
      .insert({
        key: rateLimitKey,
        action,
        identifier,
        created_at: new Date().toISOString()
      })

    // Clean up old requests (async, don't wait)
    supabase
      .from('rate_limit_requests')
      .delete()
      .lt('created_at', new Date(windowStart).toISOString())
      .then(() => {})

    return new Response(
      JSON.stringify({
        allowed: true,
        blocked: false,
        remainingRequests: config.maxRequests - requestCount - 1,
        windowResetMs: config.windowMs - (now - windowStart)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Rate limit error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', allowed: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})




