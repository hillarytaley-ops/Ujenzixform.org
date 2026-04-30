/**
 * Proxies requests to the approved eTIMS / VFD REST integrator (test or prod).
 * Credentials never touch the browser — set Edge secrets:
 *   ETIMS_BASE_URL   e.g. http://46.137.15.155/api/v1  (no trailing slash)
 *   ETIMS_BASIC_USER
 *   ETIMS_BASIC_PASSWORD
 *
 * Invoke (POST) body:
 *   { "method": "GET"|"POST"|"PUT"|"DELETE", "path": "invoices", "query"?: { "last_request_date": "..." }, "body"?: object }
 *
 * Caller must be signed in with role supplier, admin, or super_admin.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { assertEtimsQueryAllowed, isEtimsPathAllowed } from "../_shared/etimsPathAllowlist.ts";
import { requireUserJwt } from "../_shared/requireUserJwt.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ETIMS_ROLES = new Set(["supplier", "admin", "super_admin"]);

type ProxyBody = {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  body?: unknown;
};

const MAX_BODY_CHARS = 400_000;

async function userHasEtimsRole(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error || !data?.length) return false;
  return data.some((row: { role: string }) => ETIMS_ROLES.has(String(row.role)));
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

  const baseUrl = (Deno.env.get("ETIMS_BASE_URL") ?? "").trim().replace(/\/+$/, "");
  const basicUser = (Deno.env.get("ETIMS_BASIC_USER") ?? "").trim();
  const basicPass = (Deno.env.get("ETIMS_BASIC_PASSWORD") ?? "").trim();

  if (!baseUrl || !basicUser || !basicPass) {
    return new Response(
      JSON.stringify({
        error: "eTIMS proxy not configured (set ETIMS_BASE_URL, ETIMS_BASIC_USER, ETIMS_BASIC_PASSWORD on Edge).",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    return new Response(JSON.stringify({ error: "ETIMS_BASE_URL must start with http:// or https://" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireUserJwt(req, corsHeaders);
  if (!auth.ok) return auth.response;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const service = createClient(supabaseUrl, serviceKey);
  const allowed = await userHasEtimsRole(service, auth.user.id);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Forbidden: supplier or admin role required for eTIMS." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (raw.length > MAX_BODY_CHARS) {
    return new Response(JSON.stringify({ error: "Body too large" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: ProxyBody;
  try {
    payload = raw ? JSON.parse(raw) as ProxyBody : {};
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const method = (payload.method ?? "GET").toUpperCase();
  const path = (payload.path ?? "").trim().replace(/^\/+/, "");
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    return new Response(JSON.stringify({ error: "Invalid method" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isEtimsPathAllowed(method, path)) {
    return new Response(JSON.stringify({ error: "Path not allowed", path, method }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const qs = new URLSearchParams();
  if (payload.query && typeof payload.query === "object") {
    for (const [k, v] of Object.entries(payload.query)) {
      if (typeof k === "string" && typeof v === "string") qs.set(k, v);
    }
  }

  const qErr = assertEtimsQueryAllowed(path, qs);
  if (qErr) {
    return new Response(JSON.stringify({ error: qErr }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `${baseUrl}/${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const basic = btoa(`${basicUser}:${basicPass}`);

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
    },
  };

  if (method === "POST" || method === "PUT") {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(payload.body ?? {});
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (e) {
    console.error("etims-proxy upstream fetch:", e);
    return new Response(JSON.stringify({ error: "Upstream unreachable", detail: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(text);
      return new Response(JSON.stringify(json), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      /* fall through */
    }
  }

  return new Response(JSON.stringify({ raw: text.slice(0, 8000) }), {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
