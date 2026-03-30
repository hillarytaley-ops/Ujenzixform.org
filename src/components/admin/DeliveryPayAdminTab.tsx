import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MobileHorizontalScroll } from '@/components/ui/mobile-horizontal-scroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Route, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProviderMileageRow {
  provider_id: string;
  provider_name: string | null;
  total_round_trip_km: number;
  rate_per_km: number;
  total_amount: number;
  delivery_count: number;
}

/** True only when DB really lacks migration objects — not timeouts or generic failures */
function isMissingMigrationError(err: { message?: string; code?: string; details?: string } | null): boolean {
  if (!err) return false;
  const msg = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase();
  const code = String(err.code ?? '');
  if (code === 'PGRST202') return true;
  if (code === '42883' || code === '42P01') return true;
  if (/function .* does not exist|relation .* does not exist|could not find the function/i.test(msg)) return true;
  if (/schema cache/i.test(msg)) return true;
  return false;
}

function accessTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return (
      (p.access_token as string) ||
      ((p.currentSession as { access_token?: string })?.access_token) ||
      ((p.session as { access_token?: string })?.access_token) ||
      null
    );
  } catch {
    return null;
  }
}

/** Same approach as DeliveryPayTab: native fetch avoids hung supabase-js RPC. */
const ADMIN_MILEAGE_FETCH_MS = 60000;

async function postAdminMileagePayRpc(signal: AbortSignal): Promise<Response> {
  const token = accessTokenFromStorage();
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_get_all_providers_mileage_pay`, {
    method: 'POST',
    headers,
    body: '{}',
    signal,
  });
}

async function fetchRatePerKmRest(): Promise<number | null> {
  const token = accessTokenFromStorage();
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/delivery_mileage_config?select=rate_per_km&order=updated_at.desc&limit=1`,
    { headers }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { rate_per_km?: number }[];
  const row = Array.isArray(data) ? data[0] : null;
  return row?.rate_per_km != null ? Number(row.rate_per_km) : null;
}

