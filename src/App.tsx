import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
// import { PrivacyPolicyBanner } from "@/components/PrivacyPolicyBanner";
// import { DataPrivacyService } from "@/services/DataPrivacyService";
// import { SecurityAudit } from "@/utils/SecurityAudit";

// Direct imports - NO lazy loading for instant page loads on all devices (especially iPhone)
import Index from "./pages/Index";
import Builders from "./pages/Builders";
import BuilderRegistration from "./pages/BuilderRegistration";
import ProfessionalBuilderRegistration from "./pages/ProfessionalBuilderRegistration";
import PrivateBuilderRegistration from "./pages/PrivateBuilderRegistration";
import SuppliersIPhone from "./pages/SuppliersIPhone";
import SuppliersMobileOptimized from "./pages/SuppliersMobileOptimized";
import BuilderPortal from "./pages/BuilderPortal";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import ResetPassword from "./pages/ResetPassword";
import Feedback from "./pages/Feedback";
import Careers from "./pages/Careers";
import Tracking from "./pages/Tracking";
import Monitoring from "./pages/Monitoring";
import Delivery from "./pages/Delivery";
import Scanners from "./pages/Scanners";
import Analytics from "./pages/Analytics";
import DeliveryProviderApplication from "./pages/DeliveryProviderApplication";
import NotFound from "./pages/NotFound";

// Dashboard imports
import AdminDashboard from "./pages/AdminDashboard";
import BuilderDashboard from "./pages/BuilderDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";

// Additional pages
import SupplierRegistration from "./pages/SupplierRegistration";
import SupplierMarketplace from "./pages/SupplierMarketplace";
import SupplierSignIn from "./pages/SupplierSignIn";
import BuilderSignIn from "./pages/BuilderSignIn";
import DeliverySignIn from "./pages/DeliverySignIn";
import DeliveryReceivingScanner from "./pages/DeliveryReceivingScanner";
import SupplierDispatchScanner from "./pages/SupplierDispatchScanner";

// New Sign-in pages for Private Clients and Professional Builders
import PrivateClientSignIn from "./pages/PrivateClientSignIn";
import ProfessionalBuilderSignIn from "./pages/ProfessionalBuilderSignIn";
import PrivateClientDashboard from "./pages/PrivateClientDashboard";
import ProfessionalBuilderDashboardPage from "./pages/ProfessionalBuilderDashboard";

// Auth Guard
import { AuthRequired } from "@/components/security/AuthRequired";
import { RoleProtectedRoute } from "@/components/security/RoleProtectedRoute";
import { Navigate, useSearchParams } from "react-router-dom";

// AI Chatbot with Live Staff Support
import { AIConstructionChatbot } from "@/components/chat/AIConstructionChatbot";
import { SimpleChatButton } from "@/components/chat/SimpleChatButton";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";

// Floating Social Media Button
import { FloatingSocialSidebar } from "@/components/FloatingSocialSidebar";

// Optimized loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-destructive mb-4">Oops! Something went wrong</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  </div>
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

