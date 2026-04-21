import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { htmlPurchaseReceipt } from "../_shared/emailShell.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptEmailRequest {
  to_email: string;
  builder_name: string;
  receipt_number: string;
  receipt_content: string;
  total_amount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, builder_name, receipt_number, receipt_content, total_amount }: ReceiptEmailRequest = await req
      .json();

    console.log("Sending receipt email to:", to_email);

    const { subject, html } = htmlPurchaseReceipt({
      name: builder_name,
      receiptNumber: receipt_number,
      totalAmount: total_amount,
      receiptInnerHtml: receipt_content,
    });

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_RECEIPTS") ?? "UjenziXform <info@ujenzixform.org>",
      to: [to_email],
      subject,
      html,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in send-receipt-email function:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
