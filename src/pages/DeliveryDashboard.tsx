import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardLoader } from "@/components/ui/DashboardLoader";
import { 
  Truck, 
  Package, 
  MapPin,
  Clock,
  DollarSign,
  Users,
  Star,
  CheckCircle,
  AlertCircle,
  Navigation as NavigationIcon,
  Plus,
  Eye,
  BarChart3,
  Bell,
  Settings,
  Calendar,
  Phone,
  TrendingUp,
  Route,
  Fuel,
  Timer,
  Moon,
  Sun,
  Camera,
  Trophy,
  Map,
  Zap,
  Headphones,
  LogOut
} from "lucide-react";
import { DeliveryCharts } from "@/components/delivery/DeliveryCharts";
import { DeliveryMap } from "@/components/delivery/DeliveryMap";
import { DeliveryPhotoProof } from "@/components/delivery/DeliveryPhotoProof";
import { DeliveryNotifications } from "@/components/delivery/DeliveryNotifications";
import { RouteOptimizer } from "@/components/delivery/RouteOptimizer";
import { DriverGamification } from "@/components/delivery/DriverGamification";
import { DeliveryRequestCard } from "@/components/delivery/DeliveryRequestCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryProviderData, logDataAccessAttempt } from "@/hooks/useDataIsolation";
import { MessageSquare, User, QrCode, Scan } from "lucide-react";
import { InAppCommunication } from "@/components/communication/InAppCommunication";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileViewDialog } from "@/components/profile/ProfileViewDialog";
import { ReceivingScanner } from "@/components/qr/ReceivingScanner";
import { ArrivalScanReminder } from "@/components/delivery/ArrivalScanReminder";

interface DashboardStats {
  totalDeliveries: number;
  completedToday: number;
  pendingDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  totalDistance: number;
}

interface ActiveDelivery {
  id: string;
  pickup_location: string;
  delivery_location: string;
  material_type: string;
  quantity: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  estimated_time: string;
  price: number;
  distance: number;
  urgency?: 'normal' | 'urgent' | 'emergency';
  special_instructions?: string;
  created_at?: string;
  purchase_order_id?: string; // Link to the order for QR scanning
}

