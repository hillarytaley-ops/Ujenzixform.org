/**
 * UjenziXform third-party TIS integrator — platform identity, environment, certification checklist.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, Save, ShieldCheck } from "lucide-react";
import { TisCertificationChecklist } from "./TisCertificationChecklist";
import { syncPlatformCertificationChecklist } from "@/lib/etims/tisOnboardingWorkflow";
import {
  CERTIFICATION_STATUS_LABELS,
  defaultChecklistState,
  type TisCertificationStatus,
  type TisEnvironment,
  type TisIntegratorPlatform,
  type TisSolutionType,
} from "./types";
import { tis } from "./tisTheme";

function secretsDashboardUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const host = new URL(raw.trim()).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    const ref = m?.[1];
    return ref ? `https://supabase.com/dashboard/project/${ref}/settings/functions` : null;
  } catch {
    return null;
  }
}

export const TisIntegratorPlatformPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<TisIntegratorPlatform | null>(null);

  const [integratorName, setIntegratorName] = useState("");
  const [integratorPin, setIntegratorPin] = useState("");
  const [productName, setProductName] = useState("");
  const [productVersion, setProductVersion] = useState("");
  const [solutionType, setSolutionType] = useState<TisSolutionType>("OSCU");
  const [environment, setEnvironment] = useState<TisEnvironment>("sandbox");
  const [certStatus, setCertStatus] = useState<TisCertificationStatus>("in_development");
  const [kraEmail, setKraEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>(defaultChecklistState());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await syncPlatformCertificationChecklist();

      const { data, error } = await supabase
        .from("tis_integrator_platform")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      const p = data as TisIntegratorPlatform;
      setRow(p);
      setIntegratorName(p.integrator_name);
      setIntegratorPin(p.integrator_pin ?? "");
      setProductName(p.product_name);
      setProductVersion(p.product_version);
      setSolutionType(p.solution_type);
      setEnvironment(p.environment);
      setCertStatus(p.certification_status);
      setKraEmail(p.kra_contact_email ?? "");
      setNotes(p.notes ?? "");
      setChecklist({ ...defaultChecklistState(), ...(p.checklist ?? {}) });
    } catch (e: unknown) {
      toast({
        title: "Could not load platform config",
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

  const save = async () => {
    if (!row?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tis_integrator_platform")
        .update({
          integrator_name: integratorName.trim(),
          integrator_pin: integratorPin.trim() || null,
          product_name: productName.trim(),
          product_version: productVersion.trim(),
          solution_type: solutionType,
          environment,
          certification_status: certStatus,
          kra_contact_email: kraEmail.trim() || null,
          notes: notes.trim() || null,
          checklist,
        })
        .eq("id", row.id);

      if (error) throw error;
      toast({ title: "Platform config saved" });
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

  const toggleCheck = (id: string, checked: boolean) => {
    setChecklist((prev) => ({ ...prev, [id]: checked }));
  };

  const secretsUrl = secretsDashboardUrl();
  const activeBaseUrl =
    environment === "production"
      ? row?.production_base_url ?? "https://etims-api.kra.go.ke"
      : row?.sandbox_base_url ?? "https://etims-api-sbx.kra.go.ke";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading integrator platform…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${tis.banner}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className={tis.bannerTitle}>UjenziXform — KRA third-party TIS integrator</p>
            <p className={tis.bannerDesc}>
              Trader Invoicing System package for vendor taxpayers. OSCU/VSCU credentials live in Edge secrets — not
              here.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">
            {solutionType}
          </Badge>
          <Badge
            variant="outline"
            className={
              environment === "production"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }
          >
            {environment}
          </Badge>
          <Badge className="bg-slate-700 text-white hover:bg-slate-700">{CERTIFICATION_STATUS_LABELS[certStatus]}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={tis.card}>
          <CardHeader>
            <CardTitle className={tis.cardTitle}>Platform identity</CardTitle>
            <CardDescription className={tis.cardDesc}>
              Registered integrator product for KRA certification listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Integrator name</Label>
              <Input value={integratorName} onChange={(e) => setIntegratorName(e.target.value)} className={tis.input} />
            </div>
            <div className="space-y-2">
              <Label>Integrator KRA PIN</Label>
              <Input value={integratorPin} onChange={(e) => setIntegratorPin(e.target.value)} placeholder="P0XXXXXXXXX" className={`${tis.input} font-mono`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product name (TIS)</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} className={tis.input} />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={productVersion} onChange={(e) => setProductVersion(e.target.value)} className={tis.input} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Solution type</Label>
                <Select value={solutionType} onValueChange={(v) => setSolutionType(v as TisSolutionType)}>
                  <SelectTrigger className={tis.select}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OSCU">OSCU (online)</SelectItem>
                    <SelectItem value="VSCU">VSCU (virtual / bulk)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={environment} onValueChange={(v) => setEnvironment(v as TisEnvironment)}>
                  <SelectTrigger className={tis.select}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Certification status</Label>
              <Select value={certStatus} onValueChange={(v) => setCertStatus(v as TisCertificationStatus)}>
                <SelectTrigger className={tis.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CERTIFICATION_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KRA contact email</Label>
              <Input type="email" value={kraEmail} onChange={(e) => setKraEmail(e.target.value)} className={tis.input} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={tis.input} />
            </div>
            <div className={tis.infoBox}>
              Active API base: <code className={tis.code}>{activeBaseUrl}</code>
              {secretsUrl ? (
                <Button variant="link" size="sm" className="ml-2 h-auto p-0 text-indigo-600" asChild>
                  <a href={secretsUrl} target="_blank" rel="noreferrer">
                    Edge secrets <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                </Button>
              ) : null}
            </div>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save platform config
            </Button>
          </CardContent>
        </Card>

        <Card className={tis.card}>
          <CardHeader>
            <CardTitle className={tis.cardTitle}>KRA TIS certification checklist</CardTitle>
            <CardDescription className={tis.cardDesc}>
              Track integrator requirements per KRA OSCU/VSCU technical specification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TisCertificationChecklist checklist={checklist} onToggle={toggleCheck} />
            <Button type="button" className="mt-4" variant="secondary" onClick={() => void save()} disabled={saving}>
              Save checklist progress
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TisIntegratorPlatformPanel;
