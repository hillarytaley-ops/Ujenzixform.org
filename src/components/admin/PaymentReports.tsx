import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChartIcon,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageOrderValue: number;
  revenueChange: number;
  transactionChange: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  transactions: number;
}

interface PaymentMethodStats {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paystack_reference: string;
  status: string;
  channel: string | null;
  customer_email: string | null;
  created_at: string;
  paid_at: string | null;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export const PaymentReports: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    successRate: 0,
    averageOrderValue: 0,
    revenueChange: 0,
    transactionChange: 0
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{name: string; value: number; color: string}[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      const previousStartDate = subDays(startDate, days);

      // Fetch current period payments
      const { data: currentPayments, error: currentError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (currentError) throw currentError;

      // Fetch previous period payments for comparison
      const { data: previousPayments, error: prevError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      if (prevError) throw prevError;

      // Calculate stats
      const successfulPayments = (currentPayments || []).filter(p => p.status === 'success');
      const prevSuccessfulPayments = (previousPayments || []).filter(p => p.status === 'success');

      const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const prevRevenue = prevSuccessfulPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const totalTransactions = (currentPayments || []).length;
      const prevTransactions = (previousPayments || []).length;

      const successRate = totalTransactions > 0 
        ? (successfulPayments.length / totalTransactions) * 100 
        : 0;

      const averageOrderValue = successfulPayments.length > 0
        ? totalRevenue / successfulPayments.length
        : 0;

      const revenueChange = prevRevenue > 0 
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
        : 0;

      const transactionChange = prevTransactions > 0
        ? ((totalTransactions - prevTransactions) / prevTransactions) * 100
        : 0;

      setStats({
        totalRevenue,
        totalTransactions,
        successRate,
        averageOrderValue,
        revenueChange,
        transactionChange
      });

      // Calculate daily revenue
      const dateInterval = eachDayOfInterval({
        start: startDate,
        end: new Date()
      });

      const dailyData: DailyRevenue[] = dateInterval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayPayments = successfulPayments.filter(p => 
          format(parseISO(p.created_at), 'yyyy-MM-dd') === dateStr
        );
        return {
          date: format(date, 'MMM d'),
          revenue: dayPayments.reduce((sum, p) => sum + p.amount, 0),
          transactions: dayPayments.length
        };
      });

      setDailyRevenue(dailyData);

      // Calculate payment method breakdown
      const methodCounts: Record<string, { amount: number; count: number }> = {};
      successfulPayments.forEach(p => {
        const method = p.channel || 'other';
        if (!methodCounts[method]) {
          methodCounts[method] = { amount: 0, count: 0 };
        }
        methodCounts[method].amount += p.amount;
        methodCounts[method].count += 1;
      });

      const methodColors: Record<string, string> = {
        card: '#3B82F6',
        mobile_money: '#10B981',
        bank_transfer: '#8B5CF6',
        ussd: '#F59E0B',
        other: '#6B7280'
      };

      const methodStats: PaymentMethodStats[] = Object.entries(methodCounts).map(([name, data]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: data.amount,
        count: data.count,
        color: methodColors[name] || '#6B7280'
      }));

      setPaymentMethods(methodStats);

      // Calculate status breakdown
      const statusCounts: Record<string, number> = {};
      (currentPayments || []).forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });

      const statusColors: Record<string, string> = {
        success: '#10B981',
        pending: '#F59E0B',
        failed: '#EF4444',
        refunded: '#8B5CF6',
        abandoned: '#6B7280'
      };

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: statusColors[name] || '#6B7280'
      }));

      setStatusBreakdown(statusData);

      // Set recent payments
      setRecentPayments((currentPayments || []).slice(0, 10));

    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Reference', 'Amount', 'Currency', 'Status', 'Channel', 'Email', 'Date'];
    const rows = recentPayments.map(p => [
      p.paystack_reference,
      p.amount,
      p.currency,
      p.status,
      p.channel || 'N/A',
      p.customer_email || 'N/A',
      format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Payment report has been downloaded',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-600" />
            Payment Reports
          </h1>
          <p className="text-gray-500">Analytics and insights for your payment transactions</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchReportData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  KES {stats.totalRevenue.toLocaleString()}
                </p>
                <div className={`flex items-center text-sm ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span>{Math.abs(stats.revenueChange).toFixed(1)}% vs prev period</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                <div className={`flex items-center text-sm ${stats.transactionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.transactionChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span>{Math.abs(stats.transactionChange).toFixed(1)}% vs prev period</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">
                  {stats.successRate >= 95 ? '✓ Excellent' : stats.successRate >= 90 ? '○ Good' : '⚠ Needs attention'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Order Value</p>
                <p className="text-2xl font-bold">
                  KES {stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-400">Per successful transaction</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Revenue breakdown by payment channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Transactions
            </CardTitle>
            <CardDescription>Number of transactions per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="transactions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Transaction Status
            </CardTitle>
            <CardDescription>Breakdown of transaction outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.paystack_reference}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.channel?.replace('_', ' ') || 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {payment.customer_email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReports;
