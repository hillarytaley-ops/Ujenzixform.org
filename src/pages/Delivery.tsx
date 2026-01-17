import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
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

  const [submitting, setSubmitting] = useState(false);
  const submittingRef = React.useRef(false); // Prevent double submissions

  const handleSubmitRequest = async () => {
    // Prevent double submission
    if (submitting || submittingRef.current) {
      console.log('⚠️ Already submitting, ignoring click');
      return;
    }
    
    // Form validation
    if (!deliveryForm.materialType) {
      toast({
        title: "Missing Information",
        description: "Please select a material type.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.quantity) {
      toast({
        title: "Missing Information",
        description: "Please enter a quantity.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.unit) {
      toast({
        title: "Missing Information",
        description: "Please select a unit.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.pickupAddress) {
      toast({
        title: "Missing Information",
        description: "Please enter a pickup address.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.deliveryAddress) {
      toast({
        title: "Missing Information",
        description: "Please enter a delivery address.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.contactName) {
      toast({
        title: "Missing Information",
        description: "Please enter a contact name.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryForm.contactPhone) {
      toast({
        title: "Missing Information",
        description: "Please enter a contact phone number.",
        variant: "destructive"
      });
      return;
    }

    // Set both ref and state to prevent double submission
    submittingRef.current = true;
    setSubmitting(true);
    
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
      console.log('📦 Submitting delivery request...', trackingNumber);
      
      // Use Supabase client directly (more reliable than fetch)
      const { data, error: insertError } = await supabase
        .from('deliveries')
        .insert({
          tracking_number: trackingNumber,
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
        });

      console.log('📦 Insert result:', { data, error: insertError });

      if (insertError) {
        console.error('❌ Delivery submission error:', insertError);
        
        // Check for specific error types
        if (insertError.code === '42P01') {
          throw new Error('Delivery table does not exist. Please contact support.');
        } else if (insertError.code === '42501' || insertError.message?.includes('policy')) {
          throw new Error('Permission denied. Please sign in and try again.');
        } else if (insertError.code === '23505') {
          throw new Error('This delivery request already exists.');
        }
        
        throw new Error(insertError.message || 'Failed to submit delivery request');
      }

      console.log('✅ Delivery request submitted successfully');

      // Update local state
      setDeliveries(prev => [newDelivery, ...prev]);
      
      toast({
        title: "✅ Delivery Request Submitted!",
        description: `Tracking number: ${trackingNumber}. We'll contact you within 24 hours.`,
      });
      
      // Reset form
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
      
    } catch (error: any) {
      console.error('❌ Error submitting delivery:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit delivery request. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset both ref and state
      submittingRef.current = false;
      setSubmitting(false);
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
      
      {/* Professional Hero Section with Truck Background */}
      <section className="text-white py-16 md:py-20 relative overflow-hidden">
        {/* Truck Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-slate-900/95" />
        
        {/* Subtle animated lines to suggest movement/road */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
          <div className="absolute bottom-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-pulse" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8">
            <div className="w-16 h-1 bg-white/20 rounded-full" />
            <div className="w-16 h-1 bg-white/20 rounded-full" />
            <div className="w-16 h-1 bg-white/20 rounded-full" />
            <div className="w-16 h-1 bg-white/20 rounded-full" />
            <div className="w-16 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <span className="text-2xl">🇰🇪</span>
            <span className="text-white/90 font-medium">Trusted Delivery Network</span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            <span className="text-white">Smart</span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Delivery</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white/80 leading-relaxed">
            Real-time GPS tracking, verified transporters, and seamless coordination for your construction materials across all 47 counties.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">1000+</div>
              <div className="text-sm text-white/60">Monthly Deliveries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400">98%</div>
              <div className="text-sm text-white/60">On-Time Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400">24/7</div>
              <div className="text-sm text-white/60">Live Tracking</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">47</div>
              <div className="text-sm text-white/60">Counties</div>
            </div>
          </div>

          {/* Main CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button 
              size="lg"
              onClick={() => setActiveTab("request")}
              className="h-14 px-8 bg-white text-slate-900 hover:bg-gray-100 font-bold text-lg shadow-2xl"
            >
              <Truck className="h-5 w-5 mr-2" />
              Request Delivery
            </Button>
            
            <Link to="/tracking">
              <Button 
                size="lg"
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-2xl"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Track Deliveries
              </Button>
            </Link>
          </div>

          {/* Portal Cards */}
          <div className="max-w-4xl mx-auto">
            <p className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wider">Quick Access</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Request Materials */}
              <div className="group bg-gradient-to-br from-emerald-600/80 to-emerald-700/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-400/30 hover:border-emerald-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">Buy Materials</h3>
                <p className="text-emerald-100/70 text-sm mb-3">Browse supplier marketplace</p>
                <Button 
                  onClick={() => handlePurchaseAction('buy')}
                  className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  Shop Now
                </Button>
              </div>

              {/* Delivery Provider */}
              <div className="group bg-gradient-to-br from-blue-600/80 to-blue-700/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-400/30 hover:border-blue-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">Delivery Provider</h3>
                <p className="text-blue-100/70 text-sm mb-3">Access your dashboard</p>
                <Link to="/delivery-signin">
                  <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Become Provider */}
              <div className="group bg-gradient-to-br from-amber-600/80 to-orange-600/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-400/30 hover:border-amber-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">Join Our Network</h3>
                <p className="text-amber-100/70 text-sm mb-3">Become a delivery partner</p>
                <Link to="/delivery/apply">
                  <Button className="w-full bg-white text-amber-700 hover:bg-amber-50 font-semibold">
                    Apply Now
                  </Button>
                </Link>
              </div>
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
                    <Button 
                      onClick={handleSubmitRequest} 
                      disabled={submitting}
                      className="flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Delivery Request
                        </>
                      )}
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
                  <Button 
                    onClick={handleSubmitRequest} 
                    disabled={submitting}
                    className="flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Delivery Request
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Message for Public Users */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Truck className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong> Fill out the form above and click submit. 
                    Our team will contact you within 24 hours with confirmation and tracking details.
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