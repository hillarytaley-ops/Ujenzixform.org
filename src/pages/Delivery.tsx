import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
import { prefetchRoutes } from "@/utils/routePrefetch";
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
  Shield,
  ShoppingCart,
  MessageSquare
} from "lucide-react";
// Lazy load these components to prevent errors from breaking the page
// Load only when needed for better performance
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole: authUserRole, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("request");
  const [userRole, setUserRole] = useState<string | null>(authUserRole);
  const [user, setUser] = useState<any>(authUser);
  const [loading, setLoading] = useState(false); // Start with false - show content immediately
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // Handler for Request Quote and Buy Now buttons
  // Builders go to supplier marketplace, others go to builder registration
  const handlePurchaseAction = (action: 'quote' | 'buy') => {
    if (authUserRole === 'builder' || authUserRole === 'admin') {
      // Builders and admins go to supplier marketplace
      navigate('/supplier-marketplace');
    } else if (authUser) {
      // Logged in but not a builder - redirect to builder registration
      navigate('/builder-registration');
    } else {
      // Not logged in - redirect to builder registration (will need to sign up first)
      navigate('/builder-registration');
    }
  };
  
  // Prefetch likely next pages for instant navigation - especially critical on mobile
  useEffect(() => {
    // Prefetch Feedback immediately on mobile (within 1 second), desktop after 2 seconds
    const isMobileDevice = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const prefetchDelay = isMobileDevice ? 1000 : 2000;
    
    // Prefetch Feedback and Tracking pages
    prefetchRoutes(['/feedback', '/tracking'], prefetchDelay, 500);
  }, []);
  
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

  // Use auth context values first, then check database in background
  useEffect(() => {
    // If we already have role from context, use it
    if (authUserRole) {
      setUserRole(authUserRole);
      setUser(authUser);
      return;
    }
    
    // Check localStorage for cached role
    const cachedRole = localStorage.getItem('user_role');
    if (cachedRole) {
      setUserRole(cachedRole);
    }
    
    // Background check for database role (non-blocking)
    checkUserRole();
  }, [authUserRole, authUser]);

  const checkUserRole = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Handle no user gracefully (public access allowed)
      if (authError || !user) {
        return; // Don't update state, keep showing public view
      }

      setUser(user);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (roleData?.role) {
        setUserRole(roleData.role as any);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // Don't crash, keep current state
    }
  };

  const isAdmin = userRole === 'admin';

  const handleFormChange = (field: string, value: string) => {
    setDeliveryForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitRequest = async () => {
    // Generate tracking number
    const trackingNumber = `DEL-${Date.now()}`;
    
    const newDelivery = {
      id: trackingNumber,
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

    try {
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Get user's profile ID
      let builderId = sessionData?.session?.user?.id;
      
      if (!builderId && sessionData?.session?.user?.id) {
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NTQwNjIsImV4cCI6MjA0ODAzMDA2Mn0.vu4KlLJLKlJmYb2b4R8MxpVKv0izRdkXC_FVwVRT0LM';
        
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${sessionData.session.user.id}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${sessionData.session.access_token}`
            }
          }
        );
        const profileData = await profileResponse.json();
        if (profileData && profileData[0]) {
          builderId = profileData[0].id;
        }
      }

      // Save to deliveries table using direct fetch
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NTQwNjIsImV4cCI6MjA0ODAzMDA2Mn0.vu4KlLJLKlJmYb2b4R8MxpVKv0izRdkXC_FVwVRT0LM';
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${sessionData?.session?.access_token || SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          builder_id: builderId,
          pickup_address: deliveryForm.pickupAddress,
          delivery_address: deliveryForm.deliveryAddress,
          material_type: deliveryForm.materialType,
          quantity: `${deliveryForm.quantity} ${deliveryForm.unit}`,
          contact_name: deliveryForm.contactName,
          contact_phone: deliveryForm.contactPhone,
          preferred_date: deliveryForm.preferredDate || null,
          preferred_time: deliveryForm.preferredTime || null,
          special_instructions: deliveryForm.specialInstructions || null,
          urgency: deliveryForm.urgency,
          status: 'pending'
        })
      });

      if (!response.ok) {
        console.error('Delivery submission error:', await response.text());
        throw new Error('Failed to submit delivery request');
      }

      // Update local state
      setDeliveries(prev => [newDelivery, ...prev]);
      
      toast({
        title: "Delivery Request Submitted!",
        description: `Tracking number: ${trackingNumber}`,
      });
      
    } catch (error) {
      console.error('Error submitting delivery:', error);
      toast({
        title: "Error",
        description: "Failed to submit delivery request. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
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

  return (
    <div className="min-h-screen bg-gradient-construction">
      <Navigation />
      
      {/* Enhanced Hero Section - Optimized for fast loading */}
      <section className="text-white py-20 relative overflow-hidden">
        {/* Base gradient background (shows immediately) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-blue-900 to-gray-900" />
        
        {/* Background image loads in background */}
        <img 
          src="/delivery-hero-bg.jpg"
          alt=""
          loading="eager"
          className={`absolute inset-0 w-full h-full ${isMobile ? 'object-cover' : 'object-contain'}`}
          onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
          style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out', backgroundColor: '#374151' }}
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
            
            <Link to="/tracking">
            <Button 
              size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="whitespace-nowrap">Track Deliveries</span>
            </Button>
            </Link>
          </div>

          {/* Purchase Action Buttons - Request Quote & Buy Now */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center mb-6 md:mb-8 px-4">
            <Button 
              size="lg"
              onClick={() => handlePurchaseAction('quote')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Request Quote</span>
            </Button>
            
            <Button 
              size="lg"
              onClick={() => handlePurchaseAction('buy')}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Buy Now</span>
            </Button>
          </div>
          
          {/* Info badge for non-builders */}
          {!authUserRole || (authUserRole !== 'builder' && authUserRole !== 'admin') ? (
            <div className="text-center mb-4">
              <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-400/30 px-4 py-2">
                💡 Register as a Builder to access our Supplier Marketplace
              </Badge>
            </div>
          ) : (
            <div className="text-center mb-4">
              <Badge className="bg-green-500/20 text-green-200 border-green-400/30 px-4 py-2">
                ✅ You have access to the Supplier Marketplace
              </Badge>
            </div>
          )}
          
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

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
        </div>

        {/* Delivery Provider Portal Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Sign In Portal */}
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="h-7 w-7 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1 text-teal-800">Delivery Provider Portal</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Already a provider? Sign in to access your dashboard
                  </p>
                  <Link to="/delivery-signin">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Truck className="h-4 w-4 mr-2" />
                      Sign In to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Become a Provider */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1 text-blue-800">Become a Delivery Provider</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Join our network of trusted delivery partners
                  </p>
                  <Link to="/delivery/apply">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Users className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 max-w-5xl mx-auto mb-8">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Request
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <NavigationIcon className="h-4 w-4" />
                Track
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