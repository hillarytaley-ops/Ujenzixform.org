export type BotProvider = "turnstile" | "recaptcha";

export interface VerifyBotChallengeResult {
  success: boolean;
  challengeRequired: boolean;
  provider?: BotProvider;
  error?: string;
}

export async function verifyBotChallenge(
  token: string | undefined,
  provider: BotProvider | undefined,
  remoteIp?: string,
): Promise<VerifyBotChallengeResult> {
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  const recaptchaSecret = Deno.env.get("RECAPTCHA_SECRET_KEY")?.trim();
  const challengeRequired = !!(turnstileSecret || recaptchaSecret);

  if (!challengeRequired) {
    return { success: true, challengeRequired: false };
  }

  if (!token?.trim() || !provider) {
    return {
      success: false,
      challengeRequired: true,
      error: "Bot verification required",
    };
  }

  if (provider === "turnstile") {
    if (!turnstileSecret) {
      return {
        success: false,
        challengeRequired: true,
        error: "Turnstile is not configured on the server",
      };
    }

    const form = new FormData();
    form.append("secret", turnstileSecret);
    form.append("response", token.trim());
    if (remoteIp) form.append("remoteip", remoteIp);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const data = await response.json();

    return {
      success: data.success === true,
      challengeRequired: true,
      provider: "turnstile",
      error: Array.isArray(data["error-codes"])
        ? data["error-codes"].join(", ")
        : undefined,
    };
  }

  if (provider === "recaptcha") {
    if (!recaptchaSecret) {
      return {
        success: false,
        challengeRequired: true,
        error: "reCAPTCHA is not configured on the server",
      };
    }

    const params = new URLSearchParams({
      secret: recaptchaSecret,
      response: token.trim(),
    });
    if (remoteIp) params.append("remoteip", remoteIp);

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );
    const data = await response.json();

    return {
      success: data.success === true,
      challengeRequired: true,
      provider: "recaptcha",
      error: Array.isArray(data["error-codes"])
        ? data["error-codes"].join(", ")
        : undefined,
    };
  }

  return {
    success: false,
    challengeRequired: true,
    error: "Unknown bot provider",
  };
}

function scoreFeedbackSpam(formData: Record<string, unknown>): number {
  let score = 0;
  const message = String(formData.message ?? "");
  const subject = String(formData.subject ?? formData.category ?? "");
  const email = String(formData.email ?? "");
  const combined = `${subject} ${message}`.toLowerCase();

  if (/viagra|casino|loan|bitcoin|crypto|investment|forex/.test(combined)) score += 40;
  if (/https?:\/\/|www\./.test(combined)) score += 25;
  if (/@(tempmail|10minutemail|guerrillamail|mailinator)/.test(email)) score += 35;
  if (message.length < 10) score += 20;

  return score;
}

export function isFeedbackSpam(formData: Record<string, unknown>): boolean {
  return scoreFeedbackSpam(formData) >= 70;
}

export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    undefined
  );
}
