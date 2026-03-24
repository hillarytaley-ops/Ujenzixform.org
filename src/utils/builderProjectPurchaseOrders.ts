import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

export function normalizeProjectName(n: string | null | undefined): string {
  return (n ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** purchase_orders.buyer_id may be auth.users.id or profiles.id */
export async function fetchPurchaseBuyerIdsForBuilder(
  userId: string,
  accessToken: string | null
): Promise<string[]> {
  const ids = new Set<string>([userId]);
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?or=(user_id.eq.${userId},id.eq.${userId})&select=id,user_id&limit=20`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: ctrl.signal,
      }
    );
    if (res.ok) {
      const rows = (await res.json()) as { id?: string; user_id?: string }[];
      for (const p of Array.isArray(rows) ? rows : []) {
        if (p?.id) ids.add(p.id);
        if (p?.user_id) ids.add(p.user_id);
      }
    }
  } catch {
    /* optional */
  } finally {
    window.clearTimeout(t);
  }
  return [...ids];
}

/**
 * Cart stores project_name as "Site Name - Quote from Supplier"; builder_projects.name is "Site Name".
 */
export function purchaseOrderBelongsToProject(
  o: { project_id?: string | null; project_name?: string | null },
  projectId: string,
  projectName: string | null | undefined
): boolean {
  const pid = o.project_id && typeof o.project_id === "string" ? o.project_id.trim() : "";
  if (pid === projectId) return true;
  const pn = normalizeProjectName(projectName);
  const on = normalizeProjectName(o.project_name);
  if (!pn || !on) return false;
  if (on === pn) return true;
  if (on.startsWith(pn + " -") || on.startsWith(pn + " —")) return true;
  // e.g. "Moi's Bridge — Quote: nails" when project name is "Moi's Bridge"
  if (pn.length >= 3 && on.includes(pn)) return true;
  return false;
}

export function monitoringRequestBelongsToProject(
  m: { project_id?: string | null; project_name?: string | null },
  projectId: string,
  projectName: string | null | undefined
): boolean {
  if (m.project_id && String(m.project_id) === projectId) return true;
  const pn = normalizeProjectName(projectName);
  const mn = normalizeProjectName(m.project_name);
  if (!pn || !mn) return false;
  if (mn === pn) return true;
  if (mn.startsWith(pn + " -") || mn.startsWith(pn + " —")) return true;
  if (pn.length >= 3 && mn.includes(pn)) return true;
  return false;
}
