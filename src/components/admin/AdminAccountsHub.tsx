import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Landmark,
  Users,
  Truck,
  Printer,
  Info,
  RefreshCw,
} from 'lucide-react';

type PayeeKind = 'staff' | 'delivery';

interface StaffRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  staff_code: string | null;
  status: string | null;
}

interface DeliveryRow {
  id: string;
  full_name: string | null;
  provider_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  source: string | null;
  bank_account_holder_name?: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseMoney(v: string): number {
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildPayslipHtml(opts: {
  employerName: string;
  kind: PayeeKind;
  employeeName: string;
  employeeNo: string;
  periodLabel: string;
  currency: string;
  basic: number;
  housing: number;
  transport: number;
  otherAllow: number;
  gross: number;
  nhif: number;
  nssf: number;
  paye: number;
  otherDed: number;
  totalDed: number;
  net: string;
}): string {
  const rows = [
    ['Basic pay', opts.basic],
    ['Housing allowance', opts.housing],
    ['Transport allowance', opts.transport],
    ['Other allowances', opts.otherAllow],
    ['Gross pay', opts.gross],
  ];
  const ded = [
    ['NHIF', opts.nhif],
    ['NSSF', opts.nssf],
    ['PAYE / tax', opts.paye],
    ['Other deductions', opts.otherDed],
    ['Total deductions', opts.totalDed],
  ];
  const rowHtml = (label: string, amt: number, bold?: boolean) =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${escapeHtml(label)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:${bold ? 700 : 400}">${escapeHtml(opts.currency)} ${formatMoney(amt)}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip — ${escapeHtml(opts.employeeName)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;color:#111}
h1{font-size:1.25rem;margin:0 0 4px} .muted{color:#555;font-size:0.9rem} table{width:100%;border-collapse:collapse;margin-top:12px}
.net{font-size:1.1rem;font-weight:700;margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px}
@media print{body{margin:0}.no-print{display:none}}</style></head><body>
<p class="no-print"><button type="button" id="ujx-payslip-print" style="padding:10px 16px;cursor:pointer">Print / Save as PDF</button></p>
<h1>${escapeHtml(opts.employerName)}</h1>
<p class="muted">Payslip — ${opts.kind === 'staff' ? 'Staff' : 'Delivery provider'}</p>
<p><strong>Employee:</strong> ${escapeHtml(opts.employeeName)}<br/>
<strong>Reference:</strong> ${escapeHtml(opts.employeeNo || '—')}<br/>
<strong>Pay period:</strong> ${escapeHtml(opts.periodLabel)}</p>
<h2 style="font-size:1rem;margin-top:20px">Earnings</h2>
<table><tbody>
${rows.map(([l, a]) => rowHtml(l as string, a as number, l === 'Gross pay')).join('')}
</tbody></table>
<h2 style="font-size:1rem;margin-top:16px">Deductions</h2>
<table><tbody>
${ded.map(([l, a]) => rowHtml(l as string, a as number, l === 'Total deductions')).join('')}
</tbody></table>
<div class="net">Net pay: ${escapeHtml(opts.currency)} ${escapeHtml(opts.net)}</div>
<p class="muted" style="margin-top:24px;font-size:0.8rem">Generated in UjenziXform Admin — figures are entered by finance; statutory amounts are your responsibility to verify.</p>
<script>(function(){var b=document.getElementById("ujx-payslip-print");if(b)b.addEventListener("click",function(){window.print();});})();</script>
</body></html>`;
}

export const AdminAccountsHub: React.FC = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [delivery, setDelivery] = useState<DeliveryRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [kind, setKind] = useState<PayeeKind>('staff');

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedDeliveryKey, setSelectedDeliveryKey] = useState<string>('');

  const [periodMonth, setPeriodMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [periodYear, setPeriodYear] = useState(() => String(new Date().getFullYear()));
  const [manualName, setManualName] = useState('');
  const [manualRef, setManualRef] = useState('');

  const [basic, setBasic] = useState('');
  const [housing, setHousing] = useState('');
  const [transport, setTransport] = useState('');
  const [otherAllow, setOtherAllow] = useState('');
  const [nhif, setNhif] = useState('');
  const [nssf, setNssf] = useState('');
  const [paye, setPaye] = useState('');
  const [otherDed, setOtherDed] = useState('');

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('admin_staff')
        .select('id,email,full_name,phone,role,staff_code,status')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStaff((data || []) as StaffRow[]);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load staff',
        description: e instanceof Error ? e.message : 'Check admin permissions',
        variant: 'destructive',
      });
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [toast]);

  const loadDelivery = useCallback(async () => {
    setLoadingDelivery(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_all_delivery_providers');
      if (error) throw error;
      const rows = (data || []) as DeliveryRow[];
      setDelivery(rows);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load delivery providers',
        description: e instanceof Error ? e.message : 'RPC may require admin user role',
        variant: 'destructive',
      });
      setDelivery([]);
    } finally {
      setLoadingDelivery(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStaff();
    void loadDelivery();
  }, [loadStaff, loadDelivery]);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.id === selectedStaffId),
    [staff, selectedStaffId],
  );
  const selectedDelivery = useMemo(() => {
    if (!selectedDeliveryKey) return undefined;
    const idx = selectedDeliveryKey.indexOf(':');
    if (idx < 0) return undefined;
    const source = selectedDeliveryKey.slice(0, idx);
    const id = selectedDeliveryKey.slice(idx + 1);
    return delivery.find((d) => d.id === id && (d.source || '') === source);
  }, [delivery, selectedDeliveryKey]);

  const periodLabel = useMemo(() => {
    const d = new Date(parseInt(periodYear, 10), parseInt(periodMonth, 10) - 1, 1);
    return d.toLocaleString('en-KE', { month: 'long', year: 'numeric' });
  }, [periodMonth, periodYear]);

  const totals = useMemo(() => {
    const b = parseMoney(basic);
    const h = parseMoney(housing);
    const t = parseMoney(transport);
    const oa = parseMoney(otherAllow);
    const gross = b + h + t + oa;
    const n1 = parseMoney(nhif);
    const n2 = parseMoney(nssf);
    const p = parseMoney(paye);
    const od = parseMoney(otherDed);
    const totalDed = n1 + n2 + p + od;
    const net = Math.max(0, gross - totalDed);
    return { gross, totalDed, net, b, h, t, oa, n1, n2, p, od };
  }, [basic, housing, transport, otherAllow, nhif, nssf, paye, otherDed]);

  const resolveEmployee = (): { name: string; ref: string } => {
    const manual = manualName.trim();
    if (manual) {
      return { name: manual, ref: manualRef.trim() || '—' };
    }
    if (kind === 'staff' && selectedStaff) {
      return {
        name: selectedStaff.full_name || selectedStaff.email,
        ref: selectedStaff.staff_code || selectedStaff.email,
      };
    }
    if (kind === 'delivery' && selectedDelivery) {
      const n =
        selectedDelivery.full_name ||
        selectedDelivery.provider_name ||
        selectedDelivery.email ||
        'Provider';
      return {
        name: n,
        ref: selectedDelivery.email || selectedDelivery.phone || selectedDelivery.id.slice(0, 8),
      };
    }
    return { name: 'Unnamed payee', ref: '—' };
  };

  const openPayslip = () => {
    const { name, ref } = resolveEmployee();
    const html = buildPayslipHtml({
      employerName: 'UjenziXform Ltd',
      kind,
      employeeName: name,
      employeeNo: ref,
      periodLabel,
      currency: 'KES',
      basic: totals.b,
      housing: totals.h,
      transport: totals.t,
      otherAllow: totals.oa,
      gross: totals.gross,
      nhif: totals.n1,
      nssf: totals.n2,
      paye: totals.p,
      otherDed: totals.od,
      totalDed: totals.totalDed,
      net: formatMoney(totals.net),
    });

    // Do not pass `noopener` here: Chromium often detaches the returned Window so
    // document.write() leaves a permanent blank page. Prefer blob: URL (works with a normal new tab).
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        URL.revokeObjectURL(url);
        toast({
          title: 'Popup blocked',
          description: 'Allow pop-ups for this site, or use Download payslip below.',
          variant: 'destructive',
        });
        triggerHtmlDownload(html, `payslip-${(name || 'payee').replace(/\s+/g, '-')}.html`);
        return;
      }
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }, 600_000);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not open payslip',
        description: e instanceof Error ? e.message : 'Try again or download the HTML file.',
        variant: 'destructive',
      });
      triggerHtmlDownload(html, `payslip-${(name || 'payee').replace(/\s+/g, '-')}.html`);
    }
  };

  const triggerHtmlDownload = (html: string, filename: string) => {
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: 'Download started', description: 'Open the file in your browser to print.' });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-400" />
            Accounts
          </CardTitle>
          <CardDescription className="text-gray-400">
            Internal accounting helpers. Generate printable payslips for admin staff and delivery providers from
            roster data plus pay figures you enter (not legal/tax advice).
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert className="bg-slate-900/40 border-slate-700">
        <Info className="h-4 w-4 text-sky-400" />
        <AlertTitle className="text-slate-100">How this works</AlertTitle>
        <AlertDescription className="text-slate-300 text-sm space-y-1">
          <p>Select a person from the roster or type a name manually. Enter earnings and deductions, then generate a payslip. Use your browser’s print dialog to save as PDF.</p>
        </AlertDescription>
      </Alert>

      <Tabs value={kind} onValueChange={(v) => setKind(v as PayeeKind)} className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="staff" className="data-[state=active]:bg-emerald-700 gap-2">
            <Users className="h-4 w-4" />
            Staff payslips
          </TabsTrigger>
          <TabsTrigger value="delivery" className="data-[state=active]:bg-emerald-700 gap-2">
            <Truck className="h-4 w-4" />
            Delivery payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4 mt-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-base">Staff roster</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => void loadStaff()} disabled={loadingStaff}>
                <RefreshCw className={`h-4 w-4 ${loadingStaff ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-300">Staff member</Label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1">
                      <SelectValue placeholder="Choose from admin_staff…" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {(s.full_name || s.email) + (s.staff_code ? ` · ${s.staff_code}` : '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Or manual name (overrides selection)</Label>
                  <Input
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                    placeholder="e.g. Jane Doe"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Manual reference / ID (optional)</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white mt-1"
                  placeholder="Staff code or payroll ID"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 mt-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-base">Delivery providers</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => void loadDelivery()} disabled={loadingDelivery}>
                <RefreshCw className={`h-4 w-4 ${loadingDelivery ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-300">Provider</Label>
                  <Select value={selectedDeliveryKey} onValueChange={setSelectedDeliveryKey}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1">
                      <SelectValue placeholder="Choose delivery provider…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {delivery.map((d) => (
                        <SelectItem key={`${d.source}-${d.id}`} value={`${d.source || 'unknown'}:${d.id}`}>
                          {(d.full_name || d.provider_name || d.email || 'Unknown') +
                            (d.status ? ` · ${d.status}` : '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Or manual name (overrides selection)</Label>
                  <Input
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                    placeholder="Contractor name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Manual reference (optional)</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white mt-1"
                  placeholder="Phone, vehicle, or internal ref"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-emerald-400" />
            Pay period &amp; amounts (KES)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Label className="text-gray-300">Month</Label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    return (
                      <SelectItem key={m} value={m}>
                        {new Date(2000, i, 1).toLocaleString('en-KE', { month: 'long' })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Year</Label>
              <Input
                className="bg-slate-950 border-slate-700 text-white mt-1"
                value={periodYear}
                onChange={(e) => setPeriodYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <p className="text-sm text-gray-400 pb-2">
                Period: <span className="text-white font-medium">{periodLabel}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Basic pay', basic, setBasic],
              ['Housing', housing, setHousing],
              ['Transport', transport, setTransport],
              ['Other allowances', otherAllow, setOtherAllow],
              ['NHIF', nhif, setNhif],
              ['NSSF', nssf, setNssf],
              ['PAYE / tax', paye, setPaye],
              ['Other deductions', otherDed, setOtherDed],
            ].map(([label, val, set]) => (
              <div key={label as string}>
                <Label className="text-gray-300">{label as string}</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white mt-1"
                  inputMode="decimal"
                  placeholder="0"
                  value={val as string}
                  onChange={(e) => (set as (s: string) => void)(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="text-sm text-gray-300 space-x-4">
              <span>
                Gross: <strong className="text-white">KES {formatMoney(totals.gross)}</strong>
              </span>
              <span>
                Deductions: <strong className="text-white">KES {formatMoney(totals.totalDed)}</strong>
              </span>
              <span>
                Net: <strong className="text-emerald-400">KES {formatMoney(totals.net)}</strong>
              </span>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openPayslip}>
              <Printer className="h-4 w-4 mr-2" />
              Generate payslip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
