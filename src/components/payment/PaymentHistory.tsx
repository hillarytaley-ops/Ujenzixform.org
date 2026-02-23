import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Download,
  Eye,
  Calendar,
  Receipt,
  Loader2,
  AlertCircle,
  Banknote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paystack_reference: string;
  paystack_transaction_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'abandoned' | 'refunded';
  payment_method: string | null;
  card_type: string | null;
  card_last4: string | null;
  bank_name: string | null;
  mobile_money_provider: string | null;
  customer_email: string | null;
  gateway_response: string | null;
  channel: string | null;
  paid_at: string | null;
  created_at: string;
  purchase_order_id: string | null;
  // Joined data
  po_number?: string;
  order_total?: number;
}

interface PaymentHistoryProps {
  userId?: string;
  showFilters?: boolean;
  limit?: number;
  compact?: boolean;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  userId,
  showFilters = true,
  limit,
  compact = false
}) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchPayments();
  }, [userId, statusFilter, dateFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          purchase_orders (
            po_number,
            total_amount
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by user if specified
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply limit if specified
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedPayments: Payment[] = (data || []).map((p: any) => ({
        ...p,
        po_number: p.purchase_orders?.po_number,
        order_total: p.purchase_orders?.total_amount
      }));

      setPayments(transformedPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter payments by search query
  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.paystack_reference.toLowerCase().includes(query) ||
      payment.customer_email?.toLowerCase().includes(query) ||
      payment.po_number?.toLowerCase().includes(query)
    );
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      case 'abandoned':
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Abandoned
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (channel: string | null) => {
    switch (channel) {
      case 'card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'mobile_money':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case 'bank_transfer':
      case 'bank':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'ussd':
        return <Banknote className="h-4 w-4 text-orange-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-400" />;
    }
  };

  // Calculate totals
  const totalSuccessful = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  if (compact) {
    // Compact view for dashboard widgets
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-600" />
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setShowDetails(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {getPaymentMethodIcon(payment.channel)}
                    <div>
                      <p className="font-medium text-sm">{payment.paystack_reference}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      KES {payment.amount.toLocaleString()}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
              
              {payments.length > 5 && (
                <Button variant="ghost" className="w-full" onClick={() => window.location.href = '/payments'}>
                  View All Payments
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-600" />
            Payment History
          </CardTitle>
          <CardDescription>
            View and manage your payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Successful Payments</p>
                    <p className="text-2xl font-bold text-green-700">
                      KES {totalSuccessful.toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      KES {totalPending.toLocaleString()}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {payments.length}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference, email, or order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={fetchPayments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {/* Payments Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No payments found</p>
              <p className="text-sm">Your payment history will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{payment.paystack_reference}</p>
                          {payment.po_number && (
                            <p className="text-xs text-gray-500">Order: {payment.po_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.channel)}
                          <span className="text-sm capitalize">
                            {payment.channel?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(payment.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Transaction information and receipt
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="text-center py-4">
                {selectedPayment.status === 'success' ? (
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                ) : selectedPayment.status === 'failed' ? (
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                ) : (
                  <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                )}
                <p className="text-2xl font-bold">
                  {selectedPayment.currency} {selectedPayment.amount.toLocaleString()}
                </p>
                {getStatusBadge(selectedPayment.status)}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono">{selectedPayment.paystack_reference}</span>
                </div>
                
                {selectedPayment.paystack_transaction_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transaction ID</span>
                    <span className="font-mono">{selectedPayment.paystack_transaction_id}</span>
                  </div>
                )}
                
                {selectedPayment.po_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Number</span>
                    <span className="font-mono">{selectedPayment.po_number}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(selectedPayment.channel)}
                    <span className="capitalize">
                      {selectedPayment.channel?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                </div>
                
                {selectedPayment.card_last4 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Card</span>
                    <span>
                      {selectedPayment.card_type} •••• {selectedPayment.card_last4}
                    </span>
                  </div>
                )}
                
                {selectedPayment.bank_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Bank</span>
                    <span>{selectedPayment.bank_name}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span>{selectedPayment.customer_email || 'N/A'}</span>
                </div>
                
                {selectedPayment.gateway_response && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Response</span>
                    <span>{selectedPayment.gateway_response}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span>
                    {format(new Date(selectedPayment.created_at), 'PPpp')}
                  </span>
                </div>
                
                {selectedPayment.paid_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid At</span>
                    <span>
                      {format(new Date(selectedPayment.paid_at), 'PPpp')}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                {selectedPayment.status === 'success' && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentHistory;
