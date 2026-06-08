// Public form submission with server-side bot verification (Turnstile / reCAPTCHA).
// Deploy: supabase functions deploy submit-public-form
// Secrets: TURNSTILE_SECRET_KEY and/or RECAPTCHA_SECRET_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runRateLimitCheck } from "../_shared/rateLimitCore.ts";
import {
  getClientIp,
  isFeedbackSpam,
  verifyBotChallenge,
  type BotProvider,
} from "../_shared/verifyBotChallenge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FormType = "contact" | "feedback";

interface SubmitPublicFormRequest {
  formType: FormType;
  formData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  botToken?: string;
  botProvider?: BotProvider;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[<>\"'&]/g, "").slice(0, maxLen);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as SubmitPublicFormRequest;
    const { formType, formData, metadata = {}, botToken, botProvider } = body;

    if (!formType || !formData || typeof formData !== "object") {
      return jsonResponse(
        { success: false, message: "Invalid submission payload." },
        400,
      );
    }

    const clientIp = getClientIp(req) ||
      (typeof metadata.ip_address === "string" ? metadata.ip_address : undefined) ||
      "unknown";

    const rateAction = formType === "contact" ? "contact_form" : "feedback_form";
    const rateLimit = await runRateLimitCheck(supabase, rateAction, clientIp);
    if (rateLimit.denied) {
      return jsonResponse(
        {
          success: false,
          message: rateLimit.message,
        },
        429,
      );
    }

    const botCheck = await verifyBotChallenge(botToken, botProvider, clientIp);
    if (!botCheck.success) {
      return jsonResponse(
        {
          success: false,
          message: botCheck.challengeRequired
            ? "Bot verification failed. Please complete the security check and try again."
            : "Security verification failed.",
        },
        403,
      );
    }

    const honeypot = sanitizeText(formData.honeypot ?? metadata.honeypot_field, 200);
    if (honeypot.length > 0) {
      return jsonResponse(
        { success: false, message: "Bot activity detected." },
        403,
      );
    }

    if (formType === "contact") {
      const submissionMetadata = {
        ip_address: clientIp,
        user_agent: req.headers.get("user-agent") ?? metadata.user_agent ?? "",
        referrer: metadata.referrer ?? "",
        session_id: metadata.session_id ?? "",
        honeypot_field: "",
        submission_time_ms: metadata.submission_time_ms ?? 0,
        form_interactions: metadata.form_interactions ?? 0,
        csrf_token: metadata.csrf_token ?? "",
        bot_verified: botCheck.challengeRequired,
        bot_provider: botProvider ?? null,
      };

      const sanitizedFormData = {
        firstName: sanitizeText(formData.firstName, 50),
        lastName: sanitizeText(formData.lastName, 50),
        email: sanitizeText(formData.email, 100),
        phone: sanitizeText(formData.phone, 20),
        subject: sanitizeText(formData.subject, 200),
        message: sanitizeText(formData.message, 2000),
      };

      const { data, error } = await supabase.rpc("submit_contact_form", {
        form_data: sanitizedFormData,
        submission_metadata: submissionMetadata,
      });

      if (error) {
        console.error("submit_contact_form error:", error);
        return jsonResponse(
          { success: false, message: "Unable to submit your message. Please try again." },
          500,
        );
      }

      const result = data?.[0];
      return jsonResponse({
        success: result?.success === true,
        message: result?.message ??
          "Thank you for your message. We will respond soon.",
        submissionId: result?.submission_id,
        requiresReview: result?.requires_review === true,
      }, result?.success === true ? 200 : 403);
    }

    if (formType === "feedback") {
      const sanitized = {
        email: sanitizeText(formData.email, 100),
        name: sanitizeText(formData.name, 50) || "Anonymous",
        category: sanitizeText(formData.subject ?? formData.category, 200),
        comment: sanitizeText(formData.message ?? formData.comment, 2000),
        rating: Number(formData.rating) || null,
      };

      if (!sanitized.email || !sanitized.category || !sanitized.comment) {
        return jsonResponse(
          { success: false, message: "Please complete all required fields." },
          400,
        );
      }

      if (isFeedbackSpam(sanitized)) {
        return jsonResponse(
          {
            success: false,
            message: "Your submission has been flagged for review.",
            requiresReview: true,
          },
          403,
        );
      }

      const { error } = await supabase.from("feedback").insert({
        email: sanitized.email,
        name: sanitized.name,
        category: sanitized.category,
        comment: sanitized.comment,
        rating: sanitized.rating,
        status: "pending",
      });

      if (error) {
        console.error("feedback insert error:", error);
        return jsonResponse(
          { success: false, message: "Unable to submit feedback. Please try again." },
          500,
        );
      }

      return jsonResponse({
        success: true,
        message:
          "Thank you for your feedback. We appreciate your input and will use it to improve our services.",
      });
    }

    return jsonResponse({ success: false, message: "Unknown form type." }, 400);
  } catch (error) {
    console.error("submit-public-form error:", error);
    return jsonResponse(
      { success: false, message: "An unexpected error occurred. Please try again." },
      500,
    );
  }
});
