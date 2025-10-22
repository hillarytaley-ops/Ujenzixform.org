import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, builder_name, receipt_number, receipt_content, total_amount }: ReceiptEmailRequest = await req.json();

    console.log('Sending receipt email to:', to_email);

    const emailResponse = await resend.emails.send({
      from: "UjenziPro <receipts@ujenzipro.com>",
      to: [to_email],
      subject: `Purchase Receipt #${receipt_number} - UjenziPro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">UjenziPro</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Digital Construction Platform</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Purchase Receipt</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">Receipt #${receipt_number}</p>
              <p style="margin: 5px 0 0 0; color: #666;">Total Amount: KES ${total_amount.toLocaleString()}</p>
            </div>
            
            <p style="color: #333; margin-bottom: 20px;">Dear ${builder_name},</p>
            
            <p style="color: #333; line-height: 1.6;">
              Thank you for your purchase! Your payment has been processed successfully. 
              Please find your detailed receipt below:
            </p>
            
            <div style="border: 1px solid #e0e0e0; padding: 20px; margin: 20px 0; border-radius: 5px;">
              ${receipt_content}
            </div>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #2d5a2d; font-weight: bold;">✅ Payment Confirmed</p>
              <p style="margin: 5px 0 0 0; color: #2d5a2d;">Your payment has been successfully processed and recorded.</p>
            </div>
            
            <p style="color: #333; line-height: 1.6;">
              If you have any questions about this purchase or need assistance, 
              please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #333; margin-top: 30px;">
              Best regards,<br>
              <strong>The UjenziPro Team</strong>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              This is an automated receipt from UjenziPro Digital Construction Platform
            </p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
              Please save this receipt for your records
            </p>
          </div>
        </div>
      `,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-receipt-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);