const App = () => {
  const [user, setUser] = React.useState<any>(null);
  const [showChat, setShowChat] = React.useState(false);

  React.useEffect(() => {
    const conn: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    const isLowData = !!conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g');

    // Get current user for chatbot (deferred, longer delay on low-data)
    const timer = setTimeout(() => {
      if (isLowData) return;
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data }) => {
          setUser(data.user);
        });
      });
    }, isLowData ? 4000 : 1000);

    // Load chat widget after page is interactive (skip on low-data)
    const chatTimer = setTimeout(() => {
      if (!isLowData) setShowChat(true);
    }, isLowData ? 6000 : 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(chatTimer);
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                {/* Live Chat Widget - AI + Human Staff Support */}
                {showChat && (
                  <LiveChatWidget 
                    userId={user?.id}
                    userName={user?.email?.split('@')[0] || 'Guest'}
                    userEmail={user?.email}
                  />
                )}
                
                {/* Floating Social Media Button - Global, hides on auth pages */}
                {showChat && <FloatingSocialSidebar />}
                
                <Routes>
                    {/* Public Routes - Accessible to everyone after single sign in */}
                    <Route path="/" element={<Auth />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin-login" element={<AdminAuth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    
                    {/* All pages accessible after sign in - no repeated auth required */}
                    <Route path="/home" element={<Index />} />
                    <Route path="/suppliers" element={<SuppliersMobileOptimized />} />
                    <Route path="/suppliers-mobile" element={<SuppliersMobileOptimized />} />
                    <Route path="/builders" element={<Builders />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/monitoring" element={<Monitoring />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/delivery" element={<Delivery />} />
                    <Route path="/scanners" element={<Scanners />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/careers" element={<Careers />} />
                    
                    {/* Auth required only for sensitive actions */}
                    <Route path="/portal" element={
                      <AuthRequired>
                        <BuilderPortal />
                      </AuthRequired>
                    } />
                    <Route path="/builder-registration" element={
                      <AuthRequired>
                        <BuilderRegistration />
                      </AuthRequired>
                    } />
                    <Route path="/builders/register" element={
                      <AuthRequired>
                        <BuilderRegistration />
                      </AuthRequired>
                    } />
                    <Route path="/professional-builder-registration" element={
                      <AuthRequired>
                        <ProfessionalBuilderRegistration />
                      </AuthRequired>
                    } />
                    <Route path="/private-client-registration" element={
                      <AuthRequired>
                        <PrivateBuilderRegistration />
                      </AuthRequired>
                    } />
                    <Route path="/analytics" element={
                      <AuthRequired>
                        <Analytics />
                      </AuthRequired>
                    } />
                    <Route path="/delivery/apply" element={
                      <AuthRequired>
                        <DeliveryProviderApplication />
                      </AuthRequired>
                    } />
                    
                    {/* Sign-in Routes for specific roles */}
                    <Route path="/supplier-signin" element={<SupplierSignIn />} />
                    <Route path="/builder-signin" element={<BuilderSignIn />} />
                    <Route path="/delivery-signin" element={<DeliverySignIn />} />
                    <Route path="/private-client-signin" element={<PrivateClientSignIn />} />
                    <Route path="/professional-builder-signin" element={<ProfessionalBuilderSignIn />} />
                    
                    {/* Registration Routes */}
                    <Route path="/supplier-registration" element={<SupplierRegistration />} />
                    <Route path="/supplier-marketplace" element={<SupplierMarketplace />} />
                    
                    {/* Admin Sub-Routes - Redirect to dashboard with tab param */}
                    <Route path="/admin/pending-registrations" element={<Navigate to="/admin-dashboard?tab=registrations" replace />} />
                    <Route path="/admin/pending-products" element={<Navigate to="/admin-dashboard?tab=pending-products" replace />} />
                    <Route path="/admin/users" element={<Navigate to="/admin-dashboard?tab=users" replace />} />
                    <Route path="/admin/analytics" element={<Navigate to="/admin-dashboard?tab=analytics" replace />} />
                    
                    {/* Dashboard Routes - Protected */}
                    <Route path="/admin-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/builder-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['builder', 'professional_builder', 'private_client', 'admin']}>
                        <BuilderDashboard />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/supplier-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['supplier', 'admin']}>
                        <SupplierDashboard />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/delivery-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['delivery', 'delivery_provider', 'admin']}>
                        <DeliveryDashboard />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/private-client-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['private_client', 'admin']}>
                        <PrivateClientDashboard />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/professional-builder-dashboard" element={
                      <RoleProtectedRoute allowedRoles={['professional_builder', 'admin']}>
                        <ProfessionalBuilderDashboardPage />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/delivery-receiving-scanner" element={
                      <RoleProtectedRoute allowedRoles={['delivery', 'delivery_provider', 'admin']}>
                        <DeliveryReceivingScanner />
                      </RoleProtectedRoute>
                    } />
                    <Route path="/supplier-dispatch-scanner" element={
                      <RoleProtectedRoute allowedRoles={['supplier', 'admin']}>
                        <SupplierDispatchScanner />
                      </RoleProtectedRoute>
                    } />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
                {/* Privacy features will be re-enabled once dependencies are resolved */}
              </BrowserRouter>
            </TooltipProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;