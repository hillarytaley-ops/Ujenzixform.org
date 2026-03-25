import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

export function normalizeProjectName(n: string | null | undefined): string {
  return (n ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

type PoProjectRow = {
  project_id?: string | null;
  project_name?: string | null;
  /** Cart/checkout: `${name} - ${location}(…)` — reliable link when project_id was missing */
  delivery_address?: string | null;
};

function resolveProjectIdForOrderRow(
  o: PoProjectRow,
  projects: { id: string; name?: string | null }[],
  nameToIds: Map<string, string[]>
): string | null {
  let pid: string | null =
    o.project_id && typeof o.project_id === "string" ? o.project_id.trim() : null;
  if (pid) return pid;

  const normOrder = normalizeProjectName(o.project_name);
  if (!normOrder) return null;

  const exact = nameToIds.get(normOrder);
  if (exact?.length === 1) return exact[0];

  const sorted = [...projects]
    .filter((p) => p.name && String(p.name).trim())
    .sort(
      (a, b) =>
        normalizeProjectName(b.name).length - normalizeProjectName(a.name).length
    );
  for (const p of sorted) {
    const pn = normalizeProjectName(p.name);
    if (!pn) continue;
    if (normOrder === pn) return p.id;
    if (normOrder.startsWith(pn + " -") || normOrder.startsWith(pn + " —")) return p.id;
  }
  return null;
}

function resolveOrphanOrderByProjectNameSubstring(
  o: PoProjectRow,
  projects: { id: string; name?: string | null }[]
): string | null {
  const on = normalizeProjectName(o.project_name);
  if (!on || projects.length === 0) return null;
  const candidates: { id: string; len: number }[] = [];
  for (const p of projects) {
    const pn = normalizeProjectName(p.name);
    if (pn.length < 3) continue;
    if (on.includes(pn)) {
      candidates.push({ id: p.id, len: pn.length });
    }
  }
  if (candidates.length === 0) return null;
  const maxLen = Math.max(...candidates.map((c) => c.len));
  const atMax = candidates.filter((c) => c.len === maxLen);
  return atMax.length === 1 ? atMax[0].id : null;
}

function resolveOrphanByUniqueProjectPrefix(
  o: PoProjectRow,
  projects: { id: string; name?: string | null }[]
): string | null {
  const on = normalizeProjectName(o.project_name);
  if (!on || projects.length === 0) return null;

  const prefixToIds = new Map<string, Set<string>>();
  for (const p of projects) {
    const full = normalizeProjectName(p.name);
    const parts = full.split(" ").filter(Boolean);
    if (parts.length < 2) continue;
    const prefix = parts.slice(0, -1).join(" ");
    if (prefix.length < 8) continue;
    if (!prefixToIds.has(prefix)) prefixToIds.set(prefix, new Set());
    prefixToIds.get(prefix)!.add(p.id);
  }

  const matchedIds = new Set<string>();
  for (const [prefix, idSet] of prefixToIds) {
    if (idSet.size !== 1) continue;
    if (
      on.includes(prefix) ||
      on.startsWith(prefix + " -") ||
      on.startsWith(prefix + " —")
    ) {
      matchedIds.add([...idSet][0]);
    }
  }
  if (matchedIds.size === 1) return [...matchedIds][0];
  return null;
}

/**
 * Quote / cart rows often set project_name to "Moi's Bridge - Quote from …" while
 * builder_projects.name is "Moi's Bridge Project". `on.includes(fullProjectName)` fails;
 * but normalized project name may start with the quote's leading segment.
 */
function resolveWhenOrderHeadIsPrefixOfProjectName(
  o: PoProjectRow,
  projects: { id: string; name?: string | null }[]
): string | null {
  const raw = (o.project_name ?? "").trim();
  if (!raw || projects.length === 0) return null;

  const withAsciiDash = raw.replace(/[–—]/g, "-");
  const head =
    withAsciiDash.split(/\s+-\s+/)[0]?.trim() ||
    raw.split(/\s+—\s+/)[0]?.trim() ||
    raw.split(" — ")[0]?.trim() ||
    "";
  if (!head) return null;

  const h = normalizeProjectName(head);
  if (h.length < 6) return null;

  const matches = projects.filter((p) => {
    const pn = normalizeProjectName(p.name);
    if (!pn) return false;
    return pn.startsWith(h) || h === pn;
  });
  return matches.length === 1 ? matches[0].id : null;
}

/**
 * Checkout sets delivery_address to "Project Name - Location (optional addr)" (see CartSidebar).
 * 1) First segment vs project name (exact). 2) "Name - Location" vs project name + location.
 */
function resolveProjectFromDeliveryAddress(
  o: PoProjectRow,
  projects: { id: string; name?: string | null; location?: string | null }[]
): string | null {
  const raw = (o.delivery_address ?? "").trim();
  if (!raw || projects.length === 0) return null;

  const dashSplit = raw.split(/\s+-\s+/);
  let head = dashSplit[0]?.trim() ?? "";
  if (!head) head = raw.split(" — ")[0]?.trim() ?? "";
  if (!head || head.length < 2) return null;

  const normHead = normalizeProjectName(head);
  let matches = projects.filter(
    (p) => normalizeProjectName(p.name) === normHead
  );
  if (matches.length === 1) return matches[0].id;

  if (dashSplit.length >= 2) {
    const rest = (dashSplit[1] || "").split("(")[0].trim();
    const combo = normalizeProjectName(`${dashSplit[0]} - ${rest}`);
    matches = projects.filter((p) => {
      const loc = (p.location ?? "").trim();
      if (!loc) return false;
      return normalizeProjectName(`${p.name} - ${loc}`) === combo;
    });
    if (matches.length === 1) return matches[0].id;
  }

  return null;
}

/**
 * Single canonical match: project_id, then project_name rules, delivery_address head segment,
 * substring (longest wins), unique multi-word prefix.
 * Never uses header/cart selection. With exactly one project, unmatched rows still map to that project.
 */
export function resolvePurchaseOrderToProjectId(
  o: PoProjectRow,
  projects: { id: string; name?: string | null; location?: string | null }[]
): string | null {
  if (projects.length === 0) return null;

  const nameToIds = new Map<string, string[]>();
  for (const p of projects) {
    const key = normalizeProjectName(p.name);
    if (!key) continue;
    const arr = nameToIds.get(key) ?? [];
    arr.push(p.id);
    nameToIds.set(key, arr);
  }

  let pid = resolveProjectIdForOrderRow(o, projects, nameToIds);
  if (!pid) pid = resolveProjectFromDeliveryAddress(o, projects);
  if (!pid) pid = resolveWhenOrderHeadIsPrefixOfProjectName(o, projects);
  if (!pid) pid = resolveOrphanOrderByProjectNameSubstring(o, projects);
  if (!pid) pid = resolveOrphanByUniqueProjectPrefix(o, projects);
  if (!pid && projects.length === 1) pid = projects[0].id;
  return pid;
}

/** purchase_orders.buyer_id may be auth.users.id or profiles.id */
export async function fetchPurchaseBuyerIdsForBuilder(
  userId: string,
  accessToken: string | null,
  /** e.g. profiles.id from dashboard — Orders tab uses this first; merge must query the same ids */
  extraSeeds?: string[] | null
): Promise<string[]> {
  const ids = new Set<string>();
  if (userId?.trim()) ids.add(userId.trim());
  for (const s of extraSeeds ?? []) {
    if (s && typeof s === "string" && s.trim()) ids.add(s.trim());
  }
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
  // Quote title "Moi's Bridge - …" vs saved name "Moi's Bridge Project"
  const head =
    (o.project_name ?? "")
      .trim()
      .replace(/[–—]/g, "-")
      .split(/\s+-\s+/)[0]
      ?.trim() || "";
  const h = normalizeProjectName(head);
  if (h.length >= 6 && pn.startsWith(h)) return true;
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
