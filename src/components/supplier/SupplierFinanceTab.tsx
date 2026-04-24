import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, TrendingDown, TrendingUp, PieChart, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeSupplierFinanceMetrics,
  type SupplierInvoiceRow,
  type SupplierPurchaseOrderRow,
} from '@/lib/supplierFinanceMetrics';

export interface SupplierFinanceTabProps {
  supplierRecordId: string | null;
  purchaseOrders: SupplierPurchaseOrderRow[];
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
  onOpenInvoices: () => void;
}

function formatKes(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export const SupplierFinanceTab: React.FC<SupplierFinanceTabProps> = ({
  supplierRecordId,
  purchaseOrders,
  isDarkMode,
  textColor,
  mutedText,
  cardBg,
  onOpenInvoices,
}) => {
  const [invoices, setInvoices] = useState<SupplierInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    if (!supplierRecordId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('invoices')
        .select('id,total_amount,amount_paid,payment_status,status,purchase_order_id')
        .eq('supplier_id', supplierRecordId)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (qErr) throw qErr;
      setInvoices(data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load invoices';
      setError(msg);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [supplierRecordId]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const metrics = useMemo(
    () => computeSupplierFinanceMetrics(invoices, purchaseOrders),
    [invoices, purchaseOrders]
  );

  const statCard = (opts: {
    title: string;
    subtitle: string;
    value: string;
    icon: React.ReactNode;
    accent: string;
  }) => (
    <Card className={`${cardBg} shadow-md`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wide ${mutedText}`}>{opts.title}</p>
            <p className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${textColor}`}>{opts.value}</p>
            <p className={`mt-2 text-xs leading-snug ${mutedText}`}>{opts.subtitle}</p>
          </div>
          <div
            className={`shrink-0 rounded-full p-2.5 ${isDarkMode ? 'bg-slate-700' : ''} ${opts.accent}`}
          >
            {opts.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className={cardBg}>
        <CardHeader className="space-y-1">
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <Wallet className="h-5 w-5 text-emerald-600" />
            Finance overview
          </CardTitle>
          <CardDescription className={mutedText}>
            Paid and outstanding amounts use your <strong className={textColor}>invoices</strong> (Paystack and manual
            payments). Orders without an invoice yet appear under pipeline value.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadInvoices()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className={loading ? 'ml-2' : ''}>Refresh</span>
          </Button>
          <Button type="button" variant="default" size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={onOpenInvoices}>
            <Receipt className="mr-2 h-4 w-4" />
            Invoice hub
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <p className={`rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200`}>
          {error}
        </p>
      ) : null}

      {!supplierRecordId && !loading ? (
        <p className={`text-sm ${mutedText}`}>
          Your supplier profile is still loading. Finance totals will appear once the account is linked.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCard({
          title: 'Paid cash',
          subtitle: 'Recorded as received on invoices (includes partial payments).',
          value: formatKes(metrics.paidCash),
          icon: <TrendingUp className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />,
          accent: isDarkMode ? '' : 'bg-emerald-100',
        })}
        {statCard({
          title: 'Unpaid on invoices',
          subtitle: 'Still due from buyers on open / partial / overdue invoices.',
          value: formatKes(metrics.unpaidOnInvoices),
          icon: <TrendingDown className="h-5 w-5 text-amber-700 dark:text-amber-400" />,
          accent: isDarkMode ? '' : 'bg-amber-100',
        })}
        {statCard({
          title: 'Pipeline (no invoice yet)',
          subtitle: `Active purchase orders not linked to an invoice (${metrics.uninvoicedOrderCount} orders).`,
          value: formatKes(metrics.uninvoicedPipeline),
          icon: <PieChart className="h-5 w-5 text-blue-700 dark:text-blue-400" />,
          accent: isDarkMode ? '' : 'bg-blue-100',
        })}
        {statCard({
          title: 'Total cash expected',
          subtitle: 'Paid + unpaid invoices + pipeline (excl. cancelled orders & invoices).',
          value: formatKes(metrics.totalCashExpected),
          icon: <Wallet className="h-5 w-5 text-violet-700 dark:text-violet-400" />,
          accent: isDarkMode ? '' : 'bg-violet-100',
        })}
      </div>

      <div className={`grid gap-4 md:grid-cols-2`}>
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={`text-base ${textColor}`}>Invoices in scope</CardTitle>
            <CardDescription className={mutedText}>
              {metrics.activeInvoiceCount} non-cancelled invoice{metrics.activeInvoiceCount === 1 ? '' : 's'} · Active
              invoiced total {formatKes(metrics.activeInvoicedTotal)}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={`text-base ${textColor}`}>Revenue card vs finance</CardTitle>
            <CardDescription className={mutedText}>
              The dashboard &quot;Revenue&quot; card sums all purchase order totals. Finance separates what is invoiced,
              paid, and still only on orders until you raise an invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
