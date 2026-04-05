import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";

/** Storage key Supabase JS uses for persisted session (sb-<ref>-auth-token). */
export function persistedSessionStorageKey(): string {
  try {
    const host = new URL(SUPABASE_URL).hostname;
    const ref = host.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}

type ParsedAuthBlob = {
  access_token?: string;
  currentSession?: { access_token?: string };
  session?: { access_token?: string };
  user?: { id?: string; email?: string };
};

function parseAuthBlob(raw: string): ParsedAuthBlob | null {
  try {
    return JSON.parse(raw) as ParsedAuthBlob;
  } catch {
    return null;
  }
}

/**
 * Synchronous read: sessionStorage first, then localStorage (matches Vite env when
 * VITE_SUPABASE_AUTH_STORAGE=session in production).
 */
export function readPersistedAccessTokenSync(): string {
  const key = persistedSessionStorageKey();
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = parseAuthBlob(raw);
      if (!parsed) continue;
      const t =
        parsed.access_token ||
        parsed.currentSession?.access_token ||
        parsed.session?.access_token ||
        "";
      if (t) return t;
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** User id/email from persisted session blob (for fallbacks when React context is slow). */
export function readPersistedAuthUserSync(): { id?: string; email?: string } {
  const key = persistedSessionStorageKey();
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = parseAuthBlob(raw);
      const u = parsed?.user;
      if (u?.id) return { id: u.id, email: u.email };
    } catch {
      /* ignore */
    }
  }
  return {};
}

/**
 * JWT for REST/RLS: prefer live Supabase session, then persisted sessionStorage/localStorage.
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
  return readPersistedAccessTokenSync();
}
