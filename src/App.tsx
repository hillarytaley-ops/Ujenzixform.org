import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnhancedErrorBoundary } from "@/components/ui/enhanced-error-boundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

// Critical path imports - loaded immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better bundle splitting
const Builders = React.lazy(() => import("./pages/Builders"));
const BuilderRegistration = React.lazy(() => import("./pages/BuilderRegistration"));
const ProfessionalBuilderRegistration = React.lazy(() => import("./pages/ProfessionalBuilderRegistration"));
const PrivateBuilderRegistration = React.lazy(() => import("./pages/PrivateBuilderRegistration"));
const Suppliers = React.lazy(() => import("./pages/Suppliers"));
const BuilderPortal = React.lazy(() => import("./pages/BuilderPortal"));
const About = React.lazy(() => import("./pages/About"));
const Contact = React.lazy(() => import("./pages/Contact"));
const AdminAuth = React.lazy(() => import("./pages/AdminAuth"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Feedback = React.lazy(() => import("./pages/Feedback"));
const Careers = React.lazy(() => import("./pages/Careers"));
const Tracking = React.lazy(() => import("./pages/Tracking"));
const Monitoring = React.lazy(() => import("./pages/Monitoring"));
const Delivery = React.lazy(() => import("./pages/Delivery"));
const Scanners = React.lazy(() => import("./pages/Scanners"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const DeliveryProviderApplication = React.lazy(() => import("./pages/DeliveryProviderApplication"));

// Dashboard imports - lazy loaded (heavy components)
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SupplierDashboard = React.lazy(() => import("./pages/SupplierDashboard"));
const DeliveryDashboard = React.lazy(() => import("./pages/DeliveryDashboard"));

// Additional pages - lazy loaded
const SupplierRegistration = React.lazy(() => import("./pages/SupplierRegistration"));
const SupplierSignIn = React.lazy(() => import("./pages/SupplierSignIn"));
const BuilderSignIn = React.lazy(() => import("./pages/BuilderSignIn"));
const DeliverySignIn = React.lazy(() => import("./pages/DeliverySignIn"));
const DeliveryReceivingScanner = React.lazy(() => import("./pages/DeliveryReceivingScanner"));
const SupplierDispatchScanner = React.lazy(() => import("./pages/SupplierDispatchScanner"));

// Sign-in pages - lazy loaded
const PrivateClientSignIn = React.lazy(() => import("./pages/PrivateClientSignIn"));
const ProfessionalBuilderSignIn = React.lazy(() => import("./pages/ProfessionalBuilderSignIn"));
const PrivateClientDashboard = React.lazy(() => import("./pages/PrivateClientDashboard"));
const ProfessionalBuilderDashboardPage = React.lazy(() => import("./pages/ProfessionalBuilderDashboard"));
const PublicBuilderProfile = React.lazy(() => import("./pages/PublicBuilderProfile"));

// Unified Auth page - single auth page for all roles
const UnifiedAuth = React.lazy(() => import("./pages/UnifiedAuth"));

// Legal pages - lazy loaded
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));

// Auth Guard
import { AuthRequired } from "@/components/security/AuthRequired";
import { RoleProtectedRoute } from "@/components/security/RoleProtectedRoute";
import { Navigate, useSearchParams, useLocation } from "react-router-dom";

// Simple Live Chat Widget for staff support
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";

// Floating Social Media Button
import { FloatingSocialSidebar } from "@/components/FloatingSocialSidebar";

// Offline Status Indicator
import { OfflineIndicator } from "@/components/OfflineIndicator";

// PWA Install Prompt
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

// Optimized loading component with skeleton animation
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-muted border-t-primary"></div>
      <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
    </div>
  </div>
);

// Suspense wrapper for lazy components
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.Suspense fallback={<PageLoader />}>
    {children}
  </React.Suspense>
);

// Optimized QueryClient with aggressive caching for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - longer cache for better performance
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
      refetchOnWindowFocus: false, // Disable auto-refetch for better performance
      refetchOnReconnect: false, // Disable on reconnect
      retry: 1, // Only retry once to fail faster
    },
  },
});

// Component that hides floating widgets on auth pages
const FloatingWidgets = () => {
  const location = useLocation();
  
  // Hide on auth-related pages
  const authPaths = ['/', '/auth', '/admin-login', '/reset-password', '/builder-signin', '/supplier-signin', '/delivery-signin', '/professional-builder-signin', '/private-builder-signin'];
  const isAuthPage = authPaths.some(path => location.pathname === path) || 
                     location.pathname.includes('-registration') ||
                     location.pathname.includes('-signin');
  
  if (isAuthPage) {
    return null;
  }
  
  return (
    <>
      <LiveChatWidget />
      <FloatingSocialSidebar />
    </>
  );
};

