import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAdminClient, isAdminClientAvailable } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  Building2, 
  Store, 
  Truck, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  Activity,
  Database,
  Lock,
  Bell,
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  Home,
  MessageSquare,
  Globe,
  Layers,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Zap,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  LayoutDashboard,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Info,
  CheckCircle2,
  Navigation,
  ShoppingCart,
  CreditCard,
  FileBarChart,
  Brain,
  Sparkles,
  Bot,
  FileImage,
  FilePlus,
  FileCheck,
  FileX,
  Folder,
  FolderOpen,
  History,
  Timer,
  Gauge,
  PieChart,
  LineChart,
  QrCode,
  Scan
} from "lucide-react";
import { AdminScanDashboard } from "@/components/qr/AdminScanDashboard";
import { AdminChatWidget } from "@/components/chat/AdminChatWidget";
import { DeliveryAnalytics } from "@/components/admin/DeliveryAnalytics";
import { MonitoringRequestsManager } from "@/components/admin/MonitoringRequestsManager";
import { PendingProductsManager } from "@/components/admin/PendingProductsManager";
import { MaterialImagesManager } from "@/components/admin/MaterialImagesManager";
import { AdminVideoApproval } from "@/components/admin/AdminVideoApproval";
import { AdminConversationsViewer } from "@/components/admin/AdminConversationsViewer";
import { UserRolesManager } from "@/components/admin/UserRolesManager";
import { AdminMessaging } from "@/components/admin/AdminMessaging";
import { LiveChatManager } from "@/components/admin/LiveChatManager";
import { Camera, UserCog, MessageCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StaffManagement } from "@/components/admin/StaffManagement";
import { ActivityLogViewer } from "@/components/admin/ActivityLogViewer";
import { ThemeToggle, ThemeProvider } from "@/components/admin/dashboard/ThemeToggle";
import { MobileNav } from "@/components/admin/dashboard/MobileNav";

// New Modular Admin Components
import { 
  OverviewTab, 
  MonitoringTab, 
  RegistrationsTab, 
  FeedbackTab 
} from "@/pages/admin/tabs";
import { 
  useRegistrations, 
  useFeedback, 
  useCameras 
} from "@/pages/admin/hooks/useAdminData";

interface DashboardStats {
  totalUsers: number;
  totalBuilders: number;
  totalSuppliers: number;
  totalDelivery: number;
  pendingRegistrations: number;
  activeToday: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

interface FeedbackRecord {
  id: string;
  user_email: string;
  message: string;
  rating: number;
  category: string;
  created_at: string;
  status: string;
  name?: string | null;
  subject?: string | null;
  user_type?: string | null;
}

interface AppPage {
  name: string;
  path: string;
  icon: any;
  status: 'active' | 'inactive' | 'maintenance';
  visits: number;
  description: string;
  category: 'public' | 'protected' | 'admin';
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in: string | null;
}

interface RegistrationRecord {
  id: string;
  type: 'builder' | 'supplier' | 'delivery';
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  county?: string;
  builder_category?: string;
  material_categories?: string[];
  vehicle_type?: string;
  service_areas?: string[];
  status: string;
  created_at: string;
}

interface DocumentRecord {
  id: string;
  name: string;
  type: 'id_document' | 'business_certificate' | 'nca_certificate' | 'profile_photo' | 'license' | 'insurance' | 'other';
  uploadedBy: string;
  userEmail: string;
  userRole: string;
  size: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface MLActivity {
  id: string;
  type: 'prediction' | 'classification' | 'recommendation' | 'anomaly_detection' | 'sentiment_analysis';
  model: string;
  input: string;
  output: string;
  confidence: number;
  processingTime: number;
  userId?: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

interface MLStats {
  totalPredictions: number;
  successRate: number;
  avgProcessingTime: number;
  activeModels: number;
  todayPredictions: number;
  errorRate: number;
}

// Financial Documents Interfaces
interface FinancialDocument {
  id: string;
  type: 'invoice' | 'payment' | 'purchase_order' | 'purchase_receipt';
  reference: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  partyName: string;
  partyEmail?: string;
  description?: string;
  items?: any[];
}

interface FinancialStats {
  totalInvoices: number;
  totalPayments: number;
  totalPurchaseOrders: number;
  totalReceipts: number;
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  overdueInvoices: number;
}

interface DeliveryApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string;
  physical_address: string;
  vehicle_type: string;
  vehicle_registration: string;
  driving_license_number: string;
  years_experience: number;
  service_areas: string[];
  availability: string;
  has_smartphone: boolean;
  background_check_consent: boolean;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// Builder Delivery Requests (materials delivery)
// Matches actual database schema
interface BuilderDeliveryRequest {
  id: string;
  builder_id: string;
  builder_email?: string;
  builder_name?: string;
  pickup_location?: string;
  pickup_address?: string;
  dropoff_location?: string;
  dropoff_address?: string;
  item_description?: string;
  estimated_weight?: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency?: string;
  special_instructions?: string;
  required_vehicle_type?: string;
  status: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  estimated_cost?: number;
  final_cost?: number;
  current_location?: string;
  tracking_updates?: any;
  created_at: string;
  updated_at: string;
}

// Camera Management Interface
interface CameraRecord {
  id: string;
  name: string;
  location: string | null;
  project_id: string | null;
  project_name?: string;
  stream_url: string | null;
  is_active: boolean;
  camera_type: string;
  status: 'online' | 'offline' | 'error';
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBuilders: 0,
    totalSuppliers: 0,
    totalDelivery: 0,
    pendingRegistrations: 0,
    activeToday: 0,
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [mlActivities, setMLActivities] = useState<MLActivity[]>([]);
  const [deliveryApplications, setDeliveryApplications] = useState<DeliveryApplication[]>([]);
  const [builderDeliveryRequests, setBuilderDeliveryRequests] = useState<BuilderDeliveryRequest[]>([]);
  const [mlStats, setMLStats] = useState<MLStats>({
    totalPredictions: 0,
    successRate: 0,
    avgProcessingTime: 0,
    activeModels: 0,
    todayPredictions: 0,
    errorRate: 0
  });
  const [financialDocuments, setFinancialDocuments] = useState<FinancialDocument[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalInvoices: 0,
    totalPayments: 0,
    totalPurchaseOrders: 0,
    totalReceipts: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    overdueInvoices: 0
  });
  const [financialFilter, setFinancialFilter] = useState<'all' | 'invoice' | 'payment' | 'purchase_order' | 'purchase_receipt'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Camera Management State
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [showAddCameraModal, setShowAddCameraModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraRecord | null>(null);
  const [cameraFormData, setCameraFormData] = useState({
    name: '',
    location: '',
    stream_url: '',
    camera_type: 'ip',
    is_active: true
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use new modular hooks for data fetching
  const { 
    registrations: modularRegistrations, 
    loading: registrationsLoading, 
    refetch: refetchRegistrations,
    updateStatus: updateRegistrationStatus 
  } = useRegistrations();
  
  const { 
    feedback: modularFeedback, 
    loading: feedbackLoading, 
    refetch: refetchFeedback 
  } = useFeedback();
  
  const { 
    cameras: modularCameras, 
    loading: camerasLoading, 
    refetch: refetchCameras,
    addCamera,
    updateCamera,
    deleteCamera,
    toggleStatus: toggleCameraStatus
  } = useCameras();

  // All app pages for monitoring
  const appPages: AppPage[] = [
    { name: 'Home', path: '/', icon: Home, status: 'active', visits: 0, description: 'Main landing & auth page', category: 'public' },
    { name: 'Auth / Sign In', path: '/auth', icon: Lock, status: 'active', visits: 0, description: 'User authentication', category: 'public' },
    { name: 'Builder Registration', path: '/builder-registration', icon: Building2, status: 'active', visits: 0, description: 'Builder signup form', category: 'public' },
    { name: 'Supplier Registration', path: '/supplier-registration', icon: Store, status: 'active', visits: 0, description: 'Supplier signup form', category: 'public' },
    { name: 'Delivery Registration', path: '/delivery-registration', icon: Truck, status: 'active', visits: 0, description: 'Delivery provider signup', category: 'public' },
    { name: 'Builder Sign In', path: '/builder-signin', icon: Building2, status: 'active', visits: 0, description: 'Builder portal login', category: 'public' },
    { name: 'Supplier Sign In', path: '/supplier-signin', icon: Store, status: 'active', visits: 0, description: 'Supplier portal login', category: 'public' },
    { name: 'Delivery Sign In', path: '/delivery-signin', icon: Truck, status: 'active', visits: 0, description: 'Delivery portal login', category: 'public' },
    { name: 'Builder Dashboard', path: '/builder-dashboard', icon: LayoutDashboard, status: 'active', visits: 0, description: 'Builder management panel', category: 'protected' },
    { name: 'Supplier Dashboard', path: '/supplier-dashboard', icon: LayoutDashboard, status: 'active', visits: 0, description: 'Supplier management panel', category: 'protected' },
    { name: 'Delivery Dashboard', path: '/delivery-dashboard', icon: LayoutDashboard, status: 'active', visits: 0, description: 'Delivery management panel', category: 'protected' },
    { name: 'Supplier Marketplace', path: '/supplier-marketplace', icon: ShoppingCart, status: 'active', visits: 0, description: 'Material marketplace for builders', category: 'protected' },
    { name: 'Suppliers Page', path: '/suppliers', icon: Store, status: 'active', visits: 0, description: 'Browse all suppliers', category: 'protected' },
    { name: 'Builders Page', path: '/builders', icon: Building2, status: 'active', visits: 0, description: 'Browse all builders', category: 'protected' },
    { name: 'Delivery Page', path: '/delivery', icon: Truck, status: 'active', visits: 0, description: 'Delivery services info', category: 'protected' },
    { name: 'Tracking', path: '/tracking', icon: MapPin, status: 'active', visits: 0, description: 'Order tracking system (Admin Access ✓)', category: 'protected' },
    { name: 'Monitoring', path: '/monitoring', icon: Activity, status: 'active', visits: 0, description: 'System monitoring (Admin Access ✓)', category: 'protected' },
    { name: 'Scanners', path: '/scanners', icon: Zap, status: 'active', visits: 0, description: 'QR/Barcode scanners (Admin Access ✓)', category: 'protected' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, status: 'active', visits: 0, description: 'Business analytics', category: 'protected' },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare, status: 'active', visits: 0, description: 'User feedback collection', category: 'protected' },
    { name: 'About', path: '/about', icon: Info, status: 'active', visits: 0, description: 'About MradiPro', category: 'protected' },
    { name: 'Contact', path: '/contact', icon: Phone, status: 'active', visits: 0, description: 'Contact information', category: 'protected' },
    { name: 'Terms of Service', path: '/terms', icon: FileText, status: 'active', visits: 0, description: 'Legal terms', category: 'public' },
    { name: 'Privacy Policy', path: '/privacy', icon: Shield, status: 'active', visits: 0, description: 'Privacy information', category: 'public' },
    { name: 'Admin Login', path: '/admin-login', icon: Shield, status: 'active', visits: 0, description: 'Admin authentication', category: 'admin' },
    { name: 'Admin Dashboard', path: '/admin-dashboard', icon: Shield, status: 'active', visits: 0, description: 'Admin control panel', category: 'admin' },
  ];

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (loading) return;

    console.log('🔄 Setting up real-time subscriptions...');

    // Subscribe to delivery_requests changes
    const deliveryRequestsSub = supabase
      .channel('admin-delivery-requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'delivery_requests' },
        (payload) => {
          console.log('📦 Delivery request change:', payload);
          loadBuilderDeliveryRequests();
        }
      )
      .subscribe();

    // Subscribe to registration changes
    const builderRegsSub = supabase
      .channel('admin-builder-registrations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'builder_registrations' },
        (payload) => {
          console.log('👷 Builder registration change:', payload);
          loadRegistrations();
          loadDashboardData();
        }
      )
      .subscribe();

    const supplierRegsSub = supabase
      .channel('admin-supplier-registrations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'supplier_registrations' },
        (payload) => {
          console.log('🏪 Supplier registration change:', payload);
          loadRegistrations();
          loadDashboardData();
        }
      )
      .subscribe();

    const deliveryProviderRegsSub = supabase
      .channel('admin-delivery-provider-registrations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_provider_registrations' },
        (payload) => {
          console.log('🚚 Delivery provider registration change:', payload);
          loadDeliveryApplications();
          loadRegistrations();
          loadDashboardData();
        }
      )
      .subscribe();

    // Subscribe to monitoring requests
    const monitoringRequestsSub = supabase
      .channel('admin-monitoring-requests')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'monitoring_service_requests' },
        (payload) => {
          console.log('📹 Monitoring request change:', payload);
          // The MonitoringRequestsManager component handles its own refresh
        }
      )
      .subscribe();

