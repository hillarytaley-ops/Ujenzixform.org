/** Shared HTML for Edge Functions (keep in sync with src/lib/emailLayout.ts visually). */

export function publicSiteUrl(): string {
  const v = Deno.env.get("PUBLIC_EMAIL_SITE_URL")?.trim().replace(/\/$/, "");
  if (v && (v.startsWith("http://") || v.startsWith("https://"))) return v;
  return "https://ujenzixform.org";
}

const LOGO_PATH = "/ujenzixform-logo-circular.svg";
const BRAND = "UjenziXform";
const TAGLINE = "Kenya's construction materials marketplace";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatKes(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

export function lineItemsFromJson(items: unknown): Array<{ name: string; qty: number; unit?: string; line: number }> {
  if (!Array.isArray(items)) return [];
  return items.map((row: Record<string, unknown>) => {
    const name = String(row.material_name ?? row.name ?? "Item");
    const qty = Math.max(1, Number(row.quantity) || 1);
    const unit = row.unit != null ? String(row.unit) : undefined;
    const unitPrice = Number(row.unit_price);
    const line = Number.isFinite(unitPrice) ? unitPrice * qty : 0;
    return { name, qty, unit, line };
  });
}

export function lineItemsTableHtml(rows: Array<{ name: string; qty: number; unit?: string; line: number }>): string {
  if (!rows.length) return "<p style=\"color:#64748b;\">See your dashboard for line items.</p>";
  const tr = rows
    .map(
      (it) =>
        `<tr><td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;">${escapeHtml(it.name)}</td>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">${it.qty}${
          it.unit ? ` <span style="color:#94a3b8;">${escapeHtml(it.unit)}</span>` : ""
        }</td>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;">${
          it.line > 0 ? formatKes(it.line) : "—"
        }</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tr style="background:#f8fafc;"><th style="padding:10px 8px;text-align:left;font-size:12px;">Material</th>
    <th style="padding:10px 8px;text-align:center;font-size:12px;">Qty</th>
    <th style="padding:10px 8px;text-align:right;font-size:12px;">Line</th></tr>${tr}</table>`;
}

function contactFooter(): string {
  const origin = publicSiteUrl();
  const host = origin.replace(/^https?:\/\//, "");
  return `<table role="presentation" width="100%" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:20px;font-size:13px;color:#64748b;">
    <tr><td>
      <p style="margin:0 0 8px;font-weight:600;color:#0f172a;">Contact ${BRAND}</p>
      <p style="margin:0;">Email: <a href="mailto:info@ujenzixform.org" style="color:#15803d;">info@ujenzixform.org</a></p>
      <p style="margin:8px 0 0;">Web: <a href="${escapeHtml(origin)}" style="color:#15803d;">${escapeHtml(host)}</a></p>
    </td></tr></table>`;
}

/** Insert UjenziXform contact block before `</body>` when templates ship their own full HTML. */
export function appendUjenziContactFooter(html: string): string {
  const footer = contactFooter();
  const idx = html.toLowerCase().lastIndexOf("</body>");
  if (idx >= 0) return `${html.slice(0, idx)}\n${footer}\n${html.slice(idx)}`;
  return `${html}\n${footer}`;
}

export function wrapTransactionalEmail(opts: {
  accent: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
}): string {
  const origin = publicSiteUrl();
  const logo = `${origin}${LOGO_PATH}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" style="max-width:600px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
<tr><td style="padding:24px 28px;background:linear-gradient(135deg, ${opts.accent} 0%, #0f766e 100%);color:#fff;">
<table width="100%"><tr>
<td><img src="${logo}" alt="${BRAND}" width="56" height="56" style="display:block;border-radius:12px;background:#fff;padding:4px;"/></td>
<td style="padding-left:16px;"><div style="font-size:20px;font-weight:700;">${BRAND}</div>
<div style="font-size:13px;opacity:0.95;margin-top:4px;">${TAGLINE}</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px 28px 8px;"><h1 style="margin:0;font-size:22px;">${escapeHtml(opts.title)}</h1>
${opts.subtitle ? `<p style="margin:10px 0 0;color:#475569;">${escapeHtml(opts.subtitle)}</p>` : ""}</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.65;color:#334155;">
${opts.bodyHtml}
${contactFooter()}
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} ${BRAND}</p>
</td></tr></table></body></html>`;
}

export function htmlPaymentReceivedPo(p: {
  name: string;
  poNumber: string;
  total: number;
  reference: string;
  items: unknown;
  /** Path only, e.g. `/professional-builder-dashboard` */
  dashboardPath?: string;
}): { subject: string; html: string } {
  const dash = (p.dashboardPath?.trim() || "/private-client-dashboard").replace(/\/$/, "");
  const rows = lineItemsFromJson(p.items);
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.name)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">We received your payment for <strong>${escapeHtml(p.poNumber)}</strong>.</p>` +
    `<div style="margin:18px 0;padding:14px;background:#ecfdf5;border:1px solid #86efac;border-radius:8px;color:#14532d;"><strong>Payment received</strong> — ${formatKes(
      p.total,
    )}</div>` +
    (p.reference
      ? `<p style="margin:12px 0 0;font-size:14px;">Reference: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(
          p.reference,
        )}</code></p>`
      : "") +
    (rows.length ? `<h3 style="margin:22px 0 8px;font-size:15px;">Materials</h3>${lineItemsTableHtml(rows)}` : "") +
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(publicSiteUrl())}${escapeHtml(dash)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Open dashboard →</a></p>`;
  return {
    subject: `Payment received — ${p.poNumber}`,
    html: wrapTransactionalEmail({ accent: "#15803d", title: "Payment received", subtitle: formatKes(p.total), bodyHtml: body }),
  };
}

export function htmlDeliveryQuotePaid(p: {
  name: string;
  requestId: string;
  reference: string;
  dashboardPath?: string;
}): { subject: string; html: string } {
  const origin = publicSiteUrl();
  const dash = (p.dashboardPath?.trim() || "/private-client-dashboard").replace(/\/$/, "");
  const deliveriesHref = `${origin}${dash}?tab=deliveries`;
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.name)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">Your <strong>delivery quote</strong> payment was received.</p>` +
    `<p style="margin:10px 0 0;">Request: <code>${escapeHtml(p.requestId)}</code></p>` +
    (p.reference
      ? `<p style="margin:8px 0 0;">Reference: <code>${escapeHtml(p.reference)}</code></p>`
      : "") +
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(deliveriesHref)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Deliveries →</a></p>`;
  return {
    subject: "Delivery quote paid",
    html: wrapTransactionalEmail({ accent: "#1d4ed8", title: "Delivery payment received", bodyHtml: body }),
  };
}

export function htmlMonitoringPaid(p: {
  name: string;
  requestId: string;
  reference: string;
  dashboardPath?: string;
}): { subject: string; html: string } {
  const origin = publicSiteUrl();
  const dash = (p.dashboardPath?.trim() || "/private-client-dashboard").replace(/\/$/, "");
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.name)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">Your <strong>monitoring package</strong> payment was received.</p>` +
    `<p style="margin:10px 0 0;">Request: <code>${escapeHtml(p.requestId)}</code></p>` +
    (p.reference ? `<p style="margin:8px 0 0;">Reference: <code>${escapeHtml(p.reference)}</code></p>` : "") +
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(origin)}${escapeHtml(dash)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Dashboard →</a></p>`;
  return {
    subject: "Monitoring package paid",
    html: wrapTransactionalEmail({ accent: "#4f46e5", title: "Monitoring payment received", bodyHtml: body }),
  };
}

export function htmlInvoicePaid(p: { name: string; invoiceId: string; reference: string }): { subject: string; html: string } {
  const origin = publicSiteUrl();
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.name)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">Your invoice has been marked <strong>paid</strong>.</p>` +
    `<p style="margin:10px 0 0;">Invoice ID: <code>${escapeHtml(p.invoiceId)}</code></p>` +
    (p.reference ? `<p style="margin:8px 0 0;">Reference: <code>${escapeHtml(p.reference)}</code></p>` : "") +
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(origin)}/professional-builder-dashboard" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Builder dashboard →</a></p>`;
  return {
    subject: "Invoice paid",
    html: wrapTransactionalEmail({ accent: "#15803d", title: "Invoice paid", bodyHtml: body }),
  };
}

/** Branded purchase receipt; `receiptInnerHtml` is trusted HTML from your receipt generator. */
export function htmlPurchaseReceipt(p: {
  name: string;
  receiptNumber: string;
  totalAmount: number;
  receiptInnerHtml: string;
}): { subject: string; html: string } {
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.name)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">Thank you for your purchase. Your payment has been processed.</p>` +
    `<div style="margin:18px 0;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">` +
    `<p style="margin:0;font-size:16px;font-weight:700;">Receipt #${escapeHtml(p.receiptNumber)}</p>` +
    `<p style="margin:8px 0 0;color:#475569;">Total: <strong>${formatKes(p.totalAmount)}</strong></p></div>` +
    `<div style="border:1px solid #e5e7eb;padding:20px;margin:20px 0;border-radius:8px;">${p.receiptInnerHtml}</div>` +
    `<div style="margin:18px 0;padding:14px;background:#ecfdf5;border:1px solid #86efac;border-radius:8px;color:#14532d;"><strong>Payment confirmed</strong></div>`;
  return {
    subject: `Purchase receipt #${p.receiptNumber}`,
    html: wrapTransactionalEmail({ accent: "#15803d", title: "Purchase receipt", subtitle: formatKes(p.totalAmount), bodyHtml: body }),
  };
}

