import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  CreditCard,
  ShoppingCart,
  FileCheck,
  Truck,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Download,
  Eye,
  MoreVertical,
  PieChart,
  Building2,
  Store,
  Search,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chunkArray } from '@/utils/performance';
import { resetBuilderInvoicesHubCache } from '@/lib/builderInvoicesHubCache';

// Types
interface FinancialDocument {
  id: string;
  type: 'invoice' | 'payment' | 'purchase_order' | 'purchase_receipt' | 'delivery_order' | 'quotation';
  reference: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  partyName: string;
  partyEmail?: string;
  description?: string;
  items?: any[];
}

interface FinancialStats {
  totalInvoices: number;
  totalPayments: number;
  totalPurchaseOrders: number;
  totalReceipts: number;
  totalDeliveryOrders: number;
  totalQuotations: number;
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  overdueInvoices: number;
}

type FilterType = 'all' | 'invoice' | 'payment' | 'purchase_order' | 'purchase_receipt' | 'delivery_order' | 'quotation';

interface SupplierPayoutRow {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string | null;
  status: string;
  created_at: string;
  bank_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
}

interface DeliveryPayoutRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string | null;
  county?: string | null;
  address?: string | null;
  status: string;
  source?: string | null;
  created_at: string;
  bank_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
}

const INVOICE_PURGE_CONFIRM = 'DELETE ALL INVOICES';

