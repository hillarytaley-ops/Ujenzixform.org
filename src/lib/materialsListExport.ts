/**
 * CSV export for rows currently loaded in MaterialsGrid (what you see in the catalog).
 */

export type GridMaterialCsvRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  in_stock?: boolean;
  supplier?: { company_name?: string };
  description?: string;
};

/** Excel-ready list of everything currently in the materials grid. */
export function gridMaterialsCsvFilename(): string {
  return `UjenziXform-materials-list-${new Date().toISOString().slice(0, 10)}.csv`;
}

/** UTF-8 CSV with BOM for Excel / Google Sheets. */
export function buildCsvFromGridMaterials(rows: GridMaterialCsvRow[]): Blob {
  const bom = '\uFEFF';
  const escape = (cell: string) => {
    const s = cell ?? '';
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = [
    'Name',
    'Category',
    'Unit',
    'Price (KES)',
    'Supplier',
    'In stock',
    'Description',
    'Product ID',
  ];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        escape(r.name || ''),
        escape(r.category || ''),
        escape((r.unit || '').trim() || '-'),
        String(Number(r.unit_price) || 0),
        escape(r.supplier?.company_name || ''),
        r.in_stock ? 'Yes' : 'No',
        escape((r.description || '').replace(/\s+/g, ' ').trim().slice(0, 500)),
        escape(r.id || ''),
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
