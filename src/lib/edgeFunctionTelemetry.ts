/**
 * Reports Edge Function failures to Sentry. Prefer `invokeEdgeFunction` from `./invokeEdgeFunction`
 * so invoke + telemetry stay in one place.
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
