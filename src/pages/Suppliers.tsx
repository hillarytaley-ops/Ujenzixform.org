import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ShoppingBag, FileText, Package, Store, Database, Users, Receipt, QrCode, Truck, Shield, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import SupplierRegistrationForm from "@/components/SupplierRegistrationForm";
import QRCodeManager from "@/components/QRCodeManager";
import DeliveryNoteForm from "@/components/DeliveryNoteForm";
import SupplierPurchaseOrderManager from "@/components/suppliers/SupplierPurchaseOrderManager";
import GoodsReceivedNoteViewer from "@/components/suppliers/GoodsReceivedNoteViewer";
import SupplierInvoiceViewer from "@/components/suppliers/SupplierInvoiceViewer";
import QRScanner from "@/components/QRScanner";
import { SupplierGrid } from "@/components/suppliers/SupplierGrid";
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";
import { MaterialsGridSafe } from "@/components/suppliers/MaterialsGridSafe";
import { QuoteRequestModal } from "@/components/modals/QuoteRequestModal";
import { SupplierCatalogModal } from "@/components/modals/SupplierCatalogModal";
import PurchasingWorkflow from "@/components/PurchasingWorkflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
const RealTimeStatsLazy = React.lazy(() =>
  import("@/components/suppliers/RealTimeStats")
    .then(m => ({ default: m.RealTimeStats }))
    .catch(() => ({ default: () => null }))
);
import { SecurityAlert } from "@/components/security/SecurityAlert";
import { AdminAccessGuard } from "@/components/security/AdminAccessGuard";
import { Badge } from "@/components/ui/badge";
import { SupplierWorkflowDashboard } from "@/components/suppliers/SupplierWorkflowDashboard";
import { SupplierApplicationManager } from "@/components/suppliers/SupplierApplicationManager";
import { SupplierOrderTracker } from "@/components/suppliers/SupplierOrderTracker";
import { supabase } from '@/integrations/supabase/client';
import { Supplier } from "@/types/supplier";
import { useToast } from "@/hooks/use-toast";
import { ModalProvider, useModal } from "@/contexts/ModalContext";
import { LoginPortal } from "@/components/LoginPortal";
import { PurchaseOrderWizard } from "@/components/suppliers/PurchaseOrderWizard";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const SuppliersContent = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "suppliers");
  const [hasError, setHasError] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const { toast } = useToast();
  const isiOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const conn: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const isLowData = !!conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g');
  const [showStats, setShowStats] = useState(false);

  const navigate = useNavigate();

  // Disabled mobile redirect - keeping full version for all users
  // useEffect(() => {
  //   const full = searchParams.get("full");
  //   if (full !== "1") {
  //     navigate("/suppliers-mobile", { replace: true });
  //   }
  // }, []);

  

  useEffect(() => {
    if (!isiOS && !isLowData) {
      const t = setTimeout(() => setShowStats(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isiOS, isLowData]);
  const { 
    modals, 
    openQuoteModal, 
    openCatalogModal, 
    openRegistrationModal,
    closeQuoteModal,
    closeCatalogModal,
    closeRegistrationModal
  } = useModal();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        const userRole = (roleData?.role as any) || 'builder';
        setUserRole(userRole);
        setIsAdmin(roleData?.role === 'admin');
        
        // Set default tab based on role
        if (roleData?.role === 'supplier') {
          setActiveTab("workflow");
        } else if (roleData?.role === 'admin') {
          setActiveTab("suppliers");
        } else {
          setActiveTab("suppliers"); // Changed from register to suppliers for public viewing
        }
      } else {
        // No authenticated user, set default values to allow page viewing
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
        setActiveTab("suppliers");
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't show error toast, just set defaults to allow page viewing
      setUser(null);
      setUserRole(null);
      setIsAdmin(false);
      setActiveTab("suppliers");
      setHasError(false); // Don't treat auth error as page error
    } finally {
      setLoading(false);
    }
  };

  // Safe error boundary handler
  if (hasError || renderError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-600">⚠️ Page Error</h1>
            <p className="text-gray-700 mb-4">
              Sorry, something went wrong loading the suppliers page.
            </p>
            {renderError && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-left">
                <p className="text-sm text-red-800 font-mono">
                  Error: {renderError.message}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Button onClick={() => {
                setHasError(false);
                setRenderError(null);
                window.location.reload();
              }} className="bg-primary w-full">
                Reload Page
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'} 
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSupplierSelect = (supplier: Supplier) => {
    openCatalogModal(supplier);
  };

  const handleQuoteRequest = (supplier: Supplier) => {
    openQuoteModal(supplier);
  };

  const handleShowRegistration = () => {
    openRegistrationModal();
  };

  

  // Public Access: Everyone can view supplier materials and directory
  const showDirectoryAccess = true; // Changed from isAdmin to make public
  const showRegistrationOnly = !loading && user && !isAdmin;

  // REMOVED: Mobile admin restriction - Full admin access on all devices now!

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-4 mt-20">
          <h2 className="text-xl font-semibold mb-4">Materials Marketplace</h2>
          <MaterialsGridSafe />
        </div>
      </div>
    }>
      <div className="min-h-screen bg-background">
        <Navigation />

        {/* Kenyan-Themed Hero Section - iPhone Fixed */}
        <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white py-16 sm:py-20 relative overflow-hidden">
        {/* Solid gradient background - always visible on iPhone */}
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-4 sm:mb-6">
            <span className="text-3xl sm:text-4xl mb-2 block">🇰🇪</span>
            <p className="text-base sm:text-lg text-white font-semibold mb-2 drop-shadow-lg">Karibu - Welcome to Kenya's Premier</p>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight px-2 drop-shadow-2xl">
            <span className="text-white drop-shadow-2xl">
              UjenziPro
            </span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-yellow-400 drop-shadow-2xl">
              Suppliers Marketplace
            </span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white max-w-4xl mx-auto leading-relaxed px-4 font-medium drop-shadow-lg">
            <strong className="text-yellow-400">Your Construction Materials Hub:</strong> Browse verified suppliers, explore product catalogs, 
            compare prices, request quotes, place orders, arrange delivery across Kenya, 
            track shipments, and verify quality with QR codes.
          </p>

          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center mb-6 md:mb-8 px-4">
            <Button 
              size="lg"
              onClick={() => setActiveTab("suppliers")}
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Browse Suppliers</span>
            </Button>
            
            <Button 
              size="lg"
              onClick={() => user ? setActiveTab("register") : window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <Store className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Register as Supplier</span>
            </Button>
            
            <Button 
              size="lg"
              onClick={() => setActiveTab("purchase")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl w-full sm:w-auto"
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="whitespace-nowrap">Purchase Materials</span>
            </Button>
          </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto px-2">
              <TabsList className={`grid w-full bg-black/40 backdrop-blur-sm border-2 border-gray-400/30 rounded-xl md:rounded-2xl p-1 md:p-2 gap-1 md:gap-0 text-xs sm:text-sm ${
                userRole === 'supplier' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-7' : 
                isAdmin ? 'grid-cols-2 sm:grid-cols-3' : 
                showRegistrationOnly ? 'grid-cols-1' : 
                'grid-cols-2'
              }`}>
                {(showDirectoryAccess || !user) && (
                  <TabsTrigger value="suppliers" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white font-medium rounded-lg md:rounded-xl transition-all duration-300 px-2 py-2">
                    <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Suppliers</span>
                    <span className="sm:hidden">Supply</span>
                  </TabsTrigger>
                )}
                {showRegistrationOnly && (
                  <TabsTrigger value="register" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium rounded-lg md:rounded-xl transition-all duration-300 px-2 py-2">
                    <Store className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Register as Supplier</span>
                    <span className="sm:hidden">Register</span>
                  </TabsTrigger>
                )}
                {(showDirectoryAccess || !user) && (
                  <TabsTrigger value="purchase" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white font-medium rounded-lg md:rounded-xl transition-all duration-300 px-2 py-2">
                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Purchase</span>
                    <span className="sm:hidden">Buy</span>
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger value="registered-users" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Registered Users
                  </TabsTrigger>
                )}
                {userRole === 'supplier' && (
                  <>
                    <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Purchase Orders
                    </TabsTrigger>
                    <TabsTrigger value="qr-codes" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      QR Codes
                    </TabsTrigger>
                    <TabsTrigger value="qr-scanner" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Scanner
                    </TabsTrigger>
                    <TabsTrigger value="delivery-notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Delivery Notes
                    </TabsTrigger>
                    <TabsTrigger value="grn-viewer" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      GRN Viewer
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Invoices
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </Tabs>
          </div>
         </section>

        <main className="w-full px-4 md:px-6 lg:px-8 py-8 bg-gradient-to-b from-gray-50/30 to-white min-h-screen">
          {/* Enhanced Kenyan-Styled Security Notice - Admin Only */}
          {/* iPhone/Safari Compatible - NO React.Suspense */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 border-2 border-gray-400 rounded-2xl p-6 mb-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-blue-600 p-3 rounded-full">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent mb-2">
                    🇰🇪 Admin Dashboard
                  </h3>
                  <p className="text-gray-700 text-sm mb-4">
                    You have full access to supplier data, applications, and analytics.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      ✅ Admin Access
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      📊 Full Data Access
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Kenyan-Themed Registration Tab for Non-Admin Users */}
          {showRegistrationOnly && (
            <TabsContent value="register" className="space-y-8">
              <div className="bg-gradient-to-br from-gray-50 via-white to-blue-50 border-3 border-gray-300 rounded-2xl p-8 mb-8 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mb-4 shadow-lg">
                    <Store className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent mb-3">
                    🇰🇪 Jiunge na UjenziPro
                  </h3>
                  <p className="text-xl text-green-800 mb-2">Register as a Kenyan Supplier</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-green-200">
                  <p className="text-green-700 text-lg mb-4 text-center">
                    <strong>Karibu!</strong> Join Kenya's fastest-growing construction materials marketplace. 
                    Connect with builders and contractors from Mombasa to Kisumu, Nairobi to Eldoret.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-3xl mb-2">🚀</div>
                      <h4 className="font-bold text-green-800 mb-1">Bure Kabisa</h4>
                      <p className="text-sm text-green-600">Free Registration</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="text-3xl mb-2">✅</div>
                      <h4 className="font-bold text-red-800 mb-1">Mtandao Salama</h4>
                      <p className="text-sm text-red-600">Verified Network</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <div className="text-3xl mb-2">📈</div>
                      <h4 className="font-bold text-yellow-800 mb-1">Kua Biashara</h4>
                      <p className="text-sm text-yellow-600">Grow Business</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-green-600 font-semibold text-lg">
                    🌍 Serving all 47 Counties • 🤝 Trusted by 1000+ Builders • 📞 24/7 Support
                  </p>
                </div>
              </div>
              <SupplierRegistrationForm />
            </TabsContent>
          )}

          {userRole === 'supplier' && (
            <>
              <TabsContent value="workflow" className="space-y-8">
                <SupplierWorkflowDashboard />
              </TabsContent>
              
              <TabsContent value="orders" className="space-y-8">
                <SupplierOrderTracker />
              </TabsContent>
              
              <TabsContent value="purchase-orders" className="space-y-8">
                <SupplierPurchaseOrderManager />
              </TabsContent>
              
              <TabsContent value="qr-codes" className="space-y-8">
                <QRCodeManager />
              </TabsContent>
              
              <TabsContent value="qr-scanner" className="space-y-8">
                <QRScanner onMaterialScanned={(material) => {
                  console.log('Material scanned:', material);
                }} />
              </TabsContent>
              
              <TabsContent value="delivery-notes" className="space-y-8">
                <DeliveryNoteForm />
              </TabsContent>
              
              <TabsContent value="grn-viewer" className="space-y-8">
                <GoodsReceivedNoteViewer />
              </TabsContent>
              
              <TabsContent value="invoices" className="space-y-8">
                <SupplierInvoiceViewer />
              </TabsContent>
            </>
          )}

          {isAdmin && (
            <>
              <TabsContent value="applications" className="space-y-8">
                {/* iPhone/Safari Compatible - NO React.Suspense */}
                <SupplierApplicationManager />
              </TabsContent>
              
              <TabsContent value="registered-users" className="space-y-8">
                <Card className="bg-white rounded-lg shadow-lg">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-2xl font-bold mb-4">Registered Users Management</h3>
                    <p className="text-lg mb-6 text-muted-foreground">Admin view of all registered builders and suppliers</p>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Admin Dashboard - Coming Soon
                    </Badge>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
          
          {!userRole && (
            <TabsContent value="apply" className="space-y-8">
              <SupplierApplicationManager />
            </TabsContent>
          )}
          
          {(showDirectoryAccess || !user) && (
            <TabsContent value="suppliers" className="space-y-8">
              {modals.registrationModal.isOpen ? (
                <SupplierRegistrationForm />
              ) : (
                <div className="space-y-6">
                  {/* Login Portal for Suppliers - Only show if not logged in */}
                  {!user && (
                    <LoginPortal 
                      type="supplier"
                    />
                  )}

                  {/* Materials Marketplace - Show products instead of supplier cards */}
                  {/* iPhone/Safari Compatible - Uses safe version on mobile */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{isAdmin ? 'Admin Materials View' : 'Materials Marketplace'}</CardTitle>
                      <CardDescription>
                        {isAdmin ? 'Viewing materials marketplace as administrator' : 'Browse construction materials from verified suppliers'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MaterialsGridSafe />
                    </CardContent>
                  </Card>
                  
                  {/* Optional: Link to view suppliers list */}
                  <Card className="bg-blue-50/50 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Want to see supplier profiles instead of products?
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: 'Supplier Directory',
                            description: 'Supplier profiles view - coming soon! Currently showing materials catalog.'
                          });
                        }}
                      >
                        <Store className="h-4 w-4 mr-2" />
                        View Supplier Profiles
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}

          {(showDirectoryAccess || !user) && (
            <TabsContent value="purchase" className="space-y-8">
              {user ? (
                /* Logged in users see the purchase wizard */
                <PurchaseOrderWizard 
                  userId={user.id}
                  onComplete={() => {
                    toast({
                      title: 'Order submitted successfully!',
                      description: 'Suppliers will send you quotes soon.',
                    });
                    setActiveTab('suppliers');
                  }}
                />
              ) : (
                /* Not logged in - show sign in prompt */
                <div className="max-w-4xl mx-auto">
                  <Card className="shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-orange-600" />
                        Create Purchase Order
                      </CardTitle>
                      <CardDescription className="text-base">
                        Sign in to browse materials, select items, and create purchase orders
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <Alert className="bg-blue-50 border-blue-200">
                        <Package className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-800">
                          <strong>After signing in, you'll be able to:</strong>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Browse 850+ verified suppliers</li>
                            <li>Select materials and add to cart</li>
                            <li>Choose quantities</li>
                            <li>Create purchase orders</li>
                            <li>Receive competitive quotes</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <Link to={`/auth?redirect=${encodeURIComponent('/suppliers?tab=purchase')}`}>
                        <Button className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg">
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          Sign In to Start Shopping
                        </Button>
                      </Link>

                      <p className="text-xs text-center text-gray-500">
                        Don't have an account? You'll be able to create one after clicking above.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Quote Request Modal */}
      {modals.quoteModal.supplier && (
        <QuoteRequestModal
          supplier={modals.quoteModal.supplier}
          isOpen={modals.quoteModal.isOpen}
          onClose={closeQuoteModal}
        />
      )}

      {/* Catalog Modal */}
      {modals.catalogModal.supplier && (
        <SupplierCatalogModal
          supplier={modals.catalogModal.supplier}
          isOpen={modals.catalogModal.isOpen}
          onClose={closeCatalogModal}
          onRequestQuote={handleQuoteRequest}
        />
      )}

      {/* Real-time stats disabled for stability */}

        <Footer />
      </div>
      </ErrorBoundary>
  );
};

const Suppliers = () => {
  return (
    <ModalProvider>
      <SuppliersContent />
    </ModalProvider>
  );
};

export default Suppliers;
