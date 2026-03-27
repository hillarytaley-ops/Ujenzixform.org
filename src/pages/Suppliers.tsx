/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛒 UNIFIED SUPPLIER MARKETPLACE PAGE                                               ║
 * ║                                                                                      ║
 * ║   This is the SINGLE responsive marketplace page that replaces:                      ║
 * ║   - SupplierMarketplace.tsx                                                          ║
 * ║   - SuppliersMobileOptimized.tsx                                                     ║
 * ║   - SuppliersIPhone.tsx                                                              ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: January 17, 2026                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  FileText, 
  Building, 
  Building2,
  Shield,
  Store,
  Truck,
  Package,
  Star,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLoader } from "@/components/ui/DashboardLoader";
import { setCartProjectContext, clearCartProjectContext } from "@/utils/builderCartProject";

const Suppliers = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Check if user is coming from a dashboard (hide hero section)
  const isFromDashboard = searchParams.get('from') === 'dashboard';
  
  // Get project_id from URL if provided (for project-based ordering)
  const projectIdFromUrl = searchParams.get('project_id');
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  
  // Store project_id in localStorage so cart can use it and fetch project name.
  // Do NOT clear cart_project_id when opening /suppliers?from=dashboard without project_id — the builder may have
  // chosen a project in the dashboard header; clearing here broke linking POs to projects.
  useEffect(() => {
    if (projectIdFromUrl) {
      setCartProjectContext(projectIdFromUrl, null);
      console.log('📁 Project ID from URL stored for cart:', projectIdFromUrl);

      const fetchProjectName = async () => {
        try {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess?.session?.access_token;
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/builder_projects?id=eq.${projectIdFromUrl}&select=name,location&limit=1`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              const row = data[0];
              const nm = row.name as string | undefined;
              const loc = row.location as string | undefined;
              setSelectedProjectName(nm ?? null);
              setCartProjectContext(projectIdFromUrl, nm ?? null, loc ?? null);
            }
          }
        } catch (error) {
          console.error('Error fetching project name:', error);
        }
      };
      void fetchProjectName();
    } else if (!isFromDashboard) {
      clearCartProjectContext();
      setSelectedProjectName(null);
    } else {
      const storedName = localStorage.getItem('cart_project_name');
      if (storedName) setSelectedProjectName(storedName);
    }
  }, [projectIdFromUrl, isFromDashboard]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fast auth check with caching
  useEffect(() => {
    // Use cached values for instant display
    const cachedRole = localStorage.getItem('user_role');
    const cachedUserId = localStorage.getItem('user_id');
    
    if (cachedRole && cachedUserId) {
      setUser({ id: cachedUserId });
      setUserRole(cachedRole);
      setLoading(false);
    }
    
    // Verify with Supabase in background
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('user_id', session.user.id);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();
        
        const role = roleData?.role || null;
        setUserRole(role);
        if (role) localStorage.setItem('user_role', role);
      } else {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is a delivery provider (restricted access)
  const isDeliveryProvider = userRole === 'delivery' || userRole === 'delivery_provider';
  
  // Check if user is already logged in as a builder (hide explore sections)
  const isLoggedInBuilder = user && (
    userRole === 'professional_builder' || 
    userRole === 'private_client' || 
    userRole === 'builder' ||
    userRole === 'supplier'
  );

  // Show restricted access message for delivery providers
  if (user && isDeliveryProvider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Marketplace Access Restricted</h1>
              <p className="text-lg text-teal-100 mb-6">
                The Suppliers Marketplace is exclusively for registered builders and suppliers. 
                As a delivery provider, you have access to delivery management features instead.
              </p>
              <Button 
                onClick={() => navigate('/delivery-dashboard')}
                className="bg-white text-teal-700 hover:bg-gray-100"
              >
                <Truck className="h-5 w-5 mr-2" />
                Go to Delivery Dashboard
              </Button>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  const scrollToMaterials = () => {
    const element = document.getElementById('materials-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Get dashboard path based on user role
  const getDashboardPath = () => {
    if (userRole === 'professional_builder') return '/professional-builder-dashboard';
    if (userRole === 'private_client') return '/builder-dashboard';
    if (userRole === 'supplier') return '/supplier-dashboard';
    return '/builder-dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      <CartSidebar />
      <FloatingCartButton />
      <Navigation />

      {/* Dashboard Header - Show when coming from dashboard */}
      {isFromDashboard && isLoggedInBuilder && (
        <section className="bg-gradient-to-r from-slate-800 via-emerald-800 to-slate-800 py-4 sm:py-5 border-b border-emerald-600/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(getDashboardPath())}
                className="shrink-0 self-start bg-white/10 border-white/30 text-white hover:bg-white/20 h-10 text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
                Back to Dashboard
              </Button>
              <div className="min-w-0 flex-1 md:text-center space-y-1.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight text-balance break-words">
                  Materials marketplace
                </h1>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed text-balance break-words max-w-2xl md:mx-auto">
                  {selectedProjectName ? (
                    <>
                      Ordering for{' '}
                      <span className="font-semibold text-white">{selectedProjectName}</span>
                    </>
                  ) : userRole === 'professional_builder' ? (
                    'Request quotes for bulk orders from verified suppliers.'
                  ) : (
                    'Browse and purchase materials at listed prices.'
                  )}
                </p>
              </div>
            </div>
            {selectedProjectName && (
              <div className="mt-4 rounded-lg border border-blue-400/45 bg-blue-600/25 px-3 py-3 sm:px-4">
                <p className="text-xs sm:text-sm text-white/95 leading-snug flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <span className="flex items-center gap-2 shrink-0 font-medium">
                    <Building2 className="h-4 w-4 shrink-0 opacity-90" />
                    Cost tracking
                  </span>
                  <span className="min-w-0 sm:pt-0.5">
                    Materials you add are linked to{' '}
                    <strong className="font-semibold text-white">{selectedProjectName}</strong>
                    {' '}for project spend tracking.
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Hero Section - Hide when coming from dashboard */}
      {!isFromDashboard && (
      <section className="text-white py-12 md:py-20 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-emerald-900/90 to-slate-900/95" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 md:mb-8">
            <span className="text-xl md:text-2xl">🇰🇪</span>
            <span className="text-white font-medium text-sm md:text-base">Kenya's #1 Construction Marketplace</span>
          </div>
          
          {/* Title - Responsive sizing */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 px-1 leading-tight text-balance break-words">
            <span className="text-white">Materials</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Marketplace</span>
          </h1>
          
          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 max-w-2xl mx-auto text-white/80 px-3 sm:px-4 leading-relaxed text-balance">
            Connect with 500+ verified suppliers. Quality construction materials delivered across all 47 counties.
          </p>

          {/* Stats Row - Responsive */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-8 md:mb-10">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white">500+</div>
              <div className="text-xs md:text-sm text-white/60">Suppliers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-emerald-400">10K+</div>
              <div className="text-xs md:text-sm text-white/60">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-teal-400">47</div>
              <div className="text-xs md:text-sm text-white/60">Counties</div>
            </div>
          </div>

          {/* Main CTA */}
          <Button 
            size={isMobile ? "default" : "lg"}
            className="h-12 md:h-14 px-8 md:px-10 bg-white text-slate-900 hover:bg-gray-100 font-bold text-base md:text-lg shadow-2xl mb-8 md:mb-12"
            onClick={scrollToMaterials}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Browse Materials
          </Button>

          {/* Portal Cards - Only show for non-logged-in users or those without builder/supplier roles */}
          {!isLoggedInBuilder && (
            <div className="max-w-5xl mx-auto" id="portals">
              <p className="text-white/50 text-xs md:text-sm font-medium mb-4 md:mb-6 uppercase tracking-widest">
                Choose Your Portal
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* Private Client Portal */}
                <PortalCard
                  icon={<ShoppingCart className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                  title="Private Builder"
                  description="Home projects & personal purchases"
                  gradient="from-emerald-600 to-emerald-700"
                  borderColor="emerald"
                  explorePath="/private-client-auth"
                  features={["Buy materials", "Track deliveries"]}
                />

                {/* Professional Builder Portal */}
                <PortalCard
                  icon={<FileText className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                  title="Professional Builder"
                  description="Request quotes for bulk orders"
                  gradient="from-blue-600 to-blue-700"
                  borderColor="blue"
                  explorePath="/professional-builder-auth"
                  features={["Bulk quotes", "Manage projects"]}
                />

                {/* Supplier Portal */}
                <PortalCard
                  icon={<Store className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                  title="Supplier"
                  description="List & sell your products"
                  gradient="from-amber-600 to-amber-700"
                  borderColor="amber"
                  explorePath="/supplier-auth"
                  features={["List products", "Receive orders"]}
                />

                {/* Delivery Provider Portal */}
                <PortalCard
                  icon={<Truck className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                  title="Delivery Provider"
                  description="Transport & logistics services"
                  gradient="from-purple-600 to-purple-700"
                  borderColor="purple"
                  explorePath="/delivery-auth"
                  features={["Get jobs", "Earn per delivery"]}
                />
              </div>
            </div>
          )}

          {/* Welcome message for logged-in builders */}
          {isLoggedInBuilder && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Welcome back, {userRole === 'professional_builder' ? 'Professional Builder' : userRole === 'private_client' ? 'Builder' : 'there'}!
                  </h3>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Browse materials below and add them to your cart. 
                  {userRole === 'professional_builder' && ' Request quotes for bulk pricing.'}
                  {userRole === 'private_client' && ' Buy directly at listed prices.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => navigate(
                      userRole === 'professional_builder' ? '/professional-builder-dashboard' :
                      userRole === 'supplier' ? '/supplier-dashboard' :
                      '/builder-dashboard'
                    )}
                  >
                    ← Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Trust Indicators - Hide when coming from dashboard */}
      {!isFromDashboard && (
      <section className="py-6 md:py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Verified Suppliers</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Quality Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Nationwide Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">4.8★ Rating</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Materials Grid Section */}
      <section id="materials-section" className="py-6 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          {!isFromDashboard && (
            <div className="text-center mb-6 md:mb-8 max-w-3xl mx-auto px-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight text-balance break-words">
                Browse construction materials
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed text-balance">
                Quality materials from verified suppliers across Kenya
              </p>
            </div>
          )}

          <MaterialsGrid embeddedInDashboard={isFromDashboard} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

// Reusable Portal Card Component - Single Explore button
interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  borderColor: string;
  explorePath: string;
  features?: string[];
}

const PortalCard: React.FC<PortalCardProps> = ({
  icon,
  title,
  description,
  gradient,
  borderColor,
  explorePath,
  features,
}) => {
  const navigate = useNavigate();
  
  return (
    <div className={`group bg-gradient-to-br ${gradient} rounded-xl md:rounded-2xl p-4 md:p-6 border border-${borderColor}-500/30 hover:border-${borderColor}-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col`}>
      <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-bold text-lg md:text-xl mb-1 md:mb-2">{title}</h3>
      <p className="text-white/70 text-xs md:text-sm mb-3">{description}</p>
      {features && features.length > 0 && (
        <ul className="text-white/60 text-xs space-y-1 mb-4">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-1">
              <span className="text-white/40">›</span> {feature}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        <Button
          size="sm"
          className="w-full bg-white hover:bg-gray-100 text-gray-900 border-0 text-xs md:text-sm font-bold shadow-md"
          onClick={() => navigate(explorePath)}
        >
          Explore
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Suppliers;

