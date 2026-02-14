import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  HardHat, 
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
  FileText,
  Building2,
  Users,
  Briefcase,
  Headphones,
  MessageSquare,
  Video,
  Camera,
  Send,
  MapPin,
  Calendar,
  Upload,
  Play,
  XCircle,
  Eye
} from "lucide-react";
import { BuilderProfileEdit } from "@/components/builders/BuilderProfileEdit";
import { BuilderVideoPortfolio } from "@/components/builders/BuilderVideoPortfolio";
import { BuilderOrdersTracker } from "@/components/builders/BuilderOrdersTracker";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ReviewPrompt } from "@/components/reviews/ReviewSystem";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";
import { BarChart3, Star } from "lucide-react";
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
import { SupplierQuoteReview } from "@/components/builders/SupplierQuoteReview";
import { PendingQuoteRequests } from "@/components/builders/PendingQuoteRequests";
import DeliveryRequest from "@/components/DeliveryRequest";
import { InAppCommunication } from "@/components/communication/InAppCommunication";

const ProfessionalBuilderDashboardPage = () => {
  // Use AuthContext for reliable user data
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingOrders: 0,
    completedProjects: 0,
    totalSpent: 0,
  });
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
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

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    description: '',
    start_date: '',
    budget: ''
  });

  // Deliveries state
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false); // Track if initial load is done

  // Supabase config for REST API
  const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R2I6GLWrY9xKkxa0ZDnmmSCWgTo';

  // Helper to get access token
  const getAccessToken = (): string => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.access_token || '';
      }
    } catch (e) {}
    return '';
  };

  // Helper to get user ID reliably (from AuthContext or localStorage)
  const getUserId = (): string => {
    if (authUser?.id) return authUser.id;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user?.id || '';
      }
    } catch (e) {
      console.warn('Could not get user ID from localStorage');
    }
    return '';
  };

  // Set user from AuthContext when available
  useEffect(() => {
    if (authUser) {
      console.log('📋 ProfessionalBuilderDashboard: Got user from AuthContext:', authUser.email);
      setUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => setLoading(false), 2000);
    checkAuth().finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
    return () => clearTimeout(timeout);
  }, [authUser]);

  const checkAuth = async () => {
    try {
      // Use authUser from context or localStorage fallback
      const userId = getUserId();
      
      if (!userId) {
        console.log('📋 ProfessionalBuilderDashboard: No user ID available yet');
        // Don't redirect - RoleProtectedRoute handles this
        return;
      }

      console.log('📋 ProfessionalBuilderDashboard: Loading profile for user:', userId);
      
      // Set user object immediately
      const userObj = authUser || { id: userId, email: authUser?.email || 'user' };
      setUser(userObj);

      // IMMEDIATELY start loading deliveries and stats in background (don't wait for profile)
      console.log('📋 Starting background data loads for:', userId);
      loadRealStats(userId).catch(err => console.error('Stats load error:', err));
      loadDeliveries(userId, true).catch(err => console.error('Deliveries load error:', err));

      // Get profile using REST API with timeout (Supabase client can hang)
      let profileData = null;
      const accessToken = getAccessToken();
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };
      
      try {
        const profilePromise = fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`,
          { headers }
        );
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );
        
        const profileResponse = await Promise.race([profilePromise, timeoutPromise]) as Response;
        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          if (profiles && profiles.length > 0) {
            profileData = profiles[0];
            console.log('📋 Profile loaded via REST:', profileData.full_name || profileData.email);
          }
        }
      } catch (profileError: any) {
        console.warn('Profile fetch warning:', profileError.message);
      }

      if (!profileData) {
        // Create a basic profile from auth data if profiles table fails
        console.log('📋 Using fallback profile');
        setProfile({
          id: userId,
          user_id: userId,
          email: userObj.email,
          full_name: userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'Builder',
          phone: userObj.user_metadata?.phone || '',
          company_name: userObj.user_metadata?.company_name || '',
          county: userObj.user_metadata?.county || '',
        });
      } else {
        setProfile(profileData);
      }

      // Role already verified by RoleProtectedRoute, skip redundant check
      console.log('📋 Profile setup complete, data loading in background');

      // Fetch monitoring requests in background using REST API
      fetch(
        `${SUPABASE_URL}/rest/v1/monitoring_service_requests?user_id=eq.${userId}&order=created_at.desc`,
        { headers }
      )
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (data && data.length > 0) {
            setMonitoringRequests(data);
          }
        })
        .catch(e => console.log('Monitoring requests fetch error:', e));

    } catch (error) {
      console.error('Auth error:', error);
      navigate('/professional-builder-signin');
    } finally {
      setLoading(false);
    }
  };

  // Load real stats using REST API
  const loadRealStats = async (userId: string) => {
    console.log('📊 loadRealStats called for:', userId);
    
    if (!userId) {
      console.log('📊 No userId provided, skipping stats load');
      return;
    }
    
    const accessToken = getAccessToken();
    console.log('📊 Got access token:', accessToken ? 'Yes' : 'No');
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log('📊 Loading real stats for builder:', userId);
      
      // Fetch purchase orders for this builder
      const ordersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${userId}&order=created_at.desc`,
        { headers }
      );
      
      let orders: any[] = [];
      if (ordersResponse.ok) {
        orders = await ordersResponse.json();
        console.log('📊 Orders loaded:', orders.length);
      }

      // Fetch builder projects
      const projectsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_projects?builder_id=eq.${userId}&order=created_at.desc`,
        { headers }
      );
      
      let projectsData: any[] = [];
      if (projectsResponse.ok) {
        projectsData = await projectsResponse.json();
        console.log('📊 Projects loaded:', projectsData.length);
        setProjects(projectsData);
      }

      // Calculate stats
      const pendingOrders = orders.filter(o => 
        ['pending', 'quoted', 'processing'].includes(o.status?.toLowerCase())
      ).length;
      
      const completedOrders = orders.filter(o => 
        ['completed', 'delivered', 'confirmed'].includes(o.status?.toLowerCase())
      ).length;
      
      const totalSpent = orders
        .filter(o => ['completed', 'delivered', 'confirmed'].includes(o.status?.toLowerCase()))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const activeProjects = projectsData.filter(p => 
        ['active', 'in_progress'].includes(p.status?.toLowerCase())
      ).length;

      setStats({
        activeProjects: activeProjects || projectsData.length,
        pendingOrders,
        completedProjects: completedOrders,
        totalSpent
      });

      console.log('📊 Stats calculated:', { activeProjects, pendingOrders, completedOrders, totalSpent });

      // Also load deliveries
      await loadDeliveries(userId);

    } catch (error) {
      console.error('Error loading stats:', error);
      // Set defaults
      setStats({
        activeProjects: 0,
        pendingOrders: 0,
        completedProjects: 0,
        totalSpent: 0
      });
    }
  };

  // Load deliveries using REST API
  const loadDeliveries = async (userId: string, forceRefresh: boolean = false) => {
    // Skip if already loaded and not forcing refresh (prevents flicker)
    if (deliveriesLoaded && !forceRefresh && deliveries.length > 0) {
      console.log('🚚 Deliveries already loaded, skipping fetch');
      return;
    }
    
    if (!userId) {
      console.log('🚚 No userId provided, skipping delivery load');
      return;
    }
    
    setLoadingDeliveries(true);
    const accessToken = getAccessToken();
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log('🚚 Loading deliveries for builder:', userId);
      console.log('🚚 Using access token:', accessToken ? 'Yes' : 'No');
      
      // First, get the profile ID (delivery_requests uses profile.id as builder_id)
      let profileId = userId;
      try {
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
          { headers }
        );
        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          if (profiles && profiles.length > 0) {
            profileId = profiles[0].id;
            console.log('🚚 Found profile ID:', profileId);
          }
        }
      } catch (e) {
        console.log('Could not fetch profile, using user ID');
      }

      // Fetch delivery requests - try multiple ID fields
      let deliveryRequests: any[] = [];
      
      // Try with profile ID first (this is how DeliveryRequest.tsx saves it)
      try {
        const deliveryRequestsResponse1 = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?builder_id=eq.${profileId}&order=created_at.desc`,
          { headers }
        );
        if (deliveryRequestsResponse1.ok) {
          const data1 = await deliveryRequestsResponse1.json();
          deliveryRequests = [...deliveryRequests, ...data1];
          console.log('🚚 Delivery requests (by profile_id):', data1.length, data1);
        } else {
          console.log('🚚 Delivery requests (by profile_id) failed:', deliveryRequestsResponse1.status);
        }
      } catch (e) {
        console.error('🚚 Error fetching by profile_id:', e);
      }

      // Also try with user_id if different (for deliveries created via DeliveryPromptDialog)
      if (profileId !== userId) {
        try {
          const deliveryRequestsResponse2 = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?builder_id=eq.${userId}&order=created_at.desc`,
            { headers }
          );
          if (deliveryRequestsResponse2.ok) {
            const data2 = await deliveryRequestsResponse2.json();
            // Add only unique ones
            const existingIds = new Set(deliveryRequests.map(d => d.id));
            const newData = data2.filter((d: any) => !existingIds.has(d.id));
            deliveryRequests = [...deliveryRequests, ...newData];
            console.log('🚚 Delivery requests (by user_id):', data2.length, newData);
          }
        } catch (e) {
          console.error('🚚 Error fetching by user_id:', e);
        }
      }
      
      // Also try with buyer_id (in case it's stored that way)
      try {
        const deliveryRequestsResponse3 = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?buyer_id=eq.${userId}&order=created_at.desc`,
          { headers }
        );
        if (deliveryRequestsResponse3.ok) {
          const data3 = await deliveryRequestsResponse3.json();
          const existingIds = new Set(deliveryRequests.map(d => d.id));
          const newData = data3.filter((d: any) => !existingIds.has(d.id));
          deliveryRequests = [...deliveryRequests, ...newData];
          console.log('🚚 Delivery requests (by buyer_id):', data3.length);
        }
      } catch (e) {
        // buyer_id column might not exist, that's ok
      }

      // Fetch deliveries table (actual deliveries in progress) - try both IDs
      let deliveriesData: any[] = [];
      
      const deliveriesResponse1 = await fetch(
        `${SUPABASE_URL}/rest/v1/deliveries?builder_id=eq.${profileId}&order=created_at.desc`,
        { headers }
      );
      if (deliveriesResponse1.ok) {
        const data1 = await deliveriesResponse1.json();
        deliveriesData = [...deliveriesData, ...data1];
        console.log('🚚 Deliveries (by profile_id):', data1.length);
      }

      if (profileId !== userId) {
        const deliveriesResponse2 = await fetch(
          `${SUPABASE_URL}/rest/v1/deliveries?builder_id=eq.${userId}&order=created_at.desc`,
          { headers }
        );
        if (deliveriesResponse2.ok) {
          const data2 = await deliveriesResponse2.json();
          const existingIds = new Set(deliveriesData.map(d => d.id));
          const newData = data2.filter((d: any) => !existingIds.has(d.id));
          deliveriesData = [...deliveriesData, ...newData];
          console.log('🚚 Deliveries (by user_id):', data2.length);
        }
      }

      // Also fetch from purchase_orders with delivery info (orders that have delivery requested)
      let orderDeliveries: any[] = [];
      try {
        const ordersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${userId}&status=in.(confirmed,shipped,delivered)&order=created_at.desc`,
          { headers }
        );
        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          // Transform orders with delivery info
          orderDeliveries = orders
            .filter((o: any) => o.delivery_address) // Only orders with delivery address
            .map((o: any) => ({
              id: `order-${o.id}`,
              type: 'order',
              display_status: o.status === 'delivered' ? 'delivered' : 
                              o.status === 'shipped' ? 'in_transit' : 'pending',
              pickup_address: o.supplier_name || 'Supplier',
              delivery_address: o.delivery_address,
              materials_description: o.items?.map((i: any) => i.material_name || i.name).join(', ') || 'Materials',
              estimated_cost: o.total_amount,
              created_at: o.created_at,
              tracking_number: o.po_number,
              estimated_delivery: o.delivery_date
            }));
          console.log('🚚 Order deliveries:', orderDeliveries.length);
        }
      } catch (e) {
        console.log('Could not fetch order deliveries');
      }

      // Combine all - delivery requests, actual deliveries, and order deliveries
      const allDeliveries = [
        ...deliveryRequests.map(dr => ({
          ...dr,
          type: 'request',
          display_status: dr.status || 'pending'
        })),
        ...deliveriesData.map(d => ({
          ...d,
          type: 'delivery',
          display_status: d.status || 'in_transit'
        })),
        ...orderDeliveries
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Remove duplicates by ID
      const uniqueDeliveries = allDeliveries.filter((delivery, index, self) =>
        index === self.findIndex(d => d.id === delivery.id)
      );

      setDeliveries(uniqueDeliveries);
      setDeliveriesLoaded(true);
      console.log('🚚 Total unique deliveries:', uniqueDeliveries.length);

    } catch (error) {
      console.error('Error loading deliveries:', error);
      // Don't clear existing data on error - keep showing what we have
      // setDeliveries([]); // REMOVED - this was causing the flicker
    } finally {
      setLoadingDeliveries(false);
    }
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in the project name and location.",
        variant: "destructive",
      });
      return;
    }

    setLoadingProjects(true);
    const userId = getUserId();
    const accessToken = getAccessToken();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/builder_projects`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          builder_id: userId,
          name: newProject.name,
          location: newProject.location,
          description: newProject.description || null,
          start_date: newProject.start_date || null,
          budget: newProject.budget ? parseFloat(newProject.budget) : null,
          status: 'active'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(prev => [data[0], ...prev]);
        setStats(prev => ({ ...prev, activeProjects: prev.activeProjects + 1 }));
        
        toast({
          title: "Project Created!",
          description: "Your new project has been created successfully.",
        });

        setShowCreateProject(false);
        setNewProject({ name: '', location: '', description: '', start_date: '', budget: '' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // Set up real-time subscription for orders and projects
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    console.log('🔔 Setting up real-time subscriptions for builder:', userId);

    const channel = supabase
      .channel('builder-dashboard-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders', filter: `buyer_id=eq.${userId}` },
        (payload) => {
          console.log('🛒 Order change detected:', payload);
          loadRealStats(userId);
          toast({
            title: "Order Updated",
            description: "Your order status has been updated.",
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'builder_projects', filter: `builder_id=eq.${userId}` },
        (payload) => {
          console.log('📁 Project change detected:', payload);
          loadRealStats(userId);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_requests', filter: `builder_id=eq.${userId}` },
        (payload) => {
          console.log('🚚 Delivery request change detected:', payload);
          loadDeliveries(userId, true); // Force refresh on real-time update
          toast({
            title: "Delivery Update",
            description: "Your delivery status has been updated.",
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `builder_id=eq.${userId}` },
        (payload) => {
          console.log('🚚 Delivery change detected:', payload);
          loadDeliveries(userId, true); // Force refresh on real-time update
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

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
          contact_name: profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'User',
          contact_email: user?.email || '',
          contact_phone: profile?.phone || 'N/A',
          company_name: profile?.company_name || '',
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 text-white py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {profile?.full_name || profile?.company_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-blue-100">Professional Builder Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/suppliers">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Order Materials
                </Button>
              </Link>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto max-w-7xl px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedProjects}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">KES {(stats.totalSpent / 1000000).toFixed(1)}M</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-white shadow-sm border flex-wrap h-auto p-1">
            <TabsTrigger value="projects" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="request-delivery" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Send className="h-4 w-4 mr-2" />
              Request Delivery
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <Camera className="h-4 w-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Video className="h-4 w-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white">
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="order-history" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Order History
            </TabsTrigger>
            <TabsTrigger value="my-analytics" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Active Projects
                  </CardTitle>
                  <CardDescription>Manage your construction projects</CardDescription>
                </div>
                <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Create New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Add a new construction project to track materials and deliveries
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                          id="project-name"
                          placeholder="e.g., Residential Building Phase 1"
                          value={newProject.name}
                          onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="project-location">Location *</Label>
                        <Input
                          id="project-location"
                          placeholder="e.g., Westlands, Nairobi"
                          value={newProject.location}
                          onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="project-description">Description</Label>
                        <Textarea
                          id="project-description"
                          placeholder="Brief description of the project..."
                          value={newProject.description}
                          onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="project-start">Start Date</Label>
                          <Input
                            id="project-start"
                            type="date"
                            value={newProject.start_date}
                            onChange={(e) => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-budget">Budget (KES)</Label>
                          <Input
                            id="project-budget"
                            type="number"
                            placeholder="e.g., 5000000"
                            value={newProject.budget}
                            onChange={(e) => setNewProject(prev => ({ ...prev, budget: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateProject} 
                        disabled={loadingProjects}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loadingProjects ? 'Creating...' : 'Create Project'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No active projects</p>
                    <p className="text-sm mb-4">Create your first project to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div 
                        key={project.id} 
                        className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-5 w-5 text-blue-600" />
                              <h3 className="font-semibold text-lg">{project.name}</h3>
                              <Badge 
                                variant={project.status === 'active' ? 'default' : 'secondary'}
                                className={project.status === 'active' ? 'bg-green-500' : ''}
                              >
                                {project.status || 'Active'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {project.location}
                              </span>
                              {project.start_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(project.start_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-gray-500">{project.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {project.budget && (
                              <p className="text-lg font-bold text-blue-600">
                                KES {project.budget.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotes Tab - Review supplier pricing */}
          <TabsContent value="quotes">
            <Tabs defaultValue="my-requests" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="my-requests">My Quote Requests</TabsTrigger>
                <TabsTrigger value="supplier-quotes">Supplier Responses</TabsTrigger>
              </TabsList>
              <TabsContent value="my-requests">
                <PendingQuoteRequests builderId={user?.id || ''} />
              </TabsContent>
              <TabsContent value="supplier-quotes">
                <SupplierQuoteReview builderId={user?.id || ''} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="orders">
            <BuilderOrdersTracker builderId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Scheduled Deliveries
                  </CardTitle>
                  <CardDescription>Track incoming material deliveries</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadDeliveries(getUserId(), true)}
                  disabled={loadingDeliveries}
                >
                  {loadingDeliveries ? 'Refreshing...' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDeliveries ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-500">Loading deliveries...</p>
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No scheduled deliveries</p>
                    <p className="text-sm">Your deliveries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveries.map((delivery) => (
                      <div 
                        key={delivery.id} 
                        className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className={`h-5 w-5 ${
                                delivery.display_status === 'delivered' ? 'text-green-600' :
                                delivery.display_status === 'in_transit' ? 'text-blue-600' :
                                delivery.display_status === 'accepted' ? 'text-teal-600' :
                                'text-orange-500'
                              }`} />
                              <h3 className="font-semibold">
                                {delivery.materials_description || delivery.pickup_address || 'Delivery Request'}
                              </h3>
                              <Badge 
                                variant={
                                  delivery.display_status === 'delivered' ? 'default' :
                                  delivery.display_status === 'in_transit' ? 'default' :
                                  delivery.display_status === 'accepted' ? 'default' :
                                  'secondary'
                                }
                                className={
                                  delivery.display_status === 'delivered' ? 'bg-green-500' :
                                  delivery.display_status === 'in_transit' ? 'bg-blue-500' :
                                  delivery.display_status === 'accepted' ? 'bg-teal-500' :
                                  delivery.display_status === 'pending' ? 'bg-orange-500' :
                                  ''
                                }
                              >
                                {delivery.display_status?.replace('_', ' ') || 'Pending'}
                              </Badge>
                              {delivery.type === 'request' && (
                                <Badge variant="outline" className="text-xs">Request</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                              {delivery.pickup_address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">From:</span> {delivery.pickup_address}
                                </div>
                              )}
                              {delivery.delivery_address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-blue-400" />
                                  <span className="font-medium">To:</span> {delivery.delivery_address}
                                </div>
                              )}
                            </div>

                            {delivery.estimated_delivery && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                <span>Expected: {new Date(delivery.estimated_delivery).toLocaleDateString()}</span>
                              </div>
                            )}

                            {delivery.tracking_number && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium text-gray-700">Tracking:</span>{' '}
                                <code className="bg-gray-100 px-2 py-1 rounded">{delivery.tracking_number}</code>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            {delivery.estimated_cost && (
                              <p className="text-lg font-bold text-blue-600">
                                KES {delivery.estimated_cost.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              {new Date(delivery.created_at).toLocaleDateString()}
                            </p>
                            {delivery.provider_name && (
                              <p className="text-xs text-gray-500 mt-1">
                                Driver: {delivery.provider_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Progress indicator for in-transit deliveries */}
                        {delivery.display_status === 'in_transit' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                              <span>Pickup</span>
                              <span>In Transit</span>
                              <span>Delivered</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full w-1/2 transition-all duration-500" />
                            </div>
                          </div>
                        )}

                        {delivery.display_status === 'delivered' && (
                          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Delivered successfully</span>
                            {delivery.delivered_at && (
                              <span className="text-sm text-gray-500">
                                on {new Date(delivery.delivered_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  Request delivery for materials sourced outside UjenziXform or for site-to-site transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-500 rounded-lg text-white">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-teal-800 mb-1">When to Use Manual Delivery Request</h4>
                      <ul className="text-sm text-teal-700 space-y-1">
                        <li>• Materials purchased from suppliers outside UjenziXform</li>
                        <li>• Site-to-site material transfers between your projects</li>
                        <li>• Returning defective materials to suppliers</li>
                        <li>• Moving existing inventory to a new construction site</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <DeliveryRequest />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Invoices & Payments
                </CardTitle>
                <CardDescription>Manage invoices and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No invoices yet</p>
                  <p className="text-sm">Your invoices will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Management
                </CardTitle>
                <CardDescription>Manage your construction team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No team members</p>
                  <p className="text-sm mb-4">Add team members to collaborate</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <User className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-cyan-600" />
                      Site Monitoring Services
                    </CardTitle>
                    <CardDescription>Request camera monitoring for your construction sites</CardDescription>
                  </div>
                  <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
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
                            placeholder="e.g., Residential Complex Phase 2"
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
                              placeholder="e.g., Westlands, Nairobi"
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
                              max="20"
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
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
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
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500 rounded-lg text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-800 mb-1">Professional Site Monitoring</h4>
                      <p className="text-sm text-cyan-700">
                        Get 24/7 camera surveillance for your construction sites. Our monitoring service includes HD cameras, 
                        real-time viewing, recording storage, and drone aerial surveys. Request monitoring and our team will 
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
                            {request.access_code && (
                              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                                <p className="text-xs text-gray-500">Access Code</p>
                                <p className="font-mono font-bold text-lg text-green-700">{request.access_code}</p>
                              </div>
                            )}
                            <Button 
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => window.open('/monitoring', '_blank')}
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
                    <p className="text-sm mb-4">Request camera monitoring for your construction sites</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab - Video Marketing */}
          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-purple-600" />
                      Video Portfolio
                    </CardTitle>
                    <CardDescription>
                      Upload project videos to showcase your work and attract more clients
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg text-white">
                      <Play className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-1">Showcase Your Projects</h4>
                      <p className="text-sm text-purple-700">
                        Upload videos of your completed projects to build trust with potential clients.
                        Videos with good engagement (likes, comments) are featured on the Builders page!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Portfolio Component */}
                <BuilderVideoPortfolio 
                  builderId={user?.id || ''} 
                  isOwner={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Edit Your Profile
                </CardTitle>
                <CardDescription>
                  Update your company information, specialties, and credentials to attract more clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BuilderProfileEdit
                  userId={user?.id || ''}
                  builderCategory="professional"
                  onSave={() => {
                    toast({
                      title: "Profile Updated!",
                      description: "Your profile has been saved successfully.",
                    });
                    // Refresh to show updated data
                    checkAuth();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <div className="space-y-6">
              {/* In-App Communication */}
              {user && (
                <InAppCommunication
                  userId={user.id}
                  userName={user.email || 'Builder'}
                  userRole="professional_builder"
                  isDarkMode={false}
                />
              )}

              {/* Quick Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Support Hours
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Mon - Fri: 8AM - 6PM<br />
                      Saturday: 9AM - 4PM<br />
                      Sunday: Closed
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-indigo-600" />
                      Priority Support
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Call: +254 700 000 000<br />
                      Email: pro@UjenziXform.co.ke
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Order History Tab */}
          <TabsContent value="order-history">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View all your orders and download invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {user && <OrderHistory userId={user.id} userRole="professional_builder" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="my-analytics">
            <Card>
              <CardHeader>
                <CardTitle>Spending Analytics</CardTitle>
                <CardDescription>Track your spending patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                {user && <UserAnalyticsDashboard userId={user.id} userRole="professional_builder" />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Professional Features Banner */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Professional Builder Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white">Bulk Discounts</Badge>
                  <Badge className="bg-white/20 text-white">Credit Terms</Badge>
                  <Badge className="bg-white/20 text-white">Priority Delivery</Badge>
                  <Badge className="bg-white/20 text-white">Dedicated Support</Badge>
                </div>
              </div>
              <Link to="/suppliers">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  Start Ordering
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default ProfessionalBuilderDashboardPage;

