/**
 * Shows how many catalog products have KRA eTIMS item codes mapped.
 */

import React, { useCallback, useEffect, useState } from "react";
import { PackageSearch, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeProductCodeCoverage } from "@/lib/etims/etimsReadiness";
import { useToast } from "@/hooks/use-toast";

export type EtimsProductCodeCoverageCardProps = {
  supplierId: string;
  onOpenCatalogForEtims?: (catalogMaterialId: string) => void;
  className?: string;
};

type ProductRow = {
  id: string;
  name: string;
  etims_item_code: string | null;
};

export const EtimsProductCodeCoverageCard: React.FC<EtimsProductCodeCoverageCardProps> = ({
  supplierId,
  onOpenCatalogForEtims,
  className,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProductRow[]>([]);

  const load = useCallback(async () => {
    if (!supplierId?.trim()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: materials, error: matErr } = await supabase
        .from("materials")
        .select("id,name,etims_item_code")
        .eq("supplier_id", supplierId.trim())
        .order("name", { ascending: true })
        .limit(500);

      if (matErr) throw matErr;

      const matRows = (materials ?? []) as ProductRow[];
      const missingIds = matRows.filter((m) => !(m.etims_item_code ?? "").trim()).map((m) => m.id);

      if (missingIds.length > 0) {
        const { data: sppRows } = await supabase
          .from("supplier_product_prices")
          .select("product_id,etims_item_code")
          .eq("supplier_id", supplierId.trim())
          .in("product_id", missingIds.slice(0, 200));

        const codeByProduct = new Map<string, string>();
        for (const row of sppRows ?? []) {
          const r = row as { product_id?: string; etims_item_code?: string | null };
          const code = (r.etims_item_code ?? "").trim();
          if (r.product_id && code) codeByProduct.set(r.product_id, code);
        }

        for (const m of matRows) {
          if (!(m.etims_item_code ?? "").trim() && codeByProduct.has(m.id)) {
            m.etims_item_code = codeByProduct.get(m.id) ?? null;
          }
        }
      }

      setRows(matRows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Could not load products", description: msg });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const coverage = computeProductCodeCoverage(rows);
  const missingRows = rows.filter((r) => !(r.etims_item_code ?? "").trim()).slice(0, 15);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-sky-600" />
              Product item codes
            </CardTitle>
            <CardDescription>
              Each product needs a KRA eTIMS <strong>item code</strong> on the catalog row (
              <code className="text-xs">materials.etims_item_code</code> or supplier price override).
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading catalog…
          </div>
        ) : coverage.total === 0 ? (
          <p className="text-sm text-muted-foreground">No products in your catalog yet. Add materials first.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={
                  coverage.missing === 0
                    ? "border-emerald-600/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-amber-600/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                }
              >
                {coverage.withCode} / {coverage.total} mapped ({coverage.pct}%)
              </Badge>
              {coverage.missing === 0 ? (
                <span className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All products have item codes
                </span>
              ) : (
                <span className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {coverage.missing} product(s) missing codes
                </span>
              )}
            </div>

            {missingRows.length > 0 && (
              <div className="rounded-md border max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Item code</TableHead>
                      {onOpenCatalogForEtims ? <TableHead className="w-24" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{row.name || row.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                        {onOpenCatalogForEtims ? (
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenCatalogForEtims(row.id)}>
                              Fix
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EtimsProductCodeCoverageCard;
