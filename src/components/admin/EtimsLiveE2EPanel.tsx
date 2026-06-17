/**
 * Live eTIMS end-to-end testing with real suppliers, buyers, and catalog products.
 * One-way flow: sale invoices only (no credit notes during E2E).
 */

import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, ArrowRight, Landmark, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EtimsPurchaseOrderSubmitCard } from "@/components/admin/EtimsPurchaseOrderSubmitCard";
import { EtimsTestPanel } from "@/components/admin/EtimsTestPanel";
import { BuyerEtimsRegistryPanel } from "@/components/admin/BuyerEtimsRegistryPanel";
import { VendorEtimsTisRegistryPanel } from "@/components/admin/VendorEtimsTisRegistryPanel";
import { EtimsProductCodeCoverageCard } from "@/components/etims/EtimsProductCodeCoverageCard";
import { BulkEtimsCodesImportCard } from "@/components/etims/BulkEtimsCodesImportCard";
import { SupplierEtimsSettingsPanel } from "@/components/supplier/SupplierEtimsSettingsPanel";
import { assessSupplierEtimsReadiness } from "@/lib/etims/etimsReadiness";
import { cn } from "@/lib/utils";

export type EtimsLiveE2EPanelProps = {
  /** Supplier row id — supplier dashboard scopes PO submit + catalog */
  enforceSupplierId?: string | null;
  /** Admin vs supplier dashboard styling */
  variant?: "admin" | "supplier";
  isDarkMode?: boolean;
  textColor?: string;
  mutedText?: string;
  cardBg?: string;
  onOpenCatalogForEtims?: (catalogMaterialId: string) => void;
};

function ReadinessPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
      )}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export const EtimsLiveE2EPanel: React.FC<EtimsLiveE2EPanelProps> = ({
  enforceSupplierId,
  variant = "admin",
  isDarkMode = false,
  textColor = "",
  mutedText = "text-muted-foreground",
  cardBg = "",
  onOpenCatalogForEtims,
}) => {
  const isSupplier = variant === "supplier";
  const supplierId = enforceSupplierId?.trim() ?? "";

  const [supplierReady, setSupplierReady] = useState<boolean | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState(Boolean(supplierId));

  const loadSupplierReadiness = useCallback(async () => {
    if (!supplierId) {
      setSupplierReady(null);
      setLoadingSupplier(false);
      return;
    }
    setLoadingSupplier(true);
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("kra_pin,legal_business_name,company_name,etims_branch_code")
        .eq("id", supplierId)
        .maybeSingle();
      setSupplierReady(assessSupplierEtimsReadiness(data).ready);
    } catch {
      setSupplierReady(false);
    } finally {
      setLoadingSupplier(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void loadSupplierReadiness();
  }, [loadSupplierReadiness]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 to-sky-50/60 px-4 py-3 dark:border-emerald-800/40 dark:from-emerald-950/25 dark:to-sky-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-foreground">Live eTIMS end-to-end testing</p>
            <p className="text-xs text-muted-foreground">
              Configure real suppliers and buyers, map product item codes, then submit sale invoices to KRA via your
              integrator. <strong>One-way only</strong> — credit notes are disabled in this E2E path.
            </p>
          </div>
        </div>
        <Badge className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-700">Sale invoice → KRA</Badge>
      </div>

      <Alert>
        <ArrowRight className="h-4 w-4" />
        <AlertTitle>One-way test flow</AlertTitle>
        <AlertDescription className="text-sm">
          Supplier (taxpayer) issues a <strong>sale (S)</strong> invoice to a configured buyer. Use real catalog
          products with <code className="text-xs">etims_item_code</code> set. Credit notes and reversals are out of
          scope for this E2E panel.
        </AlertDescription>
      </Alert>

      {/* Step 1 — Supplier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1 · Supplier eTIMS profile</CardTitle>
          <CardDescription>
            KRA PIN, legal name, and branch code for the issuing taxpayer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSupplier && supplierId ? (
            <>
              {loadingSupplier ? (
                <div className={`flex items-center gap-2 text-sm ${mutedText}`}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking profile…
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <ReadinessPill ok={supplierReady === true} label={supplierReady ? "Supplier ready" : "Complete KRA profile below"} />
                </div>
              )}
              <SupplierEtimsSettingsPanel
                supplierRecordId={supplierId}
                isDarkMode={isDarkMode}
                textColor={textColor}
                mutedText={mutedText}
                cardBg={cardBg}
              />
            </>
          ) : (
            <VendorEtimsTisRegistryPanel />
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Buyers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2 · Buyer KRA billing</CardTitle>
          <CardDescription>
            Each builder / buyer needs KRA PIN and billing name for <code className="text-xs">customerPin</code> on
            invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BuyerEtimsRegistryPanel />
        </CardContent>
      </Card>

      {/* Step 3 — Product item codes */}
      {supplierId ? (
        <EtimsProductCodeCoverageCard
          supplierId={supplierId}
          onOpenCatalogForEtims={onOpenCatalogForEtims}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3 · Product item codes</CardTitle>
            <CardDescription>
              Products store KRA item codes on <code className="text-xs">materials.etims_item_code</code> and{" "}
              <code className="text-xs">supplier_product_prices.etims_item_code</code>. Use Material Images / My
              Materials to set codes per supplier catalog row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkEtimsCodesImportCard mode="admin" />
          </CardContent>
        </Card>
      )}

      {isSupplier && supplierId ? (
        <BulkEtimsCodesImportCard mode="supplier" supplierId={supplierId} onApplied={() => void loadSupplierReadiness()} />
      ) : null}

      {/* Step 4 — Submit sale invoice */}
      <EtimsPurchaseOrderSubmitCard
        stepNumber={4}
        enforceSupplierId={enforceSupplierId}
        invoiceCurrency="KES"
        invoiceExchangeRate={1}
        invoiceCountryCode="KE"
        oneWaySaleOnly
        onOpenCatalogForEtims={onOpenCatalogForEtims}
      />

      {/* Optional sandbox diagnostics */}
      <Accordion type="single" collapsible className="rounded-lg border">
        <AccordionItem value="sandbox" className="border-0">
          <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
            Advanced: integrator connection sandbox (optional)
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-4">
              Use only to verify Edge secrets and reference data. Live E2E submissions above use real purchase orders
              and configured parties.
            </p>
            <EtimsTestPanel
              enforceSupplierId={enforceSupplierId}
              onOpenCatalogForEtims={onOpenCatalogForEtims}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default EtimsLiveE2EPanel;
