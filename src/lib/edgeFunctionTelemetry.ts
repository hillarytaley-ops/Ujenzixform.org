/**
 * Central place to report Edge Function failures to Sentry (and keep console/toast at call sites).
 * Phase 2: migrate each `supabase.functions.invoke(...)` to use a small wrapper that calls this on error.
 */
import { captureError, captureMessage } from '@/lib/sentry';

export function reportEdgeFunctionFailure(
  functionName: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  try {
    if (error instanceof Error) {
      captureError(error, { edgeFunction: functionName, ...context });
    } else {
      captureMessage(`edge_function:${functionName} ${String(error)}`, 'warning');
    }
  } catch {
    /* Sentry optional */
  }
}
