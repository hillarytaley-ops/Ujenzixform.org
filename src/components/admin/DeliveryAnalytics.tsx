import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Truck, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Package,
  MapPin,
  Star,
  Users,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Timer,
  Award,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Route,
  Fuel
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface DeliveryProvider {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  status: string;
  rating: number;
  total_deliveries: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  total_earnings: number;
  avg_delivery_time: number;
  on_time_rate: number;
  acceptance_rate: number;
  created_at: string;
  last_active: string;
  service_areas: string[];
}

interface DeliveryStats {
  totalProviders: number;
  activeProviders: number;
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  avgDeliveryTime: number;
  avgRating: number;
  totalRevenue: number;
  onTimeRate: number;
  todayDeliveries: number;
  weekDeliveries: number;
}

interface DeliveryTrend {
  date: string;
  deliveries: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const DeliveryAnalytics: React.FC = () => {
  const [stats, setStats] = useState<DeliveryStats>({
    totalProviders: 0,
    activeProviders: 0,
    totalDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    cancelledDeliveries: 0,
    avgDeliveryTime: 0,
    avgRating: 0,
    totalRevenue: 0,
    onTimeRate: 0,
    todayDeliveries: 0,
    weekDeliveries: 0
  });
  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [trends, setTrends] = useState<DeliveryTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7days');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load delivery providers
      const { data: providersData, error: providersError } = await supabase
        .from('delivery_provider_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (providersError) throw providersError;

      // Load delivery requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('delivery_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Process providers with mock performance data (would come from actual tracking in production)
      const processedProviders: DeliveryProvider[] = (providersData || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || '',
        phone: p.phone || '',
        vehicle_type: p.vehicle_type || 'Unknown',
        status: p.status || 'pending',
        rating: Math.random() * 2 + 3, // 3-5 rating (mock)
        total_deliveries: Math.floor(Math.random() * 100),
        completed_deliveries: Math.floor(Math.random() * 80),
        cancelled_deliveries: Math.floor(Math.random() * 10),
        total_earnings: Math.floor(Math.random() * 50000) + 10000,
        avg_delivery_time: Math.floor(Math.random() * 30) + 20, // 20-50 mins
        on_time_rate: Math.random() * 30 + 70, // 70-100%
        acceptance_rate: Math.random() * 20 + 80, // 80-100%
        created_at: p.created_at,
        last_active: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        service_areas: p.service_areas || []
      }));

      setProviders(processedProviders);

