import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";

/** Storage key Supabase JS uses for persisted session (sb-<ref>-auth-token). */
function persistedSessionStorageKey(): string {
  try {
    const host = new URL(SUPABASE_URL).hostname;
    const ref = host.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}

/**
 * JWT for REST/RLS: prefer in-memory session, then localStorage (same source as quote badge).
 * Avoids Authorization: Bearer <anon> when getSession() is briefly empty after navigation.
 */
export async function getAccessTokenWithPersistenceFallback(): Promise<string> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(persistedSessionStorageKey());
    if (!raw) return "";
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      currentSession?: { access_token?: string };
    };
    return (
      parsed?.access_token ||
      parsed?.currentSession?.access_token ||
      ""
    );
  } catch {
    return "";
  }
}
