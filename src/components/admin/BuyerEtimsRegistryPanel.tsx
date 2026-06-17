/**
 * Admin: configure buyer (builder) KRA billing fields for eTIMS customerPin on invoices.
 */

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Loader2, Pencil, RefreshCw, Users } from "lucide-react";
import { assessBuyerEtimsReadiness } from "@/lib/etims/etimsReadiness";
import { kraPinValidationMessage, normalizeKraPin } from "@/lib/etims/kraPin";

type BuyerRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  company_name: string | null;
  billing_company_name: string | null;
  kra_pin: string | null;
  billing_address: string | null;
  procurement_contact_email: string | null;
};

export const BuyerEtimsRegistryPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BuyerRow[]>([]);
  const [filter, setFilter] = useState("");
  const [editRow, setEditRow] = useState<BuyerRow | null>(null);
  const [billingName, setBillingName] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [procEmail, setProcEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["builder", "professional_builder", "private_client"]);

      const buyerUserIds = [
        ...new Set(
          (roleRows ?? [])
            .map((r) => (r as { user_id?: string }).user_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      ];

      let query = supabase
        .from("profiles")
        .select(
          "id,user_id,full_name,company_name,billing_company_name,kra_pin,billing_address,procurement_contact_email",
        )
        .order("company_name", { ascending: true, nullsFirst: false })
        .limit(300);

      if (buyerUserIds.length > 0) {
        query = query.in("user_id", buyerUserIds.slice(0, 200));
      } else {
        query = query.or(
          "user_type.eq.builder,user_type.eq.professional_builder,user_type.eq.private_client,builder_category.not.is.null",
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setRows((data ?? []) as BuyerRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Could not load buyers", description: msg, variant: "destructive" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: BuyerRow) => {
    setEditRow(row);
    setBillingName((row.billing_company_name ?? row.company_name ?? row.full_name ?? "").trim());
    setKraPin((row.kra_pin ?? "").trim());
    setBillingAddress((row.billing_address ?? "").trim());
    setProcEmail((row.procurement_contact_email ?? "").trim());
  };

  const saveBuyer = async () => {
    if (!editRow) return;
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
        .eq("id", editRow.id);

      if (error) throw error;
      toast({ title: "Buyer updated", description: "KRA billing profile saved." });
      setEditRow(null);
      void load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => {
        const name = (r.billing_company_name ?? r.company_name ?? r.full_name ?? "").toLowerCase();
        const pin = (r.kra_pin ?? "").toLowerCase();
        return name.includes(q) || pin.includes(q);
      })
    : rows;

  const readyCount = rows.filter((r) => assessBuyerEtimsReadiness(r).ready).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Buyer KRA billing (builders)
              </CardTitle>
              <CardDescription>
                Buyers need a KRA PIN and billing name on their profile for eTIMS{" "}
                <code className="text-xs">customerPin</code> on tax invoices.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search buyer or KRA PIN…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              {readyCount} of {rows.length} buyers ready for eTIMS invoicing
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading buyers…
            </div>
          ) : (
            <div className="max-h-[min(18rem,45vh)] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>KRA PIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No buyers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => {
                      const ready = assessBuyerEtimsReadiness(row);
                      const label = row.billing_company_name ?? row.company_name ?? row.full_name ?? "—";
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm">{label}</TableCell>
                          <TableCell className="font-mono text-xs">{row.kra_pin ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={ready.ready ? "default" : "secondary"}>
                              {ready.ready ? "Ready" : "Incomplete"}
                            </Badge>
                          </TableCell>
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
      </Card>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit buyer KRA billing</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="buyer-billing-name">Billing / legal name</Label>
              <Input
                id="buyer-billing-name"
                className="mt-1"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="buyer-kra-pin">KRA PIN</Label>
              <Input
                id="buyer-kra-pin"
                className="mt-1 font-mono uppercase"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label htmlFor="buyer-billing-addr">Billing address</Label>
              <Input
                id="buyer-billing-addr"
                className="mt-1"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="buyer-proc-email">Procurement email</Label>
              <Input
                id="buyer-proc-email"
                type="email"
                className="mt-1"
                value={procEmail}
                onChange={(e) => setProcEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveBuyer()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuyerEtimsRegistryPanel;
