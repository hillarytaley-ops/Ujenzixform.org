/**
 * Smoke-test for the eTIMS / VFD integrator via Edge `etims-proxy`.
 * Requires Edge secrets ETIMS_BASE_URL, ETIMS_BASIC_USER, ETIMS_BASIC_PASSWORD.
 */

import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Coins,
  Globe2,
  HelpCircle,
  Landmark,
  ListOrdered,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { invokeEtimsProxy } from "@/lib/etims/invokeEtimsProxy";
import { EtimsPurchaseOrderSubmitCard } from "@/components/admin/EtimsPurchaseOrderSubmitCard";
import { cn } from "@/lib/utils";

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

type NameCodeRow = { name: string; code: string; description?: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asNameCodeRows(data: unknown): NameCodeRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows: NameCodeRow[] = [];
  for (const item of data) {
    if (!isRecord(item)) return null;
    const name = item.name;
    const code = item.code;
    if (typeof name !== "string" || typeof code !== "string") return null;
    const description = item.description;
    rows.push({
      name: name.trim(),
      code: code.trim(),
      description: typeof description === "string" ? description.trim() : undefined,
    });
  }
  return rows;
}

/** VFD `GET /items` — each row uses `itemCode` + `name` (not `code`). */
function asIntegratorItemCatalogRows(root: unknown): NameCodeRow[] {
  const rec = isRecord(root) ? root : null;
  const arr =
    rec && Array.isArray(rec.data)
      ? rec.data
      : Array.isArray(root)
        ? root
        : null;
  if (!arr) return [];
  const rows: NameCodeRow[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const code =
      typeof item.itemCode === "string"
        ? item.itemCode.trim()
        : typeof item.item_code === "string"
          ? item.item_code.trim()
          : "";
    if (!code) continue;
    const name =
      typeof item.name === "string" && item.name.trim() ? item.name.trim() : code;
    rows.push({ code, name });
  }
  return rows;
}

function extractIntegratorPayload(root: unknown): {
  httpStatus: number | null;
  statusCode: string | null;
  message: string | null;
  rows: NameCodeRow[] | null;
  raw: unknown;
} {
  if (!isRecord(root)) {
    return { httpStatus: null, statusCode: null, message: null, rows: null, raw: root };
  }
  const httpStatus = typeof root.status === "number" ? root.status : null;
  const statusCode = typeof root.statusCode === "string" ? root.statusCode : null;
  const message = typeof root.message === "string" ? root.message : null;
  const rows = asNameCodeRows(root.data);
  return { httpStatus, statusCode, message, rows, raw: root };
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">
      {n}
    </span>
  );
}

