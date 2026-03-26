/**
 * CRITICAL: DROPDOWN MENU SCROLLING CONFIGURATION
 * 
 * The dropdown menus in this component MUST maintain the following properties to ensure all items are visible:
 * - z-[999]: High z-index to appear above all content
 * - max-h-[400px]: Fixed maximum height of 400px
 * - overflow-y-auto: Vertical scrolling when content exceeds height
 * - overflow-x-hidden: Prevent horizontal scrolling issues
 * - position: 'fixed' in style prop: Force proper positioning
 * - avoidCollisions={true}: Prevent viewport clipping
 * - collisionPadding={20}: Safe boundaries for repositioning
 * - sideOffset={5}: Proper spacing from trigger
 * 
 * DO NOT REMOVE OR MODIFY THESE PROPERTIES - THEY PREVENT RECURRING SCROLLING ISSUES
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSecureDeliveryData } from '@/hooks/useSecureDeliveryData';
import DeliveryReviewForm from './DeliveryReviewForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Truck, CheckCircle, Package, Phone, Building, Filter, Search, Download, RefreshCw, MoreVertical, Calendar, MapIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProjectManager from './ProjectManager';

type DeliveryStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface Delivery {
  id: string;
  tracking_number: string;
  material_type: string;
  quantity: number;
  weight_kg: number;
  pickup_address: string;
  delivery_address: string;
  estimated_delivery: string;
  actual_delivery?: string;
  status: DeliveryStatus;
  has_driver_assigned?: boolean;
  vehicle_number?: string;
  special_instructions?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryUpdate {
  id: string;
  status: string;
  location?: string;
  notes?: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Pending Pickup', color: 'bg-gray-500', icon: Package },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: Package }
};

const DeliveryTracker: React.FC = () => {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [updates, setUpdates] = useState<DeliveryUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDeliveries, setProjectDeliveries] = useState<Delivery[]>([]);
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (delivery) {
      // Set up real-time subscription for delivery updates
      const channel = supabase
        .channel('delivery-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'delivery_updates',
            filter: `delivery_id=eq.${delivery.id}`
          },
          (payload) => {
            console.log('Real-time update:', payload);
            fetchUpdates(delivery.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'deliveries',
            filter: `id=eq.${delivery.id}`
          },
          (payload) => {
            console.log('Delivery status update:', payload);
            if (payload.new && payload.new.status && Object.keys(statusConfig).includes(payload.new.status)) {
              setDelivery(payload.new as Delivery);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [delivery]);

  const fetchUpdates = async (deliveryId: string) => {
    const { data, error } = await supabase
      .from('delivery_updates')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching updates:', error);
    } else {
      setUpdates(data || []);
    }
  };

  const trackDelivery = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
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
        .eq('tracking_number', trackingNumber.trim())
        .single();

      if (error) {
        toast({
          title: "Tracking Number Not Found",
          description: "Please check your tracking number and try again",
          variant: "destructive",
        });
        setDelivery(null);
        setUpdates([]);
      } else {
        setDelivery({
          ...data,
          estimated_delivery: data.estimated_delivery_time
        } as Delivery);
        await fetchUpdates(data.id);
        toast({
          title: "Delivery Found",
          description: `Tracking ${data.material_type} delivery`,
        });
      }
    } catch (error) {
      console.error('Error tracking delivery:', error);
      toast({
        title: "Error",
        description: "Failed to track delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDeliveries = async (projectId: string) => {
    try {
      // RLS policies will ensure users only see deliveries they have access to
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project deliveries:', error);
        toast({
          title: "Error",
          description: "Failed to fetch project deliveries",
          variant: "destructive",
        });
      } else {
        setProjectDeliveries(data?.map(d => ({
          ...d,
          estimated_delivery: d.estimated_delivery_time
        })) as Delivery[]);
        if (data.length === 0) {
          toast({
            title: "No Deliveries",
            description: "No deliveries found for this project that you have access to.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    if (project) {
      fetchProjectDeliveries(project.id);
    } else {
      setProjectDeliveries([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Refresh deliveries
  const refreshDeliveries = async () => {
    setRefreshing(true);
    if (selectedProject) {
      await fetchProjectDeliveries(selectedProject.id);
    }
    toast({
      title: "Refreshed",
      description: "Delivery data has been updated",
    });
    setRefreshing(false);
  };

  // Export deliveries (mock function)
  const exportDeliveries = () => {
    toast({
      title: "Export Started", 
      description: "Delivery data export will be ready shortly",
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    setMaterialFilter('all');
    setLocationFilter('');
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset",
    });
  };

  // Filter project deliveries based on current filters
  const getFilteredProjectDeliveries = () => {
    return projectDeliveries.filter(delivery => {
      // Status filter
      if (statusFilter !== 'all' && delivery.status !== statusFilter) return false;
      
      // Material filter
      if (materialFilter !== 'all' && !delivery.material_type.toLowerCase().includes(materialFilter.toLowerCase())) return false;
      
      // Location filter
      if (locationFilter && !delivery.delivery_address.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      
      // Date filter
      if (dateFilter !== 'all') {
        const deliveryDate = new Date(delivery.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'today':
            if (daysDiff !== 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }
      
      return true;
    });
  };

  const StatusIcon = delivery ? statusConfig[delivery.status].icon : Package;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Delivery Tracker
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowProjectManager(!showProjectManager)}
            >
              <Building className="h-4 w-4 mr-2" />
              {showProjectManager ? 'Hide' : 'Show'} Projects
            </Button>
          </CardTitle>
          <CardDescription>
            Track building materials deliveries across multiple construction projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter tracking number (e.g., TRK20250817-1234)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && trackDelivery()}
              className="flex-1"
            />
            <Button onClick={trackDelivery} disabled={loading}>
              {loading ? 'Tracking...' : 'Track'}
            </Button>
          </div>

          {selectedProject && (
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedProject.name}</h3>
                  {selectedProject.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedProject.location}
                    </p>
                  )}
                </div>
                <Badge variant="outline">
                  {projectDeliveries.length} deliveries
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Dropdown Menu Bar */}
      <Card className="bg-background/95 backdrop-blur-sm border-muted shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side - Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Dropdown - CRITICAL: Keep scrolling properties intact */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-background border-input hover:bg-muted/50">
                    <Filter className="h-4 w-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusConfig[statusFilter as DeliveryStatus]?.label || statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-background border-border shadow-lg z-[999] max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  sideOffset={5}
                  avoidCollisions={true}
                  collisionPadding={20}
                  style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    zIndex: 999,
                    position: 'fixed' // Force proper positioning
                  }}
                >
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('all')} className="hover:bg-muted cursor-pointer">
                    <CheckCircle className="h-4 w-4 mr-2 opacity-50" />
                    All Statuses
                  </DropdownMenuItem>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)} className="hover:bg-muted cursor-pointer">
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter Dropdown - CRITICAL: Keep scrolling properties intact */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-background border-input hover:bg-muted/50">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date: {dateFilter === 'all' ? 'All Time' : dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'This Month'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-48 bg-background border-border shadow-lg z-[999] max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  sideOffset={5}
                  avoidCollisions={true}
                  collisionPadding={20}
                  style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    zIndex: 999,
                    position: 'fixed' // Force proper positioning
                  }}
                >
                  <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDateFilter('all')} className="hover:bg-muted cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2 opacity-50" />
                    All Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('today')} className="hover:bg-muted cursor-pointer">
                    <Clock className="h-4 w-4 mr-2" />
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('week')} className="hover:bg-muted cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2" />
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('month')} className="hover:bg-muted cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2" />
                    This Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Material Type Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="material-filter" className="text-sm font-medium whitespace-nowrap">Material:</Label>
                <Input
                  id="material-filter"
                  placeholder="Search materials..."
                  value={materialFilter === 'all' ? '' : materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value || 'all')}
                  className="w-32 h-8 bg-background border-input"
                />
              </div>

              {/* Location Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="location-filter" className="text-sm font-medium whitespace-nowrap">Location:</Label>
                <Input
                  id="location-filter"
                  placeholder="Search locations..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-32 h-8 bg-background border-input"
                />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Clear Filters */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                Clear Filters
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshDeliveries}
                disabled={refreshing}
                className="bg-background border-input hover:bg-muted/50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-background border-input hover:bg-muted/50">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-48 bg-background border-border shadow-lg z-[999] max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" 
                  align="end"
                  sideOffset={5}
                  avoidCollisions={true}
                  collisionPadding={20}
                  style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    zIndex: 999,
                    position: 'fixed' // Force proper positioning
                  }}
                >
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportDeliveries} className="hover:bg-muted cursor-pointer">
                    <Download className="h-4 w-4 mr-2" />
                    Export Deliveries
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/admin-dashboard?tab=delivery-analytics')}
                    className="hover:bg-muted cursor-pointer"
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast({ title: "Help", description: "Opening help documentation" })} className="hover:bg-muted cursor-pointer">
                    <Search className="h-4 w-4 mr-2" />
                    Help & Support
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Active Filters Display */}
          {(statusFilter !== 'all' || dateFilter !== 'all' || materialFilter !== 'all' || locationFilter) && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    Status: {statusConfig[statusFilter as DeliveryStatus]?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => setStatusFilter('all')}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
                {dateFilter !== 'all' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    Date: {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'This Month'}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => setDateFilter('all')}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
                {materialFilter !== 'all' && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                    Material: {materialFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => setMaterialFilter('all')}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
                {locationFilter && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    Location: {locationFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => setLocationFilter('')}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showProjectManager && (
        <ProjectManager 
          onProjectSelect={handleProjectSelect}
          selectedProject={selectedProject}
        />
      )}

      {selectedProject && getFilteredProjectDeliveries().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Deliveries</CardTitle>
            <CardDescription>
              {getFilteredProjectDeliveries().length} of {projectDeliveries.length} deliveries for {selectedProject.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredProjectDeliveries().map((projectDelivery) => (
                <Card key={projectDelivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{projectDelivery.material_type}</h4>
                        <Badge className={`${statusConfig[projectDelivery.status].color} text-white`}>
                          {statusConfig[projectDelivery.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        #{projectDelivery.tracking_number}
                      </p>
                      <p className="text-sm">
                        {projectDelivery.quantity} units • {projectDelivery.weight_kg} kg
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setTrackingNumber(projectDelivery.tracking_number);
                          trackDelivery();
                        }}
                      >
                        Track This Delivery
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {delivery && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Delivery Details</span>
                <Badge className={`${statusConfig[delivery.status].color} text-white`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {statusConfig[delivery.status].label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {delivery.project_id && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    PROJECT
                  </h4>
                  <p className="text-lg">{(delivery as any).projects?.name || 'Unknown Project'}</p>
                  {(delivery as any).projects?.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {(delivery as any).projects.location}
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground">MATERIAL</h4>
                <p className="text-lg">{delivery.material_type}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">QUANTITY</h4>
                  <p>{delivery.quantity} units</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">WEIGHT</h4>
                  <p>{delivery.weight_kg} kg</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  PICKUP ADDRESS
                </h4>
                <p className="text-sm">{delivery.pickup_address}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  DELIVERY ADDRESS
                </h4>
                <p className="text-sm">{delivery.delivery_address}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ESTIMATED DELIVERY
                </h4>
                <p className="text-sm">
                  {delivery.estimated_delivery ? formatDate(delivery.estimated_delivery) : 'TBD'}
                </p>
              </div>

              {delivery.actual_delivery && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    DELIVERED
                  </h4>
                  <p className="text-sm">{formatDate(delivery.actual_delivery)}</p>
                </div>
              )}

              {delivery.has_driver_assigned && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    DRIVER INFO
                  </h4>
                  <p className="text-sm">Driver assigned - contact via secure request</p>
                  {delivery.vehicle_number && (
                    <p className="text-sm">Vehicle: {delivery.vehicle_number}</p>
                  )}
                </div>
              )}

              {delivery.special_instructions && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">SPECIAL INSTRUCTIONS</h4>
                  <p className="text-sm">{delivery.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking History</CardTitle>
              <CardDescription>Real-time delivery updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tracking updates available yet.</p>
                ) : (
                  updates.map((update, index) => (
                    <div key={update.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                        {index < updates.length - 1 && <div className="w-px h-8 bg-muted mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {statusConfig[update.status as DeliveryStatus]?.label || update.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(update.created_at)}
                          </span>
                        </div>
                        {update.location && (
                          <p className="text-sm mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {update.location}
                          </p>
                        )}
                        {update.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{update.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section - Only show for completed deliveries */}
          {delivery.status === 'delivered' && (
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Rate Your Delivery Experience</CardTitle>
                <CardDescription>
                  Help us improve by sharing your feedback about this delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryReviewForm 
                  deliveryId={delivery.id}
                  onReviewSubmitted={() => {
                    toast({
                      title: "Thank you!",
                      description: "Your review has been submitted successfully."
                    });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryTracker;