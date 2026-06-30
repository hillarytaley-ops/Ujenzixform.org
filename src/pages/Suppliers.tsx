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
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Building2,
  Shield,
  Truck,
  Package,
  Star,
  ArrowLeft,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useDeliveryProviderHiringApproval } from "@/hooks/useDeliveryProviderHiringApproval";
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { setCartProjectContext, clearCartProjectContext } from "@/utils/builderCartProject";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";

const Suppliers = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const publicStats = useHomePagePublicStats();

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

  // Verify auth with Supabase
  useEffect(() => {
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
      } else {
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

  // Approved delivery providers cannot purchase on the marketplace
  const isDeliveryProvider = userRole === 'delivery' || userRole === 'delivery_provider';
  
  // Check if user is already logged in as a builder (hide explore sections)
  const isLoggedInBuilder = user && (
    userRole === 'professional_builder' || 
    userRole === 'private_client' || 
    userRole === 'builder' ||
    userRole === 'supplier'
  );

  /** Only registered CO/contractor, private builder, or legacy builder may purchase or use cart on this page */
  const canPurchaseMaterials = Boolean(
    user &&
    (userRole === 'professional_builder' ||
      userRole === 'private_client' ||
      userRole === 'builder')
  );

  const isGuest = !user;
  /** Public catalog without purchase: simplify hero and avoid duplicate titles with MaterialsGrid */
  const showPurchaseAccountGuidance = !isFromDashboard && !canPurchaseMaterials;

  const { canAcceptDeliveryOrders, loading: hiringLoading } =
    useDeliveryProviderHiringApproval();

  // Approved delivery providers only — pending providers browse like the public
  if (user && isDeliveryProvider && !hiringLoading && canAcceptDeliveryOrders) {
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
                The material marketplace is exclusively for registered builders and suppliers.
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
    if (userRole === 'private_client') return '/private-client-dashboard';
    if (userRole === 'supplier') return '/supplier-dashboard';
    return '/professional-builder-dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {canPurchaseMaterials && (
        <>
          <CartSidebar />
          <FloatingCartButton />
        </>
      )}
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

      {/* Hero Section — warm palette; lighter overlay (matches homepage) */}
      {!isFromDashboard && (
      <section className="text-white relative overflow-hidden py-8 sm:py-10 md:py-12 min-h-[420px] sm:min-h-[460px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-slate-900 to-emerald-950" />
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=85&auto=format&fit=crop"
            alt="Construction materials and site"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950/50 via-slate-900/45 to-emerald-950/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-orange-900/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-transparent to-emerald-900/25" />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-[10%] w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-8 right-[8%] w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-56 h-56 bg-amber-400/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-600/10 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 max-w-4xl w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-3 py-1.5 mb-3 md:mb-4 shadow-lg shadow-black/10">
            <span className="text-base md:text-lg leading-none">🇰🇪</span>
            <span className="text-white font-medium text-xs md:text-sm">Kenya · material marketplace</span>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-3 px-1 leading-tight text-balance break-words drop-shadow-md">
            <span className="text-white">Materials</span>
            <span className="bg-gradient-to-r from-orange-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent">
              {' '}Marketplace
            </span>
          </h1>
          
          {/* Description — shorter on public view; detailed CTAs live above the catalog */}
          <p
            className={`mb-4 max-w-2xl mx-auto text-orange-50/90 px-2 sm:px-3 leading-snug text-balance drop-shadow-sm ${
              showPurchaseAccountGuidance
                ? "text-xs sm:text-sm md:text-base"
                : "text-xs sm:text-sm md:text-base"
            }`}
          >
            {showPurchaseAccountGuidance ? (
              <>
                Browse prices, specs, and suppliers below.{' '}
                <span className="text-white/95 font-medium">
                  To buy or request quotes, sign in or register as a Private Builder or CO/Contractor
                </span>{' '}
                — the catalog explains the next steps.
              </>
            ) : (
              <>
                Anyone can browse this catalog. Purchasing and supplier quotes are available after you sign in as a
                registered Private Builder or CO/Contractor. Delivery depends on your area and active partners.
              </>
            )}
          </p>

          {/* Stats — compact row */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:gap-x-10 mb-3 md:mb-4">
            <div className="text-center min-w-[5.5rem] px-3 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
              <div className="text-lg md:text-2xl font-bold text-white tabular-nums">
                {formatHomeStatCount(publicStats.supplierCompanies, publicStats.loading)}
              </div>
              <div className="text-[10px] md:text-xs text-orange-100/75 leading-tight">Supplier listings</div>
            </div>
            <div className="text-center min-w-[5.5rem] px-3 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
              <div className="text-lg md:text-2xl font-bold text-amber-300 tabular-nums">
                {formatHomeStatCount(publicStats.approvedMaterials, publicStats.loading)}
              </div>
              <div className="text-[10px] md:text-xs text-orange-100/75 leading-tight">Approved materials</div>
            </div>
            <div className="text-center min-w-[5.5rem] px-3 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
              <div className="text-lg md:text-2xl font-bold text-emerald-300 tabular-nums">47</div>
              <div className="text-[10px] md:text-xs text-orange-100/75 leading-tight">Counties (Kenya)</div>
            </div>
          </div>
          {!isLoggedInBuilder && (
            <p className="text-[10px] md:text-[11px] text-orange-100/55 max-w-md mx-auto mb-4 px-2 leading-snug">
              Figures update from directory data; materials count matches approved rows in the catalog.
            </p>
          )}

          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 md:mb-5">
            <Button
              size="default"
              type="button"
              className="h-10 md:h-11 px-6 md:px-8 bg-white text-slate-900 hover:bg-orange-50 font-semibold text-sm md:text-base shadow-xl shadow-black/20 ring-2 ring-white/30"
              onClick={scrollToMaterials}
            >
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 mr-2 shrink-0" />
              Browse Materials
            </Button>
            {showPurchaseAccountGuidance && isGuest && (
              <>
                <Link
                  to="/auth?tab=signin"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "h-10 md:h-11 px-6 md:px-8 border-2 border-white/50 bg-white/10 text-white hover:bg-white/15 hover:border-amber-200/50 font-semibold text-sm md:text-base shadow-lg backdrop-blur-md no-underline"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?tab=signup"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "h-10 md:h-11 px-6 md:px-8 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white border-2 border-orange-400/40 hover:from-orange-400 hover:via-orange-500 hover:to-red-500 font-semibold text-sm md:text-base shadow-xl shadow-orange-900/30 no-underline"
                  )}
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {showPurchaseAccountGuidance && isGuest && (
            <div className="max-w-xl mx-auto mt-0 mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-orange-50/80">
              <span>Also on UjenziXform:</span>
              <Link to="/supplier-auth" className="text-amber-200 hover:text-white underline underline-offset-2">
                Supplier sign-in
              </Link>
              <span className="text-white/40" aria-hidden>
                ·
              </span>
              <Link to="/delivery-registration" className="text-purple-200 hover:text-white underline underline-offset-2">
                Delivery partner
              </Link>
            </div>
          )}

          {/* Welcome message for logged-in builders */}
          {isLoggedInBuilder && !showPurchaseAccountGuidance && (
            <div className="max-w-xl mx-auto text-center">
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 shadow-lg shadow-black/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 mb-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-orange-500/25 rounded-full flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-4 w-4 text-amber-300" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Welcome back,{' '}
                      {userRole === 'professional_builder'
                        ? 'CO/Contractor'
                        : userRole === 'private_client'
                          ? 'Builder'
                          : 'there'}
                      !
                    </h3>
                  </div>
                </div>
                <p className="text-orange-50/85 text-xs sm:text-sm mb-2 sm:mb-3 leading-snug">
                  Scroll down to browse and add to cart.
                  {userRole === 'professional_builder' && ' Request quotes for bulk pricing.'}
                  {userRole === 'private_client' && ' Buy at listed prices.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-9 text-xs sm:text-sm"
                  onClick={() =>
                    navigate(
                      userRole === 'professional_builder'
                        ? '/professional-builder-dashboard'
                        : userRole === 'private_client'
                          ? '/private-client-dashboard'
                          : userRole === 'supplier'
                            ? '/supplier-dashboard'
                            : '/professional-builder-dashboard'
                    )
                  }
                >
                  ← Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Trust Indicators — skip for guests to shorten page; signed-in non-buyers still see trust */}
      {!isFromDashboard && !isGuest && (
      <section className="py-6 md:py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Supplier accounts on platform</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Listings moderated (approved catalog)</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Delivery by region &amp; availability</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-emerald-600" />
              <span className="text-sm md:text-base">Compare prices in the catalog</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Materials Grid Section */}
      <section id="materials-section" className="py-6 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          {!isFromDashboard && canPurchaseMaterials && (
            <div className="text-center mb-6 md:mb-8 max-w-3xl mx-auto px-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight text-balance break-words">
                Browse construction materials
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed text-balance">
                Approved materials and catalog items—verify specs and pricing on each order.
              </p>
            </div>
          )}

          <MaterialsGrid
            embeddedInDashboard={isFromDashboard}
            purchaseEnabled={canPurchaseMaterials}
            unifiedMarketplaceHeader={!isFromDashboard}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Suppliers;

