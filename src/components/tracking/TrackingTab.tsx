import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Phone,
  Navigation,
  RefreshCw,
  Copy,
  Eye,
  Calendar,
  Building,
  User,
  ArrowRight,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TrackingNumber {
  id: string;
  tracking_number: string;
  delivery_request_id: string;
  purchase_order_id: string | null;
  builder_id: string;
  delivery_provider_id: string | null;
  supplier_id: string | null;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'near_destination' | 'delivered' | 'cancelled';
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  pickup_address: string | null;
  delivery_address: string;
  materials_description: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

interface TrackingTabProps {
  userId: string;
  userRole: 'admin' | 'professional_builder' | 'private_client' | 'supplier';
  userName?: string;
}

const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

export const TrackingTab: React.FC<TrackingTabProps> = ({ userId: propUserId, userRole, userName }) => {
  const [trackingNumbers, setTrackingNumbers] = useState<TrackingNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all'); // 'all', 'track', 'active', 'delivered', 'pending'
  const [showTrackModal, setShowTrackModal] = useState(false);
  const { toast } = useToast();

  // Get userId from props or localStorage fallback
  const getUserId = (): string => {
    if (propUserId) return propUserId;
    
    // Try localStorage user_id
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) return storedUserId;
    
    // Try parsing from Supabase session
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user?.id || '';
      }
    } catch (e) {}
    
    return '';
  };

  const userId = getUserId();

  const getAccessToken = useCallback(() => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.access_token || '';
      }
    } catch (e) {}
    return '';
  }, []);

  // Helper function to map delivery status to tracking status
  const mapDeliveryStatusToTrackingStatus = (status: string): TrackingNumber['status'] => {
    const statusMap: Record<string, TrackingNumber['status']> = {
      'pending': 'pending',
      'requested': 'pending',
      'assigned': 'accepted',
      'accepted': 'accepted',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'near_destination': 'near_destination',
      'delivered': 'delivered',
      'completed': 'delivered',
      'shipped': 'in_transit',
      'cancelled': 'cancelled',
      'rejected': 'cancelled',
    };
    return statusMap[status] || 'pending';
  };

  const fetchTrackingNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = getAccessToken();
      
      console.log('📦 TrackingTab: Starting fetch for userId:', userId, 'role:', userRole);
      
      // For builders, we need to get their profile ID as well
      let profileId = userId;
      let supplierId = userId;
      
      if (userRole === 'professional_builder' || userRole === 'private_client') {
        try {
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            console.log('📦 Profile lookup result:', profiles);
            if (profiles && profiles.length > 0) {
              profileId = profiles[0].id;
              console.log('📦 Got profile ID:', profileId);
            }
          }
        } catch (e) {
          console.log('📦 Could not fetch profile, using userId');
        }
      }
      
      // For suppliers, get their supplier record ID
      if (userRole === 'supplier') {
        try {
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${userId}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          if (supplierResponse.ok) {
            const suppliers = await supplierResponse.json();
            if (suppliers && suppliers.length > 0) {
              supplierId = suppliers[0].id;
              console.log('📦 Got supplier ID:', supplierId);
            }
          }
        } catch (e) {
          console.log('📦 Could not fetch supplier, using userId');
        }
      }
      
      // Build query based on user role
      // Order by updated_at first (most recently updated), then created_at (newest first)
      let url = `${SUPABASE_URL}/rest/v1/tracking_numbers?order=updated_at.desc,created_at.desc&select=*`;
      
      // Add cache-busting to ensure fresh data
      const cacheBuster = `&_t=${Date.now()}`;
      
      if (userRole === 'admin') {
        // Admin sees all tracking numbers - no filter needed
        console.log('📦 Admin mode: fetching ALL tracking numbers');
      } else if (userRole === 'supplier') {
        // Suppliers see tracking numbers for their orders (where they are the supplier)
        url += `&or=(supplier_id.eq.${userId},supplier_id.eq.${supplierId})`;
        console.log('📦 Supplier mode: filtering by userId:', userId, 'and supplierId:', supplierId);
      } else {
        // Builders see their own tracking numbers - check both user_id and profile_id
        url += `&or=(builder_id.eq.${userId},builder_id.eq.${profileId})`;
        console.log('📦 Builder mode: filtering by userId:', userId, 'and profileId:', profileId);
      }

      url += cacheBuster;
      console.log('📦 Fetching tracking numbers from:', url);

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      let trackingData: TrackingNumber[] = [];
      
      if (response.ok) {
        trackingData = await response.json() || [];
        console.log('📦 Tracking numbers loaded from tracking_numbers table:', trackingData.length);
        
        // Log the first few tracking numbers to debug
        if (trackingData.length > 0) {
          console.log('📦 First 3 tracking numbers:', trackingData.slice(0, 3).map(tn => ({
            tracking_number: tn.tracking_number,
            status: tn.status,
            created_at: tn.created_at,
            updated_at: tn.updated_at
          })));
        }
      } else {
        const errorText = await response.text();
        console.error('📦 Failed to fetch tracking numbers:', response.status, errorText);
      }
      
      // For suppliers, also fetch from purchase_orders that have delivery info
      // This provides tracking data even if tracking_numbers table doesn't have entries
      if (userRole === 'supplier') {
        try {
          const ordersUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?or=(supplier_id.eq.${userId},supplier_id.eq.${supplierId})&delivery_status=neq.pending&select=id,order_number,status,delivery_address,delivery_provider_id,delivery_provider_name,delivery_provider_phone,delivery_vehicle_info,delivery_status,delivery_assigned_at,delivery_accepted_at,estimated_delivery_time,created_at,updated_at&order=created_at.desc`;
          
          console.log('📦 Fetching supplier orders with delivery info...');
          
          const ordersResponse = await fetch(ordersUrl, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          });
          
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('📦 Orders with delivery info:', ordersData?.length || 0);
            
            // Convert orders to tracking number format for display
            const orderTrackingData: TrackingNumber[] = (ordersData || []).map((order: any) => ({
              id: order.id,
              tracking_number: order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
              delivery_request_id: order.id,
              purchase_order_id: order.id,
              builder_id: order.builder_id || '',
              delivery_provider_id: order.delivery_provider_id,
              supplier_id: supplierId,
              status: mapDeliveryStatusToTrackingStatus(order.delivery_status || order.status),
              current_latitude: null,
              current_longitude: null,
              last_location_update: null,
              pickup_address: null,
              delivery_address: order.delivery_address || 'Address not specified',
              materials_description: `Order #${order.order_number || order.id.slice(0, 8)}`,
              estimated_delivery_date: order.estimated_delivery_time,
              actual_delivery_date: order.status === 'delivered' ? order.updated_at : null,
              provider_name: order.delivery_provider_name,
              provider_phone: order.delivery_provider_phone,
              vehicle_type: order.delivery_vehicle_info,
              vehicle_registration: null,
              created_at: order.created_at,
              accepted_at: order.delivery_accepted_at,
              picked_up_at: null,
              delivered_at: order.status === 'delivered' ? order.updated_at : null,
            }));
            
            // Merge with existing tracking data, avoiding duplicates
            const existingIds = new Set(trackingData.map(t => t.purchase_order_id));
            const newOrderTracking = orderTrackingData.filter((ot: TrackingNumber) => !existingIds.has(ot.purchase_order_id));
            trackingData = [...trackingData, ...newOrderTracking];
            
            console.log('📦 Total tracking entries after merge:', trackingData.length);
          }
        } catch (e) {
          console.error('📦 Error fetching orders for tracking:', e);
        }
      }
      
      // Sort by updated_at desc, then created_at desc to ensure most recent are first
      trackingData.sort((a, b) => {
        const aUpdated = new Date(a.updated_at || a.created_at).getTime();
        const bUpdated = new Date(b.updated_at || b.created_at).getTime();
        if (aUpdated !== bUpdated) {
          return bUpdated - aUpdated; // Most recent first
        }
        const aCreated = new Date(a.created_at).getTime();
        const bCreated = new Date(b.created_at).getTime();
        return bCreated - aCreated; // Most recent first
      });
      
      setTrackingNumbers(trackingData);
      console.log('📦 Final tracking numbers:', trackingData.length);
      console.log('📦 Status breakdown:', {
        accepted: trackingData.filter(t => t.status === 'accepted').length,
        in_transit: trackingData.filter(t => t.status === 'in_transit').length,
        picked_up: trackingData.filter(t => t.status === 'picked_up').length,
        delivered: trackingData.filter(t => t.status === 'delivered').length,
        pending: trackingData.filter(t => t.status === 'pending').length
      });
      
    } catch (error) {
      console.error('📦 Error fetching tracking numbers:', error);
      setTrackingNumbers([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, propUserId, getAccessToken]);

  useEffect(() => {
    if (userId) {
      console.log('📦 TrackingTab: Fetching tracking numbers on mount...');
      fetchTrackingNumbers();
    } else {
      console.log('📦 TrackingTab: Waiting for userId...');
      // Retry after a short delay
      const retryTimeout = setTimeout(() => {
        const newUserId = getUserId();
        if (newUserId) {
          fetchTrackingNumbers();
        }
      }, 1000);
      return () => clearTimeout(retryTimeout);
    }
  }, [propUserId, userRole, fetchTrackingNumbers, userId]);

  // Force refresh when component becomes visible (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        console.log('📦 Page became visible, refreshing tracking numbers...');
        fetchTrackingNumbers();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, fetchTrackingNumbers]);

  // Real-time subscription for tracking number updates
  useEffect(() => {
    if (!userId) return;

    console.log('📦 Setting up real-time subscription for tracking_numbers...');
    
    // Get profile ID for filtering
    let profileId = userId;
    const setupSubscription = async () => {
      if (userRole === 'professional_builder' || userRole === 'private_client') {
        try {
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${getAccessToken() || SUPABASE_ANON_KEY}`,
              }
            }
          );
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles && profiles.length > 0) {
              profileId = profiles[0].id;
            }
          }
        } catch (e) {
          console.log('📦 Could not fetch profile for subscription');
        }
      }

      // Subscribe to INSERT and UPDATE events on tracking_numbers table
      // Also subscribe to delivery_requests changes (since trigger updates tracking_numbers)
      const channel = supabase
        .channel(`tracking-numbers-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tracking_numbers',
            // For admin, no filter. For others, we'll filter in callback
            filter: userRole === 'admin' ? undefined : undefined
          },
          (payload) => {
            console.log('🔴 Real-time tracking update:', payload.eventType, payload.new);
            
            // For builders, check if this tracking number belongs to them
            const trackingBuilderId = payload.new.builder_id;
            const belongsToUser = userRole === 'admin' || 
              trackingBuilderId === userId || 
              trackingBuilderId === profileId ||
              (userRole === 'supplier' && payload.new.supplier_id === userId);

            if (!belongsToUser && userRole !== 'admin') {
              console.log('📦 Tracking number does not belong to this user, ignoring update');
              return;
            }

            if (payload.eventType === 'INSERT') {
              // New tracking number created - refresh the list
              console.log('📦 New tracking number created, refreshing list...');
              fetchTrackingNumbers();
              toast({
                title: "📦 New Tracking Number",
                description: `Tracking number ${payload.new.tracking_number} has been generated for your delivery!`,
              });
            } else if (payload.eventType === 'UPDATE') {
              // Tracking number updated - update the specific item
              setTrackingNumbers(prev => {
                const index = prev.findIndex(tn => tn.id === payload.new.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], ...payload.new };
                  return updated;
                }
                // If not found, might be a new one - refresh to be safe
                fetchTrackingNumbers();
                return prev;
              });
              
              // Show toast for status changes
              if (payload.old?.status !== payload.new.status) {
                const statusLabels: Record<string, string> = {
                  'pending': 'Pending',
                  'accepted': 'Accepted',
                  'picked_up': 'Picked Up',
                  'in_transit': 'In Transit',
                  'near_destination': 'Near Destination',
                  'delivered': 'Delivered',
                  'cancelled': 'Cancelled'
                };
                toast({
                  title: "📍 Status Updated",
                  description: `Tracking ${payload.new.tracking_number}: ${statusLabels[payload.old?.status] || payload.old?.status} → ${statusLabels[payload.new.status] || payload.new.status}`,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'delivery_requests',
            // Filter in callback for builders
            filter: userRole === 'admin' ? undefined : undefined
          },
          (payload) => {
            console.log('🚚 Delivery request status updated:', payload.new.status, 'for delivery_request_id:', payload.new.id);
            
            // Check if status changed - trigger will update tracking_numbers
            if (payload.old?.status !== payload.new.status) {
              console.log('📦 Delivery request status changed from', payload.old?.status, 'to', payload.new.status, '- refreshing tracking numbers...');
              // Small delay to allow trigger to complete
              setTimeout(() => {
                fetchTrackingNumbers();
              }, 500);
            }
          }
        )
        .subscribe((status) => {
          console.log('📦 Real-time subscription status:', status);
        });

      return () => {
        console.log('📦 Cleaning up real-time subscription');
        channel.unsubscribe();
      };
    };

    const cleanup = setupSubscription();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [userId, userRole, propUserId, fetchTrackingNumbers, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Tracking number copied to clipboard',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
      pending: { label: 'Pending', variant: 'secondary', color: 'bg-gray-100 text-gray-700' },
      accepted: { label: 'Accepted', variant: 'default', color: 'bg-blue-100 text-blue-700' },
      picked_up: { label: 'Picked Up', variant: 'default', color: 'bg-purple-100 text-purple-700' },
      in_transit: { label: 'In Transit', variant: 'default', color: 'bg-orange-100 text-orange-700' },
      near_destination: { label: 'Near You', variant: 'default', color: 'bg-green-100 text-green-700' },
      delivered: { label: 'Delivered', variant: 'default', color: 'bg-green-500 text-white' },
      cancelled: { label: 'Cancelled', variant: 'destructive', color: 'bg-red-100 text-red-700' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'accepted': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'picked_up': return <Package className="h-4 w-4 text-purple-500" />;
      case 'in_transit': return <Truck className="h-4 w-4 text-orange-500" />;
      case 'near_destination': return <Navigation className="h-4 w-4 text-green-500" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTrackingNumbers = trackingNumbers.filter(tn => {
    const matchesSearch = searchQuery === '' || 
      tn.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tn.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tn.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = ['accepted', 'picked_up', 'in_transit', 'near_destination'].includes(tn.status);
    } else if (statusFilter !== 'all') {
      matchesStatus = tn.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const activeDeliveries = trackingNumbers.filter(tn => ['accepted', 'picked_up', 'in_transit', 'near_destination'].includes(tn.status));
  const completedDeliveries = trackingNumbers.filter(tn => tn.status === 'delivered');
  const pendingDeliveries = trackingNumbers.filter(tn => tn.status === 'pending');
  
  // Handle category button clicks
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    if (category === 'track') {
      setShowTrackModal(true);
    } else if (category === 'active') {
      setStatusFilter('active');
    } else if (category === 'delivered') {
      setStatusFilter('delivered');
    } else if (category === 'pending') {
      setStatusFilter('pending');
    } else {
      setStatusFilter('all');
    }
  };
  
  // Get filtered tracking numbers based on active category
  const getCategoryFilteredNumbers = () => {
    if (activeCategory === 'active') {
      return activeDeliveries;
    } else if (activeCategory === 'delivered') {
      return completedDeliveries;
    } else if (activeCategory === 'pending') {
      return pendingDeliveries;
    }
    return filteredTrackingNumbers;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats - Now Clickable Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button
          onClick={() => handleCategoryClick('track')}
          className="h-auto p-0 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all"
        >
          <CardContent className="p-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-blue-100 text-sm font-medium mb-1">Track a Delivery</p>
                <p className="text-2xl font-bold">Click to Track</p>
                <p className="text-blue-200 text-xs mt-1">Manage dispatched packages</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Package className="h-10 w-10 text-white" />
              </div>
            </div>
          </CardContent>
        </Button>
        
        <Button
          onClick={() => handleCategoryClick('active')}
          className={`h-auto p-0 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all ${activeCategory === 'active' ? 'ring-4 ring-orange-300' : ''}`}
        >
          <CardContent className="p-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-orange-100 text-sm font-medium mb-1">Active Deliveries</p>
                <p className="text-3xl font-bold">{activeDeliveries.length}</p>
                <p className="text-orange-200 text-xs mt-1">Currently in transit</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Truck className="h-10 w-10 text-white" />
              </div>
            </div>
          </CardContent>
        </Button>
        
        <Button
          onClick={() => handleCategoryClick('delivered')}
          className={`h-auto p-0 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all ${activeCategory === 'delivered' ? 'ring-4 ring-green-300' : ''}`}
        >
          <CardContent className="p-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-green-100 text-sm font-medium mb-1">Delivered</p>
                <p className="text-3xl font-bold">{completedDeliveries.length}</p>
                <p className="text-green-200 text-xs mt-1">Previously delivered</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
            </div>
          </CardContent>
        </Button>
        
        <Button
          onClick={() => handleCategoryClick('pending')}
          className={`h-auto p-0 bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 shadow-lg hover:shadow-xl transition-all ${activeCategory === 'pending' ? 'ring-4 ring-gray-300' : ''}`}
        >
          <CardContent className="p-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-gray-100 text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold">{pendingDeliveries.length}</p>
                <p className="text-gray-200 text-xs mt-1">Awaiting delivery</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Clock className="h-10 w-10 text-white" />
              </div>
            </div>
          </CardContent>
        </Button>
      </div>

      {/* Track a Delivery Modal */}
      <Dialog open={showTrackModal} onOpenChange={setShowTrackModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-800">
              <MapPin className="h-5 w-5" />
              Track a Delivery
            </DialogTitle>
            <DialogDescription>
              Enter your tracking number to view real-time delivery status and location for dispatched packages
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter tracking number (e.g., TRK-20260216-A7B3C)"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      window.open(`/tracking?number=${searchQuery}`, '_blank');
                      setShowTrackModal(false);
                    }
                  }}
                />
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (searchQuery) {
                    window.open(`/tracking?number=${searchQuery}`, '_blank');
                    setShowTrackModal(false);
                  } else {
                    toast({
                      title: "Tracking Number Required",
                      description: "Please enter a tracking number to track your delivery",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Track Now
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">📍 How to track your delivery:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Copy your tracking number from the list below or from your order confirmation</li>
              <li>Enter it in the field above and click "Track Now"</li>
              <li>View real-time location and status updates on the tracking page</li>
              <li>Get notifications when your delivery status changes</li>
            </ol>
          </div>
          
          {trackingNumbers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Recent Tracking Numbers:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {trackingNumbers.slice(0, 5).map((tn) => (
                  <Button
                    key={tn.id}
                    variant="outline"
                    className="w-full justify-between text-left"
                    onClick={() => {
                      setSearchQuery(tn.tracking_number);
                      window.open(`/tracking?number=${tn.tracking_number}`, '_blank');
                      setShowTrackModal(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tn.status)}
                      <code className="font-mono text-sm">{tn.tracking_number}</code>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrackModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {activeCategory !== 'all' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveCategory('all');
              setStatusFilter('all');
            }}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filter
          </Button>
        )}
        {['all', 'pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              if (status === 'all') {
                setActiveCategory('all');
              }
            }}
            className={statusFilter === status ? 'bg-blue-600' : ''}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchTrackingNumbers();
          }}
          className="ml-auto"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tracking Numbers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tracking Numbers</CardTitle>
          <CardDescription>
            {userRole === 'admin' 
              ? 'All delivery tracking numbers in the system'
              : 'Track the status of your material deliveries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredTrackingNumbers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Tracking Numbers Yet</h3>
              <p className="text-gray-500 mt-2">
                {userRole === 'admin' 
                  ? 'Tracking numbers will appear here when delivery providers accept delivery requests.'
                  : 'When a delivery provider accepts your delivery request, a tracking number will be generated automatically.'}
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                <h4 className="font-medium text-blue-800">How it works:</h4>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 text-left list-decimal list-inside">
                  <li>Request a delivery for your materials</li>
                  <li>A delivery provider accepts your request</li>
                  <li>Tracking number is automatically generated</li>
                  <li>Track your delivery in real-time!</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeCategory !== 'all' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    {activeCategory === 'active' && `Showing ${activeDeliveries.length} active delivery${activeDeliveries.length !== 1 ? 'ies' : ''} currently in transit`}
                    {activeCategory === 'delivered' && `Showing ${completedDeliveries.length} previously delivered order${completedDeliveries.length !== 1 ? 's' : ''}`}
                    {activeCategory === 'pending' && `Showing ${pendingDeliveries.length} order${pendingDeliveries.length !== 1 ? 's' : ''} awaiting delivery`}
                  </p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCategoryFilteredNumbers().map((tn) => (
                    <TableRow key={tn.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tn.status)}
                          <div>
                            <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {tn.tracking_number}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => copyToClipboard(tn.tracking_number)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tn.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-sm">{tn.delivery_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tn.provider_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {tn.provider_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{tn.provider_name}</p>
                              {tn.provider_phone && (
                                <p className="text-xs text-gray-500">{tn.provider_phone}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(tn.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(tn.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/tracking?number=${tn.tracking_number}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Track
                          </Button>
                          {tn.provider_phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`tel:${tn.provider_phone}`)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Deliveries Timeline - Only show when not filtering by active category */}
      {activeDeliveries.length > 0 && activeCategory !== 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              Active Deliveries
            </CardTitle>
            <CardDescription>Deliveries currently in progress - Click "Active Deliveries" button above to see all</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDeliveries.slice(0, 3).map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {delivery.tracking_number}
                      </code>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {delivery.delivery_address}
                    </p>
                    {delivery.provider_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Driver: {delivery.provider_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => window.open(`/tracking?number=${delivery.tracking_number}`, '_blank')}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Live Track
                  </Button>
                </div>
              ))}
              {activeDeliveries.length > 3 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCategoryClick('active')}
                >
                  View All {activeDeliveries.length} Active Deliveries
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackingTab;
