import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { User, Menu, Package, MapPin, Clock, Truck, Camera, QrCode, Monitor, Plane, MessageCircle, Settings, Video, ScanLine, Phone, Eye, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import DeliveryTracker from './DeliveryTracker';
import CameraControls from './CameraControls';
import QRScanner from './QRScanner';
import LiveStreamMonitor from './LiveStreamMonitor';
import CameraSetup from './CameraSetup';
import PhysicalCameraViewer from './PhysicalCameraViewer';
import DroneMonitor from './DroneMonitor';
import DeliveryCommunication from './DeliveryCommunication';
import DeliveryStats from './delivery/DeliveryStats';
import CreateDeliveryDialog from './delivery/CreateDeliveryDialog';
import { LiveAnalyticsDashboard } from './LiveAnalyticsDashboard';
import DeliveryTable from './delivery/DeliveryTable';

type DeliveryStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
type UserRole = 'supplier' | 'builder' | 'admin';

interface Delivery {
  id: string;
  tracking_number: string;
  material_type: string;
  quantity: number;
  weight_kg: number;
  pickup_address: string;
  delivery_address: string;
  estimated_delivery_time: string;
  actual_delivery_time?: string;
  status: DeliveryStatus;
  has_driver_assigned?: boolean;
  driver_access_protected?: boolean;
  vehicle_details?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  builder_id?: string;
}

interface Builder {
  id: string;
  email: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-500' },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-500' },
  delivered: { label: 'Delivered', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' }
};

interface DeliveryManagementProps {
  userRole?: string | null;
  user?: any;
}

const DeliveryManagement: React.FC<DeliveryManagementProps> = ({ userRole: propUserRole, user: propUser }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(propUserRole as UserRole);
  const [user, setUser] = useState<any>(propUser);
  const [builderUniqueNumber, setBuilderUniqueNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tracker');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showHiddenAnalytics, setShowHiddenAnalytics] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (propUserRole && propUser) {
      setUserRole(propUserRole as UserRole);
      setUser(propUser);
      generateBuilderUniqueNumber();
    } else {
      checkAuth();
    }
   }, [propUserRole, propUser]);

  // Hidden analytics access for UjenziPro staff
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Secret key combination: Ctrl + Shift + A (for Analytics)
      if (event.ctrlKey && event.shiftKey && event.key === 'A' && userRole === 'admin') {
        setShowHiddenAnalytics(!showHiddenAnalytics);
        if (!showHiddenAnalytics) {
          setActiveTab('hidden-analytics');
          toast({
            title: "UjenziPro Analytics Enabled",
            description: "Live site analytics dashboard activated",
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showHiddenAnalytics, userRole]);

  useEffect(() => {
    if (user && userRole) {
      fetchDeliveries();
      if (userRole === 'supplier') {
        fetchBuilders();
        fetchProjects();
      }
      
      // Set up real-time subscription
      const channel = supabase
        .channel('deliveries-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deliveries'
          },
          (payload) => {
            console.log('Real-time delivery change:', payload);
            fetchDeliveries();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user profile and role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, user_id')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          toast({
            title: "Error",
            description: "Could not determine user role. Please contact support.",
            variant: "destructive",
          });
        } else {
          // Get role from user_roles table
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profileData.user_id)
            .limit(1)
            .maybeSingle();
          
          setUserRole((roleData?.role as UserRole) || 'builder');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBuilderUniqueNumber = async () => {
    if (!user) return;
    
    try {
      // Check if builder already has a unique number
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('business_license')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      let uniqueNumber = profileData?.business_license;
      
      // If no unique number exists, generate one
      if (!uniqueNumber && userRole === 'builder') {
        uniqueNumber = `BLD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        
        // Update profile with unique number
        await supabase
          .from('profiles')
          .update({ business_license: uniqueNumber })
          .eq('user_id', user.id);
      }
      
      setBuilderUniqueNumber(uniqueNumber);
    } catch (error) {
      console.error('Error generating builder unique number:', error);
    }
  };

  const fetchBuilders = async () => {
    try {
      // Get builders from profiles who have builder role
      const { data: builderRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'builder');
      
      if (!builderRoles) {
        setBuilders([]);
        return;
      }
      
      const builderUserIds = builderRoles.map(r => r.user_id);
      
      const { data: buildersData, error: buildersError } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, user_id')
        .in('user_id', builderUserIds);

      if (buildersError) {
        console.error('Error fetching builders:', buildersError);
        return;
      }

      if (buildersData && buildersData.length > 0) {
        const builders = buildersData.map(builder => ({
          id: builder.id,
          email: builder.full_name || builder.company_name || `Builder ${builder.id.slice(-8)}`
        }));
        setBuilders(builders);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      // RLS policies will automatically filter projects based on user role and access
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDeliveries = async () => {
    try {
      // RLS policies will automatically filter deliveries based on user role and access
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          projects (
            id,
            name,
            location
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deliveries:', error);
        toast({
          title: "Error",
          description: "Failed to fetch deliveries",
          variant: "destructive",
        });
      } else {
        setDeliveries(data as Delivery[] || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeliveryCreated = () => {
    fetchDeliveries();
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: DeliveryStatus) => {
    if (!user || userRole !== 'supplier') {
      toast({
        title: "Access Denied",
        description: "Only suppliers can update delivery status",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) {
        throw error;
      }

      // Add tracking update
      await supabase
        .from('delivery_updates')
        .insert([{
          delivery_id: deliveryId,
          status: newStatus,
          notes: `Status updated to ${statusConfig[newStatus].label}`
        }]);

      toast({
        title: "Success",
        description: `Delivery status updated to ${statusConfig[newStatus].label}`,
      });

      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
  };

  const handleCameraConnected = (camera: any) => {
    toast({ 
      title: "Camera Connected", 
      description: `${camera.name} is now available for streaming` 
    });
  };

  // Calculate delivery statistics
  const deliveryStats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    inTransit: deliveries.filter(d => ['picked_up', 'in_transit', 'out_for_delivery'].includes(d.status)).length,
    completed: deliveries.filter(d => d.status === 'delivered').length
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Delivery Tracking</h1>
        <p className="text-muted-foreground">
          Track building materials deliveries in real-time
        </p>
        {user && userRole && (
          <div className="mt-2">
            <Badge variant="outline" className="capitalize">
              <User className="h-3 w-3 mr-1" />
              {userRole}
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-center h-10 w-10 p-0 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" sideOffset={8} className="w-64 bg-popover border shadow-lg max-h-[60vh] overflow-y-auto z-50">
              {/* Delivery Tracking Section */}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Delivery Tracking</div>
              <DropdownMenuItem onClick={() => setActiveTab('tracker')}>
                <Package className="h-4 w-4 mr-2" />
                Track Package
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('tracker')}>
                <MapPin className="h-4 w-4 mr-2" />
                Live Location
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('tracker')}>
                <Clock className="h-4 w-4 mr-2" />
                Delivery Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('tracker')}>
                <Truck className="h-4 w-4 mr-2" />
                Driver Info
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* AI Camera Section - Live Stream only */}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">AI Camera</div>
              <DropdownMenuItem onClick={() => setActiveTab('physical-camera')}>
                <Video className="h-4 w-4 mr-2" />
                Live Stream
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('physical-camera')}>
                <Monitor className="h-4 w-4 mr-2" />
                Physical Camera
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Communication Section */}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Communication</div>
              <DropdownMenuItem onClick={() => setActiveTab('communication')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Team Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('communication')}>
                <Phone className="h-4 w-4 mr-2" />
                Voice Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TabsTrigger value="tracker">Track Delivery</TabsTrigger>
          {user && (userRole === 'admin' || userRole === 'supplier') && (
            <>
              <TabsTrigger value="camera-setup">Camera Setup</TabsTrigger>
              <TabsTrigger value="physical-camera">Physical Camera</TabsTrigger>
            </>
          )}
          {user && userRole && (
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Manage Deliveries
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tracker">
          <DeliveryTracker />
        </TabsContent>

        <TabsContent value="camera-setup">
          <CameraSetup onCameraConnected={handleCameraConnected} />
        </TabsContent>

        <TabsContent value="physical-camera">
          <PhysicalCameraViewer 
            onQRCodeScanned={(data) => {
              toast({ description: `QR Code Detected: ${data}` });
            }}
            onMaterialDetected={(material) => {
              toast({ description: `Material Detected: ${material.type}` });
            }}
          />
        </TabsContent>

        <TabsContent value="qr-scanner">
          {(userRole === 'admin' || (userRole === 'builder' && builderUniqueNumber)) ? (
            <div className="space-y-4">
              {builderUniqueNumber && userRole === 'builder' && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium">Builder Access ID: <span className="font-mono">{builderUniqueNumber}</span></p>
                </div>
              )}
              <QRScanner 
                onMaterialScanned={(material) => {
                  toast({ description: `Material Scanned: ${material.materialType}` });
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Access restricted. Builder unique number required.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="communication">
          <DeliveryCommunication userRole={userRole} user={user} />
        </TabsContent>

        {user && userRole ? (
          <TabsContent value="deliveries" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">
                  {userRole === 'supplier' ? 'Your Deliveries' : 'Assigned Deliveries'}
                </h2>
                <p className="text-muted-foreground">
                  {userRole === 'supplier' 
                    ? 'Create and manage material deliveries'
                    : 'Track deliveries assigned to you'
                  }
                </p>
              </div>
              {userRole === 'supplier' && (
                <CreateDeliveryDialog 
                  builders={builders}
                  projects={projects}
                  user={user}
                  onDeliveryCreated={handleDeliveryCreated}
                />
              )}
            </div>

            {/* Delivery Statistics */}
            <DeliveryStats 
              totalDeliveries={deliveryStats.total}
              pendingDeliveries={deliveryStats.pending}
              inTransitDeliveries={deliveryStats.inTransit}
              completedDeliveries={deliveryStats.completed}
            />

            {/* Delivery Table */}
            <Card>
              <CardContent className="p-0">
                <DeliveryTable 
                  deliveries={deliveries}
                  userRole={userRole}
                  onStatusUpdate={updateDeliveryStatus}
                  onViewDetails={handleViewDetails}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="deliveries" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be logged in as a supplier or builder to manage deliveries.{' '}
                <Link to="/auth" className="underline">
                  Sign in here
                </Link>
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  Admin access is restricted to authorized personnel only.
                </span>
              </AlertDescription>
            </Alert>
          </TabsContent>
        )}

        {/* Hidden Analytics Dashboard - Only accessible to UjenziPro staff */}
        {showHiddenAnalytics && userRole === 'admin' && (
          <TabsContent value="hidden-analytics" className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-primary">UjenziPro Analytics Dashboard</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Live building materials monitoring and analytics from cameras, drones, and scanners.
                This dashboard is exclusively for UjenziPro staff.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Access: Admin Only • Data Source: Live Site Monitoring • Update Frequency: Real-time
              </div>
            </div>
            <LiveAnalyticsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default DeliveryManagement;