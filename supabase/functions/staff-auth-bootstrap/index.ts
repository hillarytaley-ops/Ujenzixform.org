/**
 * After valid staff portal credentials, ensure auth.users exists and is linked.
 * Re-verifies staff code server-side; does not require admin JWT.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; staff_code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = body.email?.trim().toLowerCase();
  const staffCode = body.staff_code?.trim();
  if (!email?.includes("@") || !staffCode) {
    return new Response(JSON.stringify({ error: "email and staff_code are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: verifyData, error: verifyErr } = await admin.rpc("verify_admin_staff_login", {
    p_email: email,
    p_staff_code: staffCode,
  });

  if (verifyErr || !verifyData?.ok) {
    return new Response(JSON.stringify({ error: "Invalid staff credentials" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: listData } = await admin.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId = existing?.id ?? (verifyData.auth_user_id as string | undefined);
  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: staffCode.toUpperCase(),
      email_confirm: true,
      user_metadata: {
        full_name: verifyData.full_name ?? "Staff Member",
        staff_provisioned: true,
      },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create auth user" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = created.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, { password: staffCode.toUpperCase() });
  }

  const { data: linkData, error: linkErr } = await admin.rpc("link_admin_staff_auth_user", {
    p_email: email,
  });

  if (linkErr) {
    return new Response(JSON.stringify({ error: linkErr.message, user_id: userId }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: userId,
      link: linkData,
      staff: verifyData,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
