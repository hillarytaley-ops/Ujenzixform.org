import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Settings, Shield, ShoppingCart, Camera, Building2, Package, Truck, FileText, Eye, CheckCircle, Lock, Smartphone, Star, MessageCircle } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { BuilderGrid } from "@/components/builders/BuilderGrid";
import { ContactBuilderModal } from "@/components/modals/ContactBuilderModal";
import { BuilderProfileModal } from "@/components/modals/BuilderProfileModal";
import { SecurityAlert } from "@/components/security/SecurityAlert";
import SuccessStories from "@/components/builders/SuccessStories";
import QuickDashboard from "@/components/builders/QuickDashboard";
import AdvancedFilters from "@/components/builders/AdvancedFilters";
import BuilderComparison from "@/components/builders/BuilderComparison";
import BuilderMap from "@/components/builders/BuilderMap";
import ChatWidget from "@/components/builders/ChatWidget";
import { EnhancedSearch } from "@/components/builders/EnhancedSearch";
import { ReviewsSystem } from "@/components/builders/ReviewsSystem";
// import { NotificationSystem } from "@/components/builders/NotificationSystem";
// import { AnalyticsDashboard } from "@/components/builders/AnalyticsDashboardEnhanced";
import { PDFExport } from "@/components/builders/PDFExport";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { LoginPortal } from "@/components/LoginPortal";
// Builder components temporarily disabled for debugging
// import ProfessionalBuilderDashboard from "@/components/ProfessionalBuilderDashboard";
// import PrivateBuilderDirectPurchase from "@/components/PrivateBuilderDirectPurchase";
// import { MonitoringServiceRequest } from "@/components/builders/MonitoringServiceRequest";
// import { BuilderWorkflowDashboard } from "@/components/builders/BuilderWorkflowDashboard";
// import { BuilderProjectManager } from "@/components/builders/BuilderProjectManager";
// import { BuilderMaterialManager } from "@/components/builders/BuilderMaterialManager";
// import { BuilderDeliveryTracker } from "@/components/builders/BuilderDeliveryTracker";
import { UserProfile } from "@/types/userProfile";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const Builders = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<UserProfile & {
    company_name?: string;
    phone?: string;
    email?: string;
    location?: string;
  } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userRoleState, setUserRoleState] = useState<any>(null);
  const [compareBuilders, setCompareBuilders] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [chatBuilder, setChatBuilder] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userProfile.user_id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setUserRoleState(data?.role || null));
    }
  }, [userProfile]);

  const checkUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Handle missing auth session gracefully - this is expected when not logged in
      if (authError || !user) {
        console.log('No authenticated user, showing public directory');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile as UserProfile);
        
        // Get role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        setIsAdmin(!!roleData);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuilderContact = (builder: UserProfile & { company_name?: string; phone?: string; email?: string; location?: string }) => {
    setSelectedBuilder(builder);
    setShowContactModal(true);
  };

  const handleBuilderProfile = (builder: UserProfile & { company_name?: string; phone?: string; email?: string; location?: string }) => {
    setSelectedBuilder(builder);
    setShowProfileModal(true);
  };

  const handleOpenContactFromProfile = () => {
    setShowProfileModal(false);
    setShowContactModal(true);
  };

  const handleAddToComparison = (builder: any) => {
    if (compareBuilders.length >= 3) {
      toast({
        title: "Comparison Limit",
        description: "You can compare up to 3 builders at a time.",
        variant: "destructive"
      });
      return;
    }
    
    if (!compareBuilders.find(b => b.id === builder.id)) {
      setCompareBuilders(prev => [...prev, builder]);
      toast({
        title: "Builder Added",
        description: `${builder.company_name || builder.full_name} added to comparison.`,
      });
    }
  };

  const handleRemoveFromComparison = (builderId: string) => {
    setCompareBuilders(prev => prev.filter(b => b.id !== builderId));
  };

  const handleStartChat = (builder: any) => {
    setChatBuilder({
      id: builder.id,
      name: builder.company_name || builder.full_name,
      avatar: builder.avatar_url,
      isOnline: Math.random() > 0.5, // Random online status for demo
      lastSeen: '2h ago'
    });
    setShowChat(true);
  };

  const canAccessDashboard = userProfile && userRoleState === 'builder';
  const isProfessionalBuilder = userProfile && userRoleState === 'builder' && 
    (userProfile.is_professional || userProfile.user_type === 'company');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading builders directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section 
          className="text-white py-24 relative overflow-hidden"
          role="banner"
          aria-labelledby="builders-hero-heading"
        >
        {/* Professional Kenyan Construction Workers Planning Background - Fully Responsive */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/builders-hero-new.jpg?v=3'), url('/builders-hero-bg.jpg?v=1'), url('https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundSize: 'cover',
            MozBackgroundSize: 'cover'
          }}
          role="img"
          aria-label="Professional Kenyan construction workers in safety vests and hard hats reviewing architectural blueprints at active construction site with crane in background"
        />
        
        {/* Lighter overlay to show your beautiful image */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-gray-900/40 to-gray-800/40"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-center">
              <Badge className="bg-gradient-to-r from-gray-700 to-blue-600 text-white px-8 py-3 text-xl font-bold border border-white/30 shadow-lg">
                🇰🇪 Kenya's Premier Construction Professionals
              </Badge>
            </div>
            
            <h1 id="builders-hero-heading" className="text-6xl md:text-8xl font-bold mb-8 drop-shadow-2xl">
              <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                Professional Builders
              </span>
              <br />
              <span className="text-5xl md:text-6xl text-blue-400">
                Directory
              </span>
            </h1>
            
            <p className="text-2xl md:text-4xl mb-12 text-white/90 font-medium drop-shadow-lg leading-relaxed">
              <strong>Find Your Perfect Builder:</strong> Browse certified builders and contractors, view portfolios and ratings, 
              compare quotes, check availability, verify certifications, read reviews from past clients, and hire trusted 
              professionals for residential, commercial, or industrial projects across all 47 counties.
            </p>
            
            {/* Action Buttons - Always Visible */}
            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <Button 
                size="lg"
                onClick={() => setShowDashboard(false)}
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
              >
                <Building2 className="h-5 w-5 mr-2" />
                Browse Builders
              </Button>
              
              <Link to="/builder-registration">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Register as Builder
                </Button>
              </Link>
              
              {userProfile ? (
                <Link to="/suppliers?tab=purchase">
                  <Button 
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Purchase Materials
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button 
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Sign In to Purchase
                  </Button>
                </Link>
              )}
            </div>

            {/* Professional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-blue-400 mb-2">150+</div>
                <div className="text-white font-medium">Certified Builders</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-gray-300 mb-2">500+</div>
                <div className="text-white font-medium">Completed Projects</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-orange-400 mb-2">47</div>
                <div className="text-white font-medium">Counties Served</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-blue-300 mb-2">24/7</div>
                <div className="text-white font-medium">Support</div>
              </div>
            </div>
            
            {/* Admin/Builder Controls */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Badge className="bg-blue-600/90 text-white border-white/30 px-4 py-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 mr-2" />
                    Admin View
                  </Badge>
                )}
                {canAccessDashboard && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowDashboard(!showDashboard)}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 px-6 py-3 text-lg font-semibold"
                  >
                    <Settings className="h-5 w-5" />
                    {showDashboard ? 'View Public Directory' : 'Builder Dashboard'}
                  </Button>
                )}
              </div>
              
              {/* Theme and Language Controls */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full p-2 border border-white/20">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>
            
            {/* Professional Services Highlight */}
            <div className="mt-12 flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Professional Services</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Verified Builders</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Star className="h-5 w-5" />
                <span className="font-medium">Quality Assured</span>
              </div>
            </div>
          </div>
        </div>
        </section>
      </AnimatedSection>

      <main className="py-20 relative overflow-hidden">
        {/* Kenyan Construction Development Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
          role="img"
          aria-label="Modern Kenyan construction development with high-rise buildings and professional construction management"
        />
        
        {/* Light overlay for content readability */}
        <div className="absolute inset-0 bg-white/92 backdrop-blur-[1px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Security Alert - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <SecurityAlert />
            </div>
          )}

          {/* Dashboard for authenticated builders */}
          {showDashboard && canAccessDashboard ? (
            isProfessionalBuilder ? (
              <div className="space-y-8">
                {/* Professional Builder Header */}
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                      <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-lg">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      Professional Builder Workflow
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-700 leading-relaxed">
                      Complete project management workflow with advanced features for professional builders and construction companies across Kenya.
                    </CardDescription>
                  </CardHeader>
                </Card>

              {/* Enhanced Tabs for Professional Builder Workflow */}
              <Tabs defaultValue="workflow" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                  <TabsTrigger value="workflow" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Workflow</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Reviews</span>
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Projects</span>
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Materials</span>
                  </TabsTrigger>
                  <TabsTrigger value="deliveries" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span className="hidden sm:inline">Deliveries</span>
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Monitoring</span>
                  </TabsTrigger>
                  <TabsTrigger value="legacy" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Legacy</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workflow" className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Professional Workflow</h2>
                    <PDFExport 
                      builderId={userProfile.user_id} 
                      builderData={userProfile}
                    />
                  </div>
                  <QuickDashboard isProfessional={true} />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                    <p className="text-muted-foreground">Analytics temporarily disabled for debugging</p>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6">
                  <ReviewsSystem
                    builderId={userProfile.user_id}
                    builderName={(userProfile as any).company_name || userProfile.full_name}
                    reviews={(userProfile as any).reviews || []}
                    averageRating={(userProfile as any).rating || 4.8}
                    totalReviews={(userProfile as any).reviews?.length || 0}
                  />
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Project Manager</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Material Manager</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="deliveries" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Delivery Tracker</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Monitoring Service Request</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="legacy" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Legacy Tools</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Private Builder Header */}
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    Private Builder Workflow
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-700 leading-relaxed">
                    Streamlined workflow for individual builders with direct purchase capabilities and basic monitoring services.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Enhanced Tabs for Private Builder Workflow */}
              <Tabs defaultValue="workflow" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="workflow" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Projects
                  </TabsTrigger>
                  <TabsTrigger value="direct-purchase" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Direct Purchase
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Monitoring
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workflow" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Private Workflow Dashboard</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Private Project Manager</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="direct-purchase" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Direct Purchase</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-6">
                  <div className="p-8 text-center border rounded-lg">
                    <h2 className="text-2xl font-bold">Private Monitoring</h2>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )
        ) : (
          /* Public Directory with Enhanced Search */
          <div className="space-y-8">
            {/* Login Portal for Builders - Only show if not logged in */}
            {!userProfile && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-2xl p-6">
                <LoginPortal 
                  type="builder"
                />
              </div>
            )}

            <ErrorBoundary fallback={<div></div>}>
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-2xl p-6">
                <EnhancedSearch 
                  onSearchChange={(filters) => {
                    console.log('Search filters:', filters);
                  }}
                />
              </div>
            </ErrorBoundary>
            
            <ErrorBoundary fallback={
              <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50/90 backdrop-blur-sm shadow-lg">
                <h3 className="text-red-800 font-bold mb-2 text-xl">Builder Directory Error</h3>
                <p className="text-red-700 text-lg">There was an error loading the builder directory. Please check your connection and try again.</p>
              </div>
            }>
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-2xl p-6">
                <BuilderGrid 
                  onBuilderContact={handleBuilderContact}
                  onBuilderProfile={handleBuilderProfile}
                  isAdmin={isAdmin}
                />
              </div>
            </ErrorBoundary>
          </div>
        )}
        </div>
      </main>

      {/* Contact Modal */}
      {selectedBuilder && (
        <ContactBuilderModal
          builder={selectedBuilder}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* Profile Modal */}
      {selectedBuilder && (
        <BuilderProfileModal
          builder={selectedBuilder}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onContact={handleOpenContactFromProfile}
        />
      )}

      {/* Enhanced Stats Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Kenyan Construction Excellence Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1590736969955-71cc94901144?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
          role="img"
          aria-label="Kenyan construction materials and professional building supplies showcasing quality construction standards and industry excellence"
        />
        
        {/* Professional overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-black/70 to-gray-800/80"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-white drop-shadow-2xl">Building Kenya's Future</h2>
            <p className="text-2xl text-white/90 max-w-4xl mx-auto drop-shadow-lg leading-relaxed">
              Our network of professional builders and contractors is transforming Kenya's construction landscape, 
              one project at a time across all 47 counties.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-5xl font-bold text-blue-400 mb-4 drop-shadow-lg">150+</div>
              <div className="text-2xl font-semibold text-white mb-2">Certified Builders</div>
              <div className="text-white/80">Verified professionals across Kenya</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-5xl font-bold text-blue-400 mb-4 drop-shadow-lg">500+</div>
              <div className="text-2xl font-semibold text-white mb-2">Completed Projects</div>
              <div className="text-white/80">Successful construction projects</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg">47</div>
              <div className="text-2xl font-semibold text-white mb-2">Counties Served</div>
              <div className="text-white/80">Nationwide coverage</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-5xl font-bold text-red-400 mb-4 drop-shadow-lg">24/7</div>
              <div className="text-2xl font-semibold text-white mb-2">Professional Support</div>
              <div className="text-white/80">Always available assistance</div>
            </div>
          </div>
          
          {/* Kenyan Construction Excellence */}
          <div className="mt-16 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30 max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">Excellence in Kenyan Construction</h3>
              <p className="text-xl text-white/90 leading-relaxed">
                From the bustling streets of Nairobi to the coastal developments of Mombasa, 
                from the agricultural centers of Nakuru to the industrial hubs of Eldoret - 
                our builders are creating Kenya's architectural legacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      {showChat && chatBuilder && (
        <ChatWidget
          builder={chatBuilder}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          onCall={() => {
            toast({
              title: "Calling Builder",
              description: `Initiating call to ${chatBuilder.name}...`,
            });
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default Builders;