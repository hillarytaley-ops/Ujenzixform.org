/**
 * Allow-listed paths for etims-proxy → third-party VFD/eTIMS REST API.
 * Prevents open SSRF; extend only when integrator documents new routes.
 */

const SEG = "[A-Za-z0-9._-]+";

const RULES: { methods: string[]; pattern: RegExp }[] = [
  { methods: ["GET"], pattern: /^countries$/ },
  { methods: ["GET"], pattern: /^currencies$/ },
  { methods: ["GET"], pattern: /^qtyunitcodes$/ },
  { methods: ["GET"], pattern: /^pkgunitcodes$/ },
  { methods: ["GET"], pattern: /^notices$/ },
  { methods: ["GET"], pattern: /^itemcodes$/ },
  { methods: ["GET"], pattern: /^branches$/ },
  { methods: ["GET"], pattern: /^items$/ },
  { methods: ["GET"], pattern: new RegExp(`^items/${SEG}$`) },
  { methods: ["GET"], pattern: /^invoices$/ },
  { methods: ["GET"], pattern: new RegExp(`^invoices/${SEG}$`) },
  { methods: ["GET"], pattern: /^customers$/ },
  { methods: ["GET"], pattern: new RegExp(`^customers/${SEG}$`) },
  { methods: ["GET"], pattern: /^purchases\/queries$/ },
  { methods: ["GET"], pattern: /^stock\/transfer\/queries$/ },
  { methods: ["GET"], pattern: /^imports\/queries$/ },
  { methods: ["POST"], pattern: /^items$/ },
  { methods: ["POST"], pattern: /^invoices$/ },
  { methods: ["POST"], pattern: /^customers$/ },
  { methods: ["POST"], pattern: /^purchases\/queries\/converted$/ },
  { methods: ["POST"], pattern: /^imports\/queries\/converted$/ },
  { methods: ["POST"], pattern: /^stock\/transfer\/queries\/receive$/ },
  { methods: ["POST"], pattern: /^stock\/transfers$/ },
  { methods: ["PUT"], pattern: new RegExp(`^items/${SEG}$`) },
  { methods: ["PUT"], pattern: new RegExp(`^items/${SEG}/stocks$`) },
  { methods: ["PUT"], pattern: new RegExp(`^customers/${SEG}$`) },
  { methods: ["DELETE"], pattern: new RegExp(`^items/${SEG}$`) },
  { methods: ["DELETE"], pattern: new RegExp(`^customers/${SEG}$`) },
];

export function isEtimsPathAllowed(method: string, path: string): boolean {
  const m = method.toUpperCase();
  const p = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!p || p.includes("..")) return false;
  return RULES.some((r) => r.methods.includes(m) && r.pattern.test(p));
}

function safeQueryValue(v: string): boolean {
  if (v.length > 64) return false;
  return /^\d{14}$/.test(v);
}

/** Optional list/pagination query keys (Swagger / Postman) */
const QUERY_LIST_KEYS = new Set([
  "name",
  "email",
  "country",
  "page",
  "limit",
  "sort",
  "order",
]);

function safeListQueryValue(v: string): boolean {
  if (v.length > 200) return false;
  return /^[\w\s.@+/-]*$/i.test(v);
}

const QUERY_SYNC_PATHS = new Set(["purchases/queries", "stock/transfer/queries", "imports/queries"]);

export function assertEtimsQueryAllowed(path: string, query: URLSearchParams): string | null {
  const p = path.replace(/^\/+/, "").replace(/\/+$/, "");

  if (QUERY_SYNC_PATHS.has(p)) {
    if (!query.has("last_request_date")) return "last_request_date is required";
    const v = query.get("last_request_date") ?? "";
    if (!safeQueryValue(v)) return "invalid last_request_date";
    const keys = [...query.keys()];
    if (keys.length !== 1 || keys[0] !== "last_request_date") {
      return "only last_request_date is allowed for this path";
    }
    return null;
  }

  if (query.toString() === "") return null;

  for (const key of query.keys()) {
    const values = query.getAll(key);
    if (values.length !== 1) return `duplicate query key: ${key}`;
    const val = values[0] ?? "";

    if (p === "items" || p === "invoices" || p === "customers") {
      if (!QUERY_LIST_KEYS.has(key)) return `disallowed query key for ${p}: ${key}`;
      if (!safeListQueryValue(val)) return `invalid query value for ${key}`;
      continue;
    }

    return `query string not allowed for path: ${p}`;
  }
  return null;
}
