import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Truck, 
  DollarSign, 
  Package,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Users,
  Building,
  Route,
  Fuel,
  Shield,
  Target,
  Zap,
  Award,
  Calculator
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeliveryMetrics, ProviderPerformance, MaterialStats } from '@/types/delivery';
// import { useDeliveries } from '@/hooks/useDeliveries';

interface EnhancedDeliveryAnalyticsProps {
  userRole?: string;
  userId?: string;
  timeRange?: string;
}

export const EnhancedDeliveryAnalytics: React.FC<EnhancedDeliveryAnalyticsProps> = ({ 
  userRole = 'admin',
  userId,
  timeRange = '30days' 
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  // const { metrics, refetch } = useDeliveries({}, 1, 1);
  const { toast } = useToast();
  
  // Mock metrics for now
  const [metrics] = useState<DeliveryMetrics>({
    totalDeliveries: 45,
    completedDeliveries: 38,
    pendingDeliveries: 4,
    inTransitDeliveries: 3,
    averageDeliveryTime: 4.2,
    onTimeDeliveryRate: 87.3,
    totalCost: 125000,
    averageCost: 2750,
    topMaterials: [
      { material_type: 'Cement', count: 15, percentage: 33.3 },
      { material_type: 'Steel Bars', count: 12, percentage: 26.7 },
      { material_type: 'Sand', count: 8, percentage: 17.8 }
    ],
    providerPerformance: [
      { provider_id: 'p1', provider_name: 'Swift Logistics', total_deliveries: 12, completion_rate: 95.5, average_rating: 4.8, on_time_rate: 91.2 },
      { provider_id: 'p2', provider_name: 'Reliable Transport', total_deliveries: 8, completion_rate: 88.9, average_rating: 4.5, on_time_rate: 85.4 }
    ]
  });
  
  const refetch = () => {
    console.log('Refetch called - using mock data');
  };

  useEffect(() => {
    refetch();
  }, [selectedTimeRange]);

  const getPerformanceColor = (value: number, type: 'percentage' | 'rating' = 'percentage') => {
    if (type === 'rating') {
      if (value >= 4.5) return 'text-green-600';
      if (value >= 4.0) return 'text-yellow-600';
      if (value >= 3.5) return 'text-orange-600';
      return 'text-red-600';
    }
    
    if (value >= 90) return 'text-green-600';
    if (value >= 75) return 'text-yellow-600';
    if (value >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (value: number, type: 'percentage' | 'rating' = 'percentage') => {
    const threshold = type === 'rating' ? 4.0 : 80;
    return value >= threshold ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit = '', 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'text-primary',
    description 
  }: {
    title: string;
    value: number | string;
    unit?: string;
    icon: any;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    color?: string;
    description?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${color}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className={`h-8 w-8 ${color.replace('text-', 'text-').replace('-600', '-500')}`} />
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {getPerformanceIcon(parseFloat(trendValue) || 0)}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProviderPerformanceCard = ({ provider }: { provider: ProviderPerformance }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold">{provider.provider_name}</h4>
            <p className="text-sm text-muted-foreground">{provider.total_deliveries} deliveries</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{provider.average_rating.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion Rate</span>
            <span className={getPerformanceColor(provider.completion_rate)}>{provider.completion_rate}%</span>
          </div>
          <Progress value={provider.completion_rate} className="h-2" />
          
          <div className="flex justify-between text-sm">
            <span>On-Time Rate</span>
            <span className={getPerformanceColor(provider.on_time_rate)}>{provider.on_time_rate}%</span>
          </div>
          <Progress value={provider.on_time_rate} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

  const MaterialStatsCard = ({ material }: { material: MaterialStats }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{material.material_type}</span>
          </div>
          <Badge variant="secondary">{material.count}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Share of deliveries</span>
            <span className="font-medium">{material.percentage}%</span>
          </div>
          <Progress value={material.percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Analytics</h2>
          <p className="text-muted-foreground">Comprehensive delivery performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Deliveries"
          value={metrics.totalDeliveries}
          icon={Package}
          color="text-blue-600"
          trend="up"
          trendValue="+12%"
          description="All delivery requests"
        />
        <MetricCard
          title="Completion Rate"
          value={metrics.totalDeliveries > 0 ? Math.round((metrics.completedDeliveries / metrics.totalDeliveries) * 100) : 0}
          unit="%"
          icon={CheckCircle}
          color="text-green-600"
          trend="up"
          trendValue="+5%"
          description="Successfully completed"
        />
        <MetricCard
          title="Avg Delivery Time"
          value={metrics.averageDeliveryTime?.toFixed(1) || '0'}
          unit="hours"
          icon={Clock}
          color="text-orange-600"
          trend="down"
          trendValue="-0.5h"
          description="Pickup to delivery"
        />
        <MetricCard
          title="On-Time Rate"
          value={metrics.onTimeDeliveryRate?.toFixed(1) || '0'}
          unit="%"
          icon={Target}
          color={getPerformanceColor(metrics.onTimeDeliveryRate || 0)}
          trend="up"
          trendValue="+3%"
          description="Delivered on schedule"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cost Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Cost"
              value={`KES ${(metrics.totalCost || 0).toLocaleString()}`}
              icon={DollarSign}
              color="text-purple-600"
              description="All delivery costs"
            />
            <MetricCard
              title="Average Cost"
              value={`KES ${(metrics.averageCost || 0).toLocaleString()}`}
              icon={Calculator}
              color="text-blue-600"
              description="Per delivery average"
            />
            <MetricCard
              title="Cost Efficiency"
              value="87"
              unit="%"
              icon={Zap}
              color="text-green-600"
              description="Cost optimization score"
            />
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Delivery Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{metrics.pendingDeliveries}</div>
                  <div className="text-sm text-blue-700">Pending</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{metrics.inTransitDeliveries}</div>
                  <div className="text-sm text-yellow-700">In Transit</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{metrics.completedDeliveries}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{metrics.totalDeliveries}</div>
                  <div className="text-sm text-purple-700">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Provider Performance
              </CardTitle>
              <CardDescription>
                Top performing delivery providers based on completion rate and customer satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.providerPerformance.map((provider, index) => (
                  <ProviderPerformanceCard key={provider.provider_id} provider={provider} />
                ))}
              </div>
              
              {metrics.providerPerformance.length === 0 && (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No provider performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Delivery Analysis
              </CardTitle>
              <CardDescription>
                Most frequently delivered construction materials and their trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.topMaterials.map((material, index) => (
                  <MaterialStatsCard key={material.material_type} material={material} />
                ))}
              </div>
              
              {metrics.topMaterials.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No material delivery data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* AI-Powered Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Intelligent recommendations to optimize your delivery operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Cost Optimization</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    You could save 15% on delivery costs by scheduling more deliveries during off-peak hours.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Route Efficiency</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Grouping deliveries in the same area could reduce delivery time by 25%.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-800">Provider Selection</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Top-rated providers have 95% on-time delivery rate. Consider premium providers for urgent deliveries.
                  </p>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Timing Optimization</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    Tuesday-Thursday deliveries have the highest success rate (92% vs 85% average).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Benchmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Industry Average On-Time Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={82} className="w-24 h-2" />
                    <span className="text-sm">82%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your On-Time Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.onTimeDeliveryRate || 0} className="w-24 h-2" />
                    <span className={`text-sm font-medium ${getPerformanceColor(metrics.onTimeDeliveryRate || 0)}`}>
                      {metrics.onTimeDeliveryRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Industry Average Cost per KM</span>
                  <span className="text-sm">KES 55</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Average Cost per KM</span>
                  <span className="text-sm font-medium">KES 52</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Predictive Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Next Week Forecast</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Expected Deliveries</span>
                      <span className="font-medium">24-28</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Peak Day</span>
                      <span className="font-medium">Wednesday</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Estimated Cost</span>
                      <span className="font-medium">KES 45,000 - 52,000</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Seasonal Trends</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Peak Season</span>
                      <span className="font-medium">Jan-Mar, Jul-Sep</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Demand Increase</span>
                      <span className="font-medium">+35% during peak</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost Variation</span>
                      <span className="font-medium">±15% seasonal</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
