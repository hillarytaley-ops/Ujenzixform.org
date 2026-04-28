import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import type { GridMaterialCsvRow } from '@/lib/materialsListExport';

export function gridMaterialsPdfFilename(): string {
  return `UjenziXform-materials-list-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function formatKes(n: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);
}

/** PDF of the same rows as the materials grid (multi-page table). */
export function buildPdfFromGridMaterials(rows: GridMaterialCsvRow[]): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const when = new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('UjenziXform — Materials & products list', 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`${when} · ${rows.length} items`, 14, 20);
  doc.setTextColor(0, 0, 0);

  const body = rows.map((r, i) => [
    String(i + 1),
    (r.name || '—').slice(0, 48),
    (r.category || '—').slice(0, 26),
    (r.unit || '—').slice(0, 12),
    formatKes(Number(r.unit_price) || 0),
    (r.supplier?.company_name || '—').slice(0, 24),
    r.in_stock ? 'Yes' : 'No',
    (r.description || '').replace(/\s+/g, ' ').trim().slice(0, 40) || '—',
  ]);

  autoTable(doc, {
    startY: 24,
    head: [['#', 'Product', 'Category', 'Unit', 'Price (KES)', 'Supplier', 'In stock', 'Notes']],
    body,
    styles: { fontSize: 7, cellPadding: 1.1, overflow: 'linebreak' },
    headStyles: { fillColor: [5, 120, 90], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 58 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16 },
      4: { cellWidth: 28 },
      5: { cellWidth: 34 },
      6: { cellWidth: 14 },
      7: { cellWidth: 52 },
    },
    margin: { left: 10, right: 10 },
  });

  return doc.output('blob');
}
