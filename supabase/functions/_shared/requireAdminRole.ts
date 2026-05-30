/**
 * Verify caller has admin or super_admin in user_roles (service role lookup).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function userIsPlatformAdmin(userId: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data?.length) return false;
  return data.some((r: { role: string }) => {
    const role = String(r.role);
    return role === "admin" || role === "super_admin";
  });
}
