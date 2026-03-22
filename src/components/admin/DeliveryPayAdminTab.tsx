import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Route, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProviderMileageRow {
  provider_id: string;
  provider_name: string | null;
  total_round_trip_km: number;
  rate_per_km: number;
  total_amount: number;
  delivery_count: number;
}

export const DeliveryPayAdminTab: React.FC = () => {
  const [rows, setRows] = useState<ProviderMileageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratePerKm, setRatePerKm] = useState<string>('50');
  const [savingRate, setSavingRate] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: payData, error: payErr } = await supabase.rpc('admin_get_all_providers_mileage_pay');
      if (payErr) throw payErr;
      setRows((payData as ProviderMileageRow[]) || []);

      const { data: configData } = await supabase
        .from('delivery_mileage_config')
        .select('rate_per_km')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (configData?.rate_per_km != null) {
        setRatePerKm(String(configData.rate_per_km));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setRows([]);
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
    try {
      const { data: existing } = await supabase
        .from('delivery_mileage_config')
        .select('id')
        .limit(1)
        .maybeSingle();
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
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save rate');
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
            <AlertCircle className="h-5 w-5" />
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
                  <span className="text-sm text-gray-500">
                    Rate: <strong>{currentRate} KES/km</strong>
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
              <p className="text-sm text-gray-600">Total round-trip distance (all providers)</p>
              <p className="text-2xl font-bold">{grandTotalKm.toFixed(1)} km</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-gray-600">Total mileage pay (all providers)</p>
              <p className="text-2xl font-bold">KES {grandTotalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Providers</h4>
            {rows.length === 0 ? (
              <p className="text-gray-500">No delivered orders yet. Provider mileage will appear here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-600">Provider</th>
                      <th className="text-right py-2 text-gray-600">Deliveries</th>
                      <th className="text-right py-2 text-gray-600">Round-trip km</th>
                      <th className="text-right py-2 text-gray-600">Rate (KES/km)</th>
                      <th className="text-right py-2 text-gray-600">Pay (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.provider_id} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 text-teal-500" />
                            {r.provider_name || `Provider ${r.provider_id?.slice(0, 8)}`}
                          </div>
                        </td>
                        <td className="text-right py-2">{r.delivery_count}</td>
                        <td className="text-right py-2">{Number(r.total_round_trip_km || 0).toFixed(1)}</td>
                        <td className="text-right py-2">{Number(r.rate_per_km || 0)}</td>
                        <td className="text-right py-2 font-medium">{Number(r.total_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
