/**
 * Builder self-service: KRA PIN and billing fields for eTIMS customerPin on supplier invoices.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Loader2 } from "lucide-react";
import { assessBuyerEtimsReadiness } from "@/lib/etims/etimsReadiness";
import { kraPinValidationMessage, normalizeKraPin } from "@/lib/etims/kraPin";

export const BuilderEtimsBillingPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [billingName, setBillingName] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [procEmail, setProcEmail] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,billing_company_name,company_name,full_name,kra_pin,billing_address,procurement_contact_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const row = data as Record<string, string | null> | null;
      if (!row) return;
      setProfileId(row.id as string);
      setBillingName(
        (row.billing_company_name as string) ||
          (row.company_name as string) ||
          (row.full_name as string) ||
          "",
      );
      setKraPin((row.kra_pin as string) || "");
      setBillingAddress((row.billing_address as string) || "");
      setProcEmail((row.procurement_contact_email as string) || user.email || "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Could not load billing profile", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!profileId) return;
    const pinErr = kraPinValidationMessage(kraPin);
    if (pinErr) {
      toast({ title: "Invalid KRA PIN", description: pinErr, variant: "destructive" });
      return;
    }
    if (!billingName.trim()) {
      toast({ title: "Billing name required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          billing_company_name: billingName.trim(),
          kra_pin: normalizeKraPin(kraPin),
          billing_address: billingAddress.trim() || null,
          procurement_contact_email: procEmail.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;
      toast({ title: "Saved", description: "Your KRA billing details are ready for eTIMS invoices." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading KRA billing…
      </div>
    );
  }

  const ready = assessBuyerEtimsReadiness({
    kra_pin: kraPin,
    billing_company_name: billingName,
    company_name: billingName,
  });

  return (
    <Card className="border-sky-200/60 dark:border-sky-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-5 w-5 text-sky-600" />
          KRA eTIMS billing (buyer)
        </CardTitle>
        <CardDescription>
          Suppliers use this KRA PIN and billing name when issuing tax invoices to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready.ready ? (
          <Alert>
            <AlertTitle>Complete your KRA billing profile</AlertTitle>
            <AlertDescription>
              Add your KRA PIN and billing name so suppliers can submit eTIMS invoices for your orders.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="builder-billing-name">Billing / company name</Label>
            <Input
              id="builder-billing-name"
              className="mt-1"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="builder-kra-pin">KRA PIN</Label>
            <Input
              id="builder-kra-pin"
              className="mt-1 font-mono uppercase"
              value={kraPin}
              onChange={(e) => setKraPin(e.target.value.toUpperCase())}
              placeholder="P051234567X"
            />
          </div>
          <div>
            <Label htmlFor="builder-proc-email">Procurement email</Label>
            <Input
              id="builder-proc-email"
              type="email"
              className="mt-1"
              value={procEmail}
              onChange={(e) => setProcEmail(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="builder-billing-addr">Billing address</Label>
            <Input
              id="builder-billing-addr"
              className="mt-1"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
            />
          </div>
        </div>

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save KRA billing
        </Button>
      </CardContent>
    </Card>
  );
};

export default BuilderEtimsBillingPanel;
