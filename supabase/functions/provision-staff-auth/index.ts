/**
 * Provision auth.users for admin staff (service role only).
 * Creates account with email + staff code password, links admin_staff, assigns user_roles.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { requireUserJwt } from "../_shared/requireUserJwt.ts";
import { userIsPlatformAdmin } from "../_shared/requireAdminRole.ts";

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

  const auth = await requireUserJwt(req, corsHeaders);
  if (!auth.ok) return auth.response;

  const isAdmin = await userIsPlatformAdmin(auth.user.id);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; staff_code?: string; full_name?: string };
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

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId = existing?.id;
  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: staffCode,
      email_confirm: true,
      user_metadata: { full_name: body.full_name ?? "Staff Member", staff_provisioned: true },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create auth user" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = created.user.id;
  } else {
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: staffCode,
    });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
    JSON.stringify({ ok: true, user_id: userId, link: linkData }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
