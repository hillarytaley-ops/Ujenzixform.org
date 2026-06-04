/**
 * Bulk apply KRA eTIMS item codes from CSV (id, etims_item_code).
 * Admin: updates admin_material_images + materials by id.
 * Supplier: updates materials (own rows) and optionally supplier_product_prices by product_id.
 */

import React, { useState, useRef } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseBulkEtimsCsv } from "@/lib/etims/parseBulkEtimsCsv";

const BATCH = 20;

export type BulkEtimsCodesImportCardProps = {
  mode: "admin" | "supplier";
  /** Required when mode === "supplier" */
  supplierId?: string | null;
  className?: string;
  onApplied?: () => void;
};

export const BulkEtimsCodesImportCard: React.FC<BulkEtimsCodesImportCardProps> = ({
  mode,
  supplierId,
  className,
  onApplied,
}) => {
  const { toast } = useToast();
  const fileRefMaterials = useRef<HTMLInputElement>(null);
  const fileRefPrices = useRef<HTMLInputElement>(null);
  const [materialsCsv, setMaterialsCsv] = useState("");
  const [pricesCsv, setPricesCsv] = useState("");
  const [busy, setBusy] = useState(false);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>, which: "materials" | "prices") => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = typeof reader.result === "string" ? reader.result : "";
      if (which === "materials") setMaterialsCsv(t);
      else setPricesCsv(t);
    };
    reader.readAsText(f, "UTF-8");
  };

  const applyAdmin = async () => {
    const { rows, errors } = parseBulkEtimsCsv(materialsCsv);
    if (errors.length && rows.length === 0) {
      toast({ variant: "destructive", title: "Invalid CSV", description: errors.slice(0, 5).join(" ") });
      return;
    }
    setBusy(true);
    let writeErrors = 0;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (r) => {
            const ts = new Date().toISOString();
            const { error: e1 } = await supabase
              .from("admin_material_images")
              .update({ etims_item_code: r.code, updated_at: ts })
              .eq("id", r.id);
            if (e1) writeErrors++;
            const { error: e2 } = await supabase
              .from("materials")
              .update({ etims_item_code: r.code, updated_at: ts })
              .eq("id", r.id);
            if (e2) writeErrors++;
          }),
        );
      }
      toast({
        title: "Bulk eTIMS apply finished",
        description: `${rows.length} id(s) processed.${writeErrors ? ` Some writes failed (${writeErrors}); check ids and admin RLS.` : ""}`,
      });
      onApplied?.();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Bulk apply failed",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const applySupplier = async () => {
    const sid = supplierId?.trim();
    if (!sid) {
      toast({ variant: "destructive", title: "Missing supplier", description: "Cannot run bulk import without supplier scope." });
      return;
    }
    const { rows, errors } = parseBulkEtimsCsv(materialsCsv);
    if (errors.length && rows.length === 0) {
      toast({ variant: "destructive", title: "Invalid CSV", description: errors.slice(0, 5).join(" ") });
      return;
    }
    setBusy(true);
    let matErrs = 0;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (r) => {
            const ts = new Date().toISOString();
            const { error } = await supabase
              .from("materials")
              .update({ etims_item_code: r.code, updated_at: ts })
              .eq("id", r.id)
              .eq("supplier_id", sid);
            if (error) matErrs++;
          }),
        );
      }

      let priceErrs = 0;
      let priceRows = 0;
      const priceTrim = pricesCsv.trim();
      if (priceTrim) {
        const parsed = parseBulkEtimsCsv(priceTrim);
        priceRows = parsed.rows.length;
        for (let i = 0; i < parsed.rows.length; i += BATCH) {
          const slice = parsed.rows.slice(i, i + BATCH);
          await Promise.all(
            slice.map(async (r) => {
              const ts = new Date().toISOString();
              const { error } = await supabase
                .from("supplier_product_prices")
                .update({ etims_item_code: r.code, updated_at: ts })
                .eq("supplier_id", sid)
                .eq("product_id", r.id);
              if (error) priceErrs++;
            }),
          );
        }
      }

      toast({
        title: "Bulk eTIMS apply finished",
        description: [
          `${rows.length} material id(s) in CSV processed.`,
          priceRows ? ` ${priceRows} supplier_product_prices row(s) attempted.` : "",
          matErrs || priceErrs ? " Some writes failed (check ids, ownership, or RLS)." : "",
        ]
          .filter(Boolean)
          .join(""),
      });
      onApplied?.();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Bulk apply failed",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "admin" ? "Bulk eTIMS codes (admin)" : "Bulk eTIMS codes (your catalog)";
  const desc =
    mode === "admin"
      ? "Each line: catalog UUID, then KRA item code. Updates admin_material_images and materials for the same id when rows exist."
      : "First block: materials.id, etims_item_code (only your supplier_id). Optional second block: product_id, etims_item_code for supplier_product_prices.";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <AlertTitle className="text-sm">Official codes only</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            Paste codes your business already received from KRA / OSCU (or your integrator). This tool does not create valid KRA identifiers.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium">
              {mode === "admin" ? "CSV: id, etims_item_code" : "CSV: materials.id, etims_item_code"}
            </Label>
            <div className="flex gap-2">
              <input
                ref={fileRefMaterials}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onPickFile(e, "materials")}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => fileRefMaterials.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />
                Load .csv
              </Button>
            </div>
          </div>
          <Textarea
            value={materialsCsv}
            onChange={(e) => setMaterialsCsv(e.target.value)}
            placeholder={'id,etims_item_code\n<uuid>,<code from integrator>'}
            className="min-h-[120px] font-mono text-xs"
            spellCheck={false}
          />
        </div>

        {mode === "supplier" && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-medium">Optional: supplier_product_prices (product_id, etims_item_code)</Label>
              <input
                ref={fileRefPrices}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onPickFile(e, "prices")}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => fileRefPrices.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />
                Load .csv
              </Button>
            </div>
            <Textarea
              value={pricesCsv}
              onChange={(e) => setPricesCsv(e.target.value)}
              placeholder="Only rows for your supplier_id are updated."
              className="min-h-[80px] font-mono text-xs"
              spellCheck={false}
            />
          </div>
        )}

        <Button type="button" disabled={busy || !materialsCsv.trim()} onClick={() => void (mode === "admin" ? applyAdmin() : applySupplier())}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Apply to database
        </Button>
      </CardContent>
    </Card>
  );
};
