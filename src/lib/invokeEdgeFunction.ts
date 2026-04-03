/**
 * Wraps supabase.functions.invoke and reports failures to Sentry (edgeFunctionTelemetry).
 */
import { supabase } from '@/integrations/supabase/client';
import { reportEdgeFunctionFailure } from '@/lib/edgeFunctionTelemetry';

type InvokeOptions = Parameters<typeof supabase.functions.invoke>[1];
type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>;

export async function invokeEdgeFunction(
  functionName: string,
  options?: InvokeOptions,
  telemetryContext?: Record<string, unknown>
): Promise<InvokeResult> {
  try {
    const result = await supabase.functions.invoke(functionName, options);
    if (result.error) {
      reportEdgeFunctionFailure(functionName, result.error, telemetryContext);
    }
    return result;
  } catch (err) {
    reportEdgeFunctionFailure(functionName, err, telemetryContext);
    return { data: null, error: err } as InvokeResult;
  }
}
