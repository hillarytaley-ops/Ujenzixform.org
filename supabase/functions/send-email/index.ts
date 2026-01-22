/**
 * Supabase Edge Function: Send Email via Resend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Sign up at https://resend.com
 * 2. Verify your domain (ujenzixform.com)
 * 3. Get your API key from Resend dashboard
 * 4. Add secret: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
 * 5. Deploy: supabase functions deploy send-email
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, html, from, replyTo }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "UjenziXform <noreply@ujenzixform.com>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || "support@ujenzixform.com",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

