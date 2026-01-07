import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';

interface SupplierChartsProps {
  salesData?: any[];
  orderStatusData?: any[];
  topProductsData?: any[];
  monthlyRevenueData?: any[];
  isDarkMode?: boolean;
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];
const STATUS_COLORS = {
  pending: '#eab308',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444'
};

export const SupplierCharts: React.FC<SupplierChartsProps> = ({
  salesData,
  orderStatusData,
  topProductsData,
  monthlyRevenueData,
  isDarkMode = false
}) => {
  // Default data if none provided
  const defaultSalesData = [
    { name: 'Mon', sales: 4000, orders: 24 },
    { name: 'Tue', sales: 3000, orders: 18 },
    { name: 'Wed', sales: 5000, orders: 32 },
    { name: 'Thu', sales: 2780, orders: 15 },
    { name: 'Fri', sales: 6890, orders: 45 },
    { name: 'Sat', sales: 4390, orders: 28 },
    { name: 'Sun', sales: 3490, orders: 20 },
  ];

  const defaultOrderStatusData = [
    { name: 'Pending', value: 15, color: STATUS_COLORS.pending },
    { name: 'Processing', value: 25, color: STATUS_COLORS.processing },
    { name: 'Shipped', value: 35, color: STATUS_COLORS.shipped },
    { name: 'Delivered', value: 45, color: STATUS_COLORS.delivered },
    { name: 'Cancelled', value: 5, color: STATUS_COLORS.cancelled },
  ];

  const defaultTopProductsData = [
    { name: 'Cement 50kg', sales: 1250, revenue: 937500 },
    { name: 'Steel Bars 12mm', sales: 890, revenue: 1068000 },
    { name: 'Roofing Sheets', sales: 650, revenue: 975000 },
    { name: 'Sand (ton)', sales: 420, revenue: 1470000 },
    { name: 'Bricks (1000)', sales: 380, revenue: 3040000 },
  ];

  const defaultMonthlyRevenueData = [
    { month: 'Jan', revenue: 450000, target: 500000 },
    { month: 'Feb', revenue: 520000, target: 500000 },
    { month: 'Mar', revenue: 480000, target: 550000 },
    { month: 'Apr', revenue: 610000, target: 550000 },
    { month: 'May', revenue: 580000, target: 600000 },
    { month: 'Jun', revenue: 720000, target: 600000 },
  ];

  const sales = salesData || defaultSalesData;
  const orderStatus = orderStatusData || defaultOrderStatusData;
  const topProducts = topProductsData || defaultTopProductsData;
  const monthlyRevenue = monthlyRevenueData || defaultMonthlyRevenueData;

  const textColor = isDarkMode ? '#e5e7eb' : '#374151';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

  const formatCurrency = (value: number) => {
    return `KES ${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend Chart */}
      <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Weekly Sales Trend
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
            Sales performance over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={sales}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={textColor} fontSize={12} />
              <YAxis stroke={textColor} fontSize={12} tickFormatter={formatCurrency} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: textColor
                }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Sales']}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#f97316" 
                fillOpacity={1} 
                fill="url(#salesGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Order Status Distribution */}
      <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            Order Status Distribution
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
            Current order status breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={orderStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {orderStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products Bar Chart */}
      <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <Package className="h-5 w-5 text-orange-500" />
            Top Selling Products
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
            Best performing products by sales volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" stroke={textColor} fontSize={12} />
              <YAxis dataKey="name" type="category" stroke={textColor} fontSize={11} width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  name === 'sales' ? `${value} units` : `KES ${value.toLocaleString()}`,
                  name === 'sales' ? 'Units Sold' : 'Revenue'
                ]}
              />
              <Bar dataKey="sales" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Revenue vs Target */}
      <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <DollarSign className="h-5 w-5 text-orange-500" />
            Revenue vs Target
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
            Monthly revenue performance against targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" stroke={textColor} fontSize={12} />
              <YAxis stroke={textColor} fontSize={12} tickFormatter={formatCurrency} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={{ fill: '#f97316', strokeWidth: 2 }}
                name="Actual Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#94a3b8', strokeWidth: 2 }}
                name="Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierCharts;




