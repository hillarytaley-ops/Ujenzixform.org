import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ShoppingBag, FileText, Package, Store, Database, Users, Receipt, QrCode, Truck, Shield } from "lucide-react";
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
import { QuoteRequestModal } from "@/components/modals/QuoteRequestModal";
import { SupplierCatalogModal } from "@/components/modals/SupplierCatalogModal";
import PurchasingWorkflow from "@/components/PurchasingWorkflow";
import { Card, CardContent } from "@/components/ui/card";
import { RealTimeStats } from "@/components/suppliers/RealTimeStats";
import { SecurityAlert } from "@/components/security/SecurityAlert";
import { AdminAccessGuard } from "@/components/security/AdminAccessGuard";
import { Badge } from "@/components/ui/badge";
import { SupplierWorkflowDashboard } from "@/components/suppliers/SupplierWorkflowDashboard";
import { SupplierApplicationManager } from "@/components/suppliers/SupplierApplicationManager";
import { SupplierOrderTracker } from "@/components/suppliers/SupplierOrderTracker";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { Supplier } from "@/types/supplier";
import { useToast } from "@/hooks/use-toast";
import { ModalProvider, useModal } from "@/contexts/ModalContext";

const SuppliersContent = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("suppliers");
  const [hasError, setHasError] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Add error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Suppliers page error:', error);
      setRenderError(error.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading suppliers directory...</p>
        </div>
      </div>
    );
  }

  // Public Access: Everyone can view supplier materials and directory
  const showDirectoryAccess = true; // Changed from isAdmin to make public
  const showRegistrationOnly = !loading && user && !isAdmin;

  // Wrap entire render in try-catch for mobile safety
  try {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

      {/* Kenyan-Themed Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section className="text-white py-20 relative overflow-hidden">
        {/* Construction Site Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&h=1080&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/70 to-gray-800/70"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-6">
            <span className="text-2xl mb-2 block">🇰🇪</span>
            <p className="text-lg text-gray-200 mb-2">Karibu - Welcome to Kenya's Premier</p>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              UjenziPro
            </span>
            <br />
            <span className="text-3xl md:text-4xl text-blue-400">
              Suppliers Marketplace
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
            <strong>Your Construction Materials Hub:</strong> Browse verified suppliers, explore product catalogs with images, 
            compare prices and quality, request quotes instantly, place bulk orders, arrange delivery across Kenya, 
            track material shipments, verify authenticity with QR codes, and build lasting business relationships 
            with trusted suppliers from Mombasa to Eldoret.
          </p>

          {/* Action Buttons - Always Visible */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button 
              size="lg"
              onClick={() => setActiveTab("suppliers")}
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Suppliers
            </Button>
            
            <Button 
              size="lg"
              onClick={() => user ? setActiveTab("register") : window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <Store className="h-5 w-5 mr-2" />
              Register as Supplier
            </Button>
            
            <Button 
              size="lg"
              onClick={() => setActiveTab("purchase")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Purchase Materials
            </Button>
          </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto">
              <TabsList className={`grid w-full bg-black/40 backdrop-blur-sm border-2 border-gray-400/30 rounded-2xl p-2 ${
                userRole === 'supplier' ? 'grid-cols-7' : 
                isAdmin ? 'grid-cols-3' : 
                showRegistrationOnly ? 'grid-cols-1' : 
                'grid-cols-2'
              }`}>
                {(showDirectoryAccess || !user) && (
                  <TabsTrigger value="suppliers" className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white font-medium rounded-xl transition-all duration-300">
                    <Building className="h-4 w-4" />
                    Suppliers
                  </TabsTrigger>
                )}
                {showRegistrationOnly && (
                  <TabsTrigger value="register" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium rounded-xl transition-all duration-300">
                    <Store className="h-4 w-4" />
                    Register as Supplier
                  </TabsTrigger>
                )}
                {(showDirectoryAccess || !user) && (
                  <TabsTrigger value="purchase" className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white font-medium rounded-all duration-300">
                    <ShoppingBag className="h-4 w-4" />
                    Purchase
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
      </AnimatedSection>

        <main className="container mx-auto px-4 py-8 bg-gradient-to-b from-gray-50/30 to-white min-h-screen">
          {/* Enhanced Kenyan-Styled Security Notice - Admin Only */}
          {isAdmin && (
            <React.Suspense fallback={<div className="h-20"></div>}>
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
            </React.Suspense>
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
                <React.Suspense fallback={
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading applications...</p>
                    </CardContent>
                  </Card>
                }>
                  <SupplierApplicationManager />
                </React.Suspense>
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
                  {/* Materials Marketplace - Show products instead of supplier cards */}
                  {isAdmin ? (
                    // Simpler view for admins on mobile to prevent crashes
                    <Card>
                      <CardHeader>
                        <CardTitle>Admin Materials View</CardTitle>
                        <CardDescription>
                          Viewing materials marketplace as administrator
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <React.Suspense fallback={
                          <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading materials...</p>
                          </div>
                        }>
                          <MaterialsGrid />
                        </React.Suspense>
                      </CardContent>
                    </Card>
                  ) : (
                    <React.Suspense fallback={
                      <Card>
                        <CardContent className="p-12 text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading materials marketplace...</p>
                        </CardContent>
                      </Card>
                    }>
                      <MaterialsGrid />
                    </React.Suspense>
                  )}
                  
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
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold mb-4">Purchase Materials</h2>
                  <p className="text-gray-700 mb-6">
                    Create purchase orders and manage your material procurement
                  </p>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Sign in to access the full purchasing system and create orders with suppliers.
                    </p>
                    <Link to="/auth">
                      <Button className="bg-primary hover:bg-primary/90">
                        Sign In to Create Purchase Orders
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
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

      {/* Real-time Stats Section */}
      <RealTimeStats />

      <Footer />
    </div>
    );
  } catch (error) {
    console.error('Critical render error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">⚠️ Error</h1>
          <p className="text-gray-700 mb-6">
            The page failed to load. This might be a mobile compatibility issue.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full mb-3">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    );
  }
};

const Suppliers = () => {
  return (
    <ModalProvider>
      <SuppliersContent />
    </ModalProvider>
  );
};

export default Suppliers;
