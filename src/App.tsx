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
const Suppliers = lazy(() => import("./pages/Suppliers"));
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

// Optimized QueryClient with faster settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
    },
  },
});

const App = () => {
  // Temporarily simplified to get the app running
  // useEffect(() => {
  //   // Initialize privacy service
  //   DataPrivacyService.initializePrivacySettings();
  //   return () => {
  //     DataPrivacyService.cleanupPrivacySettings();
  //   };
  // }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin-login" element={<AdminAuth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    
                    {/* All other routes require authentication */}
                    <Route path="/*" element={
                      <AuthRequired>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/builders" element={<Builders />} />
                          <Route path="/builder-registration" element={<BuilderRegistration />} />
                          <Route path="/builders/register" element={<BuilderRegistration />} />
                          <Route path="/professional-builder-registration" element={<ProfessionalBuilderRegistration />} />
                          <Route path="/private-client-registration" element={<PrivateBuilderRegistration />} />
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/feedback" element={<Feedback />} />
                          <Route path="/tracking" element={<Tracking />} />
                          <Route path="/monitoring" element={<Monitoring />} />
                          <Route path="/delivery" element={<Delivery />} />
                          <Route path="/scanners" element={<Scanners />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/delivery/apply" element={<DeliveryProviderApplication />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AuthRequired>
                    } />
                  </Routes>
                </Suspense>
                {/* Privacy features will be re-enabled once dependencies are resolved */}
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;