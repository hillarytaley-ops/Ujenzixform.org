/**
 * Printable GRN in a new window (Print → Save as PDF). Shared by builder/supplier GRN UI and admin tools.
 */

import { lineItemDescription } from "@/utils/deliveryNoteDocument";

export interface GrnPrintModel {
  grn_number: string;
  purchase_order?: { po_number?: string; items?: unknown[] };
  items: unknown;
  total_quantity?: number;
  received_date: string;
  status: string;
}

export function grnPoItemsArray(grn: GrnPrintModel): Record<string, unknown>[] {
  const raw = grn.purchase_order?.items;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

export function resolveGrnLineLabel(row: Record<string, unknown>, poLine: Record<string, unknown> | undefined): string {
  let d = lineItemDescription(row);
  if (d === "Item" && poLine) {
    const fromPo = lineItemDescription(poLine);
    if (fromPo !== "Item") return fromPo;
  }
  return d;
}

export function resolveGrnLineQty(row: Record<string, unknown>, poLine: Record<string, unknown> | undefined): string {
  const q =
    row.quantity ??
    row.qty ??
    row.amount ??
    poLine?.quantity ??
    poLine?.qty;
  return q != null && String(q).trim() !== "" ? String(q) : "—";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openGrnPrintWindow(
  grn: GrnPrintModel,
  options?: { onPopUpBlocked?: () => void }
): boolean {
  const poLines = grnPoItemsArray(grn);
  const rows = Array.isArray(grn.items) && (grn.items as unknown[]).length > 0 ? (grn.items as Record<string, unknown>[]) : poLines;
  const itemsHtml = rows
    .map((row: Record<string, unknown>, i: number) => {
      const label = resolveGrnLineLabel(row, poLines[i]);
      const qty = resolveGrnLineQty(row, poLines[i]);
      return `<tr><td>${i + 1}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(qty)}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(grn.grn_number)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:1.25rem;margin:0 0 8px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f4f4f5}
        .meta{color:#555;font-size:13px;margin-bottom:4px}
      </style></head><body>
      <h1>Goods Received Note</h1>
      <p class="meta"><strong>GRN:</strong> ${escapeHtml(grn.grn_number)}</p>
      <p class="meta"><strong>PO:</strong> ${escapeHtml(grn.purchase_order?.po_number || "N/A")}</p>
      <p class="meta"><strong>Received:</strong> ${escapeHtml(new Date(grn.received_date).toLocaleString())}</p>
      <p class="meta"><strong>Total quantity:</strong> ${grn.total_quantity ?? "—"}</p>
      <p class="meta"><strong>Status:</strong> ${escapeHtml(grn.status)}</p>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="3">No line items</td></tr>'}</tbody></table>
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
