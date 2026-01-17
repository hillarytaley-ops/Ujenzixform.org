/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛒 SUPPLIER MARKETPLACE PAGE - PROTECTED                                           ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL PAGE - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️                       ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 25, 2025                                                   ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE:                                                                           ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  • Public marketplace for browsing construction materials                   │   ║
 * ║   │  • Shows MaterialsGrid with admin + supplier uploaded images               │   ║
 * ║   │  • Request Quote / Buy Now buttons redirect to sign-in if needed           │   ║
 * ║   │  • Accessible to everyone (public browsing)                                │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Remove the MaterialsGrid component                                             ║
 * ║   - Hide MaterialsGrid from public users                                           ║
 * ║   - Remove the hero section or navigation                                          ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
// FloatingSocialSidebar moved to App.tsx for global availability
import { 
  Store, 
  Search, 
  MapPin, 
  Package, 
  ShoppingCart,
  FileText,
  Building2,
  LogIn,
  UserPlus,
  Filter,
  Star,
  Truck,
  Shield,
  CheckCircle,
  Phone
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
  "All Categories",
  // STRUCTURAL & FOUNDATION
  "Cement", "Steel", "Aggregates", "Sand", "Stone", "Blocks", "Bricks", "Ready Mix Concrete",
  // ROOFING
  "Roofing", "Iron Sheets", "Roofing Tiles", "Gutters & Downpipes", "Roofing Accessories", "Waterproofing",
  // TIMBER & WOOD
  "Timber", "Plywood", "Particle Board", "Timber Trusses", "Formwork", "Treated Poles",
  // DOORS, WINDOWS & OPENINGS
  "Doors", "Steel Doors", "Windows", "Aluminium Windows", "Glass", "Door Frames", "Door Hardware", "Window Hardware",
  // PLUMBING & WATER
  "Plumbing", "PVC Pipes", "PPR Pipes", "GI Pipes", "HDPE Pipes", "Pipe Fittings", "Valves",
  "Water Tanks", "Pumps", "Taps & Mixers", "Sanitary Ware", "Bathroom Accessories", "Septic Tanks", "Water Heaters",
  // ELECTRICAL
  "Electrical", "Cables & Wires", "Switches & Sockets", "Distribution Boards", "Lighting", "Conduits",
  "Electrical Accessories", "Solar Equipment", "Generators", "UPS & Stabilizers",
  // TILES & FLOORING
  "Tiles", "Ceramic Tiles", "Porcelain Tiles", "Granite Tiles", "Marble", "Terrazzo", "Vinyl Flooring",
  "Wooden Flooring", "Carpet", "Tile Adhesive", "Tile Grout", "Skirting",
  // PAINT & FINISHES
  "Paint", "Emulsion Paint", "Gloss Paint", "Exterior Paint", "Wood Finish", "Metal Paint",
  "Primers", "Putty & Fillers", "Thinners & Solvents", "Brushes & Rollers",
  // WALL & CEILING
  "Gypsum", "Ceiling Boards", "Plaster", "Wallpaper", "Wall Cladding", "Insulation", "Cornices",
  // HARDWARE & FASTENERS
  "Hardware", "Nails", "Screws", "Bolts & Nuts", "Hinges", "Locks", "Chains", "Wire", "Wire Mesh", "Brackets & Supports",
  // TOOLS & EQUIPMENT
  "Tools", "Hand Tools", "Power Tools", "Measuring Tools", "Cutting Tools", "Masonry Tools",
  "Painting Tools", "Safety Equipment", "Scaffolding", "Ladders", "Wheelbarrows",
  // ADHESIVES & SEALANTS
  "Adhesives", "Sealants", "Caulking", "Epoxy",
  // FENCING & SECURITY
  "Fencing", "Barbed Wire", "Electric Fence", "Gates", "Security Systems",
  // LANDSCAPING & OUTDOOR
  "Paving", "Outdoor Tiles", "Drainage", "Retaining Walls", "Garden Materials",
  // KITCHEN & BUILT-IN
  "Kitchen Cabinets", "Countertops", "Kitchen Sinks", "Kitchen Hardware", "Wardrobes",
  // HVAC & VENTILATION
  "Air Conditioning", "Ventilation", "Ceiling Fans",
  // FIRE SAFETY
  "Fire Safety", "Fire Doors", "Fire Alarm", "Sprinkler Systems",
  // SPECIALTY MATERIALS
  "Damp Proofing", "Expansion Joints", "Reinforcement Accessories", "Curing Compounds", "Admixtures",
  // MISCELLANEOUS
  "Geotextiles", "Polythene", "Tarpaulins", "Signage", "Other"
];

