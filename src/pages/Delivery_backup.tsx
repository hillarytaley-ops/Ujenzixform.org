import React, { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  User, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Navigation as NavigationIcon,
  Calculator,
  FileText,
  Send,
  BarChart3,
  Users,
  Zap,
  Shield
} from "lucide-react";
import { EnhancedDeliveryAnalytics } from "@/components/delivery/EnhancedDeliveryAnalytics";
import { BulkDeliveryManager } from "@/components/delivery/BulkDeliveryManager";
import { DeliverySecurityDashboard } from "@/components/delivery/DeliverySecurityDashboard";

const Delivery = () => {
  const [activeTab, setActiveTab] = useState("request");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [deliveries, setDeliveries] = useState([
    {
      id: "DEL-001",
      materialType: "Cement",
      quantity: "50 bags",
      status: "in_transit",
      pickupLocation: "Bamburi Cement Factory",
      deliveryLocation: "Westlands Construction Site",
      driver: "John Mwangi",
      driverPhone: "+254 712 345 678",
      estimatedArrival: "2:30 PM",
      progress: 75
    }
  ]);
  
  const [deliveryForm, setDeliveryForm] = useState({
    materialType: "",
    quantity: "",
    unit: "",
    pickupAddress: "",
    deliveryAddress: "",
    contactName: "",
    contactPhone: "",
    preferredDate: "",
    preferredTime: "",
    specialInstructions: "",
    urgency: "normal"
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
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
        
        setUserRole((roleData?.role as any) || null);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin';

  const handleFormChange = (field: string, value: string) => {
    setDeliveryForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitRequest = () => {
    const newDelivery = {
      id: `DEL-${String(deliveries.length + 1).padStart(3, '0')}`,
      materialType: deliveryForm.materialType,
      quantity: `${deliveryForm.quantity} ${deliveryForm.unit}`,
      status: "pending" as const,
      pickupLocation: deliveryForm.pickupAddress,
      deliveryLocation: deliveryForm.deliveryAddress,
      driver: "Not assigned",
      driverPhone: "-",
      estimatedArrival: "Pending",
      progress: 0
    };

    setDeliveries(prev => [newDelivery, ...prev]);
    
    setDeliveryForm({
      materialType: "",
      quantity: "",
      unit: "",
      pickupAddress: "",
      deliveryAddress: "",
      contactName: "",
      contactPhone: "",
      preferredDate: "",
      preferredTime: "",
      specialInstructions: "",
      urgency: "normal"
    });

    if (isAdmin) {
      setActiveTab("tracking");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading delivery services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-construction">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Delivery Management</h1>
          <p className="text-lg text-muted-foreground mb-6">
            {isAdmin ? "Complete workflow for construction material deliveries" : "Request delivery for your construction materials"}
          </p>
          
          {/* Role Badge */}
          <div className="flex justify-center gap-2 mb-6">
            {userRole && (
              <Badge variant="outline" className="capitalize">
                {userRole} Access
              </Badge>
            )}
            {!isAdmin && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                Public Access - Request Only
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 max-w-5xl mx-auto mb-8">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Request
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <NavigationIcon className="h-4 w-4" />
                Track
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculate
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Bulk
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Request Tab */}
            <TabsContent value="request" className="space-y-6">
              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    New Delivery Request
                  </CardTitle>
                  <CardDescription>
                    Fill out the form below to request a delivery for your construction materials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Material Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="materialType">Material Type</Label>
                        <Select value={deliveryForm.materialType} onValueChange={(value) => handleFormChange('materialType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cement">Cement</SelectItem>
                            <SelectItem value="sand">Sand</SelectItem>
                            <SelectItem value="gravel">Gravel</SelectItem>
                            <SelectItem value="steel-bars">Steel Bars</SelectItem>
                            <SelectItem value="bricks">Bricks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSubmitRequest} className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Submit Delivery Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other Tabs */}
            <TabsContent value="tracking" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Active Deliveries</h2>
                <p>Tracking functionality here...</p>
              </div>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-6">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Delivery Cost Calculator</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Calculator functionality here...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-6">
              <BulkDeliveryManager userRole={userRole} userId={user?.id} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <EnhancedDeliveryAnalytics userRole={userRole} userId={user?.id} />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <DeliverySecurityDashboard userRole={userRole} userId={user?.id} />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle>Delivery History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>History functionality here...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Public Access - Request Only */
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Request Delivery
                </CardTitle>
                <CardDescription>
                  Fill out the form below to request a delivery for your construction materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Material Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="materialType">Material Type</Label>
                      <Select value={deliveryForm.materialType} onValueChange={(value) => handleFormChange('materialType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cement">Cement</SelectItem>
                          <SelectItem value="sand">Sand</SelectItem>
                          <SelectItem value="gravel">Gravel</SelectItem>
                          <SelectItem value="steel-bars">Steel Bars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSubmitRequest} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Submit Delivery Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Delivery;














