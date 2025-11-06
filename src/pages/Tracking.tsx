import React, { useState, useEffect, memo, lazy, Suspense } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { DeliveryAccessGuard } from '@/components/security/DeliveryAccessGuard';
import { Package, Eye, Video, MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';
import AnimatedSection from "@/components/AnimatedSection";

// Lazy load delivery tracking components
const DeliveryTracker = lazy(() => import('@/components/DeliveryTracker'));
const DeliveryTable = lazy(() => import('@/components/delivery/DeliveryTable'));
const DeliveryStats = lazy(() => import('@/components/delivery/DeliveryStats'));
const AppTrackingMonitor = lazy(async () => {
  const module = await import('@/components/security/AppTrackingMonitor');
  return { default: module.AppTrackingMonitor };
});

// Lightweight loading fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary"></div>
  </div>
);

const Tracking = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const { toast } = useToast();


  const handleStatusUpdate = (deliveryId: string, newStatus: string) => {
    console.log("Status update:", deliveryId, newStatus);
  };

  const handleViewDetails = (delivery: any) => {
    console.log("View details:", delivery);
  };

  useEffect(() => {
    checkAuth();
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  const checkAuth = async () => {
    try {
      setError(null);
      
      // Get session more efficiently
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const user = session.user;
        setUser(user);
        
        // Get profile in background, don't block loading
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
          .then(({ data: roleData, error: roleError }) => {
            if (roleData) {
              setUserRole(roleData.role as any);
            } else {
              setUserRole('user');
            }
          });
        
        // Set default role immediately to unblock UI
        setUserRole('user');
      } else {
        setUser(null);
        setUserRole('guest');
      }
    } catch (error) {
      console.warn('Auth check error:', error);
      setUser(null);
      setUserRole('guest');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Unable to Load Dashboard</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              checkAuth();
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DeliveryAccessGuard requiredAuth={false} allowedRoles={['builder', 'supplier', 'admin', 'guest']} feature="tracking dashboard">
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        {/* Hero Section */}
        <AnimatedSection animation="fadeInUp">
          <section 
            className="text-white py-24 relative overflow-hidden"
            role="banner"
            aria-labelledby="tracking-hero-heading"
          >
          {/* GPS Map & Tracking Technology Background - Zoomed Out */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1920&h=1080&fit=crop&q=80')`,
              backgroundSize: 'contain',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              WebkitBackgroundSize: 'contain',
              MozBackgroundSize: 'contain',
              backgroundColor: '#1a202c'
            }}
            role="img"
            aria-label="Professional GPS tracking map technology for real-time delivery monitoring and location tracking across Kenya"
          />
          
          {/* Kenyan flag colors overlay with tracking theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-gray-900/70 to-gray-800/70"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-5xl mx-auto">
              <h1 id="tracking-hero-heading" className="text-6xl md:text-8xl font-bold mb-8 text-white drop-shadow-2xl flex items-center justify-center gap-4">
                <Package className="h-16 w-16 md:h-20 md:w-20 text-primary" />
                Delivery Tracking
              </h1>
            </div>
          </div>
          </section>
        </AnimatedSection>

        <main className="flex-1 py-20 relative overflow-hidden">
          {/* Clean professional gradient background - no cartoon images */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection animation="fadeInUp">

            {/* Delivery Tracking Section */}
            <AnimatedSection animation="fadeInUp" delay={200}>
              <div className="space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<ComponentLoader />}>
                  <DeliveryTracker />
                </Suspense>
              </ErrorBoundary>

              {(userRole === 'admin' || userRole === 'builder') && (
                <>
                  <ErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <DeliveryStats 
                        totalDeliveries={deliveries.length}
                        pendingDeliveries={deliveries.filter(d => d.status === 'pending').length}
                        inTransitDeliveries={deliveries.filter(d => d.status === 'in_transit').length}
                        completedDeliveries={deliveries.filter(d => d.status === 'completed').length}
                      />
                    </Suspense>
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <DeliveryTable 
                        deliveries={deliveries}
                        userRole={userRole}
                        onStatusUpdate={handleStatusUpdate}
                        onViewDetails={handleViewDetails}
                      />
                    </Suspense>
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <AppTrackingMonitor 
                        userRole={userRole} 
                        builderId={user?.id}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </>
              )}
              </div>
            </AnimatedSection>
          </div>
        </main>
        <Footer />
      </div>
    </DeliveryAccessGuard>
  );
};

export default Tracking;