const App = () => {
  const [user, setUser] = React.useState<any>(null);
  const [showChat, setShowChat] = React.useState(false);

  React.useEffect(() => {
    const conn: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    const isLowData = !!conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g');

    let authSubscription: any = null;

    // Get current user and set up auth listener
    const initAuth = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get current user immediately
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        console.log('🔐 Chat: User detected:', currentUser.email);
        setUser(currentUser);
      }
      
      // Track last event to prevent duplicate logs
      let lastEvent = '';
      let lastEmail = '';
      
      // Listen for auth changes (sign in, sign out)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Dedupe: only log if event or email actually changed
        const email = session?.user?.email || '';
        if (event !== lastEvent || email !== lastEmail) {
          console.log('🔐 Chat: Auth state changed:', event, email);
          lastEvent = event;
          lastEmail = email;
        }
        
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      });
      
      authSubscription = subscription;
    };

    // Initialize auth (with slight delay on slow connections)
    const timer = setTimeout(() => {
      initAuth();
    }, isLowData ? 2000 : 500);

    // Load chat widget after page is interactive (always show)
    const chatTimer = setTimeout(() => {
      setShowChat(true);
    }, isLowData ? 3000 : 1500);

    return () => {
      clearTimeout(timer);
      clearTimeout(chatTimer);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <CartProvider>
            <OnboardingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                {/* Offline Status Indicator - Shows when offline */}
                <OfflineIndicator />
                
                {/* PWA Install Prompt - Shows after 30 seconds of browsing */}
                <PWAInstallPrompt />
                
                {/* Floating widgets that hide on auth pages */}
                {showChat && <FloatingWidgets />}
                
                <EnhancedErrorBoundary>
                <Routes>
                    {/* Public Routes - Accessible to everyone after single sign in */}
                    <Route path="/" element={<Auth />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/unified-auth" element={<SuspenseWrapper><UnifiedAuth /></SuspenseWrapper>} />
                    <Route path="/admin-login" element={<SuspenseWrapper><AdminAuth /></SuspenseWrapper>} />
                    <Route path="/reset-password" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
                    
                    {/* All pages accessible after sign in - no repeated auth required */}
                    <Route path="/home" element={<Index />} />
                    <Route path="/suppliers" element={<SuspenseWrapper><Suppliers /></SuspenseWrapper>} />
                    <Route path="/suppliers-mobile" element={<SuspenseWrapper><Suppliers /></SuspenseWrapper>} />
                    <Route path="/supplier-marketplace" element={<SuspenseWrapper><Suppliers /></SuspenseWrapper>} />
                    <Route path="/builders" element={<SuspenseWrapper><Builders /></SuspenseWrapper>} />
                    <Route path="/builder/:builderId" element={<SuspenseWrapper><PublicBuilderProfile /></SuspenseWrapper>} />
                    <Route path="/about" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
                    <Route path="/contact" element={<SuspenseWrapper><Contact /></SuspenseWrapper>} />
                    <Route path="/monitoring" element={<SuspenseWrapper><Monitoring /></SuspenseWrapper>} />
                    <Route path="/tracking" element={<SuspenseWrapper><Tracking /></SuspenseWrapper>} />
                    <Route path="/delivery" element={<SuspenseWrapper><Delivery /></SuspenseWrapper>} />
                    <Route path="/scanners" element={<SuspenseWrapper><Scanners /></SuspenseWrapper>} />
                    <Route path="/feedback" element={<SuspenseWrapper><Feedback /></SuspenseWrapper>} />
                    <Route path="/careers" element={<SuspenseWrapper><Careers /></SuspenseWrapper>} />
                    
                    {/* Legal pages */}
                    <Route path="/privacy-policy" element={<SuspenseWrapper><PrivacyPolicy /></SuspenseWrapper>} />
                    <Route path="/terms-of-service" element={<SuspenseWrapper><TermsOfService /></SuspenseWrapper>} />
                    <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
                    <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                    
                    {/* Auth required only for sensitive actions */}
                    <Route path="/portal" element={
                      <AuthRequired>
                        <SuspenseWrapper><BuilderPortal /></SuspenseWrapper>
                      </AuthRequired>
                    } />
                    <Route path="/builder-registration" element={
                      <AuthRequired>
                        <SuspenseWrapper><BuilderRegistration /></SuspenseWrapper>
                      </AuthRequired>
                    } />
                    {/* Registration pages - NO auth required (new users registering) */}
                    <Route path="/builders/register" element={<SuspenseWrapper><BuilderRegistration /></SuspenseWrapper>} />
                    <Route path="/professional-builder-registration" element={<SuspenseWrapper><ProfessionalBuilderRegistration /></SuspenseWrapper>} />
                    <Route path="/private-client-registration" element={<SuspenseWrapper><PrivateBuilderRegistration /></SuspenseWrapper>} />
                    {/* Alias for private-client-registration (some links use this path) */}
                    <Route path="/private-builder-registration" element={<SuspenseWrapper><PrivateBuilderRegistration /></SuspenseWrapper>} />
                    <Route path="/analytics" element={
                      <RoleProtectedRoute allowedRoles={['admin']}>
                        <SuspenseWrapper><Analytics /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/delivery/apply" element={
                      <AuthRequired>
                        <SuspenseWrapper><DeliveryProviderApplication /></SuspenseWrapper>
                      </AuthRequired>
                    } />
                    
                    {/* Sign-in Routes for specific roles */}
                    <Route path="/supplier-signin" element={<SuspenseWrapper><SupplierSignIn /></SuspenseWrapper>} />
                    <Route path="/builder-signin" element={<SuspenseWrapper><BuilderSignIn /></SuspenseWrapper>} />
                    <Route path="/delivery-signin" element={<SuspenseWrapper><DeliverySignIn /></SuspenseWrapper>} />
                    <Route path="/private-client-signin" element={<SuspenseWrapper><PrivateClientSignIn /></SuspenseWrapper>} />
                    <Route path="/professional-builder-signin" element={<SuspenseWrapper><ProfessionalBuilderSignIn /></SuspenseWrapper>} />
                    
                    {/* Redirect common URL typos (sign-in vs signin) to correct paths */}
                    <Route path="/supplier-sign-in" element={<Navigate to="/supplier-signin" replace />} />
                    <Route path="/builder-sign-in" element={<Navigate to="/builder-signin" replace />} />
                    <Route path="/delivery-sign-in" element={<Navigate to="/delivery-signin" replace />} />
                    <Route path="/private-client-sign-in" element={<Navigate to="/private-client-signin" replace />} />
                    <Route path="/professional-builder-sign-in" element={<Navigate to="/professional-builder-signin" replace />} />
                    
                    {/* Registration Routes */}
                    <Route path="/supplier-registration" element={<SuspenseWrapper><SupplierRegistration /></SuspenseWrapper>} />
                    <Route path="/supplier-marketplace" element={<SuspenseWrapper><Suppliers /></SuspenseWrapper>} />
                    
                    {/* Admin Route - Redirect /admin to /admin-dashboard */}
                    <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
                    
                    {/* Admin Sub-Routes - Redirect to dashboard with tab param */}
                    <Route path="/admin/pending-registrations" element={<Navigate to="/admin-dashboard?tab=registrations" replace />} />
                    <Route path="/admin/pending-products" element={<Navigate to="/admin-dashboard?tab=pending-products" replace />} />
                    <Route path="/admin/users" element={<Navigate to="/admin-dashboard?tab=users" replace />} />
                    <Route path="/admin/analytics" element={<Navigate to="/admin-dashboard?tab=analytics" replace />} />
                    
                    {/* Dashboard Routes - Protected */}
                    <Route path="/admin-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['admin']}>
                        <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    {/* Redirect /builder-dashboard to appropriate dashboard based on role */}
                    <Route path="/builder-dashboard" element={
                      <Navigate to="/professional-builder-dashboard" replace />
                    } />
                    <Route path="/supplier-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['supplier', 'admin']}>
                        <SuspenseWrapper><SupplierDashboard /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/delivery-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['delivery', 'delivery_provider', 'admin']}>
                        <SuspenseWrapper><DeliveryDashboard /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/private-client-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['private_client', 'admin']}>
                        <SuspenseWrapper><PrivateClientDashboard /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/professional-builder-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['professional_builder', 'admin']}>
                        <SuspenseWrapper><ProfessionalBuilderDashboardPage /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/delivery-receiving-scanner" element={
                      <RoleProtectedRoute allowedRoles={['delivery', 'delivery_provider', 'admin']}>
                        <SuspenseWrapper><DeliveryReceivingScanner /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    <Route path="/supplier-dispatch-scanner" element={
                      <RoleProtectedRoute allowedRoles={['supplier', 'admin']}>
                        <SuspenseWrapper><SupplierDispatchScanner /></SuspenseWrapper>
                      </RoleProtectedRoute>
                    } />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
                </EnhancedErrorBoundary>
                {/* Privacy features will be re-enabled once dependencies are resolved */}
              </BrowserRouter>
            </TooltipProvider>
            </OnboardingProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
