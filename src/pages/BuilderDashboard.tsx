import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLoader } from '@/components/ui/DashboardLoader';
import {
  Building2,
  ShoppingCart,
  Package,
  FileText,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Briefcase,
  Home,
  Settings,
  Camera,
  Wrench,
  Users,
  Send,
  Loader2,
  X,
  Moon,
  Sun
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBuilderData, logDataAccessAttempt } from "@/hooks/useDataIsolation";

// Import new dashboard components
import { StatsCards, OrdersTab, ProjectsTab, QuotesTab, BuilderThemeToggle } from '@/components/builder/dashboard';
import { MonitoringAccessManager } from '@/components/builder/MonitoringAccessManager';

// Stats interfaces
interface ProfessionalStats {
  activeProjects: number;
  pendingQuotes: number;
  completedProjects: number;
  totalSpent: string;
  suppliersConnected: number;
  averageRating: number;
  teamMembers: number;
  monthlyOrders: number;
}

interface PrivateStats {
  activeProjects: number;
  pendingQuotes: number;
  completedProjects: number;
  totalSpent: string;
  suppliersConnected: number;
  savedItems: number;
}

// Mock data for demonstration
const mockProfessionalStats: ProfessionalStats = {
  activeProjects: 8,
  pendingQuotes: 12,
  completedProjects: 45,
  totalSpent: 'KES 8,500,000',
  suppliersConnected: 24,
  averageRating: 4.8,
  teamMembers: 15,
  monthlyOrders: 32
};

const mockPrivateStats: PrivateStats = {
  activeProjects: 1,
  pendingQuotes: 3,
  completedProjects: 2,
  totalSpent: 'KES 850,000',
  suppliersConnected: 5,
  savedItems: 12
};

const mockRecentOrders = [
  { id: 'ORD-2024-001', supplier: 'Bamburi Cement', items: 'Cement (100 bags)', amount: 'KES 70,000', status: 'delivered', date: '2024-01-15' },
  { id: 'ORD-2024-002', supplier: 'Steel Masters Kenya', items: 'Steel Bars (2 tons)', amount: 'KES 180,000', status: 'in_transit', date: '2024-01-14' },
  { id: 'ORD-2024-003', supplier: 'Nairobi Timber', items: 'Timber (500 pieces)', amount: 'KES 125,000', status: 'processing', date: '2024-01-13' },
];

const mockActiveProjects = [
  { id: 'PRJ-001', name: 'Kilimani Apartment Complex', location: 'Nairobi', progress: 65, budget: 'KES 45M', status: 'on_track' },
  { id: 'PRJ-002', name: 'Karen Villa Development', location: 'Nairobi', progress: 30, budget: 'KES 12M', status: 'on_track' },
  { id: 'PRJ-003', name: 'Mombasa Office Block', location: 'Mombasa', progress: 85, budget: 'KES 28M', status: 'ahead' },
];

const mockQuoteRequests = [
  { id: 'QR-001', material: 'Cement (500 bags)', suppliers: 5, responses: 3, bestPrice: 'KES 340,000', deadline: '2024-01-20' },
  { id: 'QR-002', material: 'Roofing Sheets (200 pcs)', suppliers: 4, responses: 4, bestPrice: 'KES 180,000', deadline: '2024-01-18' },
];

interface UserProfile {
  full_name: string;
  phone: string;
  company_name: string | null;
  builder_category: string | null;
  is_professional: boolean;
}

// Mock delivery requests
const mockDeliveryRequests = [
  { id: 'DEL-001', pickup: 'Bamburi Cement, Industrial Area', dropoff: 'Kilimani Site', status: 'pending', date: '2024-01-16', items: 'Cement (50 bags)', weight: '2,500 kg' },
  { id: 'DEL-002', pickup: 'Steel Masters, Mombasa Rd', dropoff: 'Karen Villa Project', status: 'assigned', date: '2024-01-15', items: 'Steel Bars', weight: '1,000 kg', driver: 'John M.' },
  { id: 'DEL-003', pickup: 'Nairobi Timber, Ngong Rd', dropoff: 'Westlands Office', status: 'in_transit', date: '2024-01-14', items: 'Timber Planks', weight: '800 kg', driver: 'Peter K.' },
  { id: 'DEL-004', pickup: 'Paint World, Thika Rd', dropoff: 'Kilimani Site', status: 'delivered', date: '2024-01-13', items: 'Paint (30 buckets)', weight: '450 kg', driver: 'James O.' },
];

const BuilderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // NOTE: Role check is already done by RoleProtectedRoute in App.tsx
  // No need for duplicate verification here - this speeds up loading!
  
  // Use data isolation hook - ensures only this builder's data is fetched
  const { 
    profile: isolatedProfile, 
    orders: builderOrders, 
    deliveryRequests: builderDeliveryRequests,
    loading: dataLoading,
    error: dataError,
    refetch: refetchData
  } = useBuilderData();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Delivery Request State
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  // Use isolated delivery requests instead of mock data
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);
  const [deliveryForm, setDeliveryForm] = useState({
    pickupLocation: '',
    pickupAddress: '',
    dropoffLocation: '',
    dropoffAddress: '',
    itemDescription: '',
    estimatedWeight: '',
    preferredDate: '',
    preferredTime: '',
    specialInstructions: '',
    urgency: 'normal'
  });

  // Check for system dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  // Update local state when isolated data loads
  useEffect(() => {
    if (isolatedProfile) {
      setProfile(isolatedProfile as UserProfile);
    }
    // Transform delivery requests to match local format using ACTUAL database column names
    if (builderDeliveryRequests && builderDeliveryRequests.length > 0) {
      const formattedRequests = builderDeliveryRequests.map((req: any) => ({
        id: req.id || `DEL-${Date.now()}`,
        pickup: req.pickup_location || req.pickup_address || 'N/A',
        dropoff: req.dropoff_location || req.dropoff_address || 'N/A',
        status: req.status || 'pending',
        date: req.preferred_date || (req.created_at ? new Date(req.created_at).toISOString().split('T')[0] : 'N/A'),
        items: req.item_description || 'Materials',
        weight: req.estimated_weight || 'N/A',
        driver: req.driver_name || undefined,
        urgency: req.urgency || 'normal'
      }));
      setDeliveryRequests(formattedRequests);
    }
  }, [isolatedProfile, builderDeliveryRequests]);

  // Log data access for security audit
  useEffect(() => {
    if (user?.id) {
      logDataAccessAttempt(user.id, 'view', 'builder_dashboard', true, 'Dashboard loaded');
    }
  }, [user?.id]);

  const handleDeliverySubmit = async () => {
    if (!deliveryForm.pickupLocation || !deliveryForm.dropoffLocation || !deliveryForm.itemDescription) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in pickup location, dropoff location, and item description."
      });
      return;
    }

    setDeliveryLoading(true);
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get the profile ID (required for RLS policy)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Profile lookup result:', { profileData, profileError });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }
      
      if (!profileData) {
        throw new Error('Profile not found for current user');
      }

      // Prepare the data using ACTUAL database column names:
      // pickup_location, pickup_address, dropoff_location, dropoff_address,
      // item_description, estimated_weight, preferred_date, preferred_time,
      // urgency, special_instructions, status, builder_id, builder_email
      const insertData = {
        builder_id: profileData.id,
        builder_email: user?.email || localStorage.getItem('admin_email') || '',
        pickup_location: deliveryForm.pickupLocation?.trim() || '',
        pickup_address: deliveryForm.pickupAddress?.trim() || deliveryForm.pickupLocation?.trim() || '',
        dropoff_location: deliveryForm.dropoffLocation?.trim() || '',
        dropoff_address: deliveryForm.dropoffAddress?.trim() || deliveryForm.dropoffLocation?.trim() || '',
        item_description: deliveryForm.itemDescription?.trim() || 'Materials',
        estimated_weight: deliveryForm.estimatedWeight?.trim() || null,
        preferred_date: deliveryForm.preferredDate || new Date().toISOString().split('T')[0],
        preferred_time: deliveryForm.preferredTime || null,
        urgency: deliveryForm.urgency || 'normal',
        special_instructions: deliveryForm.specialInstructions?.trim() || null,
        status: 'pending'
      };

      console.log('Inserting delivery request with data:', insertData);

      // Direct insert with correct column names
      let requestId: string | null = null;
      const { data: insertResult, error: insertError } = await supabase
        .from('delivery_requests')
        .insert(insertData)
        .select();

      console.log('Insert result:', { insertResult, insertError });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }
      
      requestId = insertResult?.[0]?.id;

      console.log('Request created with ID:', requestId);

      // Add to local state
      const newRequest = {
        id: `DEL-${Date.now()}`,
        pickup: deliveryForm.pickupLocation,
        dropoff: deliveryForm.dropoffLocation,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        items: deliveryForm.itemDescription,
        weight: deliveryForm.estimatedWeight || 'N/A'
      };
      
      setDeliveryRequests(prev => [newRequest, ...prev]);

      toast({
        title: "🚚 Delivery Requested!",
        description: "Your delivery request has been submitted. A driver will be assigned soon.",
      });

      // Reset form
      setDeliveryForm({
        pickupLocation: '',
        pickupAddress: '',
        dropoffLocation: '',
        dropoffAddress: '',
        itemDescription: '',
        estimatedWeight: '',
        preferredDate: '',
        preferredTime: '',
        specialInstructions: '',
        urgency: 'normal'
      });
      setShowDeliveryDialog(false);

    } catch (error: any) {
      console.error('Error submitting delivery request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to submit delivery request. Please try again."
      });
    } finally {
      setDeliveryLoading(false);
    }
  };

  useEffect(() => {
    // Show UI immediately when auth is done
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, company_name, builder_category, is_professional')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const isProfessional = profile?.is_professional || profile?.builder_category === 'professional';
  const stats = isProfessional ? mockProfessionalStats : mockPrivateStats;

  // Theme classes
  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const headerClass = isDarkMode ? 'text-white' : 'text-gray-900';

  if (authLoading || loading) {
    return <DashboardLoader type="builder" />;
  }

  // Check for admin access (admin can view all dashboards)
  const isAdminAccess = localStorage.getItem('admin_authenticated') === 'true';

  if (!user && !isAdminAccess) {
    return (
      <div className={`min-h-screen flex flex-col ${bgClass}`}>
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card className={`max-w-md mx-auto ${cardClass}`}>
            <CardHeader className="text-center">
              <Building2 className={`h-12 w-12 mx-auto mb-4 ${isProfessional ? 'text-blue-600' : 'text-emerald-600'}`} />
              <CardTitle className={headerClass}>Sign In Required</CardTitle>
              <CardDescription className={textClass}>Please sign in to access your builder dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/builder-signin?redirect=/builder-dashboard">
                <Button className="w-full">Sign In as Builder</Button>
              </Link>
              <Link to="/builder-registration">
                <Button variant="outline" className="w-full">Register as Builder</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${bgClass} transition-colors duration-300`}>
      <Navigation />

      {/* Hero Section */}
      <section className={`relative py-12 text-white ${isProfessional 
        ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900' 
        : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800'
      }`}>
        <div className="absolute inset-0 bg-[url('/construction-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${isProfessional ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {isProfessional ? <Briefcase className="h-8 w-8" /> : <Home className="h-8 w-8" />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    Welcome, {profile?.full_name || 'Builder'}!
                  </h1>
                  <Badge className={`${isProfessional ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                    {isProfessional ? '🏢 Professional' : '🏠 Private Builder'}
                  </Badge>
                </div>
                <p className="text-white/80">
                  {isProfessional 
                    ? profile?.company_name || 'Professional Builder Account'
                    : 'Personal Construction Projects'
                  }
                </p>
                <p className="text-white/60 text-sm mt-1">{user?.email || localStorage.getItem('admin_email') || 'Admin Access'}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {/* Theme Toggle */}
              <BuilderThemeToggle 
                isDarkMode={isDarkMode} 
                onToggle={setIsDarkMode}
                variant="ghost"
              />
              <Link to="/supplier-marketplace">
                <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Quick Stats - Using new StatsCards component */}
        <div className="mb-8">
          <StatsCards 
            isProfessional={isProfessional} 
            stats={stats}
            isDarkMode={isDarkMode}
            trends={{
              activeProjects: 12,
              pendingQuotes: -5,
              completedProjects: 8
            }}
          />
        </div>

        {/* Quick Actions */}
        <Card className={`mb-8 ${isProfessional 
          ? isDarkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200' 
          : isDarkMode ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <CardHeader>
            <CardTitle className={`text-lg ${isProfessional 
              ? isDarkMode ? 'text-blue-300' : 'text-blue-800' 
              : isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
            }`}>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-2 ${isProfessional ? 'md:grid-cols-4 lg:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-4'} gap-3`}>
              <Link to="/supplier-marketplace">
                <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-xs">Browse Materials</span>
                </Button>
              </Link>
              
              <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                <FileText className="h-5 w-5" />
                <span className="text-xs">Request Quote</span>
              </Button>
              
              <Link to="/tracking">
                <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                  <Truck className="h-5 w-5" />
                  <span className="text-xs">Track Orders</span>
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className={`w-full h-20 flex-col gap-2 ${
                  isDarkMode 
                    ? 'bg-green-900/30 border-green-700 hover:bg-green-800/50' 
                    : 'bg-green-50 border-green-300 hover:bg-green-100'
                }`}
                onClick={() => setShowDeliveryDialog(true)}
              >
                <Send className="h-5 w-5 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Request Delivery</span>
              </Button>
              
              {isProfessional && (
                <>
                  <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">New Project</span>
                  </Button>
                  
                  <Link to="/monitoring">
                    <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                      <Camera className="h-5 w-5" />
                      <span className="text-xs">Site Monitoring</span>
                    </Button>
                  </Link>
                  
                  <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Manage Team</span>
                  </Button>
                </>
              )}
              
              {!isProfessional && (
                <Button variant="outline" className={`w-full h-20 flex-col gap-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-white'}`}>
                  <Wrench className="h-5 w-5" />
                  <span className="text-xs">Find Contractor</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isProfessional ? 'grid-cols-6' : 'grid-cols-5'} mb-6 ${isDarkMode ? 'bg-gray-800' : ''}`}>
            <TabsTrigger value="overview" className={isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className={isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}>
              Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className={`flex items-center gap-1 ${isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}`}>
              <Truck className="h-3 w-3" />
              Deliveries
            </TabsTrigger>
            {isProfessional && (
              <TabsTrigger value="projects" className={isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}>
                Projects
              </TabsTrigger>
            )}
            <TabsTrigger value="quotes" className={isDarkMode ? 'data-[state=active]:bg-gray-700' : ''}>
              Quotes
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className={`flex items-center gap-1 ${isDarkMode ? 'data-[state=active]:bg-red-700' : 'data-[state=active]:bg-red-100 data-[state=active]:text-red-700'}`}
            >
              <Camera className="h-3 w-3" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className={`text-lg ${headerClass}`}>Recent Orders</CardTitle>
                  <Button 
                    variant="link" 
                    className={`text-sm ${isProfessional ? 'text-blue-600' : 'text-emerald-600'}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockRecentOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${headerClass}`}>{order.items}</p>
                          <p className={`text-xs ${textClass}`}>{order.supplier}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${headerClass}`}>{order.amount}</p>
                          <Badge variant="secondary" className={`text-xs ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status === 'in_transit' ? 'In Transit' : order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quote Requests */}
              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className={`text-lg ${headerClass}`}>Active Quote Requests</CardTitle>
                  <Button 
                    variant="link" 
                    className={`text-sm ${isProfessional ? 'text-blue-600' : 'text-emerald-600'}`}
                    onClick={() => setActiveTab('quotes')}
                  >
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockQuoteRequests.slice(0, 2).map((quote) => (
                      <div key={quote.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`font-medium text-sm ${headerClass}`}>{quote.material}</p>
                          <Badge variant="outline" className="text-xs">
                            {quote.responses}/{quote.suppliers} responses
                          </Badge>
                        </div>
                        <div className={`flex items-center justify-between text-xs ${textClass}`}>
                          <span>Best Price: <span className="text-green-600 font-semibold">{quote.bestPrice}</span></span>
                          <span>Deadline: {quote.deadline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Professional-only: Active Projects Overview */}
            {isProfessional && (
              <Card className={cardClass}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className={`text-lg ${headerClass}`}>Active Projects</CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setActiveTab('projects')}
                    className={isDarkMode ? 'border-gray-600' : ''}
                  >
                    <Plus className="h-4 w-4 mr-1" /> New Project
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {mockActiveProjects.map((project) => (
                      <Card key={project.id} className={`border shadow-sm ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className={`font-semibold ${headerClass}`}>{project.name}</h4>
                              <p className={`text-xs flex items-center gap-1 ${textClass}`}>
                                <MapPin className="h-3 w-3" /> {project.location}
                              </p>
                            </div>
                            <Badge className={`text-xs ${
                              project.status === 'ahead' ? 'bg-green-100 text-green-700' :
                              project.status === 'on_track' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {project.status === 'on_track' ? 'On Track' : project.status}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className={textClass}>Progress</span>
                              <span className={`font-semibold ${headerClass}`}>{project.progress}%</span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all" 
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <p className={`text-xs ${textClass}`}>Budget: {project.budget}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Private Builder: My Home Project */}
            {!isProfessional && (
              <Card className={`${isDarkMode 
                ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-emerald-800' 
                : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
              }`}>
                <CardHeader>
                  <CardTitle className={`text-lg ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                    My Home Project
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    Track your personal construction project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <h4 className={`font-semibold mb-2 ${headerClass}`}>Project Status</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className={textClass}>Overall Progress</span>
                            <span className={`font-semibold ${headerClass}`}>35%</span>
                          </div>
                          <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className="bg-emerald-600 h-3 rounded-full" style={{ width: '35%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <h4 className={`font-semibold mb-2 ${headerClass}`}>Budget Tracker</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">KES 850,000</p>
                            <p className={`text-xs ${textClass}`}>of KES 2,500,000 budget</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${headerClass}`}>34%</p>
                            <p className={`text-xs ${textClass}`}>spent</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <h4 className={`font-semibold mb-3 ${headerClass}`}>Next Steps</h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className={`line-through ${textClass}`}>Foundation complete</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className={headerClass}>Order roofing materials</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                            <span className={textClass}>Schedule electrical inspection</span>
                          </li>
                        </ul>
                      </div>
                      <Link to="/supplier-marketplace">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Shop for Materials
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab - Using new OrdersTab component */}
          <TabsContent value="orders">
            <OrdersTab 
              userId={user?.id} 
              isDarkMode={isDarkMode}
              isProfessional={isProfessional}
            />
          </TabsContent>

          {/* Projects Tab - Using new ProjectsTab component (Professional Only) */}
          {isProfessional && (
            <TabsContent value="projects">
              <ProjectsTab 
                userId={user?.id} 
                isDarkMode={isDarkMode}
              />
            </TabsContent>
          )}

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className={`text-xl flex items-center gap-2 ${headerClass}`}>
                      <Truck className="h-5 w-5 text-green-600" />
                      Delivery Requests
                    </CardTitle>
                    <CardDescription className={textClass}>
                      Track and manage your material deliveries
                    </CardDescription>
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowDeliveryDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Request New Delivery
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Delivery Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Pending</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      {deliveryRequests.filter(d => d.status === 'pending').length}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>Assigned</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      {deliveryRequests.filter(d => d.status === 'assigned').length}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900/30 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>In Transit</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                      {deliveryRequests.filter(d => d.status === 'in_transit').length}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Delivered</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                      {deliveryRequests.filter(d => d.status === 'delivered').length}
                    </p>
                  </div>
                </div>

                {/* Delivery List */}
                <div className="space-y-4">
                  {deliveryRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Truck className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-lg ${textClass}`}>No delivery requests yet</p>
                      <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Click "Request New Delivery" to get started
                      </p>
                    </div>
                  ) : (
                    deliveryRequests.map((delivery) => (
                      <Card key={delivery.id} className={`border-l-4 ${
                        delivery.status === 'pending' 
                          ? isDarkMode ? 'border-l-yellow-500 bg-yellow-900/20' : 'border-l-yellow-500 bg-yellow-50/30' :
                        delivery.status === 'assigned' 
                          ? isDarkMode ? 'border-l-blue-500 bg-blue-900/20' : 'border-l-blue-500 bg-blue-50/30' :
                        delivery.status === 'in_transit' 
                          ? isDarkMode ? 'border-l-purple-500 bg-purple-900/20' : 'border-l-purple-500 bg-purple-50/30' :
                        isDarkMode ? 'border-l-green-500 bg-green-900/20' : 'border-l-green-500 bg-green-50/30'
                      } ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`font-mono text-sm ${textClass}`}>{delivery.id}</span>
                                <Badge className={
                                  delivery.status === 'pending' ? 'bg-yellow-500' :
                                  delivery.status === 'assigned' ? 'bg-blue-500' :
                                  delivery.status === 'in_transit' ? 'bg-purple-500' :
                                  'bg-green-500'
                                }>
                                  {delivery.status === 'in_transit' ? 'In Transit' : delivery.status}
                                </Badge>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <div className="p-1 bg-green-100 rounded mt-0.5">
                                    <MapPin className="h-3 w-3 text-green-600" />
                                  </div>
                                  <div>
                                    <p className={`text-xs ${textClass}`}>Pickup</p>
                                    <p className={`text-sm font-medium ${headerClass}`}>{delivery.pickup}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="p-1 bg-red-100 rounded mt-0.5">
                                    <MapPin className="h-3 w-3 text-red-600" />
                                  </div>
                                  <div>
                                    <p className={`text-xs ${textClass}`}>Dropoff</p>
                                    <p className={`text-sm font-medium ${headerClass}`}>{delivery.dropoff}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className={`flex flex-wrap gap-4 text-sm ${textClass}`}>
                                <span className="flex items-center gap-1">
                                  <Package className="h-4 w-4" />
                                  {delivery.items}
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4" />
                                  {delivery.weight}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {delivery.date}
                                </span>
                                {(delivery as any).driver && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Driver: {(delivery as any).driver}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {delivery.status === 'in_transit' && (
                                <Link to="/tracking">
                                  <Button variant="outline" size="sm" className={`border-purple-300 text-purple-700 hover:bg-purple-50 ${isDarkMode ? 'border-purple-600 text-purple-400 hover:bg-purple-900/30' : ''}`}>
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Track
                                  </Button>
                                </Link>
                              )}
                              {delivery.status === 'pending' && (
                                <Button variant="outline" size="sm" className={`border-red-300 text-red-700 hover:bg-red-50 ${isDarkMode ? 'border-red-600 text-red-400 hover:bg-red-900/30' : ''}`}>
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className={isDarkMode ? 'border-gray-600' : ''}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotes Tab - Using new QuotesTab component */}
          <TabsContent value="quotes">
            <QuotesTab 
              userId={user?.id}
              isDarkMode={isDarkMode}
              isProfessional={isProfessional}
            />
          </TabsContent>

          {/* Monitoring Tab - Project Camera Monitoring */}
          <TabsContent value="monitoring">
            <Card className={`mb-4 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                  <Camera className="h-5 w-5" />
                  Site Monitoring Services
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-red-200/70' : 'text-red-700/70'}>
                  Request live camera monitoring for your construction projects. Get real-time visibility and progress tracking.
                </CardDescription>
              </CardHeader>
            </Card>
            <MonitoringAccessManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delivery Request Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-6 w-6 text-green-600" />
              Request Delivery
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-400' : ''}>
              Fill in the details below to request a delivery for your construction materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Pickup Location */}
            <div className="space-y-4">
              <h4 className="font-semibold text-green-700 flex items-center gap-2">
                <div className="p-1 bg-green-100 rounded">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                Pickup Location
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickupLocation">Location / Supplier Name *</Label>
                  <Input
                    id="pickupLocation"
                    placeholder="e.g., Bamburi Cement, Industrial Area"
                    value={deliveryForm.pickupLocation}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="pickupAddress">Full Address</Label>
                  <Input
                    id="pickupAddress"
                    placeholder="Street address, building, etc."
                    value={deliveryForm.pickupAddress}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, pickupAddress: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="space-y-4">
              <h4 className="font-semibold text-red-700 flex items-center gap-2">
                <div className="p-1 bg-red-100 rounded">
                  <MapPin className="h-4 w-4 text-red-600" />
                </div>
                Dropoff Location
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dropoffLocation">Site / Location Name *</Label>
                  <Input
                    id="dropoffLocation"
                    placeholder="e.g., Kilimani Construction Site"
                    value={deliveryForm.dropoffLocation}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="dropoffAddress">Full Address</Label>
                  <Input
                    id="dropoffAddress"
                    placeholder="Street address, landmark, etc."
                    value={deliveryForm.dropoffAddress}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, dropoffAddress: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                <div className="p-1 bg-blue-100 rounded">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                Item Details
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemDescription">Items to Deliver *</Label>
                  <Input
                    id="itemDescription"
                    placeholder="e.g., Cement (50 bags), Steel bars (100 pcs)"
                    value={deliveryForm.itemDescription}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, itemDescription: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedWeight">Estimated Weight</Label>
                  <Input
                    id="estimatedWeight"
                    placeholder="e.g., 2,500 kg"
                    value={deliveryForm.estimatedWeight}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, estimatedWeight: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                <div className="p-1 bg-purple-100 rounded">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                Schedule & Urgency
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="preferredDate">Preferred Date</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={deliveryForm.preferredDate}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="preferredTime">Preferred Time</Label>
                  <Select 
                    value={deliveryForm.preferredTime} 
                    onValueChange={(value) => setDeliveryForm(prev => ({ ...prev, preferredTime: value }))}
                  >
                    <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                      <SelectItem value="anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select 
                    value={deliveryForm.urgency} 
                    onValueChange={(value) => setDeliveryForm(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent (+20% fee)</SelectItem>
                      <SelectItem value="express">Express (+50% fee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special handling requirements, access instructions, contact person at site, etc."
                value={deliveryForm.specialInstructions}
                onChange={(e) => setDeliveryForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleDeliverySubmit}
              disabled={deliveryLoading}
            >
              {deliveryLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BuilderDashboard;
