/**
 * Parse two-column CSV: id, etims_item_code (header row optional).
 * Codes must come from KRA / OSCU — this only applies stored values.
 */

export type BulkEtimsCsvRow = { id: string; code: string | null };

/** Minimal CSV split; supports quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
  return t;
}

export function parseBulkEtimsCsv(raw: string): { rows: BulkEtimsCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: BulkEtimsCsvRow[] = [];
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["No rows found. Paste CSV or upload a file."] };
  }
  let start = 0;
  const h = lines[0].toLowerCase();
  if (
    h.includes("etims") ||
    h.includes("item_code") ||
    h.includes("material_id") ||
    h.includes("product_id") ||
    /^id\s*[,;\t]/i.test(lines[0]) ||
    h.startsWith("id,")
  ) {
    start = 1;
  }
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const parts = splitCsvLine(line).filter((p) => p !== "");
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: need at least two columns (id, etims_item_code).`);
      continue;
    }
    const id = stripQuotes(parts[0]);
    const codeRaw = stripQuotes(parts[1]);
    if (!id) {
      errors.push(`Line ${i + 1}: empty id.`);
      continue;
    }
    rows.push({ id, code: codeRaw === "" ? null : codeRaw });
  }
  return { rows, errors };
}
