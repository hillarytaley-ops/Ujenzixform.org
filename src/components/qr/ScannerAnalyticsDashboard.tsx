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
  Scan, 
  Package, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  MapPin,
  Shield,
  Eye,
  Target,
  Zap,
  Camera,
  Activity,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScannerMetrics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  duplicateScans: number;
  averageScanTime: number;
  scanAccuracy: number;
  fraudDetected: number;
  topMaterials: MaterialScanStats[];
  scannerPerformance: ScannerPerformance[];
  hourlyTrends: HourlyTrend[];
}

interface MaterialScanStats {
  material_type: string;
  scan_count: number;
  success_rate: number;
  avg_processing_time: number;
}

interface ScannerPerformance {
  user_id: string;
  user_name: string;
  total_scans: number;
  success_rate: number;
  avg_scan_time: number;
  fraud_detected: number;
}

interface HourlyTrend {
  hour: string;
  scan_count: number;
  success_rate: number;
}

interface ScannerAnalyticsDashboardProps {
  userRole?: string;
  timeRange?: string;
}

export const ScannerAnalyticsDashboard: React.FC<ScannerAnalyticsDashboardProps> = ({
  userRole = 'admin',
  timeRange = '24hours'
}) => {
  const [metrics, setMetrics] = useState<ScannerMetrics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Mock analytics data - in production this would come from database
      const mockMetrics: ScannerMetrics = {
        totalScans: 1247,
        successfulScans: 1089,
        failedScans: 158,
        duplicateScans: 23,
        averageScanTime: 1.8, // seconds
        scanAccuracy: 87.3, // percentage
        fraudDetected: 12,
        topMaterials: [
          { material_type: 'Cement', scan_count: 342, success_rate: 94.2, avg_processing_time: 1.2 },
          { material_type: 'Steel Bars', scan_count: 289, success_rate: 91.8, avg_processing_time: 1.5 },
          { material_type: 'Bricks', scan_count: 198, success_rate: 88.4, avg_processing_time: 1.9 },
          { material_type: 'Sand', scan_count: 156, success_rate: 85.9, avg_processing_time: 2.1 },
          { material_type: 'Gravel', scan_count: 134, success_rate: 89.6, avg_processing_time: 1.7 }
        ],
        scannerPerformance: [
          { user_id: 'u1', user_name: 'John Kamau', total_scans: 234, success_rate: 96.2, avg_scan_time: 1.3, fraud_detected: 2 },
          { user_id: 'u2', user_name: 'Mary Wanjiku', total_scans: 198, success_rate: 94.8, avg_scan_time: 1.5, fraud_detected: 1 },
          { user_id: 'u3', user_name: 'David Ochieng', total_scans: 167, success_rate: 91.6, avg_scan_time: 1.8, fraud_detected: 3 }
        ],
        hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          scan_count: Math.floor(Math.random() * 100) + 20,
          success_rate: Math.floor(Math.random() * 20) + 80
        }))
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load scanner analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value: number, type: 'percentage' | 'time' = 'percentage') => {
    if (type === 'time') {
      if (value <= 1.0) return 'text-green-600';
      if (value <= 2.0) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    if (value >= 95) return 'text-green-600';
    if (value >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const MetricCard = ({ title, value, unit = '', icon: Icon, trend, color = 'text-primary', description }: any) => (
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
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scanner Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive QR scanning performance and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hour">Last Hour</SelectItem>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Scans"
          value={metrics.totalScans}
          icon={Scan}
          color="text-blue-600"
          trend={12}
          description="All scan attempts"
        />
        <MetricCard
          title="Success Rate"
          value={Math.round((metrics.successfulScans / metrics.totalScans) * 100)}
          unit="%"
          icon={CheckCircle}
          color="text-green-600"
          trend={5}
          description="Successfully processed"
        />
        <MetricCard
          title="Avg Scan Time"
          value={metrics.averageScanTime.toFixed(1)}
          unit="sec"
          icon={Clock}
          color="text-orange-600"
          trend={-8}
          description="Processing speed"
        />
        <MetricCard
          title="Fraud Detected"
          value={metrics.fraudDetected}
          icon={Shield}
          color="text-red-600"
          description="Security incidents"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Scan Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Scan Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{metrics.successfulScans}</div>
                  <div className="text-sm text-green-700">Successful</div>
                  <Progress value={(metrics.successfulScans / metrics.totalScans) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{metrics.failedScans}</div>
                  <div className="text-sm text-red-700">Failed</div>
                  <Progress value={(metrics.failedScans / metrics.totalScans) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{metrics.duplicateScans}</div>
                  <div className="text-sm text-yellow-700">Duplicates</div>
                  <Progress value={(metrics.duplicateScans / metrics.totalScans) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{metrics.scanAccuracy.toFixed(1)}%</div>
                  <div className="text-sm text-purple-700">Accuracy</div>
                  <Progress value={metrics.scanAccuracy} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Scanning Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.hourlyTrends.slice(0, 12).map(trend => (
                  <div key={trend.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{trend.hour}</span>
                      <Progress value={(trend.scan_count / 120) * 100} className="w-32 h-2" />
                      <span className="text-sm text-muted-foreground">{trend.scan_count} scans</span>
                    </div>
                    <Badge className={getPerformanceColor(trend.success_rate) + ' border'}>
                      {trend.success_rate}% success
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Scanning Performance
              </CardTitle>
              <CardDescription>
                Performance metrics by material type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topMaterials.map(material => (
                  <div key={material.material_type} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">{material.material_type}</span>
                      </div>
                      <Badge variant="secondary">{material.scan_count} scans</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className={`font-medium ${getPerformanceColor(material.success_rate)}`}>
                          {material.success_rate.toFixed(1)}%
                        </div>
                        <Progress value={material.success_rate} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Time</div>
                        <div className={`font-medium ${getPerformanceColor(material.avg_processing_time, 'time')}`}>
                          {material.avg_processing_time.toFixed(1)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Scan Volume</div>
                        <div className="font-medium">{material.scan_count}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Scanner Operator Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.scannerPerformance.map((performer, index) => (
                  <div key={performer.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{performer.user_name}</p>
                          <p className="text-sm text-muted-foreground">{performer.total_scans} total scans</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {performer.success_rate >= 95 && (
                          <Badge className="bg-gold-100 text-gold-800">
                            <Award className="h-3 w-3 mr-1" />
                            Top Performer
                          </Badge>
                        )}
                        <Badge className={getPerformanceColor(performer.success_rate) + ' border'}>
                          {performer.success_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <Progress value={performer.success_rate} className="h-2 mt-1" />
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Scan Time</div>
                        <div className={getPerformanceColor(performer.avg_scan_time, 'time')}>
                          {performer.avg_scan_time.toFixed(1)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Security Issues</div>
                        <div className={performer.fraud_detected > 0 ? 'text-red-600' : 'text-green-600'}>
                          {performer.fraud_detected}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Fraud Detected"
              value={metrics.fraudDetected}
              icon={Shield}
              color="text-red-600"
              description="Security incidents"
            />
            <MetricCard
              title="Security Score"
              value={Math.max(0, 100 - (metrics.fraudDetected * 2))}
              unit="%"
              icon={Target}
              color="text-green-600"
              description="Overall security rating"
            />
            <MetricCard
              title="Verified Scans"
              value={Math.round((metrics.successfulScans / metrics.totalScans) * 100)}
              unit="%"
              icon={CheckCircle}
              color="text-blue-600"
              description="Authenticated scans"
            />
          </div>

          {/* Security Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                AI Security Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Security Status: Good</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Low fraud detection rate ({((metrics.fraudDetected / metrics.totalScans) * 100).toFixed(2)}%) indicates effective security measures.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Monitoring Recommendation</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Peak scanning hours are 9-11 AM and 2-4 PM. Consider additional monitoring during these periods.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Quality Alert</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {metrics.failedScans} failed scans detected. Review scanner training and QR code quality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
