import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GRNNotificationRequest {
  grnId: string;
  supplierEmail: string;
  builderName: string;
  grnNumber: string;
  items: Array<{
    description: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unit: string;
    condition: string;
  }>;
  overallCondition: string;
  receivedDate: string;
  discrepancies?: string;
  additionalNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      grnId, 
      supplierEmail, 
      builderName, 
      grnNumber, 
      items, 
      overallCondition, 
      receivedDate,
      discrepancies,
      additionalNotes 
    }: GRNNotificationRequest = await req.json();

    console.log(`Processing GRN notification for GRN ${grnNumber}`);

    // Generate items table HTML
    const itemsTableHTML = items.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.orderedQuantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.receivedQuantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 4px; background-color: ${
            item.condition === 'good' ? '#dcfce7' : 
            item.condition === 'damaged' ? '#fecaca' : '#fef3c7'
          }; color: ${
            item.condition === 'good' ? '#166534' : 
            item.condition === 'damaged' ? '#dc2626' : '#d97706'
          };">
            ${item.condition}
          </span>
        </td>
      </tr>
    `).join('');

    // Generate email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Goods Received Note - ${grnNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px;">📋 Goods Received Note</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280;">UjenziPro Construction Platform</p>
          </div>

          <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">GRN Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">GRN Number:</td>
                <td style="padding: 8px 0;">${grnNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Builder/Company:</td>
                <td style="padding: 8px 0;">${builderName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Received Date:</td>
                <td style="padding: 8px 0;">${new Date(receivedDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Overall Condition:</td>
                <td style="padding: 8px 0;">
                  <span style="padding: 4px 12px; border-radius: 4px; background-color: ${
                    overallCondition === 'good' ? '#dcfce7' : 
                    overallCondition === 'damaged' ? '#fecaca' : '#fef3c7'
                  }; color: ${
                    overallCondition === 'good' ? '#166534' : 
                    overallCondition === 'damaged' ? '#dc2626' : '#d97706'
                  }; font-weight: bold;">
                    ${overallCondition.toUpperCase()}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Items Received</h2>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: left;">Description</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Ordered</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Received</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Unit</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Condition</th>
                </tr>
              </thead>
              <tbody>
                ${itemsTableHTML}
              </tbody>
            </table>
          </div>

          ${discrepancies ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ Discrepancies Noted</h3>
            <p style="margin: 0; color: #92400e;">${discrepancies}</p>
          </div>
          ` : ''}

          ${additionalNotes ? `
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📝 Additional Notes</h3>
            <p style="margin: 0; color: #374151;">${additionalNotes}</p>
          </div>
          ` : ''}

          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This Goods Received Note was automatically generated by UjenziPro platform. 
              Please keep this record for your delivery documentation.
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              For any questions regarding this GRN, please contact the builder directly or reach out to UjenziPro support.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "UjenziPro <notifications@resend.dev>",
      to: [supplierEmail],
      subject: `Goods Received Note - ${grnNumber} from ${builderName}`,
      html: emailHTML,
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log(`GRN notification sent successfully to ${supplierEmail} for GRN ${grnNumber}`);

    // Update GRN status to indicate it was sent
    const { error: updateError } = await supabase
      .from('goods_received_notes')
      .update({ 
        status: 'sent_to_supplier',
        updated_at: new Date().toISOString()
      })
      .eq('id', grnId);

    if (updateError) {
      console.error("Error updating GRN status:", updateError);
      // Don't throw error here as email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "GRN notification sent successfully",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-grn-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);