/**
 * Shared transactional email chrome (logo, footer, contact) for UjenziXform / marketplace emails.
 */

const DEFAULT_ORIGIN = 'https://ujenzixform.org';

export function emailPublicOrigin(): string {
  const v = (import.meta as ImportMeta & { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL;
  const raw = typeof v === 'string' ? v.trim().replace(/\/$/, '') : '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return DEFAULT_ORIGIN;
}

export const EMAIL_LOGO_PATH = '/ujenzixform-logo-circular.svg';

export function logoAbsoluteUrl(): string {
  return `${emailPublicOrigin()}${EMAIL_LOGO_PATH}`;
}

export const COMPANY_BRAND = 'UjenziXform';
export const COMPANY_TAGLINE = "Kenya's construction materials marketplace";

export function companyContactFooter(): string {
  const origin = emailPublicOrigin();
  const host = origin.replace(/^https?:\/\//, '');
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:28px;border-top:1px solid #e5e7eb;padding-top:20px;font-size:13px;color:#64748b;line-height:1.6;">
    <tr>
      <td>
        <p style="margin:0 0 8px;font-weight:600;color:#0f172a;">Contact ${COMPANY_BRAND}</p>
        <p style="margin:0;">Email: <a href="mailto:info@ujenzixform.org" style="color:#15803d;">info@ujenzixform.org</a></p>
        <p style="margin:8px 0 0;">Web: <a href="${escapeHtml(origin)}" style="color:#15803d;">${escapeHtml(host)}</a></p>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">You are receiving this message because of activity on your ${COMPANY_BRAND} account.</p>
      </td>
    </tr>
  </table>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatKes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `KES ${Math.round(n).toLocaleString('en-KE')}`;
}

export type LineItemRow = {
  name: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
};

export function lineItemsTableHtml(items: LineItemRow[]): string {
  if (!items.length) {
    return '<p style="margin:0;color:#64748b;">No line items were included in this message.</p>';
  }
  const rows = items
    .map((it) => {
      const line = Number.isFinite(it.unitPrice) ? (it.unitPrice ?? 0) * Math.max(1, it.quantity) : 0;
      const unit = it.unit ? escapeHtml(it.unit) : '';
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:left;">${escapeHtml(it.name)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">${it.quantity}${unit ? ` <span style="color:#94a3b8;">${unit}</span>` : ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;">${line > 0 ? formatKes(line) : '—'}</td>
      </tr>`;
    })
    .join('');
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:10px 8px;text-align:left;font-size:12px;color:#475569;">Material</th>
        <th style="padding:10px 8px;text-align:center;font-size:12px;color:#475569;">Qty</th>
        <th style="padding:10px 8px;text-align:right;font-size:12px;color:#475569;">Line</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Parse purchase_orders.items JSON or cart snapshots into line rows. */
export function lineItemsFromUnknown(items: unknown): LineItemRow[] {
  if (!Array.isArray(items)) return [];
  return items.map((row: Record<string, unknown>) => {
    const name = String(row.material_name ?? row.name ?? 'Item');
    const quantity = Math.max(1, Number(row.quantity) || 1);
    const unit = row.unit != null ? String(row.unit) : undefined;
    const unitPrice = Number(row.unit_price);
    return {
      name,
      quantity,
      unit,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
    };
  });
}

export type WrapEmailOptions = {
  /** e.g. #15803d */
  accent: string;
  title: string;
  subtitle?: string;
  preheader?: string;
  /** Main inner HTML (already safe or escaped where needed). */
  bodyHtml: string;
};

/**
 * Full HTML document with header logo, brand, and company footer.
 */
export function wrapTransactionalEmail(opts: WrapEmailOptions): string {
  const origin = emailPublicOrigin();
  const logo = logoAbsoluteUrl();
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  ${pre}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg, ${opts.accent} 0%, #0f766e 100%);color:#ffffff;">
              <table role="presentation" width="100%"><tr>
                <td style="vertical-align:middle;">
                  <img src="${logo}" alt="${COMPANY_BRAND}" width="56" height="56" style="display:block;border-radius:12px;background:#fff;padding:4px;" />
                </td>
                <td style="vertical-align:middle;padding-left:16px;">
                  <div style="font-size:20px;font-weight:700;line-height:1.2;">${COMPANY_BRAND}</div>
                  <div style="font-size:13px;opacity:0.95;margin-top:4px;">${COMPANY_TAGLINE}</div>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#0f172a;">${opts.title}</h1>
              ${opts.subtitle ? `<p style="margin:10px 0 0;font-size:15px;color:#475569;">${opts.subtitle}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:15px;line-height:1.65;color:#334155;">
              ${opts.bodyHtml}
              ${companyContactFooter()}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} ${COMPANY_BRAND}. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