interface DeliveryHistory {
  id: string;
  pickup_location: string;
  delivery_location: string;
  material_type: string;
  status: string;
  completed_at: string;
  price: number;
  rating: number;
}

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // NOTE: Role check is already done by RoleProtectedRoute in App.tsx
  // No need for duplicate verification here - this speeds up loading!
  
  // Use data isolation hook - ensures only THIS provider's data is fetched
  const {
    profile: isolatedProfile,
    activeDeliveries: isolatedActiveDeliveries,
    deliveryHistory: isolatedHistory,
    pendingRequests: isolatedPendingRequests,
    stats: isolatedStats,
    loading: dataLoading,
    error: dataError,
    refetch: refetchData,
    acceptDelivery: handleAcceptDelivery,
    rejectDelivery: handleRejectDelivery,
    updateDeliveryStatus
  } = useDeliveryProviderData();
  
  const [loading, setLoading] = useState(true);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalDeliveries: 0,
    completedToday: 0,
    pendingDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalDistance: 0
  });
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProofCapture, setShowProofCapture] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("deliveries");
  const [deliveriesSubTab, setDeliveriesSubTab] = useState("pending"); // Sub-tab for Deliveries (pending, scheduled, in_transit, delivered)
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [selectedDeliveryForScan, setSelectedDeliveryForScan] = useState<string | null>(null);
  const [showArrivalScanner, setShowArrivalScanner] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);

  // Chart data
  const [deliveryTrends, setDeliveryTrends] = useState([
    { date: 'Mon', deliveries: 12, completed: 10, earnings: 45000 },
    { date: 'Tue', deliveries: 15, completed: 14, earnings: 52000 },
    { date: 'Wed', deliveries: 8, completed: 8, earnings: 28000 },
    { date: 'Thu', deliveries: 18, completed: 16, earnings: 62000 },
    { date: 'Fri', deliveries: 22, completed: 20, earnings: 78000 },
    { date: 'Sat', deliveries: 25, completed: 23, earnings: 92000 },
    { date: 'Sun', deliveries: 10, completed: 9, earnings: 35000 }
  ]);

  const statusDistribution = [
    { name: 'Completed', value: 156, color: '#22c55e' },
    { name: 'In Transit', value: 3, color: '#f59e0b' },
    { name: 'Pending', value: 5, color: '#3b82f6' },
    { name: 'Cancelled', value: 2, color: '#ef4444' }
  ];

  const earningsData = [
    { day: 'Mon', earnings: 45000, deliveries: 12 },
    { day: 'Tue', earnings: 52000, deliveries: 15 },
    { day: 'Wed', earnings: 28000, deliveries: 8 },
    { day: 'Thu', earnings: 62000, deliveries: 18 },
    { day: 'Fri', earnings: 78000, deliveries: 22 },
    { day: 'Sat', earnings: 92000, deliveries: 25 },
    { day: 'Sun', earnings: 35000, deliveries: 10 }
  ];

  // Map locations
  const mapLocations = [
    { id: '1', type: 'pickup' as const, name: 'Bamburi Cement', address: 'Industrial Area, Nairobi', lat: -1.3028, lng: 36.8219, status: 'pending', estimatedTime: '15 min' },
    { id: '2', type: 'delivery' as const, name: 'Kilimani Site', address: 'Kilimani, Nairobi', lat: -1.2921, lng: 36.7858, status: 'in_transit', estimatedTime: '30 min' },
    { id: '3', type: 'delivery' as const, name: 'Karen Project', address: 'Karen, Nairobi', lat: -1.3197, lng: 36.7114, status: 'pending', estimatedTime: '45 min' }
  ];

  // Route optimizer deliveries
  const routeDeliveries = [
    { id: '1', name: 'Cement Delivery', address: 'Kilimani Construction Site', type: 'delivery' as const, priority: 'high' as const, estimatedTime: 30, distance: 8.5, timeWindow: { start: '09:00', end: '11:00' } },
    { id: '2', name: 'Steel Pickup', address: 'Steel Masters, Mombasa Road', type: 'pickup' as const, priority: 'urgent' as const, estimatedTime: 20, distance: 12, timeWindow: { start: '08:00', end: '10:00' } },
    { id: '3', name: 'Timber Delivery', address: 'Westlands Office Block', type: 'delivery' as const, priority: 'medium' as const, estimatedTime: 25, distance: 6 },
    { id: '4', name: 'Sand Delivery', address: 'Parklands Site', type: 'delivery' as const, priority: 'low' as const, estimatedTime: 35, distance: 10 }
  ];

  // Update local state when isolated data loads - ENSURES DATA ISOLATION
  useEffect(() => {
    if (isolatedProfile) {
      setProviderProfile(isolatedProfile);
    }
    if (isolatedStats) {
      setStats(isolatedStats);
    }
    // Transform active deliveries - ONLY THIS PROVIDER'S DELIVERIES
    if (isolatedActiveDeliveries && isolatedActiveDeliveries.length > 0) {
      const formattedActive: ActiveDelivery[] = isolatedActiveDeliveries.map((d: any) => ({
        id: d.id,
        pickup_location: d.pickup_location || d.pickup_address || 'N/A',
        delivery_location: d.delivery_location || d.delivery_address || 'N/A',
        material_type: d.material_type || d.item_description || 'Materials',
        quantity: d.quantity || d.estimated_weight || 'N/A',
        customer_name: d.builder_name || d.builder_email?.split('@')[0] || 'Customer',
        customer_phone: d.builder_phone || '+254 700 000 000',
        status: d.status,
        estimated_time: d.estimated_time || '30 mins',
        price: d.price || d.delivery_fee || d.estimated_cost || 0,
        distance: d.distance || 0,
        urgency: d.urgency,
        special_instructions: d.special_instructions,
        created_at: d.created_at
      }));
      setActiveDeliveries(formattedActive);
    }
    // Transform delivery history - ONLY THIS PROVIDER'S HISTORY
    if (isolatedHistory && isolatedHistory.length > 0) {
      const formattedHistory: DeliveryHistory[] = isolatedHistory.map((d: any) => ({
        id: d.id,
        pickup_location: d.pickup_location || d.pickup_address || 'N/A',
        delivery_location: d.delivery_location || d.delivery_address || 'N/A',
        material_type: d.material_type || d.item_description || 'Materials',
        status: d.status,
        completed_at: d.updated_at || d.completed_at || d.created_at,
        price: d.price || d.delivery_fee || d.estimated_cost || 0,
        rating: d.rating || 0
      }));
      setDeliveryHistory(formattedHistory);
    }
    // Set pending requests that this provider can accept
    if (isolatedPendingRequests) {
      setPendingRequests(isolatedPendingRequests);
    }
  }, [isolatedProfile, isolatedStats, isolatedActiveDeliveries, isolatedHistory, isolatedPendingRequests]);

  // Show UI immediately - don't wait for data
  // Use safety timeout to prevent infinite loading
  useEffect(() => {
    // Check if user is available from context
    if (user) {
      setLoading(false);
      return;
    }
    
    // Fallback: Check localStorage for auth
    const checkLocalAuth = () => {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.user?.id) {
            console.log('🚚 DeliveryDashboard: Found user in localStorage, showing UI');
            setLoading(false);
            return true;
          }
        }
      } catch (e) {}
      return false;
    };
    
    // Try localStorage immediately
    if (checkLocalAuth()) return;
    
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => {
      console.log('🚚 DeliveryDashboard: Safety timeout - forcing loading false');
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [user]);

  // Log data access for security audit
  useEffect(() => {
    if (user?.id) {
      logDataAccessAttempt(user.id, 'view', 'delivery_dashboard', true, 'Dashboard loaded');
    }
  }, [user?.id]);

  // Real-time subscription for new delivery requests
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscription for delivery requests...');
    
    const channel = supabase
      .channel('delivery-requests-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_requests'
        },
        (payload) => {
          console.log('🚚 New delivery request received:', payload);
          // Refresh data when new request comes in
          refetchData();
          toast({
            title: '🚚 New Delivery Request!',
            description: 'A new delivery job is available. Check Available Jobs.',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests'
        },
        (payload) => {
          console.log('📦 Delivery request updated:', payload);
          refetchData();
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up delivery requests subscription');
      supabase.removeChannel(channel);
    };
  }, [user, refetchData, toast]);

  // Function to load notification counts
  const loadNotificationCounts = useCallback(async () => {
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.access_token) accessToken = parsed.access_token;
        }
      } catch (e) {}

      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      };

      // Count only PENDING delivery requests
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?select=id,status&status=eq.pending`,
        { headers, cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        const pendingCount = data?.length || 0;
        
        setNotificationCount(pendingCount);
        setPendingNotificationCount(pendingCount);
        console.log('🔔 Notification counts loaded:', { pending: pendingCount });
      }
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  }, []);

  // Load notification counts for the Alerts tab badge
  useEffect(() => {
    loadNotificationCounts();
    
    // Set up real-time subscription to update counts when delivery_requests change
    const subscription = supabase
      .channel('alerts-count-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'delivery_requests' },
        () => {
          console.log('🔔 delivery_requests changed, refreshing counts...');
          loadNotificationCounts();
        }
      )
      .subscribe();
    
    // Also refresh every 30 seconds as backup
    const interval = setInterval(loadNotificationCounts, 30000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [loadNotificationCounts]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch provider profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setProviderProfile(profile);

        // Fetch real delivery stats - use provider_id (ACTUAL column name in database)
        const { data: deliveries, error: deliveriesError } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('provider_id', user.id);

        if (!deliveriesError && deliveries) {
          const today = new Date().toDateString();
          const completedToday = deliveries.filter(d => 
            d.status === 'delivered' && 
            d.delivered_at && new Date(d.delivered_at).toDateString() === today
          ).length;

          // Use estimated_cost from database, fallback to 2500
          const totalEarnings = deliveries
            .filter(d => d.status === 'delivered')
            .reduce((sum, d) => sum + (d.final_cost || d.estimated_cost || 2500), 0);

          setStats({
            totalDeliveries: deliveries.length,
            completedToday,
            pendingDeliveries: deliveries.filter(d => d.status === 'pending' || d.status === 'in_transit').length,
            totalEarnings,
            averageRating: 4.8, // Would come from reviews table
            totalDistance: 0 // No distance column in schema
          });

          // Set active deliveries - use ACTUAL database column names
          setActiveDeliveries(deliveries
            .filter(d => d.status !== 'delivered' && d.status !== 'cancelled')
            .map(d => ({
              id: d.id,
              pickup_location: d.pickup_location || d.pickup_address || 'N/A',
              delivery_location: d.dropoff_location || d.dropoff_address || 'N/A',
              material_type: d.item_description || 'Materials',
              quantity: d.estimated_weight || 'N/A',
              customer_name: d.builder_email?.split('@')[0] || 'Customer',
              customer_phone: '+254 700 000 000',
              status: d.status,
              estimated_time: '30 mins',
              price: d.estimated_cost || 2500,
              distance: 0,
              urgency: d.urgency || 'normal',
              special_instructions: d.special_instructions
            })));

          // Set delivery history - use ACTUAL database column names
          setDeliveryHistory(deliveries
            .filter(d => d.status === 'delivered')
            .map(d => ({
              id: d.id,
              pickup_location: d.pickup_location || d.pickup_address || 'N/A',
              delivery_location: d.dropoff_location || d.dropoff_address || 'N/A',
              material_type: d.item_description || 'Materials',
              status: d.status,
              completed_at: d.delivered_at || d.updated_at || d.created_at,
              price: d.final_cost || d.estimated_cost || 2500,
              rating: 5
            })));
        } else {
          // Fallback to placeholder data
          setStats({
            totalDeliveries: 156,
            completedToday: 8,
            pendingDeliveries: 3,
            totalEarnings: 245000,
            averageRating: 4.8,
            totalDistance: 2450
          });

          setActiveDeliveries([
            {
              id: 'DEL-001',
              pickup_location: 'Bamburi Cement Factory, Industrial Area',
              delivery_location: 'Kilimani Construction Site, Nairobi',
              material_type: 'Cement',
              quantity: '100 bags',
              customer_name: 'John Kamau',
              customer_phone: '+254 712 345 678',
              status: 'pending',
              estimated_time: '45 mins',
              price: 8500,
              distance: 15,
              urgency: 'urgent',
              special_instructions: 'Deliver to site entrance. Ask for foreman Peter.',
              created_at: new Date().toISOString()
            },
            {
              id: 'DEL-002',
              pickup_location: 'Steel Masters Kenya, Mombasa Road',
              delivery_location: 'Karen Villa Project, Karen',
              material_type: 'Steel Bars',
              quantity: '2 tons',
              customer_name: 'Mary Wanjiku',
              customer_phone: '+254 722 456 789',
              status: 'pending',
              estimated_time: '1 hour 30 mins',
              price: 12000,
              distance: 25,
              urgency: 'normal',
              created_at: new Date(Date.now() - 30 * 60000).toISOString()
            },
            {
              id: 'DEL-003',
              pickup_location: 'Nairobi Timber, Ngong Road',
              delivery_location: 'Westlands Office Block',
              material_type: 'Timber',
              quantity: '200 pieces',
              customer_name: 'Peter Ochieng',
              customer_phone: '+254 733 567 890',
              status: 'accepted',
              estimated_time: '2 hours',
              price: 6500,
              distance: 12,
              urgency: 'normal',
              created_at: new Date(Date.now() - 60 * 60000).toISOString()
            },
            {
              id: 'DEL-004',
              pickup_location: 'Industrial Area Depot',
              delivery_location: 'Lavington Mall Construction',
              material_type: 'Roofing Sheets',
              quantity: '50 sheets',
              customer_name: 'Grace Achieng',
              customer_phone: '+254 700 123 456',
              status: 'pending',
              estimated_time: '30 mins',
              price: 4500,
              distance: 8,
              urgency: 'emergency',
              special_instructions: 'URGENT: Rain expected. Deliver ASAP!',
              created_at: new Date(Date.now() - 5 * 60000).toISOString()
            }
          ]);

          setDeliveryHistory([
            {
              id: 'DEL-098',
              pickup_location: 'Industrial Area',
              delivery_location: 'Lavington',
              material_type: 'Roofing Sheets',
              status: 'completed',
              completed_at: new Date(Date.now() - 86400000).toISOString(),
              price: 5500,
              rating: 5
            },
            {
              id: 'DEL-097',
              pickup_location: 'Mombasa Road',
              delivery_location: 'Kileleshwa',
              material_type: 'Sand',
              status: 'completed',
              completed_at: new Date(Date.now() - 172800000).toISOString(),
              price: 4500,
              rating: 4
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'pending_pickup': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'pending_pickup': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Exit dashboard - goes back to home page, stays logged in
  const handleExitDashboard = () => {
    console.log('🚪 Exit Dashboard: Redirecting to home...');
    window.location.href = '/home';
  };

  if (loading) {
    return <DashboardLoader type="delivery" />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-teal-50 via-white to-cyan-50'}`}>
      {/* Navigation hidden in dashboard - use Exit Dashboard to access main navigation */}

      {/* Hero Section */}
      <section className={`${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-teal-600 to-cyan-600'} text-white py-8`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Truck className="h-8 w-8" />
                Delivery Dashboard
              </h1>
              <p className="text-teal-100 mt-1">
                Welcome back, {providerProfile?.full_name || providerProfile?.company_name || 'Driver'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Dark Mode Toggle */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                />
                <Moon className="h-4 w-4" />
              </div>
              
              {/* Online/Offline Toggle */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/20 h-6 px-2"
                  onClick={() => setIsOnline(!isOnline)}
                >
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </Button>
              </div>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowProfileView(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={handleExitDashboard}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Deliveries</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalDeliveries}</p>
                </div>
                <div className="p-3 bg-teal-100 rounded-full">
                  <Truck className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.completedToday}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingDeliveries}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Earnings</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.averageRating}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Distance</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalDistance} km</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Route className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card-Style Navigation - Reorganized with Deliveries button */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-8">
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'deliveries' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => {
              setActiveTab('deliveries');
              setDeliveriesSubTab('pending'); // Default to pending when opening Deliveries
            }}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs font-medium">Deliveries</span>
            {(pendingRequests.length > 0 || activeDeliveries.length > 0) && (
              <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-white">
                {pendingRequests.length + activeDeliveries.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'map' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('map')}
          >
            <Map className="h-5 w-5" />
            <span className="text-xs font-medium">Map</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'scanning' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('scanning')}
          >
            <Scan className="h-5 w-5" />
            <span className="text-xs font-medium">Scan QR</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Analytics</span>
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all relative ${
              activeTab === 'notifications' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs font-medium">Alerts</span>
            {pendingNotificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-red-500 text-white animate-pulse">{pendingNotificationCount}</Badge>
            )}
          </Button>
          <Button 
            variant="ghost"
            className={`h-auto py-3 px-2 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'support' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300' 
                : isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm'
            }`}
            onClick={() => setActiveTab('support')}
          >
            <Headphones className="h-5 w-5" />
            <span className="text-xs font-medium">Support</span>
          </Button>
        </div>

        {/* Main Content Tabs - Hidden TabsList, controlled by card buttons above */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="scanning">Scanning</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab with Sub-tabs */}
          <TabsContent value="deliveries">
            <div className="space-y-4">
              {/* Sub-tabs for Deliveries */}
              <Tabs value={deliveriesSubTab} onValueChange={setDeliveriesSubTab} className="w-full">
                <TabsList className={`grid w-full grid-cols-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                    {pendingRequests.length > 0 && (
                      <Badge className="ml-1 bg-yellow-500 text-white text-xs">{pendingRequests.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="scheduled" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scheduled
                    {activeDeliveries.filter(d => d.status === 'assigned' || d.status === 'accepted').length > 0 && (
                      <Badge className="ml-1 bg-blue-500 text-white text-xs">
                        {activeDeliveries.filter(d => d.status === 'assigned' || d.status === 'accepted').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="in_transit" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    In Transit
                    {activeDeliveries.filter(d => d.status === 'in_transit').length > 0 && (
                      <Badge className="ml-1 bg-purple-500 text-white text-xs">
                        {activeDeliveries.filter(d => d.status === 'in_transit').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="delivered" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Delivered
                    {deliveryHistory.length > 0 && (
                      <Badge className="ml-1 bg-green-500 text-white text-xs">{deliveryHistory.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Pending Sub-tab - Orders not yet assigned */}
                <TabsContent value="pending" className="mt-4">
                  <div className="space-y-4">
                    {/* Available Requests Section - From Database */}
                    {pendingRequests.length > 0 ? (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            🚚 Available Delivery Jobs ({pendingRequests.length})
                          </h3>
                          <Badge className="bg-green-100 text-green-800 ml-2">First-Come-First-Served</Badge>
                        </div>
                        <Alert className="mb-4 bg-green-50 border-green-200">
                          <Zap className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">
                            These are new delivery requests from builders. Accept quickly - first provider to accept gets the job!
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-4">
                          {pendingRequests.map((request) => (
                            <DeliveryRequestCard
                              key={request.id}
                              delivery={{
                                id: request.id,
                                pickup_location: request.pickup_address || request.pickup_location || 'Pickup location',
                                delivery_location: request.delivery_address || request.delivery_location || 'Delivery location',
                                material_type: request.material_type || 'Construction Materials',
                                quantity: request.quantity?.toString() || 'N/A',
                                customer_name: request.builder_name || request.contact_name || 'Builder',
                                customer_phone: request.builder_phone || request.contact_phone || '',
                                status: 'pending',
                                estimated_time: '30 mins',
                                price: request.estimated_cost || request.budget_range || 0,
                                distance: request.distance_km || 0,
                                urgency: request.priority_level || request.urgency || 'normal',
                                special_instructions: request.special_instructions,
                                created_at: request.created_at,
                                pickup_date: request.pickup_date,
                                delivery_date: request.delivery_date,
                                expected_delivery_date: request.expected_delivery_date
                              }}
                              isDarkMode={isDarkMode}
                              onAccept={async (id) => {
                                const result = await handleAcceptDelivery(id);
                                if (result.success) {
                                  toast({
                                    title: "✅ Delivery Accepted!",
                                    description: "You got the job! Navigate to pickup location.",
                                  });
                                  refetchData();
                                } else {
                                  toast({
                                    title: "❌ Could not accept",
                                    description: result.error || "Someone else may have accepted this delivery.",
                                    variant: "destructive"
                                  });
                                  refetchData();
                                }
                              }}
                              onReject={(id) => {
                                handleRejectDelivery(id);
                                toast({
                                  title: "Delivery Declined",
                                  description: "This delivery has been removed from your list.",
                                });
                              }}
                              onNavigate={(delivery) => console.log('Navigate to:', delivery)}
                              onCall={(phone) => phone && window.open(`tel:${phone}`)}
                              onCaptureProof={(id) => setShowProofCapture(id)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                        <CardContent className="py-12 text-center">
                          <Clock className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No pending delivery requests</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>New requests will appear here when available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Scheduled Sub-tab - Orders allocated for delivery */}
                <TabsContent value="scheduled" className="mt-4">
                  <div className="space-y-4">
                    {activeDeliveries.filter(d => d.status === 'assigned' || d.status === 'accepted').length > 0 ? (
                      <div className="space-y-4">
                        {activeDeliveries
                          .filter(d => d.status === 'assigned' || d.status === 'accepted')
                          .sort((a, b) => {
                            const urgencyOrder = { emergency: 0, urgent: 1, normal: 2 };
                            return (urgencyOrder[a.urgency || 'normal'] || 2) - (urgencyOrder[b.urgency || 'normal'] || 2);
                          })
                          .map((delivery) => (
                            <DeliveryRequestCard
                              key={delivery.id}
                              delivery={delivery}
                              isDarkMode={isDarkMode}
                              onNavigate={(delivery) => console.log('Navigate to:', delivery)}
                              onCall={(phone) => window.open(`tel:${phone}`)}
                              onCaptureProof={(id) => setShowProofCapture(id)}
                            />
                          ))}
                      </div>
                    ) : (
                      <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                        <CardContent className="py-12 text-center">
                          <Calendar className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No scheduled deliveries</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Accepted deliveries will appear here</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* In Transit Sub-tab - Orders currently on their way */}
                <TabsContent value="in_transit" className="mt-4">
                  <div className="space-y-4">
                    {activeDeliveries.filter(d => d.status === 'in_transit').length > 0 ? (
                      <div className="space-y-4">
                        {activeDeliveries
                          .filter(d => d.status === 'in_transit')
                          .map((delivery) => (
                            <div key={delivery.id} className="space-y-3">
                              <DeliveryRequestCard
                                delivery={delivery}
                                isDarkMode={isDarkMode}
                                onNavigate={(delivery) => console.log('Navigate to:', delivery)}
                                onCall={(phone) => window.open(`tel:${phone}`)}
                                onCaptureProof={(id) => setShowProofCapture(id)}
                                onMarkArrived={(id) => {
                                  setSelectedDeliveryForScan(id);
                                  toast({
                                    title: "📍 Arrival Confirmed",
                                    description: "Please scan all materials to complete the delivery.",
                                  });
                                }}
                              />
                              {/* Arrival Scan Reminder */}
                              {selectedDeliveryForScan === delivery.id && (
                                <ArrivalScanReminder
                                  deliveryId={delivery.id}
                                  orderId={delivery.purchase_order_id}
                                  isDarkMode={isDarkMode}
                                  onNavigateToScanner={() => {
                                    setSelectedDeliveryForScan(delivery.id);
                                    setActiveTab('scanning');
                                  }}
                                  onScanComplete={() => {
                                    toast({
                                      title: "🎉 Delivery Complete!",
                                      description: "All items have been scanned and confirmed.",
                                    });
                                    setSelectedDeliveryForScan(null);
                                    refetchData();
                                  }}
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                        <CardContent className="py-12 text-center">
                          <Truck className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No deliveries in transit</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Active deliveries will appear here when in transit</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Delivered Sub-tab - Successfully delivered orders */}
                <TabsContent value="delivered" className="mt-4">
                  <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className={isDarkMode ? 'text-white' : ''}>Delivery History</CardTitle>
                          <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                            Your past deliveries • Most recent first • {deliveryHistory.length} total
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetchData()}>
                          <Clock className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {deliveryHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            No delivery history yet
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Your completed deliveries will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {[...deliveryHistory]
                            .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                            .map((delivery, index) => {
                              const completedDate = new Date(delivery.completed_at);
                              const isToday = completedDate.toDateString() === new Date().toDateString();
                              const isYesterday = completedDate.toDateString() === new Date(Date.now() - 86400000).toDateString();
                              
                              return (
                                <div key={delivery.id} className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'} transition-colors border-l-4 ${index === 0 ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`p-2 ${isDarkMode ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-sm`}>
                                      <CheckCircle className="h-8 w-8 text-green-500" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{delivery.material_type}</p>
                                        {index === 0 && (
                                          <Badge className="bg-green-100 text-green-700 text-xs">Most Recent</Badge>
                                        )}
                                      </div>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <MapPin className="h-3 w-3 inline mr-1" />
                                        {delivery.pickup_location} → {delivery.delivery_location}
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        {isToday ? 'Today' : isYesterday ? 'Yesterday' : completedDate.toLocaleDateString('en-US', { 
                                          weekday: 'short', 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: completedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                        })}
                                        {' at '}
                                        {completedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(delivery.price)}</p>
                                      <Badge variant="outline" className={`text-xs ${
                                        delivery.status === 'delivered' || delivery.status === 'completed' 
                                          ? 'border-green-300 text-green-600' 
                                          : delivery.status === 'cancelled' 
                                            ? 'border-red-300 text-red-600' 
                                            : 'border-gray-300 text-gray-600'
                                      }`}>
                                        {delivery.status === 'delivered' || delivery.status === 'completed' ? '✓ Completed' : delivery.status}
                                      </Badge>
                                    </div>
                                    {delivery.rating > 0 && (
                                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                        <span className={`font-medium text-amber-700`}>{delivery.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Schedule Tab - REMOVED (now part of Deliveries) */}
          <TabsContent value="schedule" className="hidden">
            <div className="space-y-6">
              {/* Today's Summary */}
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                    <Calendar className="h-5 w-5 text-teal-500" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                      <p className={`text-2xl font-bold text-green-600`}>{stats.completedToday}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed Today</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                      <p className={`text-2xl font-bold text-yellow-600`}>{stats.pendingDeliveries}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <p className={`text-2xl font-bold text-blue-600`}>{activeDeliveries.length}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Optimizer */}
              <RouteOptimizer 
                deliveries={routeDeliveries}
                onRouteOptimized={(route) => console.log('Optimized route:', route)}
                onStartNavigation={(stop) => console.log('Start navigation to:', stop)}
              />
            </div>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <DeliveryMap 
              locations={mapLocations}
              driverLocation={{ lat: -1.2864, lng: 36.8172 }}
              onNavigate={(location) => console.log('Navigate to:', location)}
              onRefresh={() => console.log('Refresh map')}
            />
          </TabsContent>

          {/* History Tab - REMOVED (now part of Deliveries > Delivered) */}
          <TabsContent value="history" className="hidden">

          {/* Analytics Tab - Includes Earnings and Achievements */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Earnings Charts */}
              <DeliveryCharts 
                deliveryTrends={deliveryTrends}
                statusDistribution={statusDistribution}
                earningsData={earningsData}
              />
              
              {/* Achievements Section */}
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Achievements & Rewards
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    Track your progress and unlock rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DriverGamification 
                    driverId={user?.id || ''}
                    driverName={providerProfile?.full_name || user?.email?.split('@')[0] || 'Driver'}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <DeliveryNotifications 
              userId={user?.id || localStorage.getItem('user_id') || ''}
              onNotificationClick={(notification) => console.log('Notification clicked:', notification)}
              onAcceptDelivery={(requestId) => {
                console.log('🔔 Delivery accepted, refreshing counts...');
                // Refresh notification counts immediately
                loadNotificationCounts();
                // Also refresh main data
                refetchData();
              }}
            />
          </TabsContent>

          {/* Scanning Tab */}
          <TabsContent value="scanning">
            <div className="space-y-6">
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                    <QrCode className="h-5 w-5 text-green-500" />
                    Delivery Receiving Scanner
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>
                    Scan QR codes when receiving materials from suppliers and delivering to customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Receiving Scanner - For delivery providers */}
                  <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'border-green-800 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Scan className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : ''}`}>Receiving Scanner</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Scan to confirm material pickup and delivery
                        </p>
                      </div>
                    </div>
                    <ReceivingScanner />
                  </div>

                  {/* Scanning Instructions */}
                  <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : ''}`}>📋 How to Use the Scanner</h4>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                        <p className={`font-medium text-green-600 mb-2 flex items-center gap-2`}>
                          <Package className="h-4 w-4" />
                          When Picking Up from Supplier:
                        </p>
                        <ol className={`list-decimal list-inside space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>Arrive at supplier location</li>
                          <li>Verify materials match the order</li>
                          <li>Scan QR code on package/invoice</li>
                          <li>Check material condition</li>
                          <li>Confirm pickup in app</li>
                        </ol>
                      </div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
                        <p className={`font-medium text-teal-600 mb-2 flex items-center gap-2`}>
                          <Truck className="h-4 w-4" />
                          When Delivering to Customer:
                        </p>
                        <ol className={`list-decimal list-inside space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>Arrive at delivery location</li>
                          <li>Hand over materials to customer</li>
                          <li>Scan QR code for delivery proof</li>
                          <li>Get customer signature if needed</li>
                          <li>Take photo proof of delivery</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <div className="space-y-6">
              {/* In-App Communication */}
              {user && (
                <InAppCommunication
                  userId={user.id}
                  userName={providerProfile?.company_name || providerProfile?.full_name || user.email || 'Driver'}
                  userRole="delivery_provider"
                  isDarkMode={isDarkMode}
                />
              )}

              {/* Quick Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={isDarkMode ? 'bg-teal-900/20 border-teal-800' : 'bg-teal-50 border-teal-200'}>
                  <CardContent className="p-4">
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                      <Clock className="h-4 w-4 text-teal-500" />
                      Support Hours
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Mon - Fri: 8AM - 6PM<br />
                      Saturday: 9AM - 4PM<br />
                      Sunday: Closed
                    </p>
                  </CardContent>
                </Card>
                <Card className={isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}>
                  <CardContent className="p-4">
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                      <Phone className="h-4 w-4 text-purple-500" />
                      Driver Hotline
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Call: +254 700 000 000<br />
                      Email: drivers@UjenziXform.co.ke
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Photo Proof Modal */}
        {showProofCapture && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-lg w-full">
              <DeliveryPhotoProof
                deliveryId={showProofCapture}
                deliveryType="delivery"
                customerName={activeDeliveries.find(d => d.id === showProofCapture)?.customer_name || 'Customer'}
                onComplete={(proof) => {
                  console.log('Proof captured:', proof);
                  setShowProofCapture(null);
                }}
              />
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setShowProofCapture(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <Alert className={`mt-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-teal-50 border-teal-200'}`}>
          <Zap className={`h-4 w-4 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
          <AlertDescription className={isDarkMode ? 'text-gray-300' : ''}>
            <strong>Pro Tip:</strong> Complete more deliveries during peak hours (6AM-9AM and 4PM-7PM) to maximize your earnings. 
            Maintain a high rating by being punctual and communicating with customers.
          </AlertDescription>
        </Alert>
      </main>

      <Footer />

      {/* Profile View Dialog */}
      <ProfileViewDialog
        isOpen={showProfileView}
        onClose={() => setShowProfileView(false)}
        onEditProfile={() => {
          setShowProfileView(false);
          setShowProfileEdit(true);
        }}
        onExitDashboard={handleExitDashboard}
        userRole="delivery_provider"
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh data after profile save
          refetchData();
        }}
        userRole="delivery_provider"
      />
    </div>
  );
};

export default DeliveryDashboard;
