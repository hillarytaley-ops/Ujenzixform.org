import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  BarChart3,
  Camera,
  Truck,
  Package,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Eye,
  MapPin,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface ProjectSummary {
  id: string;
  name: string;
  camerasOnline: number;
  camerasTotal: number;
  deliveriesCompleted: number;
  deliveriesTotal: number;
  activeAlerts: number;
  uptimePercent: number;
}

interface DailyActivity {
  date: string;
  deliveries: number;
  alerts: number;
}

interface DeliveryStatus {
  name: string;
  value: number;
  color: string;
}

export const BuilderAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    camerasOnline: 0,
    totalDeliveries: 0,
    completedDeliveries: 0,
    activeAlerts: 0,
    avgDeliveryTime: 0
  });

  useEffect(() => {
    if (user) {
      fetchBuilderData();
    }
  }, [user, timeRange, selectedProject]);

  const fetchBuilderData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = timeRange === '7days' ? subDays(endDate, 7) : 
                        timeRange === '30days' ? subDays(endDate, 30) : subDays(endDate, 1);

      // Fetch projects for this builder
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('builder_id', user?.id);

      const projectIds = projectsData?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch cameras for builder's projects
      const { data: cameras } = await supabase
        .from('cameras')
        .select('*')
        .in('project_id', projectIds);

      // Fetch deliveries (approximate match by project name)
      const { data: deliveries } = await supabase
        .from('delivery_routes')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch alerts for builder's projects
      const { data: alerts } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .in('related_project_id', projectIds)
        .gte('created_at', startDate.toISOString());

      // Calculate project summaries
      const projectSummaries: ProjectSummary[] = (projectsData || []).map(project => {
        const projectCameras = cameras?.filter(c => c.project_id === project.id) || [];
        const projectAlerts = alerts?.filter(a => a.related_project_id === project.id) || [];
        const projectDeliveries = deliveries?.filter(d => 
          d.destination_name?.toLowerCase().includes(project.name?.toLowerCase())
        ) || [];

        const online = projectCameras.filter(c => c.status === 'online').length;
        const completed = projectDeliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length;
        const active = projectAlerts.filter(a => a.status !== 'resolved').length;

        return {
          id: project.id,
          name: project.name || 'Unnamed Project',
          camerasOnline: online,
          camerasTotal: projectCameras.length,
          deliveriesCompleted: completed,
          deliveriesTotal: projectDeliveries.length,
          activeAlerts: active,
          uptimePercent: projectCameras.length > 0 ? Math.round((online / projectCameras.length) * 100) : 100
        };
      });

      setProjects(projectSummaries);

      // Calculate overall stats
      const allCameras = cameras || [];
      const allDeliveries = deliveries || [];
      const allAlerts = alerts || [];

      setStats({
        totalCameras: allCameras.length,
        camerasOnline: allCameras.filter(c => c.status === 'online').length,
        totalDeliveries: allDeliveries.length,
        completedDeliveries: allDeliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length,
        activeAlerts: allAlerts.filter(a => a.status !== 'resolved').length,
        avgDeliveryTime: 45 // Placeholder
      });

      // Generate daily activity data
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const daily = days.map(day => {
        const dayStr = format(day, 'MMM dd');
        const dayDeliveries = allDeliveries.filter(d => 
          format(new Date(d.created_at), 'MMM dd') === dayStr
        ).length;
        const dayAlerts = allAlerts.filter(a => 
          format(new Date(a.created_at), 'MMM dd') === dayStr
        ).length;

        return { date: dayStr, deliveries: dayDeliveries, alerts: dayAlerts };
      });
      setDailyActivity(daily);

      // Delivery status breakdown
      const statusCount: Record<string, number> = {};
      allDeliveries.forEach(d => {
        statusCount[d.status] = (statusCount[d.status] || 0) + 1;
      });
      
      const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        in_transit: '#3b82f6',
        arrived: '#22c55e',
        completed: '#16a34a',
        cancelled: '#ef4444'
      };

      setDeliveryStatus(
        Object.entries(statusCount).map(([name, value]) => ({
          name: name.replace('_', ' '),
          value,
          color: statusColors[name] || '#6b7280'
        }))
      );

    } catch (error) {
      console.error('Error fetching builder data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            Project Analytics
          </h2>
          <p className="text-muted-foreground">
            Monitor your construction projects in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchBuilderData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cameras Online</p>
                <p className="text-3xl font-bold">{stats.camerasOnline}/{stats.totalCameras}</p>
              </div>
              <div className={`p-3 rounded-lg ${stats.camerasOnline === stats.totalCameras ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <Camera className={`h-6 w-6 ${stats.camerasOnline === stats.totalCameras ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
            </div>
            <Progress 
              value={stats.totalCameras > 0 ? (stats.camerasOnline / stats.totalCameras) * 100 : 100} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deliveries</p>
                <p className="text-3xl font-bold">{stats.completedDeliveries}/{stats.totalDeliveries}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Truck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalDeliveries > 0 
                ? `${Math.round((stats.completedDeliveries / stats.totalDeliveries) * 100)}% completion rate`
                : 'No deliveries yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold">{stats.activeAlerts}</p>
              </div>
              <div className={`p-3 rounded-lg ${stats.activeAlerts > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <Bell className={`h-6 w-6 ${stats.activeAlerts > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </div>
            {stats.activeAlerts > 0 ? (
              <Badge variant="destructive" className="mt-2">Requires attention</Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-500 mt-2">All clear</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
                <p className="text-3xl font-bold">{stats.avgDeliveryTime}m</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-500">
              <TrendingDown className="h-4 w-4" />
              <span>12% faster</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyActivity}>
                <defs>
                  <linearGradient id="deliveriesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="deliveries" 
                  stroke="#3b82f6" 
                  fill="url(#deliveriesGrad)" 
                  strokeWidth={2}
                  name="Deliveries"
                />
                <Area 
                  type="monotone" 
                  dataKey="alerts" 
                  stroke="#ef4444" 
                  fill="url(#alertsGrad)" 
                  strokeWidth={2}
                  name="Alerts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delivery Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={deliveryStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deliveryStatus.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {deliveryStatus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm capitalize">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Your Projects
        </h3>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground">Projects will appear here once assigned</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {project.activeAlerts > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {project.activeAlerts} alerts
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cameras</p>
                      <p className="font-medium flex items-center gap-1">
                        <Camera className="h-4 w-4" />
                        {project.camerasOnline}/{project.camerasTotal}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deliveries</p>
                      <p className="font-medium flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        {project.deliveriesCompleted}/{project.deliveriesTotal}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className={project.uptimePercent >= 90 ? 'text-green-500' : 'text-yellow-500'}>
                        {project.uptimePercent}%
                      </span>
                    </div>
                    <Progress value={project.uptimePercent} className="h-2" />
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderAnalyticsDashboard;














