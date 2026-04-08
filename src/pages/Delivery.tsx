import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import {
  mapDeliveryRequestRow,
  isActivePipelineStatus,
  isCompletedDeliveryStatus,
  type DeliveryCard,
} from "@/pages/deliveryPageUtils";
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
  const { userRole: authUserRole, user: authUser } = useAuth();
  const publicStats = useHomePagePublicStats();
  const [activeTab, setActiveTab] = useState("request");
  const [userRole, setUserRole] = useState<string | null>(authUserRole);
  const [deliveries, setDeliveries] = useState<DeliveryCard[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);

  // Prefetch likely next pages for instant navigation - especially critical on mobile
  useEffect(() => {
    // Prefetch Feedback immediately on mobile (within 1 second), desktop after 2 seconds
    const isMobileDevice = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const prefetchDelay = isMobileDevice ? 1000 : 2000;
    
    // Prefetch Feedback and Tracking pages
    prefetchRoutes(["/feedback", "/tracking"], prefetchDelay, 500);
  }, []);

  useEffect(() => {
    if (authUserRole) {
      setUserRole(authUserRole);
      return;
    }
    const cachedRole = localStorage.getItem("user_role");
    if (cachedRole) setUserRole(cachedRole);

    const checkUserRole = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) return;
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (roleData?.role) setUserRole(String(roleData.role));
      } catch (e) {
        console.error("Error checking user role:", e);
      }
    };
    void checkUserRole();
  }, [authUserRole]);

  const isAdmin = userRole === "admin";
  const isBuilder = ["builder", "professional_builder", "private_client"].includes(userRole || "");

  useEffect(() => {
    if (!authUser?.id || (!isAdmin && !isBuilder)) {
      setDeliveries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDeliveriesLoading(true);
      setDeliveriesError(null);
      try {
        if (isAdmin) {
          const { data, error } = await supabase
            .from("delivery_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          if (!cancelled) setDeliveries((data ?? []).map((r) => mapDeliveryRequestRow(r as Record<string, unknown>)));
        } else {
          const { data: prof, error: pErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", authUser.id)
            .maybeSingle();
          if (pErr) throw pErr;
          if (!prof?.id) {
            if (!cancelled) setDeliveries([]);
            return;
          }
          const { data, error } = await supabase
            .from("delivery_requests")
            .select("*")
            .eq("builder_id", prof.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) throw error;
          if (!cancelled) setDeliveries((data ?? []).map((r) => mapDeliveryRequestRow(r as Record<string, unknown>)));
        }
      } catch {
        if (!cancelled) {
          setDeliveriesError("Could not load delivery requests.");
          setDeliveries([]);
        }
      } finally {
        if (!cancelled) setDeliveriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, isAdmin, isBuilder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_transit":
      case "out_for_delivery":
      case "picked_up":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "in_transit":
      case "out_for_delivery":
        return <Truck className="h-4 w-4" />;
      case "pending":
      case "requested":
        return <Clock className="h-4 w-4" />;
      case "cancelled":
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatStatusLabel = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const activeDeliveries = deliveries.filter((d) => isActivePipelineStatus(d.status));
  const completedDeliveries = deliveries.filter((d) => isCompletedDeliveryStatus(d.status));

  const showDeliveryActions = (status: string) =>
    ["in_transit", "out_for_delivery", "picked_up", "accepted", "assigned"].includes(status);

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
            <span className="text-white/90 font-medium">Kenya · delivery coordination on UjenziXform</span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            <span className="text-white">Smart</span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Delivery</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white/80 leading-relaxed">
            Request transport, match with providers where available, and follow status in your dashboard. GPS depends on the provider and
            device permissions.
          </p>

          {/* Stats Row — live aggregates from public stats RPC */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">
                {formatHomeStatCount(publicStats.deliveryRequestsTotal, publicStats.loading)}
              </div>
              <div className="text-sm text-white/60">Requests (platform)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400">
                {formatHomeStatCount(publicStats.deliveryRequestsActive, publicStats.loading)}
              </div>
              <div className="text-sm text-white/60">Not yet completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400">
                {formatHomeStatCount(publicStats.deliveryProviders, publicStats.loading)}
              </div>
              <div className="text-sm text-white/60">Delivery partner accounts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">47</div>
              <div className="text-sm text-white/60">Counties (Kenya)</div>
            </div>
          </div>
          <p className="text-[11px] md:text-xs text-white/45 max-w-lg mx-auto mb-8 px-2">
            Figures update from platform data. “Not yet completed” excludes delivered, cancelled, and rejected statuses.
          </p>

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
                    } else if (authUser) {
                      navigate("/suppliers");
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
                <h2 className="text-2xl font-bold mb-6">Active deliveries</h2>
                {deliveriesError && (
                  <p className="text-sm text-destructive mb-4">{deliveriesError}</p>
                )}
                {deliveriesLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">Loading delivery requests…</CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {activeDeliveries.map((delivery) => (
                      <Card key={delivery.rawId}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">{getStatusIcon(delivery.status)}</div>
                              <div>
                                <CardTitle className="text-lg">Delivery #{delivery.id}</CardTitle>
                                <CardDescription>
                                  {delivery.materialType} — {delivery.quantity}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge className={getStatusColor(delivery.status)}>{formatStatusLabel(delivery.status)}</Badge>
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
                                  <p className="font-medium">{delivery.driver ?? "—"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Phone:</span>
                                  <p className="font-medium">{delivery.driverPhone ?? "—"}</p>
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
                                  <span className="text-muted-foreground">Schedule / ETA:</span>
                                  <p className="font-medium">{delivery.estimatedArrival}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Progress:</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${delivery.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">{delivery.progress}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {showDeliveryActions(delivery.status) && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {delivery.driverPhone ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`tel:${delivery.driverPhone.replace(/\s/g, "")}`}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call
                                  </a>
                                </Button>
                              ) : null}
                              {delivery.lat != null && delivery.lng != null ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`https://www.google.com/maps?q=${delivery.lat},${delivery.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Drop-off map
                                  </a>
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to="/tracking">
                                    <NavigationIcon className="h-4 w-4 mr-2" />
                                    Tracking hub
                                  </Link>
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {activeDeliveries.length === 0 && !deliveriesLoading && (
                      <Card>
                        <CardContent className="text-center py-12 text-muted-foreground">
                          No active delivery requests in this view.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bulk Operations Tab */}
            <TabsContent value="bulk" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                <BulkDeliveryManager userRole={userRole} userId={authUser?.id} />
              </React.Suspense>
            </TabsContent>

            {/* Enhanced Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading analytics...</div>}>
                <EnhancedDeliveryAnalytics userRole={userRole} userId={authUser?.id} />
              </React.Suspense>
            </TabsContent>

            {/* Security Dashboard Tab */}
            <TabsContent value="security" className="space-y-6">
              <React.Suspense fallback={<div className="text-center p-8">Loading security dashboard...</div>}>
                <DeliverySecurityDashboard userRole={userRole} userId={authUser?.id} />
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
                    {deliveriesLoading ? (
                      <p className="text-center py-8 text-muted-foreground">Loading…</p>
                    ) : (
                      <>
                        {completedDeliveries.map((delivery) => (
                          <div key={delivery.rawId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium">
                                  #{delivery.id} — {delivery.materialType}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {delivery.quantity} to {delivery.deliveryLocation}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(delivery.status)}>{formatStatusLabel(delivery.status)}</Badge>
                          </div>
                        ))}
                        {completedDeliveries.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">No completed deliveries in this view yet.</div>
                        )}
                      </>
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
                <h2 className="text-2xl font-bold mb-6">Your active deliveries</h2>
                {deliveriesError && <p className="text-sm text-destructive mb-4">{deliveriesError}</p>}
                {deliveriesLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">Loading your delivery requests…</CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {activeDeliveries.map((delivery) => (
                      <Card key={delivery.rawId}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">{getStatusIcon(delivery.status)}</div>
                              <div>
                                <CardTitle className="text-lg">Delivery #{delivery.id}</CardTitle>
                                <CardDescription>
                                  {delivery.materialType} — {delivery.quantity}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge className={getStatusColor(delivery.status)}>{formatStatusLabel(delivery.status)}</Badge>
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
                                <p>
                                  <span className="text-muted-foreground">From:</span> {delivery.pickupLocation}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">To:</span> {delivery.deliveryLocation}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Driver
                              </h4>
                              <div className="text-sm space-y-1">
                                <p>{delivery.driver ?? "—"}</p>
                                {delivery.driverPhone ? (
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {delivery.driverPhone}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Schedule
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
                          {showDeliveryActions(delivery.status) && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {delivery.driverPhone ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`tel:${delivery.driverPhone.replace(/\s/g, "")}`}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call
                                  </a>
                                </Button>
                              ) : null}
                              {delivery.lat != null && delivery.lng != null ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`https://www.google.com/maps?q=${delivery.lat},${delivery.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Drop-off map
                                  </a>
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to="/tracking">
                                    <NavigationIcon className="h-4 w-4 mr-2" />
                                    Tracking hub
                                  </Link>
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {activeDeliveries.length === 0 && (
                      <Card>
                        <CardContent className="text-center py-12">
                          <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium text-gray-500">No active deliveries</p>
                          <p className="text-sm text-muted-foreground">Submit a request above; accepted jobs will show here.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
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
                    {deliveriesLoading ? (
                      <p className="text-center py-8 text-muted-foreground">Loading…</p>
                    ) : (
                      <>
                        {completedDeliveries.map((delivery) => (
                          <div key={delivery.rawId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium">
                                  #{delivery.id} — {delivery.materialType}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {delivery.quantity} to {delivery.deliveryLocation}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(delivery.status)}>{formatStatusLabel(delivery.status)}</Badge>
                          </div>
                        ))}
                        {completedDeliveries.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">No completed deliveries yet.</div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : userRole === "delivery" || userRole === "delivery_provider" ? (
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Delivery partner</CardTitle>
                <CardDescription>Assignments, GPS updates, and payouts are managed in your dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full sm:w-auto" onClick={() => navigate("/delivery-dashboard")}>
                  <Truck className="h-4 w-4 mr-2" />
                  Open delivery dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : userRole === "supplier" ? (
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Suppliers &amp; dispatch</CardTitle>
                <CardDescription>Delivery for orders is coordinated from your supplier dashboard and dispatch tools.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/supplier-dashboard")}>Supplier dashboard</Button>
                <Button variant="outline" onClick={() => navigate("/suppliers")}>
                  Browse marketplace
                </Button>
              </CardContent>
            </Card>
          </div>
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
                  Request transport for your site; providers on the platform can accept jobs when available in your area.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Registered partners</h4>
                      <p className="text-sm text-muted-foreground">
                        Providers join through enrollment; confirm assignment and contact details on each job.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <NavigationIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">GPS when enabled</h4>
                      <p className="text-sm text-muted-foreground">
                        Live location depends on the provider sharing updates and device permissions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Status &amp; handoffs</h4>
                      <p className="text-sm text-muted-foreground">
                        Track request status, notes, and delivery records from your builder account.
                      </p>
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
                    <strong>How it works:</strong> Sign in as a builder, submit a delivery request with pickup and drop-off details,
                    and an available delivery partner can accept based on coverage and capacity.
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