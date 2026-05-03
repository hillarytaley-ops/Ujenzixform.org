/**
 * Derive a human-readable monitoring package line for supplier-facing PO / quote cards.
 * Uses package IDs from MonitoringServicePrompt plus free-text fallbacks on the PO.
 */

const PACKAGE_LABELS: Record<string, string> = {
  'pro-starter': 'Starter — CO/Contractor (1 month)',
  'pro-basic': 'Basic — CO/Contractor (1 month)',
  'pro-standard': 'Standard — CO/Contractor (3 months)',
  'pro-premium': 'Premium — CO/Contractor (6 months)',
  'pro-enterprise': 'Enterprise — CO/Contractor',
  'pvt-starter': 'Starter — Private builder (1 month)',
  'pvt-basic': 'Basic — Private builder (1 month)',
  'pvt-standard': 'Standard — Private builder (3 months)',
  'pvt-premium': 'Premium — Private builder (6 months)',
  'pvt-enterprise': 'Enterprise — Private builder',
};

function collectPurchaseOrderText(po: Record<string, unknown> | null | undefined): string {
  if (!po || typeof po !== 'object') return '';
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) parts.push(s);
  };
  push(po.project_name);
  push(po.special_instructions);
  push(po.notes);
  push(po.description);
  const items = Array.isArray(po.items) ? po.items : [];
  for (const it of items as Record<string, unknown>[]) {
    if (!it || typeof it !== 'object') continue;
    push(it.material_name);
    push(it.name);
    push(it.description);
    push(it.notes);
    push(it.item_notes);
    push(it.special_instructions);
    push(it.title);
  }
  return parts.join('\n');
}

function looksLikeMonitoringPurchaseOrder(po: Record<string, unknown> | null | undefined): boolean {
  const blob = collectPurchaseOrderText(po).toLowerCase();
  if (!blob) return false;
  if (blob.includes('monitoring')) return true;
  return Object.keys(PACKAGE_LABELS).some((id) => blob.includes(id));
}

/**
 * Returns a display string when this PO appears to be a monitoring / site-monitoring quote; otherwise null.
 */
export function summarizeMonitoringPackageFromPurchaseOrder(
  po: Record<string, unknown> | null | undefined
): string | null {
  if (!po || !looksLikeMonitoringPurchaseOrder(po)) return null;
  const blob = collectPurchaseOrderText(po);

  for (const [id, label] of Object.entries(PACKAGE_LABELS)) {
    if (blob.includes(id)) return label;
  }

  const pay = blob.match(/monitoring package:\s*([^\n(]+)(?:\s*\(([^)]+)\))?/i);
  if (pay) {
    const name = pay[1]?.trim();
    const dur = pay[2]?.trim();
    if (name && dur) return `${name} (${dur})`;
    if (name) return name;
  }

  const pkg = blob.match(/package\s*:\s*([^\n]+)/i);
  if (pkg?.[1]) return pkg[1].trim();

  const items = Array.isArray(po.items) ? (po.items as Record<string, unknown>[]) : [];
  const first = items[0];
  const mid = first?.monitoring_package_id ?? first?.package_id;
  if (mid != null && String(mid).trim()) {
    const key = String(mid).trim();
    if (PACKAGE_LABELS[key]) return PACKAGE_LABELS[key];
  }

  return 'Monitoring package (see builder notes on this order)';
}
