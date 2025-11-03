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
import AnimatedSection from "@/components/AnimatedSection";
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
// Lazy load these components to prevent errors from breaking the page
const EnhancedDeliveryAnalytics = React.lazy(() => 
  import("@/components/delivery/EnhancedDeliveryAnalytics")
    .then(module => ({ default: module.EnhancedDeliveryAnalytics }))
    .catch(() => ({ default: () => <div>Analytics temporarily unavailable</div> }))
);

const BulkDeliveryManager = React.lazy(() => 
  import("@/components/delivery/BulkDeliveryManager")
    .then(module => ({ default: module.BulkDeliveryManager }))
    .catch(() => ({ default: () => <div>Bulk manager temporarily unavailable</div> }))
);

const DeliverySecurityDashboard = React.lazy(() => 
  import("@/components/delivery/DeliverySecurityDashboard")
    .then(module => ({ default: module.DeliverySecurityDashboard }))
    .catch(() => ({ default: () => <div>Security dashboard temporarily unavailable</div> }))
);

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
    },
    {
      id: "DEL-002", 
      materialType: "Steel Bars",
      quantity: "2 tons",
      status: "delivered",
      pickupLocation: "Devki Steel Mills",
      deliveryLocation: "Karen Residential Project",
      driver: "Mary Wanjiku",
      driverPhone: "+254 723 456 789",
      estimatedArrival: "Delivered",
      progress: 100
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
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Handle no user gracefully (public access allowed)
      if (authError || !user) {
        console.log('No authenticated user, showing public delivery page');
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(user);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      setUserRole((roleData?.role as any) || null);
    } catch (error) {
      console.error('Error checking user role:', error);
      // Don't crash, just set defaults
      setUser(null);
      setUserRole(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      case "in_transit": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "in_transit": return <Truck className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
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
      
      {/* Enhanced Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section className="text-white py-20 relative overflow-hidden">
          {/* Your Custom Delivery Tracking Image - Yellow Truck & GPS - Fully Responsive */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('/delivery-hero-bg.jpg?v=3'), url('/delivery-hero-bg.jpg'), url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"%3E%3Crect fill="%23f5f5f0" width="1920" height="1080"/%3E%3C/svg%3E')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              WebkitBackgroundSize: 'cover',
              MozBackgroundSize: 'cover'
            }}
            role="img"
            aria-label="Delivery truck and GPS tracking system"
          />
          {/* Light overlay to maintain text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-gray-900/30 to-black/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 bg-gradient-to-r from-gray-700 to-blue-600 text-white px-6 py-2 text-lg font-semibold">
            🇰🇪 Kenya's Premier Delivery Network
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
            <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              Delivery
            </span>
            <br />
            <span className="text-4xl text-blue-400">
              Management
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 drop-shadow-lg max-w-4xl mx-auto leading-relaxed">
            <strong>Smart Delivery Solutions:</strong> Request material deliveries from suppliers to construction sites, 
            track deliveries in real-time with GPS, calculate delivery costs instantly, manage multiple deliveries, 
            coordinate with verified transport providers, receive notifications, generate delivery notes, 
            and ensure materials arrive safely and on time across Kenya.
          </p>

          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center mb-6 md:mb-8 px-4">
            <Button 
              size="lg"
              onClick={() => setActiveTab("request")}
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Request Delivery</span>
            </Button>
            
            <Button 
              size="lg"
              onClick={() => setActiveTab("tracking")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Track Deliveries</span>
            </Button>
            
            <Button 
              size="lg"
              onClick={() => setActiveTab("calculator")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Cost Calculator</span>
            </Button>
          </div>
          
          {/* Delivery Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">1000+</div>
              <div className="text-sm opacity-90">Monthly Deliveries</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-300">47</div>
              <div className="text-sm opacity-90">Counties Served</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">98%</div>
              <div className="text-sm opacity-90">On-Time Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-300">24/7</div>
              <div className="text-sm opacity-90">Tracking</div>
            </div>
          </div>
        </div>
        </section>
      </AnimatedSection>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
        </div>

        {/* Become a Provider Call-to-Action */}
        <Card className="max-w-4xl mx-auto mb-8 border-primary bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Become a Delivery Provider</h3>
                <p className="text-muted-foreground">
                  Join our network of trusted delivery partners and grow your business with UjenziPro
                </p>
              </div>
              <Button asChild className="flex items-center gap-2">
                <a href="/delivery/apply">
                  <Truck className="h-4 w-4" />
                  Apply Now
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

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

            {/* Delivery Request Tab */}
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
                  {/* Material Information */}
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
                            <SelectItem value="tiles">Tiles</SelectItem>
                            <SelectItem value="timber">Timber</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          placeholder="Enter quantity"
                          value={deliveryForm.quantity}
                          onChange={(e) => handleFormChange('quantity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Select value={deliveryForm.unit} onValueChange={(value) => handleFormChange('unit', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bags">Bags</SelectItem>
                            <SelectItem value="tons">Tons</SelectItem>
                            <SelectItem value="cubic-meters">Cubic Meters</SelectItem>
                            <SelectItem value="pieces">Pieces</SelectItem>
                            <SelectItem value="square-meters">Square Meters</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Location Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pickupAddress">Pickup Address</Label>
                        <Textarea
                          id="pickupAddress"
                          placeholder="Enter pickup location"
                          value={deliveryForm.pickupAddress}
                          onChange={(e) => handleFormChange('pickupAddress', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryAddress">Delivery Address</Label>
                        <Textarea
                          id="deliveryAddress"
                          placeholder="Enter delivery location"
                          value={deliveryForm.deliveryAddress}
                          onChange={(e) => handleFormChange('deliveryAddress', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Contact Name</Label>
                        <Input
                          id="contactName"
                          placeholder="Enter contact person name"
                          value={deliveryForm.contactName}
                          onChange={(e) => handleFormChange('contactName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <Input
                          id="contactPhone"
                          placeholder="Enter phone number"
                          value={deliveryForm.contactPhone}
                          onChange={(e) => handleFormChange('contactPhone', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <Button onClick={handleSubmitRequest} className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Submit Delivery Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Active Deliveries</h2>
                <div className="grid gap-6">
                  {deliveries.map((delivery) => (
                    <Card key={delivery.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              {getStatusIcon(delivery.status)}
                            </div>
                            <div>
                              <CardTitle className="text-lg">Delivery #{delivery.id}</CardTitle>
                              <CardDescription>{delivery.materialType} - {delivery.quantity}</CardDescription>
                            </div>
                          </div>
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Route
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">From:</span>
                                <p className="font-medium">{delivery.pickupLocation}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">To:</span>
                                <p className="font-medium">{delivery.deliveryLocation}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Driver
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Name:</span>
                                <p className="font-medium">{delivery.driver}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone:</span>
                                <p className="font-medium">{delivery.driverPhone}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Status
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">ETA:</span>
                                <p className="font-medium">{delivery.estimatedArrival}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Progress:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${delivery.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">{delivery.progress}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {delivery.status === 'in_transit' && (
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">
                              <Phone className="h-4 w-4 mr-2" />
                              Call Driver
                            </Button>
                            <Button variant="outline" size="sm">
                              <MapPin className="h-4 w-4 mr-2" />
                              Track Location
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Calculator Tab */}
            <TabsContent value="calculator" className="space-y-6">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Delivery Cost Calculator
                  </CardTitle>
                  <CardDescription>
                    Estimate delivery costs based on distance and material type
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cost calculator feature coming soon. Contact our team for custom quotes.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Operations Tab */}
            <TabsContent value="bulk" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                <BulkDeliveryManager userRole={userRole} userId={user?.id} />
              </React.Suspense>
            </TabsContent>

            {/* Enhanced Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading analytics...</div>}>
                <EnhancedDeliveryAnalytics userRole={userRole} userId={user?.id} />
              </React.Suspense>
            </TabsContent>

            {/* Security Dashboard Tab */}
            <TabsContent value="security" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading security dashboard...</div>}>
                <DeliverySecurityDashboard userRole={userRole} userId={user?.id} />
              </React.Suspense>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Delivery History
                  </CardTitle>
                  <CardDescription>
                    View all your past delivery requests and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deliveries.filter(d => d.status === 'delivered').map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">#{delivery.id} - {delivery.materialType}</p>
                            <p className="text-sm text-muted-foreground">{delivery.quantity} delivered to {delivery.deliveryLocation}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(delivery.status)}>
                          Delivered
                        </Badge>
                      </div>
                    ))}
                    
                    {deliveries.filter(d => d.status === 'delivered').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No completed deliveries yet
                      </div>
                    )}
                  </div>
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
                {/* Material Information */}
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
                          <SelectItem value="tiles">Tiles</SelectItem>
                          <SelectItem value="timber">Timber</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={deliveryForm.quantity}
                        onChange={(e) => handleFormChange('quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={deliveryForm.unit} onValueChange={(value) => handleFormChange('unit', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bags">Bags</SelectItem>
                          <SelectItem value="tons">Tons</SelectItem>
                          <SelectItem value="cubic-meters">Cubic Meters</SelectItem>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="square-meters">Square Meters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickupAddress">Pickup Address</Label>
                      <Textarea
                        id="pickupAddress"
                        placeholder="Enter pickup location"
                        value={deliveryForm.pickupAddress}
                        onChange={(e) => handleFormChange('pickupAddress', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress">Delivery Address</Label>
                      <Textarea
                        id="deliveryAddress"
                        placeholder="Enter delivery location"
                        value={deliveryForm.deliveryAddress}
                        onChange={(e) => handleFormChange('deliveryAddress', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        placeholder="Enter contact person name"
                        value={deliveryForm.contactName}
                        onChange={(e) => handleFormChange('contactName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        placeholder="Enter phone number"
                        value={deliveryForm.contactPhone}
                        onChange={(e) => handleFormChange('contactPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSubmitRequest} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Submit Delivery Request
                  </Button>
                </div>

                {/* Success Message for Public Users */}
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Request Submitted:</strong> Your delivery request will be processed by our team. 
                    You will be contacted within 24 hours with confirmation and tracking details.
                  </AlertDescription>
                </Alert>
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