import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
// FloatingSocialSidebar moved to App.tsx for global availability
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Settings, Shield, ShoppingCart, Camera, Building2, Package, Truck, FileText, Eye, CheckCircle, Lock, Smartphone, Star, MessageCircle, LogIn, Video, Users } from "lucide-react";
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
import { BuilderFeed } from "@/components/builders/BuilderFeed";
import { BuilderFacebookLayout } from "@/components/builders/BuilderFacebookLayout";
// import { NotificationSystem } from "@/components/builders/NotificationSystem";
import { SimpleAnalyticsDashboard } from "@/components/builders/SimpleAnalyticsDashboard";
import { PDFExport } from "@/components/builders/PDFExport";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { LoginPortal } from "@/components/LoginPortal";
import { ContactBuilderDialog } from "@/components/builders/ContactBuilderDialog";
import { BuilderProfileEdit } from "@/components/builders/BuilderProfileEdit";
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
  const [loading, setLoading] = useState(false); // Start with false for instant display
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
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [contactBuilder, setContactBuilder] = useState<any>(null);
  const { toast } = useToast();
  
  // Check if current user is a builder (can post)
  // Only professional builders can post on the Builders page (not private clients)
  const isBuilder = userRoleState === 'professional_builder' || userRoleState === 'admin';

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    // FAST PATH: Check localStorage first for instant role detection
    const storedRole = localStorage.getItem('user_role');
    if (storedRole) {
      console.log('🔐 Builders: Using localStorage role:', storedRole);
      setUserRoleState(storedRole);
    }
    
    // Then verify from database (in background)
    if (userProfile) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userProfile.user_id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          clearTimeout(timeoutId);
          if (data?.role) {
            console.log('🔐 Builders: DB role confirmed:', data.role);
            setUserRoleState(data.role);
            localStorage.setItem('user_role', data.role);
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.log('🔐 Builders: Role check failed, using localStorage');
        });
    }
  }, [userProfile]);

  const checkUserProfile = async () => {
    // Set loading to false immediately - show page while checking auth in background
    setLoading(false);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Handle missing auth session gracefully - this is expected when not logged in
      if (authError || !user) {
        return;
      }

      // Store user_id in localStorage for components that need it
      localStorage.setItem('user_id', user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile as UserProfile);
        // Store user name in localStorage for components that need it
        if (profile.full_name) {
          localStorage.setItem('user_name', profile.full_name);
        }
        
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
    }
  };

  const handleBuilderContact = (builder: UserProfile & { company_name?: string; phone?: string; email?: string; location?: string }) => {
    setSelectedBuilder(builder);
    setShowContactModal(true);
  };

  // New contact handler for the Facebook-style contact dialog
  const handleContactBuilderDialog = (builder: any) => {
    setContactBuilder(builder);
    setShowContactDialog(true);
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

  const canAccessDashboard = userProfile && (userRoleState === 'professional_builder' || userRoleState === 'private_client');
  const isProfessionalBuilder = userProfile && userRoleState === 'professional_builder' && 
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* FloatingSocialSidebar now in App.tsx */}
      <Navigation />

      {/* Hero Section - Ultra Compact */}
      <section 
        className="text-white py-8 md:py-10 relative overflow-hidden"
        role="banner"
        aria-labelledby="builders-hero-heading"
      >
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/builders-hero-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/75 to-gray-900/85" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Title */}
            <h1 id="builders-hero-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              <span className="text-white">Professional Builders</span>
              {' '}
              <span className="text-blue-400">Directory</span>
            </h1>
            
            <p className="text-sm md:text-base text-white/80 mb-4 max-w-2xl mx-auto">
              Browse certified builders, compare quotes, and hire trusted professionals across Kenya.
            </p>
            
            {/* Action Buttons - Single Row */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <Button 
                size="sm"
                onClick={() => setShowDashboard(false)}
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold text-xs px-3 py-1.5"
              >
                <Building2 className="h-3 w-3 mr-1" />
                Browse
              </Button>
              
              <Link to="/builder-registration">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5">
                  <Building2 className="h-3 w-3 mr-1" />
                  Register
                </Button>
              </Link>
              
              {!loading && userProfile && (userRoleState === 'professional_builder' || userRoleState === 'private_client') && (
                <Link to="/professional-builder-dashboard">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-1.5">
                    <Settings className="h-3 w-3 mr-1" />
                    Dashboard
                  </Button>
                </Link>
              )}
              
              {!loading && !userProfile && (
                <Link to="/builder-signin">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-1.5">
                    <Lock className="h-3 w-3 mr-1" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats - Inline */}
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span className="text-white/70"><strong className="text-blue-400">150+</strong> Builders</span>
              <span className="text-white/70"><strong className="text-gray-300">500+</strong> Projects</span>
              <span className="text-white/70"><strong className="text-orange-400">47</strong> Counties</span>
              <span className="text-white/70"><strong className="text-blue-300">24/7</strong> Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Builder Portal Section - Compact */}
      <section className="py-6 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Choose Your Builder Portal</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Private Builder */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-emerald-200 bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">Private Builder</h3>
                  <p className="text-xs text-gray-500">Home projects & purchases</p>
                </div>
                <Link to="/private-client-auth">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    Explore
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Professional Builder */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-blue-200 bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">Professional Builder</h3>
                  <p className="text-xs text-gray-500">Contractors & companies</p>
                </div>
                <Link to="/professional-builder-auth">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Explore
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
                  <SimpleAnalyticsDashboard builderId={userProfile.user_id} />
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
                    <p className="text-muted-foreground mb-4">Browse and purchase materials from verified suppliers</p>
                    <Link to="/suppliers?tab=purchase">
                      <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Go to Suppliers Page
                      </Button>
                    </Link>
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
                  <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl flex items-center justify-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-orange-600" />
                        Direct Material Purchase
                      </CardTitle>
                      <CardDescription className="text-base">
                        Browse verified suppliers and purchase construction materials directly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-orange-600">850+</div>
                          <div className="text-sm text-gray-600">Verified Suppliers</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600">47</div>
                          <div className="text-sm text-gray-600">Counties Served</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-600">24/7</div>
                          <div className="text-sm text-gray-600">Support</div>
                        </div>
                      </div>

                      <div className="space-y-3 bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">✨ What You Can Do:</h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Browse Materials:</strong> View all construction materials with photos and prices</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Compare Suppliers:</strong> See ratings, reviews, and pricing from multiple suppliers</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Request Quotes:</strong> Get competitive quotes for bulk orders</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Track Deliveries:</strong> Real-time GPS tracking of your materials</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Verify Quality:</strong> QR code scanning for material authentication</span>
                          </li>
                        </ul>
                  </div>

                      <Link to="/suppliers?tab=purchase">
                        <Button size="lg" className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-lg">
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          Start Shopping for Materials
                        </Button>
                      </Link>

                      <p className="text-xs text-center text-gray-500">
                        💡 Tip: All suppliers are verified with ratings and reviews for your peace of mind
                      </p>
                    </CardContent>
                  </Card>
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
          /* Public Directory with Facebook-Style Combined Layout */
          <div className="space-y-6">
            {/* Show notice to suppliers/delivery providers that this is a builders directory */}
            {userProfile && userRoleState && userRoleState !== 'professional_builder' && userRoleState !== 'private_client' && userRoleState !== 'admin' && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center max-w-2xl mx-auto">
                <p className="text-amber-800 font-medium text-sm">
                  👋 You're viewing the Builders Directory as a <strong className="capitalize">{userRoleState?.replace('_', ' ')}</strong>.
                </p>
              </div>
            )}

            {/* Facebook-Style Combined Layout - Sidebar + Feed + Right Panel */}
            <ErrorBoundary fallback={
              <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50/90 backdrop-blur-sm shadow-lg max-w-2xl mx-auto">
                <h3 className="text-red-800 font-bold mb-2 text-xl">Error Loading Content</h3>
                <p className="text-red-700 text-lg">There was an error loading the builder feed. Please try again.</p>
              </div>
            }>
              <BuilderFacebookLayout
                currentUserId={userProfile?.user_id}
                currentUserName={userProfile?.full_name || 'Guest'}
                currentUserAvatar={userProfile?.avatar_url}
                currentUserRole={userRoleState}
                isBuilder={isBuilder}
                onBuilderContact={handleContactBuilderDialog}
                onBuilderProfile={handleBuilderProfile}
                onEditProfile={() => setShowProfileEdit(true)}
              />
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
            backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80')`,
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

      {/* Contact Builder Dialog (Facebook-style) */}
      {contactBuilder && (
        <ContactBuilderDialog
          builder={{
            id: contactBuilder.id,
            user_id: contactBuilder.user_id || contactBuilder.id,
            full_name: contactBuilder.full_name,
            company_name: contactBuilder.company_name,
            phone: contactBuilder.phone,
            email: contactBuilder.email,
            location: contactBuilder.location,
            avatar_url: contactBuilder.avatar_url,
            is_verified: contactBuilder.verified || contactBuilder.is_verified,
            rating: contactBuilder.rating,
            allow_calls: contactBuilder.allow_calls,
            allow_messages: contactBuilder.allow_messages,
            show_phone: contactBuilder.show_phone,
            show_email: contactBuilder.show_email
          }}
          isOpen={showContactDialog}
          onClose={() => {
            setShowContactDialog(false);
            setContactBuilder(null);
          }}
        />
      )}

      {/* Builder Profile Edit Dialog */}
      <BuilderProfileEdit
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          checkUserProfile();
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated successfully"
          });
        }}
      />

      <Footer />
    </div>
  );
};

export default Builders;
