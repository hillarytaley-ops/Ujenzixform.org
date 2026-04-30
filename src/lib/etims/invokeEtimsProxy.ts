import { supabase } from "@/integrations/supabase/client";

export type EtimsProxyMethod = "GET" | "POST" | "PUT" | "DELETE";

export type EtimsProxyInput = {
  method: EtimsProxyMethod;
  /** Path under integrator base URL, e.g. `invoices` or `items/KE1UCT0000014` */
  path: string;
  query?: Record<string, string>;
  body?: unknown;
};

export type EtimsProxyResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string; data?: unknown };

async function parseEdgeErrorBody(error: unknown): Promise<{ status: number; message: string; body: unknown }> {
  let status = 502;
  let message = "eTIMS proxy request failed";
  let body: unknown;

  if (error && typeof error === "object" && "message" in error && typeof (error as { message: string }).message === "string") {
    message = (error as { message: string }).message;
  }

  if (error && typeof error === "object" && error !== null && "context" in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        if (typeof ctx.status === "number") status = ctx.status;
        body = await ctx.json();
        if (typeof (body as { error?: string }).error === "string") message = (body as { error: string }).error;
        if (typeof (body as { message?: string }).message === "string") message = (body as { message: string }).message;
      } catch {
        /* ignore */
      }
    }
  }

  return { status, message, body };
}

/**
 * Calls Supabase Edge `etims-proxy`, which forwards to the integrator with Basic auth.
 * Requires signed-in user with supplier, admin, or super_admin role.
 *
 * Example:
 *   await invokeEtimsProxy({ method: "POST", path: "invoices", body: { traderInvoiceNo: "PO-1", ... } });
 */
export async function invokeEtimsProxy<T = unknown>(input: EtimsProxyInput): Promise<EtimsProxyResult<T>> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string; message?: string }>(
    "etims-proxy",
    { body: input },
  );

  if (error) {
    const parsed = await parseEdgeErrorBody(error);
    return { ok: false, status: parsed.status, message: parsed.message, data: parsed.body };
  }

  if (data && typeof data === "object" && "error" in data && typeof (data as { error: string }).error === "string") {
    return {
      ok: false,
      status: 400,
      message: (data as { error: string }).error,
      data,
    };
  }

  return { ok: true, status: 200, data: data as T };
}
