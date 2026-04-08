import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";
import type { User } from "@supabase/supabase-js";

const DispatchScanner = React.lazy(() =>
  import("@/components/qr/DispatchScanner").then((m) => ({ default: m.DispatchScanner }))
);
const ReceivingScanner = React.lazy(() =>
  import("@/components/qr/ReceivingScanner").then((m) => ({ default: m.ReceivingScanner }))
);

const scannerSuspenseFallback = (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
    <p className="text-sm">Loading scanner…</p>
  </div>
);
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { 
  QrCode, 
  Scan, 
  Package, 
  Truck, 
  CheckCircle2, 
  Shield, 
  Clock, 
  MapPin,
  Camera,
  Smartphone,
  ArrowRight,
  BarChart3,
  FileCheck,
  AlertTriangle,
  Lock
} from 'lucide-react';

// Access Guard - BLOCK users without proper roles from accessing scanner pages
// Only suppliers (dispatch) and delivery providers (receiving) can use scanners
const ScannersAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dbVerified, setDbVerified] = useState(false); // Track if DB check is complete
  
  // Helper to get user from localStorage
  const getUserFromStorage = () => {
    try {
      const storedSession = readPersistedAuthRawStringSync();
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user || null;
      }
    } catch (e) {
      console.warn('Could not get user from localStorage');
    }
    return null;
  };
  
  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };
  
  useEffect(() => {
    const checkAccess = async () => {
      setDbVerified(false);
      
      // Safety timeout - show UI after 3 seconds max
      const safetyTimeout = setTimeout(() => {
        const storedRole = localStorage.getItem('user_role');
        const storedUser = getUserFromStorage();
        if (storedUser && storedRole) {
          setUser(storedUser);
          setDbRole(storedRole);
        }
        setDbVerified(true);
        setChecking(false);
      }, 3000);
      
      try {
        // Try to get user with timeout
        let authUser = null;
        try {
          const { data } = await withTimeout(supabase.auth.getUser(), 2000);
          authUser = data?.user || null;
        } catch {
          authUser = getUserFromStorage();
        }
        
        if (!authUser) {
          clearTimeout(safetyTimeout);
          setUser(null);
          setDbRole(null);
          setDbVerified(true);
          setChecking(false);
          return;
        }
        
        setUser(authUser);
        
        // Try to get role from database with timeout
        let role: string | null = localStorage.getItem('user_role'); // Start with localStorage
        try {
          const { data: roleData } = await withTimeout(
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authUser.id)
              .maybeSingle(),
            2000
          );
          
          if (roleData?.role) {
            role = roleData.role;
            localStorage.setItem('user_role', role);
            localStorage.setItem('user_role_id', authUser.id);
          }
        } catch {
          /* use localStorage role */
        }
        
        setDbRole(role);
        clearTimeout(safetyTimeout);
      } catch (error) {
        console.error('🚫 Scanners - Error checking access:', error);
        // On error, try localStorage fallback
        const storedRole = localStorage.getItem('user_role');
        const storedUser = getUserFromStorage();
        if (storedUser && storedRole) {
          setUser(storedUser);
          setDbRole(storedRole);
        } else {
          setDbRole(null);
        }
      }
      
      setDbVerified(true);
      setChecking(false);
    };
    
    checkAccess();
  }, []);
  
  // Show loading while checking - MUST wait for DB verification
  if (checking || !dbVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // STRICT CHECK: Users without a role - must register first (includes error cases)
  // This also blocks users with no auth or who had errors during role check
  if (!dbRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-800 dark:text-red-200">Registration Required</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {user 
                  ? "You need to register with a specific role to access QR scanners." 
                  : "Please sign in and register to access QR scanners."
                }
                {" "}Scanning is only available to:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <Scan className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-cyan-800 dark:text-cyan-200">Suppliers</h3>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400">For dispatching materials</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800 dark:text-green-200">Delivery Providers</h3>
                  <p className="text-xs text-green-600 dark:text-green-400">For receiving deliveries</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Please register with one of these roles:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/supplier-signin')} className="bg-orange-600 hover:bg-orange-700">
                    <Scan className="h-4 w-4 mr-2" />
                    Register as Supplier
                  </Button>
                  <Button onClick={() => navigate('/delivery-signin')} className="bg-teal-600 hover:bg-teal-700">
                    <Package className="h-4 w-4 mr-2" />
                    Register as Delivery
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Builders, Private Clients, and Professional Builders are NOT allowed to access scanner camera views
  // Only suppliers (dispatch scanners) and delivery providers (receiving scanners) can use this feature
  const restrictedRoles = ['builder', 'private_client', 'professional_builder'];
  
  if (restrictedRoles.includes(dbRole)) {
    const roleDisplayName = dbRole === 'builder' ? 'Builder' 
      : dbRole === 'private_client' ? 'Private Builder' 
      : 'Professional Builder';
    
    const dashboardLink = dbRole === 'builder' ? '/builder-dashboard'
      : dbRole === 'private_client' ? '/private-client-dashboard'
      : '/professional-builder-dashboard';
    
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-800 dark:text-red-200">Access Restricted</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                As a <strong>{roleDisplayName}</strong>, you don't have access to scanner cameras. 
                Scanning is only available to:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <Scan className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-cyan-800 dark:text-cyan-200">Suppliers</h3>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400">For dispatching materials</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800 dark:text-green-200">Delivery Providers</h3>
                  <p className="text-xs text-green-600 dark:text-green-400">For receiving deliveries</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  You can track your orders and deliveries instead:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/tracking')} className="bg-primary">
                    <Truck className="h-4 w-4 mr-2" />
                    Track My Deliveries
                  </Button>
                  <Button variant="outline" onClick={() => navigate(dashboardLink)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Admin, suppliers, and delivery providers can access
  return <>{children}</>;
};

const scrollToScannerStations = () => {
  document.getElementById("scanner-stations")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const ScannersContent = () => {
  const [activeScanner, setActiveScanner] = useState<"dispatch" | "receiving" | null>(null);
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const publicStats = useHomePagePublicStats();

  const localRole = localStorage.getItem("user_role");
  const effectiveRole = userRole || localRole;

  useEffect(() => {
    if (loading) return;

    const lr = localStorage.getItem("user_role");
    const role = userRole || lr;

    const restrictedRoles = ["builder", "private_client", "professional_builder"];
    if (restrictedRoles.includes(role || "")) {
      navigate("/tracking", { replace: true });
      return;
    }
    if (role === "supplier") {
      navigate("/supplier-dispatch-scanner", { replace: true });
      return;
    }
    if (role === "delivery" || role === "delivery_provider") {
      navigate("/delivery-receiving-scanner", { replace: true });
      return;
    }
  }, [userRole, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Professional Hero Section with QR Code Background */}
      <section className="relative overflow-hidden">
        {/* Background with QR Code Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          {/* QR Code Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23ffffff' x='0' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='20' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='30' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='50' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='70' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='0' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='10' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='40' y='10' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='10' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='20' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='30' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='40' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='60' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='20' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='30' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='20' y='30' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='30' y='30' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='40' y='30' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='30' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='40' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='40' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='10' y='50' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='30' y='50' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='50' y='50' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='70' y='50' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='60' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='20' y='60' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='60' y='60' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='60' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='70' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='70' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='0' y='80' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='20' y='80' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='30' y='80' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='40' y='80' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='60' y='80' width='10' height='10'/%3E%3Crect fill='%23ffffff' x='80' y='80' width='10' height='10'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px'
            }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40" />
        </div>

        {/* Animated Scanner Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-3/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-4 py-2 text-sm font-medium">
              <QrCode className="h-4 w-4 mr-2" />
              QR dispatch &amp; receiving
            </Badge>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                QR Code
              </span>
              <br />
              <span className="text-3xl md:text-5xl text-blue-300">
                Material Scanners
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Scan material QR codes at dispatch and receiving; the platform validates codes against your orders and line items.
              Coverage and GPS depend on how your team uses delivery tracking.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={() => {
                  setActiveScanner("dispatch");
                  requestAnimationFrame(() => scrollToScannerStations());
                }}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-cyan-500/25"
              >
                <Scan className="h-5 w-5 mr-2" />
                Dispatch Scanner
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setActiveScanner("receiving");
                  requestAnimationFrame(() => scrollToScannerStations());
                }}
                className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
              >
                <Package className="h-5 w-5 mr-2" />
                Receiving Scanner
              </Button>
            </div>

            {/* Stats Row — live aggregates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-cyan-400">
                  {formatHomeStatCount(publicStats.qrScanEventsTotal, publicStats.loading)}
                </div>
                <div className="text-sm text-gray-400">Scans logged (platform)</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-green-400">
                  {formatHomeStatCount(publicStats.materialItemsWithQr, publicStats.loading)}
                </div>
                <div className="text-sm text-gray-400">Line items with QR</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-blue-400">
                  {formatHomeStatCount(publicStats.supplierCompanies, publicStats.loading)}
                </div>
                <div className="text-sm text-gray-400">Supplier listings</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-purple-400">47</div>
                <div className="text-sm text-gray-400">Counties (Kenya)</div>
              </div>
            </div>
            <p className="text-[11px] md:text-xs text-white/45 max-w-lg mx-auto mt-4 px-2">
              Scan and QR counts come from live database totals. Open a scanner below when you are ready—camera loads on demand.
            </p>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background"/>
          </svg>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple & Secure Scanning Process</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tie physical materials to purchase orders: scan at handoff points so dispatch and receipt stay aligned with your data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center border-2 hover:border-cyan-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-cyan-100 dark:bg-cyan-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-2">Step 1</div>
                <h3 className="font-semibold mb-2">Generate QR Code</h3>
                <p className="text-sm text-muted-foreground">QR codes are linked to material line items on each order</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Step 2</div>
                <h3 className="font-semibold mb-2">Scan at Dispatch</h3>
                <p className="text-sm text-muted-foreground">Suppliers scan materials when loading for delivery</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-green-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Step 3</div>
                <h3 className="font-semibold mb-2">Track in Transit</h3>
                <p className="text-sm text-muted-foreground">
                  Status moves forward as scans and delivery workflows complete—GPS when providers share location
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-purple-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Step 4</div>
                <h3 className="font-semibold mb-2">Verify Receipt</h3>
                <p className="text-sm text-muted-foreground">Delivery providers scan to confirm delivery completion</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Scanner Section */}
      <section id="scanner-stations" className="py-12 bg-muted/30 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Material Scanning Stations</h2>
            <p className="text-muted-foreground">Select a scanner below or use the buttons to get started</p>
          </div>

          {/* Access Info Banner - for non-logged in users */}
          {!effectiveRole && (
            <div className="max-w-6xl mx-auto mb-6">
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-800">🔐 Role-Based Scanner Access</h3>
                      <p className="text-sm text-blue-700">
                        <strong>Suppliers</strong> can dispatch materials • <strong>Delivery Providers</strong> can confirm deliveries.
                        Builders should use the tracking page to monitor their orders.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <ErrorBoundary fallback={
            <div className="max-w-xl mx-auto p-6 border rounded-lg bg-muted">
              <div className="text-center space-y-3">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                <h2 className="text-xl font-semibold">Scanner failed to render</h2>
                <p className="text-muted-foreground">Please refresh the page and start the camera manually.</p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </div>
            </div>
          }>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Dispatch Scanner Card */}
              <Card className={`overflow-hidden transition-all duration-300 ${activeScanner === 'dispatch' ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20' : 'hover:shadow-lg'}`}>
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Scan className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Dispatch Scanner</CardTitle>
                        <CardDescription className="text-white/80">
                          For Registered Suppliers Only
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">
                      Outgoing
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {activeScanner === "dispatch" ? (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" onClick={() => setActiveScanner(null)}>
                          Collapse
                        </Button>
                      </div>
                      <Suspense fallback={scannerSuspenseFallback}>
                        <DispatchScanner />
                      </Suspense>
                    </>
                  ) : (
                    <div className="text-center py-10 px-4 space-y-4">
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Open the dispatch scanner when you are at the supplier yard. The camera and scanner bundle load only after you
                        open it.
                      </p>
                      <Button
                        onClick={() => {
                          setActiveScanner("dispatch");
                          requestAnimationFrame(() => scrollToScannerStations());
                        }}
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        Open dispatch scanner
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Receiving Scanner Card */}
              <Card className={`overflow-hidden transition-all duration-300 ${activeScanner === 'receiving' ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : 'hover:shadow-lg'}`}>
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Receiving Scanner</CardTitle>
                        <CardDescription className="text-white/80">
                          For Registered Delivery Providers Only
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">
                      Incoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {activeScanner === "receiving" ? (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" onClick={() => setActiveScanner(null)}>
                          Collapse
                        </Button>
                      </div>
                      <Suspense fallback={scannerSuspenseFallback}>
                        <ReceivingScanner />
                      </Suspense>
                    </>
                  ) : (
                    <div className="text-center py-10 px-4 space-y-4">
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Open the receiving scanner when you are accepting a delivery. The camera loads on demand to save bandwidth.
                      </p>
                      <Button
                        onClick={() => {
                          setActiveScanner("receiving");
                          requestAnimationFrame(() => scrollToScannerStations());
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Open receiving scanner
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Use Our QR Scanner?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Kenya's construction industry with local needs in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Shield className="h-10 w-10 text-cyan-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Stronger handoffs</h3>
                <p className="text-sm text-muted-foreground">
                  Server-side checks tie each scan to known line items—reducing casual mix-ups; operational controls still matter on site.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Clock className="h-10 w-10 text-blue-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Workflow updates</h3>
                <p className="text-sm text-muted-foreground">
                  Order and delivery status update as scans succeed, subject to your notification settings and connectivity.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <MapPin className="h-10 w-10 text-green-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Location when provided</h3>
                <p className="text-sm text-muted-foreground">
                  Scans can include location metadata when the device and flow capture it—not every scan includes GPS.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Smartphone className="h-10 w-10 text-purple-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Spotty connections</h3>
                <p className="text-sm text-muted-foreground">
                  The experience is tuned for mobile field use; full offline queueing depends on your build and browser—retry when back online if a scan fails.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <BarChart3 className="h-10 w-10 text-orange-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Dashboards &amp; history</h3>
                <p className="text-sm text-muted-foreground">
                  Supplier and delivery dashboards summarize movement; depth varies by role and what your team records.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <FileCheck className="h-10 w-10 text-red-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Specs on the order</h3>
                <p className="text-sm text-muted-foreground">
                  QR flows confirm which catalog line item moved; KEBS and certifications still depend on what suppliers document on products and quotes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Scanning?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Open the scanner when you are at the yard or site—camera and heavy scripts load only after you choose dispatch or receiving.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="font-semibold px-8"
              onClick={() => scrollToScannerStations()}
            >
              <Scan className="h-5 w-5 mr-2" />
              Choose a scanner
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10 font-semibold px-8"
              asChild
            >
              <a href="/tracking">
                <ArrowRight className="h-5 w-5 mr-2" />
                Track Deliveries
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

// Main export with access guard wrapper
const Scanners = () => (
  <ScannersAccessGuard>
    <ScannersContent />
  </ScannersAccessGuard>
);

export default Scanners;
