/**
 * KRA eTIMS third-party integrator (TIS) — shared types and certification checklist.
 * UjenziXform operates as a certified integrator serving vendor taxpayers.
 */

export type TisSolutionType = "OSCU" | "VSCU";
export type TisEnvironment = "sandbox" | "production";
export type TisCertificationStatus =
  | "in_development"
  | "sandbox_testing"
  | "submitted_to_kra"
  | "certified"
  | "suspended";

export type TisVendorOnboardingStatus =
  | "draft"
  | "pending_review"
  | "pending_kra"
  | "active"
  | "suspended"
  | "rejected";

export type TisIntegratorPlatform = {
  id: string;
  integrator_name: string;
  integrator_pin: string | null;
  product_name: string;
  product_version: string;
  solution_type: TisSolutionType;
  environment: TisEnvironment;
  certification_status: TisCertificationStatus;
  kra_contact_email: string | null;
  sandbox_base_url: string;
  production_base_url: string;
  checklist: Record<string, boolean>;
  notes: string | null;
  updated_at: string;
};

export type TisVendorOnboardingRow = {
  id: string;
  supplier_id: string;
  onboarding_status: TisVendorOnboardingStatus;
  solution_type: TisSolutionType | null;
  onboarding_notes: string | null;
  admin_review_notes: string | null;
  certified_at: string | null;
  updated_at: string;
};

export type TisChecklistItem = {
  id: string;
  category: string;
  label: string;
  description: string;
  kraRef?: string;
};

/** KRA TIS third-party integrator certification requirements (OSCU/VSCU). */
export const TIS_INTEGRATOR_CHECKLIST: TisChecklistItem[] = [
  {
    id: "platform_registered",
    category: "Registration",
    label: "Integrator service request on eTIMS portal",
    description: "Complete biodata and required documents on etims.kra.go.ke as third-party vendor.",
    kraRef: "OSCU/VSCU Step-by-Step Guide §B",
  },
  {
    id: "sandbox_access",
    category: "Registration",
    label: "Sandbox environment access",
    description: "Configure Edge secrets for sandbox base URL (etims-api-sbx.kra.go.ke).",
  },
  {
    id: "oscu_vscu_init",
    category: "Initialization",
    label: "OSCU/VSCU device initialization",
    description: "TIS invokes initialization with PIN, branch office ID, and equipment serial; receives communication key.",
    kraRef: "Technical Specification — Initialization",
  },
  {
    id: "master_data_sync",
    category: "Master data",
    label: "Reference data endpoints",
    description: "Countries, currencies, qty/pack unit codes, item codes, branches, notices.",
  },
  {
    id: "item_registration",
    category: "Master data",
    label: "Item master registration (POST /items)",
    description: "Register and maintain vendor catalog items with KRA item codes and tax metadata.",
  },
  {
    id: "customer_registration",
    category: "Master data",
    label: "Customer registration (POST /customers)",
    description: "Register buyer KRA PINs and billing identity for B2B invoices.",
  },
  {
    id: "sales_invoice",
    category: "Transactions",
    label: "Sales invoice submission (POST /invoices, type S)",
    description: "Real-time/near-real-time transmission; receive SCU invoice number and verification URL.",
  },
  {
    id: "credit_note",
    category: "Transactions",
    label: "Credit note submission (POST /invoices, type R)",
    description: "Reverse or adjust prior sales with linked trader invoice reference.",
  },
  {
    id: "stock_sync",
    category: "Transactions",
    label: "Stock level sync (PUT /items/{code}/stocks)",
    description: "Keep inventory aligned with integrator item master where required.",
  },
  {
    id: "purchase_import_sync",
    category: "Transactions",
    label: "Purchase & import query sync",
    description: "Poll purchases/queries and imports/queries; convert and receive where applicable.",
  },
  {
    id: "fiscal_receipt_ui",
    category: "Compliance",
    label: "Fiscal receipt & QR verification",
    description: "Display KRA control unit invoice number, QR code, and verification URL to buyers.",
  },
  {
    id: "vendor_tis_identity",
    category: "Multi-vendor",
    label: "Per-vendor TIS identity (PIN, branch, device)",
    description: "Each supplier taxpayer has legal name, KRA PIN, branch code, and device serial on file.",
  },
  {
    id: "vendor_onboarding_workflow",
    category: "Multi-vendor",
    label: "Vendor onboarding workflow",
    description: "Draft → review → KRA pending → active lifecycle with admin audit trail.",
  },
  {
    id: "submission_audit",
    category: "Operations",
    label: "Submission audit & error handling",
    description: "Log success/failure per invoice; retry failed submissions; monitor etims_error on POs.",
  },
  {
    id: "secure_credentials",
    category: "Security",
    label: "Server-side integrator credentials",
    description: "Basic auth and communication keys in Edge secrets only — never in client or DB.",
  },
  {
    id: "production_cutover",
    category: "Go-live",
    label: "Production environment cutover",
    description: "Switch to etims-api.kra.go.ke after KRA certification and approved integrator listing.",
  },
];

export function defaultChecklistState(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const item of TIS_INTEGRATOR_CHECKLIST) {
    out[item.id] = false;
  }
  return out;
}

export function checklistProgress(checklist: Record<string, boolean>): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = TIS_INTEGRATOR_CHECKLIST.length;
  const completed = TIS_INTEGRATOR_CHECKLIST.filter((i) => checklist[i.id]).length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export const CERTIFICATION_STATUS_LABELS: Record<TisCertificationStatus, string> = {
  in_development: "In development",
  sandbox_testing: "Sandbox testing",
  submitted_to_kra: "Submitted to KRA",
  certified: "KRA certified",
  suspended: "Suspended",
};

export const ONBOARDING_STATUS_LABELS: Record<TisVendorOnboardingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  pending_kra: "Pending KRA",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
};
