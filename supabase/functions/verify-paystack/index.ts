import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  reference: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret?.trim()) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured on the server");
    }

    const { reference }: Body = await req.json();
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ success: false, error: "reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    const json = await res.json();

    if (!json.status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: json.message || "Paystack verification failed",
          raw: json,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = json.data;
    const paid = data?.status === "success";

    return new Response(
      JSON.stringify({
        success: paid,
        paid,
        reference: data?.reference,
        amount: data?.amount,
        currency: data?.currency,
        transactionId: data?.id != null ? String(data.id) : undefined,
        channel: data?.channel,
        customer: data?.customer,
        paidAt: data?.paid_at,
        message: paid ? "Payment verified" : `Transaction status: ${data?.status || "unknown"}`,
        raw: json,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
