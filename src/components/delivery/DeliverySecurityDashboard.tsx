import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  MapPin,
  Clock,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Settings,
  Bell,
  Target,
  Radar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryThreatDetection } from '@/hooks/useDeliveryThreatDetection';
import { useDeliveryPredictiveSecurity } from '@/hooks/useDeliveryPredictiveSecurity';

interface DeliverySecurityDashboardProps {
  userRole?: string;
  userId?: string;
}

export const DeliverySecurityDashboard: React.FC<DeliverySecurityDashboardProps> = ({
  userRole = 'admin',
  userId
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [securityMetrics, setSecurityMetrics] = useState({
    totalThreats: 0,
    activeThreats: 0,
    resolvedThreats: 0,
    falsePositives: 0,
    securityScore: 95,
    lastScan: new Date().toISOString()
  });

  const { 
    threats, 
    markThreatResolved, 
    markFalsePositive, 
    getSecurityRecommendations,
    isMonitoring 
  } = useDeliveryThreatDetection();

  const { 
    predictions, 
    trends, 
    implementPreventiveMeasures,
    getSecurityForecast,
    isAnalyzing 
  } = useDeliveryPredictiveSecurity();

  const { toast } = useToast();

  useEffect(() => {
    updateSecurityMetrics();
  }, [threats]);

  const updateSecurityMetrics = () => {
    const activeThreats = threats.filter(t => !t.resolved);
    const resolvedThreats = threats.filter(t => t.resolved && !t.false_positive);
    const falsePositives = threats.filter(t => t.false_positive);

    // Calculate security score based on threat levels
    let score = 100;
    activeThreats.forEach(threat => {
      switch (threat.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    setSecurityMetrics({
      totalThreats: threats.length,
      activeThreats: activeThreats.length,
      resolvedThreats: resolvedThreats.length,
      falsePositives: falsePositives.length,
      securityScore: Math.max(0, score),
      lastScan: new Date().toISOString()
    });
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSecurityScoreIcon = (score: number) => {
    if (score >= 90) return <Shield className="h-6 w-6 text-green-600" />;
    if (score >= 70) return <Shield className="h-6 w-6 text-yellow-600" />;
    if (score >= 50) return <AlertTriangle className="h-6 w-6 text-orange-600" />;
    return <AlertTriangle className="h-6 w-6 text-red-600" />;
  };

  const getThreatSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const SecurityMetricCard = ({ title, value, icon: Icon, color, description }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Security Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Security Center</h2>
          <p className="text-muted-foreground">AI-powered threat detection and prevention</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            <Activity className="h-3 w-3 mr-1" />
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card className="border-2 border-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            {getSecurityScoreIcon(securityMetrics.securityScore)}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getSecurityScoreColor(securityMetrics.securityScore)}`}>
                {securityMetrics.securityScore}%
              </div>
              <div className="text-sm text-muted-foreground">Security Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{securityMetrics.activeThreats}</div>
              <div className="text-sm text-muted-foreground">Active Threats</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SecurityMetricCard
          title="Total Threats"
          value={securityMetrics.totalThreats}
          icon={AlertTriangle}
          color="text-red-500"
          description="All detected threats"
        />
        <SecurityMetricCard
          title="Active Threats"
          value={securityMetrics.activeThreats}
          icon={Eye}
          color="text-orange-500"
          description="Requiring attention"
        />
        <SecurityMetricCard
          title="Resolved"
          value={securityMetrics.resolvedThreats}
          icon={CheckCircle}
          color="text-green-500"
          description="Successfully handled"
        />
        <SecurityMetricCard
          title="False Positives"
          value={securityMetrics.falsePositives}
          icon={Target}
          color="text-blue-500"
          description="AI learning data"
        />
      </div>

      {/* Security Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="threats">Active Threats</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                AI Security Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getSecurityRecommendations().map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Security Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Security Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {threats.slice(0, 5).map(threat => (
                  <div key={threat.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getThreatSeverityColor(threat.severity)}>
                        {threat.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{threat.threat_type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">{threat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {threat.resolved ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Security Threats</CardTitle>
              <CardDescription>
                Threats requiring immediate attention and resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threats.filter(t => !t.resolved).map(threat => (
                  <div key={threat.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getThreatSeverityColor(threat.severity)}>
                          {threat.severity}
                        </Badge>
                        <span className="font-medium">{threat.threat_type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(threat.detected_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <p className="text-sm">{threat.description}</p>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markThreatResolved(threat.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markFalsePositive(threat.id)}
                      >
                        <Target className="h-4 w-4 mr-1" />
                        False Positive
                      </Button>
                    </div>
                  </div>
                ))}
                
                {threats.filter(t => !t.resolved).length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-green-800 mb-2">All Clear!</h3>
                    <p className="text-sm text-green-600">No active security threats detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-blue-500" />
                AI Threat Predictions
              </CardTitle>
              <CardDescription>
                Predictive analysis of potential security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map(prediction => (
                  <div key={prediction.prediction_id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getThreatSeverityColor(prediction.severity)}>
                          {prediction.severity}
                        </Badge>
                        <span className="font-medium">{prediction.threat_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{prediction.probability}% likely</Badge>
                        <Badge variant="outline">{prediction.confidence}% confidence</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Risk Factors:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {prediction.risk_factors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Recommended Actions:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {prediction.prevention_actions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => implementPreventiveMeasures(prediction)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Implement Measures
                      </Button>
                    </div>
                  </div>
                ))}
                
                {predictions.length === 0 && (
                  <div className="text-center py-8">
                    <Radar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Predictions</h3>
                    <p className="text-sm text-muted-foreground">
                      {isAnalyzing ? 'Analyzing security patterns...' : 'No security threats predicted'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">Threat Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get notified when security threats are detected
                  </p>
                  <Badge variant="default">Enabled</Badge>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Radar className="h-4 w-4" />
                    <span className="font-medium">Predictive Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-powered threat prediction and prevention
                  </p>
                  <Badge variant="default">Active</Badge>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Geographic Security</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Location-based security and geofencing
                  </p>
                  <Badge variant="secondary">Ready</Badge>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">Enhanced MFA</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Multi-factor authentication for sensitive operations
                  </p>
                  <Badge variant="default">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
