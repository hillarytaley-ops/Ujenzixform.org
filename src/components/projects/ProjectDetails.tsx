import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, MapPin, Calendar, DollarSign, Package, Truck, Camera,
  TrendingUp, Edit, Trash2, CheckCircle, Clock, AlertTriangle,
  ShoppingCart, Plus, Building2, Eye, FileText, Loader2,
  PieChart, BarChart3, Target, Users, XCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchPurchaseBuyerIdsForBuilder,
  resolvePurchaseOrderToProjectId,
} from '@/utils/builderProjectPurchaseOrders';
import { getAccessTokenWithPersistenceFallback } from '@/utils/supabaseAccessToken';

interface Project {
  id: string;
  builder_id: string;
  name: string;
  location: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  expected_end_date?: string;
  budget?: number;
  spent?: number;
  materials_spent?: number;
  delivery_spent?: number;
  monitoring_spent?: number;
  status: string;
  project_type?: string;
  client_name?: string;
  progress?: number;
  total_orders?: number;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  po_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: any[];
  supplier_name?: string;
  delivery_date?: string;
}

interface Delivery {
  id: string;
  tracking_number?: string;
  status: string;
  estimated_cost?: number;
  created_at: string;
  pickup_address?: string;
  delivery_address?: string;
  provider_name?: string;
}

