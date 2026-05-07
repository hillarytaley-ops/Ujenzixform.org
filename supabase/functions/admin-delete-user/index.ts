/**
 * Admin-only: permanently delete a Supabase Auth user (cascaded public rows follow DB FK rules).
 * PLATFORM RULE: only hillarytaley@gmail.com may call this (JWT email must match;
 * override with secret CANONICAL_SUPER_ADMIN_EMAIL if you ever clone for another environment).
 * Deploy: supabase functions deploy admin-delete-user
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseUuid(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(t) ? t : null;
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetId = parseUuid(body?.user_id);
  if (!targetId) {
    return new Response(JSON.stringify({ error: "user_id must be a UUID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: actor },
    error: actorErr,
  } = await userClient.auth.getUser();
  if (actorErr || !actor) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (actor.id === targetId) {
    return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sole super admin — must match src/config/staffPermissions.ts CANONICAL_SUPER_ADMIN_EMAIL
  const canonical = (Deno.env.get("CANONICAL_SUPER_ADMIN_EMAIL") ?? "hillarytaley@gmail.com")
    .trim()
    .toLowerCase();
  const actorEmail = (actor.email ?? "").trim().toLowerCase();
  if (actorEmail !== canonical) {
    return new Response(
      JSON.stringify({
        error: "Only the designated platform super administrator may delete user accounts.",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const svc = createClient(supabaseUrl, serviceKey);

  const { data: actorRoles, error: arErr } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.id);
  if (arErr) {
    return new Response(JSON.stringify({ error: arErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const actorRoleTexts = (actorRoles ?? []).map((r) => String(r.role));
  const actorIsAdminish = actorRoleTexts.some((r) => r === "admin" || r === "super_admin");
  if (!actorIsAdminish) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: delErr } = await svc.auth.admin.deleteUser(targetId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
