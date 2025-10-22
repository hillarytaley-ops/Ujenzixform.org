import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, Package, Truck, Star, TrendingUp, Calendar, DollarSign, Users } from 'lucide-react';

interface QuickDashboardProps {
  isProfessional?: boolean;
}

const QuickDashboard: React.FC<QuickDashboardProps> = ({ isProfessional = false }) => {
  const professionalData = {
    activeProjects: 8,
    completedProjects: 45,
    totalRevenue: "KES 12.5M",
    rating: 4.8,
    pendingQuotes: 12,
    materialOrders: 6,
    upcomingDeliveries: 4,
    teamMembers: 15
  };

  const privateData = {
    activeProjects: 2,
    completedProjects: 8,
    totalSpent: "KES 2.1M",
    rating: 4.6,
    savedBuilders: 5,
    materialOrders: 2,
    upcomingDeliveries: 1,
    projectProgress: 65
  };

  const data = isProfessional ? professionalData : privateData;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{data.activeProjects}</div>
            <div className="text-sm text-gray-600">Active Projects</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">{data.rating}</div>
            <div className="text-sm text-gray-600">Rating</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{data.materialOrders}</div>
            <div className="text-sm text-gray-600">Material Orders</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 text-center">
            <Truck className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">{data.upcomingDeliveries}</div>
            <div className="text-sm text-gray-600">Deliveries</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-sm">New project inquiry</div>
                <div className="text-xs text-gray-600">Residential construction in Kiambu</div>
              </div>
              <Badge variant="outline" className="text-xs">2h ago</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-sm">Material order delivered</div>
                <div className="text-xs text-gray-600">Cement and steel for Nakuru project</div>
              </div>
              <Badge variant="outline" className="text-xs">1d ago</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Star className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <div className="font-medium text-sm">New 5-star review</div>
                <div className="text-xs text-gray-600">Karen villa project completed</div>
              </div>
              <Badge variant="outline" className="text-xs">3d ago</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Order Materials
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              Track Deliveries
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Find Suppliers
            </Button>
          </CardContent>
        </Card>
      </div>

      {isProfessional && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Business Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Monthly Revenue</div>
                <div className="text-2xl font-bold text-green-600">KES 1.8M</div>
                <div className="text-xs text-green-600">↗ +15% from last month</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Project Pipeline</div>
                <div className="text-2xl font-bold text-blue-600">KES 25M</div>
                <div className="text-xs text-blue-600">12 projects in pipeline</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Client Satisfaction</div>
                <div className="text-2xl font-bold text-purple-600">98%</div>
                <div className="text-xs text-purple-600">Based on recent reviews</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuickDashboard;


