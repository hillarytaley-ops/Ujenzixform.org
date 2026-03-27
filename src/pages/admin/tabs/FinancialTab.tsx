import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export const FinancialTab: React.FC = () => {
  const { toast } = useToast();
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

      // Fetch all data in parallel
      const [invoicesRes, paymentsRes, poRes, receiptsRes, deliveryOrdersRes, quotationsRes] = await Promise.all([
        client.from('invoices').select('*').order('created_at', { ascending: false }),
        client.from('payments').select('*').order('created_at', { ascending: false }),
        client.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        client.from('purchase_receipts').select('*').order('created_at', { ascending: false }),
        client.from('delivery_orders').select('*').order('created_at', { ascending: false }),
        client.from('quotation_requests').select('*').order('created_at', { ascending: false }),
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
      
      setDocuments(allDocs);
      setStats(newStats);
      
      console.log('💰 Loaded financial documents:', {
        total: allDocs.length,
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

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

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

