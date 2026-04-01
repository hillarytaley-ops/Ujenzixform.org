import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import AnimatedSection from "@/components/AnimatedSection";
import { 
  Video, 
  Camera, 
  Eye, 
  Shield, 
  Activity, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Users,
  Wifi,
  Battery,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Monitor,
  Zap,
  Plane,
  Truck,
  Key,
  Lock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import {
  fetchMyMonitoringServiceRequests,
  monitoringRestOpts,
} from '@/utils/myMonitoringServiceRequests';
import { useToast } from '@/hooks/use-toast';
import { DeliveryRouteTracker } from '@/components/delivery/DeliveryRouteTracker';
import { CameraAccessRequest } from '@/components/builders/CameraAccessRequest';
import { MonitoringServiceRequest } from '@/components/builders/MonitoringServiceRequest';
import { CameraRemoteCapabilitiesPanel } from '@/components/monitoring/CameraRemoteCapabilitiesPanel';

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  projectSite: string;
  status: 'online' | 'offline' | 'recording' | 'maintenance';
  quality: '480p' | '720p' | '1080p' | '4K';
  viewers: number;
  uptime: string;
  lastActivity: Date;
  isRecording: boolean;
  batteryLevel?: number;
  signalStrength: number;
  stream_url?: string | null;
  embed_code?: string | null;
  connection_type?: string;
  supports_ptz?: boolean;
  supports_two_way_audio?: boolean;
}

interface ProjectMonitoring {
  id: string;
  projectName: string;
  location: string;
  status: 'active' | 'paused' | 'completed';
  cameras: number;
  activeCameras: number;
  alerts: number;
  lastUpdate: Date;
  progress: number;
}

