/**
 * Validates `Authorization: Bearer <jwt>` with the Supabase anon client (respects user JWT, not service role).
 * Use in Edge Functions that must act as the signed-in user after auth.
 */

import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

export type JwtAuthOk = { ok: true; user: User; authHeader: string };
export type JwtAuthFail = { ok: false; response: Response };
export type JwtAuthResult = JwtAuthOk | JwtAuthFail;

export async function requireUserJwt(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<JwtAuthResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, user, authHeader };
}
