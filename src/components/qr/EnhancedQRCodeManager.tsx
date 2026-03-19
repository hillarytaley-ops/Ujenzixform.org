import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { QrCode, Package, Download, DownloadCloud, Maximize2, Truck, Clock, CheckCircle, RefreshCw, User, Mail, Phone, AlertCircle, ShieldCheck, ShieldX, Printer, CheckSquare, Square, Scan, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCodeLib from 'qrcode';
import { getPrefetchedQRCodes } from '@/services/dataPrefetch';

interface MaterialItem {
  id: string;
  qr_code: string;
  item_sequence: number;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
  purchase_order_id: string;
  // New fields for client identity
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  item_unit_price?: number;
  item_total_price?: number;
  dispatch_scanned?: boolean;
  dispatch_scanned_at?: string;
  receive_scanned?: boolean;
  receive_scanned_at?: string;
  is_invalidated?: boolean;  // True when both dispatch and receive scans are complete
  invalidated_at?: string;   // Timestamp when QR was invalidated
}

interface ClientGroup {
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_items: number;
  pending_items: number;
  dispatched_items: number;
  received_items: number;
  invalid_items: number;  // Items that have been fully scanned (dispatch + receive)
  items: MaterialItem[];
}

interface OrderGroup {
  order_id: string;
  order_number?: string;  // Display-friendly order number (from purchase_orders.po_number) - optional to allow filtering
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_items: number;
  pending_items: number;
  dispatched_items: number;
  received_items: number;
  invalid_items: number;
  items: MaterialItem[];
  created_at: string;
  // Delivery provider information
  delivery_provider_id?: string;
  delivery_provider_name?: string;
  delivery_provider_phone?: string;
  delivery_status?: string;
  delivery_required?: boolean;
}

interface EnhancedQRCodeManagerProps {
  supplierId?: string; // Optional: pass supplier ID directly to skip lookup
}

export const EnhancedQRCodeManager: React.FC<EnhancedQRCodeManagerProps> = ({ supplierId: propSupplierId }) => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [dispatchedOrders, setDispatchedOrders] = useState<OrderGroup[]>([]); // Orders with dispatched items
  const [awaitingDispatchOrders, setAwaitingDispatchOrders] = useState<OrderGroup[]>([]); // Orders awaiting dispatch (renamed from unconfirmed)
  const [inTransitOrders, setInTransitOrders] = useState<OrderGroup[]>([]); // Orders in transit
  const [deliveredOrders, setDeliveredOrders] = useState<OrderGroup[]>([]); // Orders delivered
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'awaiting_dispatch' | 'dispatched' | 'in_transit' | 'delivered' | 'all'>('awaiting_dispatch'); // Default to awaiting_dispatch for suppliers
  const [printingProgress, setPrintingProgress] = useState<{ orderId: string; current: number; total: number } | null>(null); // Track print progress
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(propSupplierId || null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all items for a client
  const selectAllClientItems = (clientGroup: ClientGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      clientGroup.items.forEach(item => newSet.add(item.id));
      return newSet;
    });
  };

  // Select all items for an order
  const selectAllOrderItems = (orderGroup: OrderGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      orderGroup.items.forEach(item => newSet.add(item.id));
      return newSet;
    });
  };

  // Deselect all items for an order
  const deselectAllOrderItems = (orderGroup: OrderGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      orderGroup.items.forEach(item => newSet.delete(item.id));
      return newSet;
    });
  };

  // Check if all order items are selected
  const areAllOrderItemsSelected = (orderGroup: OrderGroup) => {
    return orderGroup.items.every(item => selectedItems.has(item.id));
  };

  // Get selected items count for an order
  const getSelectedCountForOrder = (orderGroup: OrderGroup) => {
    return orderGroup.items.filter(item => selectedItems.has(item.id)).length;
  };

  // Deselect all items for a client
  const deselectAllClientItems = (clientGroup: ClientGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      clientGroup.items.forEach(item => newSet.delete(item.id));
      return newSet;
    });
  };

  // Check if all client items are selected
  const areAllClientItemsSelected = (clientGroup: ClientGroup) => {
    return clientGroup.items.every(item => selectedItems.has(item.id));
  };

  // Get selected items count for a client
  const getSelectedCountForClient = (clientGroup: ClientGroup) => {
    return clientGroup.items.filter(item => selectedItems.has(item.id)).length;
  };

  useEffect(() => {
    // Start loading immediately with fast path
    fastCheckAuthAndFetch();
    
    // Safety timeout - force loading to false after 8 seconds (reduced from 15)
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ QR Manager safety timeout - forcing loading false');
    }, 8000);
    
    // Delay real-time subscription setup to not block initial load
    let subscription: any = null;
    let purchaseOrdersSubscription: any = null;
    const subscriptionTimeout = setTimeout(() => {
      subscription = supabase
        .channel('qr-codes-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'material_items'
          },
          (payload) => {
            console.log('🔔 New QR code created:', payload.new);
            // Refresh the list when new QR codes are inserted
            fastCheckAuthAndFetch();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'material_items'
          },
          async (payload) => {
            console.log('🔄 QR code updated (receive/dispatch scan):', payload.new);
            const updatedItem = payload.new as MaterialItem;
            
            // CRITICAL: When an item is scanned, we need to refresh ALL items for that order
            // because the categorization depends on checking ALL items in the order
            // Just updating one item isn't enough - we need the full order context
            try {
              const stored = getUserFromStorage();
              const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
              const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
              
              const headers: Record<string, string> = {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
              };
              if (stored?.accessToken) {
                headers['Authorization'] = `Bearer ${stored.accessToken}`;
              }
              
              // Fetch ALL items for this order to get accurate receive_scanned status
              const orderId = updatedItem.purchase_order_id;
              if (orderId) {
                console.log('🔄 Refreshing ALL items for order:', orderId);
                const allItemsResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=eq.${orderId}&select=*`,
                  { headers, cache: 'no-store' }
                );
                
                if (allItemsResponse.ok) {
                  const allOrderItems = await allItemsResponse.json() as MaterialItem[];
                  console.log(`✅ Fetched ${allOrderItems.length} items for order ${orderId}`);
                  console.log('📊 Receive scanned status:', allOrderItems.map(i => ({ id: i.id, receive_scanned: i.receive_scanned })));
                  
                  // Update all items for this order in state
                  setItems(prev => {
                    const updated = prev.map(item => {
                      const freshItem = allOrderItems.find(fi => fi.id === item.id);
                      return freshItem || item;
                    });
                    
                    // Add any new items that weren't in the previous state
                    allOrderItems.forEach(freshItem => {
                      if (!updated.find(i => i.id === freshItem.id)) {
                        updated.push(freshItem);
                      }
                    });
                    
                    // CRITICAL: Re-run categorization with fresh data
                    console.log('🔄 Re-categorizing orders with fresh data...');
                    groupItemsByOrder(updated);
                    return updated;
                  });
                  
                  // ALSO trigger a full refresh in the background to ensure everything is up to date
                  setTimeout(() => {
                    console.log('🔄 Triggering full refresh after scan...');
                    fastCheckAuthAndFetch();
                  }, 2000);
                  return;
                }
              }
              
              // Fallback: Fetch just the updated item
              const itemResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/material_items?id=eq.${updatedItem.id}&select=*&limit=1`,
                { headers, cache: 'no-store' }
              );
              
              if (itemResponse.ok) {
                const items = await itemResponse.json();
                if (items && items.length > 0) {
                  const freshItem = items[0] as MaterialItem;
                  console.log('✅ Fetched fresh item data:', freshItem.id, 'receive_scanned:', freshItem.receive_scanned);
                  
                  setItems(prev => {
                    const updated = prev.map(item =>
                      item.id === freshItem.id ? freshItem : item
                    );
                    // CRITICAL: Re-run categorization so Dispatched/In Transit/Delivered tabs update
                    groupItemsByOrder(updated);
                    return updated;
                  });
                  return;
                }
              }
            } catch (error) {
              console.error('⚠️ Could not fetch fresh item data, using payload:', error);
            }
            
            // Final fallback: Use payload data if fetch fails
            setItems(prev => {
              const updated = prev.map(item =>
                item.id === updatedItem.id ? { ...item, ...updatedItem } : item
              );
              // CRITICAL: Re-run categorization so Dispatched/In Transit/Delivered tabs update
              groupItemsByOrder(updated);
              return updated;
            });
          }
        )
        .subscribe();
      
      // Also listen to purchase_orders for delivery provider updates AND status changes
      purchaseOrdersSubscription = supabase
        .channel('qr-purchase-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'purchase_orders'
          },
          async (payload) => {
            console.log('🚚 QR Manager: Purchase order updated:', {
              po_number: payload.new?.po_number,
              old_status: payload.old?.status,
              new_status: payload.new?.status,
              old_delivery_status: payload.old?.delivery_status,
              new_delivery_status: payload.new?.delivery_status
            });
            
            // CRITICAL: If status changed to 'delivered', refresh ALL data immediately
            if (payload.new?.status === 'delivered' && payload.old?.status !== 'delivered') {
              console.log('✅ Order delivered! Triggering full refresh...');
              setTimeout(() => {
                fastCheckAuthAndFetch();
              }, 500);
            }
            
            // Update order groups with delivery provider information
            if (payload.new?.id) {
              setOrderGroups(prevGroups => prevGroups.map(group => {
                if (group.order_id === payload.new.id) {
                  return {
                    ...group,
                    delivery_provider_id: payload.new.delivery_provider_id,
                    delivery_provider_name: payload.new.delivery_provider_name,
                    delivery_provider_phone: payload.new.delivery_provider_phone,
                    delivery_status: payload.new.delivery_status,
                    delivery_required: payload.new.delivery_required || false
                  };
                }
                return group;
              }));
              
              // Also update awaiting dispatch, dispatched, in transit, and delivered orders
              setAwaitingDispatchOrders(prev => prev.map(group => {
                if (group.order_id === payload.new.id) {
                  return {
                    ...group,
                    delivery_provider_id: payload.new.delivery_provider_id,
                    delivery_provider_name: payload.new.delivery_provider_name,
                    delivery_provider_phone: payload.new.delivery_provider_phone,
                    delivery_status: payload.new.delivery_status,
                    delivery_required: payload.new.delivery_required || false
                  };
                }
                return group;
              }));
              
              setDispatchedOrders(prev => prev.map(group => {
                if (group.order_id === payload.new.id) {
                  return {
                    ...group,
                    delivery_provider_id: payload.new.delivery_provider_id,
                    delivery_provider_name: payload.new.delivery_provider_name,
                    delivery_provider_phone: payload.new.delivery_provider_phone,
                    delivery_status: payload.new.delivery_status,
                    delivery_required: payload.new.delivery_required || false
                  };
                }
                return group;
              }));
              
              setInTransitOrders(prev => prev.map(group => {
                if (group.order_id === payload.new.id) {
                  return {
                    ...group,
                    delivery_provider_id: payload.new.delivery_provider_id,
                    delivery_provider_name: payload.new.delivery_provider_name,
                    delivery_provider_phone: payload.new.delivery_provider_phone,
                    delivery_status: payload.new.delivery_status,
                    delivery_required: payload.new.delivery_required || false
                  };
                }
                return group;
              }));
              
              setDeliveredOrders(prev => prev.map(group => {
                if (group.order_id === payload.new.id) {
                  return {
                    ...group,
                    delivery_provider_id: payload.new.delivery_provider_id,
                    delivery_provider_name: payload.new.delivery_provider_name,
                    delivery_provider_phone: payload.new.delivery_provider_phone,
                    delivery_status: payload.new.delivery_status,
                    delivery_required: payload.new.delivery_required || false
                  };
                }
                return group;
              }));
            }
          }
        )
        .subscribe();
      
      console.log('📡 QR Manager: Real-time subscriptions active');
    }, 500); // Short delay to not block initial load
    
    return () => {
      clearTimeout(safetyTimeout);
      clearTimeout(subscriptionTimeout);
      if (subscription) {
        subscription.unsubscribe();
        console.log('📡 QR Manager: Real-time subscription closed');
      }
      if (purchaseOrdersSubscription) {
        purchaseOrdersSubscription.unsubscribe();
        console.log('📡 QR Manager: Purchase orders subscription closed');
      }
    };
  }, []);

  // Helper to get user ID from localStorage as fallback
  const getUserFromStorage = (): { id: string; accessToken: string } | null => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.user?.id && parsed.access_token) {
          return { id: parsed.user.id, accessToken: parsed.access_token };
        }
      }
    } catch (e) {
      console.warn('Could not get user from localStorage');
    }
    return null;
  };

  // Helper function to add timeout to any promise
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };

  // FAST PATH: Use localStorage first, skip slow Supabase auth calls
  const fastCheckAuthAndFetch = async () => {
    console.log('⚡ QR Manager: Fast path starting...');
    
    // Try localStorage first (instant)
    const stored = getUserFromStorage();
    const cachedRole = localStorage.getItem('user_role');
    const cachedSupplierId = localStorage.getItem('supplier_id');
    
    if (stored?.id && cachedRole) {
      console.log('⚡ QR Manager: Using cached auth - userId:', stored.id, 'role:', cachedRole);
      setUserRole(cachedRole);
      
      // For suppliers, try prefetched data first (instant)
      if (cachedRole === 'supplier' && (cachedSupplierId || propSupplierId)) {
        const supplierId = propSupplierId || cachedSupplierId || stored.id;
        setResolvedSupplierId(supplierId);
        console.log('⚡ QR Manager: Using cached supplierId:', supplierId);
        
        // Try prefetched QR codes first
        const prefetchedQRCodes = getPrefetchedQRCodes(supplierId);
        if (prefetchedQRCodes && prefetchedQRCodes.length > 0) {
          console.log('⚡ QR Manager: Using prefetched QR codes:', prefetchedQRCodes.length);
          setItems(prefetchedQRCodes);
          groupItemsByClient(prefetchedQRCodes);
          setLoading(false);
          // Fetch fresh data in background
          fetchMaterialItemsFast(cachedRole, stored.id, supplierId);
          return;
        }
        
        await fetchMaterialItemsFast(cachedRole, stored.id, supplierId);
        return;
      }
      
      // For admin, fetch directly
      if (cachedRole === 'admin') {
        await fetchMaterialItemsFast(cachedRole, stored.id, null);
        return;
      }
    }
    
    // Fallback to full auth check if no cache
    console.log('⚠️ QR Manager: No cache, using full auth check...');
    await checkAuthAndFetch();
  };

  // Fast fetch that skips supplier lookup if we already have the ID
  const fetchMaterialItemsFast = async (role: string, userId: string, supplierId: string | null) => {
    console.log('⚡ Fast fetch: role=', role, 'userId=', userId, 'supplierId=', supplierId);
    
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    const stored = getUserFromStorage();
    const headers: Record<string, string> = { 'apikey': apiKey };
    if (stored?.accessToken) {
      headers['Authorization'] = `Bearer ${stored.accessToken}`;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      let url: string;
      if (role === 'supplier' && supplierId) {
        url = `${SUPABASE_URL}/rest/v1/material_items?supplier_id=eq.${supplierId}&order=created_at.desc&limit=500`;
      } else if (role === 'admin') {
        url = `${SUPABASE_URL}/rest/v1/material_items?order=created_at.desc&limit=1000`;
      } else {
        console.log('⚠️ Unknown role for fast fetch:', role);
        setLoading(false);
        return;
      }
      
      console.log('⚡ Fast fetching from:', url);
      
      const response = await fetch(url, { 
        headers, 
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Fast fetch success:', data?.length || 0, 'items');
        setItems(data || []);
        groupItemsByClient(data || []);
      } else {
        console.log('❌ Fast fetch failed:', response.status);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('⏱️ Fast fetch timeout');
      } else {
        console.log('⚠️ Fast fetch error:', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAuthAndFetch = async () => {
    try {
      // Try to get user with timeout, fallback to localStorage
      let userId: string | null = null;
      
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser(), 3000);
        userId = user?.id || null;
        console.log('✅ QR Manager: Got user from auth:', userId);
      } catch {
        console.log('⚠️ QR Manager: Auth timeout, trying localStorage...');
        const stored = getUserFromStorage();
        if (stored) {
          userId = stored.id;
          console.log('📦 QR Manager: Got user from localStorage:', userId);
        }
      }
      
      if (!userId) {
        console.log('❌ QR Manager: No user found');
        setLoading(false);
        return;
      }

      // Get user role - check localStorage first (faster), then database
      let role: string | null = localStorage.getItem('user_role');
      console.log('🔑 QR Manager: Role from localStorage:', role);
      
      // If no role in localStorage, try database with timeout
      if (!role) {
        try {
          const { data: roleData } = await withTimeout(
            supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
            3000
          );
          role = roleData?.role || null;
          console.log('🔑 QR Manager: Role from database:', role);
        } catch {
          console.log('⚠️ QR Manager: Role lookup timeout');
        }
      }

      setUserRole(role);
      console.log('🔑 QR Manager: Final user role:', role);

      // Fetch material items based on role
      await fetchMaterialItems(role, userId);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialItems = async (role: string | null, userId: string) => {
    console.log('🔍 EnhancedQRCodeManager: Fetching items for role:', role, 'userId (auth.uid):', userId);
    console.log('🔍 Prop supplierId:', propSupplierId);
    
    if (role === 'supplier') {
      let supplierData: any = null;
      let finalSupplierId: string | null = propSupplierId || null;

      // If supplierId was passed as prop, use it directly
      if (propSupplierId) {
        console.log('✅ Using prop supplierId directly:', propSupplierId);
        try {
          const { data: supplierById } = await withTimeout(
            supabase.from('suppliers').select('id, company_name, user_id, email').eq('id', propSupplierId).maybeSingle(),
            3000
          );
          if (supplierById) {
            supplierData = supplierById;
            finalSupplierId = supplierById.id;
          }
        } catch {
          console.log('⚠️ Supplier lookup by prop ID timeout');
        }
      }

      // If no prop, look up via profile chain
      if (!supplierData) {
        try {
          // Step 1: Get profile.id for this auth user
          const { data: profileData } = await withTimeout(
            supabase.from('profiles').select('id, email').eq('user_id', userId).maybeSingle(),
            3000
          );
          console.log('📋 Profile lookup by auth.uid:', profileData);

          if (profileData) {
            // Step 2: Find supplier by profile.id
            const { data: supplierByProfile } = await withTimeout(
              supabase.from('suppliers').select('id, company_name, user_id, email').eq('user_id', profileData.id).maybeSingle(),
              3000
            );
            console.log('📦 Supplier lookup by profile.id:', supplierByProfile);
            if (supplierByProfile) {
              supplierData = supplierByProfile;
              finalSupplierId = supplierByProfile.id;
            }
          }
        } catch {
          console.log('⚠️ Profile/supplier lookup timeout');
        }
      }

      // Fallback: Try direct user_id match
      if (!supplierData) {
        try {
          const { data: supplierByUserId } = await withTimeout(
            supabase.from('suppliers').select('id, company_name, user_id, email').eq('user_id', userId).maybeSingle(),
            3000
          );
          console.log('📦 Supplier lookup by auth.uid directly:', supplierByUserId);
          if (supplierByUserId) {
            supplierData = supplierByUserId;
            finalSupplierId = supplierByUserId.id;
          }
        } catch {
          console.log('⚠️ Direct user_id lookup timeout');
        }
      }

      // Final fallback: Use userId as supplier ID (common pattern)
      if (!finalSupplierId) {
        console.log('📦 Using userId as supplier ID fallback:', userId);
        finalSupplierId = userId;
      }
      
      // Store the resolved supplier ID (in state and localStorage for faster future loads)
      setResolvedSupplierId(finalSupplierId);
      if (finalSupplierId) {
        localStorage.setItem('supplier_id', finalSupplierId);
      }

      console.log('✅ Final supplier ID for QR query:', finalSupplierId);
      
      // Fetch material items using native fetch with auth for RLS
      try {
        const stored = getUserFromStorage();
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        const headers: Record<string, string> = { 'apikey': apiKey };
        if (stored?.accessToken) {
          headers['Authorization'] = `Bearer ${stored.accessToken}`;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/material_items?supplier_id=eq.${finalSupplierId}&order=created_at.desc&limit=1000`,
          { headers, signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🏷️ Material items found:', data?.length || 0);
          setItems(data || []);
          groupItemsByClient(data || []);
        } else {
          console.log('❌ Material items fetch failed:', response.status);
        }
      } catch (e: any) {
        console.log('⚠️ Material items fetch error:', e.message);
      }
    } else if (role === 'admin') {
      // Admin sees all items - use native fetch
      console.log('👑 Admin detected - fetching ALL material items...');
      try {
        const stored = getUserFromStorage();
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        const headers: Record<string, string> = { 'apikey': apiKey };
        if (stored?.accessToken) {
          headers['Authorization'] = `Bearer ${stored.accessToken}`;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for admin
        
        // Fetch all material items with limit to prevent overload
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/material_items?order=created_at.desc&limit=2000`,
          { headers, signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('👑 Admin: Material items found:', data?.length || 0);
          if (data && data.length > 0) {
            console.log('👑 Admin: Sample item:', data[0]?.qr_code, data[0]?.material_type);
          }
          setItems(data || []);
          groupItemsByClient(data || []);
        } else {
          console.log('❌ Admin material items fetch failed:', response.status);
        }
      } catch (e: any) {
        console.log('⚠️ Admin material items fetch error:', e.message);
      }
    } else {
      // Unknown role - show empty state
      console.log('⚠️ Unknown role:', role, '- showing empty state');
      setItems([]);
      setClientGroups([]);
    }
  };

  // Group items by client/buyer - sorted by most recent first
  const groupItemsByClient = (materialItems: MaterialItem[]) => {
    const groups: Record<string, ClientGroup & { latestDate: string }> = {};
    
    materialItems.forEach(item => {
      const buyerId = item.buyer_id || 'unknown';
      
      if (!groups[buyerId]) {
        groups[buyerId] = {
          buyer_id: buyerId,
          buyer_name: item.buyer_name || 'Unknown Client',
          buyer_email: item.buyer_email || '',
          buyer_phone: item.buyer_phone || '',
          total_items: 0,
          pending_items: 0,
          dispatched_items: 0,
          received_items: 0,
          invalid_items: 0,
          items: [],
          latestDate: item.created_at || ''
        };
      }
      
      groups[buyerId].total_items++;
      groups[buyerId].items.push(item);
      
      // Track the most recent item date for this client
      if (item.created_at && item.created_at > groups[buyerId].latestDate) {
        groups[buyerId].latestDate = item.created_at;
      }
      
      // Check if item is invalid (both dispatch and receive scanned)
      const isFullyScanned = item.dispatch_scanned && item.receive_scanned;
      const isInvalidated = item.is_invalidated || isFullyScanned;
      
      if (isInvalidated) {
        groups[buyerId].invalid_items++;
      } else if (item.status === 'pending') {
        groups[buyerId].pending_items++;
      } else if (item.status === 'dispatched' || item.status === 'in_transit') {
        groups[buyerId].dispatched_items++;
      } else if (item.status === 'received' || item.status === 'verified') {
        groups[buyerId].received_items++;
      }
    });
    
    // Sort groups by most recent activity (newest first), not by total items
    const sortedGroups = Object.values(groups).sort((a, b) => {
      // Sort by latest date descending (newest first)
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });
    
    // Also sort items within each group by date (newest first)
    sortedGroups.forEach(group => {
      group.items.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    
    setClientGroups(sortedGroups);
    console.log('📊 Client groups:', sortedGroups.length, '- sorted by most recent activity');
    
    // Also group by order (async - fetches delivery provider info)
    groupItemsByOrder(materialItems).catch(err => console.log('Error grouping by order:', err));
  };

  // Group items by purchase order - sorted by most recent first
  // Also separates into dispatched and unconfirmed orders
  const groupItemsByOrder = async (materialItems: MaterialItem[]) => {
    const groups: Record<string, OrderGroup> = {};
    
    materialItems.forEach(item => {
      const orderId = item.purchase_order_id || 'unknown';
      
      if (!groups[orderId]) {
        groups[orderId] = {
          order_id: orderId,
          order_number: undefined, // Will be set from purchase_orders - NO FAKE FALLBACK
          buyer_id: item.buyer_id || 'unknown',
          buyer_name: item.buyer_name || 'Unknown Client',
          buyer_email: item.buyer_email || '',
          buyer_phone: item.buyer_phone || '',
          total_items: 0,
          pending_items: 0,
          dispatched_items: 0,
          received_items: 0,
          invalid_items: 0,
          items: [],
          created_at: item.created_at || '',
          delivery_provider_id: undefined,
          delivery_provider_name: undefined,
          delivery_provider_phone: undefined,
          delivery_status: undefined,
          delivery_required: false
        };
      }
      
      groups[orderId].total_items++;
      groups[orderId].items.push(item);
      
      // Track the earliest item date for this order (order creation date)
      if (item.created_at && (!groups[orderId].created_at || item.created_at < groups[orderId].created_at)) {
        groups[orderId].created_at = item.created_at;
      }
      
      // Check if item is invalid (both dispatch and receive scanned)
      const isFullyScanned = item.dispatch_scanned && item.receive_scanned;
      const isInvalidated = item.is_invalidated || isFullyScanned;
      
      if (isInvalidated) {
        groups[orderId].invalid_items++;
      } else if (item.status === 'pending') {
        groups[orderId].pending_items++;
      } else if (item.status === 'dispatched' || item.status === 'in_transit') {
        groups[orderId].dispatched_items++;
      } else if (item.status === 'received' || item.status === 'verified') {
        groups[orderId].received_items++;
      }
    });
    
    // Fetch purchase order data with delivery provider information
    const orderIds = Object.keys(groups).filter(id => id !== 'unknown');
    if (orderIds.length > 0) {
      try {
        const stored = getUserFromStorage();
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        const headers: Record<string, string> = {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        };
        if (stored?.accessToken) {
          headers['Authorization'] = `Bearer ${stored.accessToken}`;
        }
        
        // Fetch purchase orders with delivery provider info - CRITICAL: Must complete to get real order numbers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const purchaseOrdersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${orderIds.join(',')})&select=id,po_number,delivery_provider_id,delivery_provider_name,delivery_provider_phone,delivery_status,delivery_required`,
          { headers, cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (purchaseOrdersResponse.ok) {
          const purchaseOrders = await purchaseOrdersResponse.json();
          console.log('📦 Fetched purchase_orders for order_number assignment:', purchaseOrders.length);
          
          let realOrderNumbersCount = 0;
          purchaseOrders.forEach((po: any) => {
            if (groups[po.id]) {
              // ONLY set order_number if we have a real po_number from purchase_orders
              if (po.po_number) {
                groups[po.id].order_number = po.po_number;
                realOrderNumbersCount++;
              } else {
                console.warn('⚠️ Purchase order', po.id, 'has no po_number - will be filtered out');
              }
              groups[po.id].delivery_provider_id = po.delivery_provider_id;
              groups[po.id].delivery_provider_name = po.delivery_provider_name;
              groups[po.id].delivery_provider_phone = po.delivery_provider_phone;
              groups[po.id].delivery_status = po.delivery_status;
              groups[po.id].delivery_required = po.delivery_required || false;
            }
          });
          console.log('✅ Assigned real order_numbers to', realOrderNumbersCount, 'orders');
        } else {
          console.error('❌ Failed to fetch purchase_orders for order_number assignment:', purchaseOrdersResponse.status);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('⏱️ Purchase orders fetch timeout - order_numbers will be missing');
        } else {
          console.error('❌ Could not fetch purchase order data:', error);
        }
      }
    }
    
    // Sort groups by most recent order (newest first)
    const sortedGroups = Object.values(groups).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Sort items within each order by item_sequence
    sortedGroups.forEach(group => {
      group.items.sort((a, b) => a.item_sequence - b.item_sequence);
    });
    
    setOrderGroups(sortedGroups);
    console.log('📦 Order groups:', sortedGroups.length, '- sorted by most recent order');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SEPARATE INTO STATUS-BASED ORDER GROUPS
    // Status flow: awaiting_dispatch → dispatched → in_transit → materials_received
    // ═══════════════════════════════════════════════════════════════════════════════
    const awaitingDispatch: OrderGroup[] = [];
    const dispatched: OrderGroup[] = [];
    const inTransit: OrderGroup[] = [];
    const delivered: OrderGroup[] = [];
    
    sortedGroups.forEach(group => {
      // CRITICAL: Only process orders with REAL order_numbers (from purchase_orders.po_number)
      // Filter out orders without real order numbers to avoid showing fake/fallback numbers
      if (!group.order_number || group.order_number === 'unknown' || group.order_id === 'unknown') {
        console.warn('🚫 Filtering out order without real order_number:', group.order_id, 'order_number:', group.order_number);
        return; // Skip this order - it doesn't have a real order number
      }
      
      const hasDispatchedItems = group.items.some(item => item.dispatch_scanned === true);
      const hasReceivedItems = group.items.some(item => item.receive_scanned === true);
      const allItemsDispatched = group.items.every(item => item.dispatch_scanned === true);
      const allItemsReceived = group.items.every(item => item.receive_scanned === true);
      
      // DEBUG: Log the status for this order
      if (group.order_number) {
        console.log(`📊 Order ${group.order_number}:`, {
          total_items: group.items.length,
          dispatched_count: group.items.filter(i => i.dispatch_scanned === true).length,
          received_count: group.items.filter(i => i.receive_scanned === true).length,
          allItemsDispatched,
          allItemsReceived,
          receive_scanned_status: group.items.map(i => ({ id: i.id.slice(0, 8), receive_scanned: i.receive_scanned }))
        });
      }
      
      if (allItemsReceived) {
        // All items received = delivered
        console.log(`✅ Order ${group.order_number || group.order_id}: ALL ITEMS RECEIVED → DELIVERED`);
        delivered.push(group);
      } else if (allItemsDispatched) {
        // All items dispatched (whether or not any received yet) = in transit
        console.log(`🚚 Order ${group.order_number || group.order_id}: ALL ITEMS DISPATCHED → IN TRANSIT`);
        inTransit.push(group);
      } else if (hasDispatchedItems) {
        // Some but not all items dispatched = dispatched (partial)
        console.log(`📦 Order ${group.order_number || group.order_id}: SOME ITEMS DISPATCHED → DISPATCHED`);
        dispatched.push(group);
      } else {
        // No items dispatched = awaiting dispatch
        console.log(`⏳ Order ${group.order_number || group.order_id}: NO ITEMS DISPATCHED → AWAITING DISPATCH`);
        awaitingDispatch.push(group);
      }
    });
    
    // Log counts with real order numbers
    console.log('✅ Orders with REAL order_numbers:', {
      awaitingDispatch: awaitingDispatch.length,
      dispatched: dispatched.length,
      inTransit: inTransit.length,
      delivered: delivered.length
    });
    
    setAwaitingDispatchOrders(awaitingDispatch);
    setDispatchedOrders(dispatched);
    setInTransitOrders(inTransit);
    setDeliveredOrders(delivered);
    
    console.log('⏳ Awaiting Dispatch orders:', awaitingDispatch.length);
    console.log('🚚 Dispatched orders:', dispatched.length);
    console.log('🚛 In Transit orders:', inTransit.length);
    console.log('✅ Delivered orders:', delivered.length);
  };

  const downloadQRCode = async (qrCode: string, materialType: string, itemSeq: number) => {
    try {
      // Large QR code size for easy scanning on any device
      const qrSize = 500;
      const padding = 60;
      const headerHeight = 100; // Space for QR code number at top
      const footerHeight = 120; // Space for product name at bottom
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const totalWidth = qrSize + (padding * 2);
      const totalHeight = headerHeight + qrSize + footerHeight;
      
      canvas.width = totalWidth;
      canvas.height = totalHeight;

      if (!ctx) return;

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ═══════════════════════════════════════════════════════════════
      // HEADER SECTION - QR Code Number (at top)
      // ═══════════════════════════════════════════════════════════════
      ctx.fillStyle = '#0891b2'; // Cyan color
      ctx.fillRect(0, 0, totalWidth, headerHeight);
      
      // QR Code number - large and bold at top
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`QR #${itemSeq}`, totalWidth / 2, 40);
      
      // QR code string - monospace for readability
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '14px "Courier New", monospace';
      // Truncate if too long
      const displayCode = qrCode.length > 45 ? qrCode.substring(0, 42) + '...' : qrCode;
      ctx.fillText(displayCode, totalWidth / 2, 70);

      // ═══════════════════════════════════════════════════════════════
      // QR CODE IMAGE SECTION (in middle)
      // ═══════════════════════════════════════════════════════════════
      // Create temporary canvas for QR code using qrcode library
      const qrCanvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(qrCanvas, qrCode, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Draw QR code onto main canvas (centered)
      ctx.drawImage(qrCanvas, padding, headerHeight);

      // Draw border around QR code area
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(padding - 5, headerHeight - 5, qrSize + 10, qrSize + 10);

      // ═══════════════════════════════════════════════════════════════
      // FOOTER SECTION - Product Name (below image)
      // ═══════════════════════════════════════════════════════════════
      const footerY = headerHeight + qrSize;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, footerY, totalWidth, footerHeight);
      
      // Border line at top of footer
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(totalWidth, footerY);
      ctx.stroke();

      // Product name - large and bold
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(materialType.toUpperCase(), totalWidth / 2, footerY + 45);
      
      // "SCAN ME" indicator
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('📱 SCAN TO VERIFY', totalWidth / 2, footerY + 75);

      // Company branding at bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('UjenziPro Material Tracking System', totalWidth / 2, footerY + 105);

      const link = document.createElement('a');
      link.download = `QR_${materialType.replace(/\s+/g, '_')}_Item${itemSeq}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: "✅ QR Code Downloaded",
        description: `${materialType} - QR #${itemSeq}`,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadAllQRCodes = async () => {
    toast({
      title: "Downloading QR Codes",
      description: `Generating ${items.length} QR codes...`,
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300); // Stagger downloads
    }
  };

  // Download selected QR codes only
  const downloadSelectedQRCodes = async () => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    if (selectedItemsList.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select QR codes to download",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Downloading Selected QR Codes",
      description: `Generating ${selectedItemsList.length} QR codes...`,
    });

    for (let i = 0; i < selectedItemsList.length; i++) {
      const item = selectedItemsList[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300);
    }
  };

  // Download all QR codes for a specific client
  const downloadClientQRCodes = async (clientGroup: ClientGroup, selectedOnly: boolean = false) => {
    const itemsToDownload = selectedOnly 
      ? clientGroup.items.filter(item => selectedItems.has(item.id))
      : clientGroup.items;

    if (itemsToDownload.length === 0) {
      toast({
        title: "No items to download",
        description: selectedOnly ? "Please select QR codes to download" : "No items found",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Downloading Client QR Codes",
      description: `Generating ${itemsToDownload.length} QR codes for ${clientGroup.buyer_name}...`,
    });

    for (let i = 0; i < itemsToDownload.length; i++) {
      const item = itemsToDownload[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300); // Stagger downloads
    }
  };

  // Print selected QR codes only
  const printSelectedQRCodes = async () => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    if (selectedItemsList.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select QR codes to print",
        variant: "destructive",
      });
      return;
    }

    await printItemsList(selectedItemsList, "Selected QR Codes", `${selectedItemsList.length} selected items`);
  };

  // Delete selected QR codes and generate fresh ones (same items, new codes)
  const deleteAndRegenerateSelected = async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) {
      toast({ title: "No items selected", description: "Select QR codes to delete and regenerate", variant: "destructive" });
      return;
    }
    toast({ title: "Regenerating QR codes...", description: `Deleting ${ids.length} and creating fresh codes...` });
    try {
      const { data, error } = await supabase.rpc('delete_and_regenerate_qr_codes', { _item_ids: ids });
      if (error) {
        toast({ title: "Regenerate failed", description: error.message || String(error), variant: "destructive" });
        return;
      }
      const result = data as { success?: boolean; error?: string; error_code?: string; regenerated_count?: number };
      if (result && result.success === false) {
        toast({ title: "Regenerate failed", description: result.error || "Unknown error", variant: "destructive" });
        return;
      }
      setSelectedItems(new Set());
      setSelectionMode(false);
      setLoading(true);
      checkAuthAndFetch();
      toast({
        title: "QR codes regenerated",
        description: result?.regenerated_count != null ? `${result.regenerated_count} new QR codes created. List refreshed.` : "Fresh QR codes created. List refreshed.",
      });
    } catch (e: any) {
      toast({ title: "Regenerate failed", description: e?.message || String(e), variant: "destructive" });
    }
  };

  // Print QR codes for a specific client
  const printClientQRCodes = async (clientGroup: ClientGroup, selectedOnly: boolean = false) => {
    const itemsToPrint = selectedOnly 
      ? clientGroup.items.filter(item => selectedItems.has(item.id))
      : clientGroup.items;

    if (itemsToPrint.length === 0) {
      toast({
        title: "No items to print",
        description: selectedOnly ? "Please select QR codes to print" : "No items found",
        variant: "destructive",
      });
      return;
    }

    await printItemsList(
      itemsToPrint, 
      `QR Codes for ${clientGroup.buyer_name}`,
      `${clientGroup.buyer_email || ''} ${clientGroup.buyer_phone ? '• ' + clientGroup.buyer_phone : ''}`
    );
  };

  // Download all QR codes for a specific order
  const downloadOrderQRCodes = async (orderGroup: OrderGroup, selectedOnly: boolean = false) => {
    const itemsToDownload = selectedOnly 
      ? orderGroup.items.filter(item => selectedItems.has(item.id))
      : orderGroup.items;

    if (itemsToDownload.length === 0) {
      toast({
        title: "No items to download",
        description: selectedOnly ? "Please select QR codes to download" : "No items found",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "📦 Downloading Order QR Codes",
      description: `Generating ${itemsToDownload.length} QR codes for Order #${orderGroup.order_number}...`,
    });

    for (let i = 0; i < itemsToDownload.length; i++) {
      const item = itemsToDownload[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300); // Stagger downloads
    }
  };

  // Sequential print QR codes for a specific order with progress tracking
  const printOrderQRCodes = async (orderGroup: OrderGroup, selectedOnly: boolean = false) => {
    const itemsToPrint = selectedOnly 
      ? orderGroup.items.filter(item => selectedItems.has(item.id))
      : orderGroup.items.filter(item => !item.dispatch_scanned); // Only print pending items

    if (itemsToPrint.length === 0) {
      toast({
        title: "No items to print",
        description: selectedOnly ? "Please select QR codes to print" : "All items already dispatched",
        variant: "destructive",
      });
      return;
    }

    // Set printing progress
    setPrintingProgress({ orderId: orderGroup.order_id, current: 0, total: itemsToPrint.length });

    // Sequential printing - one at a time
    for (let i = 0; i < itemsToPrint.length; i++) {
      const item = itemsToPrint[i];
      setPrintingProgress({ orderId: orderGroup.order_id, current: i + 1, total: itemsToPrint.length });

      // Generate QR code for this item
      const qrDataUrl = await QRCodeLib.toDataURL(item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      // Create print window for single item
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to print QR codes",
          variant: "destructive",
        });
        setPrintingProgress(null);
        return;
      }

      // Build print HTML for single item
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code ${item.item_sequence}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .qr-item { 
              border: 2px solid #000; 
              text-align: center; 
              border-radius: 8px;
              background: #fff;
              width: 300px;
              overflow: hidden;
            }
            .qr-number-header {
              background: #0891b2;
              color: white;
              padding: 10px 8px;
            }
            .qr-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .qr-code-text { 
              font-family: monospace; 
              font-size: 8px; 
              color: #e0f2fe; 
              word-break: break-all; 
            }
            .qr-image-container {
              padding: 15px;
              background: white;
            }
            .qr-item img { width: 200px; height: 200px; }
            .product-footer {
              background: #f8fafc;
              padding: 12px 8px;
              border-top: 1px solid #e5e7eb;
            }
            .product-name { 
              font-size: 14px; 
              font-weight: bold; 
              color: #1e293b;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .scan-me {
              font-size: 10px;
              color: #059669;
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              .qr-item { border: 2px solid #000; }
              .qr-number-header { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="qr-item">
            <div class="qr-number-header">
              <div class="qr-number">QR #${item.item_sequence}</div>
              <div class="qr-code-text">${item.qr_code}</div>
            </div>
            <div class="qr-image-container">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="product-footer">
              <div class="product-name">${item.material_type}</div>
              <div class="scan-me">📱 SCAN TO DISPATCH</div>
            </div>
          </div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait a bit before printing next item (allows printer to process)
      if (i < itemsToPrint.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Clear progress after all items printed
    setTimeout(() => {
      setPrintingProgress(null);
      toast({
        title: "✅ All Labels Printed",
        description: `Successfully printed ${itemsToPrint.length} label(s) for Order #${orderGroup.order_number}`,
      });
    }, 2000);
  };

  // Generic print function for a list of items - SEQUENTIAL (one at a time)
  const printItemsList = async (itemsToPrint: MaterialItem[], title: string, subtitle: string) => {
    if (itemsToPrint.length === 0) {
      toast({
        title: "No items to print",
        description: "Please select items to print",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preparing Sequential Print",
      description: `Will print ${itemsToPrint.length} QR code(s) one at a time...`,
    });

    // Sequential printing - one QR code at a time
    for (let i = 0; i < itemsToPrint.length; i++) {
      const item = itemsToPrint[i];
      
      // Show progress
      toast({
        title: `Printing ${i + 1} of ${itemsToPrint.length}`,
        description: `Printing QR code for ${item.material_type}...`,
      });

      // Generate QR code for this item
      const qrDataUrl = await QRCodeLib.toDataURL(item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      // Create print window for single item
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to print QR codes",
          variant: "destructive",
        });
        return;
      }

      // Build print HTML for single item (one QR code per page)
      const isCompleted = item.dispatch_scanned && item.receive_scanned;
      const isDispatched = item.dispatch_scanned && !item.receive_scanned;
      
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${item.material_type}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .qr-container {
              width: 100%;
              max-width: 400px;
              border: 3px solid #0891b2;
              border-radius: 12px;
              overflow: hidden;
              background: white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .qr-number-header {
              background: #0891b2;
              color: white;
              padding: 15px;
              text-align: center;
            }
            .qr-number {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .qr-code-text { 
              font-family: monospace; 
              font-size: 10px; 
              color: #e0f2fe; 
              word-break: break-all; 
            }
            .qr-image-container {
              padding: 30px;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .qr-image-container img { 
              width: 300px; 
              height: 300px; 
            }
            .product-footer {
              background: #f8fafc;
              padding: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            .product-name { 
              font-size: 18px; 
              font-weight: bold; 
              color: #1e293b;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .scan-me {
              font-size: 14px;
              color: #059669;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 6px; 
              font-size: 12px; 
              font-weight: bold; 
            }
            .completed-badge { background: #22c55e; color: white; }
            .pending-badge { background: #eab308; color: white; }
            .dispatched-badge { background: #3b82f6; color: white; }
            .client-info {
              margin-top: 20px;
              padding: 15px;
              background: #f0f9ff;
              border-radius: 8px;
              text-align: center;
            }
            .client-name {
              font-size: 16px;
              font-weight: bold;
              color: #0891b2;
              margin-bottom: 5px;
            }
            @media print {
              body { padding: 0; }
              .qr-container { 
                max-width: 100%;
                border: 2px solid #000;
                page-break-after: always;
              }
              .qr-number-header { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-number-header">
              <div class="qr-number">QR #${item.item_sequence}</div>
              <div class="qr-code-text">${item.qr_code}</div>
            </div>
            <div class="qr-image-container">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="product-footer">
              <div class="product-name">${item.material_type}</div>
              <div class="scan-me">📱 SCAN TO VERIFY</div>
              ${isCompleted 
                ? '<span class="status-badge completed-badge">✅ COMPLETED</span>' 
                : isDispatched 
                  ? '<span class="status-badge dispatched-badge">🚚 DISPATCHED</span>'
                  : '<span class="status-badge pending-badge">⏳ PENDING</span>'
              }
            </div>
            ${item.buyer_name && item.buyer_name !== 'Unknown Client' ? `
              <div class="client-info">
                <div class="client-name">Client: ${item.buyer_name}</div>
              </div>
            ` : ''}
          </div>
          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait before printing next item (allows printer to process)
      if (i < itemsToPrint.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between prints
      }
    }

    // Show completion message
    setTimeout(() => {
      toast({
        title: "✅ All QR Codes Printed",
        description: `Successfully printed ${itemsToPrint.length} QR code(s) sequentially`,
      });
    }, 1000);
  };

  // Print all QR codes - grouped by client with page breaks
  const printAllQRCodes = async () => {
    toast({
      title: "Preparing Print",
      description: `Generating ${items.length} QR codes for printing (grouped by client)...`,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print QR codes",
        variant: "destructive",
      });
      return;
    }

    // Generate QR codes as data URLs for all items
    const qrPromises = items.map(async (item) => {
      const qrDataUrl = await QRCodeLib.toDataURL(item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      return { item, qrDataUrl };
    });

    const qrResults = await Promise.all(qrPromises);

    // Group results by client
    const qrByClient: Record<string, { item: MaterialItem; qrDataUrl: string }[]> = {};
    qrResults.forEach(({ item, qrDataUrl }) => {
      const clientKey = item.buyer_id || 'unknown';
      if (!qrByClient[clientKey]) {
        qrByClient[clientKey] = [];
      }
      qrByClient[clientKey].push({ item, qrDataUrl });
    });

    // Build HTML with page breaks between clients - QR Number at top, image in middle, product name below
    const clientSections = clientGroups.map((group, groupIndex) => {
      const clientQRs = qrByClient[group.buyer_id] || [];
      if (clientQRs.length === 0) return '';
      
      return `
        <div class="client-section ${groupIndex > 0 ? 'page-break' : ''}">
          <div class="client-header">
            <h2>📦 ${group.buyer_name}</h2>
            <p class="client-contact">
              ${group.buyer_email ? '✉️ ' + group.buyer_email : ''} 
              ${group.buyer_phone ? ' | 📞 ' + group.buyer_phone : ''}
            </p>
            <p class="client-stats">${clientQRs.length} items | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="qr-grid">
            ${clientQRs.map(({ item, qrDataUrl }) => `
              <div class="qr-item ${item.dispatch_scanned && item.receive_scanned ? 'completed' : ''}">
                <!-- QR Number at top -->
                <div class="qr-number-header">
                  <div class="qr-number">QR #${item.item_sequence}</div>
                  <div class="qr-code-text">${item.qr_code}</div>
                </div>
                <!-- QR Image in middle -->
                <div class="qr-image-container">
                  <img src="${qrDataUrl}" alt="QR Code" />
                </div>
                <!-- Product name below image -->
                <div class="product-footer">
                  <div class="product-name">${item.material_type}</div>
                  <div class="scan-me">📱 SCAN TO VERIFY</div>
                  ${item.dispatch_scanned && item.receive_scanned ? '<span class="status-badge completed-badge">✅ COMPLETED</span>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>All QR Codes - UjenziXform</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .main-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0891b2; padding-bottom: 15px; }
          .main-header h1 { font-size: 28px; margin-bottom: 5px; color: #0891b2; }
          .main-header p { color: #666; }
          
          /* Client Section Styling */
          .client-section { margin-bottom: 40px; padding-top: 20px; }
          .client-header { 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border: 2px solid #0891b2; 
            border-radius: 10px; 
            padding: 15px 20px; 
            margin-bottom: 20px; 
          }
          .client-header h2 { font-size: 20px; color: #0891b2; margin-bottom: 5px; }
          .client-contact { font-size: 12px; color: #666; }
          .client-stats { font-size: 11px; color: #888; margin-top: 5px; }
          
          /* QR Grid */
          .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-item { 
            border: 2px solid #ddd; 
            text-align: center; 
            page-break-inside: avoid; 
            border-radius: 8px;
            background: #fff;
            overflow: hidden;
          }
          .qr-item.completed { 
            border-color: #22c55e; 
            background: #f0fdf4; 
          }
          /* QR Number Header - at top */
          .qr-number-header {
            background: #0891b2;
            color: white;
            padding: 10px 8px;
          }
          .qr-number {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .qr-code-text { 
            font-family: monospace; 
            font-size: 8px; 
            color: #e0f2fe; 
            word-break: break-all; 
          }
          /* QR Image - in middle */
          .qr-image-container {
            padding: 15px;
            background: white;
          }
          .qr-item img { width: 150px; height: 150px; }
          /* Product Name Footer - below image */
          .product-footer {
            background: #f8fafc;
            padding: 12px 8px;
            border-top: 1px solid #e5e7eb;
          }
          .product-name { 
            font-size: 14px; 
            font-weight: bold; 
            color: #1e293b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .scan-me {
            font-size: 10px;
            color: #059669;
            font-weight: bold;
          }
          .status-badge { 
            display: inline-block; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: bold; 
            margin-top: 6px; 
          }
          .completed-badge { background: #22c55e; color: white; }
          
          /* Print-specific styles */
          @media print {
            .page-break { page-break-before: always; }
            .qr-grid { grid-template-columns: repeat(3, 1fr); }
            .qr-item { border: 2px solid #000; }
            .client-section { margin-bottom: 0; }
            .qr-number-header { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="main-header">
          <h1>📱 Material QR Codes</h1>
          <p>UjenziXform - Construction Material Tracking</p>
          <p>Total: ${items.length} items across ${clientGroups.length} clients</p>
        </div>
        ${clientSections}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      dispatched: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      received: 'bg-orange-100 text-orange-800',
      verified: 'bg-green-100 text-green-800',
      damaged: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'dispatched': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'received': 
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="ml-2 text-muted-foreground">Loading QR codes...</span>
      </div>
    );
  }

  if (!['admin', 'supplier'].includes(userRole || '')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Access restricted to suppliers and administrators.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Download All and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-7 w-7 text-cyan-500" />
            QR Codes Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {awaitingDispatchOrders.length} awaiting dispatch • {dispatchedOrders.length} dispatched • {inTransitOrders.length} in transit • {deliveredOrders.length} delivered
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Refresh Button */}
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              checkAuthAndFetch();
              toast({ title: '🔄 Refreshing QR codes...' });
            }}
            className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          {/* Selection Mode Toggle */}
          <Button 
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedItems(new Set());
            }}
            className={selectionMode ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {selectionMode ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
            {selectionMode ? `Selected (${selectedItems.size})` : 'Select'}
          </Button>

          {/* Delete & Regenerate - only when items selected */}
          {selectionMode && selectedItems.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAndRegenerateSelected}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              title="Remove selected QR codes and create new ones (list refreshes automatically)"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Delete & Regenerate ({selectedItems.size})
            </Button>
          )}

          {/* Primary Action: Scan to Dispatch */}
          <Button 
            size="lg"
            onClick={() => navigate('/supplier-dispatch-scanner')}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          >
            <Scan className="h-5 w-5 mr-2" />
            Scan to Dispatch
          </Button>

          {/* View Mode Toggle - Status-based sections */}
          <div className="flex rounded-lg border overflow-hidden">
            <Button 
              variant={viewMode === 'awaiting_dispatch' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('awaiting_dispatch')}
              className={viewMode === 'awaiting_dispatch' ? 'bg-amber-600' : ''}
              title="Orders awaiting dispatch - Print labels and scan QR codes"
            >
              <Clock className="h-4 w-4 mr-1" />
              Awaiting Dispatch ({awaitingDispatchOrders.length})
            </Button>
            <Button 
              variant={viewMode === 'dispatched' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('dispatched')}
              className={viewMode === 'dispatched' ? 'bg-green-600' : ''}
              title="Orders that have been dispatched - QR codes scanned"
            >
              <Truck className="h-4 w-4 mr-1" />
              Dispatched ({dispatchedOrders.length})
            </Button>
            <Button 
              variant={viewMode === 'in_transit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('in_transit')}
              className={viewMode === 'in_transit' ? 'bg-blue-600' : ''}
              title="Orders in transit to destination"
            >
              <Package className="h-4 w-4 mr-1" />
              In Transit ({inTransitOrders.length})
            </Button>
            <Button 
              variant={viewMode === 'delivered' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('delivered')}
              className={viewMode === 'delivered' ? 'bg-purple-600' : ''}
              title="Orders delivered and received"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Delivered ({deliveredOrders.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards - Status-based sections */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`border-2 cursor-pointer transition-all ${viewMode === 'awaiting_dispatch' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' : 'bg-amber-50 border-amber-200 hover:border-amber-400'}`}
            onClick={() => setViewMode('awaiting_dispatch')}
          >
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-amber-700">{awaitingDispatchOrders.length}</p>
              <p className="text-sm text-amber-600 font-medium">Awaiting Dispatch</p>
              <p className="text-xs text-amber-500">Ready for processing</p>
            </CardContent>
          </Card>
          <Card 
            className={`border-2 cursor-pointer transition-all ${viewMode === 'dispatched' ? 'bg-green-100 border-green-400 ring-2 ring-green-300' : 'bg-green-50 border-green-200 hover:border-green-400'}`}
            onClick={() => setViewMode('dispatched')}
          >
            <CardContent className="p-4 text-center">
              <Truck className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{dispatchedOrders.length}</p>
              <p className="text-sm text-green-600 font-medium">Dispatched Orders</p>
              <p className="text-xs text-green-500">Shipped materials</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{items.filter(i => i.dispatch_scanned).length}</p>
              <p className="text-sm text-blue-600">Items Dispatched</p>
              <p className="text-xs text-blue-500">QR codes scanned</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{orderGroups.length}</p>
              <p className="text-sm text-purple-600">Total Orders</p>
              <p className="text-xs text-purple-500">{clientGroups.length} clients</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Code Display */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <QrCode className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No QR Codes Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              QR codes are automatically generated when purchase orders are confirmed. 
              Each item gets a unique QR code with client identity embedded.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'awaiting_dispatch' ? (
        /* ═══════════════════════════════════════════════════════════════════════════════
           AWAITING DISPATCH ORDERS VIEW - Orders ready for processing
           These are materials that need QR codes printed and scanned for dispatch
           ═══════════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-800">Awaiting Dispatch</h3>
                <p className="text-amber-600 text-sm">
                  {awaitingDispatchOrders.length} orders ready for processing • Print labels and scan to dispatch
                </p>
              </div>
            </div>
          </div>
          
          {awaitingDispatchOrders.length === 0 ? (
            <Card className="border-amber-200">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-700">All Orders Dispatched!</h3>
                <p className="text-gray-500">No pending orders to dispatch. Great job! 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4" defaultValue={awaitingDispatchOrders.slice(0, 2).map(g => g.order_id)}>
              {awaitingDispatchOrders.map((group) => (
                <OrderAccordionItem 
                  key={group.order_id}
                  group={group}
                  selectionMode={selectionMode}
                  selectedItems={selectedItems}
                  areAllOrderItemsSelected={areAllOrderItemsSelected}
                  deselectAllOrderItems={deselectAllOrderItems}
                  selectAllOrderItems={selectAllOrderItems}
                  getSelectedCountForOrder={getSelectedCountForOrder}
                  printOrderQRCodes={printOrderQRCodes}
                  downloadOrderQRCodes={downloadOrderQRCodes}
                  getStatusColor={getStatusColor}
                  setSelectedItem={setSelectedItem}
                  setShowQRDialog={setShowQRDialog}
                  downloadQRCode={downloadQRCode}
                  toggleItemSelection={toggleItemSelection}
                  printingProgress={printingProgress}
                  headerColor="from-amber-50 via-orange-50 to-amber-50"
                  headerHoverColor="hover:from-amber-100 hover:to-orange-100"
                  iconBgColor="from-amber-500 to-orange-600"
                  badgeColor="from-amber-600 to-orange-600"
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : viewMode === 'dispatched' ? (
        /* ═══════════════════════════════════════════════════════════════════════════════
           DISPATCHED ORDERS VIEW - Orders that have been shipped
           These are materials that have been scanned for dispatch (shipped)
           ═══════════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-xl">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">Dispatched Materials</h3>
                <p className="text-green-600 text-sm">
                  {dispatchedOrders.length} orders shipped • QR codes scanned for dispatch
                </p>
              </div>
            </div>
          </div>
          
          {dispatchedOrders.length === 0 ? (
            <Card className="border-green-200">
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No Dispatched Orders Yet</h3>
                <p className="text-gray-500">Orders will appear here after QR codes are scanned for dispatch.</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4" defaultValue={dispatchedOrders.slice(0, 2).map(g => g.order_id)}>
              {dispatchedOrders.map((group) => (
                <OrderAccordionItem 
                  key={group.order_id}
                  group={group}
                  selectionMode={selectionMode}
                  selectedItems={selectedItems}
                  areAllOrderItemsSelected={areAllOrderItemsSelected}
                  deselectAllOrderItems={deselectAllOrderItems}
                  selectAllOrderItems={selectAllOrderItems}
                  getSelectedCountForOrder={getSelectedCountForOrder}
                  printOrderQRCodes={printOrderQRCodes}
                  downloadOrderQRCodes={downloadOrderQRCodes}
                  getStatusColor={getStatusColor}
                  setSelectedItem={setSelectedItem}
                  setShowQRDialog={setShowQRDialog}
                  downloadQRCode={downloadQRCode}
                  toggleItemSelection={toggleItemSelection}
                  printingProgress={printingProgress}
                  headerColor="from-green-50 via-emerald-50 to-green-50"
                  headerHoverColor="hover:from-green-100 hover:to-emerald-100"
                  iconBgColor="from-green-500 to-emerald-600"
                  badgeColor="from-green-600 to-emerald-600"
                  showShippedBadge={true}
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : viewMode === 'in_transit' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-800">In Transit</h3>
                <p className="text-blue-600 text-sm">{inTransitOrders.length} orders being delivered</p>
              </div>
            </div>
          </div>
          {inTransitOrders.length === 0 ? (
            <Card className="border-blue-200">
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No Orders In Transit</h3>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {inTransitOrders.map((group) => (
                <OrderAccordionItem 
                  key={group.order_id}
                  group={group}
                  selectionMode={false}
                  selectedItems={new Set()}
                  areAllOrderItemsSelected={areAllOrderItemsSelected}
                  deselectAllOrderItems={deselectAllOrderItems}
                  selectAllOrderItems={selectAllOrderItems}
                  getSelectedCountForOrder={getSelectedCountForOrder}
                  printOrderQRCodes={printOrderQRCodes}
                  downloadOrderQRCodes={downloadOrderQRCodes}
                  getStatusColor={getStatusColor}
                  setSelectedItem={setSelectedItem}
                  setShowQRDialog={setShowQRDialog}
                  downloadQRCode={downloadQRCode}
                  toggleItemSelection={toggleItemSelection}
                  printingProgress={printingProgress}
                  headerColor="from-blue-50 via-indigo-50 to-blue-50"
                  headerHoverColor="hover:from-blue-100 hover:to-indigo-100"
                  iconBgColor="from-blue-500 to-indigo-600"
                  badgeColor="from-blue-600 to-indigo-600"
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : viewMode === 'delivered' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-800">Delivered</h3>
                <p className="text-purple-600 text-sm">{deliveredOrders.length} orders delivered</p>
              </div>
            </div>
          </div>
          {deliveredOrders.length === 0 ? (
            <Card className="border-purple-200">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No Delivered Orders Yet</h3>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {deliveredOrders.map((group) => (
                <OrderAccordionItem 
                  key={group.order_id}
                  group={group}
                  selectionMode={false}
                  selectedItems={new Set()}
                  areAllOrderItemsSelected={areAllOrderItemsSelected}
                  deselectAllOrderItems={deselectAllOrderItems}
                  selectAllOrderItems={selectAllOrderItems}
                  getSelectedCountForOrder={getSelectedCountForOrder}
                  printOrderQRCodes={printOrderQRCodes}
                  downloadOrderQRCodes={downloadOrderQRCodes}
                  getStatusColor={getStatusColor}
                  setSelectedItem={setSelectedItem}
                  setShowQRDialog={setShowQRDialog}
                  downloadQRCode={downloadQRCode}
                  toggleItemSelection={toggleItemSelection}
                  printingProgress={printingProgress}
                  headerColor="from-purple-50 via-pink-50 to-purple-50"
                  headerHoverColor="hover:from-purple-100 hover:to-pink-100"
                  iconBgColor="from-purple-500 to-pink-600"
                  badgeColor="from-purple-600 to-pink-600"
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : viewMode === 'by-order' ? (
        /* Order-Grouped View - Click on order to expand and print */
        <Accordion type="multiple" className="space-y-4" defaultValue={orderGroups.length > 0 ? [orderGroups[0].order_id] : []}>
          {orderGroups.map((group) => {
            const orderDate = group.created_at ? new Date(group.created_at) : null;
            return (
              <AccordionItem key={group.order_id} value={group.order_id} className="border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-5 py-4 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 hover:from-blue-100 hover:to-cyan-100">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                        <Package className="h-7 w-7 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-xl text-blue-800">Order #{group.order_number || 'Loading...'}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <User className="h-3 w-3" /> {group.buyer_name}
                          </span>
                          {orderDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectionMode && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (areAllOrderItemsSelected(group)) {
                              deselectAllOrderItems(group);
                            } else {
                              selectAllOrderItems(group);
                            }
                          }}
                        >
                          {areAllOrderItemsSelected(group) ? (
                            <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                          ) : (
                            <><Square className="h-4 w-4 mr-1" /> Select All ({group.total_items})</>
                          )}
                        </Button>
                      )}
                      {selectionMode && getSelectedCountForOrder(group) > 0 && (
                        <Badge className="bg-orange-500">
                          {getSelectedCountForOrder(group)} selected
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        {group.pending_items} pending
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {group.dispatched_items} dispatched
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {group.received_items} received
                      </Badge>
                      {group.invalid_items > 0 && (
                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                          <ShieldX className="h-3 w-3 mr-1" />
                          {group.invalid_items} invalid
                        </Badge>
                      )}
                      <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-3">
                        {group.total_items} items
                      </Badge>
            {/* Print Labels Button with Progress - Only show for awaiting dispatch orders */}
            {group.pending_items > 0 && (
              <Button 
                size="sm" 
                className="ml-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  printOrderQRCodes(group);
                }}
                disabled={printingProgress?.orderId === group.order_id}
              >
                <Printer className="h-4 w-4 mr-1" />
                {printingProgress?.orderId === group.order_id 
                  ? `Printing ${printingProgress.current} of ${printingProgress.total}`
                  : 'Print Labels'
                }
              </Button>
            )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 bg-gradient-to-b from-slate-50 to-white">
                  {/* Order Summary */}
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <strong>Client:</strong> {group.buyer_name}
                      </span>
                      {group.buyer_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-blue-600" />
                          {group.buyer_email}
                        </span>
                      )}
                      {group.buyer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-blue-600" />
                          {group.buyer_phone}
                        </span>
                      )}
                    </div>
                    {/* Delivery Provider Information */}
                    {group.delivery_required && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        {group.delivery_provider_id ? (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              ✅ Delivery Confirmed
                            </span>
                            <span className="text-sm text-slate-600">
                              Provider: {group.delivery_provider_name || 'Delivery Provider'}
                              {group.delivery_provider_phone && ` (${group.delivery_provider_phone})`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-700">
                              Awaiting Delivery Provider
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {group.items.map((item) => (
                      <CompactQRCard 
                        key={item.id}
                        item={item}
                        getStatusColor={getStatusColor}
                        onViewFullSize={() => {
                          setSelectedItem(item);
                          setShowQRDialog(true);
                        }}
                        downloadQRCode={downloadQRCode}
                        selectionMode={selectionMode}
                        isSelected={selectedItems.has(item.id)}
                        onToggleSelect={() => toggleItemSelection(item.id)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : viewMode === 'by-client' ? (
        /* Client-Grouped View - Added extra spacing between clients */
        <Accordion type="multiple" className="space-y-8" defaultValue={clientGroups.slice(0, 3).map(g => g.buyer_id)}>
          {clientGroups.map((group) => (
            <AccordionItem key={group.buyer_id} value={group.buyer_id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-lg">{group.buyer_name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {group.buyer_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {group.buyer_email}
                          </span>
                        )}
                        {group.buyer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {group.buyer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectionMode && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (areAllClientItemsSelected(group)) {
                            deselectAllClientItems(group);
                          } else {
                            selectAllClientItems(group);
                          }
                        }}
                      >
                        {areAllClientItemsSelected(group) ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All ({group.total_items})</>
                        )}
                      </Button>
                    )}
                    {selectionMode && getSelectedCountForClient(group) > 0 && (
                      <Badge className="bg-orange-500">
                        {getSelectedCountForClient(group)} selected
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {group.pending_items} pending
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {group.dispatched_items} dispatched
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {group.received_items} received
                    </Badge>
                    {group.invalid_items > 0 && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        <ShieldX className="h-3 w-3 mr-1" />
                        {group.invalid_items} invalid
                      </Badge>
                    )}
                    <Badge className="bg-cyan-600">
                      {group.total_items} items
                    </Badge>
                    {selectionMode && getSelectedCountForClient(group) > 0 ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            printClientQRCodes(group, true);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print Selected
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadClientQRCodes(group, true);
                          }}
                        >
                          <DownloadCloud className="h-4 w-4 mr-1" />
                          Download Selected
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            printClientQRCodes(group);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print All
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadClientQRCodes(group);
                          }}
                        >
                          <DownloadCloud className="h-4 w-4 mr-1" />
                          Download All
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {group.items.map((item) => (
                    <QRCodeCard 
                      key={item.id}
                      item={item}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      downloadQRCode={downloadQRCode}
                      onViewFullSize={() => {
                        setSelectedItem(item);
                        setShowQRDialog(true);
                      }}
                      showClientInfo={false}
                      selectionMode={selectionMode}
                      isSelected={selectedItems.has(item.id)}
                      onToggleSelect={() => toggleItemSelection(item.id)}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        /* All QR Codes View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((item) => (
            <QRCodeCard 
              key={item.id}
              item={item}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              downloadQRCode={downloadQRCode}
              onViewFullSize={() => {
                setSelectedItem(item);
                setShowQRDialog(true);
              }}
              showClientInfo={true}
              selectionMode={selectionMode}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleItemSelection(item.id)}
            />
          ))}
        </div>
      )}

      {/* Full Size QR Dialog */}
      <QRCodeFullDialog 
        isOpen={showQRDialog}
        onClose={() => {
          setShowQRDialog(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        downloadQRCode={downloadQRCode}
      />
    </div>
  );
};

// QR Code Card Component with LARGE QR Image and Client Info
const QRCodeCard: React.FC<{
  item: MaterialItem;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
  onViewFullSize: () => void;
  showClientInfo?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}> = ({ item, getStatusColor, getStatusIcon, downloadQRCode, onViewFullSize, showClientInfo = true, selectionMode = false, isSelected = false, onToggleSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item.qr_code) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item.qr_code]);

  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };
  
  const createdDateTime = item.created_at ? formatDateTime(item.created_at) : null;
  
  // Check if QR code is INVALID (both dispatch and receive scanned)
  const isFullyScanned = item.dispatch_scanned && item.receive_scanned;
  const isInvalidated = item.is_invalidated || isFullyScanned;

  return (
    <Card className={`overflow-hidden transition-all border-2 relative ${
      isInvalidated 
        ? 'border-red-400 bg-red-50/50 opacity-75' 
        : isSelected 
          ? 'ring-2 ring-orange-500 bg-orange-50 border-orange-300 hover:shadow-xl' 
          : 'border-slate-200 hover:border-cyan-300 hover:shadow-xl'
    }`}>
      {/* INVALID Overlay for fully scanned QR codes */}
      {isInvalidated && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg transform -rotate-12 border-4 border-red-800">
            <div className="flex items-center gap-2">
              <ShieldX className="h-6 w-6" />
              <span className="text-xl font-bold tracking-wider">INVALID</span>
            </div>
            <p className="text-xs text-center mt-1">QR Code Used</p>
          </div>
        </div>
      )}
      
      {/* Date/Time Header Banner */}
      <div className={`px-4 py-2 flex items-center justify-between ${
        isInvalidated 
          ? 'bg-gradient-to-r from-red-700 to-red-800 text-white' 
          : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-300" />
          <span className="text-sm font-medium">
            {createdDateTime ? `${createdDateTime.date} at ${createdDateTime.time}` : 'Date not available'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-cyan-300" />
          <span className="text-sm font-mono bg-slate-600 px-2 py-0.5 rounded">
            Order #{item.purchase_order_id?.slice(0, 8) || 'N/A'}
          </span>
        </div>
      </div>
      
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectionMode && (
              <Checkbox 
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className="h-5 w-5"
              />
            )}
            <CardTitle className={`text-lg ${isInvalidated ? 'text-red-700 line-through' : ''}`}>
              {item.material_type}
            </CardTitle>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* INVALID Badge - shown prominently when fully scanned */}
            {isInvalidated && (
              <Badge className="bg-red-600 text-white border-red-800 animate-pulse">
                <ShieldX className="h-3 w-3 mr-1" />
                INVALID
              </Badge>
            )}
            {/* Scan Status Indicators */}
            {!isInvalidated && item.dispatch_scanned !== undefined && (
              <Badge 
                variant="outline" 
                className={item.dispatch_scanned ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500'}
                title={item.dispatch_scanned ? `Dispatched: ${new Date(item.dispatch_scanned_at || '').toLocaleString()}` : 'Not dispatched yet'}
              >
                {item.dispatch_scanned ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldX className="h-3 w-3 mr-1" />}
                Dispatch
              </Badge>
            )}
            {!isInvalidated && item.receive_scanned !== undefined && (
              <Badge 
                variant="outline" 
                className={item.receive_scanned ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500'}
                title={item.receive_scanned ? `Received: ${new Date(item.receive_scanned_at || '').toLocaleString()}` : 'Not received yet'}
              >
                {item.receive_scanned ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldX className="h-3 w-3 mr-1" />}
                Receive
              </Badge>
            )}
            {!isInvalidated && (
              <Badge className={getStatusColor(item.status)}>
                {getStatusIcon(item.status)}
                <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">Item #{item.item_sequence}</span>
          <span>•</span>
          <span>{item.category}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Client Info (when showing all QR codes) */}
        {showClientInfo && item.buyer_name && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
            <p className="text-xs text-cyan-600 font-medium mb-1">CLIENT</p>
            <p className="font-semibold text-cyan-800">{item.buyer_name}</p>
            {item.buyer_email && (
              <p className="text-sm text-cyan-600 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {item.buyer_email}
              </p>
            )}
            {item.buyer_phone && (
              <p className="text-sm text-cyan-600 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {item.buyer_phone}
              </p>
            )}
          </div>
        )}

        {/* QR Code and Details Row */}
        <div className="flex gap-4">
          {/* QR Code Image */}
          <div 
            className="p-2 bg-white rounded-lg border-2 border-cyan-200 shadow cursor-pointer hover:scale-[1.02] transition-transform flex-shrink-0"
            onClick={onViewFullSize}
            title="Click to view full size"
          >
            <div className="relative">
              <canvas ref={canvasRef} className="rounded" />
              <div className="absolute -bottom-1 -right-1 bg-cyan-600 text-white p-1 rounded-full shadow">
                <Maximize2 className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-100 p-2 rounded text-center">
                <p className="text-gray-600 text-xs font-medium">Quantity</p>
                <p className="font-bold text-gray-900">{item.quantity} {item.unit}</p>
              </div>
              <div className="bg-gray-100 p-2 rounded text-center">
                <p className="text-gray-600 text-xs font-medium">Category</p>
                <p className="font-bold text-sm text-gray-900">{item.category}</p>
              </div>
            </div>
            {item.item_total_price && item.item_total_price > 0 && (
              <div className="bg-green-100 p-2 rounded text-center border border-green-200">
                <p className="text-green-700 text-xs font-medium">Total Value</p>
                <p className="font-bold text-green-800">KES {item.item_total_price.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Value */}
        <div className="text-center">
          <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded break-all">
            {item.qr_code}
          </p>
        </div>

        {/* QR Code Status Message */}
        {isInvalidated ? (
          <div className="flex items-center gap-2 text-red-700 bg-red-100 border-2 border-red-300 px-3 py-3 rounded-lg text-sm">
            <ShieldX className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-bold">⛔ QR CODE INVALID - DO NOT USE</p>
              <p className="text-xs mt-1">
                This QR code has completed its lifecycle (dispatched & received). 
                It cannot be scanned again and should be discarded.
              </p>
              {item.dispatch_scanned_at && (
                <p className="text-xs text-red-600 mt-1">
                  Dispatched: {new Date(item.dispatch_scanned_at).toLocaleString()}
                </p>
              )}
              {item.receive_scanned_at && (
                <p className="text-xs text-red-600">
                  Received: {new Date(item.receive_scanned_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (item.dispatch_scanned || item.receive_scanned) ? (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {item.dispatch_scanned 
                ? '✓ Dispatch scan completed. Awaiting receive scan.'
                : '✓ Receive scan completed.'}
            </span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={onViewFullSize}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Full Size
          </Button>
          <Button 
            size="sm"
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Full Size QR Dialog for Scanning with Client Info
const QRCodeFullDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
}> = ({ isOpen, onClose, item, downloadQRCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item?.qr_code && isOpen) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 400,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item?.qr_code, isOpen]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QrCode className="h-7 w-7 text-cyan-600" />
            {item.material_type}
          </DialogTitle>
          <DialogDescription className="text-base">
            Unique QR code for this item. Can only be scanned ONCE per scan type.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Client Info Banner */}
          {item.buyer_name && (
            <div className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl p-4">
              <p className="text-sm opacity-80 mb-1">FOR CLIENT</p>
              <p className="text-xl font-bold">{item.buyer_name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                {item.buyer_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" /> {item.buyer_email}
                  </span>
                )}
                {item.buyer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {item.buyer_phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MASSIVE QR Code */}
          <div className="p-6 bg-white rounded-2xl shadow-2xl border-4 border-cyan-300">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
          
          {/* Scan Status */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl text-center ${item.dispatch_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.dispatch_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.dispatch_scanned ? 'text-green-700' : 'text-gray-500'}`}>Dispatch Scan</p>
              </div>
              {item.dispatch_scanned ? (
                <p className="text-sm text-green-600">✓ Scanned {item.dispatch_scanned_at ? new Date(item.dispatch_scanned_at).toLocaleDateString() : ''}</p>
              ) : (
                <p className="text-sm text-gray-500">Not scanned yet</p>
              )}
            </div>
            <div className={`p-4 rounded-xl text-center ${item.receive_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.receive_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.receive_scanned ? 'text-green-700' : 'text-gray-500'}`}>Receive Scan</p>
              </div>
              {item.receive_scanned ? (
                <p className="text-sm text-green-600">✓ Scanned {item.receive_scanned_at ? new Date(item.receive_scanned_at).toLocaleDateString() : ''}</p>
              ) : (
                <p className="text-sm text-gray-500">Not scanned yet</p>
              )}
            </div>
          </div>

          {/* QR Code Value */}
          <div className="w-full text-center">
            <p className="font-mono text-base bg-gray-100 px-4 py-3 rounded-lg break-all">
              {item.qr_code}
            </p>
          </div>
          
          {/* Item Details */}
          <div className="w-full grid grid-cols-3 gap-4">
            <div className="bg-cyan-50 p-4 rounded-xl text-center">
              <p className="text-cyan-600 text-sm font-medium">Item #</p>
              <p className="font-bold text-2xl">{item.item_sequence}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-blue-600 text-sm font-medium">Quantity</p>
              <p className="font-bold text-2xl">{item.quantity} {item.unit}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-green-600 text-sm font-medium">Category</p>
              <p className="font-bold text-xl">{item.category}</p>
            </div>
          </div>

          {/* One-Time Scan Warning */}
          <div className="w-full flex items-center gap-3 text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">One-Time Scan Protection</p>
              <p className="text-sm">Each QR code can only be scanned ONCE for dispatch and ONCE for receiving. This prevents duplicate scans and ensures accurate tracking.</p>
            </div>
          </div>
          
          {/* Download Button */}
          <Button 
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)} 
            className="w-full text-lg py-6 bg-cyan-600 hover:bg-cyan-700" 
            size="lg"
          >
            <Download className="h-6 w-6 mr-3" />
            Download High-Resolution QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Order Accordion Item Component - Reusable for different views
const OrderAccordionItem: React.FC<{
  group: OrderGroup;
  selectionMode: boolean;
  selectedItems: Set<string>;
  areAllOrderItemsSelected: (group: OrderGroup) => boolean;
  deselectAllOrderItems: (group: OrderGroup) => void;
  selectAllOrderItems: (group: OrderGroup) => void;
  getSelectedCountForOrder: (group: OrderGroup) => number;
  printOrderQRCodes: (group: OrderGroup, selectedOnly?: boolean) => void;
  downloadOrderQRCodes: (group: OrderGroup, selectedOnly?: boolean) => void;
  getStatusColor: (status: string) => string;
  setSelectedItem: (item: MaterialItem | null) => void;
  setShowQRDialog: (show: boolean) => void;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
  toggleItemSelection: (itemId: string) => void;
  headerColor?: string;
  headerHoverColor?: string;
  iconBgColor?: string;
  badgeColor?: string;
  showShippedBadge?: boolean;
}> = ({ 
  group, 
  selectionMode, 
  selectedItems, 
  areAllOrderItemsSelected,
  deselectAllOrderItems,
  selectAllOrderItems,
  getSelectedCountForOrder,
  printOrderQRCodes,
  downloadOrderQRCodes,
  getStatusColor,
  setSelectedItem,
  setShowQRDialog,
  downloadQRCode,
  toggleItemSelection,
  printingProgress,
  headerColor = "from-blue-50 via-cyan-50 to-blue-50",
  headerHoverColor = "hover:from-blue-100 hover:to-cyan-100",
  iconBgColor = "from-blue-500 to-cyan-600",
  badgeColor = "from-blue-600 to-cyan-600",
  showShippedBadge = false
}) => {
  const orderDate = group.created_at ? new Date(group.created_at) : null;
  
  return (
    <AccordionItem value={group.order_id} className="border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <AccordionTrigger className={`px-5 py-4 bg-gradient-to-r ${headerColor} ${headerHoverColor}`}>
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${iconBgColor} flex items-center justify-center shadow-lg`}>
              {showShippedBadge ? <Truck className="h-7 w-7 text-white" /> : <Package className="h-7 w-7 text-white" />}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="font-bold text-xl text-slate-800">Order #{group.order_number || 'Loading...'}</p>
                {showShippedBadge && (
                  <Badge className="bg-green-600 text-white">
                    <Truck className="h-3 w-3 mr-1" />
                    SHIPPED
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <User className="h-3 w-3" /> {group.buyer_name}
                </span>
                {orderDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
                {group.delivery_provider_id && (
                  <span className="flex items-center gap-1 text-green-700 font-medium">
                    <Truck className="h-3 w-3" /> {group.delivery_provider_name || 'Delivery Provider'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && (
              <Button 
                size="sm" 
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (areAllOrderItemsSelected(group)) {
                    deselectAllOrderItems(group);
                  } else {
                    selectAllOrderItems(group);
                  }
                }}
              >
                {areAllOrderItemsSelected(group) ? (
                  <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                ) : (
                  <><Square className="h-4 w-4 mr-1" /> Select All ({group.total_items})</>
                )}
              </Button>
            )}
            {selectionMode && getSelectedCountForOrder(group) > 0 && (
              <Badge className="bg-orange-500">
                {getSelectedCountForOrder(group)} selected
              </Badge>
            )}
            {/* Single clear status badge */}
            {group.pending_items > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Dispatch ({group.pending_items})
              </Badge>
            )}
            {group.pending_items === 0 && group.dispatched_items > 0 && group.received_items === 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 font-semibold">
                <Truck className="h-3 w-3 mr-1" />
                Dispatched ({group.dispatched_items})
              </Badge>
            )}
            {group.received_items > 0 && group.received_items < group.total_items && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-semibold">
                <Package className="h-3 w-3 mr-1" />
                In Transit ({group.received_items}/{group.total_items})
              </Badge>
            )}
            {group.received_items === group.total_items && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-semibold">
                <CheckCircle className="h-3 w-3 mr-1" />
                Delivered ({group.total_items})
              </Badge>
            )}
            {/* Print Labels Button with Progress - Only show for awaiting dispatch orders */}
            {group.pending_items > 0 && (
              <Button 
                size="sm" 
                className="ml-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  printOrderQRCodes(group);
                }}
                disabled={printingProgress?.orderId === group.order_id}
              >
                <Printer className="h-4 w-4 mr-1" />
                {printingProgress?.orderId === group.order_id 
                  ? `Printing ${printingProgress.current} of ${printingProgress.total}`
                  : 'Print Labels'
                }
              </Button>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 py-4 bg-gradient-to-b from-slate-50 to-white">
        {/* Order Summary */}
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4 text-blue-600" />
              <strong>Client:</strong> {group.buyer_name}
            </span>
            {group.buyer_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-blue-600" />
                {group.buyer_email}
              </span>
            )}
            {group.buyer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-blue-600" />
                {group.buyer_phone}
              </span>
            )}
          </div>
          {/* Delivery Provider - show for dispatched/in-transit/delivered orders */}
          {(group.delivery_required || group.delivery_provider_id) && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              {group.delivery_provider_id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Truck className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-700">
                    Provider:
                  </span>
                  <span className="text-sm text-slate-700">
                    {group.delivery_provider_name || 'Delivery Provider'}
                    {group.delivery_provider_phone && ` • ${group.delivery_provider_phone}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">
                    Awaiting delivery provider
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {group.items.map((item) => (
            <CompactQRCard 
              key={item.id}
              item={item}
              getStatusColor={getStatusColor}
              onViewFullSize={() => {
                setSelectedItem(item);
                setShowQRDialog(true);
              }}
              downloadQRCode={downloadQRCode}
              selectionMode={selectionMode}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleItemSelection(item.id)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Compact QR Card for Order-Grouped View - smaller, more grid-friendly
const CompactQRCard: React.FC<{
  item: MaterialItem;
  getStatusColor: (status: string) => string;
  onViewFullSize: () => void;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}> = ({ item, getStatusColor, onViewFullSize, downloadQRCode, selectionMode = false, isSelected = false, onToggleSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item.qr_code) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 120,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item.qr_code]);

  const isFullyScanned = item.dispatch_scanned && item.receive_scanned;
  const isInvalidated = item.is_invalidated || isFullyScanned;

  return (
    <Card className={`overflow-hidden transition-all relative ${
      isInvalidated 
        ? 'border-red-400 bg-red-50/50 opacity-60' 
        : isSelected 
          ? 'ring-2 ring-orange-500 bg-orange-50 border-orange-300' 
          : 'border-slate-200 hover:border-cyan-300 hover:shadow-md'
    }`}>
      {/* INVALID Overlay */}
      {isInvalidated && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 text-white px-2 py-1 rounded text-xs font-bold transform -rotate-12">
            USED
          </div>
        </div>
      )}
      
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-1 left-1 z-20">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="h-4 w-4 bg-white"
          />
        </div>
      )}
      
      {/* Compact Header */}
      <div className={`px-2 py-1 text-center text-xs font-medium ${
        isInvalidated ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
      }`}>
        #{item.item_sequence} - {item.material_type.slice(0, 15)}{item.material_type.length > 15 ? '...' : ''}
      </div>
      
      {/* QR Code */}
      <div className="p-2 flex justify-center">
        <div 
          className="cursor-pointer hover:scale-105 transition-transform"
          onClick={onViewFullSize}
          title="Click to view full size"
        >
          <canvas ref={canvasRef} className="rounded" />
        </div>
      </div>
      
      {/* Compact Info */}
      <div className="px-2 pb-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{item.quantity} {item.unit}</span>
          <Badge className={`${getStatusColor(item.status)} text-[10px] px-1 py-0`}>
            {item.status}
          </Badge>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-6 text-[10px] px-1"
            onClick={onViewFullSize}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            className="flex-1 h-6 text-[10px] px-1 bg-cyan-600 hover:bg-cyan-700"
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};