const Monitoring = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("cameras");
  // Start with localStorage role for instant access, then verify
  const [userRole, setUserRole] = useState<string | null>(() => {
    // Check localStorage immediately for instant UI
    const cachedRole = localStorage.getItem('user_role');
    if (cachedRole && ['admin', 'professional_builder', 'private_client', 'builder'].includes(cachedRole)) {
      return cachedRole;
    }
    return null;
  });
  const [user, setUser] = useState<any>(null);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [hasMonitoringAccess, setHasMonitoringAccess] = useState<boolean>(false);
  // Start with false if we have a cached role, true otherwise
  const [checkingAccess, setCheckingAccess] = useState<boolean>(() => {
    const cachedRole = localStorage.getItem('user_role');
    return !cachedRole || !['admin', 'professional_builder', 'private_client', 'builder'].includes(cachedRole);
  });
  const [monitoringRequest, setMonitoringRequest] = useState<any>(null);
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);
  // If we have a cached role, consider DB verified for instant access
  const [dbVerified, setDbVerified] = useState<boolean>(() => {
    const cachedRole = localStorage.getItem('user_role');
    return !!cachedRole && ['admin', 'professional_builder', 'private_client', 'builder'].includes(cachedRole);
  });
  const { toast } = useToast();
  
  // Access code from URL for clients viewing their assigned cameras
  const accessCodeFromUrl = searchParams.get('access_code');
  const projectFromUrl = searchParams.get('project');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [assignedCameras, setAssignedCameras] = useState<any[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  
  // Camera view controls
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraViewSize, setCameraViewSize] = useState<'normal' | 'large' | 'fullscreen'>('normal');

  // Handle body scroll lock when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setCameraViewSize('normal');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Sample monitoring data
  const [cameras] = useState<CameraFeed[]>([
    {
      id: 'cam-001',
      name: 'Main Entrance Camera',
      location: 'Gate A - Security Checkpoint',
      projectSite: 'Westlands Commercial Complex',
      status: 'online',
      quality: '1080p',
      viewers: 3,
      uptime: '2h 15m',
      lastActivity: new Date(),
      isRecording: true,
      signalStrength: 95,
      supports_ptz: true,
      supports_two_way_audio: true,
    },
    {
      id: 'cam-002',
      name: 'Foundation Work Area',
      location: 'Block A - Foundation Site',
      projectSite: 'Karen Residential Project',
      status: 'recording',
      quality: '720p',
      viewers: 5,
      uptime: '4h 32m',
      lastActivity: new Date(),
      isRecording: true,
      signalStrength: 87
    },
    {
      id: 'cam-003',
      name: 'Material Storage Camera',
      location: 'Warehouse - Storage Area',
      projectSite: 'Kilimani Office Complex',
      status: 'offline',
      quality: '480p',
      viewers: 0,
      uptime: '0m',
      lastActivity: new Date(Date.now() - 1800000),
      isRecording: false,
      batteryLevel: 15,
      signalStrength: 23
    },
    {
      id: 'drone-001',
      name: 'Drone Camera - Aerial View',
      location: 'Aerial Coverage - Full Site',
      projectSite: 'Westlands Commercial Complex',
      status: 'online',
      quality: '4K',
      viewers: 8,
      uptime: '1h 45m',
      lastActivity: new Date(),
      isRecording: true,
      batteryLevel: 78,
      signalStrength: 92
    },
    {
      id: 'drone-002',
      name: 'Drone Camera - Progress View',
      location: 'Aerial Coverage - Construction Progress',
      projectSite: 'Karen Residential Project',
      status: 'recording',
      quality: '4K',
      viewers: 12,
      uptime: '3h 20m',
      lastActivity: new Date(),
      isRecording: true,
      batteryLevel: 65,
      signalStrength: 88
    },
    {
      id: 'drone-003',
      name: 'Drone Camera - Site Survey',
      location: 'Aerial Coverage - Site Overview',
      projectSite: 'Kilimani Office Complex',
      status: 'maintenance',
      quality: '1080p',
      viewers: 0,
      uptime: '0m',
      lastActivity: new Date(Date.now() - 7200000),
      isRecording: false,
      batteryLevel: 25,
      signalStrength: 45
    }
  ]);

  const activeCameraList = assignedCameras.length > 0 ? assignedCameras : cameras;

  const [projects] = useState<ProjectMonitoring[]>([
    {
      id: 'proj-001',
      projectName: 'Westlands Commercial Complex',
      location: 'Westlands, Nairobi',
      status: 'active',
      cameras: 8,
      activeCameras: 7,
      alerts: 1,
      lastUpdate: new Date(),
      progress: 65
    },
    {
      id: 'proj-002',
      projectName: 'Karen Residential Project',
      location: 'Karen, Nairobi',
      status: 'active',
      cameras: 6,
      activeCameras: 6,
      alerts: 0,
      lastUpdate: new Date(),
      progress: 45
    },
    {
      id: 'proj-003',
      projectName: 'Kilimani Office Complex',
      location: 'Kilimani, Nairobi',
      status: 'paused',
      cameras: 12,
      activeCameras: 0,
      alerts: 3,
      lastUpdate: new Date(Date.now() - 3600000),
      progress: 30
    }
  ]);

  useEffect(() => {
    checkUserRole();
  }, []);

  // Load cameras when access code is provided in URL
  useEffect(() => {
    if (accessCodeFromUrl) {
      loadCamerasFromAccessCode(accessCodeFromUrl);
    }
  }, [accessCodeFromUrl]);

  useEffect(() => {
    // Set default tab based on role
    if (userRole === 'admin') {
      setActiveTab("overview");
    } else if (['builder', 'professional_builder', 'private_client'].includes(userRole || '')) {
      setActiveTab("cameras");
    }
  }, [userRole]);

  // Load cameras assigned to a monitoring request via access code
  const loadCamerasFromAccessCode = async (code: string) => {
    console.log('📹 Loading cameras for access code:', code);
    setLoadingCameras(true);

    try {
      // SECURITY DEFINER RPC: validates code + returns only assigned cameras (works for guests without JWT)
      const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_monitoring_access_code', {
        p_code: code.trim(),
      });

      if (rpcError) {
        console.error('📹 resolve_monitoring_access_code:', rpcError);
        throw new Error(rpcError.message || 'Failed to resolve access code');
      }

      const payload = rpcData as {
        ok?: boolean;
        reason?: string;
        request?: { id?: string; project_name?: string; status?: string; access_code?: string };
        cameras?: any[];
      } | null;

      if (!payload?.ok) {
        toast({
          title: 'Invalid Access Code',
          description:
            payload?.reason === 'not_found'
              ? 'The access code is invalid or has expired.'
              : 'Could not validate this access code.',
          variant: 'destructive',
        });
        setAssignedCameras([]);
        setLoadingCameras(false);
        return;
      }

      const requestData = payload.request || {};
      const camerasData = Array.isArray(payload.cameras) ? payload.cameras : [];

      console.log('📹 Request data:', requestData);
      setMonitoringRequest(requestData);
      setHasMonitoringAccess(true);

      if (camerasData.length === 0) {
        toast({
          title: 'No Cameras Assigned',
          description: 'No cameras have been assigned to this project yet. Please contact admin.',
        });
        setAssignedCameras([]);
        setLoadingCameras(false);
        return;
      }

      // Transform to CameraFeed format
      const transformedCameras = camerasData.map((cam: any) => ({
        id: cam.id,
        name: cam.name,
        location: cam.location || 'Location not specified',
        projectSite: requestData.project_name,
        status: cam.is_active ? 'online' : 'offline',
        quality: cam.resolution || '1080p',
        viewers: 1,
        uptime: 'Live',
        lastActivity: new Date(),
        isRecording: cam.is_active,
        signalStrength: cam.is_active ? 95 : 0,
        stream_url: cam.stream_url,
        embed_code: cam.embed_code,
        connection_type: cam.connection_type,
        supports_ptz: cam.supports_ptz === true,
        supports_two_way_audio: cam.supports_two_way_audio === true,
      }));

      setAssignedCameras(transformedCameras);
      console.log('📹 ✅ Loaded', transformedCameras.length, 'cameras');
      
      toast({
        title: '✅ Cameras Loaded',
        description: `${transformedCameras.length} camera(s) loaded for ${requestData.project_name}`,
      });

    } catch (error) {
      console.error('📹 Error loading cameras:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cameras. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingCameras(false);
    }
  };

  // Handle manual access code entry
  const handleAccessCodeSubmit = () => {
    if (accessCodeInput.trim()) {
      loadCamerasFromAccessCode(accessCodeInput.trim());
    }
  };

  const checkUserRole = async () => {
    console.log('🔐 Monitoring - Starting auth check...');
    
    // Don't reset states if we already have valid cached data
    const cachedRole = localStorage.getItem('user_role');
    const isValidCachedRole = cachedRole && ['admin', 'professional_builder', 'private_client', 'builder'].includes(cachedRole);
    
    if (!isValidCachedRole) {
      setCheckingAccess(true);
      setDbVerified(false);
    }
    
    // Quick timeout - if we can't verify in 3 seconds and have cached role, use it
    const timeout = setTimeout(() => {
      console.log('🔐 Monitoring - Timeout reached');
      if (isValidCachedRole) {
        console.log('✅ Monitoring - Using cached role:', cachedRole);
        setUserRole(cachedRole);
        setDbVerified(true);
        setCheckingAccess(false);
      } else {
        console.log('🚫 Monitoring - No cached role, blocking access');
        setUserRole(null);
        setHasMonitoringAccess(false);
        setDbVerified(true);
        setCheckingAccess(false);
      }
    }, 3000);
    
    try {
      // Get user ID from localStorage first (fastest)
      let userId: string = '';
      let authUser: any = null;
      let accessToken = '';
      
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id || '';
          authUser = parsed.user;
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.log('🔐 Monitoring - localStorage parse error');
      }
      
      // Fallback to Supabase client if localStorage fails
      if (!userId) {
        try {
          const { data } = await supabase.auth.getUser();
          authUser = data?.user;
          userId = authUser?.id || '';
          
          // Also try to get token
          const { data: sessionData } = await supabase.auth.getSession();
          accessToken = sessionData?.session?.access_token || '';
        } catch (e) {
          console.log('🔐 Monitoring - Supabase getUser failed');
        }
      }
      
      console.log('🔐 Monitoring - userId:', userId);
      
      if (!userId) {
        console.log('🚫 Monitoring - No user found');
        clearTimeout(timeout);
        setUser(null);
        setUserRole(null);
        setHasMonitoringAccess(false);
        setDbVerified(true);
        setCheckingAccess(false);
        return;
      }
      
      setUser(authUser);
      
      // Try REST API for role check
      let dbRole: string | null = null;
      try {
        const response = await fetch(
          `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/user_roles?user_id=eq.${userId}&select=role`,
          {
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken || ANON_KEY}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          dbRole = data?.[0]?.role || null;
          console.log('🔐 Monitoring - REST API role:', dbRole);
        }
      } catch (e) {
        console.log('🔐 Monitoring - REST API error');
      }
      
      // Use cached role if REST fails
      if (!dbRole && isValidCachedRole) {
        dbRole = cachedRole;
        console.log('🔐 Monitoring - Using cached role:', dbRole);
      }
      
      console.log('🔐 Monitoring - Final role:', dbRole);
      clearTimeout(timeout);
      
      // NO ROLE IN DATABASE = BLOCK ACCESS
      if (!dbRole) {
        console.log('🚫 Monitoring - NO ROLE IN DATABASE - Blocking access');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        setUserRole(null);
        setHasMonitoringAccess(false);
        clearTimeout(timeout);
        setDbVerified(true);
        setCheckingAccess(false);
        return;
      }
      
      // Role found in database - set it
      setUserRole(dbRole);
      localStorage.setItem('user_role', dbRole);
      localStorage.setItem('user_role_id', authUser.id);
      
      // For builders (including professional_builder and private_client), check if they have an approved/active monitoring request
      const isBuilderRole = ['builder', 'professional_builder', 'private_client'].includes(dbRole);
      
      if (isBuilderRole) {
        // Approved subscription does NOT unlock live cameras — user must enter access code (or ?access_code=).
        console.log('🔐 Monitoring - Builder context (code required for camera access):', authUser.id);

        const { rows: allMonitoring } = await fetchMyMonitoringServiceRequests(
          supabase,
          monitoringRestOpts(
            SUPABASE_URL,
            ANON_KEY,
            userId,
            accessToken
          )
        );
        const approved = allMonitoring
          .filter((r: { status?: string }) =>
            ['approved', 'active', 'completed', 'in_progress'].includes(String(r.status || ''))
          )
          .sort(
            (a: { created_at?: string }, b: { created_at?: string }) =>
              new Date(String(b.created_at || 0)).getTime() -
              new Date(String(a.created_at || 0)).getTime()
          );
        const monitoringData = approved.slice(0, 1);

        setMonitoringRequest(monitoringData.length > 0 ? monitoringData[0] : null);

        console.log(
          monitoringData.length > 0
            ? '🔐 Monitoring - Approved service on file; enter access code to open cameras'
            : '⚠️ Monitoring - No approved monitoring requests'
        );
      } else if (dbRole === 'admin') {
        // Admins always have access
        setHasMonitoringAccess(true);
      } else {
        // Other roles (suppliers, delivery) don't have monitoring access
        setHasMonitoringAccess(false);
      }
      
      clearTimeout(timeout);
    } catch (error) {
      console.error('🚫 Monitoring - Error checking role:', error);
      // ON ERROR: Block access - don't trust localStorage!
      setUserRole(null);
      setHasMonitoringAccess(false);
      clearTimeout(timeout);
    } finally {
      setDbVerified(true);
      setCheckingAccess(false);
    }
  };

  // Define effectiveRole early - use userRole from state, or fall back to localStorage
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const effectiveRoleEarly = userRole || storedRole;
  
  const isAdmin = effectiveRoleEarly === 'admin';
  const isBuilder = ['builder', 'professional_builder', 'private_client'].includes(effectiveRoleEarly || '');
  const isDeliveryProvider = effectiveRoleEarly === 'delivery_provider' || effectiveRoleEarly === 'delivery';
  // Builders can view cameras if they have the role (monitoring access check is done separately)
  const canViewCameras = isAdmin || isBuilder;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'active': case 'recording': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline': case 'paused': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'recording': return <Video className="h-4 w-4" />;
      case 'offline': case 'paused': return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  // Show loading ONLY if we don't have a cached role AND we're still checking
  // If we have a cached builder role, show content immediately
  const hasValidCachedRole = storedRole && ['admin', 'professional_builder', 'private_client', 'builder'].includes(storedRole);
  
  if (checkingAccess && !hasValidCachedRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Verifying monitoring access...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Use either the verified role or the cached role (already defined as effectiveRoleEarly)
  const isValidRole = effectiveRoleEarly && ['admin', 'professional_builder', 'private_client', 'builder'].includes(effectiveRoleEarly);
  
  console.log('🔐 Monitoring RENDER - effectiveRole:', effectiveRoleEarly, 'userRole:', userRole, 'storedRole:', storedRole);
  
  // Block users without any valid role
  if (!isValidRole) {
    console.log('🚫 Monitoring - Showing Registration Required because no valid role');
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=1080&fit=crop&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/90 via-red-800/85 to-orange-900/90"></div>
          </div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 p-4 bg-red-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center backdrop-blur-md border border-red-400/30">
                <Shield className="h-12 w-12 text-red-300" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Registration Required
              </h1>
              <p className="text-xl text-white/80 mb-6">
                You need to register with a specific role to access monitoring features.
                Please sign up through one of our role-specific portals.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <a 
                  href="/builder-signin"
                  className="p-6 bg-blue-600/30 backdrop-blur rounded-xl border border-blue-400/30 hover:bg-blue-600/50 transition text-center"
                >
                  <Users className="h-10 w-10 text-blue-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-white">Builder</h3>
                  <p className="text-xs text-blue-200 mt-1">For construction monitoring</p>
                </a>
                <a 
                  href="/supplier-signin"
                  className="p-6 bg-orange-600/30 backdrop-blur rounded-xl border border-orange-400/30 hover:bg-orange-600/50 transition text-center"
                >
                  <Camera className="h-10 w-10 text-orange-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-white">Supplier</h3>
                  <p className="text-xs text-orange-200 mt-1">For material tracking</p>
                </a>
                <a 
                  href="/delivery-signin"
                  className="p-6 bg-teal-600/30 backdrop-blur rounded-xl border border-teal-400/30 hover:bg-teal-600/50 transition text-center"
                >
                  <Truck className="h-10 w-10 text-teal-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-white">Delivery</h3>
                  <p className="text-xs text-teal-200 mt-1">For delivery tracking</p>
                </a>
              </div>
              
              <div className="mt-8">
                <a href="/home" className="text-white/60 hover:text-white text-sm">
                  ← Back to Home
                </a>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  // BLOCK DELIVERY PROVIDERS - They should not access monitoring page
  if (isDeliveryProvider) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=1080&fit=crop&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/90 via-orange-800/85 to-red-900/90"></div>
          </div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 p-4 bg-amber-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center backdrop-blur-md border border-amber-400/30">
                <Truck className="h-12 w-12 text-amber-300" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Delivery Provider Access
              </h1>
              <p className="text-xl text-white/80 mb-6">
                Site monitoring features are not available for delivery providers.
                Please use your dedicated delivery dashboard for tracking and managing deliveries.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                <a 
                  href="/delivery-dashboard"
                  className="p-6 bg-teal-600/30 backdrop-blur rounded-xl border border-teal-400/30 hover:bg-teal-600/50 transition text-center"
                >
                  <Truck className="h-10 w-10 text-teal-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-white">Delivery Dashboard</h3>
                  <p className="text-xs text-teal-200 mt-1">Manage your deliveries</p>
                </a>
                <a 
                  href="/tracking"
                  className="p-6 bg-blue-600/30 backdrop-blur rounded-xl border border-blue-400/30 hover:bg-blue-600/50 transition text-center"
                >
                  <MapPin className="h-10 w-10 text-blue-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-white">Delivery Tracking</h3>
                  <p className="text-xs text-blue-200 mt-1">Track active deliveries</p>
                </a>
              </div>
              
              <div className="mt-8">
                <a href="/home" className="text-white/60 hover:text-white text-sm">
                  ← Back to Home
                </a>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  // Show access denied for builders without approved monitoring requests
  if (isBuilder && !hasMonitoringAccess) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        
        {/* Futuristic Hero for Access Required */}
        <section className="py-16 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=1080&fit=crop&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/90 via-orange-900/85 to-red-900/90"></div>
          </div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 p-4 bg-amber-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center backdrop-blur-md border border-amber-400/30">
                <AlertTriangle className="h-12 w-12 text-amber-300" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                {showRequestForm ? 'Request Monitoring Service' : 'Monitoring Access Required'}
              </h1>
              <p className="text-xl text-white/80 mb-6">
                {showRequestForm 
                  ? 'Fill out the form below to request 24/7 surveillance for your construction site'
                  : 'To access the Site Monitoring features, you need an approved monitoring service subscription.'
                }
              </p>
              {showRequestForm && (
                <Button 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setShowRequestForm(false)}
                >
                  ← Back to Overview
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Request Form or Info Section */}
        <section className="py-12 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="container mx-auto px-4">
            {showRequestForm ? (
              /* Show the Monitoring Service Request Form */
              <div className="max-w-5xl mx-auto">
                <Card className="bg-slate-900/80 border-cyan-500/30 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <CardContent className="p-4 md:p-6 h-[80vh] min-h-[700px]">
                    <MonitoringServiceRequest />
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Show Info and CTA */
              <div className="max-w-3xl mx-auto">
                <Card className="bg-slate-900/80 border-amber-500/30 backdrop-blur-xl shadow-2xl">
                  <CardHeader className="text-center bg-gradient-to-r from-amber-950/50 to-orange-950/50 border-b border-amber-500/20">
                    <CardTitle className="text-2xl flex items-center justify-center gap-3 text-white">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Camera className="h-6 w-6 text-amber-400" />
                      </div>
                      Request Monitoring Service
                    </CardTitle>
                    <CardDescription className="text-base text-slate-400">
                      Get 24/7 surveillance for your construction site with professional camera monitoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {/* Benefits */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-300">Live Camera Feeds</h4>
                            <p className="text-sm text-green-400/70">Watch your construction site in real-time from anywhere</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-300">Security Alerts</h4>
                            <p className="text-sm text-blue-400/70">Get instant notifications for any suspicious activity</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Video className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-purple-300">Recorded Footage</h4>
                            <p className="text-sm text-purple-400/70">Access recordings for progress review and documentation</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Plane className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-300">Drone Surveillance</h4>
                            <p className="text-sm text-amber-400/70">Aerial views for comprehensive site monitoring</p>
                          </div>
                        </div>
                      </div>

                      {/* How it Works */}
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
                          <Clock className="h-5 w-5 text-cyan-400" />
                          How to Get Access
                        </h4>
                        <ol className="space-y-3 text-sm">
                          <li className="flex items-start gap-3">
                            <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                            <span className="text-slate-300">Submit a monitoring service request with your project details</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                            <span className="text-slate-300">Receive a detailed quotation within 24 hours</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                            <span className="text-slate-300">Accept the quotation and complete payment</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                            <span className="text-slate-300">Access your monitoring dashboard with your unique access code</span>
                          </li>
                        </ol>
                      </div>

                      {/* Access Code Entry */}
                      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/30 mb-6">
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
                          <Key className="h-5 w-5 text-cyan-400" />
                          Already Have an Access Code?
                        </h4>
                        <p className="text-sm text-slate-400 mb-4">
                          Enter your access code below to view your assigned cameras. Signing in alone does not unlock
                          live feeds — the code is required for every session unless you use an invite link with the code in the URL.
                        </p>
                        {monitoringRequest?.project_name && (
                          <p className="text-sm text-cyan-200/90 mb-4">
                            Active monitoring on file for{' '}
                            <span className="font-semibold">{monitoringRequest.project_name}</span> — use the code issued for
                            that site.
                          </p>
                        )}
                        <div className="flex gap-3">
                          <Input
                            placeholder="Enter your access code (e.g., 2K4KVUH1)"
                            value={accessCodeInput}
                            onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                            className="bg-slate-900 border-cyan-500/30 text-white font-mono text-lg h-12 flex-1"
                            maxLength={10}
                            onKeyDown={(e) => e.key === 'Enter' && handleAccessCodeSubmit()}
                          />
                          <Button 
                            onClick={handleAccessCodeSubmit}
                            disabled={loadingCameras || !accessCodeInput.trim()}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 h-12 px-6"
                          >
                            {loadingCameras ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <Eye className="h-5 w-5 mr-2" />
                                View Cameras
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-slate-800 text-slate-500">or request new service</span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="text-center space-y-4">
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-10 py-6 text-lg shadow-lg shadow-amber-500/20"
                          onClick={() => setShowRequestForm(true)}
                        >
                          <Camera className="h-5 w-5 mr-2" />
                          Request Monitoring Service
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Support */}
                <div className="mt-8 text-center">
                  <p className="text-slate-500 mb-2">Need help or have questions?</p>
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => window.location.href = '/contact'}
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      
      {/* Futuristic Hero Section with Drone & Camera Theme */}
      <AnimatedSection animation="fadeInUp">
        <section 
          className="text-white py-28 md:py-36 relative overflow-hidden"
          role="banner"
          aria-labelledby="monitoring-hero-heading"
        >
          {/* Multi-layer Drone & Camera Background */}
          <div className="absolute inset-0">
            {/* Primary Background - Drone flying over construction site */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=1080&fit=crop&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            
            {/* Secondary overlay - Security camera array */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1920&h=1080&fit=crop&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mixBlendMode: 'overlay',
              }}
            />
          </div>
          
          {/* Futuristic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/85 to-cyan-950/90"></div>
          
          {/* Animated Grid Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
          
          {/* Scanning Line Animation Effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
              style={{
                animation: 'scan 4s ease-in-out infinite',
                top: '0%',
              }}
            />
          </div>
          
          {/* Corner Brackets - Futuristic UI Element */}
          <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-cyan-400/50"></div>
          <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-cyan-400/50"></div>
          <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-cyan-400/50"></div>
          <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-cyan-400/50"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-6xl mx-auto">
              {/* Futuristic Badge */}
              <div className="mb-10 flex justify-center">
                <Badge className="bg-cyan-500/20 backdrop-blur-md text-cyan-300 px-6 py-3 text-lg font-mono border border-cyan-400/30 shadow-lg shadow-cyan-500/20 uppercase tracking-wider">
                  <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full mr-3 animate-pulse"></span>
                  Advanced Surveillance System • Active
                </Badge>
              </div>
              
              {/* Main Title with Glowing Effect */}
              <h1 
                id="monitoring-hero-heading" 
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight"
                style={{
                  textShadow: '0 0 40px rgba(34, 211, 238, 0.5), 0 0 80px rgba(34, 211, 238, 0.3)',
                }}
              >
                <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                  MONITORING
                </span>
                <br />
                <span className="text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  COMMAND CENTER
                </span>
              </h1>
              
              <p className="text-lg md:text-xl lg:text-2xl mb-12 text-slate-300 font-light max-w-4xl mx-auto leading-relaxed">
                <strong className="text-cyan-300">24/7 AI-Powered Surveillance</strong> — Real-time drone aerial views, 
                HD camera feeds, motion detection, instant security alerts, and complete construction site oversight 
                from anywhere in Kenya.
              </p>
              
              {/* Futuristic Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
                <div className="group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Camera className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-mono">4K</div>
                  <div className="text-cyan-300 text-sm font-medium uppercase tracking-wide">HD Cameras</div>
                </div>
                <div className="group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Plane className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-mono">LIVE</div>
                  <div className="text-purple-300 text-sm font-medium uppercase tracking-wide">Drone Views</div>
                </div>
                <div className="group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 hover:border-green-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Shield className="h-8 w-8 text-green-400 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-mono">24/7</div>
                  <div className="text-green-300 text-sm font-medium uppercase tracking-wide">Security</div>
                </div>
                <div className="group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 hover:border-amber-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Zap className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-mono">AI</div>
                  <div className="text-amber-300 text-sm font-medium uppercase tracking-wide">Detection</div>
                </div>
              </div>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { icon: Eye, label: 'Live Monitoring', color: 'cyan' },
                  { icon: Video, label: 'HD Recording', color: 'blue' },
                  { icon: Plane, label: 'Aerial Surveillance', color: 'purple' },
                  { icon: Shield, label: 'Access Control', color: 'green' },
                  { icon: Activity, label: 'Motion Detection', color: 'amber' },
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-${feature.color}-500/30 hover:border-${feature.color}-400/60 transition-all`}
                  >
                    <feature.icon className={`h-4 w-4 text-${feature.color}-400`} />
                    <span className="text-sm font-medium text-slate-200">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* CSS for scanning animation */}
          <style>{`
            @keyframes scan {
              0%, 100% { top: 0%; opacity: 0; }
              10% { opacity: 0.6; }
              50% { top: 100%; opacity: 0.6; }
              60% { opacity: 0; }
            }
          `}</style>
        </section>
      </AnimatedSection>

      <main className="py-16 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px',
            }}
          />
          
          {/* Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Access Notice for Suppliers Only */}
          {userRole === 'supplier' && (
            <div className="mb-8">
              <Alert variant="destructive" className="max-w-4xl mx-auto">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Access Restricted:</strong> Suppliers do not have access to the monitoring system. 
                    This includes camera feeds, delivery tracking, and system monitoring. These features are restricted to builders and UjenziPro administrators.
                  </AlertDescription>
                </Alert>
            </div>
          )}

          {userRole !== 'supplier' && (
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/5 p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid mx-auto mb-6 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 h-12 ${
                  isAdmin ? 'grid-cols-6 w-full max-w-4xl' : isDeliveryProvider ? 'grid-cols-2 w-fit px-2' : 'grid-cols-1 w-fit px-4'
                }`}>
              {isAdmin && (
                <TabsTrigger value="overview" className="flex items-center gap-2 text-sm py-2">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="cameras" className="flex items-center gap-2 text-sm py-2">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Live</span> Cameras
              </TabsTrigger>
              {/* Delivery Routes - for delivery providers and admins */}
              {(isDeliveryProvider || isAdmin) && (
                <TabsTrigger value="routes" className="flex items-center gap-2 text-sm py-2">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Delivery</span> Routes
                </TabsTrigger>
              )}
              {/* Camera Access Requests - for builders */}
              {(isBuilder || isAdmin) && (
                <TabsTrigger value="access-requests" className="flex items-center gap-2 text-sm py-2">
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Camera</span> Access
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="projects" className="flex items-center gap-2 text-sm py-2">
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Projects</span>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="system" className="flex items-center gap-2 text-sm py-2">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="overview" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Monitoring Overview</h2>
                
                {/* System Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</div>
                      <p className="text-xs text-muted-foreground">
                        {projects.length} total projects
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Live Cameras</CardTitle>
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cameras.filter(c => c.status === 'online' || c.status === 'recording').length}</div>
                      <p className="text-xs text-muted-foreground">
                        {cameras.length} total cameras
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                      <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">99.2%</div>
                      <p className="text-xs text-muted-foreground">
                        Last 30 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.alerts, 0)}</div>
                      <p className="text-xs text-muted-foreground">
                        Across all projects
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest monitoring events and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Video className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Camera CAM-001 started recording</p>
                          <p className="text-sm text-muted-foreground">Westlands Commercial Complex - Main Entrance</p>
                          <p className="text-xs text-muted-foreground">2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Low battery alert</p>
                          <p className="text-sm text-muted-foreground">Camera CAM-003 battery at 15%</p>
                          <p className="text-xs text-muted-foreground">15 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">System health check completed</p>
                          <p className="text-sm text-muted-foreground">All systems operational</p>
                          <p className="text-xs text-muted-foreground">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* Live Cameras Tab */}
            <TabsContent value="cameras" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                {/* Builder Access Notice */}
                {isBuilder && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Eye className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Builder Camera Access:</strong> You can view live camera feeds from your construction projects. 
                      Overview and Projects tabs are restricted to UjenziPro administrators.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Live Camera Feeds</h2>
                    <p className="text-muted-foreground">
                      {isAdmin ? "Monitor all construction site cameras" : "View cameras from your construction projects"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    {cameras.filter(c => c.status === 'online' || c.status === 'recording').length} Online
                  </Badge>
                </div>

                {/* Reorganized Layout - Camera List on Top for Mobile, Side for Desktop */}
                {/* Fullscreen Overlay - Rendered via Portal to body */}
                {isFullscreen && createPortal(
                  <div 
                    className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden"
                    style={{ zIndex: 99999, top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                  >
                    {/* Fullscreen Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        {selectedCamera && (
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        )}
                        <div>
                          <h2 className="text-lg font-semibold text-white">
                            {selectedCamera ? cameras.find(c => c.id === selectedCamera)?.name : 'Select a Camera'}
                          </h2>
                          <p className="text-xs text-slate-400">
                            {selectedCamera ? cameras.find(c => c.id === selectedCamera)?.projectSite : 'Choose from the camera list'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedCamera && (
                          <>
                            <Badge className="bg-slate-700/50 text-cyan-400 border border-cyan-500/30">
                              {cameras.find(c => c.id === selectedCamera)?.quality}
                            </Badge>
                            <Badge className={`${
                              cameras.find(c => c.id === selectedCamera)?.status === 'online' || cameras.find(c => c.id === selectedCamera)?.status === 'recording'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                              {cameras.find(c => c.id === selectedCamera)?.status?.toUpperCase()}
                            </Badge>
                          </>
                        )}
                        <Button
                          className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40"
                          onClick={() => {
                            setIsFullscreen(false);
                            setCameraViewSize('normal');
                          }}
                        >
                          <Minimize2 className="h-4 w-4 mr-2" />
                          Exit Fullscreen
                        </Button>
                      </div>
                    </div>
                    
                    {/* Fullscreen Video Area */}
                    <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                      {/* Grid Overlay */}
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                          backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px)`,
                          backgroundSize: '40px 40px',
                        }}
                      />
                      
                      {/* Corner Brackets */}
                      <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-cyan-400/60"></div>
                      <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-20 left-4 w-12 h-12 border-l-2 border-b-2 border-cyan-400/60"></div>
                      <div className="absolute bottom-20 right-4 w-12 h-12 border-r-2 border-b-2 border-cyan-400/60"></div>
                      
                      {/* Center Content */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {selectedCamera ? (
                          <div className="text-center">
                            {selectedCamera.startsWith('drone-') ? (
                              <>
                                <div className="relative mb-8">
                                  <Plane className="h-32 w-32 mx-auto text-purple-400" />
                                  <div className="absolute inset-0 h-32 w-32 mx-auto rounded-full bg-purple-500/30 blur-3xl animate-pulse"></div>
                                </div>
                                <p className="text-4xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent mb-3">
                                  Drone Aerial Feed
                                </p>
                                <p className="text-xl font-mono text-purple-300/70">
                                  {cameras.find(c => c.id === selectedCamera)?.quality} • Live Streaming
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="relative mb-8">
                                  <Camera className="h-32 w-32 mx-auto text-cyan-400" />
                                  <div className="absolute inset-0 h-32 w-32 mx-auto rounded-full bg-cyan-500/30 blur-3xl animate-pulse"></div>
                                </div>
                                <p className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-100 bg-clip-text text-transparent mb-3">
                                  Live Camera Feed
                                </p>
                                <p className="text-xl font-mono text-cyan-300/70">
                                  {cameras.find(c => c.id === selectedCamera)?.quality} • Streaming
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Monitor className="h-32 w-32 mx-auto text-slate-600 mb-8" />
                            <p className="text-3xl font-semibold text-slate-400 mb-3">No Camera Selected</p>
                            <p className="text-slate-500">Select a camera to view in fullscreen</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Fullscreen Bottom Controls */}
                      {selectedCamera && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-6">
                          <div className="flex items-center justify-between max-w-4xl mx-auto">
                            <div className="flex items-center gap-3">
                              <Button size="lg" className="h-12 w-12 p-0 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/40 text-cyan-300">
                                <Play className="h-6 w-6" />
                              </Button>
                              <Button size="lg" className="h-12 w-12 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                <Pause className="h-6 w-6" />
                              </Button>
                              <Button size="lg" className="h-12 w-12 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                <RefreshCw className="h-6 w-6" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2 text-slate-400">
                                <Wifi className={`h-5 w-5 ${(cameras.find(c => c.id === selectedCamera)?.signalStrength || 0) > 70 ? 'text-green-400' : 'text-amber-400'}`} />
                                <span>{cameras.find(c => c.id === selectedCamera)?.signalStrength}%</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                <Eye className="h-5 w-5" />
                                <span>{cameras.find(c => c.id === selectedCamera)?.viewers} viewers</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="h-5 w-5" />
                                <span>{cameras.find(c => c.id === selectedCamera)?.uptime}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button size="lg" className="h-12 w-12 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                  <Settings className="h-6 w-6" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
                
                {/* Regular Layout (non-fullscreen) - Video FIRST at TOP, Camera List SECOND at BOTTOM/RIGHT */}
                <div className={`flex flex-col gap-4 transition-all duration-300 ${isFullscreen ? 'hidden' : ''}`}>
                  
                  {/* SECTION 1: Main Video Feed - This is the "Select a Camera" area - ALWAYS FIRST/TOP */}
                  <div className={`w-full transition-all duration-300`}>
                    <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-xl overflow-hidden">
                      {/* Video Header with View Controls */}
                      <CardHeader className="p-3 border-b border-slate-700/50">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-400 text-xs font-medium">
                              📺 CAMERA VIEW
                            </div>
                            {selectedCamera && (
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            )}
                            <div>
                              <CardTitle className="text-base md:text-lg text-white">
                                {selectedCamera ? cameras.find(c => c.id === selectedCamera)?.name : 'Select a Camera'}
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-400">
                                {selectedCamera ? cameras.find(c => c.id === selectedCamera)?.projectSite : 'Choose from the list below'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedCamera && (
                              <>
                                <Badge className="bg-slate-700/50 text-cyan-400 border border-cyan-500/30 text-xs">
                                  {cameras.find(c => c.id === selectedCamera)?.quality}
                                </Badge>
                                <Badge className={`text-xs ${
                                  cameras.find(c => c.id === selectedCamera)?.status === 'online' || cameras.find(c => c.id === selectedCamera)?.status === 'recording'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  <span className="w-2 h-2 rounded-full bg-current mr-1 animate-pulse"></span>
                                  {cameras.find(c => c.id === selectedCamera)?.status?.toUpperCase()}
                                </Badge>
                              </>
                            )}
                            
                            {/* View Size Controls */}
                            <div className="flex items-center gap-1 ml-2 border-l border-slate-600 pl-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-8 w-8 p-0 ${cameraViewSize === 'normal' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => {
                                  setCameraViewSize('normal');
                                  setIsFullscreen(false);
                                }}
                                title="Normal View"
                              >
                                <Minimize2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-8 w-8 p-0 ${cameraViewSize === 'large' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => {
                                  setCameraViewSize('large');
                                  setIsFullscreen(false);
                                }}
                                title="Large View"
                              >
                                <Monitor className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-8 w-8 p-0 ${isFullscreen ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => {
                                  setIsFullscreen(!isFullscreen);
                                  setCameraViewSize('fullscreen');
                                }}
                                title="Fullscreen"
                              >
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                          </div>
                        </div>
                      </CardHeader>
                      
                      {/* Video Display Area - Resizable */}
                      <CardContent className="p-0">
                        <div 
                          className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 transition-all duration-300" 
                          style={{ 
                            height: isFullscreen 
                              ? 'calc(100vh - 120px)' 
                              : cameraViewSize === 'large' 
                                ? 'calc(100vh - 300px)' 
                                : 'calc(100vh - 450px)', 
                            minHeight: isFullscreen ? '500px' : cameraViewSize === 'large' ? '500px' : '350px', 
                            maxHeight: isFullscreen ? '100vh' : cameraViewSize === 'large' ? '900px' : '600px' 
                          }}
                        >
                          {/* Grid Overlay */}
                          <div 
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                              backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px)`,
                              backgroundSize: '40px 40px',
                            }}
                          />
                          
                          {/* Corner Brackets */}
                          <div className="absolute top-4 left-4 w-10 h-10 border-l-2 border-t-2 border-cyan-400/60"></div>
                          <div className="absolute top-4 right-4 w-10 h-10 border-r-2 border-t-2 border-cyan-400/60"></div>
                          <div className="absolute bottom-16 left-4 w-10 h-10 border-l-2 border-b-2 border-cyan-400/60"></div>
                          <div className="absolute bottom-16 right-4 w-10 h-10 border-r-2 border-b-2 border-cyan-400/60"></div>
                          
                          {/* Top Info Bar */}
                          {selectedCamera && (
                            <div className="absolute top-4 left-16 right-16 flex items-center justify-between">
                              <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/50">
                                <span className="text-sm font-mono text-cyan-400">{new Date().toLocaleTimeString()}</span>
                                <span className="text-slate-500 mx-2">|</span>
                                <span className="text-sm text-slate-400">{new Date().toLocaleDateString()}</span>
                              </div>
                              {cameras.find(c => c.id === selectedCamera)?.isRecording && (
                                <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-lg border border-red-500/30">
                                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                  <span className="text-sm font-bold text-red-400">● REC</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Center Content */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {selectedCamera ? (
                              <div className="text-center">
                                {selectedCamera.startsWith('drone-') ? (
                                  <>
                                    <div className="relative mb-6">
                                      <Plane className="h-24 w-24 mx-auto text-purple-400" />
                                      <div className="absolute inset-0 h-24 w-24 mx-auto rounded-full bg-purple-500/30 blur-2xl animate-pulse"></div>
                                    </div>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent mb-2">
                                      Drone Aerial Feed
                                    </p>
                                    <p className="text-lg font-mono text-purple-300/70">
                                      {cameras.find(c => c.id === selectedCamera)?.quality} • Live Streaming
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                      <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-2">
                                        <Plane className="h-4 w-4 mr-2" />
                                        Aerial View Active
                                      </Badge>
                                      <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600/50 px-4 py-2">
                                        <Eye className="h-4 w-4 mr-2" />
                                        {cameras.find(c => c.id === selectedCamera)?.viewers} Viewers
                                      </Badge>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="relative mb-6">
                                      <Camera className="h-24 w-24 mx-auto text-cyan-400" />
                                      <div className="absolute inset-0 h-24 w-24 mx-auto rounded-full bg-cyan-500/30 blur-2xl animate-pulse"></div>
                                    </div>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-100 bg-clip-text text-transparent mb-2">
                                      Live Camera Feed
                                    </p>
                                    <p className="text-lg font-mono text-cyan-300/70">
                                      {cameras.find(c => c.id === selectedCamera)?.quality} • Streaming
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                      <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-4 py-2">
                                        <Video className="h-4 w-4 mr-2" />
                                        HD Quality
                                      </Badge>
                                      <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600/50 px-4 py-2">
                                        <Eye className="h-4 w-4 mr-2" />
                                        {cameras.find(c => c.id === selectedCamera)?.viewers} Viewers
                                      </Badge>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="text-center">
                                <Monitor className="h-24 w-24 mx-auto text-slate-600 mb-6" />
                                <p className="text-2xl font-semibold text-slate-400 mb-2">No Camera Selected</p>
                                <p className="text-slate-500">Select a camera from the list to view live feed</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom Controls */}
                          {selectedCamera && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" className="h-10 w-10 p-0 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/40 text-cyan-300">
                                    <Play className="h-5 w-5" />
                                  </Button>
                                  <Button size="sm" className="h-10 w-10 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                    <Pause className="h-5 w-5" />
                                  </Button>
                                  <Button size="sm" className="h-10 w-10 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                    <RefreshCw className="h-5 w-5" />
                                  </Button>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="hidden sm:flex items-center gap-2 text-slate-400">
                                    <Wifi className={`h-4 w-4 ${(cameras.find(c => c.id === selectedCamera)?.signalStrength || 0) > 70 ? 'text-green-400' : 'text-amber-400'}`} />
                                    <span>{cameras.find(c => c.id === selectedCamera)?.signalStrength}%</span>
                                  </div>
                                  <div className="hidden sm:flex items-center gap-2 text-slate-400">
                                    <Clock className="h-4 w-4" />
                                    <span>{cameras.find(c => c.id === selectedCamera)?.uptime}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {isAdmin && (
                                    <Button size="sm" className="h-10 w-10 p-0 bg-slate-800/80 border border-slate-600/50 hover:bg-slate-700/80 text-slate-300">
                                      <Settings className="h-5 w-5" />
                                    </Button>
                                  )}
                                  {selectedCamera.startsWith('drone-') && isAdmin && (
                                    <Button size="sm" className="h-10 px-4 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/40 text-purple-300">
                                      <Plane className="h-4 w-4 mr-2" />
                                      Drone Controls
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedCamera && (
                          <CameraRemoteCapabilitiesPanel
                            supportsPtz={
                              !!activeCameraList.find((c) => c.id === selectedCamera)?.supports_ptz
                            }
                            supportsTwoWayAudio={
                              !!activeCameraList.find((c) => c.id === selectedCamera)
                                ?.supports_two_way_audio
                            }
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* SECTION 2: Camera List - ALWAYS SECOND/BOTTOM - User selects camera here */}
                  <div className={`w-full transition-all duration-300 ${
                    isFullscreen ? 'hidden' : ''
                  }`}>
                    <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-xl relative">
                      <CardHeader className="p-3 border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-1 bg-purple-500/20 rounded text-purple-400 text-xs font-medium">
                              📋 CAMERA LIST
                            </div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse flex-shrink-0"></div>
                            <CardTitle className="text-base text-white truncate">
                              {monitoringRequest ? `Available Cameras` : 'Camera Feeds'}
                            </CardTitle>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs flex-shrink-0">
                            {(assignedCameras.length > 0 ? assignedCameras : cameras).filter(c => c.status === 'online' || c.status === 'recording').length} Online
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-slate-400 mt-1">
                          {monitoringRequest ? `Code: ${monitoringRequest.access_code}` : 'Click a camera to view live feed'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3">
                        {/* Access Code Entry for clients without URL param */}
                        {!accessCodeFromUrl && !isAdmin && assignedCameras.length === 0 && (
                          <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="h-4 w-4 text-cyan-400" />
                              <span className="text-xs text-white font-medium">Enter Access Code</span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Access code..."
                                value={accessCodeInput}
                                onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                                className="bg-slate-900 border-slate-600 text-white font-mono text-sm h-9"
                                maxLength={8}
                              />
                              <Button 
                                onClick={handleAccessCodeSubmit}
                                disabled={loadingCameras || !accessCodeInput.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 h-9 w-9 p-0"
                              >
                                {loadingCameras ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Enter the access code provided by UjenziXform
                            </p>
                          </div>
                        )}
                        
                        {/* Camera Grid - Horizontal scrollable on mobile, grid on larger screens */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {(assignedCameras.length > 0 ? assignedCameras : cameras).map((camera) => {
                            const isDrone = camera.id.startsWith('drone-');
                            const isOnline = camera.status === 'online' || camera.status === 'recording';
                            const isSelected = selectedCamera === camera.id;
                            
                            return (
                              <div
                                key={camera.id}
                                className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-cyan-500/20 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20' 
                                    : 'bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
                                }`}
                                onClick={() => setSelectedCamera(camera.id)}
                              >
                                {/* Camera Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${isDrone ? 'bg-purple-500/20' : 'bg-cyan-500/20'}`}>
                                      {isDrone ? (
                                        <Plane className="h-4 w-4 text-purple-400" />
                                      ) : (
                                        <Camera className="h-4 w-4 text-cyan-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-xs text-white truncate">{camera.name}</p>
                                      <p className="text-xs text-slate-500 truncate">{camera.projectSite}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status & Quality Row */}
                                <div className="flex items-center justify-between mb-2">
                                  <Badge className={`text-xs py-0 px-1.5 ${
                                    isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                    camera.status === 'offline' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isOnline ? 'bg-green-400 animate-pulse' : camera.status === 'offline' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
                                    {camera.status.toUpperCase()}
                                  </Badge>
                                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isDrone ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                    {camera.quality}
                                  </span>
                                </div>
                                
                                {/* Stats Row */}
                                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      {camera.viewers}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Wifi className={`h-3 w-3 ${camera.signalStrength > 70 ? 'text-green-400' : camera.signalStrength > 40 ? 'text-amber-400' : 'text-red-400'}`} />
                                      {camera.signalStrength}%
                                    </span>
                                  </div>
                                  {camera.isRecording && (
                                    <span className="flex items-center gap-1 text-red-400 font-medium">
                                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
                                      REC
                                    </span>
                                  )}
                                </div>
                                
                                {/* Battery (for drones) */}
                                {camera.batteryLevel !== undefined && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                                    <Battery className={`h-3 w-3 ${camera.batteryLevel > 50 ? 'text-green-400' : camera.batteryLevel > 20 ? 'text-amber-400' : 'text-red-400'}`} />
                                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${camera.batteryLevel > 50 ? 'bg-green-400' : camera.batteryLevel > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: `${camera.batteryLevel}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">{camera.batteryLevel}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Custom Scrollbar Styles */}
                <style>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(51, 65, 85, 0.3);
                    border-radius: 3px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(34, 211, 238, 0.3);
                    border-radius: 3px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(34, 211, 238, 0.5);
                  }
                `}</style>
              </div>
            </TabsContent>

            {/* Projects Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="projects" className="space-y-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Project Monitoring</h2>
                    <p className="text-muted-foreground">Monitor construction projects and their camera systems</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50">
                    {projects.filter(p => p.status === 'active').length} Active Projects
                  </Badge>
                </div>

                <div className="grid gap-6">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.projectName}</CardTitle>
                            <CardDescription>{project.location}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusIcon(project.status)}
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <span className="text-muted-foreground text-sm">Cameras:</span>
                            <p className="font-medium">{project.activeCameras}/{project.cameras} active</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Progress:</span>
                            <p className="font-medium">{project.progress}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Alerts:</span>
                            <p className="font-medium">{project.alerts}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Last Update:</span>
                            <p className="font-medium">{project.lastUpdate.toLocaleTimeString()}</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Project Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Cameras
                          </Button>
                          {isAdmin && (
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Project
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            )}

            {/* System Health Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="system" className="space-y-6">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">System Health</h2>
                      <p className="text-muted-foreground">Monitor system performance and health metrics</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      All Systems Operational
                    </Badge>
                  </div>

                  {/* System Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Server Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>CPU Usage</span>
                            <span>45%</span>
                          </div>
                          <Progress value={45} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Memory Usage</span>
                            <span>62%</span>
                          </div>
                          <Progress value={62} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Storage Used</span>
                            <span>78%</span>
                          </div>
                          <Progress value={78} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Network Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Database Connection</span>
                          <Badge className="bg-green-100 text-green-800">Online</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">API Services</span>
                          <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Camera Streams</span>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh All Cameras
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Settings className="h-4 w-4 mr-2" />
                            System Settings
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Zap className="h-4 w-4 mr-2" />
                            Run Diagnostics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Delivery Routes Tab - for delivery providers and admins */}
            {(isDeliveryProvider || isAdmin) && (
              <TabsContent value="routes" className="space-y-6">
                <div className="max-w-6xl mx-auto">
                  <DeliveryRouteTracker />
                </div>
              </TabsContent>
            )}

            {/* Camera Access Requests Tab - for builders and admins */}
            {(isBuilder || isAdmin) && (
              <TabsContent value="access-requests" className="space-y-6">
                <div className="max-w-6xl mx-auto">
                  <CameraAccessRequest />
                </div>
              </TabsContent>
            )}
              </Tabs>
            </div>
          )}

          {/* Futuristic Scanner Integration Notice */}
          <div className="max-w-5xl mx-auto mt-16">
            <Card className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-950/50 via-slate-900/50 to-purple-950/50 border-b border-cyan-500/20">
                <CardTitle className="flex items-center gap-4 text-2xl md:text-3xl font-bold text-white">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl shadow-lg shadow-cyan-500/30">
                    <Eye className="h-7 w-7 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    Integrated Monitoring System
                  </span>
                </CardTitle>
                <CardDescription className="text-lg text-slate-400">
                  Complete construction site monitoring with advanced security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-800/50 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Video className="h-5 w-5 text-cyan-400" />
                      </div>
                      <h4 className="font-semibold text-white text-lg">Camera Monitoring</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      Live surveillance of construction sites with AI-powered monitoring and real-time alerts.
                    </p>
                    <Button variant="outline" size="sm" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200">
                      <Video className="h-4 w-4 mr-2" />
                      View Live Feeds
                    </Button>
                  </div>
                  
                  <div className="p-6 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Camera className="h-5 w-5 text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-white text-lg">Material Scanning</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      QR code scanning system for material verification and tracking across the supply chain.
                    </p>
                    <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200" asChild>
                      <a href="/scanners">
                        <Camera className="h-4 w-4 mr-2" />
                        Access Scanners
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Monitoring;