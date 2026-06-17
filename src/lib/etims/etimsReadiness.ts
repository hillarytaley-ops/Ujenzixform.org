/** Shared readiness checks for live eTIMS end-to-end testing (sale invoices only). */

export type SupplierEtimsReadiness = {
  hasPin: boolean;
  hasLegalName: boolean;
  hasBranch: boolean;
  ready: boolean;
};

export type BuyerEtimsReadiness = {
  hasPin: boolean;
  hasBillingName: boolean;
  ready: boolean;
};

export function assessSupplierEtimsReadiness(row: {
  kra_pin?: string | null;
  legal_business_name?: string | null;
  company_name?: string | null;
  etims_branch_code?: string | null;
} | null | undefined): SupplierEtimsReadiness {
  const pin = (row?.kra_pin ?? "").trim();
  const legal =
    (row?.legal_business_name ?? "").trim() || (row?.company_name ?? "").trim();
  const branch = (row?.etims_branch_code ?? "").trim();
  const hasPin = pin.length >= 8;
  const hasLegalName = legal.length > 0;
  const hasBranch = branch.length > 0;
  return {
    hasPin,
    hasLegalName,
    hasBranch,
    ready: hasPin && hasLegalName && hasBranch,
  };
}

export function assessBuyerEtimsReadiness(row: {
  kra_pin?: string | null;
  billing_company_name?: string | null;
  company_name?: string | null;
  full_name?: string | null;
} | null | undefined): BuyerEtimsReadiness {
  const pin = (row?.kra_pin ?? "").trim();
  const name =
    (row?.billing_company_name ?? "").trim() ||
    (row?.company_name ?? "").trim() ||
    (row?.full_name ?? "").trim();
  const hasPin = pin.length >= 8;
  const hasBillingName = name.length > 0;
  return {
    hasPin,
    hasBillingName,
    ready: hasPin && hasBillingName,
  };
}

export type ProductCodeCoverage = {
  total: number;
  withCode: number;
  missing: number;
  pct: number;
};

export function computeProductCodeCoverage(
  rows: { etims_item_code?: string | null; name?: string | null }[],
): ProductCodeCoverage {
  const total = rows.length;
  const withCode = rows.filter((r) => (r.etims_item_code ?? "").trim().length > 0).length;
  const missing = total - withCode;
  const pct = total > 0 ? Math.round((withCode / total) * 100) : 0;
  return { total, withCode, missing, pct };
}
