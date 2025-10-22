import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Eye, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Database,
  Activity,
  FileText,
  Settings,
  TrendingUp
} from 'lucide-react';

interface SecurityMetric {
  id: string;
  title: string;
  value: number;
  max: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend: 'up' | 'down' | 'stable';
}

interface DataProcessingActivity {
  id: string;
  timestamp: Date;
  action: string;
  dataType: string;
  user: string;
  purpose: string;
  status: 'success' | 'failed' | 'pending';
}

interface ComplianceItem {
  id: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  description: string;
  lastChecked: Date;
  nextReview: Date;
}

export const DataSecurityDashboard: React.FC = () => {
  const [securityMetrics] = useState<SecurityMetric[]>([
    {
      id: 'encryption_coverage',
      title: 'Data Encryption Coverage',
      value: 98,
      max: 100,
      status: 'good',
      description: '98% of personal data is encrypted at rest and in transit',
      trend: 'up'
    },
    {
      id: 'access_control',
      title: 'Access Control Score',
      value: 95,
      max: 100,
      status: 'good',
      description: 'Strong role-based access controls implemented',
      trend: 'stable'
    },
    {
      id: 'consent_rate',
      title: 'User Consent Rate',
      value: 87,
      max: 100,
      status: 'good',
      description: '87% of users have provided explicit consent',
      trend: 'up'
    },
    {
      id: 'data_retention',
      title: 'Data Retention Compliance',
      value: 92,
      max: 100,
      status: 'good',
      description: 'Automatic data cleanup and retention policies active',
      trend: 'stable'
    },
    {
      id: 'incident_response',
      title: 'Incident Response Time',
      value: 15,
      max: 60,
      status: 'good',
      description: 'Average response time: 15 minutes (target: <60 min)',
      trend: 'down'
    },
    {
      id: 'audit_coverage',
      title: 'Audit Trail Coverage',
      value: 100,
      max: 100,
      status: 'good',
      description: 'All data processing activities are logged',
      trend: 'stable'
    }
  ]);

  const [recentActivities] = useState<DataProcessingActivity[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      action: 'Phone Number Encrypted',
      dataType: 'Personal Data',
      user: 'user_12345',
      purpose: 'Payment Processing',
      status: 'success'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      action: 'Consent Granted',
      dataType: 'Consent Record',
      user: 'user_67890',
      purpose: 'Marketing Communications',
      status: 'success'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      action: 'Data Export Request',
      dataType: 'All Personal Data',
      user: 'user_54321',
      purpose: 'Data Portability',
      status: 'success'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      action: 'Failed Login Attempt',
      dataType: 'Authentication',
      user: 'unknown_user',
      purpose: 'Account Access',
      status: 'failed'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      action: 'Data Anonymization',
      dataType: 'Analytics Data',
      user: 'system',
      purpose: 'Analytics Processing',
      status: 'success'
    }
  ]);

  const [complianceItems] = useState<ComplianceItem[]>([
    {
      id: 'kenya_dpa',
      requirement: 'Kenya Data Protection Act 2019',
      status: 'compliant',
      description: 'Full compliance with Kenyan data protection regulations',
      lastChecked: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextReview: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'gdpr',
      requirement: 'GDPR Compliance',
      status: 'compliant',
      description: 'EU General Data Protection Regulation compliance',
      lastChecked: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      nextReview: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'iso_27001',
      requirement: 'ISO 27001 Standards',
      status: 'partial',
      description: 'Information security management system implementation',
      lastChecked: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      nextReview: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'pci_dss',
      requirement: 'PCI DSS Compliance',
      status: 'compliant',
      description: 'Payment card industry data security standards',
      lastChecked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextReview: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000)
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
      case 'compliant':
      case 'success':
        return 'bg-kenyan-green';
      case 'warning':
      case 'partial':
      case 'pending':
        return 'bg-orange-500';
      case 'critical':
      case 'non_compliant':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-kenyan-green" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Data Security Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor data protection compliance and security metrics for UjenziPro
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="activities">Data Activities</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                    {getTrendIcon(metric.trend)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={(metric.value / metric.max) * 100} 
                      className="h-2"
                    />
                    
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>All systems secure.</strong> No critical security issues detected in the last 24 hours.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Routine maintenance scheduled.</strong> Security audit will run tonight at 2:00 AM EAT.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Privacy Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Users</span>
                    <span className="font-medium">2,847</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Consent Granted</span>
                    <span className="font-medium text-kenyan-green">2,479 (87%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Export Requests</span>
                    <span className="font-medium">23 this month</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Deletion Requests</span>
                    <span className="font-medium">7 this month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Data Processing Activities
              </CardTitle>
              <CardDescription>
                Real-time log of all data processing activities for compliance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className={`p-2 rounded-full ${getStatusColor(activity.status)} text-white`}>
                      {activity.status === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : activity.status === 'failed' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.dataType} • {activity.purpose}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        User: {activity.user} • {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                    
                    <Badge 
                      variant={activity.status === 'success' ? 'default' : 'destructive'}
                      className={activity.status === 'success' ? 'bg-kenyan-green' : ''}
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Audit Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {complianceItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.requirement}</CardTitle>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Last Checked:</span>
                      <p className="text-muted-foreground">
                        {item.lastChecked.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Next Review:</span>
                      <p className="text-muted-foreground">
                        {item.nextReview.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Compliance Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Encryption Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Data at Rest Encryption</span>
                    <Badge className="bg-kenyan-green">AES-256 Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Data in Transit Encryption</span>
                    <Badge className="bg-kenyan-green">TLS 1.3 Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Key Rotation</span>
                    <Badge className="bg-kenyan-green">30 Days</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Backup Encryption</span>
                    <Badge className="bg-kenyan-green">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Retention Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Personal Data</span>
                    <span className="text-sm text-muted-foreground">5 years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Financial Records</span>
                    <span className="text-sm text-muted-foreground">7 years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Audit Logs</span>
                    <span className="text-sm text-muted-foreground">10 years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Analytics Data</span>
                    <span className="text-sm text-muted-foreground">2 years</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Retention
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Run Security Scan</div>
                    <div className="text-sm text-muted-foreground">Full system security audit</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Generate Report</div>
                    <div className="text-sm text-muted-foreground">Compliance and security report</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Update Policies</div>
                    <div className="text-sm text-muted-foreground">Review privacy policies</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
