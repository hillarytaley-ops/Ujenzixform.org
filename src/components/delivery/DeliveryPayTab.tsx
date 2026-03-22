import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Route, DollarSign, RefreshCw, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

export const DeliveryPayTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<MileageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('get_provider_mileage_pay', {
        _provider_user_id: user.id,
      });
      if (err) throw err;
      setRows((data as MileageRow[]) || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load mileage data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

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
            onClick={fetchData}
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
              onClick={fetchData}
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
