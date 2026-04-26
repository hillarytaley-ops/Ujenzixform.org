import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

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

/** Older deploys / dev may still persist under this fixed project ref key. */
export const LEGACY_SUPABASE_AUTH_STORAGE_KEY = "sb-wuuyjjpgzgeimiptuuws-auth-token";

function readLegacyAuthBlob(): ParsedAuthBlob | null {
  try {
    const raw = localStorage.getItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY);
    return raw ? parseAuthBlob(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort JWT without awaiting getSession (sessionStorage → localStorage → legacy localStorage).
 * Use in sync paths; prefer readAuthSessionForRest() when you can await.
 */
export function readAccessTokenSyncBestEffort(): string {
  const t = readPersistedAccessTokenSync();
  if (t) return t;
  return readLegacyAuthBlob()?.access_token || "";
}

/**
 * Value for `Authorization` on raw PostgREST `fetch()` calls.
 * Prefer a user JWT (authenticated role) when passed or found in persisted session — required
 * after anon SELECT was revoked on catalog tables. Falls back to anon key for logged-out reads
 * (DB must still GRANT SELECT on marketplace tables to anon for public browsing).
 */
export function getPostgrestAuthorizationHeaderSync(
  preferredAccessToken?: string | null
): string {
  const fromArg =
    preferredAccessToken && String(preferredAccessToken).trim().length > 0
      ? String(preferredAccessToken).trim()
      : "";
  const t = fromArg || readAccessTokenSyncBestEffort();
  if (t) return `Bearer ${t}`;
  return `Bearer ${SUPABASE_ANON_KEY}`;
}

/**
 * Raw JSON session string (sessionStorage → localStorage → legacy localStorage).
 * For callers that still JSON.parse; prefer readAccessTokenSyncBestEffort / readAuthUserIdSync when possible.
 */
export function readPersistedAuthRawStringSync(): string | null {
  const key = persistedSessionStorageKey();
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(key);
      if (raw && raw.trim().length > 2) return raw;
    } catch {
      /* ignore */
    }
  }
  try {
    const legacy = localStorage.getItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY);
    if (legacy && legacy.trim().length > 2) return legacy;
  } catch {
    /* ignore */
  }
  return null;
}

/** True if any known Supabase auth blob exists in sessionStorage or localStorage. */
export function hasPersistedSupabaseSessionBlobSync(): boolean {
  return !!readPersistedAuthRawStringSync();
}

/** Remove Supabase persisted session from both storages (current + legacy keys). */
export function clearSupabasePersistedSessionSync(): void {
  const keys = [persistedSessionStorageKey(), LEGACY_SUPABASE_AUTH_STORAGE_KEY];
  for (const store of [sessionStorage, localStorage]) {
    for (const k of keys) {
      try {
        store.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Sync user id: current project storage key, then legacy key (matches cart checkout). */
export function readAuthUserIdSync(): string {
  const id = readPersistedAuthUserSync().id;
  if (id) return id;
  const legacy = readLegacyAuthBlob();
  if (legacy?.user?.id) return legacy.user.id;
  return "";
}

/**
 * User id + JWT for PostgREST fetch() calls (cart checkout, delivery prompt, etc.).
 * Prefer live Supabase session; fall back to persisted storage and legacy key.
 */
export async function readAuthSessionForRest(): Promise<{
  userId: string | null;
  accessToken: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  let userId: string | null = user?.id || readAuthUserIdSync() || null;
  let accessToken = await getAccessTokenWithPersistenceFallback();
  if (!accessToken) {
    const t = readLegacyAuthBlob()?.access_token;
    if (t) accessToken = t;
  }
  if (!userId) userId = readAuthUserIdSync() || null;
  return { userId, accessToken: accessToken || null };
}
