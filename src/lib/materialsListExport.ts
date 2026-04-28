import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

export type MaterialListRow = {
  name: string;
  category: string;
  unit: string;
  suggested_price: number | null;
};

function restV1Base(): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;
}

/** All approved catalog materials (same source as the marketplace grid). */
export async function fetchApprovedMaterialsList(authorization: string): Promise<MaterialListRow[]> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: authorization,
    Accept: 'application/json',
  };
  const rows: MaterialListRow[] = [];
  const pageSize = 500;
  let offset = 0;

  for (;;) {
    const url = `${restV1Base()}/admin_material_images?select=name,category,unit,suggested_price&is_approved=eq.true&order=name.asc&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`List request failed (${res.status}): ${text.slice(0, 160)}`);
    }
    let chunk: MaterialListRow[];
    try {
      chunk = JSON.parse(text) as MaterialListRow[];
    } catch {
      throw new Error('Invalid response when loading materials list');
    }
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
    if (offset > 12_000) break;
  }
  return rows;
}

export function materialsListCsvFilename(): string {
  return `ujenzixform-materials-list-${new Date().toISOString().slice(0, 10)}.csv`;
}

/** UTF-8 CSV with BOM for Excel. */
export function buildMaterialsCsvBlob(rows: MaterialListRow[]): Blob {
  const bom = '\uFEFF';
  const escape = (cell: string) => {
    const s = cell ?? '';
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['Name', 'Category', 'Unit', 'Suggested price (KES)'];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        escape(r.name || ''),
        escape(r.category || ''),
        escape((r.unit || '').trim() || '-'),
        String(Number(r.suggested_price) || 0),
      ].join(','),
    ),
  ];
  return new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
