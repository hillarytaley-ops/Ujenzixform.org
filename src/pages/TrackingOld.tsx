import React, { useState, useEffect, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { DeliveryAccessGuard } from '@/components/security/DeliveryAccessGuard';
import DeliveryManagement from '@/components/DeliveryManagement';
import SiteMaterialRegister from '@/components/SiteMaterialRegister';
import { Package, Truck, Shield, Eye, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DroneMonitor from '@/components/DroneMonitor';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { AppTrackingMonitor } from '@/components/security/AppTrackingMonitor';
import { CameraAccessControl } from '@/components/security/CameraAccessControl';

// Memoized components for performance
const MemoizedDeliveryManagement = memo(DeliveryManagement);
const MemoizedDroneMonitor = memo(DroneMonitor);
const MemoizedSiteMaterialRegister = memo(SiteMaterialRegister);

const Tracking = () => {
  const [activeTab, setActiveTab] = useState('delivery');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setError(null);
      
      // Check if there's an active session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session check error:', sessionError);
        // Continue without authentication - allow guest access
        setUser(null);
        setUserRole('guest');
        setLoading(false);
        return;
      }

      if (session?.user) {
        const user = session.user;
        setUser(user);
        
        // Try to get user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (roleError && roleError.code !== 'PGRST116') {
          console.warn('Role fetch error:', roleError);
          setUserRole('user'); // Default role if role fetch fails
        } else if (roleData) {
          setUserRole(roleData.role as any);
        } else {
          setUserRole('user'); // Default role if no role found
          toast({
            title: "Profile Information",
            description: "Using default access level. Complete your profile for full features.",
            variant: "default"
          });
        }
      } else {
        // No active session - allow guest access
        setUser(null);
        setUserRole('guest');
      }
    } catch (error) {
      console.warn('Auth check error:', error);
      // Allow guest access on any auth error
      setUser(null);
      setUserRole('guest');
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const tabs = ['delivery', 'drone', 'register'];
      const availableTabs = tabs.filter(tab => {
        if (tab === 'delivery') return true;
        if (tab === 'drone') return userRole === 'builder' || userRole === 'admin';
        if (tab === 'register') return userRole === 'admin';
        return false;
      });
      
      const currentIndex = availableTabs.indexOf(activeTab);
      const nextIndex = event.key === 'ArrowRight' 
        ? (currentIndex + 1) % availableTabs.length
        : (currentIndex - 1 + availableTabs.length) % availableTabs.length;
      
      setActiveTab(availableTabs[nextIndex]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center" role="status" aria-live="polite">
        <LoadingSpinner message="Loading tracking dashboard..." />
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
              aria-label="Retry loading dashboard"
            >
              Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DeliveryAccessGuard requiredAuth={false} allowedRoles={['builder', 'supplier', 'admin', 'guest']} feature="tracking dashboard">
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-gradient-construction">
          <Navigation />
          <main className="flex-1" role="main">
            <div className="container mx-auto px-4 py-8">
              {/* Enhanced Header with better accessibility */}
              <header className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2" id="main-heading">
                  <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
                  Secure Tracking & Monitoring
                </h1>
                <p className="text-lg text-muted-foreground mb-4" id="main-description">
                  Monitor deliveries and manage materials with privacy protection
                </p>

                  {/* Access Control Notice with better accessibility */}
                  <div className="flex justify-center gap-2 mb-6" role="status" aria-label="Access level information">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200" aria-label="Access status">
                      <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
                      Authorized Access
                    </Badge>
                    {userRole && (
                      <Badge variant="outline" className="capitalize" aria-label={`Current role: ${userRole}`}>
                        {userRole === 'guest' ? 'Guest Access' : `${userRole} Dashboard`}
                      </Badge>
                    )}
                  </div>

                  {/* Privacy Protection Alert with better accessibility */}
                  <Alert className="max-w-2xl mx-auto mb-6 border-blue-200 bg-blue-50" role="alert" aria-labelledby="security-notice">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription id="security-notice">
                      <strong>Secure Monitoring:</strong> All tracking data is protected. Location information 
                      and sensitive details are only visible to authorized personnel based on your role.
                    </AlertDescription>
                  </Alert>
                </header>

                {/* Enhanced Tab Navigation with keyboard support */}
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab} 
                  className="w-full"
                  onKeyDown={handleKeyDown}
                >
                  <TabsList 
                    className={`grid w-full mb-8 ${userRole === 'admin' ? 'grid-cols-3' : (userRole === 'builder') ? 'grid-cols-2' : 'grid-cols-1'}`}
                    role="tablist"
                    aria-label="Tracking dashboard sections"
                    aria-describedby="main-description"
                  >
                    <TabsTrigger 
                      value="delivery" 
                      className="flex items-center gap-2"
                      role="tab"
                      aria-controls="delivery-panel"
                      aria-selected={activeTab === 'delivery'}
                    >
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Delivery Hub
                    </TabsTrigger>
                    {(userRole === 'builder' || userRole === 'admin') && (
                      <TabsTrigger 
                        value="drone" 
                        className="flex items-center gap-2"
                        role="tab"
                        aria-controls="drone-panel"
                        aria-selected={activeTab === 'drone'}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Drone Observation
                      </TabsTrigger>
                    )}
                    {userRole === 'admin' && (
                      <TabsTrigger 
                        value="register" 
                        className="flex items-center gap-2"
                        role="tab"
                        aria-controls="register-panel"
                        aria-selected={activeTab === 'register'}
                      >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Material Register
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent 
                    value="delivery" 
                    className="space-y-6"
                    role="tabpanel"
                    id="delivery-panel"
                    aria-labelledby="delivery-tab"
                  >
                    <ErrorBoundary>
                      <MemoizedDeliveryManagement userRole={userRole} user={user} />
                    </ErrorBoundary>
                    
                    {/* App-to-App Tracking Monitor */}
                    {(userRole === 'admin' || userRole === 'builder') && (
                      <ErrorBoundary>
                        <AppTrackingMonitor 
                          userRole={userRole} 
                          builderId={user?.id}
                          className="mt-6"
                        />
                      </ErrorBoundary>
                    )}
                  </TabsContent>

                  {(userRole === 'builder' || userRole === 'admin') && (
                    <TabsContent 
                      value="drone" 
                      className="space-y-6"
                      role="tabpanel"
                      id="drone-panel"
                      aria-labelledby="drone-tab"
                    >
                      <Alert className="border-blue-200 bg-blue-50 mb-6" role="alert">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <AlertDescription>
                          <strong>Live Stream Access:</strong> Secure camera monitoring with project-specific access control. 
                          {userRole === 'admin' ? 'Full administrative access to all camera categories.' : 'Project-restricted access using your unique ID.'}
                        </AlertDescription>
                      </Alert>
                      
                      {/* Physical Camera Categories - Replaces Physical Camera item */}
                      <ErrorBoundary>
                        <CameraAccessControl 
                          userRole={userRole} 
                          userId={user?.id}
                          builderId={user?.id}
                          accessId={`builder-${user?.id?.slice(-8)}`} // Unique builder access ID
                          className="mb-6"
                        />
                      </ErrorBoundary>
                      
                      <ErrorBoundary>
                        <MemoizedDroneMonitor userRole={userRole} user={user} />
                      </ErrorBoundary>
                    </TabsContent>
                  )}

                  {userRole === 'admin' && (
                    <TabsContent 
                      value="register" 
                      className="space-y-6"
                      role="tabpanel"
                      id="register-panel"
                      aria-labelledby="register-tab"
                    >
                      <Alert className="border-amber-200 bg-amber-50 mb-6" role="alert">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        <AlertDescription>
                          <strong>Admin Feature:</strong> Material register management is restricted to administrators. 
                          All data modifications are logged for security.
                        </AlertDescription>
                      </Alert>
                      <ErrorBoundary>
                        <MemoizedSiteMaterialRegister />
                      </ErrorBoundary>
                    </TabsContent>
                  )}
                </Tabs>
            </div>
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </DeliveryAccessGuard>
  );
};

export default Tracking;