export const FinancialTab: React.FC = () => {
  const { toast } = useToast();
  const [invoicePurgePhrase, setInvoicePurgePhrase] = useState('');
  const [invoicePurgeBusy, setInvoicePurgeBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalInvoices: 0,
    totalPayments: 0,
    totalPurchaseOrders: 0,
    totalReceipts: 0,
    totalDeliveryOrders: 0,
    totalQuotations: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    overdueInvoices: 0,
  });
  const [filter, setFilter] = useState<FilterType>('all');
  const [supplierPayoutRows, setSupplierPayoutRows] = useState<SupplierPayoutRow[]>([]);
  const [deliveryPayoutRows, setDeliveryPayoutRows] = useState<DeliveryPayoutRow[]>([]);
  const [supplierPayoutSearch, setSupplierPayoutSearch] = useState('');
  const [deliveryPayoutSearch, setDeliveryPayoutSearch] = useState('');

  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;
      
      const allDocs: FinancialDocument[] = [];
      const newStats: FinancialStats = {
        totalInvoices: 0,
        totalPayments: 0,
        totalPurchaseOrders: 0,
        totalReceipts: 0,
        totalDeliveryOrders: 0,
        totalQuotations: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        completedPayments: 0,
        overdueInvoices: 0,
      };

      // Fetch all data in parallel (documents + payout registries for finance tab)
      const [
        invoicesRes,
        paymentsRes,
        poRes,
        receiptsRes,
        deliveryOrdersRes,
        quotationsRes,
        supplierAppsRes,
        deliveryRpcRes,
      ] = await Promise.all([
        client.from('invoices').select('*').order('created_at', { ascending: false }),
        client.from('payments').select('*').order('created_at', { ascending: false }),
        client.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        client.from('purchase_receipts').select('*').order('created_at', { ascending: false }),
        client.from('delivery_orders').select('*').order('created_at', { ascending: false }),
        client.from('quotation_requests').select('*').order('created_at', { ascending: false }),
        client
          .from('supplier_applications')
          .select(
            'id, company_name, contact_person, email, phone, address, status, created_at, bank_name, bank_account_holder_name, bank_account_number, bank_branch'
          )
          .order('created_at', { ascending: false })
          .limit(500),
        client.rpc('admin_list_all_delivery_providers'),
      ]);

      // Process Invoices
      if (!invoicesRes.error && invoicesRes.data) {
        newStats.totalInvoices = invoicesRes.data.length;
        newStats.overdueInvoices = invoicesRes.data.filter(inv => inv.status === 'overdue').length;
        
        invoicesRes.data.forEach((inv: any) => {
          allDocs.push({
            id: inv.id,
            type: 'invoice',
            reference: inv.invoice_number,
            amount: inv.total_amount || 0,
            currency: 'KES',
            status: inv.status,
            date: inv.created_at,
            partyName: `Invoice #${inv.invoice_number}`,
            description: inv.notes || 'Invoice',
            items: inv.items,
          });
        });
      }

      // Process Payments
      if (!paymentsRes.error && paymentsRes.data) {
        newStats.totalPayments = paymentsRes.data.length;
        newStats.completedPayments = paymentsRes.data.filter(p => p.status === 'completed').length;
        newStats.pendingPayments = paymentsRes.data.filter(p => p.status === 'pending').length;
        newStats.totalRevenue = paymentsRes.data
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        paymentsRes.data.forEach((pmt: any) => {
          allDocs.push({
            id: pmt.id,
            type: 'payment',
            reference: pmt.reference || pmt.transaction_id || 'N/A',
            amount: pmt.amount || 0,
            currency: pmt.currency || 'KES',
            status: pmt.status,
            date: pmt.created_at,
            partyName: pmt.provider || 'Unknown Provider',
            description: pmt.description || `Payment via ${pmt.provider}`,
          });
        });
      }

      // Process Purchase Orders
      if (!poRes.error && poRes.data) {
        newStats.totalPurchaseOrders = poRes.data.length;
        
        poRes.data.forEach((po: any) => {
          allDocs.push({
            id: po.id,
            type: 'purchase_order',
            reference: po.po_number,
            amount: po.total_amount || 0,
            currency: 'KES',
            status: po.status,
            date: po.created_at,
            partyName: `PO #${po.po_number}`,
            description: po.special_instructions || 'Purchase Order',
            items: po.items,
          });
        });
      }

      // Process Receipts
      if (!receiptsRes.error && receiptsRes.data) {
        newStats.totalReceipts = receiptsRes.data.length;
        
        receiptsRes.data.forEach((rec: any) => {
          allDocs.push({
            id: rec.id,
            type: 'purchase_receipt',
            reference: rec.receipt_number,
            amount: rec.total_amount || 0,
            currency: 'KES',
            status: rec.status,
            date: rec.created_at,
            partyName: `Receipt #${rec.receipt_number}`,
            description: `${rec.payment_method || 'Payment'} - ${rec.special_instructions || 'Purchase Receipt'}`,
          });
        });
      }

      // Process Delivery Orders
      if (!deliveryOrdersRes.error && deliveryOrdersRes.data) {
        newStats.totalDeliveryOrders = deliveryOrdersRes.data.length;
        
        deliveryOrdersRes.data.forEach((dOrder: any) => {
          let totalAmount = 0;
          if (dOrder.materials && Array.isArray(dOrder.materials)) {
            totalAmount = dOrder.materials.reduce((sum: number, item: any) => {
              return sum + ((item.price || 0) * (item.quantity || 1));
            }, 0);
          }
          
          allDocs.push({
            id: dOrder.id,
            type: 'delivery_order',
            reference: dOrder.order_number,
            amount: totalAmount,
            currency: 'KES',
            status: dOrder.status,
            date: dOrder.created_at,
            partyName: `Delivery #${dOrder.order_number}`,
            description: dOrder.notes || `${dOrder.total_items} items`,
            items: dOrder.materials,
          });
        });
      }

      // Process Quotations
      if (!quotationsRes.error && quotationsRes.data) {
        newStats.totalQuotations = quotationsRes.data.length;
        
        quotationsRes.data.forEach((quote: any) => {
          allDocs.push({
            id: quote.id,
            type: 'quotation',
            reference: `QR-${quote.id.substring(0, 8).toUpperCase()}`,
            amount: quote.quote_amount || 0,
            currency: 'KES',
            status: quote.status,
            date: quote.created_at,
            partyName: quote.material_name,
            description: `${quote.quantity} ${quote.unit} - ${quote.project_description || 'Quote Request'}`,
          });
        });
      }

      // Sort by date
      allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (!supplierAppsRes.error && supplierAppsRes.data) {
        setSupplierPayoutRows(
          (supplierAppsRes.data as Record<string, unknown>[]).map((s) => ({
            id: String(s.id),
            company_name: String(s.company_name ?? ''),
            contact_person: String(s.contact_person ?? ''),
            email: String(s.email ?? ''),
            phone: String(s.phone ?? ''),
            address: (s.address as string) ?? null,
            status: String(s.status ?? 'pending'),
            created_at: String(s.created_at ?? ''),
            bank_name: (s.bank_name as string) ?? null,
            bank_account_holder_name: (s.bank_account_holder_name as string) ?? null,
            bank_account_number: (s.bank_account_number as string) ?? null,
            bank_branch: (s.bank_branch as string) ?? null,
          }))
        );
      } else {
        setSupplierPayoutRows([]);
      }

      let dRows: DeliveryPayoutRow[] = [];
      const rpcData = deliveryRpcRes.data as Record<string, unknown>[] | null;
      if (!deliveryRpcRes.error && rpcData && rpcData.length > 0) {
        dRows = rpcData.map((row) => ({
          id: String(row.registration_id || row.id),
          full_name: String(row.full_name || row.provider_name || ''),
          email: String(row.email ?? ''),
          phone: String(row.phone ?? ''),
          company_name: (row.provider_name as string) ?? null,
          county: (row.county as string) ?? null,
          address: (row.address as string) ?? null,
          status: String(row.status ?? 'pending'),
          source: (row.source as string) ?? null,
          created_at: String(row.created_at ?? ''),
          bank_name: (row.bank_name as string) ?? null,
          bank_account_holder_name: (row.bank_account_holder_name as string) ?? null,
          bank_account_number: (row.bank_account_number as string) ?? null,
          bank_branch: (row.bank_branch as string) ?? null,
        }));
      } else {
        const { data: dregs } = await client
          .from('delivery_provider_registrations')
          .select(
            'id, full_name, email, phone, county, physical_address, company_name, status, created_at, bank_name, bank_account_holder_name, bank_account_number, bank_branch'
          )
          .order('created_at', { ascending: false })
          .limit(500);
        if (dregs) {
          dRows = (dregs as Record<string, unknown>[]).map((r) => ({
            id: String(r.id),
            full_name: String(r.full_name ?? ''),
            email: String(r.email ?? ''),
            phone: String(r.phone ?? ''),
            company_name: (r.company_name as string) ?? null,
            county: (r.county as string) ?? null,
            address: (r.physical_address as string) ?? null,
            status: String(r.status ?? 'pending'),
            source: 'registration',
            created_at: String(r.created_at ?? ''),
            bank_name: (r.bank_name as string) ?? null,
            bank_account_holder_name: (r.bank_account_holder_name as string) ?? null,
            bank_account_number: (r.bank_account_number as string) ?? null,
            bank_branch: (r.bank_branch as string) ?? null,
          }));
        }
      }
      setDeliveryPayoutRows(dRows);

      setDocuments(allDocs);
      setStats(newStats);

      console.log('💰 Loaded financial documents:', {
        total: allDocs.length,
        supplierPayouts: supplierAppsRes.data?.length ?? 0,
        deliveryPayouts: dRows.length,
        ...newStats,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handlePurgeAllInvoices = useCallback(async () => {
    if (invoicePurgePhrase.trim() !== INVOICE_PURGE_CONFIRM) {
      toast({
        variant: 'destructive',
        title: 'Confirmation required',
        description: `Type exactly: ${INVOICE_PURGE_CONFIRM}`,
      });
      return;
    }
    setInvoicePurgeBusy(true);
    try {
      const { data: rows, error: selErr } = await supabase.from('invoices').select('id').limit(8000);
      if (selErr) throw selErr;
      const ids = (rows ?? []).map((r) => (r as { id: string }).id).filter(Boolean);
      if (ids.length === 0) {
        toast({ title: 'Nothing to delete', description: 'No rows in public.invoices.' });
        setInvoicePurgePhrase('');
        return;
      }
      let deleted = 0;
      for (const part of chunkArray(ids, 80)) {
        const { error: delErr } = await supabase.from('invoices').delete().in('id', part);
        if (delErr) throw delErr;
        deleted += part.length;
      }
      resetBuilderInvoicesHubCache();
      toast({
        title: 'Invoices deleted',
        description: `Removed ${deleted} row(s). Open the builder Invoices tab and tap Refresh if the list still shows old rows.`,
      });
      setInvoicePurgePhrase('');
      await loadFinancialData();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Purge failed',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setInvoicePurgeBusy(false);
    }
  }, [invoicePurgePhrase, toast, loadFinancialData]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const filteredSupplierPayout = useMemo(() => {
    const q = supplierPayoutSearch.trim().toLowerCase();
    if (!q) return supplierPayoutRows;
    return supplierPayoutRows.filter(
      (r) =>
        r.company_name.toLowerCase().includes(q) ||
        r.contact_person.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.bank_name || '').toLowerCase().includes(q) ||
        (r.bank_account_holder_name || '').toLowerCase().includes(q) ||
        (r.bank_account_number || '').includes(q)
    );
  }, [supplierPayoutRows, supplierPayoutSearch]);

  const filteredDeliveryPayout = useMemo(() => {
    const q = deliveryPayoutSearch.trim().toLowerCase();
    if (!q) return deliveryPayoutRows;
    return deliveryPayoutRows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.company_name || '').toLowerCase().includes(q) ||
        (r.bank_name || '').toLowerCase().includes(q) ||
        (r.bank_account_holder_name || '').toLowerCase().includes(q) ||
        (r.bank_account_number || '').includes(q)
    );
  }, [deliveryPayoutRows, deliveryPayoutSearch]);

  const exportSupplierPayoutCsv = () => {
    const headers = [
      'Company',
      'Contact',
      'Email',
      'Phone',
      'Bank',
      'Account holder',
      'Account number',
      'Branch',
      'Status',
      'Created',
    ];
    const rows = filteredSupplierPayout.map((r) => [
      r.company_name,
      r.contact_person,
      r.email,
      r.phone,
      r.bank_name || '',
      r.bank_account_holder_name || '',
      r.bank_account_number || '',
      r.bank_branch || '',
      r.status,
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-supplier-payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredSupplierPayout.length} supplier rows` });
  };

  const exportDeliveryPayoutCsv = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Source',
      'Bank',
      'Account holder',
      'Account number',
      'Branch',
      'Status',
      'Created',
    ];
    const rows = filteredDeliveryPayout.map((r) => [
      r.full_name,
      r.email,
      r.phone,
      r.source || '',
      r.bank_name || '',
      r.bank_account_holder_name || '',
      r.bank_account_number || '',
      r.bank_branch || '',
      r.status,
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-delivery-payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredDeliveryPayout.length} delivery rows` });
  };

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(d => d.type === filter);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'bg-emerald-600';
      case 'payment': return 'bg-blue-600';
      case 'purchase_order': return 'bg-orange-600';
      case 'purchase_receipt': return 'bg-purple-600';
      case 'delivery_order': return 'bg-teal-600';
      case 'quotation': return 'bg-pink-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'confirmed':
      case 'delivered':
        return 'bg-green-600';
      case 'pending':
      case 'draft':
      case 'quoted':
        return 'bg-yellow-600';
      case 'processing':
      case 'sent':
      case 'in_transit':
        return 'bg-blue-600';
      case 'overdue':
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="h-3 w-3" />;
      case 'payment': return <CreditCard className="h-3 w-3" />;
      case 'purchase_order': return <ShoppingCart className="h-3 w-3" />;
      case 'purchase_receipt': return <FileCheck className="h-3 w-3" />;
      case 'delivery_order': return <Truck className="h-3 w-3" />;
      case 'quotation': return <ClipboardList className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Building2 className="h-7 w-7 text-emerald-400" />
          Finance
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Invoices, payments, receipts, and orders below — plus{' '}
          <span className="text-slate-200 font-medium">registered payout bank details</span> for suppliers and delivery
          providers (from applications and the admin provider list).
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-400" />
                  Supplier payout accounts
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Rows from <code className="text-xs bg-slate-800 px-1 rounded">supplier_applications</code>
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-green-800 text-green-300 shrink-0"
                onClick={exportSupplierPayoutCsv}
                disabled={filteredSupplierPayout.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search company, contact, email, phone, bank…"
                value={supplierPayoutSearch}
                onChange={(e) => setSupplierPayoutSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">Company</TableHead>
                  <TableHead className="text-gray-400">Contact</TableHead>
                  <TableHead className="text-gray-400">Bank</TableHead>
                  <TableHead className="text-gray-400">Account</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupplierPayout.map((r) => (
                  <TableRow key={r.id} className="border-slate-700">
                    <TableCell className="text-white text-sm">
                      <div className="font-medium">{r.company_name}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <div>{r.contact_person}</div>
                      <div className="text-xs text-slate-500">{r.phone}</div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {r.bank_name?.trim() || '—'}
                      {r.bank_branch?.trim() ? (
                        <div className="text-xs text-slate-500">{r.bank_branch}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <div>{r.bank_account_holder_name?.trim() || '—'}</div>
                      <div className="font-mono text-xs text-slate-400">{r.bank_account_number?.trim() || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-slate-600">
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSupplierPayout.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">No supplier applications found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-teal-400" />
                  Delivery provider payout accounts
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Admin RPC <code className="text-xs bg-slate-800 px-1 rounded">admin_list_all_delivery_providers</code>{' '}
                  or registrations fallback
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-teal-800 text-teal-300 shrink-0"
                onClick={exportDeliveryPayoutCsv}
                disabled={filteredDeliveryPayout.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search name, email, phone, bank…"
                value={deliveryPayoutSearch}
                onChange={(e) => setDeliveryPayoutSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">Provider</TableHead>
                  <TableHead className="text-gray-400">Contact</TableHead>
                  <TableHead className="text-gray-400">Bank</TableHead>
                  <TableHead className="text-gray-400">Account</TableHead>
                  <TableHead className="text-gray-400">Src / status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveryPayout.map((r) => (
                  <TableRow key={r.id} className="border-slate-700">
                    <TableCell className="text-white text-sm">
                      <div className="font-medium">{r.full_name}</div>
                      {r.company_name && r.company_name !== r.full_name ? (
                        <div className="text-xs text-slate-500">{r.company_name}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <div>{r.email}</div>
                      <div className="text-xs text-slate-500">{r.phone}</div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {r.bank_name?.trim() || '—'}
                      {r.bank_branch?.trim() ? (
                        <div className="text-xs text-slate-500">{r.bank_branch}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <div>{r.bank_account_holder_name?.trim() || '—'}</div>
                      <div className="font-mono text-xs text-slate-400">{r.bank_account_number?.trim() || '—'}</div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <Badge variant="outline" className="text-xs border-slate-600 mb-1">
                        {r.source || '—'}
                      </Badge>
                      <div>
                        <Badge variant="outline" className="text-xs border-slate-600">
                          {r.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredDeliveryPayout.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">No delivery provider rows found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-slate-800 pt-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-4">Financial documents</p>
      </div>

      {/* Stats Row 1 - Document Types */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={<FileText />} value={stats.totalInvoices} label="Invoices" color="emerald" />
        <StatCard icon={<CreditCard />} value={stats.totalPayments} label="Payments" color="blue" />
        <StatCard icon={<ShoppingCart />} value={stats.totalPurchaseOrders} label="Purchase Orders" color="orange" />
        <StatCard icon={<FileCheck />} value={stats.totalReceipts} label="Receipts" color="purple" />
        <StatCard icon={<Truck />} value={stats.totalDeliveryOrders} label="Delivery Orders" color="teal" />
        <StatCard icon={<ClipboardList />} value={stats.totalQuotations} label="Quotations" color="pink" />
      </div>

      {/* Stats Row 2 - Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<TrendingUp />} 
          value={`KES ${stats.totalRevenue.toLocaleString()}`} 
          label="Total Revenue" 
          color="green" 
        />
        <StatCard icon={<Clock />} value={stats.pendingPayments} label="Pending Payments" color="yellow" />
        <StatCard icon={<CheckCircle />} value={stats.completedPayments} label="Completed" color="cyan" />
        <StatCard icon={<AlertTriangle />} value={stats.overdueInvoices} label="Overdue" color="red" />
      </div>

      {/* Filter Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-400" />
            Filter by Document Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { type: 'invoice', icon: <FileText />, color: 'emerald', count: stats.totalInvoices },
              { type: 'payment', icon: <CreditCard />, color: 'blue', count: stats.totalPayments },
              { type: 'purchase_order', icon: <ShoppingCart />, color: 'orange', count: stats.totalPurchaseOrders },
              { type: 'purchase_receipt', icon: <FileCheck />, color: 'purple', count: stats.totalReceipts },
              { type: 'delivery_order', icon: <Truck />, color: 'teal', count: stats.totalDeliveryOrders },
              { type: 'quotation', icon: <ClipboardList />, color: 'pink', count: stats.totalQuotations },
            ].map(({ type, icon, color, count }) => (
              <div
                key={type}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  filter === type 
                    ? `bg-${color}-600/40 border-2 border-${color}-500` 
                    : 'bg-slate-800/50 hover:bg-slate-700/50'
                }`}
                onClick={() => setFilter(filter === type ? 'all' : type as FilterType)}
              >
                <div className={`h-8 w-8 text-${color}-400 mx-auto mb-2`}>{icon}</div>
                <p className="text-xl font-bold text-white text-center">{count}</p>
                <p className="text-xs text-gray-400 text-center capitalize">{type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              All Financial Documents ({filteredDocuments.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Documents</SelectItem>
                  <SelectItem value="invoice" className="text-white">Invoices</SelectItem>
                  <SelectItem value="payment" className="text-white">Payments</SelectItem>
                  <SelectItem value="purchase_order" className="text-white">Purchase Orders</SelectItem>
                  <SelectItem value="purchase_receipt" className="text-white">Receipts</SelectItem>
                  <SelectItem value="delivery_order" className="text-white">Delivery Orders</SelectItem>
                  <SelectItem value="quotation" className="text-white">Quotations</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFinancialData}
                className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-700 text-blue-400 hover:bg-blue-900/30"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Reference</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.slice(0, 50).map((doc) => (
                  <TableRow key={doc.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell>
                      <Badge className={getTypeColor(doc.type)}>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(doc.type)}
                          {doc.type.replace(/_/g, ' ')}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono font-medium">
                      {doc.reference}
                    </TableCell>
                    <TableCell className="text-white font-semibold">
                      <span className="text-emerald-400">{doc.currency}</span> {doc.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 max-w-[200px] truncate">
                      {doc.description || doc.partyName}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(doc.date).toLocaleDateString('en-KE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 border-blue-700 text-blue-400 hover:bg-blue-900/30">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 border-slate-700 text-gray-400 hover:bg-slate-800">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-700">
                            <DropdownMenuLabel className="text-gray-400">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem className="text-white hover:bg-slate-700">
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-slate-700">
                              <Download className="h-4 w-4 mr-2" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-slate-700">
                              <FileText className="h-4 w-4 mr-2" /> View Items
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredDocuments.length === 0 && (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No financial documents found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-900/60 bg-red-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-200">
            <Trash2 className="h-5 w-5" />
            Danger zone — supplier invoices
          </CardTitle>
          <CardDescription className="text-red-200/80">
            Permanently deletes <strong>all</strong> rows in <code className="rounded bg-black/30 px-1">public.invoices</code>{" "}
            (admin / super_admin only). Use for clearing test data. Related rows that reference invoices may CASCADE;
            confirm backups before running in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-red-100" htmlFor="admin-invoice-purge-confirm">
                Type <span className="font-mono">{INVOICE_PURGE_CONFIRM}</span> to enable delete
              </label>
              <Input
                id="admin-invoice-purge-confirm"
                value={invoicePurgePhrase}
                onChange={(e) => setInvoicePurgePhrase(e.target.value)}
                placeholder={INVOICE_PURGE_CONFIRM}
                className="border-red-800 bg-slate-950 text-white placeholder:text-red-300/50"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={invoicePurgeBusy || invoicePurgePhrase.trim() !== INVOICE_PURGE_CONFIRM}
              onClick={() => void handlePurgeAllInvoices()}
              className="shrink-0"
            >
              {invoicePurgeBusy ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete all invoices
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for stat cards
interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
  <Card className={`bg-gradient-to-br from-${color}-900/40 to-${color}-800/20 border-${color}-700/50`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 bg-${color}-600/30 rounded-xl`}>
          <div className={`h-6 w-6 text-${color}-400`}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className={`text-sm text-${color}-300`}>{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default FinancialTab;

