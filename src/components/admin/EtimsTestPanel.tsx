/**
 * Smoke-test for the eTIMS / VFD integrator via Edge `etims-proxy`.
 * Requires Edge secrets ETIMS_BASE_URL, ETIMS_BASIC_USER, ETIMS_BASIC_PASSWORD.
 */

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Landmark, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        <p className="text-xs text-muted-foreground">
          {rows!.length} option{rows!.length === 1 ? "" : "s"} loaded — search in the list above.
        </p>
      ) : null}
    </div>
  );
}

export type EtimsTestPanelProps = {
  /** Supplier row id: restricts PO submit to that supplier’s orders */
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

  const rawJson = lastPayload !== null ? JSON.stringify(lastPayload, null, 2) : "";

  const invoiceCurrencyForSubmit = selectedCurrencyCode.trim() || undefined;
  const invoiceCountryForSubmit = selectedCountryCode.trim() || undefined;

  return (
    <div className="space-y-4">
      <Alert className="border-border bg-muted/40 dark:bg-slate-950/60 dark:border-slate-700">
        <Landmark className="h-4 w-4" />
        <AlertTitle className="text-foreground">Integrator connection test</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Uses Edge <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">etims-proxy</code> (signed-in
          supplier or admin). Set credentials in Supabase
          {secretsUrl ? (
            <>
              {" "}
              (<a href={secretsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                Edge secrets
              </a>
              ).
            </>
          ) : (
            " (Edge secrets)."
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => run("Currencies", "currencies")}>
          {loading && lastLabel === "Currencies" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Load currencies
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => run("Countries", "countries")}>
          {loading && lastLabel === "Countries" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Load countries
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Selections for invoice test</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Load each list once. Use the searchable dropdowns to pick currency and (optionally) country. These values are
          passed into <span className="font-mono text-foreground">POST /invoices</span> when you submit a purchase order
          below (currency and exchange rate always; country only if selected — omit if your integrator rejects extra
          fields).
        </p>
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
            <p className="text-xs text-muted-foreground">Usually 1 when invoice currency matches your books.</p>
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
      </div>

      {lastPayload !== null && (
        <div className="space-y-3">
          {lastLabel && (
            <p className="text-sm font-medium text-foreground">
              Last request: <span className="text-muted-foreground">{lastLabel}</span>
            </p>
          )}

          {showTable ? (
            <details className="rounded-md border border-border bg-card">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40">
                Table preview (last request only, {parsed.rows!.length} rows)
              </summary>
              <div className="max-h-[min(24rem,55vh)] overflow-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-[100px]">Code</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      {hasDescriptionCol ? (
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows!.map((row, i) => (
                      <tr key={`${row.code}-${i}`} className="border-b border-border/60">
                        <td className="px-3 py-2 font-mono">{row.code}</td>
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
            <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              {parsed.message ?? "Request succeeded"} — no rows in this list.
            </div>
          ) : (
            <Alert variant={parsed.httpStatus !== null && parsed.httpStatus >= 400 ? "destructive" : "default"}>
              <AlertTitle className="text-foreground">Response</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {isRecord(lastPayload) && typeof lastPayload.message === "string"
                  ? lastPayload.message
                  : "Could not show as a table (unexpected shape). See raw JSON below."}
              </AlertDescription>
            </Alert>
          )}

          <details className="rounded-md border border-border bg-muted/30 text-sm">
            <summary className="cursor-pointer select-none px-3 py-2 font-medium text-foreground hover:bg-muted/50">
              Raw JSON (technical)
            </summary>
            <pre className="max-h-64 overflow-auto border-t border-border p-3 text-xs text-foreground">{rawJson}</pre>
          </details>
        </div>
      )}

      <div className="border-t border-border pt-6">
        <EtimsPurchaseOrderSubmitCard
          enforceSupplierId={enforceSupplierId}
          invoiceCurrency={invoiceCurrencyForSubmit}
          invoiceExchangeRate={exchangeRateNum}
          invoiceCountryCode={invoiceCountryForSubmit}
          onOpenCatalogForEtims={onOpenCatalogForEtims}
        />
      </div>
    </div>
  );
};

export default EtimsTestPanel;
