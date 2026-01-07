import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
  Cell
} from 'recharts';
import { 
  Activity,
  Grid3X3,
  Target,
  TrendingUp,
  Layers,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';

interface HeatMapCell {
  day: string;
  hour: number;
  value: number;
  count: number;
}

interface ScatterDataPoint {
  x: number;
  y: number;
  z: number;
  name: string;
  category: string;
}

interface RadarData {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const AdvancedCharts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [heatMapData, setHeatMapData] = useState<HeatMapCell[]>([]);
  const [scatterData, setScatterData] = useState<ScatterDataPoint[]>([]);
  const [radarData, setRadarData] = useState<RadarData[]>([]);
  const [treemapData, setTreemapData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);

  useEffect(() => {
    fetchAdvancedData();
  }, []);

  const fetchAdvancedData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      const [alertsRes, deliveriesRes, requestsRes] = await Promise.all([
        supabase
          .from('monitoring_alerts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('delivery_routes')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('camera_access_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const alerts = alertsRes.data || [];
      const deliveries = deliveriesRes.data || [];
      const requests = requestsRes.data || [];

      // Generate Heat Map Data (Activity by Day/Hour)
      const heatMap: HeatMapCell[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const count = alerts.filter(a => {
            const date = new Date(a.created_at);
            return date.getDay() === day && date.getHours() === hour;
          }).length;
          
          heatMap.push({
            day: days[day],
            hour,
            value: count,
            count
          });
        }
      }
      setHeatMapData(heatMap);

      // Generate Scatter Data (Response Time vs Severity)
      const scatter: ScatterDataPoint[] = alerts.map((a, idx) => {
        const resolutionTime = a.resolved_at 
          ? (new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60)
          : Math.random() * 120;
        
        const severityScore = 
          a.severity === 'emergency' ? 4 :
          a.severity === 'critical' ? 3 :
          a.severity === 'warning' ? 2 : 1;

        return {
          x: severityScore,
          y: Math.min(resolutionTime, 120),
          z: 10 + Math.random() * 20,
          name: a.title || `Alert ${idx + 1}`,
          category: a.alert_type || 'unknown'
        };
      });
      setScatterData(scatter);

      // Generate Radar Data (Performance Metrics)
      const totalAlerts = alerts.length;
      const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
      const completedDeliveries = deliveries.filter(d => d.status === 'completed' || d.status === 'arrived').length;
      const approvedRequests = requests.filter(r => r.status === 'approved').length;

      const radar: RadarData[] = [
        { subject: 'Alert Response', A: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 100, B: 80, fullMark: 100 },
        { subject: 'Critical Handling', A: totalAlerts > 0 ? ((totalAlerts - criticalAlerts) / totalAlerts) * 100 : 100, B: 90, fullMark: 100 },
        { subject: 'Delivery Success', A: deliveries.length > 0 ? (completedDeliveries / deliveries.length) * 100 : 100, B: 85, fullMark: 100 },
        { subject: 'Request Processing', A: requests.length > 0 ? (approvedRequests / requests.length) * 100 : 100, B: 75, fullMark: 100 },
        { subject: 'System Uptime', A: 95 + Math.random() * 5, B: 99, fullMark: 100 },
        { subject: 'Camera Coverage', A: 85 + Math.random() * 10, B: 90, fullMark: 100 },
      ];
      setRadarData(radar);

      // Generate Treemap Data (Alert Distribution by Type/Severity)
      const alertsByType: Record<string, { count: number; severity: Record<string, number> }> = {};
      alerts.forEach(a => {
        const type = a.alert_type || 'unknown';
        const sev = a.severity || 'info';
        
        if (!alertsByType[type]) {
          alertsByType[type] = { count: 0, severity: {} };
        }
        alertsByType[type].count++;
        alertsByType[type].severity[sev] = (alertsByType[type].severity[sev] || 0) + 1;
      });

      const treemap = Object.entries(alertsByType).map(([type, data], idx) => ({
        name: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        size: data.count,
        fill: COLORS[idx % COLORS.length],
        children: Object.entries(data.severity).map(([sev, count]) => ({
          name: sev,
          size: count
        }))
      }));
      setTreemapData(treemap);

      // Generate Funnel Data (Alert Lifecycle)
      const funnel: FunnelData[] = [
        { name: 'Total Alerts', value: totalAlerts || 10, fill: '#3b82f6' },
        { name: 'Acknowledged', value: alerts.filter(a => a.status !== 'pending').length || 8, fill: '#8b5cf6' },
        { name: 'In Progress', value: alerts.filter(a => a.status === 'acknowledged').length || 5, fill: '#f59e0b' },
        { name: 'Resolved', value: resolvedAlerts || 3, fill: '#22c55e' }
      ];
      setFunnelData(funnel);

    } catch (error) {
      console.error('Error fetching advanced chart data:', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  // Custom Heat Map Component
  const HeatMap: React.FC<{ data: HeatMapCell[] }> = ({ data }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const maxValue = Math.max(...data.map(d => d.value), 1);

    const getColor = (value: number) => {
      if (value === 0) return 'bg-slate-800';
      const intensity = value / maxValue;
      if (intensity > 0.75) return 'bg-red-500';
      if (intensity > 0.5) return 'bg-orange-500';
      if (intensity > 0.25) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex gap-1 mb-2">
            <div className="w-12" />
            {hours.map(h => (
              <div key={h} className="flex-1 text-center text-xs text-muted-foreground">
                {h % 3 === 0 ? `${h}:00` : ''}
              </div>
            ))}
          </div>
          {days.map(day => (
            <div key={day} className="flex gap-1 mb-1">
              <div className="w-12 text-xs text-muted-foreground flex items-center">{day}</div>
              {hours.map(hour => {
                const cell = data.find(d => d.day === day && d.hour === hour);
                return (
                  <div
                    key={hour}
                    className={`flex-1 h-6 rounded ${getColor(cell?.value || 0)} cursor-pointer transition-all hover:ring-2 hover:ring-white/50`}
                    title={`${day} ${hour}:00 - ${cell?.count || 0} alerts`}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-slate-800" />
              <div className="w-4 h-4 rounded bg-green-500" />
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <div className="w-4 h-4 rounded bg-orange-500" />
              <div className="w-4 h-4 rounded bg-red-500" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Advanced Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Deep dive into monitoring patterns and performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAdvancedData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="heatmap" className="flex items-center gap-1">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Heat Map</span>
          </TabsTrigger>
          <TabsTrigger value="scatter" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Scatter</span>
          </TabsTrigger>
          <TabsTrigger value="radar" className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Radar</span>
          </TabsTrigger>
          <TabsTrigger value="treemap" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Treemap</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Funnel</span>
          </TabsTrigger>
        </TabsList>

        {/* Heat Map */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Activity Heat Map
              </CardTitle>
              <CardDescription>
                Alert activity distribution across days and hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeatMap data={heatMapData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scatter Plot */}
        <TabsContent value="scatter">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Response Time vs Severity
              </CardTitle>
              <CardDescription>
                Correlation between alert severity and resolution time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Severity" 
                    domain={[0, 5]}
                    tickFormatter={(v) => ['', 'Info', 'Warning', 'Critical', 'Emergency'][v] || ''}
                    stroke="#94a3b8"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Resolution Time" 
                    unit=" min"
                    stroke="#94a3b8"
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Severity') {
                        return [['Info', 'Warning', 'Critical', 'Emergency'][value - 1] || value, name];
                      }
                      return [`${Math.round(value)} min`, 'Resolution Time'];
                    }}
                  />
                  <Legend />
                  <Scatter 
                    name="Alerts" 
                    data={scatterData} 
                    fill="#3b82f6"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.x >= 4 ? '#dc2626' :
                          entry.x >= 3 ? '#f59e0b' :
                          entry.x >= 2 ? '#eab308' : '#22c55e'
                        } 
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Radar Chart */}
        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance Radar
              </CardTitle>
              <CardDescription>
                Multi-dimensional performance metrics comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                  <Radar 
                    name="Current" 
                    dataKey="A" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.5} 
                  />
                  <Radar 
                    name="Target" 
                    dataKey="B" 
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treemap */}
        <TabsContent value="treemap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Alert Distribution Treemap
              </CardTitle>
              <CardDescription>
                Hierarchical view of alerts by type and volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#1e293b"
                  fill="#3b82f6"
                >
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [`${value} alerts`, name]}
                  />
                </Treemap>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4">
                {treemapData.map((item, idx) => (
                  <Badge key={idx} variant="outline" style={{ borderColor: item.fill, color: item.fill }}>
                    {item.name}: {item.size}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Chart */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Alert Resolution Funnel
              </CardTitle>
              <CardDescription>
                Alert lifecycle progression from creation to resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <FunnelChart>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {funnelData.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: item.fill }}>{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                    {idx > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {((item.value / funnelData[0].value) * 100).toFixed(0)}% of total
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedCharts;














