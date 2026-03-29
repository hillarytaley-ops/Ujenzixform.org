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

/** Resolves sold-item title from purchase_orders.items JSON (and common variants). */
export function lineItemDescription(row: Record<string, unknown>): string {
  const candidates: unknown[] = [
    row.material_name,
    row.product_name,
    row.product_title,
    row.title,
    row.description,
    row.name,
    row.material,
    row.material_type,
    row.type,
    row.specification,
    row.item_name,
    row.item_label,
    row.label,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return 'Item';
}

function itemsToRows(items: unknown, purchaseOrderItems?: unknown): string {
  const rows = Array.isArray(items) ? items : [];
  const poRows = Array.isArray(purchaseOrderItems) ? purchaseOrderItems : [];

  if (rows.length === 0 && poRows.length === 0) {
    return '<tr><td colspan="4">No line items recorded</td></tr>';
  }

  const useRows = rows.length > 0 ? rows : poRows;

  return useRows
    .map((row: Record<string, unknown>, i: number) => {
      let desc = lineItemDescription(row);
      if (desc === 'Item' && poRows[i]) {
        const fromPo = lineItemDescription(poRows[i] as Record<string, unknown>);
        if (fromPo !== 'Item') desc = fromPo;
      }

      const poLine = poRows[i] as Record<string, unknown> | undefined;
      const qty =
        row.quantity ??
        row.qty ??
        row.amount ??
        row.ordered_quantity ??
        row.count ??
        poLine?.quantity ??
        poLine?.qty ??
        '—';
      const unit =
        row.unit ??
        row.uom ??
        row.unit_of_measure ??
        poLine?.unit ??
        poLine?.uom ??
        '';
      return `<tr><td>${i + 1}</td><td>${escapeHtml(String(desc))}</td><td>${escapeHtml(String(qty))}</td><td>${escapeHtml(String(unit))}</td></tr>`;
    })
    .join('');
}

/** Safe <img> for builder_signature (data URL or https). */
function builderSignatureBlock(signature: unknown, signedAt: unknown, builderName: string | undefined): string {
  const nameHtml = builderName?.trim()
    ? `<p class="meta"><strong>Builder / recipient:</strong> ${escapeHtml(builderName.trim())}</p>`
    : '';
  const when =
    signedAt != null && String(signedAt).trim() !== ''
      ? `<p class="meta"><strong>Signed:</strong> ${escapeHtml(formatDateTime(signedAt))}</p>`
      : '';

  if (typeof signature !== 'string' || !signature.trim()) {
    return `<div class="signature-block">
      <h2 class="sig-heading">Builder acknowledgment</h2>
      ${nameHtml}
      <p class="muted">No signature on file yet.</p>
      ${when}
    </div>`;
  }

  const s = signature.trim();
  let img = '';
  if (s.startsWith('data:image/')) {
    const safeSrc = s.replace(/"/g, '&quot;');
    img = `<img src="${safeSrc}" alt="Builder signature" class="sig-img" />`;
  } else if (s.startsWith('http://') || s.startsWith('https://')) {
    img = `<img src="${escapeHtml(s)}" alt="Builder signature" class="sig-img" />`;
  } else {
    img = `<p class="muted">Signature stored in an unsupported format.</p>`;
  }

  return `<div class="signature-block">
    <h2 class="sig-heading">Builder acknowledgment</h2>
    ${nameHtml}
    ${img}
    ${when}
  </div>`;
}

export interface DeliveryNoteDocumentContext {
  poNumber?: string;
  supplierName?: string;
  /** Builder / buyer display name (from profiles) */
  builderDisplayName?: string;
  /** purchase_orders.items when DN line labels are missing */
  purchaseOrderItems?: unknown;
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
  const sigHtml = builderSignatureBlock(
    dn.builder_signature,
    dn.builder_signed_at,
    ctx.builderDisplayName
  );

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
  .signature-block{margin-top:28px;padding:16px;border:1px solid #ddd;border-radius:8px;background:#fafafa}
  .sig-heading{font-size:1rem;margin:0 0 12px;font-weight:600}
  .sig-img{max-width:320px;max-height:140px;object-fit:contain;display:block;border:1px solid #ccc;background:#fff}
  .muted{color:#666;font-size:13px}
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
    <tbody>${itemsToRows(dn.items, ctx.purchaseOrderItems)}</tbody>
  </table>
  ${notes ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(notes)}</div>` : ''}
  ${sigHtml}
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
