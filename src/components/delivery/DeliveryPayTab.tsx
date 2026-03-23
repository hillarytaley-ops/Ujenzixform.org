import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Route, DollarSign, RefreshCw, Package, AlertCircle } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MileageRow {
  delivery_request_id: string;
  purchase_order_id: string | null;
  order_number: string | null;
  one_way_km: number;
  round_trip_km: number;
  rate_per_km: number;
  amount: number;
  delivered_at: string | null;
  status: string | null;
}

function resolveDeliveryProviderUserId(authUserId?: string | null): string | null {
  if (authUserId) return authUserId;
  try {
    const raw = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (raw) {
      const p = JSON.parse(raw);
      const id = p.user?.id || p.currentSession?.user?.id || p.session?.user?.id;
      if (id) return id;
    }
  } catch {
    /* ignore */
  }
  const fallback = localStorage.getItem('user_id');
  return fallback && fallback.length > 0 ? fallback : null;
}

function accessTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return (
      p.access_token ||
      p.currentSession?.access_token ||
      p.session?.access_token ||
      null
    );
  } catch {
    return null;
  }
}

/** Native fetch bypasses Supabase client global fetch wrapper — avoids stuck RPC promises. */
async function fetchMileagePayRest(
  providerUserId: string,
  accessToken: string | null,
  signal: AbortSignal
): Promise<MileageRow[]> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_provider_mileage_pay`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ _provider_user_id: providerUserId }),
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    (err as Error & { httpStatus?: number }).httpStatus = res.status;
    throw err;
  }
  if (!text) return [];
  try {
    const data = JSON.parse(text) as unknown;
    return Array.isArray(data) ? (data as MileageRow[]) : [];
  } catch {
    throw new Error('Invalid mileage pay response');
  }
}

export const DeliveryPayTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const { user, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MileageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const requestGen = useRef(0);

  const fetchData = useCallback(async () => {
    const uid = user?.id ?? session?.user?.id ?? null;
    const providerUserId = resolveDeliveryProviderUserId(uid);
    if (!providerUserId) {
      setRows([]);
      setError(null);
      setMigrationNeeded(false);
      setLoading(false);
      return;
    }

    const gen = ++requestGen.current;
    setLoading(true);
    setError(null);

    const token = session?.access_token ?? accessTokenFromStorage();
    const controller = new AbortController();
    const rpcTimeoutMs = 10000;
    const timeoutId = window.setTimeout(() => controller.abort(), rpcTimeoutMs);

    try {
      const data = await fetchMileagePayRest(providerUserId, token, controller.signal);
      window.clearTimeout(timeoutId);
      if (gen !== requestGen.current) return;
      setRows(data);
      setMigrationNeeded(false);
    } catch (e: unknown) {
      window.clearTimeout(timeoutId);
      if (gen !== requestGen.current) return;
      const msg = (e as { message?: string; name?: string })?.message ?? String(e);
      const aborted = (e as { name?: string })?.name === 'AbortError' || /aborted|AbortError/i.test(msg);
      if (aborted || /timed out|timeout/i.test(msg)) {
        setError(null);
        setRows([]);
        setMigrationNeeded(true);
      } else if (
        /relation.*does not exist|function.*does not exist|PGRST202|PGRST116|404/i.test(msg) ||
        (e as Error & { httpStatus?: number })?.httpStatus === 404
      ) {
        setError(null);
        setRows([]);
        setMigrationNeeded(true);
      } else {
        setError(msg);
        setRows([]);
        setMigrationNeeded(false);
      }
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  }, [user?.id, session?.user?.id, session?.access_token]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 14000);

    void fetchData();

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      requestGen.current += 1;
      setLoading(false);
    };
  }, [authLoading, fetchData]);

  const totalRoundTripKm = rows.reduce((s, r) => s + Number(r.round_trip_km || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const ratePerKm = rows[0]?.rate_per_km ?? 50;

  const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  if (loading) {
    return (
      <Card className={cardBg}>
        <CardContent className="py-12 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-500 mr-2" />
          <span className={mutedText}>Loading mileage and pay data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cardBg}>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="mt-4 text-teal-600 hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Mileage & Pay
          </CardTitle>
          <CardDescription className={mutedText}>
            Kilometers traveled (supplier → delivery → supplier) and pay at {ratePerKm} KES/km
          </CardDescription>
        </CardHeader>
        <CardContent>
          {migrationNeeded && (
            <div className={`mb-4 p-4 rounded-lg border text-sm ${isDarkMode ? 'bg-amber-900/20 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              Mileage tracking is being set up. Contact your admin if this message persists.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <p className={`text-sm ${mutedText}`}>Total round-trip distance</p>
              <p className={`text-2xl font-bold ${textColor}`}>{totalRoundTripKm.toFixed(1)} km</p>
              <div className="flex items-center gap-1 mt-1">
                <Route className="h-4 w-4 text-teal-500" />
                <span className="text-xs text-teal-600">Supplier → Delivery → Supplier</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className={`text-sm ${mutedText}`}>Total mileage pay</p>
              <p className={`text-2xl font-bold ${textColor}`}>KES {totalAmount.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {totalRoundTripKm.toFixed(1)} km × {ratePerKm} KES/km
              </p>
            </div>
          </div>

          <div>
            <h4 className={`font-medium mb-3 ${textColor}`}>Delivered orders</h4>
            {rows.length === 0 ? (
              <p className={mutedText}>No delivered orders yet. Completed deliveries will appear here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={`text-left py-2 ${mutedText}`}>Order</th>
                      <th className={`text-right py-2 ${mutedText}`}>One-way km</th>
                      <th className={`text-right py-2 ${mutedText}`}>Round-trip km</th>
                      <th className={`text-right py-2 ${mutedText}`}>Pay (KES)</th>
                      <th className={`text-right py-2 ${mutedText}`}>Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.delivery_request_id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-teal-500" />
                            {r.order_number || 'N/A'}
                          </div>
                        </td>
                        <td className="text-right py-2">{Number(r.one_way_km || 0).toFixed(1)}</td>
                        <td className="text-right py-2">{Number(r.round_trip_km || 0).toFixed(1)}</td>
                        <td className="text-right py-2 font-medium">{Number(r.amount || 0).toLocaleString()}</td>
                        <td className="text-right py-2 text-xs">
                          {r.delivered_at
                            ? new Date(r.delivered_at).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void fetchData()}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