export function htmlSupplierDeliveryNoteReady(p: {
  companyName: string;
  dnLabel: string;
  poNumber: string | null;
  status: string;
}): { subject: string; html: string } {
  const origin = publicSiteUrl();
  const body =
    `<p style="margin:0;">Hello <strong>${escapeHtml(p.companyName)}</strong>,</p>` +
    `<p style="margin:14px 0 0;">A delivery has been completed and a <strong>delivery note</strong> is available for your records.</p>` +
    `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">` +
    `<tr><td style="padding:8px 0;font-weight:600;width:140px;">DN</td><td>${escapeHtml(p.dnLabel)}</td></tr>` +
    (p.poNumber ? `<tr><td style="padding:8px 0;font-weight:600;">PO</td><td>${escapeHtml(p.poNumber)}</td></tr>` : "") +
    `<tr><td style="padding:8px 0;font-weight:600;">Status</td><td>${escapeHtml(p.status || "—")}</td></tr></table>` +
    `<p style="margin:20px 0 0;font-size:14px;color:#475569;">Sign in to your <strong>supplier dashboard</strong> → <strong>Invoice</strong> → <strong>Delivery notes</strong> to review details and continue the workflow.</p>` +
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(origin)}/supplier-dashboard" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Supplier dashboard →</a></p>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">This message was sent automatically when the delivery note was created.</p>`;
  return {
    subject: `Delivery note ${p.dnLabel} — order delivered`,
    html: wrapTransactionalEmail({ accent: "#ea580c", title: "Delivery note ready", bodyHtml: body }),
  };
}
