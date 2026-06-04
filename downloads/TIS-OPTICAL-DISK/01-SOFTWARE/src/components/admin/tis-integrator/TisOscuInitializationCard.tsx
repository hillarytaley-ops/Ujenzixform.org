/**
 * OSCU/VSCU device initialization card — KRA selectInitOsdcInfo / integrator initialize.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, KeyRound, Loader2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  invokeOscuInitialization,
  validateOscuInitFields,
  type OscuInitRequest,
} from "@/lib/etims/tisOscuInitialization";
import { tis } from "./tisTheme";
import { logOnboardingEvent, syncPlatformCertificationChecklist } from "@/lib/etims/tisOnboardingWorkflow";
import type { TisSolutionType } from "./types";

export type TisOscuInitializationCardProps = {
  supplierId: string;
  onboardingId?: string | null;
  solutionType: TisSolutionType;
  initialPin?: string;
  initialBranch?: string;
  initialSerial?: string;
  initializedAt?: string | null;
  communicationKeyRef?: string | null;
  onInitialized?: () => void;
};

export const TisOscuInitializationCard: React.FC<TisOscuInitializationCardProps> = ({
  supplierId,
  onboardingId,
  solutionType,
  initialPin = "",
  initialBranch = "",
  initialSerial = "",
  initializedAt,
  communicationKeyRef,
  onInitialized,
}) => {
  const { toast } = useToast();
  const [tin, setTin] = useState(initialPin);
  const [bhfId, setBhfId] = useState(initialBranch);
  const [dvcSrlNo, setDvcSrlNo] = useState(initialSerial);
  const [loading, setLoading] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);

  React.useEffect(() => {
    setTin(initialPin);
    setBhfId(initialBranch);
    setDvcSrlNo(initialSerial);
  }, [initialPin, initialBranch, initialSerial]);

  const runInit = async () => {
    const req: OscuInitRequest = { tin, bhfId, dvcSrlNo };
    const validationError = validateOscuInitFields(req);
    if (validationError) {
      toast({ title: "Validation", description: validationError, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await invokeOscuInitialization(req, solutionType);
      setLastPath(result.path);

      if (!result.ok) {
        await logOnboardingEvent({
          supplierId,
          onboardingId,
          eventType: solutionType === "VSCU" ? "vscu_init" : "oscu_init",
          message: result.message,
          metadata: result.redactedResponse,
        });
        toast({ title: "Initialization failed", description: result.message, variant: "destructive" });
        return;
      }

      const now = new Date().toISOString();

      await supabase.from("suppliers").update({
        kra_pin: tin.trim(),
        etims_branch_code: bhfId.trim(),
        etims_device_serial: dvcSrlNo.trim(),
        etims_last_connection_test_at: now,
        etims_last_connection_test_result: result.redactedResponse as object,
      }).eq("id", supplierId);

      const obPayload = {
        supplier_id: supplierId,
        initialized_at: now,
        communication_key_ref: result.communicationKeyRef,
        init_device_id: result.deviceId,
        init_branch_name: result.branchName,
        init_response_snapshot: result.redactedResponse as object,
        solution_type: solutionType,
      };

      if (onboardingId) {
        await supabase.from("tis_vendor_onboarding").update(obPayload).eq("id", onboardingId);
      } else {
        await supabase.from("tis_vendor_onboarding").upsert(
          { ...obPayload, onboarding_status: "draft" },
          { onConflict: "supplier_id" },
        );
      }

      await logOnboardingEvent({
        supplierId,
        onboardingId,
        eventType: solutionType === "VSCU" ? "vscu_init" : "oscu_init",
        message: result.message,
        metadata: { path: result.path, keyRef: result.communicationKeyRef },
      });

      await syncPlatformCertificationChecklist();

      toast({
        title: "Device initialized",
        description: result.communicationKeyRef
          ? `Communication key received (ref ${result.communicationKeyRef}). Store full key in Edge secrets.`
          : "Initialization succeeded — verify response in audit log.",
      });
      onInitialized?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${tis.initCard}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`${tis.initTitle} flex items-center gap-2`}>
            <Radio className="h-4 w-4 text-sky-600" />
            {solutionType} device initialization
          </p>
          <p className={tis.initDesc}>
            KRA spec: POST <code className={tis.code}>selectInitOsdcInfo</code> with tin, bhfId, dvcSrlNo. Falls back
            to <code className={tis.code}>initialize</code> for integrator wrappers.
          </p>
        </div>
        {initializedAt ? (
          <Badge className="bg-emerald-700/80 shrink-0">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Initialized
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">KRA PIN (tin)</Label>
          <Input value={tin} onChange={(e) => setTin(e.target.value)} className={`font-mono ${tis.input}`} placeholder="P0XXXXXXXXX" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Branch (bhfId)</Label>
          <Input value={bhfId} onChange={(e) => setBhfId(e.target.value)} className={`font-mono ${tis.input}`} placeholder="00" maxLength={2} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Device serial (dvcSrlNo)</Label>
          <Input value={dvcSrlNo} onChange={(e) => setDvcSrlNo(e.target.value)} className={`font-mono ${tis.input}`} placeholder="KRA-approved serial" />
        </div>
      </div>

      {communicationKeyRef ? (
        <Alert className="border-emerald-200 bg-emerald-50">
          <KeyRound className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800">Communication key ref</AlertTitle>
          <AlertDescription className="text-xs text-emerald-700">
            {communicationKeyRef} — full cmcKey belongs in Supabase Edge secrets only, not in the database.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" size="sm" disabled={loading} onClick={() => void runInit()}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
        Initialize {solutionType} device
      </Button>
      {lastPath ? <p className="text-[10px] text-muted-foreground">Last path: {lastPath}</p> : null}
    </div>
  );
};

export default TisOscuInitializationCard;
