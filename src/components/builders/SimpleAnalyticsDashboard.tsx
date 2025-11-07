import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Activity, Calendar, Target } from 'lucide-react';

interface SimpleAnalyticsDashboardProps {
  builderId: string;
}

export const SimpleAnalyticsDashboard: React.FC<SimpleAnalyticsDashboardProps> = ({ builderId }) => {
  // Sample analytics data
  const analytics = {
    totalOrders: 12,
    totalSpent: 1250000,
    activeProjects: 3,
    suppliersWorkedWith: 8,
    avgOrderValue: 104167,
    monthlyGrowth: 23,
    completionRate: 87,
    onTimeDelivery: 92
  };

  const recentActivity = [
    { date: '2025-11-05', action: 'Purchase Order Created', amount: 125000 },
    { date: '2025-11-03', action: 'Materials Delivered', amount: 85000 },
    { date: '2025-11-01', action: 'Quote Accepted', amount: 95000 },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {analytics.totalOrders}
              <Badge className="bg-green-100 text-green-800 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{analytics.monthlyGrowth}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={75} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-3xl">
              KES {(analytics.totalSpent / 1000).toFixed(0)}K
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Avg: KES {(analytics.avgOrderValue / 1000).toFixed(0)}K/order</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {analytics.activeProjects}
              <Activity className="h-6 w-6 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={analytics.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{analytics.completionRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Suppliers</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {analytics.suppliersWorkedWith}
              <Users className="h-6 w-6 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>{analytics.onTimeDelivery}% on-time delivery</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest transactions and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    KES {activity.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Budget Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Materials Budget</span>
                  <span className="text-sm font-semibold">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Delivery Costs</span>
                  <span className="text-sm font-semibold">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Cement</span>
                <Badge>45%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Steel</span>
                <Badge>30%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Paint</span>
                <Badge>15%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Other</span>
                <Badge>10%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