      // Calculate stats
      const requests = requestsData || [];
      const completedRequests = requests.filter((r: any) => r.status === 'delivered' || r.status === 'completed');
      const pendingRequests = requests.filter((r: any) => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_transit');
      const cancelledRequests = requests.filter((r: any) => r.status === 'cancelled');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDeliveries = requests.filter((r: any) => new Date(r.created_at) >= today).length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekDeliveries = requests.filter((r: any) => new Date(r.created_at) >= weekAgo).length;

      // Calculate average rating
      const avgRating = processedProviders.length > 0
        ? processedProviders.reduce((sum, p) => sum + p.rating, 0) / processedProviders.length
        : 0;

      // Calculate average delivery time
      const avgDeliveryTime = processedProviders.length > 0
        ? processedProviders.reduce((sum, p) => sum + p.avg_delivery_time, 0) / processedProviders.length
        : 0;

      // Calculate on-time rate
      const onTimeRate = processedProviders.length > 0
        ? processedProviders.reduce((sum, p) => sum + p.on_time_rate, 0) / processedProviders.length
        : 0;

      // Calculate total revenue
      const totalRevenue = processedProviders.reduce((sum, p) => sum + p.total_earnings, 0);

      setStats({
        totalProviders: processedProviders.length,
        activeProviders: processedProviders.filter(p => p.status === 'approved' || p.status === 'active').length,
        totalDeliveries: requests.length,
        completedDeliveries: completedRequests.length,
        pendingDeliveries: pendingRequests.length,
        cancelledDeliveries: cancelledRequests.length,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalRevenue,
        onTimeRate: Math.round(onTimeRate),
        todayDeliveries,
        weekDeliveries
      });

      // Generate trend data (mock for demonstration)
      const trendData: DeliveryTrend[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trendData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          deliveries: Math.floor(Math.random() * 20) + 5,
          completed: Math.floor(Math.random() * 15) + 3,
          cancelled: Math.floor(Math.random() * 3),
          revenue: Math.floor(Math.random() * 10000) + 5000
        });
      }
      setTrends(trendData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || provider.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4.0) return 'text-blue-400';
    if (rating >= 3.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Vehicle', 'Status', 'Rating', 'Total Deliveries', 'Completed', 'Earnings', 'On-Time Rate'];
    const rows = filteredProviders.map(p => [
      p.full_name,
      p.email,
      p.vehicle_type,
      p.status,
      p.rating.toFixed(1),
      p.total_deliveries,
      p.completed_deliveries,
      `KES ${p.total_earnings.toLocaleString()}`,
      `${p.on_time_rate.toFixed(0)}%`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Delivery analytics exported to CSV'
    });
  };

  // Pie chart data for delivery status
  const statusPieData = [
    { name: 'Completed', value: stats.completedDeliveries, color: '#10B981' },
    { name: 'Pending', value: stats.pendingDeliveries, color: '#F59E0B' },
    { name: 'Cancelled', value: stats.cancelledDeliveries, color: '#EF4444' }
  ];

  // Vehicle type distribution
  const vehicleTypeData = providers.reduce((acc: any[], p) => {
    const existing = acc.find(v => v.name === p.vehicle_type);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: p.vehicle_type || 'Unknown', value: 1 });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-green-400" />
            Delivery Provider Analytics
          </h2>
          <p className="text-slate-400">
            Monitor delivery performance, provider metrics, and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics} className="border-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400">
                {stats.activeProviders} active
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.totalProviders}</p>
            <p className="text-sm text-slate-400">Total Providers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Package className="h-8 w-8 text-blue-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.totalDeliveries}</p>
            <p className="text-sm text-slate-400">Total Deliveries</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <span className="text-xs text-emerald-400">
                {stats.totalDeliveries > 0 ? Math.round((stats.completedDeliveries / stats.totalDeliveries) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.completedDeliveries}</p>
            <p className="text-sm text-slate-400">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-yellow-400" />
              <Activity className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.avgDeliveryTime} min</p>
            <p className="text-sm text-slate-400">Avg Delivery Time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Star className="h-8 w-8 text-purple-400" />
              <span className={`text-sm font-bold ${getRatingColor(stats.avgRating)}`}>
                ★ {stats.avgRating}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.onTimeRate}%</p>
            <p className="text-sm text-slate-400">On-Time Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-cyan-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-cyan-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              KES {(stats.totalRevenue / 1000).toFixed(0)}K
            </p>
            <p className="text-sm text-slate-400">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Delivery Trends */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Delivery Trends
            </CardTitle>
            <CardDescription>Daily delivery volume over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="deliveries" 
                  stroke="#3B82F6" 
                  fillOpacity={1}
                  fill="url(#colorDeliveries)"
                  name="Total Deliveries"
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10B981" 
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delivery Status Distribution */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-400" />
              Delivery Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of delivery statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {statusPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-slate-400">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${(value/1000).toFixed(0)}K`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-400" />
              Vehicle Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of provider vehicle types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vehicleTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Providers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-400" />
                Provider Performance Leaderboard
              </CardTitle>
              <CardDescription>Detailed performance metrics for all providers</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 w-full sm:w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">Rank</TableHead>
                  <TableHead className="text-slate-400">Provider</TableHead>
                  <TableHead className="text-slate-400">Vehicle</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-center">Rating</TableHead>
                  <TableHead className="text-slate-400 text-center">Deliveries</TableHead>
                  <TableHead className="text-slate-400 text-center">Completion</TableHead>
                  <TableHead className="text-slate-400 text-center">On-Time</TableHead>
                  <TableHead className="text-slate-400 text-center">Avg Time</TableHead>
                  <TableHead className="text-slate-400 text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders
                  .sort((a, b) => b.completed_deliveries - a.completed_deliveries)
                  .map((provider, index) => (
                  <TableRow key={provider.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800">
                        {index === 0 && <span className="text-yellow-400 font-bold">🥇</span>}
                        {index === 1 && <span className="text-slate-300 font-bold">🥈</span>}
                        {index === 2 && <span className="text-orange-400 font-bold">🥉</span>}
                        {index > 2 && <span className="text-slate-400">{index + 1}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{provider.full_name}</p>
                        <p className="text-xs text-slate-400">{provider.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600">
                        {provider.vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(provider.status)}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className={`h-4 w-4 ${getRatingColor(provider.rating)}`} fill="currentColor" />
                        <span className={getRatingColor(provider.rating)}>{provider.rating.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        <span className="text-white font-medium">{provider.total_deliveries}</span>
                        <span className="text-slate-400 text-xs ml-1">total</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-green-400">{provider.completed_deliveries}</span>
                        <Progress 
                          value={(provider.completed_deliveries / Math.max(provider.total_deliveries, 1)) * 100} 
                          className="h-1 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={provider.on_time_rate >= 90 ? 'text-green-400' : provider.on_time_rate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                        {provider.on_time_rate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-slate-300">{provider.avg_delivery_time} min</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-400 font-medium">
                        KES {provider.total_earnings.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredProviders.length === 0 && (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No providers found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Top Performer</h4>
                <p className="text-sm text-slate-400">
                  {providers.length > 0 
                    ? `${providers.sort((a, b) => b.completed_deliveries - a.completed_deliveries)[0]?.full_name} with ${providers[0]?.completed_deliveries} deliveries`
                    : 'No data yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Today's Activity</h4>
                <p className="text-sm text-slate-400">
                  {stats.todayDeliveries} deliveries today, {stats.weekDeliveries} this week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Performance</h4>
                <p className="text-sm text-slate-400">
                  {stats.onTimeRate}% on-time rate with {stats.avgRating} avg rating
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryAnalytics;




