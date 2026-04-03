// Supabase Edge Function for sending SMS via Africa's Talking
// Deploy with: supabase functions deploy send-sms

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  to: string | string[];
  message: string;
  from?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, from } = await req.json() as SMSRequest

    // Get credentials from environment
    const username = Deno.env.get('AFRICASTALKING_USERNAME') || 'sandbox'
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY')
    const senderId = from || Deno.env.get('AFRICASTALKING_SENDER_ID') || 'UjenziXform'

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Africa\'s Talking API key not configured',
          simulated: true,
          messageId: 'simulated-' + Date.now()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone numbers
    const formatPhone = (phone: string): string => {
      let cleaned = phone.replace(/\D/g, '')
      if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1)
      } else if (cleaned.startsWith('7')) {
        cleaned = '254' + cleaned
      } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned
      }
      return '+' + cleaned
    }

    const recipients = Array.isArray(to) 
      ? to.map(formatPhone).join(',')
      : formatPhone(to)

    // Determine API URL based on username
    const baseUrl = username === 'sandbox' 
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging'

    // Send SMS via Africa's Talking
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: new URLSearchParams({
        username: username,
        to: recipients,
        message: message,
        from: senderId
      })
    })

    const rawText = await response.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Africa's Talking returned non-JSON (HTTP ${response.status}). Check API key and endpoint.`,
          details: rawText.slice(0, 400),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Africa\'s Talking response:', data)

    const smd = data.SMSMessageData as Record<string, unknown> | undefined
    const recList = (smd?.Recipients as Array<Record<string, unknown>> | undefined) ?? []
    const first = recList[0]
    const status = first?.status != null ? String(first.status) : ''
    const isSuccess = status === 'Success' || status === 'Sent'

    if (isSuccess && first) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: first.messageId,
          cost: first.cost,
          status: first.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build a useful error for the admin UI (avoid generic "Unknown error")
    let errorMsg = ''
    if (status) errorMsg = status
    else if (typeof smd?.Message === 'string' && smd.Message.trim()) {
      errorMsg = smd.Message.trim()
    } else if (!response.ok) {
      errorMsg = `HTTP ${response.status} from Africa's Talking`
    } else if (first && Object.keys(first).length > 0) {
      errorMsg = `Recipient: ${JSON.stringify(first)}`
    } else if (recList.length === 0) {
      errorMsg =
        'No recipients in AT response (check phone format, sandbox test numbers, username sandbox vs live, and sender ID).'
    } else {
      errorMsg = JSON.stringify(smd ?? data).slice(0, 500)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        details: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('SMS Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

