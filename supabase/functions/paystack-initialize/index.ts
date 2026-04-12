/**
 * Creates a Paystack transaction and returns authorization_url for hosted checkout
 * (cards, mobile money, bank — whatever is enabled on the Paystack business).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InitBody = {
  amount: number;
  currency?: string;
  email: string;
  orderId: string;
  description?: string;
  callbackUrl: string;
};

function minorUnits(amountMajor: number, currency: string): number {
  const c = currency.trim().toUpperCase();
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) return 0;
  if (["NGN", "GHS", "ZAR", "KES", "USD", "EUR", "GBP"].includes(c)) {
    return Math.round(amountMajor * 100);
  }
  return Math.round(amountMajor * 100);
}

function makeReference(userId: string, orderId: string): string {
  const safeOrder = orderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const t = Date.now().toString(36);
  const u = userId.replace(/-/g, "").slice(0, 12);
  return `ux_${u}_${safeOrder}_${t}`.slice(0, 99);
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

  if (!PAYSTACK_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "Paystack is not configured (missing PAYSTACK_SECRET_KEY)." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: InitBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const currency = (body.currency ?? "KES").toUpperCase();
  const amountMinor = minorUnits(body.amount, currency);
  if (!body.email?.includes("@") || amountMinor < 100) {
    return new Response(
      JSON.stringify({ error: "Valid email and minimum amount (1.00 in your currency) are required." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!body.orderId || typeof body.orderId !== "string") {
    return new Response(JSON.stringify({ error: "orderId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.callbackUrl?.startsWith("https://") && !body.callbackUrl?.startsWith("http://localhost")) {
    return new Response(JSON.stringify({ error: "callbackUrl must be an absolute URL." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reference = makeReference(userData.user.id, body.orderId);

  const paystackPayload = {
    email: body.email.trim(),
    amount: amountMinor,
    currency,
    reference,
    callback_url: body.callbackUrl,
    metadata: {
      order_id: body.orderId,
      user_id: userData.user.id,
      description: body.description ?? "",
    },
  };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paystackPayload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.status) {
    const msg = json?.message || json?.data?.message || "Paystack initialize failed";
    console.error("[paystack-initialize]", res.status, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      authorization_url: json.data.authorization_url as string,
      access_code: json.data.access_code as string,
      reference: json.data.reference as string,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