function EtimsListPicker({
  id,
  label,
  placeholder,
  rows,
  value,
  onChange,
  optionalClear,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  rows: NameCodeRow[] | null;
  value: string;
  onChange: (code: string) => void;
  optionalClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ready = Boolean(rows && rows.length > 0);
  const selected = rows?.find((r) => r.code === value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || !ready}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {!ready
                ? placeholder
                : optionalClear && !value
                  ? "— None —"
                  : selected
                    ? `${selected.code} — ${selected.name}`
                    : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(calc(100vw-2rem),24rem)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search code or name…" className="h-10" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {optionalClear ? (
                  <CommandItem
                    value="__clear__ none"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    None
                  </CommandItem>
                ) : null}
                {rows?.map((row) => (
                  <CommandItem
                    key={row.code}
                    value={`${row.code} ${row.name} ${row.description ?? ""}`}
                    onSelect={() => {
                      onChange(row.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === row.code ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs">{row.code}</span>
                    <span className="ml-2 min-w-0 flex-1 truncate">{row.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {ready ? (
        <p className="text-xs text-muted-foreground">{rows!.length} options loaded</p>
      ) : null}
    </div>
  );
}

export type EtimsTestPanelProps = {
  /** Supplier row id: restricts PO submit to that supplier's orders */
  enforceSupplierId?: string | null;
  /** Supplier dashboard: open My Materials for the catalog id from a failed submit */
  onOpenCatalogForEtims?: (catalogMaterialId: string) => void;
};

export const EtimsTestPanel: React.FC<EtimsTestPanelProps> = ({ enforceSupplierId, onOpenCatalogForEtims }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<unknown>(null);

  const [currencyRows, setCurrencyRows] = useState<NameCodeRow[] | null>(null);
  const [countryRows, setCountryRows] = useState<NameCodeRow[] | null>(null);
  const [itemCatalogRows, setItemCatalogRows] = useState<NameCodeRow[] | null>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [exchangeRateStr, setExchangeRateStr] = useState("1");

  const secretsUrl = secretsDashboardUrl();

  const parsed = useMemo(() => extractIntegratorPayload(lastPayload), [lastPayload]);
  const innerData = isRecord(lastPayload) ? lastPayload.data : undefined;
  const emptyList =
    parsed.httpStatus === 200 && Array.isArray(innerData) && innerData.length === 0;
  const showTable =
    parsed.httpStatus === 200 &&
    parsed.rows !== null &&
    parsed.rows.length > 0;
  const hasDescriptionCol = showTable && parsed.rows!.some((r) => r.description);

  const exchangeRateNum = useMemo(() => {
    const n = Number(exchangeRateStr.trim());
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [exchangeRateStr]);

  const run = async (label: string, path: string) => {
    setLoading(true);
    setLastLabel(label);
    setLastPayload(null);
    try {
      const res = await invokeEtimsProxy({ method: "GET", path });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "eTIMS proxy failed",
          description: `${res.status}: ${res.message}`,
        });
        setLastPayload({ status: res.status, message: res.message, data: res.data });
        return;
      }
      toast({ title: "OK", description: `${label} loaded successfully.` });
      setLastPayload(res.data);

      const ex = extractIntegratorPayload(res.data);
      if (ex.httpStatus === 200 && ex.rows && ex.rows.length > 0) {
        if (label === "Currencies") {
          setCurrencyRows(ex.rows);
          setSelectedCurrencyCode((prev) => {
            if (prev && ex.rows!.some((r) => r.code === prev)) return prev;
            const kes = ex.rows!.find((r) => r.code === "KES");
            return kes ? "KES" : ex.rows![0].code;
          });
        }
        if (label === "Countries") {
          setCountryRows(ex.rows);
          setSelectedCountryCode((prev) => {
            if (prev && ex.rows!.some((r) => r.code === prev)) return prev;
            const ke = ex.rows!.find((r) => r.code === "KE");
            return ke ? "KE" : ex.rows![0].code;
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Request error", description: msg });
      setLastPayload({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadIntegratorItems = async () => {
    setLoading(true);
    setLastLabel("Items");
    setLastPayload(null);
    try {
      const res = await invokeEtimsProxy({
        method: "GET",
        path: "items",
        query: { page: "0", limit: "100" },
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "eTIMS proxy failed",
          description: `${res.status}: ${res.message}`,
        });
        setLastPayload({ status: res.status, message: res.message, data: res.data });
        return;
      }
      toast({ title: "OK", description: "Integrator items loaded." });
      setLastPayload(res.data);
      const items = asIntegratorItemCatalogRows(res.data);
      setItemCatalogRows(items.length ? items : []);
      if (items.length === 0) {
        toast({
          title: "No items returned",
          description:
            "The integrator catalog may be empty. Register products with POST /items (Postman) or ask your OSCU vendor.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Request error", description: msg });
      setLastPayload({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  const rawJson = lastPayload !== null ? JSON.stringify(lastPayload, null, 2) : "";

  const invoiceCurrencyForSubmit = selectedCurrencyCode.trim() || undefined;
  const invoiceCountryForSubmit = selectedCountryCode.trim() || undefined;

  const connectionStatus = itemCatalogRows !== null
    ? itemCatalogRows.length > 0
      ? "connected"
      : "empty"
    : currencyRows || countryRows
      ? "partial"
      : "idle";

  return (
    <div className="space-y-5">
      {/* Compact intro */}
      <div className="flex flex-col gap-3 rounded-lg border border-sky-200/60 bg-gradient-to-r from-sky-50/80 to-cyan-50/50 px-4 py-3 dark:border-sky-800/40 dark:from-sky-950/30 dark:to-cyan-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-medium text-foreground">KRA eTIMS integrator sandbox</p>
            <p className="text-xs text-muted-foreground">
              Test your connection, then submit a purchase order as a tax invoice.
            </p>
          </div>
        </div>
        {secretsUrl ? (
          <Button variant="outline" size="sm" className="shrink-0 border-sky-300/60 bg-white/60 dark:bg-slate-900/40" asChild>
            <a href={secretsUrl} target="_blank" rel="noreferrer">
              Edge secrets
            </a>
          </Button>
        ) : null}
      </div>

      {/* Step 1 — Connection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StepBadge n={1} />
            <div>
              <CardTitle className="text-base">Test connection</CardTitle>
              <CardDescription>Load reference data from your integrator via the Edge proxy.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant={currencyRows ? "secondary" : "outline"}
              disabled={loading}
              className="h-auto justify-start gap-2 py-3"
              onClick={() => run("Currencies", "currencies")}
            >
              {loading && lastLabel === "Currencies" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Coins className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="text-left">
                <span className="block text-sm font-medium">Currencies</span>
                {currencyRows ? (
                  <span className="text-xs text-muted-foreground">{currencyRows.length} loaded</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Load list</span>
                )}
              </div>
            </Button>
            <Button
              type="button"
              variant={countryRows ? "secondary" : "outline"}
              disabled={loading}
              className="h-auto justify-start gap-2 py-3"
              onClick={() => run("Countries", "countries")}
            >
              {loading && lastLabel === "Countries" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Globe2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <div className="text-left">
                <span className="block text-sm font-medium">Countries</span>
                {countryRows ? (
                  <span className="text-xs text-muted-foreground">{countryRows.length} loaded</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Load list</span>
                )}
              </div>
            </Button>
            <Button
              type="button"
              variant={itemCatalogRows ? "secondary" : "outline"}
              disabled={loading}
              className="h-auto justify-start gap-2 py-3"
              onClick={() => void loadIntegratorItems()}
            >
              {loading && lastLabel === "Items" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <PackageSearch className="h-4 w-4 shrink-0 text-sky-600" />
              )}
              <div className="text-left">
                <span className="block text-sm font-medium">Item catalog</span>
                {itemCatalogRows ? (
                  <span className="text-xs text-muted-foreground">{itemCatalogRows.length} items</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Load codes</span>
                )}
              </div>
            </Button>
          </div>

          {connectionStatus !== "idle" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  connectionStatus === "connected" && "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
                  connectionStatus === "empty" && "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
                  connectionStatus === "partial" && "border-sky-500/50 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
                )}
              >
                {connectionStatus === "connected"
                  ? "Catalog ready"
                  : connectionStatus === "empty"
                    ? "Catalog empty — register items on integrator"
                    : "Partial — load item catalog next"}
              </Badge>
            </div>
          ) : null}

          {itemCatalogRows !== null && itemCatalogRows.length > 0 ? (
            <Accordion type="single" collapsible className="rounded-md border">
              <AccordionItem value="catalog" className="border-0">
                <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-muted-foreground" />
                    Integrator item codes ({itemCatalogRows.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <p className="px-4 pb-2 text-xs text-muted-foreground">
                    Copy each code into <strong>My Materials → eTIMS item code</strong> for automatic line mapping.
                  </p>
                  <div className="max-h-48 overflow-auto border-t">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 border-b bg-muted/40">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Code</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemCatalogRows.map((row) => (
                          <tr key={row.code} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                            <td className="px-4 py-2 text-sm">{row.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 2 — Invoice settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StepBadge n={2} />
            <div>
              <CardTitle className="text-base">Invoice settings</CardTitle>
              <CardDescription>Currency and exchange rate sent with each invoice submission.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <EtimsListPicker
              id="etims-pick-currency"
              label="Invoice currency"
              placeholder="Load currencies first…"
              rows={currencyRows}
              value={selectedCurrencyCode}
              onChange={setSelectedCurrencyCode}
              disabled={loading}
            />
            <div className="space-y-1.5">
              <Label htmlFor="etims-ex-rate">Exchange rate</Label>
              <Input
                id="etims-ex-rate"
                type="number"
                min={0.000001}
                step="any"
                value={exchangeRateStr}
                onChange={(e) => setExchangeRateStr(e.target.value)}
                disabled={!currencyRows?.length}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Use 1 when currency matches your books.</p>
            </div>
            <div className="sm:col-span-2">
              <EtimsListPicker
                id="etims-pick-country"
                label="Country code (optional)"
                placeholder="Load countries first…"
                rows={countryRows}
                value={selectedCountryCode}
                onChange={setSelectedCountryCode}
                optionalClear
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — Submit invoice (delegated) */}
      <EtimsPurchaseOrderSubmitCard
        stepNumber={3}
        enforceSupplierId={enforceSupplierId}
        invoiceCurrency={invoiceCurrencyForSubmit}
        invoiceExchangeRate={exchangeRateNum}
        invoiceCountryCode={invoiceCountryForSubmit}
        onOpenCatalogForEtims={onOpenCatalogForEtims}
      />

      {/* API response (collapsible) */}
      {lastPayload !== null && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last API response
              {lastLabel ? (
                <span className="ml-2 font-normal">— {lastLabel}</span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {showTable ? (
              <details className="rounded-md border">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium hover:bg-muted/40">
                  Table preview ({parsed.rows!.length} rows)
                </summary>
                <div className="max-h-48 overflow-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Code</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        {hasDescriptionCol ? (
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows!.map((row, i) => (
                        <tr key={`${row.code}-${i}`} className="border-b border-border/60">
                          <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          {hasDescriptionCol ? (
                            <td className="px-3 py-2 text-muted-foreground">{row.description ?? "—"}</td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : emptyList ? (
              <p className="rounded-md border bg-muted/30 px-3 py-3 text-center text-sm text-muted-foreground">
                {parsed.message ?? "Request succeeded"} — no rows returned.
              </p>
            ) : (
              <Alert variant={parsed.httpStatus !== null && parsed.httpStatus >= 400 ? "destructive" : "default"}>
                <AlertTitle>Response</AlertTitle>
                <AlertDescription>
                  {isRecord(lastPayload) && typeof lastPayload.message === "string"
                    ? lastPayload.message
                    : "Unexpected response shape — see raw JSON below."}
                </AlertDescription>
              </Alert>
            )}

            <details className="rounded-md border bg-muted/20 text-sm">
              <summary className="cursor-pointer select-none px-3 py-2 font-medium hover:bg-muted/40">
                Raw JSON
              </summary>
              <pre className="max-h-48 overflow-auto border-t p-3 text-xs">{rawJson}</pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Help accordion */}
      <Accordion type="single" collapsible className="rounded-lg border bg-muted/20">
        <AccordionItem value="help" className="border-0">
          <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              How eTIMS works on UjenziXform
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground">
            <ul className="list-disc space-y-2 pl-4">
              <li>
                Calls go through the Edge function <code className="rounded bg-muted px-1">etims-proxy</code> using your
                signed-in session. Credentials live in Supabase Edge secrets.
              </li>
              <li>
                Each invoice line needs an <code className="rounded bg-muted px-1">itemCode</code> registered on your
                integrator. Map codes in <strong>My Materials</strong> or register via{" "}
                <code className="rounded bg-muted px-1">POST /items</code>.
              </li>
              <li>
                Submissions use <code className="rounded bg-muted px-1">POST /invoices</code> and results are stored on{" "}
                <code className="rounded bg-muted px-1">purchase_orders</code> (<code className="rounded bg-muted px-1">etims_*</code>
                columns). Builders also get auto-submit when accepting a quote.
              </li>
              <li>Receipt URLs from the integrator can appear on the builder Invoices tab.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default EtimsTestPanel;
