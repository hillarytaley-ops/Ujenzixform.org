// Supabase Edge Function: Rate Limiting
// Deploy with: supabase functions deploy rate-limit

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runRateLimitCheck } from "../_shared/rateLimitCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-rate-limit-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, identifier } = await req.json();

    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: "Missing action or identifier" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await runRateLimitCheck(supabase, action, identifier);

    if (result.denied) {
      return new Response(
        JSON.stringify({
          allowed: false,
          blocked: true,
          remainingMinutes: result.remainingMinutes,
          message: result.message,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        blocked: false,
        remainingRequests: result.remainingRequests,
        windowResetMs: result.windowResetMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Rate limit error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error", allowed: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
