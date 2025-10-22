import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Shield
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  delayedDeliveries: number;
  averageDeliveryTime: number;
  totalCost: number;
  averageCost: number;
  customerSatisfaction: number;
  onTimeDeliveryRate: number;
}

interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  total_deliveries: number;
  completed_deliveries: number;
  average_rating: number;
  on_time_rate: number;
  average_cost: number;
  total_revenue: number;
}

interface DeliveryTrend {
  date: string;
  deliveries: number;
  completed: number;
  cost: number;
  average_time: number;
}

interface DeliveryAnalyticsDashboardProps {
  userRole?: string;
  userId?: string;
  timeRange?: string;
}

export const DeliveryAnalyticsDashboard: React.FC<DeliveryAnalyticsDashboardProps> = ({ 
  userRole = 'admin',
  userId,
  timeRange = '30days' 
}) => {
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [providerPerformance, setProviderPerformance] = useState<ProviderPerformance[]>([]);
  const [deliveryTrends, setDeliveryTrends] = useState<DeliveryTrend[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Mock analytics data - in production this would come from database
      const mockMetrics: DeliveryMetrics = {
        totalDeliveries: 1247,
        completedDeliveries: 1089,
        pendingDeliveries: 158,
        delayedDeliveries: 45,
        averageDeliveryTime: 4.2, // hours
        totalCost: 2450000, // KES
        averageCost: 2250, // KES per delivery
        customerSatisfaction: 4.6,
        onTimeDeliveryRate: 87.3 // percentage
      };

      const mockProviderPerformance: ProviderPerformance[] = [
        {
          provider_id: 'prv-001',
          provider_name: 'Swift Logistics Ltd',
          provider_type: 'company',
          total_deliveries: 456,
          completed_deliveries: 423,
          average_rating: 4.7,
          on_time_rate: 92.1,
          average_cost: 3200,
          total_revenue: 1353600
        },
        {
          provider_id: 'prv-002',
          provider_name: 'John Kamau',
          provider_type: 'individual',
          total_deliveries: 234,
          completed_deliveries: 218,
          average_rating: 4.8,
          on_time_rate: 89.5,
          average_cost: 1800,
          total_revenue: 392400
        },
        {
          provider_id: 'prv-003',
          provider_name: 'Coastal Delivery',
          provider_type: 'company',
          total_deliveries: 189,
          completed_deliveries: 175,
          average_rating: 4.5,
          on_time_rate: 85.2,
          average_cost: 2800,
          total_revenue: 490000
        },
        {
          provider_id: 'prv-004',
          provider_name: 'Grace Wanjiku',
          provider_type: 'individual',
          total_deliveries: 156,
          completed_deliveries: 148,
          average_rating: 4.9,
          on_time_rate: 94.2,
          average_cost: 1600,
          total_revenue: 236800
        }
      ];

      // Generate trend data for the last 30 days
      const mockTrends: DeliveryTrend[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        mockTrends.push({
          date: format(date, 'yyyy-MM-dd'),
          deliveries: Math.floor(Math.random() * 50) + 20,
          completed: Math.floor(Math.random() * 45) + 15,
          cost: Math.floor(Math.random() * 100000) + 50000,
          average_time: Math.random() * 2 + 3
        });
      }

      setMetrics(mockMetrics);
      setProviderPerformance(mockProviderPerformance);
      setDeliveryTrends(mockTrends);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    trend, 
    icon, 
    color = 'text-primary' 
  }: {
    title: string;
    value: number | string;
    unit?: string;
    trend?: number;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${color}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend)}% vs last period
                </span>
              </div>
            )}
          </div>
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Delivery Analytics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive insights into delivery performance and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 3 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Deliveries"
            value={metrics.totalDeliveries}
            trend={12.5}
            icon={<Package className="h-6 w-6" />}
            color="text-blue-600"
          />
          <MetricCard
            title="Completion Rate"
            value={`${((metrics.completedDeliveries / metrics.totalDeliveries) * 100).toFixed(1)}%`}
            trend={3.2}
            icon={<CheckCircle className="h-6 w-6" />}
            color="text-green-600"
          />
          <MetricCard
            title="Average Cost"
            value={metrics.averageCost}
            unit="KES"
            trend={-5.8}
            icon={<DollarSign className="h-6 w-6" />}
            color="text-purple-600"
          />
          <MetricCard
            title="On-Time Rate"
            value={`${metrics.onTimeDeliveryRate}%`}
            trend={8.1}
            icon={<Clock className="h-6 w-6" />}
            color="text-orange-600"
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Provider Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Completed</span>
                      </div>
                      <div className="text-sm font-medium">{metrics.completedDeliveries}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Pending</span>
                      </div>
                      <div className="text-sm font-medium">{metrics.pendingDeliveries}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Delayed</span>
                      </div>
                      <div className="text-sm font-medium">{metrics.delayedDeliveries}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Delivery Time</span>
                        <span>{metrics.averageDeliveryTime} hours</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(metrics.averageDeliveryTime / 8) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Customer Satisfaction</span>
                        <span>{metrics.customerSatisfaction}/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(metrics.customerSatisfaction / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>On-Time Delivery Rate</span>
                        <span>{metrics.onTimeDeliveryRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${metrics.onTimeDeliveryRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance Comparison</CardTitle>
              <CardDescription>
                Performance metrics for private providers vs delivery companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providerPerformance.map((provider) => (
                  <Card key={provider.provider_id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {provider.provider_type === 'company' ? (
                            <Building className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Truck className="h-4 w-4 text-green-600" />
                          )}
                          <h4 className="font-semibold">{provider.provider_name}</h4>
                          <Badge className={
                            provider.provider_type === 'company' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }>
                            {provider.provider_type === 'company' ? 'Company' : 'Private'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{provider.average_rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Deliveries</div>
                          <div className="font-semibold">{provider.total_deliveries}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Completion</div>
                          <div className="font-semibold">
                            {((provider.completed_deliveries / provider.total_deliveries) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">On-Time</div>
                          <div className="font-semibold">{provider.on_time_rate}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Cost</div>
                          <div className="font-semibold">KES {provider.average_cost.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Performance Score</span>
                          <span>{((provider.on_time_rate + provider.average_rating * 20) / 2).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(provider.on_time_rate + provider.average_rating * 20) / 2}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Volume Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Interactive chart showing delivery volume over time
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days: {deliveryTrends.reduce((sum, trend) => sum + trend.deliveries, 0)} total deliveries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cost analysis and trends over time
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total cost: KES {deliveryTrends.reduce((sum, trend) => sum + trend.cost, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown by Provider Type */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis by Provider Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Delivery Companies</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">KES 1,843,600</div>
                      <div className="text-xs text-muted-foreground">Avg: KES 3,000</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Private Providers</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">KES 629,200</div>
                      <div className="text-xs text-muted-foreground">Avg: KES 1,700</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total Delivery Costs</span>
                      <span>KES 2,472,800</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Savings Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Cost Savings Opportunity</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Using more private providers for small deliveries could save up to 
                      <strong> KES 245,000 per month</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Efficiency Gain</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Delivery companies show <strong>15% better on-time performance</strong> for 
                      bulk deliveries over 1,000kg
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-800">Quality Insight</span>
                    </div>
                    <p className="text-sm text-purple-700">
                      Private providers average <strong>4.8/5 rating</strong> vs 
                      companies at <strong>4.6/5</strong> for customer service
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Reporting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAnalyticsDashboard;














