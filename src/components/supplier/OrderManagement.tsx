import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Search,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCw,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { getPrefetchedOrders } from '@/services/dataPrefetch';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Additional fields for order type identification
  order_type?: 'quote_request' | 'direct_purchase';
  buyer_role?: string;
  // Delivery provider fields
  delivery_provider_id?: string;
  delivery_provider_name?: string;
  delivery_provider_phone?: string;
  delivery_vehicle_info?: string;
  delivery_status?: 'pending' | 'requested' | 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_assigned_at?: string;
  delivery_accepted_at?: string;
  estimated_delivery_time?: string;
  delivery_required?: boolean; // Track if builder requested delivery
}

interface OrderManagementProps {
  supplierId: string;
  /** Orders already loaded by the dashboard – show immediately so tab is not empty while loadOrders runs */
  initialPurchaseOrders?: any[];
  isDarkMode?: boolean;
  onNavigateToDispatch?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  quoted: { label: 'Quoted', color: 'bg-orange-100 text-orange-800', icon: FileText },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
};

// Safe getter for status config
const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};

export const OrderManagement: React.FC<OrderManagementProps> = ({ supplierId, initialPurchaseOrders, isDarkMode = false, onNavigateToDispatch }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null); // Track which order is being updated
  const [activeOrderTab, setActiveOrderTab] = useState<'not_dispatched' | 'shipped' | 'delivered'>('not_dispatched');
  const { toast } = useToast();

  // Quick transform for prefetched data (no profile lookup)
  const transformOrdersQuick = (purchaseOrders: any[]): Order[] => {
    return purchaseOrders.map((po: any, index: number) => {
      const items = Array.isArray(po.items) ? po.items : [];
      return {
        id: po.id,
        order_number: po.po_number || `ORD-${String(index + 1).padStart(4, '0')}`,
        customer_name: po.project_name || 'Customer',
        customer_email: '',
        customer_phone: '',
        delivery_address: po.delivery_address || '',
        items: items.map((item: any) => ({
          name: item.material_name || item.name || 'Item',
          quantity: item.quantity || 1,
          price: item.unit_price || item.price || 0
        })),
        total_amount: po.total_amount || 0,
        status: po.status || 'pending',
        payment_status: po.payment_status || 'pending',
        notes: po.notes || '',
        created_at: po.created_at,
        updated_at: po.updated_at || po.created_at,
        order_type: po.po_number?.startsWith('QR-') ? 'quote_request' : 'direct_purchase',
        buyer_role: po.buyer_role || 'unknown',
        delivery_provider_id: po.delivery_provider_id,
        delivery_provider_name: po.delivery_provider_name,
        delivery_provider_phone: po.delivery_provider_phone,
        delivery_vehicle_info: po.delivery_vehicle_info,
        delivery_status: po.delivery_status,
        delivery_assigned_at: po.delivery_assigned_at,
        delivery_accepted_at: po.delivery_accepted_at,
        estimated_delivery_time: po.estimated_delivery_time,
        delivery_required: po.delivery_required || false,
      };
    });
  };

  // Fresh load with enrichment (delivery_requests). Runs after prefetch so provider-assigned status shows.
  const loadOrdersFresh = async (SUPABASE_URL: string, SUPABASE_ANON_KEY: string) => {
    loadOrders(true);
  };

  // Show dashboard-passed orders immediately so the Orders tab is not empty
  useEffect(() => {
    if (initialPurchaseOrders?.length) {
      const quick = transformOrdersQuick(initialPurchaseOrders);
      setOrders(quick);
      setLoading(false);
      console.log('✅ OrderManagement: Showing', quick.length, 'orders from dashboard (initialPurchaseOrders)');
    }
  }, [initialPurchaseOrders]);

  useEffect(() => {
    loadOrders();
    // Safety timeout – force loading false so UI doesn't spin forever if loadOrders hangs
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Orders safety timeout - forcing loading false after 15s');
    }, 15000);
    return () => clearTimeout(safetyTimeout);
  }, [supplierId]);

  // Real-time subscription for order updates (synchronization with Builder Dashboard)
  useEffect(() => {
    if (!supplierId) return;

    console.log('📡 OrderManagement: Setting up real-time subscription for supplier:', supplierId);

    // Subscribe to purchase_orders changes for this supplier
    const channel = supabase
      .channel('supplier-orders-realtime')
      // Listen to purchase_orders table changes - listen to ALL updates and filter client-side
      // This ensures we catch updates even if supplier_id changes or trigger updates
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchase_orders'
        },
        async (payload) => {
          console.log('🔄 OrderManagement: Purchase order UPDATE detected:', payload.new?.po_number, 'supplier_id:', payload.new?.supplier_id);
          
          // Check if this order belongs to this supplier (client-side filter)
          const orderSupplierId = payload.new?.supplier_id;
          if (!orderSupplierId || orderSupplierId !== supplierId) {
            // Also check if it matches any related supplier IDs
            const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
            
            try {
              const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
              let accessToken = '';
              if (stored) {
                const parsed = JSON.parse(stored);
                accessToken = parsed.access_token || '';
              }
              
              const headers: Record<string, string> = {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
              };
              if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
              }
              
              // Check if this supplier_id is related to our supplier
              const supplierResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/suppliers?or=(user_id.eq.${supplierId},id.eq.${supplierId})&select=id,user_id`,
                { headers, cache: 'no-store' }
              );
              
              if (supplierResponse.ok) {
                const supplierData = await supplierResponse.json();
                const relatedSupplierIds = [supplierId];
                supplierData.forEach((s: any) => {
                  if (s.id && !relatedSupplierIds.includes(s.id)) relatedSupplierIds.push(s.id);
                  if (s.user_id && !relatedSupplierIds.includes(s.user_id)) relatedSupplierIds.push(s.user_id);
                });
                
                if (!relatedSupplierIds.includes(orderSupplierId)) {
                  console.log('⚠️ OrderManagement: Order does not belong to this supplier, ignoring');
                  return;
                }
              } else {
                // If we can't verify, only process if supplier_id matches exactly
                if (orderSupplierId !== supplierId) {
                  return;
                }
              }
            } catch (e) {
              console.log('⚠️ Could not verify supplier relationship, using exact match');
              if (orderSupplierId !== supplierId) {
                return;
              }
            }
          }
          
          // This order belongs to our supplier - process the update
          const orderId = payload.new.id;
          const oldProviderId = payload.old?.delivery_provider_id;
          const newProviderId = payload.new.delivery_provider_id;
          const oldDeliveryStatus = payload.old?.delivery_status;
          const newDeliveryStatus = payload.new.delivery_status;
          
          console.log('✅ OrderManagement: Processing update for order:', orderId, 'oldProvider:', oldProviderId, 'newProvider:', newProviderId);
          
          // If delivery provider was just assigned (accepted), update immediately
          if (!oldProviderId && newProviderId) {
            console.log('✅ Delivery provider accepted - updating order immediately:', orderId);
            
            // Update the order in local state immediately
            setOrders(prevOrders => prevOrders.map(order => {
              if (order.id === orderId) {
                return {
                  ...order,
                  delivery_provider_id: newProviderId,
                  delivery_provider_name: payload.new.delivery_provider_name || order.delivery_provider_name,
                  delivery_provider_phone: payload.new.delivery_provider_phone || order.delivery_provider_phone,
                  delivery_status: newDeliveryStatus || 'accepted',
                  delivery_assigned_at: payload.new.delivery_assigned_at || order.delivery_assigned_at,
                  delivery_accepted_at: payload.new.delivery_accepted_at || new Date().toISOString(),
                  updated_at: payload.new.updated_at || order.updated_at
                };
              }
              return order;
            }));
            
            toast({
              title: '✅ Delivery Provider Accepted',
              description: `Delivery provider ${payload.new.delivery_provider_name || ''} accepted order ${payload.new.po_number || ''}. Status updated.`,
            });
            
            // Also refresh in background to ensure consistency
            setTimeout(() => loadOrders(), 1000);
            return; // Skip the general refresh below
          }
          
          // If delivery status changed (e.g., to 'accepted', 'in_transit', etc.)
          if (oldDeliveryStatus !== newDeliveryStatus && newDeliveryStatus) {
            console.log('🔄 Delivery status changed - updating immediately:', orderId, oldDeliveryStatus, '→', newDeliveryStatus);
            
            // Update the order in local state immediately
            setOrders(prevOrders => prevOrders.map(order => {
              if (order.id === orderId) {
                return {
                  ...order,
                  delivery_status: newDeliveryStatus,
                  delivery_provider_id: newProviderId || order.delivery_provider_id,
                  delivery_provider_name: payload.new.delivery_provider_name || order.delivery_provider_name,
                  updated_at: payload.new.updated_at || order.updated_at
                };
              }
              return order;
            }));
            
            // Show appropriate toast
            if (newDeliveryStatus === 'accepted') {
              toast({
                title: '✅ Delivery Confirmed',
                description: `Delivery provider accepted order ${payload.new.po_number || ''}`,
              });
            } else if (newDeliveryStatus === 'in_transit') {
              toast({
                title: '🚚 Order In Transit',
                description: `Order ${payload.new.po_number || ''} is now in transit`,
              });
            }
            
            // Also refresh in background
            setTimeout(() => loadOrders(), 1000);
            return; // Skip the general refresh below
          }
          
          // Handle status changes (especially 'shipped' status from QR dispatch)
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;
          
          if (oldStatus !== newStatus) {
            console.log('🔄 OrderManagement: Status changed:', orderId, oldStatus, '→', newStatus);
            
            // Update the order in local state immediately
            setOrders(prevOrders => prevOrders.map(order => {
              if (order.id === orderId) {
                return {
                  ...order,
                  status: newStatus as Order['status'],
                  // Also update delivery_status if status is delivered
                  delivery_status: newStatus === 'delivered' ? 'delivered' : (payload.new.delivery_status || order.delivery_status),
                  updated_at: payload.new.updated_at || order.updated_at
                };
              }
              return order;
            }));
            
            // Show toast notifications for important status changes
            if ((newStatus === 'shipped' || newStatus === 'dispatched') && oldStatus !== 'shipped' && oldStatus !== 'dispatched') {
              toast({
                title: '📦 Order Shipped',
                description: `Order ${payload.new.po_number || orderId.slice(0, 8)} has been shipped and is ready for delivery.`,
              });
            } else if (newStatus === 'delivered' && oldStatus !== 'delivered') {
              toast({
                title: '✅ Order Delivered',
                description: `Order ${payload.new.po_number || orderId.slice(0, 8)} has been delivered successfully.`,
              });
            } else if (oldStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'processing')) {
              toast({
                title: '✅ Order Accepted',
                description: `Builder accepted order ${payload.new.po_number || ''}`,
              });
            }
            
            // Refresh in background to ensure consistency
            setTimeout(() => loadOrders(), 1000);
            return; // Skip the general refresh below
          }
          
          // Refresh orders for other changes (non-status updates)
          loadOrders();
        }
      )
      // ALSO listen to delivery_requests table changes (when provider accepts)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `status=eq.accepted`
        },
        async (payload) => {
          console.log('🚚 OrderManagement: Delivery request accepted:', payload.new?.purchase_order_id, 'provider_id:', payload.new?.provider_id);
          
          // When delivery request is accepted, fetch the purchase order to check if it belongs to this supplier
          if (payload.new?.provider_id) {
            let orderId = payload.new.purchase_order_id;
            const providerId = payload.new.provider_id;
            
            // If purchase_order_id is null, try to find matching purchase_order
            if (!orderId && payload.new.builder_id) {
              console.log('🔍 OrderManagement: purchase_order_id is null, searching for matching purchase_order...');
              try {
                const { data: matchingPOs, error: searchError } = await supabase
                  .from('purchase_orders')
                  .select('id, supplier_id, po_number')
                  .eq('buyer_id', payload.new.builder_id)
                  .eq('delivery_required', true)
                  .is('delivery_provider_id', null)
                  .order('created_at', { ascending: false })
                  .limit(5);
                
                if (!searchError && matchingPOs && matchingPOs.length > 0) {
                  // Try to match by delivery address
                  const deliveryAddress = payload.new.delivery_address;
                  if (deliveryAddress) {
                    const exactMatch = matchingPOs.find(po => 
                      po.delivery_address && 
                      po.delivery_address.toLowerCase().trim() === deliveryAddress.toLowerCase().trim()
                    );
                    if (exactMatch) {
                      orderId = exactMatch.id;
                      console.log('✅ OrderManagement: Found matching purchase_order by address:', orderId);
                    } else if (matchingPOs.length === 1) {
                      // If only one match, use it
                      orderId = matchingPOs[0].id;
                      console.log('✅ OrderManagement: Found single matching purchase_order:', orderId);
                    }
                  } else if (matchingPOs.length === 1) {
                    orderId = matchingPOs[0].id;
                    console.log('✅ OrderManagement: Found single matching purchase_order (no address match):', orderId);
                  }
                }
              } catch (e) {
                console.log('⚠️ OrderManagement: Error searching for purchase_order:', e);
              }
            }
            
            if (!orderId) {
              console.log('⚠️ OrderManagement: No purchase_order_id found, cannot update supplier dashboard');
              return;
            }
            
            try {
              // Fetch the purchase order to check if it belongs to this supplier
              const { data: purchaseOrder, error: poError } = await supabase
                .from('purchase_orders')
                .select('id, supplier_id, po_number, delivery_provider_id, delivery_provider_name, delivery_provider_phone, delivery_status')
                .eq('id', orderId)
                .single();
              
              if (poError || !purchaseOrder) {
                console.log('❌ OrderManagement: Purchase order not found or error:', poError);
                return;
              }
              
              // Check if this order belongs to this supplier
              const supplierIds = [supplierId];
              // Also check if supplier_id matches any of the supplier IDs we're tracking
              if (!supplierIds.includes(purchaseOrder.supplier_id)) {
                console.log('⚠️ OrderManagement: Order does not belong to this supplier, ignoring');
                return;
              }
              
              // Fetch delivery provider details
              let providerName = 'Delivery Provider';
              let providerPhone = '';
              
              try {
                // Try to get from delivery_providers table
                const { data: providerData } = await supabase
                  .from('delivery_providers')
                  .select('provider_name, phone')
                  .eq('id', providerId)
                  .single();
                
                if (providerData) {
                  // CRITICAL: Use provider_name (primary field) - this is what the provider filled in during registration
                  providerName = providerData.provider_name || 'Delivery Provider';
                  providerPhone = providerData.phone || '';
                } else {
                  // Try to get from profiles table
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, phone')
                    .eq('user_id', providerId)
                    .single();
                  
                  if (profileData) {
                    providerName = profileData.full_name || 'Delivery Provider';
                    providerPhone = profileData.phone || '';
                  }
                }
              } catch (e) {
                console.log('⚠️ Could not fetch provider details, using defaults');
              }
              
              // Update the order in local state immediately
              console.log('✅ OrderManagement: Updating order with delivery provider info:', orderId);
              setOrders(prevOrders => prevOrders.map(order => {
                if (order.id === orderId) {
                  return {
                    ...order,
                    delivery_provider_id: providerId,
                    delivery_provider_name: purchaseOrder.delivery_provider_name || providerName,
                    delivery_provider_phone: purchaseOrder.delivery_provider_phone || providerPhone,
                    delivery_status: purchaseOrder.delivery_status || 'accepted',
                    delivery_assigned_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                }
                return order;
              }));
              
              // Show toast notification
              toast({
                title: '✅ Delivery Provider Accepted',
                description: `Delivery provider ${purchaseOrder.delivery_provider_name || providerName} accepted order ${purchaseOrder.po_number || ''}. Status updated.`,
              });
              
              // Also refresh in background to ensure consistency (but don't show loading)
              setTimeout(async () => {
                try {
                  await loadOrders();
                } catch (e) {
                  console.log('Background refresh failed:', e);
                }
              }, 2000);
              
            } catch (error) {
              console.error('❌ OrderManagement: Error handling delivery acceptance:', error);
              // Fallback: just refresh orders
              setTimeout(() => loadOrders(), 1000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 OrderManagement: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [supplierId]);
  
  // Polling disabled - Real-time subscriptions handle delivery provider updates
  // Polling was causing continuous loading state issues

  const loadOrders = async (forceFullLoad = false) => {
    // Use native fetch API (same as dashboard) for reliability
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      if (!forceFullLoad) setLoading(true);
      console.log('🔍 OrderManagement: Loading orders... supplierId prop:', supplierId);
      
      // Ensure Supabase has current session (so RPC auth.uid() is set)
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id ?? '';
      let accessToken = session?.access_token ?? '';
      if (!userId || !accessToken) {
        try {
          const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!userId) userId = parsed.user?.id || '';
            if (!accessToken) accessToken = parsed.access_token || '';
          }
        } catch (_) {}
      }
      if (!userId) userId = localStorage.getItem('user_id') || '';
      
      // Try to use prefetched data first (instant load) unless we're doing a full refresh (enriched from delivery_requests)
      const prefetchedOrders = !forceFullLoad ? getPrefetchedOrders(userId, 'supplier') : null;
      if (prefetchedOrders && prefetchedOrders.length > 0) {
        console.log('⚡ OrderManagement: Using prefetched orders:', prefetchedOrders.length);
        // Quick transform and display prefetched data immediately
        const quickOrders = transformOrdersQuick(prefetchedOrders);
        setOrders(quickOrders);
        setLoading(false);
        // Fetch full data with delivery_requests enrichment so "Delivery assigned" shows
        loadOrdersFresh(SUPABASE_URL, SUPABASE_ANON_KEY);
        return;
      }

      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      let purchaseOrders: any[] = [];

      // PRIMARY: RPC first – uses auth.uid() server-side, no client supplier ID needed
      try {
        const { data: rpcOrders, error: rpcErr } = await supabase.rpc('get_supplier_orders_for_current_user', { _limit: 500 });
        if (!rpcErr && rpcOrders != null) {
          const list = Array.isArray(rpcOrders) ? rpcOrders : [];
          if (list.length > 0) {
            purchaseOrders = list;
            console.log('✅ OrderManagement: Loaded', list.length, 'orders via get_supplier_orders_for_current_user RPC');
          }
        } else if (rpcErr) {
          console.warn('OrderManagement: RPC get_supplier_orders_for_current_user failed – run migration 20260420_get_supplier_orders_rpc.sql on Supabase:', rpcErr.message);
        }
      } catch (e) {
        console.warn('OrderManagement: RPC get_supplier_orders_for_current_user not available – run migration 20260420_get_supplier_orders_rpc.sql on Supabase');
      }

      // FALLBACK: resolve supplier IDs and fetch via client or REST
      if (purchaseOrders.length === 0) {
        const orderSupplierIds: string[] = [];
        const effectiveId = supplierId && supplierId.trim() !== '' ? supplierId : userId;
        if (effectiveId) orderSupplierIds.push(effectiveId);
        if (userId && !orderSupplierIds.includes(userId)) orderSupplierIds.push(userId);

        try {
          const { data: supplierRows, error: supplierError } = await supabase
            .from('suppliers')
            .select('id, user_id')
            .or(`user_id.eq.${effectiveId},id.eq.${effectiveId}`);
          if (!supplierError && supplierRows?.length) {
            supplierRows.forEach((s: any) => {
              if (s.id && !orderSupplierIds.includes(s.id)) orderSupplierIds.push(s.id);
              if (s.user_id && !orderSupplierIds.includes(s.user_id)) orderSupplierIds.push(s.user_id);
            });
          }
          if (orderSupplierIds.length <= 1) {
            const supplierResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?or=(user_id.eq.${effectiveId},id.eq.${effectiveId})&select=id,user_id`,
              { headers, cache: 'no-store' }
            );
            if (supplierResponse.ok) {
              const supplierData = await supplierResponse.json();
              const arr = Array.isArray(supplierData) ? supplierData : [];
              arr.forEach((s: any) => {
                if (s.id && !orderSupplierIds.includes(s.id)) orderSupplierIds.push(s.id);
                if (s.user_id && !orderSupplierIds.includes(s.user_id)) orderSupplierIds.push(s.user_id);
              });
            }
          }
        } catch (e) {
          console.log('Supplier lookup failed', e);
        }

        if (orderSupplierIds.length > 0) {
          const { data: poData, error: poError } = await supabase
            .from('purchase_orders')
            .select('*')
            .in('supplier_id', orderSupplierIds)
            .order('created_at', { ascending: false })
            .limit(500);
          if (!poError && poData != null) purchaseOrders = Array.isArray(poData) ? poData : [];
          if (purchaseOrders.length === 0) {
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=in.(${orderSupplierIds.join(',')})&select=*&order=created_at.desc&limit=500`,
              { headers, cache: 'no-store' }
            );
            if (res.ok) {
              const payload = await res.json();
              purchaseOrders = Array.isArray(payload) ? payload : (payload?.data && Array.isArray(payload.data) ? payload.data : []);
            }
          }
        }
      }

      console.log(`✅ OrderManagement: Found ${purchaseOrders.length} orders`);

      if (purchaseOrders.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch buyer profiles
      const buyerIds = [...new Set(purchaseOrders.map((po: any) => po.buyer_id).filter(Boolean))];
      let buyerProfiles: Record<string, any> = {};
      
      if (buyerIds.length > 0) {
        try {
          const profilesResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${buyerIds.join(',')})&select=user_id,full_name,email,phone`,
            { headers, cache: 'no-store' }
          );
          if (profilesResponse.ok) {
            const profiles = await profilesResponse.json();
            profiles.forEach((p: any) => { buyerProfiles[p.user_id] = p; });
          }
        } catch (e) {
          console.log('Profiles fetch failed');
        }
      }

      // Enrich from delivery_requests so provider-accepted status shows even if purchase_orders wasn't updated
      const orderIds = purchaseOrders.map((po: any) => po.id);
      const orderIdsParam = orderIds.join(',');
      const deliveryRequestsByPO = new Map<
        string,
        { provider_id: string; status: string; updated_at?: string; created_at?: string }
      >();
      try {
        const drResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=in.(${orderIdsParam})&select=purchase_order_id,provider_id,status,updated_at,created_at`,
          { headers, cache: 'no-store' }
        );
        if (drResponse.ok) {
          const drList = await drResponse.json();
          const rank = (s: string) => {
            const x = (s || '').toLowerCase();
            if (['delivered', 'completed'].includes(x)) return 5;
            if (['in_transit', 'picked_up'].includes(x)) return 4;
            if (['accepted', 'assigned'].includes(x)) return 3;
            if (['pending', 'requested', 'confirmed', 'active'].includes(x)) return 2;
            return 1;
          };
          (drList || []).forEach((dr: any) => {
            if (!dr.purchase_order_id || !dr.provider_id) return;
            const status = dr.status || 'accepted';
            const row = {
              provider_id: dr.provider_id,
              status,
              updated_at: dr.updated_at,
              created_at: dr.created_at,
            };
            const existing = deliveryRequestsByPO.get(dr.purchase_order_id);
            if (!existing) {
              deliveryRequestsByPO.set(dr.purchase_order_id, row);
              return;
            }
            const rNew = rank(status);
            const rEx = rank(existing.status);
            if (rNew > rEx) {
              deliveryRequestsByPO.set(dr.purchase_order_id, row);
            } else if (rNew === rEx) {
              const tNew = new Date(dr.updated_at || dr.created_at || 0).getTime();
              const tEx = new Date(existing.updated_at || existing.created_at || 0).getTime();
              if (tNew >= tEx) deliveryRequestsByPO.set(dr.purchase_order_id, row);
            }
          });
          if (deliveryRequestsByPO.size > 0) {
            console.log('✅ OrderManagement: Enriched orders from delivery_requests:', deliveryRequestsByPO.size, 'with accepted provider');
          }
        }
      } catch (e) {
        console.log('Delivery requests enrichment failed');
      }

      // Per–purchase-order provider display (server join: PO + DR + delivery_providers + profile + auth metadata)
      const providerDisplayByPoId = new Map<
        string,
        { delivery_provider_id?: string; provider_name?: string; phone?: string }
      >();
      try {
        if (orderIds.length > 0) {
          try {
            const { data: dispRows, error: dispErr } = await supabase.rpc(
              'get_delivery_provider_display_for_supplier_orders',
              { p_po_ids: orderIds }
            );
            if (dispErr) {
              console.warn('OrderManagement: get_delivery_provider_display_for_supplier_orders:', dispErr.message);
            }
            (dispRows || []).forEach((row: any) => {
              if (row?.purchase_order_id) {
                providerDisplayByPoId.set(row.purchase_order_id, {
                  delivery_provider_id: row.delivery_provider_id,
                  provider_name: row.provider_name,
                  phone: row.phone,
                });
              }
            });
          } catch (rpcEx) {
            console.warn('OrderManagement: provider display RPC threw (orders still load):', rpcEx);
          }
        }
      } catch (e) {
        console.warn('OrderManagement: provider display setup failed', e);
      }

      const providerIdsToResolve = new Set<string>();
      purchaseOrders.forEach((po: any) => {
        if (po.delivery_provider_id) providerIdsToResolve.add(po.delivery_provider_id);
        const dr = deliveryRequestsByPO.get(po.id);
        if (dr?.provider_id) providerIdsToResolve.add(dr.provider_id);
      });
      // RPC may resolve a canonical delivery_providers.id different from PO/DR raw values
      providerDisplayByPoId.forEach((row) => {
        if (row.delivery_provider_id) providerIdsToResolve.add(row.delivery_provider_id);
      });
      let providerNames: Record<string, string> = {};
      let providerPhones: Record<string, string> = {};
      if (providerIdsToResolve.size > 0) {
        try {
          const ids = Array.from(providerIdsToResolve);
          // 1) RPC first — SECURITY DEFINER; includes delivery_requests + profile fallback (migration 20260431+)
          try {
            const { data: rpcRows, error: rpcErr } = await supabase.rpc(
              'get_delivery_provider_names_for_supplier',
              { provider_ids: ids }
            );
            if (rpcErr) {
              console.warn('OrderManagement: get_delivery_provider_names_for_supplier:', rpcErr.message);
            }
            if (Array.isArray(rpcRows) && rpcRows.length > 0) {
              rpcRows.forEach((row: unknown) => {
                const r = row as { id?: string; user_id?: string; provider_name?: string; phone?: string };
                if (r?.id) {
                  if (r.provider_name && r.provider_name !== 'Delivery Provider') {
                    providerNames[r.id] = r.provider_name;
                    if (r.user_id) providerNames[r.user_id] = r.provider_name;
                  }
                  if (r.phone) {
                    providerPhones[r.id] = r.phone;
                    if (r.user_id) providerPhones[r.user_id] = r.phone;
                  }
                }
              });
            }
          } catch (_) {
            // RPC may not exist yet
          }
          // 2) REST: by delivery_providers.id OR user_id (PO/DR often store auth user_id)
          const idParam = ids.join(',');
          const fromProvidersId = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_providers?id=in.(${idParam})&select=id,provider_name,phone,user_id`,
            { headers, cache: 'no-store' }
          );
          const fromProvidersUser = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_providers?user_id=in.(${idParam})&select=id,provider_name,phone,user_id`,
            { headers, cache: 'no-store' }
          );
          const rowsByDpId = new Map<string, any>();
          const pushRows = (list: any[]) => {
            (list || []).forEach((p: any) => {
              if (p?.id) rowsByDpId.set(p.id, p);
            });
          };
          if (fromProvidersId.ok) pushRows(await fromProvidersId.json());
          if (fromProvidersUser.ok) pushRows(await fromProvidersUser.json());
          const arr = Array.from(rowsByDpId.values());
          if (arr.length > 0) {
            const userIdsForProfiles = new Set<string>();
            arr.forEach((p: any) => {
              if (p?.user_id) userIdsForProfiles.add(p.user_id);
            });
            let profilesByUserId: Record<string, { full_name?: string; phone?: string; email?: string }> = {};
            if (userIdsForProfiles.size > 0) {
              const uidList = Array.from(userIdsForProfiles).join(',');
              const profRes = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${uidList})&select=user_id,full_name,phone,email`,
                { headers, cache: 'no-store' }
              );
              if (profRes.ok) {
                const plist = await profRes.json();
                (plist || []).forEach((pr: any) => {
                  if (pr.user_id) profilesByUserId[pr.user_id] = pr;
                });
              }
            }
            arr.forEach((p: any) => {
              if (!p.id) return;
              const prof = p.user_id ? profilesByUserId[p.user_id] : undefined;
              const emailLocal =
                prof?.email && String(prof.email).includes('@')
                  ? String(prof.email).split('@')[0].trim()
                  : '';
              const nm =
                (p.provider_name && String(p.provider_name).trim()) ||
                (prof?.full_name && String(prof.full_name).trim()) ||
                emailLocal ||
                '';
              const ph =
                (p.phone && String(p.phone).trim()) ||
                (prof?.phone && String(prof.phone).trim()) ||
                '';
              const bad = (s: string) => !s || s === 'Delivery Provider';
              if (nm && (!providerNames[p.id] || bad(providerNames[p.id]))) {
                providerNames[p.id] = nm;
                if (p.user_id) providerNames[p.user_id] = nm;
              }
              if (ph) {
                if (!providerPhones[p.id]) providerPhones[p.id] = ph;
                if (p.user_id && !providerPhones[p.user_id]) providerPhones[p.user_id] = ph;
              }
            });
          }
        } catch (e) {
          console.log('Provider names fetch failed');
        }
      }

      // Map orders to UI format (use delivery_requests to fill provider when PO missing it)
      let realOrders: Order[];
      try {
        realOrders = purchaseOrders.map((po: any, index: number) => {
        const buyer = buyerProfiles[po.buyer_id] || {};
        const items = Array.isArray(po.items) ? po.items : [];
        // Determine if this is a quote request or an order
        // Quote requests: pending quotes, quoted, or quote-related statuses
        // Orders: quote_accepted and beyond (order_created, awaiting_delivery_request, etc.)
        const isQuoteRequest = po.po_number?.startsWith('QR-') || 
          (po.status === 'pending' && !po.quote_accepted_at) || 
          po.status === 'quoted' ||
          po.status === 'quote_created' ||
          po.status === 'quote_received_by_supplier' ||
          po.status === 'quote_responded' ||
          po.status === 'quote_revised' ||
          po.status === 'quote_viewed_by_builder' ||
          po.status === 'quote_rejected';
        
        const dr = deliveryRequestsByPO.get(po.id);
        const disp = providerDisplayByPoId.get(po.id);
        let resolvedProviderId = po.delivery_provider_id || dr?.provider_id;
        if (disp?.delivery_provider_id) resolvedProviderId = disp.delivery_provider_id;
        const resolvedStatus = po.delivery_status || (dr?.status && ['accepted', 'assigned', 'picked_up', 'in_transit', 'delivered'].includes(dr.status) ? dr.status : undefined);
        let resolvedProviderPhone =
          disp?.phone ||
          po.delivery_provider_phone ||
          (resolvedProviderId ? providerPhones[resolvedProviderId] : undefined);
        const poProviderName =
          po.delivery_provider_name && po.delivery_provider_name !== 'Delivery Provider'
            ? po.delivery_provider_name
            : undefined;
        const dispName =
          disp?.provider_name && disp.provider_name !== 'Delivery Provider'
            ? disp.provider_name
            : undefined;
        const resolvedProviderName =
          dispName ||
          poProviderName ||
          (resolvedProviderId ? providerNames[resolvedProviderId] : undefined) ||
          (resolvedProviderPhone ? `Driver · ${resolvedProviderPhone}` : undefined) ||
          (resolvedProviderId ? 'Assigned driver' : undefined);

        return {
          id: po.id,
          order_number: po.po_number || `ORD-${String(index + 1).padStart(4, '0')}`,
          customer_name: buyer.full_name || po.project_name || 'Customer',
          customer_email: buyer.email || '',
          customer_phone: buyer.phone || '',
          delivery_address: po.delivery_address || '',
          items: items.map((item: any) => ({
            name: item.material_name || item.name || 'Item',
            quantity: item.quantity || 1,
            price: item.unit_price || item.price || 0
          })),
          total_amount: po.total_amount || 0,
          status: (po.status || 'pending') as Order['status'],
          payment_status: 'paid' as const,
          notes: po.special_instructions || po.delivery_notes || '',
          created_at: po.created_at,
          updated_at: po.updated_at || po.created_at,
          order_type: isQuoteRequest ? 'quote_request' : 'direct_purchase',
          buyer_role: po.buyer_role || 'unknown',
          delivery_provider_id: resolvedProviderId || undefined,
          delivery_provider_name: resolvedProviderName || undefined,
          delivery_provider_phone: resolvedProviderPhone || undefined,
          delivery_vehicle_info: po.delivery_vehicle_info || undefined,
          delivery_status: resolvedStatus || undefined,
          delivery_assigned_at: po.delivery_assigned_at || undefined,
          delivery_accepted_at: po.delivery_accepted_at || undefined,
          estimated_delivery_time: po.estimated_delivery_time || undefined,
          delivery_required: po.delivery_required || false
        };
      });
      } catch (mapErr) {
        console.error('OrderManagement: Error mapping orders, using minimal transform:', mapErr);
        realOrders = purchaseOrders.map((po: any, index: number) => {
          const buyer = buyerProfiles[po.buyer_id] || {};
          const items = Array.isArray(po.items) ? po.items : [];
          return {
            id: po.id,
            order_number: po.po_number || `ORD-${String(index + 1).padStart(4, '0')}`,
            customer_name: buyer?.full_name || po.project_name || 'Customer',
            customer_email: buyer?.email || '',
            customer_phone: buyer?.phone || '',
            delivery_address: po.delivery_address || '',
            items: items.map((item: any) => ({ name: item.material_name || item.name || 'Item', quantity: item.quantity || 1, price: item.unit_price || item.price || 0 })),
            total_amount: po.total_amount || 0,
            status: (po.status || 'pending') as Order['status'],
            payment_status: 'paid' as const,
            notes: po.special_instructions || po.delivery_notes || '',
            created_at: po.created_at,
            updated_at: po.updated_at || po.created_at,
            order_type: (po.po_number?.startsWith('QR-') ? 'quote_request' : 'direct_purchase') as Order['order_type'],
            buyer_role: po.buyer_role || 'unknown',
            delivery_provider_id: po.delivery_provider_id,
            delivery_provider_name: po.delivery_provider_name,
            delivery_provider_phone: po.delivery_provider_phone,
            delivery_vehicle_info: po.delivery_vehicle_info,
            delivery_status: po.delivery_status,
            delivery_assigned_at: po.delivery_assigned_at,
            delivery_accepted_at: po.delivery_accepted_at,
            estimated_delivery_time: po.estimated_delivery_time,
            delivery_required: po.delivery_required || false
          };
        });
      }

      setOrders(prev => (realOrders.length > 0 ? realOrders : prev));
      console.log(`✅ OrderManagement: Loaded ${realOrders.length} orders successfully`);

    } catch (error) {
      console.error('Error loading orders:', error);
      // Never clear orders on error if we already have orders (e.g. from prefetch); avoids "disappearing" after background refresh
      setOrders(prev => (prev.length > 0 ? prev : []));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrderId(orderId); // Track which specific order is being updated
    try {
      // Update in database
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${getStatusConfig(newStatus).label}`
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    } finally {
      setUpdatingOrderId(null); // Clear the updating state
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const flow: Record<Order['status'], Order['status'] | null> = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null
    };
    return flow[currentStatus];
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: orders.filter(o => o.status === 'shipped' || o.status === 'dispatched').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0),
    // New stats for order types
    directPurchases: orders.filter(o => o.order_type === 'direct_purchase').length,
    quoteRequests: orders.filter(o => o.order_type === 'quote_request').length,
    newDirectOrders: orders.filter(o => o.order_type === 'direct_purchase' && o.status === 'confirmed').length
  };

  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER ORDERS TABLE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderOrdersTable = (ordersList: Order[], tabType: 'not_dispatched' | 'shipped' | 'delivered') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      );
    }

    if (ordersList.length === 0) {
      const emptyMessages = {
        not_dispatched: {
          title: 'No orders awaiting dispatch',
          description: 'New orders will appear here when customers place them'
        },
        shipped: {
          title: 'No shipped orders',
          description: 'Orders will appear here after you dispatch them using the QR scanner'
        },
        delivered: {
          title: 'No delivered orders yet',
          description: 'Orders will appear here after delivery is confirmed at the construction site'
        }
      };

      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className={textColor}>{emptyMessages[tabType].title}</p>
          <p className={mutedText}>{emptyMessages[tabType].description}</p>
        </div>
      );
    }

    // Delivery column: only provider display name + phone (order # stays in its own column)
    const getDeliveryStatusBadge = (order: Order) => {
      const requiresDelivery = order.delivery_required !== false;

      const nameLine = (): string => {
        const n = order.delivery_provider_name?.trim();
        const lower = (n || '').toLowerCase();
        if (!n) {
          return order.delivery_provider_id ? 'Assigned driver' : '';
        }
        if (lower === 'delivery provider' || lower === 'provider assigned') {
          return order.delivery_provider_id ? 'Assigned driver' : '';
        }
        if (lower === 'assigned driver') return n;
        if (/^driver\s*·\s*/i.test(n)) return '';
        return n;
      };

      const phoneLine = (): string => order.delivery_provider_phone?.trim() || '';

      const hasAssignedProvider =
        !!order.delivery_provider_id ||
        !!nameLine() ||
        !!phoneLine();

      if (!hasAssignedProvider) {
        if (requiresDelivery) {
          return (
            <div className="text-xs max-w-[160px]">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                ⏳ Awaiting Delivery Provider
              </Badge>
            </div>
          );
        }
        return (
          <div className="text-xs">
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
              📦 Pickup Only
            </Badge>
          </div>
        );
      }

      const nm = nameLine();
      const ph = phoneLine();

      return (
        <div
          className={`text-xs p-2 rounded-md border min-w-[130px] max-w-[200px] ${
            isDarkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <p className={`font-semibold text-sm leading-snug truncate ${textColor}`} title={nm || undefined}>
            {nm || '—'}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${mutedText}`}>
            <span aria-hidden>📞</span>
            <span className="font-mono truncate" title={ph || undefined}>
              {ph || '—'}
            </span>
          </p>
        </div>
      );
    };

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersList.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const nextStatus = getNextStatus(order.status);
              
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className={`text-xs ${mutedText}`}>{order.customer_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={order.order_type === 'direct_purchase' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : (order.status === 'confirmed' || (order.status === 'pending' && order.order_type === 'quote_request'))
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {order.order_type === 'direct_purchase' 
                        ? '🛒 Direct' 
                        : (order.status === 'confirmed' || (order.status === 'pending' && order.order_type === 'quote_request'))
                        ? '📦 Order'
                        : '📋 Quote'}
                    </Badge>
                    {order.buyer_role && (
                      <p className={`text-[10px] mt-1 ${mutedText}`}>
                        {order.buyer_role === 'private_client' ? 'Private Client' : 
                         order.buyer_role === 'professional_builder' ? 'Pro Builder' : order.buyer_role}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{order.items.length} item(s)</p>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>
                    {getDeliveryStatusBadge(order)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {/* When delivery provider accepts, show "Confirmed" instead of "Pending" */}
                      {order.delivery_provider_id && (order.status === 'pending' || order.status === 'quote_accepted' || order.status === 'order_created' || order.status === 'awaiting_delivery_request') ? (
                        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      )}
                      {/* Show if builder accepted the order */}
                      {(order.status === 'confirmed' || (order.status === 'pending' && order.order_type === 'quote_request')) && (
                        <p className="text-[10px] text-green-600 mt-1">✓ Builder Accepted</p>
                      )}
                      {/* Show if delivery was requested */}
                      {order.delivery_required && !order.delivery_provider_id && (
                        <p className="text-[10px] text-blue-600 mt-1">📦 Delivery Requested</p>
                      )}
                      {/* Show when delivery provider accepted */}
                      {order.delivery_provider_id && order.delivery_status === 'accepted' && (
                        <p className="text-[10px] text-green-600 mt-1">✓ Delivery Provider Accepted</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`text-sm ${mutedText}`}>
                    {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* For Direct Purchase orders (confirmed), show Dispatch button */}
                      {order.order_type === 'direct_purchase' && order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (onNavigateToDispatch) {
                              onNavigateToDispatch();
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          🚚 Dispatch
                        </Button>
                      )}
                      {/* For Quote Requests (pending), show Confirm/Reject */}
                      {order.order_type === 'quote_request' && order.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            disabled={updatingOrderId === order.id}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            {updatingOrderId === order.id ? '...' : 'Accept'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            disabled={updatingOrderId === order.id}
                            className="text-xs"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {/* Processing orders - show Ship button */}
                      {order.status === 'processing' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                          disabled={updatingOrderId === order.id}
                          className="bg-purple-600 hover:bg-purple-700 text-xs"
                        >
                          {updatingOrderId === order.id ? '...' : '🚚 Ship'}
                        </Button>
                      )}
                      {/* Shipped orders - show Mark Delivered button */}
                      {order.status === 'shipped' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          disabled={updatingOrderId === order.id}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          {updatingOrderId === order.id ? '...' : '✅ Delivered'}
                        </Button>
                      )}
                      {/* Delivered orders - show completion badge */}
                      {order.status === 'delivered' && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          ✓ Complete
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // GROUP ORDERS BY DISPATCH STATUS
  // ═══════════════════════════════════════════════════════════════════════════════
  // Not Yet Dispatched: pending, confirmed, processing
  // Shipped: shipped (dispatched but not delivered)
  // Delivered: delivered (confirmed arrival at site)
  // Not Dispatched: All orders that haven't been shipped yet
  // This includes accepted quotes converted to orders (quote_accepted, order_created, awaiting_delivery_request, etc.)
  // IMPORTANT: Include orders with delivery_provider_id - they still need to be dispatched by supplier
  const notDispatchedOrders = filteredOrders.filter(o => {
    // Exclude shipped, dispatched, and delivered
    if (o.status === 'shipped' || o.status === 'dispatched' || o.status === 'delivered') return false;
    
    // Include all order statuses from quote acceptance onwards
    // This includes orders with delivery_provider_id (they still need supplier dispatch)
    const validStatuses = [
      'quote_accepted',
      'order_created',
      'awaiting_delivery_request',
      'delivery_requested',
      'awaiting_delivery_provider',
      'delivery_assigned',
      'ready_for_dispatch',
      'dispatched',
      'in_transit',
      'confirmed',
      'processing',
      'pending',
      'cancelled'
    ];
    
    return validStatuses.includes(o.status);
  });
  // Shipped orders: includes both 'shipped' and 'dispatched' statuses (they mean the same thing)
  const shippedOrders = filteredOrders.filter(o => o.status === 'shipped' || o.status === 'dispatched');
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

  return (
    <div className="space-y-4">
      {/* Order Status Tabs - Clean and Simple */}
      <Tabs value={activeOrderTab} onValueChange={(v) => setActiveOrderTab(v as any)} className="w-full">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="direct_purchase">🛒 Direct</SelectItem>
              <SelectItem value="quote_request">📋 Quote</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => loadOrders(true)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        {/* Tab Buttons */}
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger 
            value="not_dispatched" 
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Not Dispatched ({notDispatchedOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="shipped" 
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <Truck className="h-4 w-4 mr-2" />
            Shipped ({shippedOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="delivered" 
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Delivered ({deliveredOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Not Dispatched Orders Tab */}
        <TabsContent value="not_dispatched">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(notDispatchedOrders, 'not_dispatched')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipped Orders Tab */}
        <TabsContent value="shipped">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(shippedOrders, 'shipped')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivered Orders Tab */}
        <TabsContent value="delivered">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(deliveredOrders, 'delivered')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <div className="flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={selectedOrder.order_type === 'direct_purchase' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {selectedOrder.order_type === 'direct_purchase' ? '🛒 Direct Purchase' : '📋 Quote Request'}
                    </Badge>
                    <Badge className={getStatusConfig(selectedOrder.status).color}>
                      {getStatusConfig(selectedOrder.status).label}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Placed on {format(new Date(selectedOrder.created_at), 'MMMM dd, yyyy HH:mm')}
                  {selectedOrder.buyer_role && (
                    <span className="ml-2">
                      by {selectedOrder.buyer_role === 'private_client' ? 'Private Client' : 
                          selectedOrder.buyer_role === 'professional_builder' ? 'Professional Builder' : selectedOrder.buyer_role}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4" />
                        {selectedOrder.customer_email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        {selectedOrder.customer_phone}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Delivery Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                        <span>{selectedOrder.delivery_address}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.quantity * item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            {formatCurrency(selectedOrder.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Delivery Provider Info */}
                <Card className={selectedOrder.delivery_provider_name ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.delivery_provider_name ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-800">
                              🚚 To be delivered by: {selectedOrder.delivery_provider_name}
                            </p>
                            {selectedOrder.delivery_provider_phone && (
                              <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {selectedOrder.delivery_provider_phone}
                              </p>
                            )}
                            {selectedOrder.delivery_vehicle_info && (
                              <p className="text-xs text-blue-500 mt-1">
                                Vehicle: {selectedOrder.delivery_vehicle_info}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={
                              selectedOrder.delivery_status === 'accepted' 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : selectedOrder.delivery_status === 'in_transit'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                : 'bg-blue-100 text-blue-700 border-blue-300'
                            }
                          >
                            {selectedOrder.delivery_status === 'accepted' && '✅ Delivery Confirmed'}
                            {selectedOrder.delivery_status === 'assigned' && '📋 Assigned'}
                            {selectedOrder.delivery_status === 'picked_up' && '📦 Picked Up'}
                            {selectedOrder.delivery_status === 'in_transit' && '🚚 In Transit'}
                            {selectedOrder.delivery_status === 'delivered' && '✓ Delivered'}
                            {!selectedOrder.delivery_status && '📋 Assigned'}
                          </Badge>
                        </div>
                        {selectedOrder.estimated_delivery_time && (
                          <p className="text-sm text-gray-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Estimated delivery: {format(new Date(selectedOrder.estimated_delivery_time), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {selectedOrder.delivery_accepted_at && (
                          <p className="text-xs text-green-600">
                            ✓ Delivery Confirmed on {format(new Date(selectedOrder.delivery_accepted_at), 'MMM dd, HH:mm')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No delivery provider assigned yet</p>
                        <p className="text-gray-400 text-xs mt-1">
                          A delivery provider will be assigned once the order is processed
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedOrder.notes && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Customer Notes</p>
                          <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button 
                      variant="destructive"
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setSelectedOrder(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {updatingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  )}
                  {getNextStatus(selectedOrder.status) && (
                    <Button
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => {
                        const next = getNextStatus(selectedOrder.status);
                        if (next) updateOrderStatus(selectedOrder.id, next);
                      }}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {updatingOrderId === selectedOrder.id ? 'Updating...' : (
                        <>
                          {getNextStatus(selectedOrder.status) === 'confirmed' && 'Confirm Order'}
                          {getNextStatus(selectedOrder.status) === 'processing' && 'Go to Dispatch'}
                          {getNextStatus(selectedOrder.status) === 'shipped' && 'Mark as Shipped'}
                          {getNextStatus(selectedOrder.status) === 'delivered' && 'Mark as Delivered'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