interface MonitoringRequest {
  id: string;
  project_name: string;
  camera_count: number;
  status: string;
  created_at: string;
  access_code?: string;
}

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onUpdate?: (project: Project) => void;
  userId: string;
  /** profiles.id — purchase_orders.buyer_id often matches this (same as Orders tab) */
  profileIdForOrders?: string | null;
  /** All builder projects — same attribution rules as dashboard cards (no header-based dumping) */
  attributionProjects: { id: string; name?: string | null; location?: string | null }[];
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  onBack,
  onUpdate,
  userId,
  profileIdForOrders = null,
  attributionProjects,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [monitoringRequests, setMonitoringRequests] = useState<MonitoringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    location: project.location,
    description: project.description || '',
    budget: project.budget?.toString() || '',
    progress: project.progress?.toString() || '0',
    status: project.status,
    expected_end_date: project.expected_end_date || '',
    client_name: project.client_name || '',
    project_type: project.project_type || 'residential'
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  /**
   * Sequence: ignore stale setState from an older fetch after a newer one started.
   * Pending: always clear loading when the last in-flight fetch finishes (avoids stuck spinner if an
   * older run's `finally` skipped clearing because gen !== ref).
   */
  const loadSeqRef = useRef(0);
  const pendingLoadsRef = useRef(0);

  const attributionKey = useMemo(
    () =>
      attributionProjects
        .map((p) => `${p.id}|${p.name ?? ''}|${p.location ?? ''}`)
        .join(';;'),
    [attributionProjects]
  );

  // Fetch project data with timeouts
  const fetchProjectData = async (showRefresh = false) => {
    if (!userId?.trim()) {
      console.warn('📁 ProjectDetails: missing userId, skip load');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    pendingLoadsRef.current += 1;
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    const isCurrent = () => seq === loadSeqRef.current;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const accessToken = await getAccessTokenWithPersistenceFallback();
      const bearer = accessToken || SUPABASE_ANON_KEY;

      const buyerIds = await fetchPurchaseBuyerIdsForBuilder(
        userId,
        accessToken || null,
        profileIdForOrders ? [profileIdForOrders] : null
      );

      if (!isCurrent()) return;

      // Prefer direct REST first — Supabase client uses a 15s global fetch wrapper; the old 5s "safety"
      // timeout cleared loading before PO rows returned, leaving an empty Orders tab.
      let orderRows: Order[] = [];
      try {
        if (buyerIds.length > 0) {
          const controller1 = new AbortController();
          const timeout1 = setTimeout(() => controller1.abort(), 14000);
          try {
            const ordersResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=in.(${buyerIds.join(',')})&select=*&order=created_at.desc`,
              {
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${bearer}`,
                },
                signal: controller1.signal,
              }
            );
            if (ordersResponse.ok) {
              const ordersData = await ordersResponse.json();
              orderRows = Array.isArray(ordersData) ? (ordersData as Order[]) : [];
            } else {
              console.warn('📁 ProjectDetails: purchase_orders REST', ordersResponse.status);
            }
          } finally {
            clearTimeout(timeout1);
          }
        }

        if (!isCurrent()) return;

        if (orderRows.length === 0 && buyerIds.length > 0) {
          const { data: clientOrders, error: clientPoErr } = await supabase
            .from('purchase_orders')
            .select('*')
            .in('buyer_id', buyerIds)
            .order('created_at', { ascending: false });
          if (!clientPoErr && Array.isArray(clientOrders) && clientOrders.length > 0) {
            orderRows = clientOrders as Order[];
          } else if (clientPoErr) {
            console.warn('📁 ProjectDetails: purchase_orders client:', clientPoErr.message);
          }
        }

        if (!isCurrent()) return;

        let matched = orderRows.filter((o) => {
          return resolvePurchaseOrderToProjectId(o, attributionProjects) === project.id;
        });

        if (matched.length === 0) {
          const controllerPid = new AbortController();
          const tPid = setTimeout(() => controllerPid.abort(), 12000);
          try {
            const pidRes = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?project_id=eq.${project.id}&select=*&order=created_at.desc`,
              {
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${bearer}`,
                },
                signal: controllerPid.signal,
              }
            );
            if (pidRes.ok) {
              const pidData = await pidRes.json();
              if (Array.isArray(pidData) && pidData.length > 0) {
                matched = pidData as Order[];
              }
            }
          } finally {
            clearTimeout(tPid);
          }
        }

        if (isCurrent()) {
          setOrders(matched);
          console.log(
            '📁 ProjectDetails: orders',
            matched.length,
            'matched for project',
            project.id,
            '(fetched',
            orderRows.length,
            'buyer POs; buyerIds',
            buyerIds.length,
            ')'
          );
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('📁 Failed to fetch orders:', e);
        }
      }
      
      // Fetch deliveries for this project with timeout
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 3000);
        const deliveriesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?project_id=eq.${project.id}&order=created_at.desc`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${bearer}`,
            },
            signal: controller2.signal
          }
        );
        clearTimeout(timeout2);
        
        if (deliveriesResponse.ok) {
          const deliveriesData = await deliveriesResponse.json();
          if (isCurrent()) setDeliveries(deliveriesData);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('📁 Failed to fetch deliveries:', e);
        }
      }
      
      // Monitoring: often no project_id on row; match user + project name like dashboard
      try {
        const controller3 = new AbortController();
        const timeout3 = setTimeout(() => controller3.abort(), 12000);
        const monitoringResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/monitoring_service_requests?user_id=eq.${userId}&order=created_at.desc`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${bearer}`,
            },
            signal: controller3.signal
          }
        );
        clearTimeout(timeout3);
        
        if (monitoringResponse.ok) {
          const monitoringData = await monitoringResponse.json();
          const mrows = Array.isArray(monitoringData) ? monitoringData : [];
          if (isCurrent()) {
            setMonitoringRequests(
              mrows.filter((m: { project_id?: string | null; project_name?: string | null }) => {
                return resolvePurchaseOrderToProjectId(m, attributionProjects) === project.id;
              })
            );
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('📁 Failed to fetch monitoring requests:', e);
        }
      }
      
    } catch (error) {
      console.error('📁 Error fetching project data:', error);
      // Don't show toast for timeout errors - just log
      if (!(error as any)?.name?.includes('Abort')) {
        toast({
          title: "Error",
          description: "Some project data failed to load. Showing available information.",
          variant: "destructive"
        });
      }
    } finally {
      pendingLoadsRef.current -= 1;
      if (pendingLoadsRef.current <= 0) {
        pendingLoadsRef.current = 0;
        setLoading(false);
        setRefreshing(false);
        console.log('📁 ProjectDetails: Loading complete, component should be visible');
      }
    }
  };

  const fetchProjectDataRef = useRef(fetchProjectData);
  fetchProjectDataRef.current = fetchProjectData;

  const getAccessToken = () => getAccessTokenWithPersistenceFallback();

  useEffect(() => {
    fetchProjectData();
  }, [
    project.id,
    project.name,
    userId,
    profileIdForOrders,
    attributionKey,
  ]);

  /** Refetch when new/updated POs arrive for this builder (keeps details in sync with cart/checkout). */
  useEffect(() => {
    if (!userId?.trim() || !project.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceTimer != null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void fetchProjectDataRef.current(true);
      }, 450);
    };

    let channel = supabase
      .channel(`project-details-po-${project.id}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `buyer_id=eq.${userId}`,
        },
        scheduleRefetch
      );

    const pid = profileIdForOrders?.trim();
    if (pid && pid !== userId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `buyer_id=eq.${pid}`,
        },
        scheduleRefetch
      );
    }

    channel.subscribe();
    return () => {
      if (debounceTimer != null) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId, profileIdForOrders, project.id]);

  const dashboardOrderHint = Number(project.total_orders) || 0;

  // Materials value: all active pipeline + fulfilled (excludes cancelled / draft)
  const materialsSpent = orders
    .filter((o) => {
      const st = String(o.status ?? '').toLowerCase();
      return !['cancelled', 'rejected', 'draft'].includes(st);
    })
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  
  const deliverySpent = deliveries
    .filter(d => ['accepted', 'in_transit', 'delivered', 'completed'].includes(d.status))
    .reduce((sum, d) => sum + (d.estimated_cost || 0), 0);
  
  const monitoringSpent = monitoringRequests
    .filter((m) => {
      const st = String(m.status ?? '').toLowerCase();
      return ['approved', 'active', 'completed', 'in_progress'].includes(st);
    })
    .reduce((sum, m) => sum + ((m.camera_count || 1) * 5000), 0);
  
  const totalSpent = materialsSpent + deliverySpent + monitoringSpent;
  const budgetUsed = project.budget ? (totalSpent / project.budget) * 100 : 0;

  // Handle project update
  const handleUpdateProject = async () => {
    setSaving(true);
    try {
      const accessToken = await getAccessToken();
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_projects?id=eq.${project.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            name: editData.name,
            location: editData.location,
            description: editData.description || null,
            budget: editData.budget ? parseFloat(editData.budget) : null,
            progress: editData.progress ? parseInt(editData.progress) : 0,
            status: editData.status,
            expected_end_date: editData.expected_end_date || null,
            client_name: editData.client_name || null,
            project_type: editData.project_type
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Project Updated!",
          description: "Your project has been updated successfully."
        });
        setShowEditDialog(false);
        if (onUpdate && data[0]) {
          onUpdate(data[0]);
        }
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-emerald-600 text-white';
      case 'on_hold': return 'bg-amber-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'quoted': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'dispatched': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-cyan-100 text-cyan-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(0)}K`;
    }
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
          <p className="text-gray-500">Loading project details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchProjectData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      {/* Project Overview Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}</span>
                  </div>
                </div>
              </div>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className={getStatusColor(project.status)}>
                  {project.status?.replace('_', ' ').toUpperCase()}
                </Badge>
                {project.project_type && (
                  <Badge variant="outline" className="capitalize">
                    {project.project_type}
                  </Badge>
                )}
                {project.client_name && (
                  <Badge variant="outline" className="bg-white">
                    <Users className="h-3 w-3 mr-1" />
                    {project.client_name}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="bg-white rounded-lg p-3 border shadow-sm">
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border shadow-sm">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-xl font-bold text-gray-800">
                  {project.budget ? formatCurrency(project.budget) : 'Not set'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border shadow-sm">
                <p className="text-xs text-gray-500">Orders</p>
                <p className="text-xl font-bold text-green-600">{orders.length}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border shadow-sm">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-xl font-bold text-purple-600">{project.progress || 0}%</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Progress Bar */}
        {project.budget && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Budget Used</span>
                <span className={`font-semibold ${budgetUsed > 100 ? 'text-red-600' : budgetUsed > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                  {budgetUsed.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(budgetUsed, 100)} 
                className={`h-3 ${budgetUsed > 100 ? 'bg-red-100' : budgetUsed > 80 ? 'bg-amber-100' : 'bg-green-100'}`}
              />
              {budgetUsed > 100 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Over budget by {formatCurrency(totalSpent - (project.budget || 0))}
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {!loading &&
        dashboardOrderHint > 0 &&
        orders.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertTitle className="text-amber-900">Orders not listed yet</AlertTitle>
            <AlertDescription className="text-amber-900/90">
              Your project list shows {dashboardOrderHint} linked material order
              {dashboardOrderHint === 1 ? '' : 's'}, but this screen could not load those rows (session,
              link rules, or network). Tap <strong>Refresh</strong> above or open the{' '}
              <strong>Quotes</strong> / <strong>Orders</strong> tabs from the main dashboard menu.
            </AlertDescription>
          </Alert>
        )}

      {/* Spending Breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Materials
                </p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(materialsSpent)}</p>
                <p className="text-xs text-gray-400">{orders.length} orders</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Delivery
                </p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(deliverySpent)}</p>
                <p className="text-xs text-gray-400">{deliveries.length} deliveries</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Monitoring
                </p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(monitoringSpent)}</p>
                <p className="text-xs text-gray-400">{monitoringRequests.length} requests</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Need more materials?</h3>
              <p className="text-blue-100 text-sm">Order materials and link them to this project</p>
            </div>
            <Link to={`/suppliers?project_id=${project.id}`}>
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Order Materials
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Package className="h-4 w-4 mr-2" />
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Truck className="h-4 w-4 mr-2" />
            Deliveries ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Camera className="h-4 w-4 mr-2" />
            Monitoring ({monitoringRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Material Orders
              </CardTitle>
              <CardDescription>
                All material orders linked to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mb-4">Order materials to see them here</p>
                  <Link to={`/suppliers?project_id=${project.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Order Materials
                    </Button>
                  </Link>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div 
                        key={order.id}
                        className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {order.po_number}
                              </code>
                              <Badge className={getOrderStatusColor(order.status)}>
                                {order.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {order.items && order.items.length > 0 && (
                              <div className="text-sm text-gray-600 mb-2">
                                <p className="font-medium">Items:</p>
                                <ul className="list-disc list-inside">
                                  {order.items.slice(0, 3).map((item: any, idx: number) => (
                                    <li key={idx}>
                                      {item.name || item.product_name} x {item.quantity}
                                    </li>
                                  ))}
                                  {order.items.length > 3 && (
                                    <li className="text-gray-400">
                                      +{order.items.length - 3} more items
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                              {order.supplier_name && (
                                <span>Supplier: {order.supplier_name}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {formatCurrency(order.total_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Deliveries
              </CardTitle>
              <CardDescription>
                All deliveries linked to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No deliveries yet</p>
                  <p className="text-sm">Deliveries will appear here when orders are dispatched</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {deliveries.map((delivery) => (
                      <div 
                        key={delivery.id}
                        className="border rounded-lg p-4 hover:border-green-300 hover:bg-green-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {delivery.tracking_number && (
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                  {delivery.tracking_number}
                                </code>
                              )}
                              <Badge className={getOrderStatusColor(delivery.status)}>
                                {delivery.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              {delivery.pickup_address && (
                                <p className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  From: {delivery.pickup_address}
                                </p>
                              )}
                              {delivery.delivery_address && (
                                <p className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-green-500" />
                                  To: {delivery.delivery_address}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(delivery.created_at).toLocaleDateString()}
                              </span>
                              {delivery.provider_name && (
                                <span>Driver: {delivery.provider_name}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {delivery.estimated_cost && (
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(delivery.estimated_cost)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-600" />
                Monitoring Services
              </CardTitle>
              <CardDescription>
                CCTV and monitoring services for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No monitoring services</p>
                  <p className="text-sm">Request monitoring services from the Monitoring tab</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {monitoringRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="border rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Camera className="h-5 w-5 text-purple-600" />
                              <span className="font-medium">{request.project_name}</span>
                              <Badge className={getOrderStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>Cameras: {request.camera_count || 1}</p>
                              {request.access_code && (
                                <p className="mt-1">
                                  Access Code: <code className="bg-gray-100 px-2 py-1 rounded">{request.access_code}</code>
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(request.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-600">
                              {formatCurrency((request.camera_count || 1) * 5000)}
                            </p>
                            <p className="text-xs text-gray-400">per month</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Project
            </DialogTitle>
            <DialogDescription>
              Update your project details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location *</Label>
                <Input
                  id="edit-location"
                  value={editData.location}
                  onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Budget (KES)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  value={editData.budget}
                  onChange={(e) => setEditData(prev => ({ ...prev, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={editData.progress}
                  onChange={(e) => setEditData(prev => ({ ...prev, progress: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editData.status} 
                  onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Project Type</Label>
                <Select 
                  value={editData.project_type} 
                  onValueChange={(value) => setEditData(prev => ({ ...prev, project_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-client">Client Name</Label>
                <Input
                  id="edit-client"
                  value={editData.client_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, client_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">Expected End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editData.expected_end_date}
                  onChange={(e) => setEditData(prev => ({ ...prev, expected_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProject}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