export const DeliveryPayAdminTab: React.FC = () => {
  const [rows, setRows] = useState<ProviderMileageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [ratePerKm, setRatePerKm] = useState<string>('50');
  const [savingRate, setSavingRate] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setMigrationNeeded(false);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ADMIN_MILEAGE_FETCH_MS);
    try {
      const res = await postAdminMileagePayRpc(controller.signal);
      window.clearTimeout(timeoutId);

      const text = await res.text();
      let parsed: { code?: string; message?: string; details?: string } = {};
      if (text.startsWith('{')) {
        try {
          parsed = JSON.parse(text) as typeof parsed;
        } catch {
          /* ignore */
        }
      }

      if (res.status === 401) {
        throw new Error('Session expired or not signed in. Sign out and sign back in, then open DeliveryPay again.');
      }

      if (!res.ok) {
        const synthetic = {
          message: `${parsed.message ?? ''} ${text}`,
          code: parsed.code,
          details: parsed.details,
        };
        if (isMissingMigrationError(synthetic)) {
          setRows([]);
          setMigrationNeeded(true);
          return;
        }
        throw new Error(parsed.message || text || `HTTP ${res.status}`);
      }

      let payData: ProviderMileageRow[] = [];
      if (text) {
        try {
          const j = JSON.parse(text) as unknown;
          payData = Array.isArray(j) ? j : [];
        } catch {
          throw new Error('Invalid response from admin mileage pay RPC');
        }
      }
      setRows(payData);
      setMigrationNeeded(false);

      try {
        const rate = await fetchRatePerKmRest();
        if (rate != null) setRatePerKm(String(rate));
      } catch {
        /* rate is optional */
      }
    } catch (e: unknown) {
      window.clearTimeout(timeoutId);
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
        setRows([]);
        setError(
          'Request timed out after 60s. If Supabase shows outstanding invoices or the project was paused, fix that first. Otherwise try Refresh or restart the Supabase project briefly.'
        );
        setMigrationNeeded(false);
      } else {
        setError(err.message);
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRate = async () => {
    const rate = parseFloat(ratePerKm);
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid rate (number ≥ 0)');
      return;
    }
    setSavingRate(true);
    const timeoutMs = 30000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out. Check connection and Supabase project status, then try again.')), timeoutMs)
    );
    try {
      const savePromise = (async () => {
        const { data: existing, error: selErr } = await supabase
          .from('delivery_mileage_config')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (selErr) throw selErr;
        if (existing?.id) {
          const { error: updateErr } = await supabase
            .from('delivery_mileage_config')
            .update({ rate_per_km: rate, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('delivery_mileage_config')
            .insert({ rate_per_km: rate, currency: 'KES' });
          if (insertErr) throw insertErr;
        }
        toast.success(`Rate updated to ${rate} KES/km`);
        setShowRateForm(false);
        void fetchData();
      })();
      await Promise.race([savePromise, timeoutPromise]);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? String(e);
      toast.error(msg || 'Failed to save rate');
      setShowRateForm(true);
    } finally {
      setSavingRate(false);
    }
  };

  const grandTotalKm = rows.reduce((s, r) => s + Number(r.total_round_trip_km || 0), 0);
  const grandTotalAmount = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const currentRate = rows[0]?.rate_per_km ?? (parseFloat(ratePerKm) || 50);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-500 mr-2" />
          <span className="text-gray-500">Loading delivery pay data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                DeliveryPay
              </CardTitle>
              <CardDescription>
                Mileage and pay by provider. Round trip = supplier → delivery → supplier. Admin sets rate per km.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showRateForm ? (
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="text-xs">KES per km</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={ratePerKm}
                      onChange={(e) => setRatePerKm(e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveRate} disabled={savingRate}>
                    {savingRate ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowRateForm(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Rate: <strong className="text-slate-900 dark:text-slate-100">{currentRate} KES/km</strong>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setShowRateForm(true)}>
                    <Settings className="h-4 w-4 mr-1" />
                    Edit rate
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {migrationNeeded && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm space-y-2">
              <p>
                <strong>Setup required.</strong> Run the delivery mileage migration in Supabase SQL Editor. See{' '}
                <code className="bg-amber-200 dark:bg-amber-900/50 px-1 rounded text-amber-950 dark:text-amber-100">supabase/DELIVERY_MILEAGE_PAY_MIGRATION.sql</code>.
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-xs">
                If you already ran it, open <strong>Supabase → Project Settings → API</strong> and click <strong>Reload schema</strong> so PostgREST picks up the new RPC, then use Refresh above.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">Total round-trip distance (all providers)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{grandTotalKm.toFixed(1)} km</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">Total mileage pay (all providers)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">KES {grandTotalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3 text-slate-900 dark:text-slate-100">Providers</h4>
            {rows.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">No delivered orders yet. Provider mileage will appear here.</p>
            ) : (
              <MobileHorizontalScroll className="rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Provider
                      </th>
                      <th
                        className="text-right py-2.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        title="Number of deliveries"
                      >
                        <span className="hidden sm:inline">Deliveries</span>
                        <span className="inline sm:hidden">#</span>
                      </th>
                      <th
                        className="text-right py-2.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        title="Round-trip kilometers"
                      >
                        <span className="hidden sm:inline">Round-trip km</span>
                        <span className="inline sm:hidden">R-trip km</span>
                      </th>
                      <th
                        className="text-right py-2.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        title="Rate per kilometer (KES)"
                      >
                        <span className="hidden sm:inline">Rate (KES/km)</span>
                        <span className="inline sm:hidden">Rate</span>
                      </th>
                      <th
                        className="text-right py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        title="Total pay (KES)"
                      >
                        <span className="hidden sm:inline">Pay (KES)</span>
                        <span className="inline sm:hidden">Pay</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.provider_id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-2 sm:px-3 text-slate-900 dark:text-slate-100 max-w-[10rem] sm:max-w-none">
                          <div className="flex items-center gap-2 min-w-0">
                            <Route className="h-4 w-4 shrink-0 text-teal-500" aria-hidden />
                            <span className="truncate text-xs sm:text-sm" title={r.provider_name || undefined}>
                              {r.provider_name || `Provider ${r.provider_id?.slice(0, 8)}`}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-1 sm:px-2 tabular-nums">{r.delivery_count}</td>
                        <td className="text-right py-2.5 px-1 sm:px-2 tabular-nums">
                          {Number(r.total_round_trip_km || 0).toFixed(1)}
                        </td>
                        <td className="text-right py-2.5 px-1 sm:px-2 tabular-nums">{Number(r.rate_per_km || 0)}</td>
                        <td className="text-right py-2.5 px-2 sm:px-3 font-medium tabular-nums">
                          {Number(r.total_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MobileHorizontalScroll>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