    // Subscribe to purchase orders
    const purchaseOrdersSub = supabase
      .channel('admin-purchase-orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        (payload) => {
          console.log('🛒 Purchase order change:', payload);
          loadFinancialData();
        }
      )
      .subscribe();

    // Subscribe to feedback
    const feedbackSub = supabase
      .channel('admin-feedback')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feedback' },
        (payload) => {
          console.log('💬 Feedback change:', payload);
          loadFeedback();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔌 Cleaning up real-time subscriptions...');
      deliveryRequestsSub.unsubscribe();
      builderRegsSub.unsubscribe();
      supplierRegsSub.unsubscribe();
      deliveryProviderRegsSub.unsubscribe();
      monitoringRequestsSub.unsubscribe();
      purchaseOrdersSub.unsubscribe();
      feedbackSub.unsubscribe();
    };
  }, [loading]);

  const checkAdminAccess = async () => {
    try {
      // Check localStorage for admin session
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const adminEmailLS = localStorage.getItem('admin_email');
      const adminLoginTime = localStorage.getItem('admin_login_time');
      const userRole = localStorage.getItem('user_role');

      console.log('🔐 Admin Dashboard Access Check:', { isAdminAuthenticated, adminEmail: adminEmailLS, userRole });

      // Check if admin session exists and is valid (within 24 hours)
      const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

      if (!isAdminAuthenticated || !adminEmailLS || userRole !== 'admin' || sessionAge > maxSessionAge) {
        console.log('🚫 Admin session invalid or expired');
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please sign in again."
        });
        // Clear invalid session
        localStorage.removeItem('admin_authenticated');
        localStorage.removeItem('admin_email');
        localStorage.removeItem('admin_login_time');
        navigate('/admin-login');
        return;
      }

      // Check for Supabase session (optional - RLS is disabled for admin access)
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Supabase session:', session?.user?.email || 'No session (RLS disabled, admin access OK)');

      setAdminEmail(adminEmailLS);

      // Load dashboard data
      await loadDashboardData();
      setLoading(false);

    } catch (error) {
      console.error('Admin access check error:', error);
      navigate('/admin-login');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Use admin client if available (bypasses RLS), otherwise use regular client
      const client = getAdminClient() || supabase;
      
      // Get user counts by role
      const { data: rolesData, error: rolesError } = await client
        .from('user_roles')
        .select('role');

      if (!rolesError && rolesData) {
        const builderCount = rolesData.filter(r => r.role === 'builder').length;
        const supplierCount = rolesData.filter(r => r.role === 'supplier').length;
        const deliveryCount = rolesData.filter(r => r.role === 'delivery_provider').length;

        setStats(prev => ({
          ...prev,
          totalUsers: rolesData.length,
          totalBuilders: builderCount,
          totalSuppliers: supplierCount,
          totalDelivery: deliveryCount
        }));
      }

      // Get pending registrations count
      const [builderRegs, supplierRegs, deliveryRegs] = await Promise.all([
        client.from('builder_registrations').select('id, status').eq('status', 'pending'),
        client.from('supplier_registrations').select('id, status').eq('status', 'pending'),
        client.from('delivery_provider_registrations').select('id, status').eq('status', 'pending')
      ]);

      const pendingCount = 
        (builderRegs.data?.length || 0) + 
        (supplierRegs.data?.length || 0) + 
        (deliveryRegs.data?.length || 0);

      setStats(prev => ({
        ...prev,
        pendingRegistrations: pendingCount
      }));

      // Load all registrations for the table
      await loadRegistrations();
      
      // Load feedback data
      await loadFeedback();
      
      // Load cameras
      await loadCameras();
      
      // Load documents
      await loadDocuments();
      
      // Load delivery applications
      await loadDeliveryApplications();
      
      // Load builder delivery requests
      await loadBuilderDeliveryRequests();
      
      // Load financial data
      await loadFinancialData();
      
      // Load ML activities
      loadMLActivities();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };
  
  const loadBuilderDeliveryRequests = async () => {
    try {
      // Use admin client if available (bypasses RLS)
      const client = getAdminClient() || supabase;
      
      // Query delivery_requests with ACTUAL database column names
      const { data, error } = await client
        .from('delivery_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log('Error loading delivery requests:', error.message);
        setBuilderDeliveryRequests([]);
        return;
      }

      if (data && data.length > 0) {
        // Get builder names for the requests
        const builderIds = [...new Set(data.map((req: any) => req.builder_id).filter(Boolean))];
        let profileMap = new Map();
        
        if (builderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', builderIds);
          
          profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
        }

        const formattedRequests: BuilderDeliveryRequest[] = data.map((req: any) => ({
          id: req.id || '',
          builder_id: req.builder_id || '',
          builder_email: req.builder_email || '',
          builder_name: profileMap.get(req.builder_id) || req.builder_email?.split('@')[0] || 'Unknown Builder',
          pickup_location: req.pickup_location || '',
          pickup_address: req.pickup_address || '',
          dropoff_location: req.dropoff_location || '',
          dropoff_address: req.dropoff_address || '',
          item_description: req.item_description || 'N/A',
          estimated_weight: req.estimated_weight || '',
          preferred_date: req.preferred_date || '',
          preferred_time: req.preferred_time || '',
          urgency: req.urgency || 'normal',
          special_instructions: req.special_instructions || '',
          status: req.status || 'pending',
          driver_id: req.driver_id,
          driver_name: req.driver_name,
          driver_phone: req.driver_phone,
          vehicle_info: req.vehicle_info,
          assigned_at: req.assigned_at,
          picked_up_at: req.picked_up_at,
          delivered_at: req.delivered_at,
          cancelled_at: req.cancelled_at,
          cancellation_reason: req.cancellation_reason,
          estimated_cost: req.estimated_cost,
          final_cost: req.final_cost,
          current_location: req.current_location,
          tracking_updates: req.tracking_updates,
          created_at: req.created_at,
          updated_at: req.updated_at
        }));
        setBuilderDeliveryRequests(formattedRequests);
      } else {
        setBuilderDeliveryRequests([]);
      }
    } catch (error) {
      console.log('Error loading builder delivery requests:', error);
      setBuilderDeliveryRequests([]);
    }
  };
  
  const loadDocuments = async () => {
    try {
      // Use admin client if available
      const client = getAdminClient() || supabase;
      
      // Collect documents from all registration tables
      const allDocuments: DocumentRecord[] = [];
      
      // Get builder documents
      const { data: builderDocs } = await client
        .from('builder_registrations')
        .select('id, email, full_name, id_document_url, business_certificate_url, nca_certificate_url, profile_photo_url, created_at, status');
      
      if (builderDocs) {
        builderDocs.forEach((reg: any) => {
          if (reg.id_document_url) {
            allDocuments.push({
              id: `builder-id-${reg.id}`,
              name: `ID Document - ${reg.full_name}`,
              type: 'id_document',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'builder',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.business_certificate_url) {
            allDocuments.push({
              id: `builder-cert-${reg.id}`,
              name: `Business Certificate - ${reg.full_name}`,
              type: 'business_certificate',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'builder',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.nca_certificate_url) {
            allDocuments.push({
              id: `builder-nca-${reg.id}`,
              name: `NCA Certificate - ${reg.full_name}`,
              type: 'nca_certificate',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'builder',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.profile_photo_url) {
            allDocuments.push({
              id: `builder-photo-${reg.id}`,
              name: `Profile Photo - ${reg.full_name}`,
              type: 'profile_photo',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'builder',
              size: 'N/A',
              status: 'verified',
              uploadedAt: reg.created_at
            });
          }
        });
      }
      
      // Get supplier documents
      const { data: supplierDocs } = await client
        .from('supplier_registrations')
        .select('id, email, contact_person, company_name, business_registration_url, kra_pin_url, profile_photo_url, created_at, status');
      
      if (supplierDocs) {
        supplierDocs.forEach((reg: any) => {
          if (reg.business_registration_url) {
            allDocuments.push({
              id: `supplier-cert-${reg.id}`,
              name: `Business Registration - ${reg.company_name || reg.contact_person}`,
              type: 'business_certificate',
              uploadedBy: reg.contact_person || 'Unknown',
              userEmail: reg.email,
              userRole: 'supplier',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.kra_pin_url) {
            allDocuments.push({
              id: `supplier-kra-${reg.id}`,
              name: `KRA PIN - ${reg.company_name || reg.contact_person}`,
              type: 'id_document',
              uploadedBy: reg.contact_person || 'Unknown',
              userEmail: reg.email,
              userRole: 'supplier',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
        });
      }
      
      // Get delivery documents
      const { data: deliveryDocs } = await client
        .from('delivery_provider_registrations')
        .select('id, email, full_name, id_document_url, driving_license_url, vehicle_logbook_url, insurance_certificate_url, created_at, status');
      
      if (deliveryDocs) {
        deliveryDocs.forEach((reg: any) => {
          if (reg.id_document_url) {
            allDocuments.push({
              id: `delivery-id-${reg.id}`,
              name: `ID Document - ${reg.full_name}`,
              type: 'id_document',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'delivery',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.driving_license_url) {
            allDocuments.push({
              id: `delivery-license-${reg.id}`,
              name: `Driving License - ${reg.full_name}`,
              type: 'license',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'delivery',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.vehicle_logbook_url) {
            allDocuments.push({
              id: `delivery-vehicle-${reg.id}`,
              name: `Vehicle Logbook - ${reg.full_name}`,
              type: 'other',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'delivery',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
          if (reg.insurance_certificate_url) {
            allDocuments.push({
              id: `delivery-insurance-${reg.id}`,
              name: `Insurance Certificate - ${reg.full_name}`,
              type: 'insurance',
              uploadedBy: reg.full_name || 'Unknown',
              userEmail: reg.email,
              userRole: 'delivery',
              size: 'N/A',
              status: reg.status === 'approved' ? 'verified' : 'pending',
              uploadedAt: reg.created_at
            });
          }
        });
      }
      
      // Sort by upload date (newest first)
      allDocuments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      setDocuments(allDocuments);
      console.log('📄 Loaded', allDocuments.length, 'documents');
      
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      // Use admin client if available
      const client = getAdminClient() || supabase;
      
      const allFinancialDocs: FinancialDocument[] = [];
      let stats: FinancialStats = {
        totalInvoices: 0,
        totalPayments: 0,
        totalPurchaseOrders: 0,
        totalReceipts: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        completedPayments: 0,
        overdueInvoices: 0
      };

      // Load Invoices
      const { data: invoices, error: invoicesError } = await client
        .from('invoices')
        .select('id, invoice_number, total_amount, status, created_at, due_date, issuer_id, supplier_id, items, notes')
        .order('created_at', { ascending: false });

      if (!invoicesError && invoices) {
        stats.totalInvoices = invoices.length;
        stats.overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
        
        invoices.forEach((inv: any) => {
          allFinancialDocs.push({
            id: inv.id,
            type: 'invoice',
            reference: inv.invoice_number,
            amount: inv.total_amount || 0,
            currency: 'KES',
            status: inv.status,
            date: inv.created_at,
            partyName: `Invoice #${inv.invoice_number}`,
            description: inv.notes || 'Invoice',
            items: inv.items
          });
        });
      }

      // Load Payments
      const { data: payments, error: paymentsError } = await client
        .from('payments')
        .select('id, amount, currency, provider, reference, description, status, transaction_id, created_at, user_id')
        .order('created_at', { ascending: false });

      if (!paymentsError && payments) {
        stats.totalPayments = payments.length;
        stats.completedPayments = payments.filter(p => p.status === 'completed').length;
        stats.pendingPayments = payments.filter(p => p.status === 'pending').length;
        stats.totalRevenue = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        payments.forEach((pmt: any) => {
          allFinancialDocs.push({
            id: pmt.id,
            type: 'payment',
            reference: pmt.reference || pmt.transaction_id || 'N/A',
            amount: pmt.amount || 0,
            currency: pmt.currency || 'KES',
            status: pmt.status,
            date: pmt.created_at,
            partyName: pmt.provider || 'Unknown Provider',
            description: pmt.description || `Payment via ${pmt.provider}`
          });
        });
      }

      // Load Purchase Orders
      const { data: purchaseOrders, error: poError } = await client
        .from('purchase_orders')
        .select('id, po_number, total_amount, status, created_at, delivery_address, items, special_instructions, buyer_id, supplier_id')
        .order('created_at', { ascending: false });

      if (!poError && purchaseOrders) {
        stats.totalPurchaseOrders = purchaseOrders.length;
        
        purchaseOrders.forEach((po: any) => {
          allFinancialDocs.push({
            id: po.id,
            type: 'purchase_order',
            reference: po.po_number,
            amount: po.total_amount || 0,
            currency: 'KES',
            status: po.status,
            date: po.created_at,
            partyName: `PO #${po.po_number}`,
            description: po.special_instructions || 'Purchase Order',
            items: po.items
          });
        });
      }

      // Load Purchase Receipts
      const { data: receipts, error: receiptsError } = await client
        .from('purchase_receipts')
        .select('id, receipt_number, total_amount, status, created_at, payment_method, payment_reference, items, special_instructions, buyer_id')
        .order('created_at', { ascending: false });

      if (!receiptsError && receipts) {
        stats.totalReceipts = receipts.length;
        
        receipts.forEach((rec: any) => {
          allFinancialDocs.push({
            id: rec.id,
            type: 'purchase_receipt',
            reference: rec.receipt_number,
            amount: rec.total_amount || 0,
            currency: 'KES',
            status: rec.status,
            date: rec.created_at,
            partyName: `Receipt #${rec.receipt_number}`,
            description: `${rec.payment_method || 'Payment'} - ${rec.special_instructions || 'Purchase Receipt'}`
          });
        });
      }

      // Sort all financial documents by date (newest first)
      allFinancialDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setFinancialDocuments(allFinancialDocs);
      setFinancialStats(stats);
      console.log('💰 Loaded', allFinancialDocs.length, 'financial documents');
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };
  
  const loadMLActivities = () => {
    // Load ML activities from localStorage (simulated ML system)
    try {
      const storedActivities = localStorage.getItem('ml_activities') || '[]';
      const activities: MLActivity[] = JSON.parse(storedActivities);
      
      // Generate some sample activities if none exist
      if (activities.length === 0) {
        const sampleActivities: MLActivity[] = [
          {
            id: 'ml-1',
            type: 'recommendation',
            model: 'ProductRecommender v2.1',
            input: 'User browsing history: cement, sand, gravel',
            output: 'Recommended: Reinforcement bars, Building blocks',
            confidence: 0.89,
            processingTime: 45,
            timestamp: new Date().toISOString(),
            status: 'success'
          },
          {
            id: 'ml-2',
            type: 'prediction',
            model: 'PricePredictor v1.5',
            input: 'Cement 50kg bag, Nairobi region',
            output: 'Predicted price: KES 720-780',
            confidence: 0.92,
            processingTime: 32,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'success'
          },
          {
            id: 'ml-3',
            type: 'anomaly_detection',
            model: 'FraudDetector v3.0',
            input: 'Transaction: Order #12345',
            output: 'No anomalies detected',
            confidence: 0.97,
            processingTime: 18,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            status: 'success'
          },
          {
            id: 'ml-4',
            type: 'sentiment_analysis',
            model: 'FeedbackAnalyzer v1.2',
            input: 'User feedback: "Great service, fast delivery!"',
            output: 'Sentiment: Positive (0.94)',
            confidence: 0.94,
            processingTime: 12,
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            status: 'success'
          },
          {
            id: 'ml-5',
            type: 'classification',
            model: 'UserSegmenter v2.0',
            input: 'User profile: 5 orders, avg KES 50,000',
            output: 'Segment: Premium Builder',
            confidence: 0.86,
            processingTime: 28,
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            status: 'success'
          }
        ];
        
        localStorage.setItem('ml_activities', JSON.stringify(sampleActivities));
        setMLActivities(sampleActivities);
      } else {
        setMLActivities(activities);
      }
      
      // Calculate ML stats
      const successCount = activities.filter(a => a.status === 'success').length;
      const errorCount = activities.filter(a => a.status === 'error').length;
      const totalTime = activities.reduce((sum, a) => sum + a.processingTime, 0);
      const today = new Date().toDateString();
      const todayCount = activities.filter(a => new Date(a.timestamp).toDateString() === today).length;
      
      setMLStats({
        totalPredictions: activities.length || 5,
        successRate: activities.length > 0 ? (successCount / activities.length) * 100 : 98,
        avgProcessingTime: activities.length > 0 ? totalTime / activities.length : 27,
        activeModels: 5,
        todayPredictions: todayCount || 12,
        errorRate: activities.length > 0 ? (errorCount / activities.length) * 100 : 2
      });
      
    } catch (error) {
      console.error('Error loading ML activities:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      // Use admin client if available
      const client = getAdminClient() || supabase;
      
      // Try to load from feedback table if it exists
      const { data: feedbackData, error } = await client
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && feedbackData) {
        const formattedFeedback: FeedbackRecord[] = feedbackData.map((f: any) => ({
          id: f.id,
          user_email: f.email || f.user_email || 'Anonymous',
          message: f.message || f.comment || f.feedback || f.content || '',
          rating: f.rating || 0,
          category: f.feedback_category || f.category || f.type || 'General',
          created_at: f.created_at,
          status: f.status || 'pending',
          // Additional fields from enhanced table
          name: f.name || null,
          subject: f.subject || null,
          user_type: f.user_type || null
        }));
        
        setFeedbackList(formattedFeedback);
        
        // Calculate feedback stats
        const positive = formattedFeedback.filter(f => f.rating >= 4).length;
        const negative = formattedFeedback.filter(f => f.rating <= 2 && f.rating > 0).length;
        
        setStats(prev => ({
          ...prev,
          totalFeedback: formattedFeedback.length,
          positiveFeedback: positive,
          negativeFeedback: negative
        }));
      }
    } catch (error) {
      console.log('Feedback table may not exist yet:', error);
    }
  };

  // Load cameras from database
  const loadCameras = async () => {
    try {
      const client = getAdminClient() || supabase;
      
      const { data: camerasData, error } = await client
        .from('cameras')
        .select(`
          id,
          name,
          location,
          project_id,
          stream_url,
          is_active,
          created_at,
          updated_at,
          projects:project_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading cameras:', error);
        return;
      }

      if (camerasData) {
        const formattedCameras: CameraRecord[] = camerasData.map((cam: any) => ({
          id: cam.id,
          name: cam.name || 'Unnamed Camera',
          location: cam.location,
          project_id: cam.project_id,
          project_name: cam.projects?.name || null,
          stream_url: cam.stream_url,
          is_active: cam.is_active ?? true,
          camera_type: 'ip', // Default type
          status: cam.is_active ? 'online' : 'offline',
          created_at: cam.created_at,
          updated_at: cam.updated_at
        }));
        setCameras(formattedCameras);
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
    }
  };

  // Add new camera
  const handleAddCamera = async () => {
    try {
      const client = getAdminClient() || supabase;
      
      const { error } = await client
        .from('cameras')
        .insert({
          name: cameraFormData.name,
          location: cameraFormData.location || null,
          stream_url: cameraFormData.stream_url || null,
          is_active: cameraFormData.is_active
        });

      if (error) throw error;

      toast({
        title: "Camera Added",
        description: `Camera "${cameraFormData.name}" has been added successfully.`
      });

      setShowAddCameraModal(false);
      setCameraFormData({ name: '', location: '', stream_url: '', camera_type: 'ip', is_active: true });
      loadCameras();
    } catch (error: any) {
      console.error('Error adding camera:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add camera"
      });
    }
  };

  // Update camera
  const handleUpdateCamera = async () => {
    if (!editingCamera) return;
    
    try {
      const client = getAdminClient() || supabase;
      
      const { error } = await client
        .from('cameras')
        .update({
          name: cameraFormData.name,
          location: cameraFormData.location || null,
          stream_url: cameraFormData.stream_url || null,
          is_active: cameraFormData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCamera.id);

      if (error) throw error;

      toast({
        title: "Camera Updated",
        description: `Camera "${cameraFormData.name}" has been updated.`
      });

      setEditingCamera(null);
      setCameraFormData({ name: '', location: '', stream_url: '', camera_type: 'ip', is_active: true });
      loadCameras();
    } catch (error: any) {
      console.error('Error updating camera:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update camera"
      });
    }
  };

  // Delete camera
  const handleDeleteCamera = async (cameraId: string, cameraName: string) => {
    if (!confirm(`Are you sure you want to delete camera "${cameraName}"?`)) return;
    
    try {
      const client = getAdminClient() || supabase;
      
      const { error } = await client
        .from('cameras')
        .delete()
        .eq('id', cameraId);

      if (error) throw error;

      toast({
        title: "Camera Deleted",
        description: `Camera "${cameraName}" has been deleted.`
      });

      loadCameras();
    } catch (error: any) {
      console.error('Error deleting camera:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete camera"
      });
    }
  };

  // Toggle camera status
  const handleToggleCameraStatus = async (camera: CameraRecord) => {
    try {
      const client = getAdminClient() || supabase;
      
      const { error } = await client
        .from('cameras')
        .update({
          is_active: !camera.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', camera.id);

      if (error) throw error;

      toast({
        title: camera.is_active ? "Camera Disabled" : "Camera Enabled",
        description: `Camera "${camera.name}" is now ${camera.is_active ? 'offline' : 'online'}.`
      });

      loadCameras();
    } catch (error: any) {
      console.error('Error toggling camera:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update camera status"
      });
    }
  };

  // Open edit modal
  const openEditCamera = (camera: CameraRecord) => {
    setEditingCamera(camera);
    setCameraFormData({
      name: camera.name,
      location: camera.location || '',
      stream_url: camera.stream_url || '',
      camera_type: camera.camera_type || 'ip',
      is_active: camera.is_active
    });
  };

  const loadDeliveryApplications = async () => {
    try {
      // Use admin client if available
      const client = getAdminClient() || supabase;
      
      const { data: deliveryApps, error } = await client
        .from('delivery_provider_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading delivery applications:', error);
        return;
      }

      if (deliveryApps) {
        const formattedApps: DeliveryApplication[] = deliveryApps.map((app: any) => ({
          id: app.id,
          full_name: app.full_name || 'N/A',
          email: app.email || 'N/A',
          phone: app.phone || 'N/A',
          county: app.county || 'N/A',
          physical_address: app.physical_address || 'N/A',
          vehicle_type: app.vehicle_type || 'N/A',
          vehicle_registration: app.vehicle_registration || 'N/A',
          driving_license_number: app.driving_license_number || 'N/A',
          years_experience: app.years_driving_experience || 0,
          service_areas: app.service_areas || [],
          availability: app.available_days?.length > 5 ? 'full_time' : 'part_time',
          has_smartphone: true, // Not in schema, default to true
          background_check_consent: app.background_check_consent ?? false,
          status: app.status || 'pending',
          created_at: app.created_at,
          reviewed_at: app.reviewed_at,
          reviewed_by: app.reviewed_by
        }));
        
        setDeliveryApplications(formattedApps);
        console.log('📦 Loaded', formattedApps.length, 'delivery applications');
      }
    } catch (error) {
      console.error('Error loading delivery applications:', error);
    }
  };

  const loadRegistrations = async () => {
    try {
      // Use admin client if available
      const client = getAdminClient() || supabase;
      
      const allRegistrations: RegistrationRecord[] = [];

      // Load builder registrations
      const { data: builders, error: buildersError } = await client
        .from('builder_registrations')
        .select('id, full_name, email, phone, company_name, county, builder_category, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (buildersError) {
        console.error('Error loading builder registrations:', buildersError);
      }

      if (builders) {
        builders.forEach((b: any) => {
          allRegistrations.push({
            id: b.id,
            type: 'builder',
            name: b.full_name || 'N/A',
            email: b.email || 'N/A',
            phone: b.phone,
            company_name: b.company_name,
            county: b.county,
            builder_category: b.builder_category,
            status: b.status || 'pending',
            created_at: b.created_at
          });
        });
      }

      // Load supplier registrations
      const { data: suppliers, error: suppliersError } = await client
        .from('supplier_registrations')
        .select('id, company_name, contact_person, email, phone, county, material_categories, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (suppliersError) {
        console.error('Error loading supplier registrations:', suppliersError);
      }

      if (suppliers) {
        suppliers.forEach((s: any) => {
          allRegistrations.push({
            id: s.id,
            type: 'supplier',
            name: s.company_name || s.contact_person || 'N/A',
            email: s.email || 'N/A',
            phone: s.phone,
            company_name: s.company_name,
            county: s.county,
            material_categories: s.material_categories,
            status: s.status || 'pending',
            created_at: s.created_at
          });
        });
      }

      // Load delivery registrations
      const { data: delivery, error: deliveryError } = await client
        .from('delivery_provider_registrations')
        .select('id, full_name, email, phone, county, vehicle_type, vehicle_registration, service_areas, company_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (deliveryError) {
        console.error('Error loading delivery registrations:', deliveryError);
      }

      if (delivery) {
        delivery.forEach((d: any) => {
          allRegistrations.push({
            id: d.id,
            type: 'delivery',
            name: d.full_name || d.company_name || 'N/A',
            email: d.email || 'N/A',
            phone: d.phone,
            company_name: d.company_name,
            county: d.county,
            vehicle_type: d.vehicle_type,
            service_areas: d.service_areas,
            status: d.status || 'pending',
            created_at: d.created_at
          });
        });
      }

      // Sort by created_at
      allRegistrations.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRegistrations(allRegistrations);

    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const handleApproveRegistration = async (registration: RegistrationRecord) => {
    try {
      const tableName = registration.type === 'delivery' 
        ? 'delivery_provider_registrations' 
        : `${registration.type}_registrations` as 'builder_registrations' | 'supplier_registrations';
      
      const { error } = await supabase
        .from(tableName)
        .update({ status: 'approved' })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "✅ Registration Approved",
        description: `${registration.name} has been approved as a ${registration.type}.`
      });

      // Reload registrations
      await loadRegistrations();
      await loadDashboardData();

    } catch (error: any) {
      console.error('Error approving registration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve registration."
      });
    }
  };

  const handleRejectRegistration = async (registration: RegistrationRecord) => {
    try {
      const tableName = registration.type === 'delivery' 
        ? 'delivery_provider_registrations' 
        : `${registration.type}_registrations` as 'builder_registrations' | 'supplier_registrations';
      
      const { error } = await supabase
        .from(tableName)
        .update({ status: 'rejected' })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "Registration Rejected",
        description: `${registration.name}'s registration has been rejected.`
      });

      // Reload registrations
      await loadRegistrations();
      await loadDashboardData();

    } catch (error: any) {
      console.error('Error rejecting registration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject registration."
      });
    }
  };

  const handleSignOut = async () => {
    // Redirect IMMEDIATELY to prevent UI flash
    window.location.href = '/admin-login';
    
    // Then do cleanup in background (page is already redirecting)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await (supabase as any).from('activity_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action: 'admin_logout',
          category: 'auth',
          details: `Admin ${user.email} logged out`,
          metadata: {},
          created_at: new Date().toISOString()
        }).catch(() => {});
      }
    } catch (err) {
      // Ignore errors - we're already redirecting
    }
    
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRole === 'all' || reg.type === filterRole;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'builder':
        return <Badge className="bg-blue-600"><Building2 className="h-3 w-3 mr-1" /> Builder</Badge>;
      case 'supplier':
        return <Badge className="bg-orange-600"><Store className="h-3 w-3 mr-1" /> Supplier</Badge>;
      case 'delivery':
        return <Badge className="bg-teal-600"><Truck className="h-3 w-3 mr-1" /> Delivery</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-slate-950 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">Loading Admin Dashboard...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <MobileNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                pendingCount={stats.pendingRegistrations}
              />
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">MradiPro Admin</h1>
                  <p className="text-xs text-gray-400 hidden sm:block">Staff Dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle variant="compact" />
              
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Bell className="h-5 w-5" />
              </Button>
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300 truncate max-w-[150px]">{adminEmail}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
                  <DropdownMenuLabel className="text-gray-400">Admin Options</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem 
                    className="text-gray-300 hover:bg-slate-800 cursor-pointer"
                    onClick={() => navigate('/home')}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Main Site
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-400 hover:bg-slate-800 cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Builders</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.totalBuilders}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Suppliers</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.totalSuppliers}</p>
                </div>
                <Store className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Delivery</p>
                  <p className="text-2xl font-bold text-teal-400">{stats.totalDelivery}</p>
                </div>
                <Truck className="h-8 w-8 text-teal-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingRegistrations}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Active Today</p>
                  <p className="text-2xl font-bold text-green-400">{stats.activeToday}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1 flex-wrap h-auto gap-1 justify-start overflow-x-auto max-w-full">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-red-600">
              <Eye className="h-4 w-4 mr-2" />
              Cameras
            </TabsTrigger>
            <TabsTrigger value="gps" className="data-[state=active]:bg-green-600">
              <MapPin className="h-4 w-4 mr-2" />
              GPS Tracking
            </TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-blue-600">
              <Globe className="h-4 w-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="pending-products" className="data-[state=active]:bg-yellow-600">
              <Package className="h-4 w-4 mr-2" />
              Pending Products
            </TabsTrigger>
            <TabsTrigger value="material-images" className="data-[state=active]:bg-purple-600">
              <FileImage className="h-4 w-4 mr-2" />
              Material Images
            </TabsTrigger>
            <TabsTrigger value="delivery-apps" className="data-[state=active]:bg-green-600">
              <Truck className="h-4 w-4 mr-2" />
              Delivery Apps ({deliveryApplications.length})
            </TabsTrigger>
            <TabsTrigger value="delivery-requests" className="data-[state=active]:bg-orange-600">
              <Package className="h-4 w-4 mr-2" />
              Delivery Requests ({builderDeliveryRequests.length})
            </TabsTrigger>
            <TabsTrigger value="monitoring-requests" className="data-[state=active]:bg-red-600">
              <Camera className="h-4 w-4 mr-2" />
              Monitoring Requests
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-blue-600">
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-purple-600">
              <Folder className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-600">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial ({financialDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="ml" className="data-[state=active]:bg-pink-600">
              <Brain className="h-4 w-4 mr-2" />
              ML & AI
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-indigo-600">
              <UserCheck className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="activity-log" className="data-[state=active]:bg-amber-600">
              <History className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="scanning" className="data-[state=active]:bg-cyan-600">
              <QrCode className="h-4 w-4 mr-2" />
              QR Scanning
            </TabsTrigger>
            <TabsTrigger value="communications" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-orange-600">
              <FileImage className="h-4 w-4 mr-2" />
              Video Approval
            </TabsTrigger>
            <TabsTrigger value="delivery-analytics" className="data-[state=active]:bg-teal-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Delivery Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="user-roles" className="data-[state=active]:bg-pink-600">
              <UserCog className="h-4 w-4 mr-2" />
              User Roles
            </TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-cyan-600">
              <MessageCircle className="h-4 w-4 mr-2" />
              Messaging
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Using New Modular Component */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              stats={stats}
              registrations={modularRegistrations.length > 0 ? modularRegistrations : registrations}
              appPages={appPages}
              onTabChange={setActiveTab}
              onNavigate={navigate}
            />
          </TabsContent>

          {/* Camera Monitoring Tab - Using New Modular Component */}
          <TabsContent value="monitoring" className="space-y-6">
            <MonitoringTab
              cameras={modularCameras.length > 0 ? modularCameras : cameras}
              loading={camerasLoading}
              onRefresh={refetchCameras}
              onAddCamera={addCamera}
              onUpdateCamera={updateCamera}
              onDeleteCamera={deleteCamera}
              onToggleStatus={toggleCameraStatus}
            />
          </TabsContent>

          {/* GPS Tracking Tab */}
          <TabsContent value="gps" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-500" />
                      GPS Delivery Tracking
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      Real-time location tracking of all delivery vehicles
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
                      <Truck className="h-3 w-3 mr-1" />
                      8 Active
                    </Badge>
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                      <Clock className="h-3 w-3 mr-1" />
                      3 En Route
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Map Placeholder */}
                <div className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 mb-6">
                  <div className="aspect-[16/9] bg-gradient-to-br from-green-900/20 to-blue-900/20 flex items-center justify-center relative">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                      <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute top-2/3 left-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                      <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
                      <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                      
                      {/* Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
                        {Array.from({length: 48}).map((_, i) => (
                          <div key={i} className="border border-slate-700/30"></div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-center z-10">
                      <MapPin className="h-16 w-16 text-green-500 mx-auto mb-3" />
                      <p className="text-white text-lg font-medium">Kenya Map View</p>
                      <p className="text-gray-400 text-sm">Nairobi Metropolitan Area</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Connect GPS devices to enable real-time tracking
                      </p>
                    </div>
                  </div>
                  
                  {/* Map Controls */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button size="sm" variant="secondary" className="bg-slate-800/80">
                      <span className="text-lg">+</span>
                    </Button>
                    <Button size="sm" variant="secondary" className="bg-slate-800/80">
                      <span className="text-lg">−</span>
                    </Button>
                  </div>
                  
                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-slate-900/90 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Legend</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Active Delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Returning</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Loading</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Deliveries List */}
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Active Deliveries
                </h4>
                <div className="space-y-3">
                  {/* Delivery 1 */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-900/30 rounded-lg">
                          <Truck className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">DEL-2024-0847</p>
                          <p className="text-xs text-gray-400">Driver: John Kamau</p>
                        </div>
                      </div>
                      <Badge className="bg-green-600">En Route</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">From</p>
                        <p className="text-white">Main Warehouse</p>
                      </div>
                      <div>
                        <p className="text-gray-400">To</p>
                        <p className="text-white">Westlands Site</p>
                      </div>
                      <div>
                        <p className="text-gray-400">ETA</p>
                        <p className="text-green-400">15 mins</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-slate-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                  </div>

                  {/* Delivery 2 */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-900/30 rounded-lg">
                          <Truck className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">DEL-2024-0848</p>
                          <p className="text-xs text-gray-400">Driver: Mary Wanjiku</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-600">Loading</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">From</p>
                        <p className="text-white">Supplier Depot</p>
                      </div>
                      <div>
                        <p className="text-gray-400">To</p>
                        <p className="text-white">Kilimani Project</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className="text-yellow-400">Loading...</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery 3 */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/30 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">DEL-2024-0849</p>
                          <p className="text-xs text-gray-400">Driver: Peter Ochieng</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-600">Returning</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Completed</p>
                        <p className="text-white">Karen Site</p>
                      </div>
                      <div>
                        <p className="text-gray-400">To</p>
                        <p className="text-white">Main Warehouse</p>
                      </div>
                      <div>
                        <p className="text-gray-400">ETA</p>
                        <p className="text-blue-400">25 mins</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}}></div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-400">12</p>
                    <p className="text-xs text-gray-400">Deliveries Today</p>
                  </div>
                  <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-400">8</p>
                    <p className="text-xs text-gray-400">Active Vehicles</p>
                  </div>
                  <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-400">156 km</p>
                    <p className="text-xs text-gray-400">Total Distance</p>
                  </div>
                  <div className="p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-400">98%</p>
                    <p className="text-xs text-gray-400">On-Time Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab - Monitor All App Pages */}
          <TabsContent value="pages" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      All Application Pages
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      Monitor and manage all pages in the MradiPro application
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-600">
                    {appPages.filter(p => p.status === 'active').length} / {appPages.length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Page Categories */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-5 w-5 text-blue-400" />
                      <span className="text-blue-400 font-semibold">Public Pages</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{appPages.filter(p => p.category === 'public').length}</p>
                    <p className="text-xs text-gray-400">Accessible without login</p>
                  </div>
                  <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-semibold">Protected Pages</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{appPages.filter(p => p.category === 'protected').length}</p>
                    <p className="text-xs text-gray-400">Requires authentication</p>
                  </div>
                  <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-red-400" />
                      <span className="text-red-400 font-semibold">Admin Pages</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{appPages.filter(p => p.category === 'admin').length}</p>
                    <p className="text-xs text-gray-400">Admin access only</p>
                  </div>
                </div>

                {/* Pages Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {appPages.map((page, index) => (
                    <div 
                      key={index}
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            page.category === 'admin' ? 'bg-red-900/30' :
                            page.category === 'protected' ? 'bg-green-900/30' : 'bg-blue-900/30'
                          }`}>
                            <page.icon className={`h-5 w-5 ${
                              page.category === 'admin' ? 'text-red-400' :
                              page.category === 'protected' ? 'text-green-400' : 'text-blue-400'
                            }`} />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{page.name}</h4>
                            <p className="text-xs text-gray-500">{page.path}</p>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          page.status === 'active' ? 'bg-green-500' :
                          page.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{page.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${
                          page.category === 'admin' ? 'border-red-600 text-red-400' :
                          page.category === 'protected' ? 'border-green-600 text-green-400' : 'border-blue-600 text-blue-400'
                        }`}>
                          {page.category}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                          onClick={() => window.open(page.path, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registrations Tab - Using New Modular Component */}
          <TabsContent value="registrations" className="space-y-6">
            <RegistrationsTab
              registrations={modularRegistrations.length > 0 ? modularRegistrations : registrations}
              loading={registrationsLoading}
              onRefresh={refetchRegistrations}
              onUpdateStatus={updateRegistrationStatus}
            />
          </TabsContent>

          {/* Pending Products Tab - Admin Product Approval */}
          <TabsContent value="pending-products" className="space-y-6">
            <PendingProductsManager />
          </TabsContent>

          {/* Material Images Tab - Admin uploads and approves supplier images */}
          <TabsContent value="material-images" className="space-y-6">
            <MaterialImagesManager />
          </TabsContent>

          {/* Delivery Applications Tab */}
          <TabsContent value="delivery-apps" className="space-y-6">
            {/* Delivery Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-600/30 rounded-xl">
                      <Truck className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{deliveryApplications.length}</p>
                      <p className="text-sm text-green-300">Total Applications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-600/30 rounded-xl">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {deliveryApplications.filter(a => a.status === 'pending').length}
                      </p>
                      <p className="text-sm text-yellow-300">Pending Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/30 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {deliveryApplications.filter(a => a.status === 'approved').length}
                      </p>
                      <p className="text-sm text-blue-300">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/30 rounded-xl">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {deliveryApplications.filter(a => a.status === 'rejected').length}
                      </p>
                      <p className="text-sm text-red-300">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Delivery Applications List */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-400" />
                    All Delivery Provider Applications
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDeliveryApplications}
                    className="border-green-700 text-green-400 hover:bg-green-900/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deliveryApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No delivery provider applications yet</p>
                    <p className="text-gray-500 text-sm mt-2">Applications will appear here when delivery providers register</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveryApplications.map((app) => (
                      <div 
                        key={app.id} 
                        className={`p-5 rounded-xl border transition-all hover:shadow-lg ${
                          app.status === 'pending' 
                            ? 'bg-yellow-900/10 border-yellow-700/50 hover:bg-yellow-900/20' 
                            : app.status === 'approved'
                            ? 'bg-green-900/10 border-green-700/50 hover:bg-green-900/20'
                            : 'bg-red-900/10 border-red-700/50 hover:bg-red-900/20'
                        }`}
                      >
                        {/* Header with Name and Status */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${
                              app.status === 'pending' ? 'bg-yellow-600/30' :
                              app.status === 'approved' ? 'bg-green-600/30' : 'bg-red-600/30'
                            }`}>
                              <Truck className={`h-6 w-6 ${
                                app.status === 'pending' ? 'text-yellow-400' :
                                app.status === 'approved' ? 'text-green-400' : 'text-red-400'
                              }`} />
                            </div>
                            <div>
                              <h3 className="text-white text-lg font-semibold">{app.full_name}</h3>
                              <p className="text-gray-400 text-sm">{app.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              app.status === 'pending' ? 'bg-yellow-600' :
                              app.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                            }>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </Badge>
                            <span className="text-gray-500 text-xs">
                              {new Date(app.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Application Details Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <Phone className="h-3 w-3" />
                              Phone
                            </div>
                            <p className="text-white font-medium">{app.phone}</p>
                          </div>
                          
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <MapPin className="h-3 w-3" />
                              Location
                            </div>
                            <p className="text-white font-medium">{app.county}</p>
                            <p className="text-gray-400 text-xs truncate">{app.physical_address}</p>
                          </div>
                          
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <Truck className="h-3 w-3" />
                              Vehicle
                            </div>
                            <p className="text-white font-medium capitalize">{app.vehicle_type.replace('_', ' ')}</p>
                            <p className="text-gray-400 text-xs">{app.vehicle_registration}</p>
                          </div>
                          
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <FileText className="h-3 w-3" />
                              License
                            </div>
                            <p className="text-white font-medium">{app.driving_license_number}</p>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <Clock className="h-3 w-3" />
                              Experience & Availability
                            </div>
                            <p className="text-white font-medium">
                              {app.years_experience} years • {app.availability.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <Globe className="h-3 w-3" />
                              Service Areas
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(app.service_areas || []).slice(0, 3).map((area, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-slate-600 text-gray-300">
                                  {area}
                                </Badge>
                              ))}
                              {(app.service_areas || []).length > 3 && (
                                <Badge variant="outline" className="text-xs border-slate-600 text-gray-300">
                                  +{app.service_areas.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                              <Shield className="h-3 w-3" />
                              Verifications
                            </div>
                            <div className="flex gap-2">
                              <Badge className={app.has_smartphone ? 'bg-green-600/50' : 'bg-gray-600/50'}>
                                {app.has_smartphone ? '✓' : '✗'} Smartphone
                              </Badge>
                              <Badge className={app.background_check_consent ? 'bg-green-600/50' : 'bg-red-600/50'}>
                                {app.background_check_consent ? '✓' : '✗'} BG Check
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {app.status === 'pending' && (
                          <div className="flex gap-3 pt-3 border-t border-slate-700">
                            <Button
                              className="bg-green-600 hover:bg-green-700 flex-1"
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from('delivery_provider_registrations')
                                    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
                                    .eq('id', app.id);
                                  
                                  toast({
                                    title: "✅ Application Approved",
                                    description: `${app.full_name} has been approved as a delivery provider.`
                                  });
                                  loadDeliveryApplications();
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to approve application."
                                  });
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Application
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from('delivery_provider_registrations')
                                    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
                                    .eq('id', app.id);
                                  
                                  toast({
                                    title: "❌ Application Rejected",
                                    description: `${app.full_name}'s application has been rejected.`
                                  });
                                  loadDeliveryApplications();
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to reject application."
                                  });
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Application
                            </Button>
                          </div>
                        )}

                        {app.status !== 'pending' && app.reviewed_at && (
                          <div className="pt-3 border-t border-slate-700">
                            <p className="text-gray-500 text-xs">
                              Reviewed on {new Date(app.reviewed_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Builder Delivery Requests Tab */}
          <TabsContent value="delivery-requests" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Total Requests</p>
                      <p className="text-2xl font-bold text-white">{builderDeliveryRequests.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Pending</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {builderDeliveryRequests.filter(r => r.status === 'pending').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Assigned</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {builderDeliveryRequests.filter(r => r.status === 'assigned').length}
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">In Transit</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {builderDeliveryRequests.filter(r => r.status === 'in_transit').length}
                      </p>
                    </div>
                    <Truck className="h-8 w-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Delivered</p>
                      <p className="text-2xl font-bold text-green-400">
                        {builderDeliveryRequests.filter(r => r.status === 'delivered').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Delivery Requests List */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  Builder Delivery Requests
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Material delivery requests from builders to their construction sites
                </CardDescription>
              </CardHeader>
              <CardContent>
                {builderDeliveryRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No delivery requests yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Builders can request deliveries from their dashboard
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {builderDeliveryRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className={`p-4 rounded-lg border ${
                          request.status === 'pending' ? 'bg-yellow-900/20 border-yellow-700' :
                          request.status === 'assigned' ? 'bg-blue-900/20 border-blue-700' :
                          request.status === 'in_transit' ? 'bg-purple-900/20 border-purple-700' :
                          request.status === 'delivered' ? 'bg-green-900/20 border-green-700' :
                          'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Request Info */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-gray-400">{request.id.slice(0, 8)}...</span>
                              <Badge className={
                                request.status === 'pending' ? 'bg-yellow-600' :
                                request.status === 'assigned' ? 'bg-blue-600' :
                                request.status === 'in_transit' ? 'bg-purple-600' :
                                request.status === 'delivered' || request.status === 'completed' ? 'bg-green-600' :
                                'bg-gray-600'
                              }>
                                {request.status === 'in_transit' ? 'In Transit' : request.status}
                              </Badge>
                              {request.required_vehicle_type && (
                                <Badge variant="outline" className="border-slate-600">
                                  {request.required_vehicle_type}
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Pickup */}
                              <div className="p-3 bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                                  <MapPin className="h-3 w-3" />
                                  PICKUP
                                </div>
                                <p className="text-white font-medium">{request.pickup_location || request.pickup_address || 'N/A'}</p>
                              </div>

                              {/* Delivery */}
                              <div className="p-3 bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                                  <MapPin className="h-3 w-3" />
                                  DELIVERY
                                </div>
                                <p className="text-white font-medium">{request.dropoff_location || request.dropoff_address || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-4 gap-3">
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Item</p>
                                <p className="text-white text-sm capitalize">{request.item_description || 'N/A'}</p>
                              </div>
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Weight</p>
                                <p className="text-white text-sm">{request.estimated_weight || 'N/A'}</p>
                              </div>
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Urgency</p>
                                <p className="text-white text-sm capitalize">{request.urgency || 'normal'}</p>
                              </div>
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Requested By</p>
                                <p className="text-white text-sm">{request.builder_name || request.builder_email || 'Unknown'}</p>
                              </div>
                            </div>

                            {request.estimated_cost && (
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Estimated Cost</p>
                                <p className="text-gray-300 text-sm">KES {request.estimated_cost.toLocaleString()}</p>
                              </div>
                            )}

                            {request.special_instructions && (
                              <div className="p-2 bg-slate-800/30 rounded">
                                <p className="text-gray-500 text-xs">Special Instructions</p>
                                <p className="text-gray-300 text-sm">{request.special_instructions}</p>
                              </div>
                            )}

                            {request.driver_id && (
                              <div className="p-2 bg-blue-900/30 rounded border border-blue-700">
                                <p className="text-blue-400 text-xs">Assigned Driver</p>
                                <p className="text-white text-sm">{request.driver_name || `Driver ID: ${request.driver_id.slice(0, 8)}...`}</p>
                                {request.driver_phone && (
                                  <p className="text-gray-400 text-xs mt-1">Phone: {request.driver_phone}</p>
                                )}
                                {request.vehicle_info && (
                                  <p className="text-gray-400 text-xs">Vehicle: {request.vehicle_info}</p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-gray-500 text-xs">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {new Date(request.created_at).toLocaleString()}
                              </span>
                              {request.preferred_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Preferred Date: {request.preferred_date} {request.preferred_time || ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={async () => {
                                    // In production, you'd open a modal to select a provider
                                    try {
                                      await supabase
                                        .from('delivery_requests')
                                        .update({ 
                                          status: 'assigned',
                                          updated_at: new Date().toISOString()
                                        })
                                        .eq('id', request.id);
                                      
                                      toast({
                                        title: "✅ Request Assigned",
                                        description: "Delivery request marked as assigned."
                                      });
                                      loadBuilderDeliveryRequests();
                                    } catch (error) {
                                      toast({
                                        variant: "destructive",
                                        title: "Error",
                                        description: "Failed to assign request."
                                      });
                                    }
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Assign Provider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      await supabase
                                        .from('delivery_requests')
                                        .update({ 
                                          status: 'cancelled',
                                          updated_at: new Date().toISOString()
                                        })
                                        .eq('id', request.id);
                                      
                                      toast({
                                        title: "❌ Request Cancelled",
                                        description: "Delivery request has been cancelled."
                                      });
                                      loadBuilderDeliveryRequests();
                                    } catch (error) {
                                      toast({
                                        variant: "destructive",
                                        title: "Error",
                                        description: "Failed to cancel request."
                                      });
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {request.status === 'assigned' && (
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('delivery_requests')
                                      .update({ status: 'in_transit' })
                                      .eq('id', request.id);
                                    
                                    toast({
                                      title: "🚚 In Transit",
                                      description: "Delivery marked as in transit."
                                    });
                                    loadBuilderDeliveryRequests();
                                  } catch (error) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "Failed to update status."
                                    });
                                  }
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Mark In Transit
                              </Button>
                            )}
                            {request.status === 'in_transit' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('delivery_requests')
                                      .update({ 
                                        status: 'delivered',
                                        updated_at: new Date().toISOString()
                                      })
                                      .eq('id', request.id);
                                    
                                    toast({
                                      title: "✅ Delivered",
                                      description: "Delivery marked as complete!"
                                    });
                                    loadBuilderDeliveryRequests();
                                  } catch (error) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "Failed to update status."
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Delivered
                              </Button>
                            )}
                            {request.status === 'delivered' && (
                              <Badge className="bg-green-600 justify-center py-2">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Requests Tab */}
          <TabsContent value="monitoring-requests" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-red-500" />
                  Builder Monitoring Service Requests
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Review and respond to monitoring service requests from builders. Approve, reject, or send quotes for camera monitoring services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MonitoringRequestsManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab - Using New Modular Component */}
          <TabsContent value="feedback" className="space-y-6">
            <FeedbackTab
              feedback={modularFeedback.length > 0 ? modularFeedback : feedbackList}
              loading={feedbackLoading}
              onRefresh={refetchFeedback}
            />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-500" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-400">RLS Policies Active</span>
                    </div>
                    <Badge className="bg-green-600">Secure</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-400">Role-Based Access</span>
                    </div>
                    <Badge className="bg-green-600">Enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-400">Admin Audit Logging</span>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Security Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-slate-800/50 border-slate-700">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-gray-300">
                      No security alerts at this time. All systems operating normally.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Document Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/30 rounded-xl">
                      <Folder className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{documents.length}</p>
                      <p className="text-sm text-purple-300">Total Documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-600/30 rounded-xl">
                      <FileCheck className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {documents.filter(d => d.status === 'verified').length}
                      </p>
                      <p className="text-sm text-green-300">Verified</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-600/30 rounded-xl">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {documents.filter(d => d.status === 'pending').length}
                      </p>
                      <p className="text-sm text-yellow-300">Pending Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/30 rounded-xl">
                      <FileX className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {documents.filter(d => d.status === 'rejected').length}
                      </p>
                      <p className="text-sm text-red-300">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Documents by Type */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-purple-400" />
                  Documents by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {['id_document', 'business_certificate', 'nca_certificate', 'license', 'insurance', 'profile_photo'].map(type => {
                    const count = documents.filter(d => d.type === type).length;
                    const labels: Record<string, string> = {
                      'id_document': 'ID Documents',
                      'business_certificate': 'Business Certs',
                      'nca_certificate': 'NCA Certs',
                      'license': 'Licenses',
                      'insurance': 'Insurance',
                      'profile_photo': 'Profile Photos'
                    };
                    return (
                      <div key={type} className="p-4 bg-slate-800/50 rounded-lg text-center">
                        <FileImage className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{count}</p>
                        <p className="text-xs text-gray-400">{labels[type]}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Documents Table */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-400" />
                    All Documents ({documents.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDocuments}
                    className="border-purple-700 text-purple-400 hover:bg-purple-900/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Document</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Uploaded By</TableHead>
                        <TableHead className="text-gray-400">Role</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.slice(0, 20).map((doc) => (
                        <TableRow key={doc.id} className="border-slate-700 hover:bg-slate-800/50">
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-400" />
                              <span className="truncate max-w-[200px]">{doc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400 capitalize">
                            {doc.type.replace('_', ' ')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white text-sm">{doc.uploadedBy}</p>
                              <p className="text-gray-500 text-xs">{doc.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              doc.userRole === 'builder' ? 'bg-blue-600' :
                              doc.userRole === 'supplier' ? 'bg-orange-600' :
                              'bg-green-600'
                            }>
                              {doc.userRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              doc.status === 'verified' ? 'bg-green-600' :
                              doc.status === 'pending' ? 'bg-yellow-600' :
                              'bg-red-600'
                            }>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 border-green-700 text-green-400 hover:bg-green-900/30">
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 border-red-700 text-red-400 hover:bg-red-900/30">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {documents.length === 0 && (
                    <div className="text-center py-8">
                      <Folder className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Documents Tab */}
          <TabsContent value="financial" className="space-y-6">
            {/* Financial Stats */}
            <div className="grid md:grid-cols-4 lg:grid-cols-8 gap-4">
              <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-600/30 rounded-xl">
                      <FileText className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.totalInvoices}</p>
                      <p className="text-sm text-emerald-300">Invoices</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/30 rounded-xl">
                      <CreditCard className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.totalPayments}</p>
                      <p className="text-sm text-blue-300">Payments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600/30 rounded-xl">
                      <ShoppingCart className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.totalPurchaseOrders}</p>
                      <p className="text-sm text-orange-300">Purchase Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/30 rounded-xl">
                      <FileCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.totalReceipts}</p>
                      <p className="text-sm text-purple-300">Receipts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-600/30 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">KES {financialStats.totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-green-300">Total Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-600/30 rounded-xl">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.pendingPayments}</p>
                      <p className="text-sm text-yellow-300">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border-cyan-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-600/30 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.completedPayments}</p>
                      <p className="text-sm text-cyan-300">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/30 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{financialStats.overdueInvoices}</p>
                      <p className="text-sm text-red-300">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Documents by Type */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-emerald-400" />
                  Financial Overview by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all ${financialFilter === 'invoice' ? 'bg-emerald-600/40 border-2 border-emerald-500' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
                    onClick={() => setFinancialFilter(financialFilter === 'invoice' ? 'all' : 'invoice')}
                  >
                    <FileText className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white text-center">{financialStats.totalInvoices}</p>
                    <p className="text-xs text-gray-400 text-center">Invoices</p>
                  </div>
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all ${financialFilter === 'payment' ? 'bg-blue-600/40 border-2 border-blue-500' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
                    onClick={() => setFinancialFilter(financialFilter === 'payment' ? 'all' : 'payment')}
                  >
                    <CreditCard className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white text-center">{financialStats.totalPayments}</p>
                    <p className="text-xs text-gray-400 text-center">Payments</p>
                  </div>
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all ${financialFilter === 'purchase_order' ? 'bg-orange-600/40 border-2 border-orange-500' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
                    onClick={() => setFinancialFilter(financialFilter === 'purchase_order' ? 'all' : 'purchase_order')}
                  >
                    <ShoppingCart className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white text-center">{financialStats.totalPurchaseOrders}</p>
                    <p className="text-xs text-gray-400 text-center">Purchase Orders</p>
                  </div>
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all ${financialFilter === 'purchase_receipt' ? 'bg-purple-600/40 border-2 border-purple-500' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
                    onClick={() => setFinancialFilter(financialFilter === 'purchase_receipt' ? 'all' : 'purchase_receipt')}
                  >
                    <FileCheck className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white text-center">{financialStats.totalReceipts}</p>
                    <p className="text-xs text-gray-400 text-center">Receipts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Documents Table */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    All Financial Documents ({financialFilter === 'all' ? financialDocuments.length : financialDocuments.filter(d => d.type === financialFilter).length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={financialFilter} onValueChange={(value: any) => setFinancialFilter(value)}>
                      <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-white">All Documents</SelectItem>
                        <SelectItem value="invoice" className="text-white">Invoices</SelectItem>
                        <SelectItem value="payment" className="text-white">Payments</SelectItem>
                        <SelectItem value="purchase_order" className="text-white">Purchase Orders</SelectItem>
                        <SelectItem value="purchase_receipt" className="text-white">Receipts</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadFinancialData}
                      className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-700 text-blue-400 hover:bg-blue-900/30"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Reference</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Description</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(financialFilter === 'all' ? financialDocuments : financialDocuments.filter(d => d.type === financialFilter))
                        .slice(0, 50)
                        .map((doc) => (
                        <TableRow key={doc.id} className="border-slate-700 hover:bg-slate-800/50">
                          <TableCell>
                            <Badge className={
                              doc.type === 'invoice' ? 'bg-emerald-600' :
                              doc.type === 'payment' ? 'bg-blue-600' :
                              doc.type === 'purchase_order' ? 'bg-orange-600' :
                              'bg-purple-600'
                            }>
                              <div className="flex items-center gap-1">
                                {doc.type === 'invoice' && <FileText className="h-3 w-3" />}
                                {doc.type === 'payment' && <CreditCard className="h-3 w-3" />}
                                {doc.type === 'purchase_order' && <ShoppingCart className="h-3 w-3" />}
                                {doc.type === 'purchase_receipt' && <FileCheck className="h-3 w-3" />}
                                {doc.type.replace('_', ' ')}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-mono font-medium">
                            {doc.reference}
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            <span className="text-emerald-400">{doc.currency}</span> {doc.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              doc.status === 'completed' || doc.status === 'paid' ? 'bg-green-600' :
                              doc.status === 'pending' || doc.status === 'draft' ? 'bg-yellow-600' :
                              doc.status === 'processing' || doc.status === 'sent' ? 'bg-blue-600' :
                              doc.status === 'overdue' || doc.status === 'failed' || doc.status === 'cancelled' ? 'bg-red-600' :
                              'bg-gray-600'
                            }>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 max-w-[200px] truncate">
                            {doc.description || doc.partyName}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(doc.date).toLocaleDateString('en-KE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 border-blue-700 text-blue-400 hover:bg-blue-900/30">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 border-slate-700 text-gray-400 hover:bg-slate-800">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                  <DropdownMenuLabel className="text-gray-400">Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-slate-700" />
                                  <DropdownMenuItem className="text-white hover:bg-slate-700">
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white hover:bg-slate-700">
                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white hover:bg-slate-700">
                                    <FileText className="h-4 w-4 mr-2" /> View Items
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {financialDocuments.length === 0 && (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No financial documents found</p>
                      <p className="text-gray-500 text-sm mt-1">Financial records will appear here as transactions occur</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Recent Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialDocuments
                      .filter(d => d.type === 'payment')
                      .slice(0, 5)
                      .map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/30 rounded-lg">
                              <CreditCard className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{doc.reference}</p>
                              <p className="text-gray-500 text-xs">{doc.partyName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-semibold">{doc.currency} {doc.amount.toLocaleString()}</p>
                            <Badge className={doc.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'} variant="outline">
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                    ))}
                    {financialDocuments.filter(d => d.type === 'payment').length === 0 && (
                      <p className="text-gray-500 text-center py-4">No recent payments</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    Recent Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialDocuments
                      .filter(d => d.type === 'invoice')
                      .slice(0, 5)
                      .map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-600/30 rounded-lg">
                              <FileText className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{doc.reference}</p>
                              <p className="text-gray-500 text-xs">{new Date(doc.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-semibold">{doc.currency} {doc.amount.toLocaleString()}</p>
                            <Badge className={
                              doc.status === 'paid' ? 'bg-green-600' : 
                              doc.status === 'overdue' ? 'bg-red-600' : 
                              'bg-yellow-600'
                            } variant="outline">
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                    ))}
                    {financialDocuments.filter(d => d.type === 'invoice').length === 0 && (
                      <p className="text-gray-500 text-center py-4">No recent invoices</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ML & AI Tab */}
          <TabsContent value="ml" className="space-y-6">
            {/* ML Stats */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-pink-900/40 to-pink-800/20 border-pink-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pink-600/30 rounded-xl">
                      <Brain className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.totalPredictions}</p>
                      <p className="text-sm text-pink-300">Total Predictions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-600/30 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.successRate.toFixed(1)}%</p>
                      <p className="text-sm text-green-300">Success Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/30 rounded-xl">
                      <Timer className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.avgProcessingTime.toFixed(0)}ms</p>
                      <p className="text-sm text-blue-300">Avg Response</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/30 rounded-xl">
                      <Bot className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.activeModels}</p>
                      <p className="text-sm text-purple-300">Active Models</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border-cyan-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-600/30 rounded-xl">
                      <Sparkles className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.todayPredictions}</p>
                      <p className="text-sm text-cyan-300">Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/30 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{mlStats.errorRate.toFixed(1)}%</p>
                      <p className="text-sm text-red-300">Error Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Active ML Models */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-pink-400" />
                  Active ML Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'ProductRecommender', version: 'v2.1', type: 'Recommendation', accuracy: 89, status: 'active' },
                    { name: 'PricePredictor', version: 'v1.5', type: 'Regression', accuracy: 92, status: 'active' },
                    { name: 'FraudDetector', version: 'v3.0', type: 'Anomaly Detection', accuracy: 97, status: 'active' },
                    { name: 'FeedbackAnalyzer', version: 'v1.2', type: 'Sentiment Analysis', accuracy: 94, status: 'active' },
                    { name: 'UserSegmenter', version: 'v2.0', type: 'Classification', accuracy: 86, status: 'active' }
                  ].map((model, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">{model.name}</h4>
                          <p className="text-gray-400 text-xs">{model.version} • {model.type}</p>
                        </div>
                        <Badge className="bg-green-600">Active</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Accuracy</span>
                          <span className="text-white font-medium">{model.accuracy}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${model.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* ML Activity Log */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-pink-400" />
                    Recent ML Activities
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMLActivities}
                    className="border-pink-700 text-pink-400 hover:bg-pink-900/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mlActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            activity.type === 'recommendation' ? 'bg-blue-600/30' :
                            activity.type === 'prediction' ? 'bg-green-600/30' :
                            activity.type === 'anomaly_detection' ? 'bg-red-600/30' :
                            activity.type === 'sentiment_analysis' ? 'bg-yellow-600/30' :
                            'bg-purple-600/30'
                          }`}>
                            {activity.type === 'recommendation' ? <Sparkles className="h-4 w-4 text-blue-400" /> :
                             activity.type === 'prediction' ? <LineChart className="h-4 w-4 text-green-400" /> :
                             activity.type === 'anomaly_detection' ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
                             activity.type === 'sentiment_analysis' ? <MessageSquare className="h-4 w-4 text-yellow-400" /> :
                             <PieChart className="h-4 w-4 text-purple-400" />}
                          </div>
                          <div>
                            <p className="text-white font-medium">{activity.model}</p>
                            <p className="text-gray-400 text-xs capitalize">{activity.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={activity.status === 'success' ? 'bg-green-600' : activity.status === 'error' ? 'bg-red-600' : 'bg-yellow-600'}>
                            {activity.status}
                          </Badge>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                        <div className="p-2 bg-slate-900/50 rounded">
                          <p className="text-gray-400 text-xs mb-1">Input</p>
                          <p className="text-gray-300 truncate">{activity.input}</p>
                        </div>
                        <div className="p-2 bg-slate-900/50 rounded">
                          <p className="text-gray-400 text-xs mb-1">Output</p>
                          <p className="text-gray-300 truncate">{activity.output}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Confidence: {(activity.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {activity.processingTime}ms
                        </span>
                      </div>
                    </div>
                  ))}
                  {mlActivities.length === 0 && (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No ML activities recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* ML Controls */}
            <Card className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border-pink-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-pink-400" />
                  ML System Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 h-auto py-4"
                    onClick={() => toast({ title: "🚀 ML System", description: "All models are running optimally" })}
                  >
                    <div className="text-center">
                      <Activity className="h-6 w-6 mx-auto mb-2" />
                      <span>Start All Models</span>
                    </div>
                  </Button>
                  <Button 
                    className="bg-yellow-600 hover:bg-yellow-700 h-auto py-4"
                    onClick={() => toast({ title: "🔄 Retraining", description: "Model retraining scheduled" })}
                  >
                    <div className="text-center">
                      <RefreshCw className="h-6 w-6 mx-auto mb-2" />
                      <span>Retrain Models</span>
                    </div>
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 h-auto py-4"
                    onClick={() => toast({ title: "📊 Report", description: "Generating ML performance report..." })}
                  >
                    <div className="text-center">
                      <FileBarChart className="h-6 w-6 mx-auto mb-2" />
                      <span>Generate Report</span>
                    </div>
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 h-auto py-4"
                    onClick={() => toast({ title: "⏸️ Paused", description: "All ML processing paused" })}
                  >
                    <div className="text-center">
                      <XCircle className="h-6 w-6 mx-auto mb-2" />
                      <span>Pause All</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-6">
            <StaffManagement />
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity-log" className="space-y-6">
            <ActivityLogViewer />
          </TabsContent>

          {/* QR Scanning Activities Tab */}
          <TabsContent value="scanning" className="space-y-6">
            <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-cyan-400" />
                  QR Scanning Activities Monitor
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time monitoring of all QR code scanning activities across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <Scan className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">Live</div>
                    <p className="text-xs text-gray-400">Monitoring Status</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">Dispatch</div>
                    <p className="text-xs text-gray-400">Outgoing Scans</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">Receiving</div>
                    <p className="text-xs text-gray-400">Incoming Scans</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">Alerts</div>
                    <p className="text-xs text-gray-400">Issues Detected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Embedded Admin Scan Dashboard */}
            <AdminScanDashboard />
          </TabsContent>

          {/* Communications Tab - Unified Chatbot, Support & Contact Messages */}
          <TabsContent value="communications" className="space-y-6">
            {/* Live Chat Manager - Real-time client-staff chat */}
            <LiveChatManager 
              staffId={adminEmail || 'admin'}
              staffName={adminEmail?.split('@')[0] || 'Support Team'}
            />

            {/* Legacy Conversations Viewer */}
            <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                  Legacy Communications
                </CardTitle>
                <CardDescription className="text-gray-400">
                  View older chatbot conversations, support chats, and contact form submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <AdminConversationsViewer 
                  staffId={adminEmail || 'admin'}
                  staffName={adminEmail?.split('@')[0] || 'Support Team'}
                  isDarkMode={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Approval Tab */}
          <TabsContent value="videos" className="space-y-6">
            <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-orange-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-orange-400" />
                  Builder Video Approval
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Review and approve builder portfolio videos before they are visible to the public
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <AdminVideoApproval />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Analytics Tab */}
          <TabsContent value="delivery-analytics" className="space-y-6">
            <Card className="bg-gradient-to-r from-teal-900/30 to-green-900/30 border-teal-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-400" />
                  Delivery Provider Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Comprehensive analytics and performance metrics for all delivery providers
                </CardDescription>
              </CardHeader>
            </Card>
            <DeliveryAnalytics />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Admin Universal Access */}
            <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  Admin Universal Access
                </CardTitle>
                <CardDescription className="text-gray-400">
                  As an admin, you have access to ALL pages without role restrictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Button 
                    className="justify-start bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30"
                    onClick={() => navigate('/builder-dashboard')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Builder Dashboard
                  </Button>
                  <Button 
                    className="justify-start bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/30"
                    onClick={() => navigate('/supplier-dashboard')}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Supplier Dashboard
                  </Button>
                  <Button 
                    className="justify-start bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-600/30"
                    onClick={() => navigate('/delivery-dashboard')}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Delivery Dashboard
                  </Button>
                  <Button 
                    className="justify-start bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30"
                    onClick={() => navigate('/supplier-marketplace')}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Marketplace
                  </Button>
                  <Button 
                    className="justify-start bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30"
                    onClick={() => navigate('/analytics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button 
                    className="justify-start bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
                    onClick={() => navigate('/monitoring')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Monitoring
                  </Button>
                  <Button 
                    className="justify-start bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30"
                    onClick={() => navigate('/tracking')}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Tracking
                  </Button>
                  <Button 
                    className="justify-start bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-600/30"
                    onClick={() => navigate('/scanners')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Scanners
                  </Button>
                  <Button 
                    className="justify-start bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-600/30"
                    onClick={() => navigate('/feedback')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Feedback
                  </Button>
                  <Button 
                    className="justify-start bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-600/30"
                    onClick={() => navigate('/home')}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Home Page
                  </Button>
                  <Button 
                    className="justify-start bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30"
                    onClick={() => navigate('/about')}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    About
                  </Button>
                  <Button 
                    className="justify-start bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/30"
                    onClick={() => navigate('/contact')}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Admin Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-900/20 border-blue-800/50">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-300">
                    Advanced settings are managed through the Supabase dashboard. 
                    Contact your IT administrator for database-level changes.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-gray-300 hover:bg-slate-800"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Open Supabase Dashboard
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-gray-300 hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Roles Management Tab */}
          <TabsContent value="user-roles" className="space-y-6">
            <UserRolesManager />
          </TabsContent>

          <TabsContent value="messaging" className="space-y-6">
            <AdminMessaging />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <p>© 2024 MradiPro Admin Portal. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>System Status: Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </ThemeProvider>
  );
};

export default AdminDashboard;

