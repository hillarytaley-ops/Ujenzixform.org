/**
 * Vendor onboarding workflow: status transitions, audit events, certification checklist sync.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  defaultChecklistState,
  type TisVendorOnboardingStatus,
} from "@/components/admin/tis-integrator/types";

export type VendorTisIdentity = {
  legalBusinessName?: string | null;
  kraPin?: string | null;
  branchCode?: string | null;
  deviceSerial?: string | null;
  initializedAt?: string | null;
};

const STATUS_ORDER: TisVendorOnboardingStatus[] = [
  "draft",
  "pending_review",
  "pending_kra",
  "active",
  "suspended",
  "rejected",
];

export function canTransitionTo(
  from: TisVendorOnboardingStatus,
  to: TisVendorOnboardingStatus,
  identity: VendorTisIdentity,
): string | null {
  if (from === to) return null;
  if (to === "rejected" || to === "suspended") return null;

  if (to === "pending_review") {
    if (!(identity.legalBusinessName ?? "").trim()) return "Legal business name is required.";
    if (!(identity.kraPin ?? "").trim()) return "KRA PIN is required.";
    if (!(identity.branchCode ?? "").trim()) return "Branch code is required.";
  }

  if (to === "pending_kra") {
    const err = canTransitionTo(from, "pending_review", identity);
    if (err && from === "draft") return err;
  }

  if (to === "active") {
    if (!(identity.kraPin ?? "").trim()) return "KRA PIN is required to activate.";
    if (!(identity.branchCode ?? "").trim()) return "Branch code is required to activate.";
    if (!(identity.deviceSerial ?? "").trim()) return "Device serial is required to activate.";
    if (!identity.initializedAt) {
      return "OSCU/VSCU initialization must succeed before activating vendor (run Initialize device).";
    }
  }

  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  if (fromIdx >= 0 && toIdx >= 0 && to !== "active" && toIdx > fromIdx + 1 && to !== "pending_kra") {
    return `Move to ${to} step-by-step through the workflow.`;
  }

  return null;
}

export async function logOnboardingEvent(input: {
  supplierId: string;
  onboardingId?: string | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  message?: string | null;
  metadata?: unknown;
}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("tis_vendor_onboarding_events").insert({
      supplier_id: input.supplierId,
      onboarding_id: input.onboardingId ?? null,
      event_type: input.eventType,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      message: input.message ?? null,
      metadata: (input.metadata ?? null) as object | null,
      created_by: auth.user?.id ?? null,
    });
  } catch {
    /* best-effort audit */
  }
}

export type ChecklistAutoState = {
  oscu_vscu_init: boolean;
  vendor_onboarding_workflow: boolean;
};

export async function computeChecklistAutoState(): Promise<ChecklistAutoState> {
  const { data: activeRows } = await supabase
    .from("tis_vendor_onboarding")
    .select("supplier_id, initialized_at, onboarding_status")
    .eq("onboarding_status", "active")
    .not("initialized_at", "is", null);

  const { data: initRows } = await supabase
    .from("tis_vendor_onboarding")
    .select("id")
    .not("initialized_at", "is", null)
    .limit(1);

  const hasInit = (initRows ?? []).length > 0;
  let hasWorkflow = false;

  for (const row of activeRows ?? []) {
    const { count } = await supabase
      .from("tis_vendor_onboarding_events")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", row.supplier_id)
      .eq("event_type", "status_change");
    if ((count ?? 0) >= 1) {
      hasWorkflow = true;
      break;
    }
  }

  return {
    oscu_vscu_init: hasInit,
    vendor_onboarding_workflow: hasWorkflow,
  };
}

/** Merge auto-detected checklist flags into platform row and persist. */
export async function syncPlatformCertificationChecklist(): Promise<void> {
  const auto = await computeChecklistAutoState();
  const { data: platform } = await supabase.from("tis_integrator_platform").select("id,checklist").limit(1).maybeSingle();
  if (!platform?.id) return;

  const checklist = {
    ...defaultChecklistState(),
    ...((platform.checklist as Record<string, boolean>) ?? {}),
    ...auto,
  };

  await supabase.from("tis_integrator_platform").update({ checklist }).eq("id", platform.id);
}

export const WORKFLOW_ACTIONS: {
  label: string;
  to: TisVendorOnboardingStatus;
  variant?: "default" | "outline" | "secondary" | "destructive";
}[] = [
  { label: "Submit for review", to: "pending_review", variant: "secondary" },
  { label: "Send to KRA pending", to: "pending_kra", variant: "secondary" },
  { label: "Activate vendor", to: "active", variant: "default" },
  { label: "Suspend", to: "suspended", variant: "destructive" },
  { label: "Reject", to: "rejected", variant: "destructive" },
];
