/**
 * Opens a printable delivery note in a new window so the user can save as PDF (browser print dialog).
 * Matches the pattern used in GRNView.tsx.
 */

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateTime(v: unknown): string {
  if (v == null || v === '') return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function formatDateOnly(v: unknown): string {
  if (v == null || v === '') return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

function itemsToRows(items: unknown): string {
  const rows = Array.isArray(items) ? items : [];
  if (rows.length === 0) {
    return '<tr><td colspan="4">No line items recorded</td></tr>';
  }
  return rows
    .map((row: Record<string, unknown>, i: number) => {
      const desc =
        row.description ?? row.name ?? row.material ?? row.item_name ?? row.product_name ?? 'Item';
      const qty = row.quantity ?? row.qty ?? row.amount ?? '—';
      const unit = row.unit ?? row.uom ?? row.unit_of_measure ?? '';
      return `<tr><td>${i + 1}</td><td>${escapeHtml(String(desc))}</td><td>${escapeHtml(String(qty))}</td><td>${escapeHtml(String(unit))}</td></tr>`;
    })
    .join('');
}

export interface DeliveryNoteDocumentContext {
  poNumber?: string;
  supplierName?: string;
}

/** Row shape from delivery_notes (RPC) — extra columns may exist at runtime */
export type DeliveryNoteLike = Record<string, unknown>;

export function openDeliveryNotePdfWindow(
  dn: DeliveryNoteLike,
  ctx: DeliveryNoteDocumentContext = {},
  options?: { onPopUpBlocked?: () => void }
): boolean {
  const dnNo = String(dn.dn_number || dn.delivery_note_number || 'Delivery note');
  const status = dn.status != null ? String(dn.status) : '—';
  const po = ctx.poNumber && ctx.poNumber.trim() ? ctx.poNumber : '—';
  const supplier = ctx.supplierName && ctx.supplierName.trim() ? ctx.supplierName : '—';
  const deliveryAddr = dn.delivery_address != null ? String(dn.delivery_address) : '';
  const notes = dn.notes != null ? String(dn.notes) : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(dnNo)}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:28px;color:#111;max-width:800px;margin:0 auto}
  h1{font-size:1.35rem;margin:0 0 6px;font-weight:700}
  .sub{color:#555;font-size:14px;margin-bottom:20px}
  .meta{color:#333;font-size:13px;margin:6px 0;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
  th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#f4f4f5;font-weight:600}
  .notes{margin-top:20px;padding:12px;background:#fafafa;border:1px solid #e5e5e5;border-radius:6px;font-size:13px;white-space:pre-wrap}
  .footer{margin-top:28px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#666}
  @media print{body{padding:16px}}
</style></head><body>
  <h1>Delivery note</h1>
  <p class="sub">UjenziXform — supplier document</p>
  <p class="meta"><strong>DN number:</strong> ${escapeHtml(dnNo)}</p>
  <p class="meta"><strong>PO reference:</strong> ${escapeHtml(po)}</p>
  <p class="meta"><strong>Supplier:</strong> ${escapeHtml(supplier)}</p>
  <p class="meta"><strong>Status:</strong> ${escapeHtml(status)}</p>
  <p class="meta"><strong>Dispatch date:</strong> ${escapeHtml(formatDateOnly(dn.dispatch_date))}</p>
  <p class="meta"><strong>Expected delivery:</strong> ${escapeHtml(formatDateOnly(dn.expected_delivery_date))}</p>
  <p class="meta"><strong>Delivery date:</strong> ${escapeHtml(formatDateOnly(dn.delivery_date))}</p>
  ${deliveryAddr ? `<p class="meta"><strong>Delivery address:</strong> ${escapeHtml(deliveryAddr)}</p>` : ''}
  <table>
    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th></tr></thead>
    <tbody>${itemsToRows(dn.items)}</tbody>
  </table>
  ${notes ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(notes)}</div>` : ''}
  <div class="footer">
    <p>Created: ${escapeHtml(formatDateTime(dn.created_at))} · Last updated: ${escapeHtml(formatDateTime(dn.updated_at))}</p>
    <p>Use <strong>Print</strong> → <strong>Save as PDF</strong> to download this delivery note.</p>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    options?.onPopUpBlocked?.();
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}