/**
 * SupplierMarketplace - BUILDER ONLY ACCESS
 * 
 * This page is STRICTLY for registered builders to browse and purchase materials.
 * Users without a role or with non-builder roles are blocked.
 */
const SupplierMarketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check localStorage first for instant loading
  const cachedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const cachedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
  const isBuilderCached = cachedRole === 'builder' || cachedRole === 'professional_builder' || cachedRole === 'private_client';
  
  const [user, setUser] = useState<any>(isBuilderCached ? { email: cachedEmail || 'Builder' } : null);
  const [userRole, setUserRole] = useState<string | null>(cachedRole);
  const [loading, setLoading] = useState(!isBuilderCached); // Only show loading if no cached role
  const [roleVerified, setRoleVerified] = useState(isBuilderCached);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  useEffect(() => {
    // If we have cached role, verify in background
    if (isBuilderCached) {
      checkAuthBackground();
    } else {
      checkAuth();
    }
  }, []);

  // Background check - doesn't block UI (uses faster getSession)
  const checkAuthBackground = async () => {
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
        if (roleData?.role) {
          setUserRole(roleData.role);
          localStorage.setItem('user_role', roleData.role);
        }
      }
    } catch (error) {
      console.error('Background auth check error:', error);
    }
  };

  const checkAuth = async () => {
    console.log('🔐 SupplierMarketplace - Checking auth...');
    try {
      // First check Supabase Auth (use getSession for speed)
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (user) {
        setUser(user);
        console.log('🔐 SupplierMarketplace - Supabase user:', user.email);
        
        // Check database for role
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const dbRole = roleData?.role || null;
        console.log('🔐 SupplierMarketplace - DB role:', dbRole, 'error:', error?.message);
        
        if (dbRole) {
          setUserRole(dbRole);
          setRoleVerified(true);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: Check localStorage for builder role (for users who signed in via builder-signin)
      const storedRole = localStorage.getItem('user_role');
      const storedEmail = localStorage.getItem('user_email');
      
      if (storedRole && (storedRole === 'builder' || storedRole === 'professional_builder' || storedRole === 'private_client')) {
        console.log('🔐 SupplierMarketplace - Using localStorage role:', storedRole);
        setUser({ email: storedEmail || 'Builder' });
        setUserRole(storedRole);
        setRoleVerified(true);
        setLoading(false);
        return;
      }
      
      console.log('🔐 SupplierMarketplace - No authenticated user');
      setLoading(false);
      setRoleVerified(true);
    } catch (error) {
      console.error('Auth check error:', error);
      setRoleVerified(true);
      setLoading(false);
    }
  };

  const isBuilder = userRole === 'professional_builder' || userRole === 'private_client' || userRole === 'builder';
  const isSupplier = userRole === 'supplier';
  const isDeliveryProvider = userRole === 'delivery';
  const hasNoRole = !userRole;
  
  // Show loading while checking
  if (loading || !roleVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // Block users without a role - they need to register first
  if (user && hasNoRole) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Navigation />
        
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-orange-800 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Registration Required</h1>
              <p className="text-lg text-red-100 mb-6">
                You need to register as a Builder to access the Supplier Marketplace.
              </p>
              
              <div className="space-y-4">
                <Button 
                  size="lg"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => navigate('/builder-signin')}
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Register as Builder
                </Button>
                <p className="text-sm text-red-200">
                  Are you a supplier?{' '}
                  <a href="/supplier-signin" className="underline text-white">Go to Supplier Portal</a>
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }
  
  // Show access denied for non-builders who are logged in (suppliers, delivery providers)
  if (user && !isBuilder) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Navigation />
        
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-orange-800 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Builder Access Only</h1>
              <p className="text-lg text-red-100 mb-6">
                The Supplier Marketplace is exclusively for registered builders to purchase construction materials.
              </p>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-8">
                <p className="text-sm">
                  You are currently signed in as: <strong className="capitalize">{userRole?.replace('_', ' ')}</strong>
                </p>
              </div>
              
              {isSupplier && (
                <div className="space-y-4">
                  <p className="text-red-100">
                    As a supplier, you can manage your products and orders from your dashboard.
                  </p>
                  <Button 
                    size="lg"
                    className="bg-white text-red-700 hover:bg-gray-100"
                    onClick={() => navigate('/supplier-dashboard')}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    Go to Supplier Dashboard
                  </Button>
                </div>
              )}
              
              {isDeliveryProvider && (
                <div className="space-y-4">
                  <p className="text-red-100">
                    As a delivery provider, you can manage deliveries from your dashboard.
                  </p>
                  <Button 
                    size="lg"
                    className="bg-white text-red-700 hover:bg-gray-100"
                    onClick={() => navigate('/delivery-dashboard')}
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Go to Delivery Dashboard
                  </Button>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-white/20">
                <p className="text-sm text-red-100 mb-4">
                  Want to purchase materials? Register as a builder:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/professional-builder-registration')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Professional Builder
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/private-builder-registration')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Private Builder
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* FloatingSocialSidebar now in App.tsx */}
      <CartSidebar />
      <FloatingCartButton />
      <Navigation />
      
      {/* Hero Section - Clean and Professional */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium">Supplier Marketplace</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Buy Construction Materials Directly from Verified Suppliers
            </h1>
            
            <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
              Compare prices, request quotes, and purchase quality materials from trusted suppliers across Kenya
            </p>

            {/* User Status - Show different messages based on state */}
            {loading ? (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-6 py-3 rounded-lg">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Checking access...</span>
              </div>
            ) : user && isBuilder ? (
              <div className="inline-flex items-center gap-2 bg-green-500/30 backdrop-blur px-6 py-3 rounded-lg border border-green-400/50">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span>Welcome back, {userRole === 'private_client' ? 'Private Builder' : 'Professional Builder'}! You're ready to shop.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-500/20 backdrop-blur px-6 py-3 rounded-lg border border-yellow-400/50 inline-block">
                  <p className="text-yellow-100 text-sm">
                    <Shield className="h-4 w-4 inline mr-2" />
                    Sign in or register as a builder to access the marketplace
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-emerald-700 hover:bg-gray-100 font-semibold"
                    onClick={() => navigate('/builder-signin?redirect=/supplier-marketplace')}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In as Builder
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/professional-builder-registration?redirect=/supplier-marketplace')}
                  >
                    <Building2 className="h-5 w-5 mr-2" />
                    Register as Pro Builder
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/private-builder-registration?redirect=/supplier-marketplace')}
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Register as Private Builder
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search Bar - Sticky */}
      <section className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search materials (cement, steel, tiles...)"
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-56 h-12">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <Card className="text-center p-4">
              <Store className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">500+</p>
              <p className="text-sm text-gray-500">Suppliers</p>
            </Card>
            <Card className="text-center p-4">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">10K+</p>
              <p className="text-sm text-gray-500">Products</p>
            </Card>
            <Card className="text-center p-4">
              <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">47</p>
              <p className="text-sm text-gray-500">Counties</p>
            </Card>
            <Card className="text-center p-4">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">4.8</p>
              <p className="text-sm text-gray-500">Avg Rating</p>
            </Card>
          </div>

          {/* MATERIALS GRID - Show to everyone (public marketplace) */}
          {/* MARKETPLACE MODE - Full functionality for registered builders */}
          {/* Buttons inside MaterialsGrid will redirect to sign-in if needed */}
          <div className="mb-12">
            <MaterialsGrid />
          </div>

          {/* How It Works - For Non-logged in users or non-builders */}
          {(!user || !isBuilder) && (
            <div className="mb-12 max-w-4xl mx-auto">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-amber-600" />
                  <h3 className="font-bold text-amber-800">Builders Only Marketplace</h3>
                </div>
                <p className="text-amber-700 text-sm">
                  This marketplace is exclusively for registered builders (Professional Builders and Private Builders) to purchase construction materials. 
                  Register as a builder to unlock full access.
                </p>
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="text-center border-2 border-emerald-100">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-emerald-600">1</span>
                    </div>
                    <h3 className="font-semibold mb-2">Register as Builder</h3>
                    <p className="text-sm text-gray-500">
                      Create a free account as a Professional Builder or Private Builder
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="text-center border-2 border-blue-100">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-blue-600">2</span>
                    </div>
                    <h3 className="font-semibold mb-2">Browse & Compare</h3>
                    <p className="text-sm text-gray-500">
                      Search materials, compare prices from multiple suppliers
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="text-center border-2 border-orange-100">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-orange-600">3</span>
                    </div>
                    <h3 className="font-semibold mb-2">Buy or Request Quote</h3>
                    <p className="text-sm text-gray-500">
                      Purchase directly or request quotes for bulk orders
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Material Categories Grid - Hide since MaterialsGrid has its own filters */}

          {/* Why Choose Us */}
          <div className="bg-white rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">Why Buy from UjenziXform Marketplace?</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <Shield className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Verified Suppliers</h3>
                <p className="text-sm text-gray-500">All suppliers are vetted and verified</p>
              </div>
              <div className="text-center">
                <Star className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Best Prices</h3>
                <p className="text-sm text-gray-500">Compare and get competitive prices</p>
              </div>
              <div className="text-center">
                <Truck className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Fast Delivery</h3>
                <p className="text-sm text-gray-500">Delivery across all 47 counties</p>
              </div>
              <div className="text-center">
                <Phone className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">24/7 Support</h3>
                <p className="text-sm text-gray-500">Customer support when you need it</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          {!user || !isBuilder ? (
            <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
              <CardContent className="py-10 text-center">
                <h2 className="text-2xl font-bold mb-3">Ready to Start Buying?</h2>
                <p className="text-emerald-100 mb-6 max-w-xl mx-auto">
                  Register as a builder to browse materials, request quotes, and purchase from verified suppliers
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-emerald-700 hover:bg-gray-100 font-semibold"
                    onClick={() => navigate('/builder-signin?redirect=/supplier-marketplace')}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In as Builder
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/professional-builder-registration?redirect=/supplier-marketplace')}
                  >
                    <Building2 className="h-5 w-5 mr-2" />
                    Register as Pro Builder
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/private-builder-registration?redirect=/supplier-marketplace')}
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Register as Private Builder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="py-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-16 w-16 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-emerald-900 mb-2">You're All Set!</h3>
                    <p className="text-emerald-700 mb-4">
                      {userRole === 'private_client' 
                        ? "As a Private Builder, you can buy materials directly from suppliers."
                        : "As a Professional Builder, you can request quotes and purchase in bulk."
                      }
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Badge className="bg-emerald-600">✓ Browse Materials</Badge>
                      <Badge className="bg-blue-600">✓ Request Quotes</Badge>
                      <Badge className="bg-orange-600">✓ Buy Directly</Badge>
                      <Badge className="bg-purple-600">✓ Track Orders</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Are You a Supplier? */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-3">Are you a construction material supplier?</p>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => window.location.href = '/supplier-registration'}
            >
              <Store className="h-4 w-4" />
              Register as Supplier
            </Button>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SupplierMarketplace;
