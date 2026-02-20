import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, ShoppingCart, FileText, UserPlus, LogIn, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FloatingSocialSidebar } from "@/components/FloatingSocialSidebar";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { prefetchRoutes } from "@/utils/routePrefetch";
 
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";

// Ultra-optimized Suppliers page for mobile/iPhone
const SuppliersMobileOptimized = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // FAST: Use cached values first for instant display
    const cachedRole = localStorage.getItem('user_role');
    const cachedUserId = localStorage.getItem('user_id');
    
    if (cachedRole && cachedUserId) {
      setUser({ id: cachedUserId });
      setUserRole(cachedRole);
      setLoading(false);
    }
    
    // Then verify with Supabase in background
    checkAuth();
    
    // Prefetch likely next pages for instant navigation
    prefetchRoutes(['/delivery', '/tracking', '/feedback'], 3000, 1000);
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('user_id', session.user.id);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        const role = roleData?.role || null;
        setUserRole(role);
        if (role) localStorage.setItem('user_role', role);
      } else {
        // Clear cache if not authenticated
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FloatingSocialSidebar />
      <CartSidebar />
      <FloatingCartButton />
      <Navigation />

      {/* Hero Section - Clean Professional Design with Building Materials Background */}
      <section className="text-white py-16 md:py-20 relative overflow-hidden">
        {/* Building Materials Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-emerald-900/90 to-slate-900/95" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 mb-8">
            <span className="text-2xl">🇰🇪</span>
            <span className="text-white font-medium">Kenya's #1 Construction Marketplace</span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-white">Materials</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Marketplace</span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto text-white/80">
            Connect with 500+ verified suppliers. Quality construction materials delivered across all 47 counties.
          </p>

          {/* Stats Row - Inline */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-10">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
              <div className="text-sm text-white/60">Suppliers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-400">10K+</div>
              <div className="text-sm text-white/60">Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-teal-400">47</div>
              <div className="text-sm text-white/60">Counties</div>
            </div>
          </div>

          {/* Main CTA */}
          <Button 
            size="lg"
            className="h-14 px-10 bg-white text-slate-900 hover:bg-gray-100 font-bold text-lg shadow-2xl mb-12"
            onClick={() => window.scrollTo({ top: 700, behavior: 'smooth' })}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Browse Materials
          </Button>

          {/* Portal Cards */}
          <div className="max-w-4xl mx-auto" id="portals">
            <p className="text-white/50 text-sm font-medium mb-6 uppercase tracking-widest">Choose Your Portal</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Private Client Portal */}
              <div className="group bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-emerald-500/20">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Private Builder</h3>
                <p className="text-emerald-100/70 text-sm mb-5">Home projects & personal purchases</p>
                <div className="flex gap-2">
                  <Link to="/private-client-signin" className="flex-1">
                    <Button className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold h-11">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/private-builder-registration" className="flex-1">
                    <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 h-11">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Professional Builder Portal */}
              <div className="group bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/20">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Building className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Professional Builder</h3>
                <p className="text-blue-100/70 text-sm mb-5">Contractors & construction companies</p>
                <div className="flex gap-2">
                  <Link to="/professional-builder-signin" className="flex-1">
                    <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold h-11">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/professional-builder-registration" className="flex-1">
                    <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 h-11">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Supplier Portal */}
              <div className="group bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-6 border border-amber-500/30 hover:border-amber-400 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/20">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Store className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Supplier</h3>
                <p className="text-amber-100/70 text-sm mb-5">List & sell your materials</p>
                <div className="flex gap-2">
                  <Link to="/supplier-signin" className="flex-1">
                    <Button className="w-full bg-white text-amber-700 hover:bg-amber-50 font-semibold h-11">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/supplier-registration" className="flex-1">
                    <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 h-11">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Status / Sign In Section */}
      {!loading && (
        <section className="py-8 px-4 bg-gray-50 border-b">
          <div className="container mx-auto max-w-4xl">
            {user && userRole ? (
              // Logged in user - show capabilities and dashboard link
              <Card className="border-2 border-green-500 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="text-green-600">✅</span>
                        Welcome back!
                      </h3>
                      {(userRole === 'builder' || userRole === 'professional_builder') && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-blue-600">Builder Account:</strong> Request quotes and create purchase orders.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-blue-600">
                              <FileText className="h-3 w-3 mr-1" />
                              Request Quotes
                            </Badge>
                            <Badge className="bg-blue-600">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Purchase Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                      {userRole === 'supplier' && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-amber-600">Supplier Account:</strong> Manage your products and orders.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-amber-600">
                              <Building className="h-3 w-3 mr-1" />
                              Manage Products
                            </Badge>
                            <Badge className="bg-amber-600">
                              <FileText className="h-3 w-3 mr-1" />
                              View Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                      {userRole === 'private_client' && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-green-600">Private Builder Account:</strong> Purchase materials directly.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-green-600">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Direct Purchase
                            </Badge>
                            <Badge className="bg-green-600">
                              <Building className="h-3 w-3 mr-1" />
                              Instant Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Dashboard Button */}
                    <div className="flex gap-2">
                      {(userRole === 'builder' || userRole === 'professional_builder' || userRole === 'private_client') && (
                        <Link to="/professional-builder-dashboard">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Building className="h-4 w-4 mr-2" />
                            My Dashboard
                          </Button>
                        </Link>
                      )}
                      {userRole === 'supplier' && (
                        <Link to="/supplier-dashboard">
                          <Button className="bg-amber-600 hover:bg-amber-700">
                            <Building className="h-4 w-4 mr-2" />
                            My Dashboard
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : user && !userRole ? (
              // Logged in but no role - prompt to complete registration
              <Card className="border-2 border-blue-500 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <span className="text-blue-600">👋</span>
                    Complete Your Registration
                  </CardTitle>
                  <CardDescription>
                    You're signed in as {user.email}. Choose your role to continue:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link to="/builder-registration" className="block">
                      <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 h-14">
                        <Building className="h-5 w-5 mr-2" />
                        Register as Builder
                      </Button>
                    </Link>
                    <Link to="/supplier-registration" className="block">
                      <Button size="lg" variant="outline" className="w-full border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white h-14">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Register as Supplier
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Not logged in - show 3 sign-in portals
              <div id="portals" className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Portal</h2>
                  <p className="text-gray-600">Sign in to access the marketplace and purchase materials</p>
                </div>
                
                {/* 3 Sign-in Portals Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Private Client Portal - Green */}
                  <Card className="border-2 border-green-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <ShoppingCart className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Private Builder</CardTitle>
                      <CardDescription className="text-green-100">
                        Personal purchases for home projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Direct material purchases
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Personal project tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Exclusive offers
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/private-client-signin" className="block">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/private-client-registration" className="block">
                          <Button variant="outline" className="w-full border-green-500 text-green-700 hover:bg-green-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Builder Portal - Blue */}
                  <Card className="border-2 border-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Professional Builder</CardTitle>
                      <CardDescription className="text-blue-100">
                        Contractors & construction companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Bulk material orders
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Trade discounts & credit
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Project management tools
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/professional-builder-signin" className="block">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/professional-builder-registration" className="block">
                          <Button variant="outline" className="w-full border-blue-500 text-blue-700 hover:bg-blue-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supplier Portal - Amber */}
                  <Card className="border-2 border-amber-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Supplier</CardTitle>
                      <CardDescription className="text-amber-100">
                        Sell your materials on UjenziXform
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          List & manage products
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          Receive & process orders
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          Grow your business
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/supplier-signin" className="block">
                          <Button className="w-full bg-amber-600 hover:bg-amber-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/supplier-registration" className="block">
                          <Button variant="outline" className="w-full border-amber-500 text-amber-700 hover:bg-amber-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Materials Section */}
      <main className="py-12 px-4">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Construction Materials
            </h2>
            <p className="text-gray-600">
              850+ verified suppliers across Kenya
            </p>
            {!user && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-300">
                <AlertDescription className="text-center">
                  <strong>👋 Sign in above to request quotes or purchase materials!</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Materials Grid - iPhone Safe Version */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Browse Materials</CardTitle>
              <CardDescription>
                High-quality construction materials from verified suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialsGrid />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuppliersMobileOptimized;
