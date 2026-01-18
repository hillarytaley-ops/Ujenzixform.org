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
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  FileText, 
  Building, 
  Shield,
  Store,
  Truck,
  Package,
  Star
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLoader } from "@/components/ui/DashboardLoader";

const Suppliers = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-background">
      <CartSidebar />
      <FloatingCartButton />
      <Navigation />

      {/* Hero Section - Responsive Design */}
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
            <span className="text-white">Materials</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Marketplace</span>
          </h1>
          
          {/* Description */}
          <p className="text-base md:text-lg lg:text-xl mb-6 max-w-2xl mx-auto text-white/80 px-4">
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

          {/* Portal Cards - Responsive Grid */}
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
                primaryAction={{ label: "Sign In", path: "/private-client-signin" }}
                secondaryAction={{ label: "Register", path: "/private-builder-registration" }}
              />

              {/* Professional Builder Portal */}
              <PortalCard
                icon={<FileText className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                title="Professional Builder"
                description="Request quotes for bulk orders"
                gradient="from-blue-600 to-blue-700"
                borderColor="blue"
                primaryAction={{ label: "Sign In", path: "/professional-builder-sign-in" }}
                secondaryAction={{ label: "Register", path: "/professional-builder-registration" }}
              />

              {/* Supplier Portal */}
              <PortalCard
                icon={<Store className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                title="Supplier"
                description="List & sell your products"
                gradient="from-amber-600 to-amber-700"
                borderColor="amber"
                primaryAction={{ label: "Sign In", path: "/supplier-sign-in" }}
                secondaryAction={{ label: "Register", path: "/supplier-registration" }}
              />

              {/* Delivery Provider Portal */}
              <PortalCard
                icon={<Truck className="h-6 w-6 md:h-7 md:w-7 text-white" />}
                title="Delivery Provider"
                description="Transport & logistics services"
                gradient="from-purple-600 to-purple-700"
                borderColor="purple"
                primaryAction={{ label: "Sign In", path: "/delivery-sign-in" }}
                secondaryAction={{ label: "Register", path: "/delivery-registration" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
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

      {/* Materials Grid Section */}
      <section id="materials-section" className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Browse Construction Materials
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Quality materials from verified suppliers across Kenya
            </p>
          </div>
          
          <MaterialsGrid />
        </div>
      </section>

      <Footer />
    </div>
  );
};

// Reusable Portal Card Component
interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  borderColor: string;
  primaryAction: { label: string; path: string };
  secondaryAction: { label: string; path: string };
}

const PortalCard: React.FC<PortalCardProps> = ({
  icon,
  title,
  description,
  gradient,
  borderColor,
  primaryAction,
  secondaryAction,
}) => {
  const navigate = useNavigate();
  
  return (
    <div className={`group bg-gradient-to-br ${gradient} rounded-xl md:rounded-2xl p-4 md:p-6 border border-${borderColor}-500/30 hover:border-${borderColor}-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
      <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-bold text-lg md:text-xl mb-1 md:mb-2">{title}</h3>
      <p className="text-white/70 text-xs md:text-sm mb-4 md:mb-5">{description}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs md:text-sm"
          onClick={() => navigate(primaryAction.path)}
        >
          {primaryAction.label}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs md:text-sm"
          onClick={() => navigate(secondaryAction.path)}
        >
          {secondaryAction.label}
        </Button>
      </div>
    </div>
  );
};

export default Suppliers;

