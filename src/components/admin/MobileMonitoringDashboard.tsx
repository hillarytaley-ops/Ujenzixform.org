import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/DashboardLoader';
import { 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { 
  Bell, 
  Truck, 
  Camera, 
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { format } from 'date-fns';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export const MobileMonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { metrics, dailyData, alertTypeData, loading, isLive, toggleLive, refresh } = useRealTimeAnalytics('7days');

  const quickActions: QuickAction[] = [
    {
      id: 'view-alerts',
      label: 'View Alerts',
      icon: <Bell className="h-5 w-5" />,
      color: 'bg-red-500',
      onClick: () => setActiveTab('alerts')
    },
    {
      id: 'track-deliveries',
      label: 'Track Deliveries',
      icon: <Truck className="h-5 w-5" />,
      color: 'bg-blue-500',
      onClick: () => setActiveTab('deliveries')
    },
    {
      id: 'camera-access',
      label: 'Camera Access',
      icon: <Camera className="h-5 w-5" />,
      color: 'bg-purple-500',
      onClick: () => setActiveTab('cameras')
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <Activity className="h-5 w-5" />,
      color: 'bg-green-500',
      onClick: () => setActiveTab('analytics')
    }
  ];

  const getStatusColor = (value: number, threshold: { warning: number; danger: number }) => {
    if (value >= threshold.danger) return 'text-red-500';
    if (value >= threshold.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return <DashboardLoader type="admin" message="Loading monitoring..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">MradiPro</h1>
            <p className="text-xs text-slate-400">Monitoring Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLive}
              className={isLive ? 'text-green-500' : 'text-slate-400'}
            >
              {isLive ? <Wifi className="h-5 w-5 animate-pulse" /> : <WifiOff className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={refresh} className="text-slate-400">
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Live • Updated {format(metrics.lastUpdate, 'HH:mm:ss')}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Alerts Card */}
          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-red-300">Active Alerts</p>
                  <p className="text-3xl font-bold text-white">{metrics.totalAlerts - metrics.resolvedAlerts}</p>
                </div>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Bell className="h-5 w-5 text-red-400" />
                </div>
              </div>
              {metrics.criticalAlerts > 0 && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  {metrics.criticalAlerts} critical
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Deliveries Card */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-300">Active Deliveries</p>
                  <p className="text-3xl font-bold text-white">{metrics.activeDeliveries}</p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-blue-300 mt-2">
                {metrics.completedDeliveries} completed today
              </p>
            </CardContent>
          </Card>

          {/* Resolved Card */}
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-green-300">Resolved</p>
                  <p className="text-3xl font-bold text-white">{metrics.resolvedAlerts}</p>
                </div>
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <Progress 
                value={metrics.totalAlerts > 0 ? (metrics.resolvedAlerts / metrics.totalAlerts) * 100 : 0} 
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>

          {/* Requests Card */}
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-300">Pending Requests</p>
                  <p className="text-3xl font-bold text-white">{metrics.pendingRequests}</p>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Camera className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-purple-300 mt-2">
                Camera access
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mini Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                7-Day Activity
              </span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="mobileGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="alerts" 
                  stroke="#3b82f6" 
                  fill="url(#mobileGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alert Type Distribution - Mini Pie */}
        {alertTypeData.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alert Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={alertTypeData.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {alertTypeData.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {alertTypeData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <span className="text-white font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 px-1">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50"
                onClick={action.onClick}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  {action.icon}
                </div>
                <span className="text-xs text-slate-300">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                System Status
              </span>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                Online
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Cameras</span>
              </div>
              <span className="text-sm text-green-400">All Online</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Delivery Tracking</span>
              </div>
              <span className="text-sm text-green-400">Active</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Alert System</span>
              </div>
              <span className="text-sm text-green-400">Monitoring</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 px-4 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-blue-500' : 'text-slate-400'}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity className="h-5 w-5" />
            <span className="text-xs">Overview</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${activeTab === 'alerts' ? 'text-blue-500' : 'text-slate-400'}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs">Alerts</span>
            {metrics.criticalAlerts > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${activeTab === 'deliveries' ? 'text-blue-500' : 'text-slate-400'}`}
            onClick={() => setActiveTab('deliveries')}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs">Deliveries</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 ${activeTab === 'cameras' ? 'text-blue-500' : 'text-slate-400'}`}
            onClick={() => setActiveTab('cameras')}
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">Cameras</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileMonitoringDashboard;








