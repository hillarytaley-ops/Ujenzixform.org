/**
 * Printable invoice in a new window when no uploaded PDF exists (Print → Save as PDF).
 */

import { escapeHtml, lineItemDescription } from "@/utils/deliveryNoteDocument";

export function openInvoicePrintWindow(
  inv: Record<string, unknown>,
  options?: { onPopUpBlocked?: () => void }
): boolean {
  const num = String(inv.invoice_number ?? "Invoice");
  const itemsRaw = inv.items;
  const rows = Array.isArray(itemsRaw) ? (itemsRaw as Record<string, unknown>[]) : [];
  const lines =
    rows.length > 0
      ? rows
          .map((item, index) => {
            const desc = lineItemDescription(item);
            const qty = item.quantity ?? item.qty ?? "—";
            const unit = item.unit_price ?? item.rate ?? item.unitPrice;
            const total = item.total_price ?? item.total ?? item.line_total;
            return `<tr><td>${index + 1}</td><td>${escapeHtml(desc)}</td><td>${escapeHtml(String(qty))}</td><td>${unit != null ? escapeHtml(String(unit)) : "—"}</td><td>${total != null ? escapeHtml(String(total)) : "—"}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="5">No line items</td></tr>';

  const subtotal = inv.subtotal != null ? String(inv.subtotal) : "—";
  const tax = inv.tax_amount != null ? String(inv.tax_amount) : "—";
  const total = inv.total_amount != null ? String(inv.total_amount) : "—";
  const due = inv.due_date != null ? escapeHtml(new Date(String(inv.due_date)).toLocaleDateString()) : "—";
  const notes = inv.notes != null && String(inv.notes).trim() ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(String(inv.notes))}</div>` : "";
  const terms = inv.payment_terms != null && String(inv.payment_terms).trim()
    ? `<p class="meta"><strong>Payment terms:</strong> ${escapeHtml(String(inv.payment_terms))}</p>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(num)}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111;max-width:800px;margin:0 auto}
  h1{font-size:1.25rem;margin:0 0 8px}
  .meta{color:#555;font-size:13px;margin:4px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border:1px solid #ccc;padding:8px;text-align:left}
  th{background:#f4f4f5}
  .totals{margin-top:16px;font-size:14px}
  .notes{margin-top:20px;padding:12px;background:#fafafa;border:1px solid #e5e5e5;border-radius:6px;font-size:13px;white-space:pre-wrap}
</style></head><body>
  <h1>Invoice</h1>
  <p class="meta"><strong>Invoice #:</strong> ${escapeHtml(num)}</p>
  <p class="meta"><strong>Status:</strong> ${escapeHtml(String(inv.status ?? "—"))}</p>
  <p class="meta"><strong>Due:</strong> ${due}</p>
  ${terms}
  <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Line total</th></tr></thead><tbody>${lines}</tbody></table>
  <div class="totals">
    <p><strong>Subtotal:</strong> KSh ${escapeHtml(subtotal)}</p>
    <p><strong>Tax:</strong> KSh ${escapeHtml(tax)}</p>
    <p><strong>Total:</strong> KSh ${escapeHtml(total)}</p>
  </div>
  ${notes}
  <p class="meta" style="margin-top:24px">Use <strong>Print</strong> → <strong>Save as PDF</strong> to download.</p>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    options?.onPopUpBlocked?.();
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}
