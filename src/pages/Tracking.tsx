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
          {/* Kenyan GPS Tracking & Logistics Background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed'
            }}
            role="img"
            aria-label="Professional Kenyan construction site with GPS tracking technology and delivery vehicles for real-time material tracking and logistics management"
          />
          
          {/* Kenyan flag colors overlay with tracking theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-green-900/70 to-red-900/70"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 flex justify-center">
                <Badge className="bg-gradient-to-r from-green-600 to-red-600 text-white px-8 py-3 text-xl font-bold border border-white/30 shadow-lg">
                  🇰🇪 Military-Grade GPS Tracking System
                </Badge>
              </div>
              
              <h1 id="tracking-hero-heading" className="text-6xl md:text-8xl font-bold mb-8 text-white drop-shadow-2xl flex items-center justify-center gap-4">
                <Package className="h-16 w-16 md:h-20 md:w-20 text-primary" />
                Delivery Tracking
              </h1>
              
              <p className="text-2xl md:text-4xl mb-12 text-white/90 font-medium drop-shadow-lg leading-relaxed">
                Monitor and manage deliveries with military-grade real-time tracking 
                and advanced privacy protection across Kenya
              </p>
              
              {/* Tracking Technology Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-4xl font-bold text-green-400 mb-2">Real-Time</div>
                  <div className="text-white font-medium">GPS Tracking</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-4xl font-bold text-blue-400 mb-2">Military</div>
                  <div className="text-white font-medium">Grade Security</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">Driver</div>
                  <div className="text-white font-medium">Safety Priority</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-4xl font-bold text-red-400 mb-2">24/7</div>
                  <div className="text-white font-medium">Monitoring</div>
                </div>
              </div>
              
              {/* Tracking Features Highlight */}
              <div className="flex flex-wrap justify-center gap-4 text-white/90">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Eye className="h-5 w-5" />
                  <span className="font-medium">Authorized Access</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Privacy Protected</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Secure Tracking</span>
                </div>
              </div>
            </div>
          </div>
          </section>
        </AnimatedSection>

        <main className="flex-1 py-20 relative overflow-hidden">
          {/* Kenyan Construction Logistics Background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed'
            }}
            role="img"
            aria-label="Kenyan delivery trucks and logistics vehicles with GPS tracking systems transporting construction materials across Kenya"
          />
          
          {/* Light overlay for tracking interface readability */}
          <div className="absolute inset-0 bg-white/92 backdrop-blur-[1px]"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection animation="fadeInUp">
              <header className="text-center mb-12">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/50 shadow-2xl max-w-4xl mx-auto">
                <h2 className="text-5xl font-bold mb-6 text-gray-900 flex items-center justify-center gap-3">
                  <Package className="h-12 w-12 text-primary" />
                  Advanced Delivery Tracking
                </h2>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  Monitor and manage deliveries with military-grade real-time tracking and advanced privacy protection
                </p>

                <div className="flex justify-center gap-4 mb-6">
                  <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 text-lg font-semibold">
                    <Eye className="h-4 w-4 mr-2" />
                    Authorized Access
                  </Badge>
                  {userRole && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-red-500 text-white px-4 py-2 text-lg font-semibold">
                      {userRole === 'guest' ? 'Guest Access' : `${userRole} Dashboard`}
                    </Badge>
                  )}
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Secure Tracking:</strong> All delivery tracking data is protected with military-grade security. 
                    Location information and sensitive details are only visible to authorized personnel based on your role.
                  </AlertDescription>
                </Alert>
              </div>
              </header>
            </AnimatedSection>

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