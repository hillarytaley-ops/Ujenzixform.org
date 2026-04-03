// Edge: mint a signed Storage upload URL for bucket `site-vision-captures` (no service role on device).
// Auth: (A) Supabase user JWT + auth_can_access_camera(camera_id), or
//       (B) header X-Site-Vision-Device-Secret matching env SITE_VISION_DEVICE_SECRET + camera row exists.
// Deploy: supabase functions deploy camera-vision-upload-ticket
// Secrets: set SITE_VISION_DEVICE_SECRET in project Edge secrets if using device path; omit to disable (B).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runRateLimitCheck } from "../_shared/rateLimitCore.ts";

const BUCKET = "site-vision-captures";
const DEVICE_SECRET_HEADER = "x-site-vision-device-secret";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-site-vision-device-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

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

function normalizeExt(raw: unknown): string | null {
  if (raw == null || raw === "") return "webp";
  if (typeof raw !== "string") return null;
  const e = raw.replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!e) return "webp";
  if (!ALLOWED_EXT.has(e)) return null;
  if (e === "jpg") return "jpeg";
  return e;
}

function secretsEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  return timingSafeEqual(enc.encode(a), enc.encode(b));
}

function utcDateFolder(): string {
  return new Date().toISOString().slice(0, 10);
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deviceSecretEnv = (Deno.env.get("SITE_VISION_DEVICE_SECRET") || "").trim();

    let body: { camera_id?: string; file_extension?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cameraId = body.camera_id?.trim() || "";
    if (!cameraId || !UUID_RE.test(cameraId)) {
      return new Response(JSON.stringify({ error: "camera_id must be a valid UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = normalizeExt(body.file_extension);
    if (ext == null) {
      return new Response(
        JSON.stringify({ error: "file_extension must be one of jpg, jpeg, png, webp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const service = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const deviceHeader = (req.headers.get(DEVICE_SECRET_HEADER) || "").trim();

    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rl = await runRateLimitCheck(service, "vision_upload_ticket", user.id);
      if (rl.denied) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: rl.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: allowed, error: rpcErr } = await userClient.rpc(
        "auth_can_access_camera",
        { p_camera_id: cameraId },
      );
      if (rpcErr) {
        console.error("auth_can_access_camera:", rpcErr);
        return new Response(
          JSON.stringify({ error: rpcErr.message || "Access check failed" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (allowed !== true) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else if (deviceSecretEnv && deviceHeader) {
      if (!secretsEqual(deviceHeader, deviceSecretEnv)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ip = clientIp(req);
      const rl = await runRateLimitCheck(service, "vision_upload_ticket", `device:${ip}`);
      if (rl.denied) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: rl.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: cam, error: camErr } = await service
        .from("cameras")
        .select("id")
        .eq("id", cameraId)
        .maybeSingle();

      if (camErr) {
        console.error("cameras lookup:", camErr);
        return new Response(JSON.stringify({ error: "Camera lookup failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!cam?.id) {
        return new Response(JSON.stringify({ error: "Unknown camera" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          hint: "Send Authorization: Bearer <JWT> or X-Site-Vision-Device-Secret when configured",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const objectPath = `${cameraId}/${utcDateFolder()}/${crypto.randomUUID()}.${ext}`;

    const { data: signed, error: signErr } = await service.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signErr || !signed) {
      console.error("createSignedUploadUrl:", signErr);
      return new Response(
        JSON.stringify({ error: signErr?.message || "Could not create upload URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        bucket: BUCKET,
        path: signed.path,
        signedUrl: signed.signedUrl,
        token: signed.token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("camera-vision-upload-ticket:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
