/**
 * Recovery when Vite lazy chunks 404 after a new deploy (old tab still runs previous main bundle).
 * Clears SW + Cache Storage and hard-navigates so a fresh index.html + assets load.
 */

const CHUNK_ERROR_RELOAD_KEY = "ujenzixform_chunk_reload_attempt";
const CHUNK_ERROR_TIMESTAMP_KEY = "ujenzixform_chunk_reload_timestamp";
const MAX_ATTEMPTS = 3;
const THROTTLE_MS = 6000;

export function isChunkLoadFailureMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("failed to load module script") ||
    m.includes("importing a module script failed") ||
    (m.includes("mime type") && m.includes("text/html"))
  );
}

/** @returns false if throttled / max attempts (caller should show manual refresh UI). */
export async function scheduleChunkReloadRecovery(): Promise<boolean> {
  const attemptCount = parseInt(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || "0", 10);
  const lastAttempt = sessionStorage.getItem(CHUNK_ERROR_TIMESTAMP_KEY);

  if (attemptCount >= MAX_ATTEMPTS) {
    console.warn("⚠️ Max chunk recovery reload attempts reached — refresh manually");
    return false;
  }

  if (lastAttempt && Date.now() - parseInt(lastAttempt, 10) < THROTTLE_MS) {
    console.warn("⚠️ Chunk recovery reload throttled");
    return false;
  }

  sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(attemptCount + 1));
  sessionStorage.setItem(CHUNK_ERROR_TIMESTAMP_KEY, String(Date.now()));

  console.log("🔄 Chunk load recovery: clearing caches and loading fresh deploy...");

  if ("caches" in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch {
      /* ignore */
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* ignore */
    }
  }

  const base = `${window.location.origin}${window.location.pathname}`;
  setTimeout(() => {
    window.location.replace(`${base}?_deploy_refresh=${Date.now()}`);
  }, 200);
  return true;
}
