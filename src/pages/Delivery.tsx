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
  CheckCircle,
  Navigation as NavigationIcon,
  FileText,
  BarChart3,
  Users,
  Zap,
  Shield,
  ShoppingCart
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

// Lazy load the manual DeliveryRequest component for builders
const DeliveryRequestForm = React.lazy(() => 
  import("@/components/DeliveryRequest")
    .then(module => ({ default: module.default }))
    .catch(() => ({ default: () => <div>Delivery request form temporarily unavailable</div> }))
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
  const isBuilder = ['builder', 'professional_builder', 'private_client'].includes(userRole || '');

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

          {/* Portal Cards - Role-aware Quick Access */}
          <div className="max-w-4xl mx-auto">
            <p className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wider">Quick Access</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Buy Materials / Builder Dashboard */}
              <div className="group bg-gradient-to-br from-emerald-600/80 to-emerald-700/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-400/30 hover:border-emerald-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">
                  {isBuilder ? 'Builder Dashboard' : 'Buy Materials'}
                </h3>
                <p className="text-emerald-100/70 text-sm mb-3">
                  {isBuilder ? 'Access your projects & orders' : 'Browse supplier marketplace'}
                </p>
                <Button 
                  onClick={() => {
                    if (isBuilder) {
                      navigate('/professional-builder-dashboard');
                    } else if (user) {
                      navigate('/suppliers');
                    } else {
                      navigate('/builder-signin');
                    }
                  }}
                  className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  {isBuilder ? 'Go to Dashboard' : 'Shop Now'}
                </Button>
              </div>

              {/* Delivery Provider Dashboard / Sign In */}
              <div className="group bg-gradient-to-br from-blue-600/80 to-blue-700/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-400/30 hover:border-blue-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">
                  {userRole === 'delivery' || userRole === 'delivery_provider' ? 'Delivery Dashboard' : 'Delivery Provider'}
                </h3>
                <p className="text-blue-100/70 text-sm mb-3">
                  {userRole === 'delivery' || userRole === 'delivery_provider' ? 'Manage your deliveries' : 'Access your dashboard'}
                </p>
                <Button 
                  onClick={() => {
                    if (userRole === 'delivery' || userRole === 'delivery_provider') {
                      navigate('/delivery-dashboard');
                    } else {
                      navigate('/delivery-signin');
                    }
                  }}
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                >
                  {userRole === 'delivery' || userRole === 'delivery_provider' ? 'Go to Dashboard' : 'Sign In'}
                </Button>
              </div>

              {/* Become Provider / Supplier Dashboard */}
              <div className="group bg-gradient-to-br from-amber-600/80 to-orange-600/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-400/30 hover:border-amber-400/60 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">
                  {userRole === 'supplier' ? 'Supplier Dashboard' : 'Join Our Network'}
                </h3>
                <p className="text-amber-100/70 text-sm mb-3">
                  {userRole === 'supplier' ? 'Manage your products' : 'Become a delivery partner'}
                </p>
                <Button 
                  onClick={() => {
                    if (userRole === 'supplier') {
                      navigate('/supplier-dashboard');
                    } else {
                      navigate('/delivery/apply');
                    }
                  }}
                  className="w-full bg-white text-amber-700 hover:bg-amber-50 font-semibold"
                >
                  {userRole === 'supplier' ? 'Go to Dashboard' : 'Apply Now'}
                </Button>
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
          {/* Sign In Portal / Dashboard Access */}
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="h-7 w-7 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1 text-teal-800">
                    {userRole === 'delivery' || userRole === 'delivery_provider' 
                      ? 'Your Delivery Dashboard' 
                      : 'Delivery Provider Portal'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {userRole === 'delivery' || userRole === 'delivery_provider'
                      ? 'Manage deliveries, track earnings, and view assignments'
                      : 'Already a provider? Sign in to access your dashboard'}
                  </p>
                  <Button 
                    onClick={() => {
                      if (userRole === 'delivery' || userRole === 'delivery_provider') {
                        navigate('/delivery-dashboard');
                      } else {
                        navigate('/delivery-signin');
                      }
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {userRole === 'delivery' || userRole === 'delivery_provider' 
                      ? 'Go to Dashboard' 
                      : 'Sign In to Dashboard'}
                  </Button>
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
                  <Button 
                    onClick={() => navigate('/delivery/apply')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
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

            {/* Delivery Request Tab - Using unified DeliveryRequest component */}
            <TabsContent value="request" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <React.Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading delivery request form...</p>
                    </CardContent>
                  </Card>
                }>
                  <DeliveryRequestForm />
                </React.Suspense>
              </div>
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
        ) : isBuilder ? (
          /* Builder Access - Tabs with Request & Tracking */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-3xl mx-auto mb-8">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Request Delivery
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <NavigationIcon className="h-4 w-4" />
                Track Deliveries
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Manual Delivery Request Tab for Builders */}
            <TabsContent value="request" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                {/* Info Banner */}
                <Card className="mb-6 border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-teal-500 rounded-lg text-white">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-teal-800 mb-1">Manual Delivery Request</h4>
                        <p className="text-sm text-teal-700">
                          Use this form to request delivery for materials sourced outside UjenziXform, 
                          site-to-site transfers, or when you need to move existing inventory.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <React.Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading delivery request form...</p>
                    </CardContent>
                  </Card>
                }>
                  <DeliveryRequestForm />
                </React.Suspense>
              </div>
            </TabsContent>

            {/* Tracking Tab for Builders */}
            <TabsContent value="tracking" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Your Active Deliveries</h2>
                <div className="grid gap-6">
                  {deliveries.filter(d => d.status !== 'delivered').map((delivery) => (
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
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">From:</span> {delivery.pickupLocation}</p>
                              <p><span className="text-muted-foreground">To:</span> {delivery.deliveryLocation}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Driver
                            </h4>
                            <div className="text-sm space-y-1">
                              <p>{delivery.driver}</p>
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {delivery.driverPhone}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              ETA
                            </h4>
                            <p className="text-lg font-medium">{delivery.estimatedArrival}</p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all" 
                                style={{ width: `${delivery.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {deliveries.filter(d => d.status !== 'delivered').length === 0 && (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">No active deliveries</p>
                        <p className="text-sm text-muted-foreground">Your deliveries will appear here once requested</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* History Tab for Builders */}
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
          /* Public Access - Prompt to Sign In */
          <div className="max-w-4xl mx-auto">
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-teal-600" />
                </div>
                <CardTitle className="text-2xl">Request Delivery Service</CardTitle>
                <CardDescription className="text-base">
                  Get your construction materials delivered to your site by verified delivery providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Verified Providers</h4>
                      <p className="text-sm text-muted-foreground">All delivery providers are vetted and verified</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <NavigationIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Real-time Tracking</h4>
                      <p className="text-sm text-muted-foreground">Track your delivery in real-time with GPS</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Secure & Insured</h4>
                      <p className="text-sm text-muted-foreground">Your materials are protected during transit</p>
                    </div>
                  </div>
                </div>

                {/* Sign In Prompt */}
                <div className="bg-white border-2 border-dashed border-teal-300 rounded-lg p-8 text-center">
                  <User className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sign In to Request Delivery</h3>
                  <p className="text-muted-foreground mb-6">
                    Create a free account or sign in to request delivery services for your construction materials
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/builder-signin">
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <User className="h-4 w-4 mr-2" />
                        Sign In as Builder
                      </Button>
                    </Link>
                    <Link to="/home">
                      <Button variant="outline">
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Info Message */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Truck className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong> Sign in as a builder, fill out the delivery request form, 
                    and our verified delivery providers will compete to deliver your materials. 
                    First provider to accept gets the job!
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