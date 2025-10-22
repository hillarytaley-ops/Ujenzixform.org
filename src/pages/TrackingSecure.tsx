import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { DeliveryAccessGuard } from '@/components/security/DeliveryAccessGuard';
import DeliveryTracker from '@/components/DeliveryTracker';
import { useSecureDeliveryData } from '@/hooks/useSecureDeliveryData';
import { Package, MapPin, Clock, Shield, Eye, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TrackingSecure = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { deliveries, loading: deliveriesLoading } = useSecureDeliveryData();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (roleData) {
          setUserRole(roleData.role as any);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate delivery statistics securely
  const deliveryStats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    inTransit: deliveries.filter(d => ['picked_up', 'in_transit', 'out_for_delivery'].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === 'delivered').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <LoadingSpinner message="Loading tracking center..." />
      </div>
    );
  }

  return (
    <DeliveryAccessGuard requiredAuth={true} allowedRoles={['builder', 'supplier', 'admin']} feature="delivery tracking">
      <div className="min-h-screen flex flex-col bg-gradient-construction">
        <Navigation />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            {/* Simplified Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                Secure Tracking Center
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Track your deliveries with privacy protection
              </p>

              {/* Role & Access Indicators */}
              <div className="flex justify-center gap-2 mb-6">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Eye className="h-3 w-3 mr-1" />
                  Secure Access
                </Badge>
                {userRole && (
                  <Badge variant="outline" className="capitalize">
                    {userRole} Dashboard
                  </Badge>
                )}
              </div>

              {/* Privacy Protection Notice */}
              <Alert className="max-w-2xl mx-auto mb-6 border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Privacy Protection:</strong> Location data and sensitive delivery information 
                  are only visible to authorized parties. Your data is protected.
                </AlertDescription>
              </Alert>
            </div>

            {/* Simplified Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tracking" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Track Deliveries
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Live Tracking
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Deliveries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{deliveryStats.total}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{deliveryStats.pending}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{deliveryStats.inTransit}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{deliveryStats.delivered}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Deliveries Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Deliveries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deliveriesLoading ? (
                      <LoadingSpinner message="Loading deliveries..." />
                    ) : deliveries.length > 0 ? (
                      <div className="space-y-4">
                        {deliveries.slice(0, 5).map((delivery) => (
                          <div key={delivery.id} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{delivery.tracking_number}</h4>
                              <p className="text-sm text-muted-foreground">{delivery.material_type}</p>
                            </div>
                            <Badge variant={delivery.status === 'delivered' ? 'default' : 'secondary'}>
                              {delivery.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No deliveries found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tracking Tab */}
              <TabsContent value="tracking" className="space-y-6">
                <DeliveryTracker />
              </TabsContent>

              {/* Map Tab */}
              <TabsContent value="map" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Live Delivery Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-12">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Live Tracking Available</h3>
                    <p className="text-muted-foreground">
                      Real-time location tracking for active deliveries will be shown here.
                      Location data is only visible to authorized parties.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </DeliveryAccessGuard>
  );
};

export default TrackingSecure;