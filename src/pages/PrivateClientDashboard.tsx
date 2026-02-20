import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CreditCard, 
  Home,
  LogOut,
  User,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Heart,
  Headphones,
  MessageSquare,
  Video,
  Camera,
  Send,
  MapPin,
  Calendar,
  Plus,
  XCircle,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import DeliveryRequest from "@/components/DeliveryRequest";
import { DeliveryPromptDialog } from "@/components/builders/DeliveryPromptDialog";
import { MonitoringServicePrompt } from "@/components/builders/MonitoringServicePrompt";
import { TrackingTab } from "@/components/tracking/TrackingTab";
import { BuilderOrdersTracker } from "@/components/builders/BuilderOrdersTracker";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { Navigation as NavigationIcon, QrCode, Settings } from "lucide-react";

interface Order {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: string;
  project_name: string;
  items: any[];
}

interface DeliveryRequest {
  id: string;
  tracking_number?: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  material_type: string;
  quantity: number;
  weight_kg?: number;
  created_at: string;
  purchase_order_id?: string;
  provider_name?: string;
  estimated_delivery?: string;
}

const PrivateClientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
  // Delivery and Monitoring prompts state
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [showMonitoringServicePrompt, setShowMonitoringServicePrompt] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [monitoringRequest, setMonitoringRequest] = useState({
    projectName: '',
    projectLocation: '',
    projectDescription: '',
    preferredStartDate: '',
    numberOfCameras: '1',
    additionalNotes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [monitoringRequests, setMonitoringRequests] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set loading false after 3 seconds max to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    checkAuth().finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
    
    return () => clearTimeout(timeout);
  }, []);

  // Immediate data loader - runs on mount for orders and monitoring
  useEffect(() => {
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

    const loadData = async () => {
      // Get user ID from localStorage first (fastest)
      let userId = '';
      let accessToken = '';
      
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id || '';
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      if (!userId) {
        console.log('📦 DIRECT: No user ID in localStorage');
        return;
      }
      
      console.log('📦 DIRECT: Loading data for user:', userId);
      
      // Fetch orders directly
      try {
        const ordersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${userId}&order=created_at.desc`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken || ANON_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log('📦 DIRECT: Got', ordersData?.length || 0, 'orders');
          if (ordersData && ordersData.length > 0) {
            console.log('📦 DIRECT: First order:', ordersData[0].po_number, ordersData[0].status);
            setOrders(ordersData);
            
            // Calculate stats
            const totalOrders = ordersData.length;
            const pendingOrders = ordersData.filter((o: Order) => 
              o.status === 'pending' || o.status === 'quoted' || o.status === 'processing'
            ).length;
            const completedOrders = ordersData.filter((o: Order) => 
              o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed'
            ).length;
            const totalSpent = ordersData
              .filter((o: Order) => o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed')
              .reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);

            setStats({
              totalOrders,
              pendingOrders,
              completedOrders,
              totalSpent,
            });
          } else {
            console.log('📦 DIRECT: No orders found for this user');
          }
        } else {
          console.log('📦 DIRECT: Orders response status:', ordersResponse.status);
        }
      } catch (e) {
        console.error('📦 DIRECT: Orders error:', e);
      }
      
      // Fetch monitoring requests
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/monitoring_service_requests?user_id=eq.${userId}&order=created_at.desc`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken || ANON_KEY}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('📹 DIRECT: Got', data?.length || 0, 'monitoring requests');
          if (data && data.length > 0) {
            console.log('📹 DIRECT: First request:', data[0].project_name, data[0].status);
          }
          setMonitoringRequests(data || []);
        } else {
          console.log('📹 DIRECT: Response status:', response.status);
        }
      } catch (e) {
        console.error('📹 DIRECT: Error:', e);
      }
      
      // Fetch deliveries directly - try multiple approaches
      try {
        console.log('🚚 DIRECT: Fetching deliveries for user:', userId);
        let allDeliveries: any[] = [];
        
        // Approach 1: Query by user_id
        try {
          const deliveryResponse1 = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?user_id=eq.${userId}&order=created_at.desc`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken || ANON_KEY}`,
              }
            }
          );
          
          if (deliveryResponse1.ok) {
            const data1 = await deliveryResponse1.json();
            console.log('🚚 DIRECT: By user_id:', data1?.length || 0);
            allDeliveries = [...(data1 || [])];
          }
        } catch (e1) {
          console.log('🚚 DIRECT: user_id query failed');
        }
        
        // Approach 2: Query by builder_id (same as user_id for most cases)
        try {
          const deliveryResponse2 = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?builder_id=eq.${userId}&order=created_at.desc`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken || ANON_KEY}`,
              }
            }
          );
          
          if (deliveryResponse2.ok) {
            const data2 = await deliveryResponse2.json();
            console.log('🚚 DIRECT: By builder_id:', data2?.length || 0);
            // Merge without duplicates
            const existingIds = new Set(allDeliveries.map(d => d.id));
            (data2 || []).forEach((d: any) => {
              if (!existingIds.has(d.id)) {
                allDeliveries.push(d);
              }
            });
          }
        } catch (e2) {
          console.log('🚚 DIRECT: builder_id query failed');
        }
        
        // Sort by created_at descending
        allDeliveries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log('🚚 DIRECT: Total deliveries:', allDeliveries.length);
        if (allDeliveries.length > 0) {
          console.log('🚚 DIRECT: First delivery:', allDeliveries[0].id, allDeliveries[0].status);
          setDeliveries(allDeliveries);
        }
      } catch (e) {
        console.error('🚚 DIRECT: Deliveries error:', e);
      }
    };
    
    loadData();
    // Retry after 2 seconds in case session wasn't ready
    const retryTimeout = setTimeout(loadData, 2000);
    
    return () => clearTimeout(retryTimeout);
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Don't redirect - RoleProtectedRoute handles this
        setLoading(false);
        return;
      }

      setUser(user);

      // Get profile - try user_id first (RLS policy uses user_id), fallback to id
      const { data: profileByUserId } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileByUserId) {
        setProfile(profileByUserId);
      } else {
        // Fallback to id column or use auth metadata
        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileById) {
          setProfile(profileById);
        } else {
          // Use auth user metadata as fallback
          setProfile({
            id: user.id,
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
            phone: user.user_metadata?.phone || '',
            company_name: user.user_metadata?.company_name || '',
            county: user.user_metadata?.county || '',
          });
        }
      }

      // Verify role - but don't block if role check fails
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Only redirect if we KNOW they have a different role
        if (roleData?.role && roleData.role !== 'private_client' && roleData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "This dashboard is for Private Builders only.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
      } catch (roleError) {
        console.error('Role check error (non-blocking):', roleError);
        // Continue anyway - localStorage already verified role
      }

      // Fetch real orders from purchase_orders table using direct REST API
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token for authenticated request
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}

      console.log('📦 Fetching orders for user:', user.id);
      
      try {
        const ordersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${user.id}&order=created_at.desc`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken || ANON_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log('📦 Private client orders loaded:', ordersData?.length || 0, ordersData);
          
          const fetchedOrders = ordersData || [];
          setOrders(fetchedOrders);
          console.log('📦 Orders set to state:', fetchedOrders.length);
          
          // Calculate real stats from orders
          const totalOrders = fetchedOrders.length;
          const pendingOrders = fetchedOrders.filter((o: Order) => 
            o.status === 'pending' || o.status === 'quoted' || o.status === 'processing'
          ).length;
          const completedOrders = fetchedOrders.filter((o: Order) => 
            o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed'
          ).length;
          const totalSpent = fetchedOrders
            .filter((o: Order) => o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed')
            .reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);

          setStats({
            totalOrders,
            pendingOrders,
            completedOrders,
            totalSpent,
          });
          
          console.log('📦 Private client stats:', { totalOrders, pendingOrders, completedOrders, totalSpent });
        } else {
          console.error('📦 Orders fetch failed:', ordersResponse.status, await ordersResponse.text());
        }
      } catch (ordersError) {
        console.error('📦 Error fetching orders:', ordersError);
      }

      // Fetch delivery requests for this user using direct REST API
      // Try multiple query approaches: user_id and builder_id
      console.log('🚚 Fetching deliveries for user:', user.id);
      
      try {
        let allDeliveries: any[] = [];
        
        // Approach 1: Query by user_id
        try {
          const deliveryResponse1 = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?user_id=eq.${user.id}&order=created_at.desc`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken || ANON_KEY}`,
                'Content-Type': 'application/json',
              }
            }
          );

          if (deliveryResponse1.ok) {
            const data1 = await deliveryResponse1.json();
            console.log('🚚 Deliveries by user_id:', data1?.length || 0);
            allDeliveries = [...(data1 || [])];
          } else {
            console.log('🚚 user_id query status:', deliveryResponse1.status);
          }
        } catch (e1) {
          console.log('🚚 user_id query error:', e1);
        }

        // Approach 2: Query by builder_id (same as user.id for most cases)
        try {
          const deliveryResponse2 = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?builder_id=eq.${user.id}&order=created_at.desc`,
            {
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken || ANON_KEY}`,
                'Content-Type': 'application/json',
              }
            }
          );

          if (deliveryResponse2.ok) {
            const data2 = await deliveryResponse2.json();
            console.log('🚚 Deliveries by builder_id:', data2?.length || 0);
            // Merge without duplicates
            const existingIds = new Set(allDeliveries.map(d => d.id));
            (data2 || []).forEach((d: any) => {
              if (!existingIds.has(d.id)) {
                allDeliveries.push(d);
              }
            });
          } else {
            console.log('🚚 builder_id query status:', deliveryResponse2.status);
          }
        } catch (e2) {
          console.log('🚚 builder_id query error:', e2);
        }

        // Sort by created_at descending
        allDeliveries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Only update if we found deliveries OR if we haven't loaded any yet
        if (allDeliveries.length > 0) {
          setDeliveries(allDeliveries);
          console.log('🚚 Total deliveries loaded:', allDeliveries.length);
        } else {
          console.log('🚚 No deliveries found for this user');
        }
        
        if (allDeliveries.length > 0) {
          console.log('🚚 First delivery:', allDeliveries[0].id, allDeliveries[0].status);
        }
      } catch (deliveryError) {
        console.error('🚚 Error fetching deliveries:', deliveryError);
        
        // Fallback to Supabase client
        try {
          const { data: deliveryData, error } = await supabase
            .from('delivery_requests')
            .select('*')
            .or(`user_id.eq.${user.id},builder_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (!error && deliveryData) {
            setDeliveries(deliveryData);
            console.log('🚚 Fallback deliveries loaded:', deliveryData.length);
          }
        } catch (e) {
          console.error('🚚 Fallback also failed:', e);
        }
      }

      // Fetch monitoring requests using REST API for reliability
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token || '';
        
        console.log('📹 Fetching monitoring requests for user:', user.id);
        
        const response = await fetch(
          `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/monitoring_service_requests?user_id=eq.${user.id}&order=created_at.desc`,
          {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo',
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('📹 Monitoring requests loaded:', data?.length || 0, 'requests');
          if (data && data.length > 0) {
            console.log('📹 First request status:', data[0].status, 'access_code:', data[0].access_code);
            setMonitoringRequests(data);
          }
        } else {
          console.log('📹 Monitoring requests fetch failed:', response.status);
          // Fallback to Supabase client
          const { data: monitoringData, error: monitoringError } = await supabase
            .from('monitoring_service_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (monitoringError) {
            console.log('📹 Supabase fallback error:', monitoringError.message);
          } else if (monitoringData) {
            setMonitoringRequests(monitoringData);
          }
        }
      } catch (e) {
        console.error('📹 Error fetching monitoring requests:', e);
      }

    } catch (error) {
      console.error('Auth error:', error);
      // Don't redirect on error - just show the dashboard with empty data
      setLoading(false);
    }
  };

  const handleMonitoringRequest = async () => {
    if (!monitoringRequest.projectName || !monitoringRequest.projectLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in the project name and location.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingRequest(true);
    try {
      const { error } = await supabase
        .from('monitoring_service_requests')
        .insert({
          user_id: user.id,
          contact_name: profile?.full_name || user?.email?.split('@')[0] || 'User',
          contact_email: user?.email || '',
          contact_phone: profile?.phone || 'N/A',
          project_name: monitoringRequest.projectName,
          project_location: monitoringRequest.projectLocation,
          selected_services: ['cctv'],
          camera_count: parseInt(monitoringRequest.numberOfCameras) || 1,
          special_requirements: monitoringRequest.projectDescription || null,
          additional_notes: monitoringRequest.additionalNotes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: "Your monitoring service request has been sent to admin for review.",
      });

      setMonitoringDialogOpen(false);
      setMonitoringRequest({
        projectName: '',
        projectLocation: '',
        projectDescription: '',
        preferredStartDate: '',
        numberOfCameras: '1',
        additionalNotes: ''
      });

      // Refresh monitoring requests
      const { data: newData } = await supabase
        .from('monitoring_service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (newData) setMonitoringRequests(newData);

    } catch (error: any) {
      console.error('Error submitting monitoring request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Exit dashboard - goes back to home page, stays logged in
  const handleExitDashboard = () => {
    console.log('🚪 Exit Dashboard: Redirecting to home...');
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {profile?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-green-100">Private Builder Dashboard</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/suppliers?from=dashboard">
                <Button className="bg-white text-green-700 hover:bg-green-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shop Materials
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="bg-white/20 border-white text-white hover:bg-white/30 font-medium"
                onClick={() => setShowProfileEdit(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/20 border-white text-white hover:bg-white/30 font-medium"
                onClick={handleExitDashboard}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exit Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto max-w-7xl px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">KES {stats.totalSpent.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          {/* Responsive Tabs - Scrollable on mobile, wrapped on larger screens */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <TabsList className="bg-white shadow-sm border inline-flex md:flex md:flex-wrap h-auto gap-1 p-1 min-w-max md:min-w-0">
              <TabsTrigger 
                value="orders" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="My Orders"
              >
                <Package className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Orders</span>
                <span className="xs:hidden sm:hidden">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="order-tracking" 
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="QR Scan Status"
              >
                <QrCode className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">QR Status</span>
              </TabsTrigger>
              <TabsTrigger 
                value="deliveries" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Deliveries"
              >
                <Truck className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Deliveries</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracking" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Tracking"
              >
                <NavigationIcon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Tracking</span>
              </TabsTrigger>
              <TabsTrigger 
                value="request-delivery" 
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Request Delivery"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Request</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Payments"
              >
                <CreditCard className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="wishlist" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Wishlist"
              >
                <Heart className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Wishlist</span>
              </TabsTrigger>
              <TabsTrigger 
                value="monitoring" 
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Monitoring"
              >
                <Video className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Monitor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:gap-2"
                title="Support"
              >
                <Headphones className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Support</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Recent Orders
                </CardTitle>
                <CardDescription>Track and manage your material orders</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No orders yet</p>
                    <p className="text-sm mb-4">Start shopping for construction materials</p>
                    <Link to="/suppliers?from=dashboard">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Browse Materials
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">Showing {orders.length} orders</p>
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                Order #{order.po_number}
                              </span>
                              <Badge 
                                className={
                                  order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'pending' || order.status === 'quoted' ? 'bg-amber-100 text-amber-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {order.project_name || 'Purchase Order'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {Array.isArray(order.items) ? order.items.length : 0} item(s)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              KES {(order.total_amount || 0).toLocaleString()}
                            </p>
                            <div className="flex flex-col gap-1 mt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: `Order #${order.po_number}`,
                                    description: `Status: ${order.status}. Items: ${Array.isArray(order.items) ? order.items.map((i: any) => i.material_name).join(', ') : 'N/A'}`,
                                  });
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                              {/* Request Delivery Button - only for confirmed/pending orders */}
                              {(order.status === 'confirmed' || order.status === 'pending' || order.status === 'quoted') && (
                                <Button 
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setSelectedOrderForDelivery(order);
                                    setShowDeliveryPrompt(true);
                                  }}
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  Request Delivery
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Order Items Preview */}
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">Items:</p>
                            <div className="flex flex-wrap gap-2">
                              {order.items.slice(0, 3).map((item: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.material_name || item.name} × {item.quantity}
                                </Badge>
                              ))}
                              {order.items.length > 3 && (
                                <Badge variant="outline" className="text-xs bg-gray-50">
                                  +{order.items.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Scan Status Tab - Shows dispatch and receive scan status */}
          <TabsContent value="order-tracking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-cyan-600" />
                  QR Code Scan Status
                </CardTitle>
                <CardDescription>
                  Track when your materials are dispatched by the supplier and received at your location. 
                  Each item has a unique QR code that gets scanned at dispatch and delivery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Get builderId with localStorage fallback
                  let builderId = user?.id || '';
                  if (!builderId) {
                    try {
                      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        builderId = parsed.user?.id || '';
                      }
                    } catch (e) {}
                    // Also check other localStorage keys
                    if (!builderId) {
                      builderId = localStorage.getItem('user_id') || '';
                    }
                  }
                  
                  return builderId ? (
                    <BuilderOrdersTracker builderId={builderId} />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Loading...</p>
                      <p className="text-sm">Please wait while we load your order tracking data</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  My Deliveries
                </CardTitle>
                <CardDescription>Track your delivery requests - one delivery per order</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No deliveries yet</p>
                    <p className="text-sm">Request delivery from your orders to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveries.map((delivery) => {
                      // Find the associated order for this delivery
                      const associatedOrder = orders.find(o => o.id === delivery.purchase_order_id);
                      const itemCount = associatedOrder?.items?.length || delivery.quantity || 1;
                      
                      return (
                        <div key={delivery.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Truck className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {delivery.tracking_number || `Delivery #${delivery.id.slice(0, 8)}`}
                                </span>
                                <Badge 
                                  className={
                                    delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    delivery.status === 'in_transit' || delivery.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                    delivery.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                    delivery.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1).replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              {/* Material Info */}
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium text-gray-700">
                                    {delivery.material_type || 'Construction Materials'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {itemCount} item{itemCount > 1 ? 's' : ''} 
                                  {delivery.weight_kg ? ` • ${delivery.weight_kg}kg` : ''}
                                </p>
                                {associatedOrder && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    From Order #{associatedOrder.po_number}
                                  </p>
                                )}
                              </div>
                              
                              {/* Addresses */}
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="text-gray-500">Pickup:</span>
                                    <p className="text-gray-700">{delivery.pickup_address}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="text-gray-500">Delivery:</span>
                                    <p className="text-gray-700">{delivery.delivery_address}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                <Calendar className="h-3 w-3" />
                                {new Date(delivery.created_at).toLocaleDateString()}
                              </div>
                              {delivery.pickup_date && (
                                <p className="text-xs text-gray-500">
                                  Pickup: {new Date(delivery.pickup_date).toLocaleDateString()}
                                </p>
                              )}
                              {delivery.status === 'pending' && (
                                <Badge className="mt-2 bg-amber-100 text-amber-800">
                                  Awaiting Provider
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NavigationIcon className="h-5 w-5 text-blue-600" />
                  Delivery Tracking
                </CardTitle>
                <CardDescription>
                  Track your material deliveries in real-time with tracking numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackingTab
                  userId={user?.id || localStorage.getItem('user_id') || (() => {
                    try {
                      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
                      if (storedSession) {
                        const parsed = JSON.parse(storedSession);
                        return parsed.user?.id || '';
                      }
                    } catch (e) {}
                    return '';
                  })()}
                  userRole="private_client"
                  userName={profile?.full_name || user?.email?.split('@')[0]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Delivery Request Tab */}
          <TabsContent value="request-delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-teal-600" />
                  Request Manual Delivery
                </CardTitle>
                <CardDescription>
                  Request delivery for materials sourced outside UjenziXform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-500 rounded-lg text-white">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-teal-800 mb-1">When to Use Manual Delivery Request</h4>
                      <ul className="text-sm text-teal-700 space-y-1">
                        <li>• Materials purchased from local hardware stores</li>
                        <li>• Items bought from suppliers outside UjenziXform</li>
                        <li>• Moving materials between storage and construction site</li>
                        <li>• Returning defective items to suppliers</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <DeliveryRequest />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Payment History
                </CardTitle>
                <CardDescription>View your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No payments yet</p>
                  <p className="text-sm">Your payment history will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  My Wishlist
                </CardTitle>
                <CardDescription>Products you've saved for later</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Your wishlist is empty</p>
                  <p className="text-sm mb-4">Save products you're interested in</p>
                  <Link to="/suppliers?from=dashboard">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Explore Products
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            {/* Camera Access Summary Cards - Always visible */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Active Cameras Card */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Active Cameras</p>
                      <p className="text-3xl font-bold text-green-800">
                        {monitoringRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.assigned_cameras?.length || r.camera_count || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-full">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pending Approvals Card */}
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700 font-medium">Pending Approval</p>
                      <p className="text-3xl font-bold text-amber-800">
                        {monitoringRequests.filter(r => r.status === 'pending' || r.status === 'quoted').length}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-500 rounded-full">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Access Keys Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Access Keys</p>
                      <p className="text-3xl font-bold text-blue-800">
                        {monitoringRequests.filter(r => r.status === 'approved' && r.access_code).length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {monitoringRequests.filter(r => r.status === 'approved' && r.access_code).length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                      <p className="text-xs text-gray-500 mb-1">Your Access Codes:</p>
                      {monitoringRequests.filter(r => r.status === 'approved' && r.access_code).map(r => (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono font-bold text-blue-700">{r.access_code}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(r.access_code);
                              toast({ title: "Copied!", description: "Access code copied to clipboard" });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quick Access Card */}
              <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <p className="text-sm text-cyan-700 font-medium mb-1">Live Monitoring</p>
                      <p className="text-xs text-cyan-600 mb-3">Access your cameras in real-time</p>
                    </div>
                    <Link to="/monitoring">
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                        <Eye className="h-4 w-4 mr-2" />
                        Open Monitoring Page
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-cyan-600" />
                      Site Monitoring Services
                    </CardTitle>
                    <CardDescription>Request camera monitoring for your home construction</CardDescription>
                  </div>
                  <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                        <Camera className="h-4 w-4 mr-2" />
                        Request Monitoring
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-cyan-500" />
                          Request Site Monitoring
                        </DialogTitle>
                        <DialogDescription>
                          Fill in the details below to request camera monitoring services for your construction site.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Scrollable Form Content */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name *</Label>
                          <Input
                            id="projectName"
                            placeholder="e.g., My New Home Construction"
                            value={monitoringRequest.projectName}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectLocation">Project Location *</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="projectLocation"
                              className="pl-10"
                              placeholder="e.g., Karen, Nairobi"
                              value={monitoringRequest.projectLocation}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectLocation: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectDescription">Project Description</Label>
                          <Textarea
                            id="projectDescription"
                            placeholder="Describe your project and monitoring needs..."
                            value={monitoringRequest.projectDescription}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, projectDescription: e.target.value }))}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferredStartDate">Preferred Start Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="preferredStartDate"
                                type="date"
                                className="pl-10"
                                value={monitoringRequest.preferredStartDate}
                                onChange={(e) => setMonitoringRequest(prev => ({ ...prev, preferredStartDate: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numberOfCameras">Number of Cameras</Label>
                            <Input
                              id="numberOfCameras"
                              type="number"
                              min="1"
                              max="10"
                              value={monitoringRequest.numberOfCameras}
                              onChange={(e) => setMonitoringRequest(prev => ({ ...prev, numberOfCameras: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="additionalNotes">Additional Notes</Label>
                          <Textarea
                            id="additionalNotes"
                            placeholder="Any specific requirements or concerns..."
                            value={monitoringRequest.additionalNotes}
                            onChange={(e) => setMonitoringRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      {/* Fixed Footer */}
                      <DialogFooter className="border-t p-6 pt-4 bg-background">
                        <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMonitoringRequest}
                          disabled={submittingRequest}
                          className="bg-gradient-to-r from-cyan-500 to-teal-500"
                        >
                          {submittingRequest ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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
                </div>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500 rounded-lg text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-800 mb-1">Home Construction Monitoring</h4>
                      <p className="text-sm text-cyan-700">
                        Keep an eye on your home construction from anywhere. Our monitoring service includes HD cameras, 
                        real-time mobile viewing, and secure recording storage. Request monitoring and our team will 
                        contact you to set up the service.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monitoring Requests List */}
                {monitoringRequests.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Your Monitoring Requests</h4>
                    {monitoringRequests.map((request) => (
                      <div key={request.id} className={`border rounded-lg p-4 transition-colors ${
                        request.status === 'quoted' ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              request.status === 'approved' ? 'bg-green-100 text-green-600' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              request.status === 'quoted' ? 'bg-blue-100 text-blue-600' :
                              request.status === 'completed' ? 'bg-purple-100 text-purple-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              <Video className="h-5 w-5" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">{request.project_name}</h5>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.project_location}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Requested: {new Date(request.created_at).toLocaleDateString()}
                              </p>
                              {request.camera_count && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Cameras: {request.camera_count}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                            request.status === 'quoted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            request.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                            'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            {request.status === 'quoted' ? '💰 Quote Received' : 
                             request.status === 'approved' ? '✅ Active' :
                             request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </Badge>
                        </div>
                        
                        {/* Quote Section - Show when admin has sent a quote */}
                        {request.status === 'quoted' && request.quote_amount && (
                          <div className="mt-4 p-4 bg-white border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-semibold text-blue-800">📋 Quote from UjenziXform</h6>
                              {request.quote_valid_until && (
                                <span className="text-xs text-gray-500">
                                  Valid until: {new Date(request.quote_valid_until).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-center mb-4">
                              <p className="text-sm text-gray-600">Monthly Service Fee</p>
                              <p className="text-3xl font-bold text-blue-600">
                                KES {Number(request.quote_amount).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">per month</p>
                            </div>
                            {request.admin_notes && (
                              <p className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                                <span className="font-medium">Note:</span> {request.admin_notes}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'approved' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Accepted! 🎉",
                                      description: "Your monitoring service is now active. You can access your cameras.",
                                    });
                                    // Refresh the list
                                    const { data } = await supabase
                                      .from('monitoring_service_requests')
                                      .select('*')
                                      .eq('user_id', user?.id)
                                      .order('created_at', { ascending: false });
                                    if (data) setMonitoringRequests(data);
                                  } catch (error) {
                                    console.error('Error accepting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to accept quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Quote
                              </Button>
                              <Button 
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('monitoring_service_requests')
                                      .update({ status: 'rejected' })
                                      .eq('id', request.id);
                                    if (error) throw error;
                                    toast({
                                      title: "Quote Declined",
                                      description: "You can request a new quote anytime.",
                                    });
                                    // Refresh the list
                                    const { data } = await supabase
                                      .from('monitoring_service_requests')
                                      .select('*')
                                      .eq('user_id', user?.id)
                                      .order('created_at', { ascending: false });
                                    if (data) setMonitoringRequests(data);
                                  } catch (error) {
                                    console.error('Error rejecting quote:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to decline quote. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Approved - Show access info */}
                        {request.status === 'approved' && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h6 className="font-semibold text-green-800">Monitoring Service Active</h6>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                              Your cameras are set up and ready. Access your live feeds anytime.
                            </p>
                            
                            {/* Camera Assignment Info */}
                            {request.assigned_cameras && request.assigned_cameras.length > 0 && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500 mb-1">Assigned Cameras</p>
                                <p className="font-bold text-lg text-green-700">
                                  {request.assigned_cameras.length} Camera{request.assigned_cameras.length > 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                            
                            {request.access_code && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500">Your Access Code</p>
                                <p className="font-mono font-bold text-2xl text-green-700 tracking-wider">{request.access_code}</p>
                                <p className="text-xs text-gray-400 mt-1">Use this code on the Monitoring page to view your cameras</p>
                              </div>
                            )}
                            <Button 
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => navigate('/monitoring')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Access Live Cameras
                            </Button>
                          </div>
                        )}
                        
                        {/* Pending - Waiting for admin */}
                        {request.status === 'pending' && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Waiting for admin to review and send quote...
                            </p>
                          </div>
                        )}
                        
                        {/* Rejected */}
                        {request.status === 'rejected' && request.admin_notes && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Reason:</span> {request.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No monitoring requests yet</p>
                    <p className="text-sm mb-4">Request camera monitoring for your home construction</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-purple-600" />
                  Live Support
                </CardTitle>
                <CardDescription>Chat directly with UjenziXform support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Chat Guide */}
                <div className="bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600 rounded-full text-white">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">💬 Live Chat Available</h3>
                      <p className="text-muted-foreground mb-4">
                        Click the <strong className="text-purple-600">"Live"</strong> chat button in the bottom-right corner of your screen to:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Chat with our AI assistant for instant answers
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Request human support from our team
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Get help with orders, materials, and deliveries
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        Support Hours
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Mon - Fri: 8AM - 6PM<br />
                        Saturday: 9AM - 4PM<br />
                        Sunday: Closed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        Emergency Contact
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Call: +254 700 000 000<br />
                        Email: support@UjenziXform.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Delivery Prompt Dialog */}
      {selectedOrderForDelivery && (
        <DeliveryPromptDialog
          isOpen={showDeliveryPrompt}
          onOpenChange={(open) => {
            setShowDeliveryPrompt(open);
            if (!open) {
              // Show monitoring prompt after closing delivery dialog
              setTimeout(() => {
                setShowMonitoringServicePrompt(true);
              }, 300);
            }
          }}
          purchaseOrder={{
            id: selectedOrderForDelivery.id,
            po_number: selectedOrderForDelivery.po_number,
            supplier_id: '', // Will be fetched by the dialog if needed
            total_amount: selectedOrderForDelivery.total_amount || 0,
            delivery_address: selectedOrderForDelivery.delivery_address || 'To be provided',
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: selectedOrderForDelivery.items || [],
            project_name: selectedOrderForDelivery.project_name
          }}
          onDeliveryRequested={() => {
            setShowDeliveryPrompt(false);
            toast({
              title: '🚚 Delivery Requested!',
              description: `Delivery has been requested for order #${selectedOrderForDelivery.po_number}. A provider will be assigned soon.`,
            });
          }}
          onDeclined={() => {
            setShowDeliveryPrompt(false);
            setSelectedOrderForDelivery(null);
          }}
        />
      )}

      {/* Monitoring Service Prompt */}
      {selectedOrderForDelivery && (
        <MonitoringServicePrompt
          isOpen={showMonitoringServicePrompt}
          onOpenChange={(open) => {
            setShowMonitoringServicePrompt(open);
            if (!open) {
              setSelectedOrderForDelivery(null);
            }
          }}
          purchaseOrder={{
            id: selectedOrderForDelivery.id,
            po_number: selectedOrderForDelivery.po_number,
            supplier_id: '',
            total_amount: selectedOrderForDelivery.total_amount || 0,
            delivery_address: selectedOrderForDelivery.delivery_address || '',
            delivery_date: '',
            items: selectedOrderForDelivery.items || [],
            project_name: selectedOrderForDelivery.project_name
          }}
          onServiceRequested={() => {
            setShowMonitoringServicePrompt(false);
            setSelectedOrderForDelivery(null);
          }}
          onDeclined={() => {
            setShowMonitoringServicePrompt(false);
            setSelectedOrderForDelivery(null);
          }}
        />
      )}

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh profile data after save
          checkAuth();
        }}
        userRole="private_client"
      />
    </div>
  );
};

export default PrivateClientDashboard;

