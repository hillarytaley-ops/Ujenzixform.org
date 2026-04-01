// Edge: DB throttle (per email + per IP) then verify_admin_staff_login (service role).
// Deploy: supabase functions deploy verify-admin-staff-login
// Set verify_jwt = false in config.toml (staff are not Supabase-authenticated yet).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runRateLimitCheck } from "../_shared/rateLimitCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { p_email?: string; p_staff_code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRaw = body.p_email;
    const codeRaw = body.p_staff_code;
    if (
      !emailRaw || typeof emailRaw !== "string" || !emailRaw.trim() ||
      !codeRaw || typeof codeRaw !== "string" || !codeRaw.trim()
    ) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = emailRaw.toLowerCase().trim();
    const ip = clientIp(req);

    const byEmail = await runRateLimitCheck(supabase, "admin_login", normalizedEmail);
    if (byEmail.denied) {
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "rate_limited",
          message: byEmail.message,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const byIp = await runRateLimitCheck(supabase, "admin_staff_edge_ip", ip);
    if (byIp.denied) {
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "rate_limited",
          message: byIp.message,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabase.rpc("verify_admin_staff_login", {
      p_email: normalizedEmail,
      p_staff_code: codeRaw,
    });

    if (error) {
      console.error("verify_admin_staff_login RPC error:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "RPC error",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data ?? { ok: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-admin-staff-login:", e);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
