/**
 * Admin: vendor onboarding for UjenziXform TIS integrator services.
 * Editable supplier TIS fields + onboarding workflow (draft → active).
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Pencil, PlugZap, RefreshCw, UserPlus, XCircle, Zap } from "lucide-react";
import { testEtimsIntegratorConnection } from "@/lib/etims/purchaseOrderEtims";
import {
  canTransitionTo,
  logOnboardingEvent,
  syncPlatformCertificationChecklist,
  WORKFLOW_ACTIONS,
} from "@/lib/etims/tisOnboardingWorkflow";
import { TisOscuInitializationCard } from "./TisOscuInitializationCard";
import { TisOnboardingEventsTimeline } from "./TisOnboardingEventsTimeline";
import {
  ONBOARDING_STATUS_LABELS,
  type TisSolutionType,
  type TisVendorOnboardingStatus,
} from "./types";

type SupplierRow = {
  id: string;
  company_name: string | null;
  legal_business_name: string | null;
  kra_pin: string | null;
  etims_branch_code: string | null;
  etims_business_place_code: string | null;
  etims_device_serial: string | null;
  etims_integrator_account_ref: string | null;
  etims_connection_notes: string | null;
  etims_last_connection_test_at: string | null;
  is_verified: boolean | null;
};

type OnboardingRow = {
  id: string;
  supplier_id: string;
  onboarding_status: TisVendorOnboardingStatus;
  solution_type: TisSolutionType | null;
  onboarding_notes: string | null;
  admin_review_notes: string | null;
  certified_at: string | null;
  initialized_at: string | null;
  communication_key_ref: string | null;
};

function tisReadiness(row: SupplierRow): "ready" | "partial" | "missing" {
  const pin = (row.kra_pin ?? "").trim();
  const branch = (row.etims_branch_code ?? "").trim();
  if (pin && branch) return "ready";
  if (pin || branch || (row.etims_integrator_account_ref ?? "").trim()) return "partial";
  return "missing";
}

export const TisVendorOnboardingPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [onboarding, setOnboarding] = useState<Map<string, OnboardingRow>>(new Map());
  const [filter, setFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [placeCode, setPlaceCode] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [integratorRef, setIntegratorRef] = useState("");
  const [connectionNotes, setConnectionNotes] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState<TisVendorOnboardingStatus>("draft");
  const [solutionType, setSolutionType] = useState<TisSolutionType>("OSCU");
  const [onboardingNotes, setOnboardingNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [initializedAt, setInitializedAt] = useState<string | null>(null);
  const [communicationKeyRef, setCommunicationKeyRef] = useState<string | null>(null);
  const [eventsKey, setEventsKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, obRes] = await Promise.all([
        supabase
          .from("suppliers")
          .select(
            "id,company_name,legal_business_name,kra_pin,etims_branch_code,etims_business_place_code,etims_device_serial,etims_integrator_account_ref,etims_connection_notes,etims_last_connection_test_at,is_verified",
          )
          .order("company_name", { ascending: true })
          .limit(500),
        supabase.from("tis_vendor_onboarding").select("*"),
      ]);

      if (supRes.error) throw supRes.error;
      if (obRes.error) throw obRes.error;

      setSuppliers((supRes.data ?? []) as SupplierRow[]);
      const map = new Map<string, OnboardingRow>();
      for (const row of (obRes.data ?? []) as OnboardingRow[]) {
        map.set(row.supplier_id, row);
      }
      setOnboarding(map);
    } catch (e: unknown) {
      toast({
        title: "Could not load vendors",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: SupplierRow) => {
    const ob = onboarding.get(row.id);
    setEditSupplier(row);
    setLegalName(row.legal_business_name ?? "");
    setKraPin(row.kra_pin ?? "");
    setBranchCode(row.etims_branch_code ?? "");
    setPlaceCode(row.etims_business_place_code ?? "");
    setDeviceSerial(row.etims_device_serial ?? "");
    setIntegratorRef(row.etims_integrator_account_ref ?? "");
    setConnectionNotes(row.etims_connection_notes ?? "");
    setOnboardingStatus(ob?.onboarding_status ?? "draft");
    setSolutionType(ob?.solution_type ?? "OSCU");
    setOnboardingNotes(ob?.onboarding_notes ?? "");
    setAdminNotes(ob?.admin_review_notes ?? "");
    setInitializedAt(ob?.initialized_at ?? null);
    setCommunicationKeyRef(ob?.communication_key_ref ?? null);
    setEventsKey((k) => k + 1);
    setEditOpen(true);
  };

  const identity = (): {
    legalBusinessName: string;
    kraPin: string;
    branchCode: string;
    deviceSerial: string;
    initializedAt: string | null;
  } => ({
    legalBusinessName: legalName,
    kraPin,
    branchCode,
    deviceSerial,
    initializedAt,
  });

  const applyWorkflowTransition = async (to: TisVendorOnboardingStatus) => {
    if (!editSupplier) return;
    const from = onboardingStatus;
    const err = canTransitionTo(from, to, identity());
    if (err) {
      toast({ title: "Cannot change status", description: err, variant: "destructive" });
      return;
    }
    setOnboardingStatus(to);
    toast({ title: `Status set to ${ONBOARDING_STATUS_LABELS[to]}`, description: "Save vendor to persist." });
  };

  const saveVendor = async () => {
    if (!editSupplier) return;

    const existing = onboarding.get(editSupplier.id);
    const prevStatus = existing?.onboarding_status ?? "draft";
    const transitionErr = canTransitionTo(prevStatus, onboardingStatus, identity());
    if (transitionErr && prevStatus !== onboardingStatus) {
      toast({ title: "Invalid status transition", description: transitionErr, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();

      const { error: supErr } = await supabase
        .from("suppliers")
        .update({
          legal_business_name: legalName.trim() || null,
          kra_pin: kraPin.trim() || null,
          etims_branch_code: branchCode.trim() || null,
          etims_business_place_code: placeCode.trim() || null,
          etims_device_serial: deviceSerial.trim() || null,
          etims_integrator_account_ref: integratorRef.trim() || null,
          etims_connection_notes: connectionNotes.trim() || null,
        })
        .eq("id", editSupplier.id);

      if (supErr) throw supErr;

      const obPayload: Record<string, unknown> = {
        supplier_id: editSupplier.id,
        onboarding_status: onboardingStatus,
        solution_type: solutionType,
        onboarding_notes: onboardingNotes.trim() || null,
        admin_review_notes: adminNotes.trim() || null,
        certified_at: onboardingStatus === "active" ? new Date().toISOString() : existing?.certified_at ?? null,
      };
      if (prevStatus !== onboardingStatus) {
        obPayload.last_status_changed_at = new Date().toISOString();
        obPayload.last_status_changed_by = auth.user?.id ?? null;
      }

      let onboardingId = existing?.id;
      if (existing) {
        const { error } = await supabase.from("tis_vendor_onboarding").update(obPayload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("tis_vendor_onboarding")
          .insert(obPayload)
          .select("id")
          .single();
        if (error) throw error;
        onboardingId = (inserted as { id: string }).id;
      }

      if (prevStatus !== onboardingStatus) {
        await logOnboardingEvent({
          supplierId: editSupplier.id,
          onboardingId,
          eventType: "status_change",
          fromStatus: prevStatus,
          toStatus: onboardingStatus,
          message: `Workflow: ${ONBOARDING_STATUS_LABELS[prevStatus]} → ${ONBOARDING_STATUS_LABELS[onboardingStatus]}`,
        });
      }

      await syncPlatformCertificationChecklist();

      toast({ title: "Vendor TIS profile saved" });
      setEditOpen(false);
      void load();
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const result = await testEtimsIntegratorConnection();
      if (!result.ok) {
        toast({ title: "Connection test failed", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Integrator connection OK", description: "GET branches succeeded via Edge proxy." });
    } finally {
      setTesting(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? suppliers.filter((r) => {
        const name = (r.company_name ?? r.legal_business_name ?? "").toLowerCase();
        return name.includes(q) || (r.kra_pin ?? "").toLowerCase().includes(q);
      })
    : suppliers;

  const activeCount = suppliers.filter((s) => onboarding.get(s.id)?.onboarding_status === "active").length;
  const readyCount = suppliers.filter((s) => tisReadiness(s) === "ready").length;

  return (
    <Card className="border-slate-700 bg-slate-900/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-400" />
              Vendor onboarding (TIS clients)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Onboard supplier taxpayers onto UjenziXform KRA Invoicing Services. Edit TIS identity and workflow status.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={testing} onClick={() => void runConnectionTest()}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Test integrator
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search company or KRA PIN…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm bg-slate-950/60"
          />
          <p className="text-xs text-muted-foreground">
            {activeCount} active · {readyCount} TIS-ready (PIN + branch) · {suppliers.length} total vendors
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading vendors…
          </div>
        ) : (
          <div className="max-h-[min(28rem,55vh)] overflow-auto rounded-md border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-gray-300">Vendor</TableHead>
                  <TableHead className="text-gray-300">KRA PIN</TableHead>
                  <TableHead className="text-gray-300">Branch</TableHead>
                  <TableHead className="text-gray-300">TIS readiness</TableHead>
                  <TableHead className="text-gray-300">Onboarding</TableHead>
                  <TableHead className="text-gray-300">OSCU/VSCU</TableHead>
                  <TableHead className="text-gray-300">Solution</TableHead>
                  <TableHead className="text-gray-300 w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No vendors match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const state = tisReadiness(row);
                    const ob = onboarding.get(row.id);
                    const status = ob?.onboarding_status ?? "draft";
                    return (
                      <TableRow key={row.id} className="border-slate-800">
                        <TableCell className="text-sm text-white">
                          {row.company_name || row.legal_business_name || row.id.slice(0, 8)}
                          {row.is_verified ? (
                            <Badge variant="outline" className="ml-2 border-emerald-600/50 text-emerald-400">
                              verified
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">{row.kra_pin || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">{row.etims_branch_code || "—"}</TableCell>
                        <TableCell>
                          {state === "ready" ? (
                            <Badge className="bg-emerald-700/80">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Ready
                            </Badge>
                          ) : state === "partial" ? (
                            <Badge variant="secondary">Partial</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-600/50 text-amber-400">
                              <XCircle className="mr-1 h-3 w-3" />
                              Missing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === "active" ? "default" : "outline"}>
                            {ONBOARDING_STATUS_LABELS[status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ob?.initialized_at ? (
                            <Badge variant="outline" className="border-emerald-600/50 text-emerald-400">
                              <Zap className="mr-1 h-3 w-3" />
                              Init OK
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-400 border-amber-600/50">
                              Not init
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">{ob?.solution_type ?? "—"}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor TIS onboarding</DialogTitle>
            <DialogDescription>
              {editSupplier?.company_name ?? editSupplier?.legal_business_name ?? "Supplier"} — identity, OSCU/VSCU
              init, then workflow to active for KRA sandbox demo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Legal business name</Label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>KRA PIN</Label>
                <Input value={kraPin} onChange={(e) => setKraPin(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Branch code</Label>
                <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Business place code</Label>
                <Input value={placeCode} onChange={(e) => setPlaceCode(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Device serial (dvcSrlNo)</Label>
                <Input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} className="font-mono" />
              </div>
            </div>

            {editSupplier ? (
              <TisOscuInitializationCard
                supplierId={editSupplier.id}
                onboardingId={onboarding.get(editSupplier.id)?.id}
                solutionType={solutionType}
                initialPin={kraPin}
                initialBranch={branchCode}
                initialSerial={deviceSerial}
                initializedAt={initializedAt}
                communicationKeyRef={communicationKeyRef}
                onInitialized={() => {
                  setInitializedAt(new Date().toISOString());
                  setEventsKey((k) => k + 1);
                  void load();
                }}
              />
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Workflow actions</Label>
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_ACTIONS.filter((a) => a.to !== onboardingStatus).map((action) => (
                  <Button
                    key={action.to}
                    type="button"
                    size="sm"
                    variant={action.variant ?? "outline"}
                    onClick={() => void applyWorkflowTransition(action.to)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Current: <strong>{ONBOARDING_STATUS_LABELS[onboardingStatus]}</strong> — Activate requires successful
                device initialization.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Integrator account ref</Label>
              <Input value={integratorRef} onChange={(e) => setIntegratorRef(e.target.value)} placeholder="Tenant / sub-account id" />
            </div>
            <div className="space-y-2">
              <Label>Connection notes</Label>
              <Textarea value={connectionNotes} onChange={(e) => setConnectionNotes(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Onboarding status</Label>
                <Select value={onboardingStatus} onValueChange={(v) => setOnboardingStatus(v as TisVendorOnboardingStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ONBOARDING_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Solution type</Label>
                <Select value={solutionType} onValueChange={(v) => setSolutionType(v as TisSolutionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OSCU">OSCU</SelectItem>
                    <SelectItem value="VSCU">VSCU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Onboarding notes</Label>
              <Textarea value={onboardingNotes} onChange={(e) => setOnboardingNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Admin review notes</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} />
            </div>

            <TisOnboardingEventsTimeline key={eventsKey} supplierId={editSupplier?.id ?? null} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveVendor()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TisVendorOnboardingPanel;
