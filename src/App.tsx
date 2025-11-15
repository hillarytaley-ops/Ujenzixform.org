import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
// import { PrivacyPolicyBanner } from "@/components/PrivacyPolicyBanner";
// import { DataPrivacyService } from "@/services/DataPrivacyService";
// import { SecurityAudit } from "@/utils/SecurityAudit";

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Builders = lazy(() => import("./pages/Builders"));
const BuilderRegistration = lazy(() => import("./pages/BuilderRegistration"));
const ProfessionalBuilderRegistration = lazy(() => import("./pages/ProfessionalBuilderRegistration"));
const PrivateBuilderRegistration = lazy(() => import("./pages/PrivateBuilderRegistration"));
import Suppliers from "./pages/Suppliers";
const SuppliersIPhone = lazy(() => import("./pages/SuppliersIPhone"));
const SuppliersMobileOptimized = lazy(() => import("./pages/SuppliersMobileOptimized"));
const BuilderPortal = lazy(() => import("./pages/BuilderPortal"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Monitoring = lazy(() => import("./pages/Monitoring"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Scanners = lazy(() => import("./pages/Scanners"));
const Analytics = lazy(() => import("./pages/Analytics"));
const DeliveryProviderApplication = lazy(() => import("./pages/DeliveryProviderApplication"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth Guard
import { AuthRequired } from "@/components/security/AuthRequired";

// AI Chatbot
import { AIConstructionChatbot } from "@/components/chat/AIConstructionChatbot";
import { SimpleChatButton } from "@/components/chat/SimpleChatButton";

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
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* AI Chatbot - Deferred load for better performance */}
              {showChat && <SimpleChatButton />}
              
              <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin-login" element={<AdminAuth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/scanners" element={<Scanners />} />
                    {/* Public Home and Suppliers access */}
                    <Route path="/" element={<Index />} />
                    {/* Public Suppliers access - map directly to mobile-optimized for reliability */}
                    <Route path="/suppliers" element={<SuppliersMobileOptimized />} />
                    <Route path="/suppliers-mobile" element={<SuppliersMobileOptimized />} />
                    
                    {/* All other routes require authentication */}
                    <Route path="/*" element={
                      <AuthRequired>
                        <Routes>
                          <Route path="/builders" element={<Builders />} />
                          <Route path="/builder-registration" element={<BuilderRegistration />} />
                          <Route path="/builders/register" element={<BuilderRegistration />} />
                          <Route path="/professional-builder-registration" element={<ProfessionalBuilderRegistration />} />
                          <Route path="/private-client-registration" element={<PrivateBuilderRegistration />} />
                          <Route path="/portal" element={<BuilderPortal />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/feedback" element={<Feedback />} />
                          <Route path="/tracking" element={<Tracking />} />
                          <Route path="/monitoring" element={<Monitoring />} />
                          <Route path="/delivery" element={<Delivery />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/delivery/apply" element={<DeliveryProviderApplication />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AuthRequired>
                    } />
                </Routes>
              </Suspense>
              {/* Privacy features will be re-enabled once dependencies are resolved */}
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;