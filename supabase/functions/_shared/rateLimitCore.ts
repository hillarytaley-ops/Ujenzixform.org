// Shared DB-backed rate limit (same tables as `rate-limit` Edge Function).
// deno-lint-ignore no-explicit-any
type ServiceSupabase = any;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    blockDurationMs: 30 * 60 * 1000,
  },
  admin_login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 3,
    blockDurationMs: 60 * 60 * 1000,
  },
  /** Per-IP guard for admin staff login (Edge layer; complements per-email admin_login). */
  admin_staff_edge_ip: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    blockDurationMs: 30 * 60 * 1000,
  },
  /** Per-user burst limit when resolving stream URLs via Edge. */
  camera_stream: {
    windowMs: 60 * 1000,
    maxRequests: 40,
    blockDurationMs: 10 * 60 * 1000,
  },
  registration: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    blockDurationMs: 24 * 60 * 60 * 1000,
  },
  contact_form: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    blockDurationMs: 60 * 60 * 1000,
  },
  password_reset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    blockDurationMs: 60 * 60 * 1000,
  },
  api_general: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000,
  },
};

export type RateLimitOk = {
  denied: false;
  remainingRequests: number;
  windowResetMs: number;
};

export type RateLimitDenied = {
  denied: true;
  remainingMinutes: number;
  message: string;
};

export async function runRateLimitCheck(
  supabase: ServiceSupabase,
  action: string,
  identifier: string,
): Promise<RateLimitOk | RateLimitDenied> {
  const config = RATE_LIMITS[action] || RATE_LIMITS["api_general"];
  const rateLimitKey = `${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const { data: blockData } = await supabase
    .from("rate_limit_blocks")
    .select("blocked_until")
    .eq("key", rateLimitKey)
    .single();

  // rate_limit_blocks.blocked_until is BIGINT (epoch ms)
  const rawUntil = blockData?.blocked_until;
  const blockedUntilMs =
    rawUntil != null ? Number(rawUntil) : 0;
  if (blockData && blockedUntilMs > now) {
    const remainingMs = blockedUntilMs - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      denied: true,
      remainingMinutes,
      message: `Rate limit exceeded. Try again in ${remainingMinutes} minutes.`,
    };
  }

  const { data: requestData } = await supabase
    .from("rate_limit_requests")
    .select("id")
    .eq("key", rateLimitKey)
    .gte("created_at", new Date(windowStart).toISOString());

  const requestCount = requestData?.length || 0;

  if (requestCount >= config.maxRequests) {
    const blockedUntil = now + config.blockDurationMs;

    await supabase.from("rate_limit_blocks").upsert({
      key: rateLimitKey,
      blocked_until: blockedUntil,
      reason: `Exceeded ${config.maxRequests} ${action} requests`,
      created_at: new Date().toISOString(),
    });

    await supabase.from("activity_logs").insert({
      action: "rate_limit_exceeded",
      category: "security",
      details: `Rate limit exceeded for ${action} by ${identifier}`,
      metadata: {
        action,
        identifier,
        requestCount,
        maxRequests: config.maxRequests,
        blockedUntilMs: blockedUntil,
      },
    });

    const blockMinutes = Math.ceil(config.blockDurationMs / 60000);
    return {
      denied: true,
      remainingMinutes: blockMinutes,
      message: `Too many ${action} attempts. Blocked for ${blockMinutes} minutes.`,
    };
  }

  await supabase.from("rate_limit_requests").insert({
    key: rateLimitKey,
    action,
    identifier,
    created_at: new Date().toISOString(),
  });

  supabase
    .from("rate_limit_requests")
    .delete()
    .lt("created_at", new Date(windowStart).toISOString())
    .then(() => {});

  return {
    denied: false,
    remainingRequests: config.maxRequests - requestCount - 1,
    windowResetMs: config.windowMs - (now - windowStart),
  };
}
