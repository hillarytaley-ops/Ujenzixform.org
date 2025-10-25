import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, Eye, MessageSquare, Calendar, 
  DollarSign, Users, Star, Phone, Mail, MapPin, Clock, BarChart3
} from 'lucide-react';

interface AnalyticsDashboardProps {
  builderId: string;
  builderName: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  builderId, 
  builderName 
}) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<any>(null);

  // Mock analytics data
  useEffect(() => {
    const mockAnalytics = {
      overview: {
        profileViews: { value: 1247, change: 15.3, trend: 'up' },
        contactRequests: { value: 89, change: 8.7, trend: 'up' },
        projectInquiries: { value: 34, change: -2.1, trend: 'down' },
        averageRating: { value: 4.8, change: 0.2, trend: 'up' },
        responseRate: { value: 94, change: 3.1, trend: 'up' },
        bookingRate: { value: 67, change: 5.4, trend: 'up' }
      },
      profileViews: [
        { date: '2024-09-01', views: 45, contacts: 3 },
        { date: '2024-09-02', views: 52, contacts: 4 },
        { date: '2024-09-03', views: 38, contacts: 2 },
        { date: '2024-09-04', views: 67, contacts: 5 },
        { date: '2024-09-05', views: 71, contacts: 6 },
        { date: '2024-09-06', views: 43, contacts: 3 },
        { date: '2024-09-07', views: 58, contacts: 4 },
        { date: '2024-09-08', views: 62, contacts: 5 },
        { date: '2024-09-09', views: 49, contacts: 3 },
        { date: '2024-09-10', views: 73, contacts: 7 }
      ],
      inquiryTypes: [
        { name: 'Residential', value: 45, color: '#3b82f6', percentage: 45 },
        { name: 'Commercial', value: 28, color: '#10b981', percentage: 28 },
        { name: 'Renovation', value: 18, color: '#f59e0b', percentage: 18 },
        { name: 'Industrial', value: 9, color: '#ef4444', percentage: 9 }
      ],
      locationBreakdown: [
        { county: 'Nairobi', inquiries: 34, percentage: 38 },
        { county: 'Kiambu', inquiries: 18, percentage: 20 },
        { county: 'Machakos', inquiries: 12, percentage: 13 },
        { county: 'Nakuru', inquiries: 10, percentage: 11 },
        { county: 'Murang\'a', inquiries: 8, percentage: 9 },
        { county: 'Others', inquiries: 8, percentage: 9 }
      ],
      monthlyRevenue: [
        { month: 'Jan', revenue: 2400000, projects: 3, percentage: 60 },
        { month: 'Feb', revenue: 1800000, projects: 2, percentage: 45 },
        { month: 'Mar', revenue: 3200000, projects: 4, percentage: 80 },
        { month: 'Apr', revenue: 2800000, projects: 3, percentage: 70 },
        { month: 'May', revenue: 4100000, projects: 5, percentage: 100 },
        { month: 'Jun', revenue: 3600000, projects: 4, percentage: 88 },
        { month: 'Jul', revenue: 2900000, projects: 3, percentage: 73 },
        { month: 'Aug', revenue: 3800000, projects: 4, percentage: 93 },
        { month: 'Sep', revenue: 4500000, projects: 5, percentage: 100 }
      ],
      recentActivity: [
        { type: 'view', user: 'Sarah M.', action: 'Viewed your profile', time: '2 hours ago', location: 'Nairobi' },
        { type: 'contact', user: 'James K.', action: 'Sent contact request', time: '4 hours ago', location: 'Kiambu' },
        { type: 'inquiry', user: 'Mary W.', action: 'Project inquiry - Residential', time: '6 hours ago', location: 'Nakuru' },
        { type: 'view', user: 'Peter O.', action: 'Viewed your portfolio', time: '8 hours ago', location: 'Mombasa' },
        { type: 'contact', user: 'Grace N.', action: 'Called your number', time: '1 day ago', location: 'Eldoret' }
      ]
    };

    setAnalytics(mockAnalytics);
  }, [builderId, timeRange]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const MetricCard = ({ title, value, change, trend, icon: Icon, suffix = '' }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex items-center mt-4">
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-muted-foreground ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );

  const SimpleBarChart = ({ data, title }: { data: any[], title: string }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{item.month || item.name}</span>
                <span>
                  {item.revenue ? `KES ${(item.revenue / 1000000).toFixed(1)}M` : item.value}
                  {item.projects && ` (${item.projects} projects)`}
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Performance insights for {builderName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Profile Views"
          value={analytics.overview.profileViews.value}
          change={analytics.overview.profileViews.change}
          trend={analytics.overview.profileViews.trend}
          icon={Eye}
        />
        <MetricCard
          title="Contact Requests"
          value={analytics.overview.contactRequests.value}
          change={analytics.overview.contactRequests.change}
          trend={analytics.overview.contactRequests.trend}
          icon={MessageSquare}
        />
        <MetricCard
          title="Project Inquiries"
          value={analytics.overview.projectInquiries.value}
          change={analytics.overview.projectInquiries.change}
          trend={analytics.overview.projectInquiries.trend}
          icon={Calendar}
        />
        <MetricCard
          title="Average Rating"
          value={analytics.overview.averageRating.value}
          change={analytics.overview.averageRating.change}
          trend={analytics.overview.averageRating.trend}
          icon={Star}
          suffix="/5"
        />
        <MetricCard
          title="Response Rate"
          value={analytics.overview.responseRate.value}
          change={analytics.overview.responseRate.change}
          trend={analytics.overview.responseRate.trend}
          icon={Clock}
          suffix="%"
        />
        <MetricCard
          title="Booking Rate"
          value={analytics.overview.bookingRate.value}
          change={analytics.overview.bookingRate.change}
          trend={analytics.overview.bookingRate.trend}
          icon={Users}
          suffix="%"
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Views Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.profileViews.slice(-5).map((item: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                        <span>{item.views} views, {item.contacts} contacts</span>
                      </div>
                      <Progress value={(item.views / 80) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">View to Contact Rate</span>
                  <Badge variant="secondary">7.1%</Badge>
                </div>
                <Progress value={71} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Contact to Booking Rate</span>
                  <Badge variant="secondary">67%</Badge>
                </div>
                <Progress value={67} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <Badge variant="secondary">2.3 hours</Badge>
                </div>
                <Progress value={85} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inquiries" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <SimpleBarChart data={analytics.inquiryTypes} title="Inquiry Types" />
            <Card>
              <CardHeader>
                <CardTitle>Location Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.locationBreakdown.map((location: any) => (
                  <div key={location.county} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {location.county}
                      </span>
                      <span>{location.inquiries} inquiries</span>
                    </div>
                    <Progress value={location.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <SimpleBarChart data={analytics.monthlyRevenue} title="Monthly Revenue & Projects" />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      {activity.type === 'view' && <Eye className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'contact' && <MessageSquare className="h-5 w-5 text-green-500" />}
                      {activity.type === 'inquiry' && <Calendar className="h-5 w-5 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {activity.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-green-600">Growing Demand</h3>
              <p className="text-sm text-muted-foreground">
                Your profile views increased by 15.3% this month
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold text-yellow-600">High Rating</h3>
              <p className="text-sm text-muted-foreground">
                Maintaining 4.8/5 stars with consistent quality
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-600">Quick Response</h3>
              <p className="text-sm text-muted-foreground">
                94% response rate keeps clients satisfied
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


















