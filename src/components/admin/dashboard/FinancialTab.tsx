import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, FileText, CreditCard, ShoppingCart, Receipt,
  Search, Download, TrendingUp, TrendingDown, AlertCircle,
  ArrowUpRight, ArrowDownRight, Filter, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  customer_name?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  reference?: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  supplier_name?: string;
}

interface PurchaseReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  created_at: string;
  vendor_name?: string;
}

interface FinancialTabProps {
  invoices: Invoice[];
  payments: Payment[];
  purchaseOrders: PurchaseOrder[];
  purchaseReceipts: PurchaseReceipt[];
  loading: boolean;
}

// Empty State Component
const EmptyState: React.FC<{ icon: React.ElementType; title: string; description: string }> = ({ 
  icon: Icon, title, description 
}) => (
  <div className="text-center py-12">
    <Icon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
    <h3 className="text-lg font-medium text-gray-400 mb-2">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

// Stats Card Component
const StatsCard: React.FC<{
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}> = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-900/20 border-green-800/50 text-green-400',
    blue: 'bg-blue-900/20 border-blue-800/50 text-blue-400',
    orange: 'bg-orange-900/20 border-orange-800/50 text-orange-400',
    purple: 'bg-purple-900/20 border-purple-800/50 text-purple-400',
    red: 'bg-red-900/20 border-red-800/50 text-red-400',
  };

  return (
    <Card className={`${colorClasses[color as keyof typeof colorClasses]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${colorClasses[color as keyof typeof colorClasses].split(' ')[2]}`}>
              {title}
            </p>
            <p className="text-2xl font-bold text-white truncate">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-400" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-400" />}
                <span className={`text-xs ${
                  trend === 'up' ? 'text-green-400' : 
                  trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses].split(' ')[2]}`} />
        </div>
      </CardContent>
    </Card>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusStyles = {
    paid: 'bg-green-600/20 text-green-400 border-green-600/50',
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50',
    overdue: 'bg-red-600/20 text-red-400 border-red-600/50',
    completed: 'bg-green-600/20 text-green-400 border-green-600/50',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/50',
    cancelled: 'bg-gray-600/20 text-gray-400 border-gray-600/50',
    failed: 'bg-red-600/20 text-red-400 border-red-600/50',
  };

  return (
    <Badge 
      variant="outline" 
      className={`capitalize ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}
    >
      {status}
    </Badge>
  );
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Main Financial Tab Component
export const FinancialTab: React.FC<FinancialTabProps> = ({
  invoices,
  payments,
  purchaseOrders,
  purchaseReceipts,
  loading
}) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'completed' || p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPurchases = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data to export",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvData = data.map(item => 
      headers.map(h => `"${item[h] || ''}"`).join(',')
    );

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${data.length} records exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Invoiced"
          value={formatCurrency(totalInvoiced)}
          change="+12% from last month"
          trend="up"
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="Total Payments"
          value={formatCurrency(totalPaid)}
          change="+8% from last month"
          trend="up"
          icon={CreditCard}
          color="green"
        />
        <StatsCard
          title="Purchase Orders"
          value={formatCurrency(totalPurchases)}
          change="-3% from last month"
          trend="down"
          icon={ShoppingCart}
          color="orange"
        />
        <StatsCard
          title="Pending Invoices"
          value={pendingInvoices.toString()}
          icon={AlertCircle}
          color="purple"
        />
      </div>

      {/* Sub Tabs */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Financial Documents
              </CardTitle>
              <CardDescription className="text-gray-400">
                View and manage all financial records
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48 bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="bg-slate-800/50 mb-4 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
                Overview
              </TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-slate-700">
                Invoices ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-slate-700">
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-slate-700">
                Orders ({purchaseOrders.length})
              </TabsTrigger>
              <TabsTrigger value="receipts" className="data-[state=active]:bg-slate-700">
                Receipts ({purchaseReceipts.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Sub Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Recent Invoices */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Recent Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoices.slice(0, 5).length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No invoices yet</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.slice(0, 5).map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">{inv.invoice_number}</p>
                              <p className="text-xs text-gray-400 truncate">{inv.customer_name || 'N/A'}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-sm text-white">{formatCurrency(inv.amount)}</p>
                              <StatusBadge status={inv.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Recent Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.slice(0, 5).length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No payments yet</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.slice(0, 5).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">{payment.reference || payment.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-400">{payment.payment_method}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-sm text-green-400">{formatCurrency(payment.amount)}</p>
                              <StatusBadge status={payment.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Invoices Sub Tab */}
            <TabsContent value="invoices">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(invoices, 'invoices')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              {invoices.length === 0 ? (
                <EmptyState 
                  icon={FileText} 
                  title="No Invoices" 
                  description="Invoices will appear here when created"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Invoice #</TableHead>
                        <TableHead className="text-gray-400">Customer</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Due Date</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices
                        .filter(inv => 
                          inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((inv) => (
                          <TableRow key={inv.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell className="text-white font-medium">{inv.invoice_number}</TableCell>
                            <TableCell className="text-gray-400">{inv.customer_name || 'N/A'}</TableCell>
                            <TableCell className="text-white">{formatCurrency(inv.amount)}</TableCell>
                            <TableCell><StatusBadge status={inv.status} /></TableCell>
                            <TableCell className="text-gray-400">
                              {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Payments Sub Tab */}
            <TabsContent value="payments">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(payments, 'payments')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              {payments.length === 0 ? (
                <EmptyState 
                  icon={CreditCard} 
                  title="No Payments" 
                  description="Payment records will appear here"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Reference</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Method</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments
                        .filter(p => 
                          p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((payment) => (
                          <TableRow key={payment.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell className="text-white font-medium">
                              {payment.reference || payment.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-green-400">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell className="text-gray-400 capitalize">{payment.payment_method}</TableCell>
                            <TableCell><StatusBadge status={payment.status} /></TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Purchase Orders Sub Tab */}
            <TabsContent value="orders">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(purchaseOrders, 'purchase-orders')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              {purchaseOrders.length === 0 ? (
                <EmptyState 
                  icon={ShoppingCart} 
                  title="No Purchase Orders" 
                  description="Purchase orders will appear here when created"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Order #</TableHead>
                        <TableHead className="text-gray-400">Supplier</TableHead>
                        <TableHead className="text-gray-400">Total</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders
                        .filter(po => 
                          po.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((po) => (
                          <TableRow key={po.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell className="text-white font-medium">{po.order_number}</TableCell>
                            <TableCell className="text-gray-400">{po.supplier_name || 'N/A'}</TableCell>
                            <TableCell className="text-white">{formatCurrency(po.total_amount)}</TableCell>
                            <TableCell><StatusBadge status={po.status} /></TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(po.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Receipts Sub Tab */}
            <TabsContent value="receipts">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(purchaseReceipts, 'receipts')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              {purchaseReceipts.length === 0 ? (
                <EmptyState 
                  icon={Receipt} 
                  title="No Receipts" 
                  description="Purchase receipts will appear here"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Receipt #</TableHead>
                        <TableHead className="text-gray-400">Vendor</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseReceipts
                        .filter(r => 
                          r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((receipt) => (
                          <TableRow key={receipt.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell className="text-white font-medium">{receipt.receipt_number}</TableCell>
                            <TableCell className="text-gray-400">{receipt.vendor_name || 'N/A'}</TableCell>
                            <TableCell className="text-white">{formatCurrency(receipt.amount)}</TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(receipt.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialTab;




