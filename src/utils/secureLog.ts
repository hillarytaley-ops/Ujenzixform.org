/**
 * Safe logging — never emit raw emails, passwords, tokens, or credentials to the console.
 */

const SENSITIVE_KEY_RE =
  /^(password|passwd|secret|token|authorization|apikey|api_key|access_token|refresh_token|credential|credentials|code|pin|otp|jwt)$/i;
const EMAIL_KEY_RE = /email/i;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function maskEmailForLog(email: string): string {
  if (!email || typeof email !== 'string') return '[email]';
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '[email]';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 10) return '[nested]';
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (EMAIL_VALUE_RE.test(t)) return maskEmailForLog(t);
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => sanitizeForLog(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[redacted]';
      } else if (EMAIL_KEY_RE.test(k) && typeof v === 'string') {
        out[k] = maskEmailForLog(v);
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function emit(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
  console[level](...args.map((a) => sanitizeForLog(a)));
}

/** Development-only debug logs (no output in production). */
export function devLog(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  emit('log', ...args);
}

export function devWarn(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  emit('warn', ...args);
}

/** Errors/warnings with PII stripped — safe for production. */
export function safeError(...args: unknown[]): void {
  emit('error', ...args);
}

export function safeWarn(...args: unknown[]): void {
  emit('warn', ...args);
}

/** Log auth events with user id only — never email. */
export function logAuthEvent(context: string, event: string, userId?: string | null): void {
  devLog(`${context}: ${event}`, userId ? { userId } : undefined);
}
