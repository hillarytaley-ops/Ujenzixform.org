// Supabase Edge Function: send-monitoring-email
// Sends email notifications for monitoring alerts using Resend
// 
// Environment Variables Required:
// - RESEND_API_KEY: Your Resend API key
// - SUPABASE_URL: Supabase project URL
// - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
// Optional:
// - RESEND_FROM_MONITORING: Verified Resend sender (default UjenziXform <noreply@ujenzixform.org>)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appendUjenziContactFooter } from "../_shared/emailShell.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Verified sender domain must match your Resend setup; override with RESEND_FROM_MONITORING. */
const RESEND_FROM =
  Deno.env.get("RESEND_FROM_MONITORING") ??
  "UjenziXform <noreply@ujenzixform.org>";

interface EmailRequest {
  to: string;
  toName?: string;
  templateKey: string;
  variables: Record<string, string>;
  alertId?: string;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  text_body: string;
  is_active: boolean;
  priority: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { to, toName, templateKey, variables, alertId } = await req.json() as EmailRequest;

    if (!to || !templateKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, templateKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateKey);
      return new Response(
        JSON.stringify({ error: `Email template not found or inactive: ${templateKey}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in template
    let subject = template.subject;
    let htmlBody = template.html_body;
    let textBody = template.text_body || "";

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), value);
      htmlBody = htmlBody.replace(new RegExp(placeholder, "g"), value);
      textBody = textBody.replace(new RegExp(placeholder, "g"), value);
    });

    htmlBody = appendUjenziContactFooter(htmlBody);

    // Log the email attempt
    const { data: logEntry, error: logError } = await supabase
      .from("email_notification_log")
      .insert({
        recipient_email: to,
        recipient_name: toName,
        template_id: template.id,
        template_key: templateKey,
        subject: subject,
        alert_id: alertId,
        status: "pending",
        metadata: { variables }
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create email log:", logError);
    }

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
        tags: [
          { name: "template", value: templateKey },
          { name: "priority", value: template.priority }
        ]
      }),
    });

    const resendResult = await resendResponse.json();

    // Update log with result
    if (logEntry) {
      if (resendResponse.ok) {
        await supabase
          .from("email_notification_log")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { ...logEntry.metadata, resend_id: resendResult.id }
          })
          .eq("id", logEntry.id);

        // Update alert if provided
        if (alertId) {
          await supabase
            .from("monitoring_alerts")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .eq("id", alertId);
        }
      } else {
        await supabase
          .from("email_notification_log")
          .update({
            status: "failed",
            error_message: resendResult.message || "Unknown error",
            retry_count: (logEntry.retry_count || 0) + 1
          })
          .eq("id", logEntry.id);
      }
    }

    if (!resendResponse.ok) {
      throw new Error(resendResult.message || "Failed to send email via Resend");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: resendResult.id,
        logId: logEntry?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});














