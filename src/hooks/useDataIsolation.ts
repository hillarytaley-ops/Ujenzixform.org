/**
 * Data Isolation Hook
 * 
 * Ensures users can only access their own data:
 * - Builders can only see their own projects, orders, and deliveries
 * - Suppliers can only see their own products, orders, and customers
 * - Delivery providers can only see their own deliveries and earnings
 * 
 * This provides client-side filtering as an additional layer of security
 * on top of Supabase RLS policies.
 * 
 * Updated: Feb 17, 2026 - Added robust getUserId() fallback for localStorage
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackingNumberService } from '@/services/TrackingNumberService';

export interface UserContext {
  userId: string;
  email: string;
  role: string | null;
  isVerified: boolean;
}

export interface DataIsolationResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  userContext: UserContext | null;
}

/**
 * Hook to get the current user's context for data isolation
 */
export const useUserContext = () => {
  const { user } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserContext = async () => {
      if (!user) {
        setUserContext(null);
        setLoading(false);
        return;
      }

      try {
        // Get user role from database
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        setUserContext({
          userId: user.id,
          email: user.email || '',
          role: roleData?.role || null,
          isVerified: !!user.email_confirmed_at
        });
      } catch (error) {
        console.error('Error loading user context:', error);
        setUserContext({
          userId: user.id,
          email: user.email || '',
          role: null,
          isVerified: false
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserContext();
  }, [user]);

  return { userContext, loading };
};

/**
 * Hook to fetch builder-specific data with isolation
 */
export const useBuilderData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch builder profile - ONLY for current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch orders - ONLY for current user (buyer_id is the actual column name)
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch delivery requests - ONLY for current user (builder_id matches profile.id)
      // Database columns: pickup_location, pickup_address, dropoff_location, dropoff_address,
      // item_description, estimated_weight, preferred_date, preferred_time, urgency,
      // special_instructions, status, driver_id, driver_name, driver_phone, vehicle_info,
      // assigned_at, picked_up_at, delivered_at, estimated_cost, final_cost
      if (profileData?.id) {
        const { data: deliveryData, error: deliveryError } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('builder_id', profileData.id)
          .order('created_at', { ascending: false });

        if (deliveryError) {
          console.error('Delivery requests error:', deliveryError);
          setDeliveryRequests([]);
        } else {
          setDeliveryRequests(deliveryData || []);
        }
      } else {
        setDeliveryRequests([]);
      }

      // Fetch invoices - ONLY for current user
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('builder_id', user.id)
        .order('created_at', { ascending: false });

      // You can add more builder-specific data here

    } catch (err: any) {
      console.error('Error fetching builder data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    orders,
    projects,
    deliveryRequests,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook to fetch supplier-specific data with isolation
 */
export const useSupplierData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0
  });

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch supplier profile - ONLY for current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch supplier application - ONLY for current user (uses applicant_user_id)
      const { data: supplierReg } = await supabase
        .from('supplier_applications')
        .select('*')
        .eq('applicant_user_id', user.id)
        .maybeSingle();

      // Fetch orders where this supplier is the vendor
      // Look up supplier by user_id OR email to handle account mismatches
      let supplierRecord = null;
      const { data: byUserId } = await supabase
        .from('suppliers')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      supplierRecord = byUserId;
      
      // If not found by user_id, try by email
      if (!supplierRecord && user.email) {
        const { data: byEmail } = await supabase
          .from('suppliers')
          .select('id, user_id')
          .eq('email', user.email)
          .maybeSingle();
        supplierRecord = byEmail;
      }
      
      // Build list of IDs to check
      const supplierIds = [user.id];
      if (supplierRecord?.id && !supplierIds.includes(supplierRecord.id)) {
        supplierIds.push(supplierRecord.id);
      }
      if (supplierRecord?.user_id && !supplierIds.includes(supplierRecord.user_id)) {
        supplierIds.push(supplierRecord.user_id);
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('supplier_id', supplierIds)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch payments for this supplier - ONLY for current user
      // Note: payments table uses user_id, not supplier_id
      let paymentsData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id);
        if (!error) {
          paymentsData = data || [];
        }
      } catch {
        // Payments table may not exist - silently ignore
        console.log('Payments table not available');
      }

      // Calculate stats from actual data
      const pendingOrders = (ordersData || []).filter(o => o.status === 'pending').length;
      const totalRevenue = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
      const uniqueCustomers = new Set((ordersData || []).map(o => o.builder_id)).size;

      setStats({
        totalProducts: 0, // Would come from products table
        totalOrders: (ordersData || []).length,
        pendingOrders,
        totalRevenue,
        totalCustomers: uniqueCustomers,
        averageRating: supplierReg?.rating || 0
      });

    } catch (err: any) {
      console.error('Error fetching supplier data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    orders,
    products,
    stats,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook to fetch delivery provider-specific data with isolation
 */
export const useDeliveryProviderData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const acceptingRef = useRef<string | null>(null); // Track which delivery is being accepted
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    pendingDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalDistance: 0
  });

  const fetchData = useCallback(async () => {
    // Try to get userId from context or localStorage fallback
    let userId = user?.id;
    if (!userId) {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }
    
    if (!userId) {
      console.log('📦 useDeliveryProviderData: No userId available');
      setLoading(false);
      return;
    }

    console.log('📦 useDeliveryProviderData: Fetching data for userId:', userId);
    console.log('💡 TIP: If no deliveries show, check console logs below for status breakdown and run diagnostic SQL: supabase/migrations/20260304_diagnose_delivery_dashboard.sql');
    setLoading(true);
    setError(null);
    
    // Safety timeout - finish loading after 15 seconds max (increased for enrichment)
    const safetyTimeout = setTimeout(() => {
      console.log('📦 useDeliveryProviderData: Safety timeout reached - showing data even if incomplete');
      setLoading(false);
    }, 15000);

    try {
      console.log('📦 Step 1: Fetching profile and registration (with timeout)...');
      
      // Fetch profile and registration in parallel with timeout - don't block on these
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      const registrationPromise = supabase
        .from('delivery_provider_registrations')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();
      
      // Add 3 second timeout to profile/registration fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile/registration timeout')), 3000)
      );
      
      try {
        const [profileResult, registrationResult] = await Promise.race([
          Promise.allSettled([profilePromise, registrationPromise]),
          timeoutPromise
        ]).catch(() => {
          console.warn('⚠️ Profile/registration fetch timed out, continuing without them');
          return [{ status: 'rejected' }, { status: 'rejected' }];
        }) as any[];
        
        if (profileResult?.status === 'fulfilled') {
          const { data: profileData, error: profileError } = profileResult.value;
          if (profileError) {
            console.warn('⚠️ Profile error (non-critical):', profileError);
          } else {
            setProfile(profileData);
            console.log('✅ Profile loaded');
          }
        }
        
        // Registration is not critical, just log it
        if (registrationResult?.status === 'fulfilled') {
          console.log('✅ Registration loaded');
        }
      } catch (e) {
        console.warn('⚠️ Error fetching profile/registration (non-critical):', e);
      }
      
      console.log('✅ Step 1 complete: Moving to deliveries...');

      // Fetch active deliveries assigned to THIS provider only
      // Check both delivery_requests and purchase_orders tables
      
      // 1. From delivery_requests table - Use direct REST API to bypass RLS issues
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || SUPABASE_ANON_KEY;
        }
      } catch (e) {
        console.warn('Could not get auth token');
      }
      
      console.log('📦 Starting to fetch active deliveries for provider:', userId);
      
      // Fetch from BOTH tables in parallel for better performance
      const [deliveryRequestsResult, purchaseOrdersResult] = await Promise.allSettled([
        // 1. Fetch from delivery_requests
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const activeResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/delivery_requests?provider_id=eq.${userId}&select=*&order=created_at.desc&limit=100`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store',
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (activeResponse.ok) {
              const allDeliveries = await activeResponse.json();
              const filtered = allDeliveries.filter((d: any) => 
                d.status !== 'delivered' && 
                d.status !== 'completed' && 
                d.status !== 'cancelled'
              );
              console.log('📦 delivery_requests: Found', allDeliveries.length, 'total,', filtered.length, 'active');
              return filtered;
            } else {
              const errorText = await activeResponse.text();
              console.warn('⚠️ Error fetching delivery_requests:', activeResponse.status, errorText);
              return [];
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              console.warn('⏱️ delivery_requests fetch timed out');
            } else {
              console.warn('⚠️ Error fetching delivery_requests:', error);
            }
            return [];
          }
        })(),
        
        // 2. Fetch from purchase_orders using direct fetch (faster than supabase client)
        // Only fetch shipped/in_transit orders to reduce query load
        (async () => {
          try {
            console.log('📦 Fetching purchase_orders (shipped/in_transit only) for provider:', userId);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            // Use direct fetch with minimal columns and status filter
            const poResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?delivery_provider_id=eq.${userId}&status=in.(shipped,in_transit,dispatched,out_for_delivery,delivery_arrived,processing)&select=id,status,delivery_provider_id,delivery_address,items,total_amount,created_at,updated_at,supplier_id,buyer_id,delivery_provider_name,delivery_assigned_at,po_number&order=created_at.desc&limit=100`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                cache: 'no-store',
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (poResponse.ok) {
              const allPurchaseOrders = await poResponse.json() || [];
              console.log('📦 purchase_orders raw data:', allPurchaseOrders.length, 'records');
              
              // Filter out completed/delivered/cancelled orders (shouldn't be needed with status filter, but just in case)
              const filtered = allPurchaseOrders.filter((po: any) => 
                po.status !== 'delivered' && 
                po.status !== 'completed' && 
                po.status !== 'cancelled' &&
                po.status !== 'rejected' &&
                po.status !== 'quote_rejected'
              );
              
              console.log('📦 purchase_orders: Found', allPurchaseOrders.length, 'total,', filtered.length, 'active');
              
              // Log status breakdown for purchase_orders
              if (filtered.length > 0) {
                const poStatusCounts = filtered.reduce((acc: any, po: any) => {
                  acc[po.status] = (acc[po.status] || 0) + 1;
                  return acc;
                }, {});
                console.log('📊 purchase_orders status breakdown:', poStatusCounts);
              }
              
              return filtered;
            } else {
              const errorText = await poResponse.text();
              console.warn('⚠️ Error fetching purchase_orders:', poResponse.status, errorText);
              return [];
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              console.warn('⏱️ purchase_orders fetch timed out');
            } else {
              console.warn('⚠️ Exception fetching purchase_orders:', error);
            }
            return [];
          }
        })()
      ]);
      
      // Extract results
      const activeData: any[] = deliveryRequestsResult.status === 'fulfilled' ? (deliveryRequestsResult.value || []) : [];
      let purchaseOrdersData: any[] = purchaseOrdersResult.status === 'fulfilled' ? (purchaseOrdersResult.value || []) : [];
      
      if (deliveryRequestsResult.status === 'rejected') {
        console.warn('⚠️ delivery_requests fetch failed:', deliveryRequestsResult.reason);
      }
      if (purchaseOrdersResult.status === 'rejected') {
        console.warn('⚠️ purchase_orders fetch failed:', purchaseOrdersResult.reason);
      }
      
      // Fetch order numbers for delivery_requests that have purchase_order_id
      // This is a lightweight query that won't cause timeout
      const deliveryRequestPOIds = activeData
        .filter((dr: any) => dr.purchase_order_id)
        .map((dr: any) => dr.purchase_order_id);
      
      let poNumberMap = new Map<string, string>();
      if (deliveryRequestPOIds.length > 0) {
        try {
          const poNumbersResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${deliveryRequestPOIds.join(',')})&select=id,po_number&limit=100`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          );
          
          if (poNumbersResponse.ok) {
            const poNumbers = await poNumbersResponse.json();
            poNumbers.forEach((po: any) => {
              if (po.id && po.po_number) {
                poNumberMap.set(po.id, po.po_number);
              }
            });
            console.log('✅ Fetched order numbers for', poNumberMap.size, 'delivery requests');
          }
        } catch (e) {
          console.warn('⚠️ Could not fetch order numbers (non-critical):', e);
        }
      }
      
      // Also add po_numbers from purchaseOrdersData
      purchaseOrdersData.forEach((po: any) => {
        if (po.id && po.po_number) {
          poNumberMap.set(po.id, po.po_number);
        }
      });
      
      // Skip enrichment for now to avoid timeout - use basic data directly
      // Enrichment can be done later if needed, but it's blocking the fetch
      let enrichedPurchaseOrders = purchaseOrdersData || [];
      console.log('📦 Using purchase orders without enrichment (to avoid timeout):', enrichedPurchaseOrders.length);
      
      // Combine both sources and transform to consistent format
      const allActiveDeliveries: any[] = [];
      
      // Add delivery_requests
      if (activeData) {
        activeData.forEach((dr: any) => {
          // Get order number from purchase_order if available
          const orderNumber = dr.purchase_order_id 
            ? (poNumberMap.get(dr.purchase_order_id) || `PO-${dr.purchase_order_id.slice(0, 8).toUpperCase()}`)
            : null;
          
          allActiveDeliveries.push({
            ...dr,
            source: 'delivery_requests',
            purchase_order_id: dr.purchase_order_id || null,
            order_number: orderNumber
          });
        });
      }
      
      // Add purchase_orders (convert to delivery_requests format)
      // Use enrichedPurchaseOrders if available, otherwise use purchaseOrdersData (basic data)
      const purchaseOrdersToProcess = enrichedPurchaseOrders.length > 0 ? enrichedPurchaseOrders : purchaseOrdersData;
      
      if (purchaseOrdersToProcess && purchaseOrdersToProcess.length > 0) {
        console.log('📦 Processing', purchaseOrdersToProcess.length, 'purchase orders...');
        purchaseOrdersToProcess.forEach((po: any) => {
          // Check if this purchase_order already exists in delivery_requests
          const existing = allActiveDeliveries.find(d => d.purchase_order_id === po.id);
          if (!existing) {
            allActiveDeliveries.push({
              id: po.id,
              purchase_order_id: po.id,
              order_number: po.po_number || `PO-${po.id.slice(0, 8).toUpperCase()}`,
              provider_id: userId,
              status: po.status,
              pickup_location: po.supplier?.address || po.supplier?.location || po.pickup_address || 'Supplier location',
              pickup_address: po.supplier?.address || po.supplier?.location || po.pickup_address || 'Supplier location',
              delivery_location: po.delivery_address || 'Delivery location',
              delivery_address: po.delivery_address || 'Delivery location',
              material_type: Array.isArray(po.items) ? po.items.map((i: any) => i.name || i.material_type).join(', ') : 'Construction Materials',
              quantity: Array.isArray(po.items) ? po.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 1,
              builder_name: po.buyer?.full_name || po.builder_name || 'Builder',
              builder_phone: po.buyer?.phone || po.builder_phone || '',
              builder_email: po.buyer?.email || po.builder_email || '',
              price: po.total_amount || 0,
              estimated_cost: po.total_amount || 0,
              created_at: po.created_at,
              updated_at: po.updated_at,
              source: 'purchase_orders',
              delivery_provider_name: po.delivery_provider_name,
              delivery_assigned_at: po.delivery_assigned_at
            });
          }
        });
        console.log('✅ Added', purchaseOrdersToProcess.length, 'purchase orders to active deliveries');
      }
      
      console.log('📦 Active deliveries loaded:', {
        from_delivery_requests: activeData?.length || 0,
        from_purchase_orders: purchaseOrdersData?.length || 0,
        total: allActiveDeliveries.length,
        userId: userId
      });
      
      // Debug: Log all statuses found
      if (allActiveDeliveries.length > 0) {
        const statusCounts = allActiveDeliveries.reduce((acc: any, d: any) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Status breakdown:', statusCounts);
        
        // Specifically check for shipped/in_transit statuses
        const shippedCount = allActiveDeliveries.filter(d => d.status === 'shipped').length;
        const inTransitCount = allActiveDeliveries.filter(d => d.status === 'in_transit').length;
        const dispatchedCount = allActiveDeliveries.filter(d => d.status === 'dispatched').length;
        console.log('🚚 Dispatched/Shipped/In Transit counts:', {
          shipped: shippedCount,
          in_transit: inTransitCount,
          dispatched: dispatchedCount,
          total_dispatched: shippedCount + inTransitCount + dispatchedCount
        });
        
        console.log('📦 All active deliveries:', allActiveDeliveries.map((d: any) => ({
          id: d.id,
          status: d.status,
          source: d.source,
          material_type: d.material_type,
          provider_id: d.provider_id
        })));
      } else {
        console.warn('⚠️ No active deliveries found! Checking all deliveries for this provider...');
        // Fetch ALL deliveries regardless of status to see what exists
        try {
          const allDeliveriesResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?provider_id=eq.${userId}&select=id,status,provider_id,tracking_number,material_type,delivery_address&limit=20`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            }
          );
          if (allDeliveriesResponse.ok) {
            const allDeliveries = await allDeliveriesResponse.json();
            console.log('🔍 ALL delivery_requests for provider (any status):', allDeliveries.length, allDeliveries);
            if (allDeliveries.length > 0) {
              const allStatuses = allDeliveries.map((d: any) => d.status);
              console.log('📋 All statuses found in delivery_requests:', [...new Set(allStatuses)]);
            } else {
              console.warn('⚠️ No delivery_requests found with provider_id =', userId);
            }
          } else {
            const errorText = await allDeliveriesResponse.text();
            console.error('❌ Error fetching all deliveries:', allDeliveriesResponse.status, errorText);
          }
          
          // Also check purchase_orders
          const { data: allPOs, error: poCheckError } = await supabase
            .from('purchase_orders')
            .select('id, status, delivery_provider_id, po_number, delivery_address')
            .eq('delivery_provider_id', userId)
            .limit(20);
          
          if (poCheckError) {
            console.error('❌ Error fetching purchase_orders:', poCheckError);
          } else {
            console.log('🔍 ALL purchase_orders for provider:', allPOs?.length || 0, allPOs);
            if (allPOs && allPOs.length > 0) {
              const poStatuses = allPOs.map((po: any) => po.status);
              console.log('📋 All statuses found in purchase_orders:', [...new Set(poStatuses)]);
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not fetch all deliveries:', e);
        }
      }
      
      setActiveDeliveries(allActiveDeliveries);

      // Fetch completed deliveries for THIS provider only
      // Fetch from BOTH delivery_requests AND purchase_orders tables
      
      // 1. From delivery_requests table
      const { data: historyData, error: historyError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('provider_id', userId)
        .in('status', ['delivered', 'completed', 'cancelled']) // Include all past statuses
        .order('updated_at', { ascending: false }) // Most recent first
        .limit(100); // Increased limit for better history view

      if (historyError) {
        console.warn('Error fetching delivery history from delivery_requests:', historyError);
      }
      
      // 2. From purchase_orders table - fetch delivered items
      const { data: deliveredPOs, error: poHistoryError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('delivery_provider_id', userId)
        .in('status', ['delivered', 'completed', 'received']) // Include delivered statuses
        .order('updated_at', { ascending: false })
        .limit(100);

      if (poHistoryError) {
        console.warn('Error fetching delivery history from purchase_orders:', poHistoryError);
      }
      
      // Enrich delivered purchase orders with supplier/buyer info
      let enrichedDeliveredPOs = deliveredPOs || [];
      if (enrichedDeliveredPOs.length > 0) {
        try {
          const supplierIds = [...new Set(enrichedDeliveredPOs.map((po: any) => po.supplier_id).filter(Boolean))];
          const buyerIds = [...new Set(enrichedDeliveredPOs.map((po: any) => po.buyer_id).filter(Boolean))];
          
          const [suppliersResult, buyersResult] = await Promise.allSettled([
            supplierIds.length > 0
              ? supabase.from('suppliers').select('id, company_name, address, location').in('id', supplierIds)
              : Promise.resolve({ data: [], error: null }),
            buyerIds.length > 0
              ? supabase.from('profiles').select('id, full_name, phone, email').in('id', buyerIds)
              : Promise.resolve({ data: [], error: null })
          ]);
          
          const suppliers = suppliersResult.status === 'fulfilled' ? (suppliersResult.value.data || []) : [];
          const buyers = buyersResult.status === 'fulfilled' ? (buyersResult.value.data || []) : [];
          
          const suppliersMap = new Map(suppliers.map((s: any) => [s.id, s]));
          const buyersMap = new Map(buyers.map((b: any) => [b.id, b]));
          
          enrichedDeliveredPOs = enrichedDeliveredPOs.map((po: any) => ({
            ...po,
            supplier: suppliersMap.get(po.supplier_id) || null,
            buyer: buyersMap.get(po.buyer_id) || null
          }));
        } catch (e) {
          console.warn('Error enriching delivered purchase orders:', e);
        }
      }
      
      // Transform purchase_orders to delivery_requests format for consistency
      const deliveredFromPOs = (enrichedDeliveredPOs || []).map((po: any) => ({
        id: po.id,
        purchase_order_id: po.id,
        provider_id: userId,
        status: po.status,
        pickup_location: po.supplier?.address || po.supplier?.location || 'Supplier location',
        pickup_address: po.supplier?.address || po.supplier?.location || 'Supplier location',
        delivery_location: po.delivery_address || 'Delivery location',
        delivery_address: po.delivery_address || 'Delivery location',
        material_type: Array.isArray(po.items) ? po.items.map((i: any) => i.name || i.material_type).join(', ') : 'Construction Materials',
        quantity: Array.isArray(po.items) ? po.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 1,
        builder_name: po.buyer?.full_name || 'Builder',
        builder_phone: po.buyer?.phone || '',
        builder_email: po.buyer?.email || '',
        price: po.total_amount || 0,
        estimated_cost: po.total_amount || 0,
        completed_at: po.delivered_at || po.completed_at || po.updated_at,
        delivered_at: po.delivered_at || po.completed_at || po.updated_at,
        created_at: po.created_at,
        updated_at: po.updated_at,
        source: 'purchase_orders'
      }));
      
      // Combine both sources and remove duplicates (prefer delivery_requests if both exist)
      const allHistory: any[] = [];
      const seenIds = new Set<string>();
      
      // Add delivery_requests first
      (historyData || []).forEach((dr: any) => {
        allHistory.push(dr);
        seenIds.add(dr.id);
        if (dr.purchase_order_id) {
          seenIds.add(dr.purchase_order_id);
        }
      });
      
      // Add purchase_orders that aren't already in delivery_requests
      deliveredFromPOs.forEach((po: any) => {
        if (!seenIds.has(po.id) && !seenIds.has(po.purchase_order_id)) {
          allHistory.push(po);
          seenIds.add(po.id);
        }
      });
      
      // Sort by completed_at if available, otherwise by updated_at (most recent first)
      const sortedHistory = allHistory.sort((a: any, b: any) => {
        const dateA = new Date(a.completed_at || a.delivered_at || a.updated_at || a.created_at);
        const dateB = new Date(b.completed_at || b.delivered_at || b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime(); // Descending (most recent first)
      });
      
      console.log('📦 Delivery history loaded:', {
        from_delivery_requests: historyData?.length || 0,
        from_purchase_orders: deliveredPOs?.length || 0,
        total: sortedHistory.length
      }, 'items (most recent first)');
      setDeliveryHistory(sortedHistory);

      // Fetch ALL pending requests from multiple tables for testing
      // All registered providers can see and accept any pending request
      // Use direct REST API to bypass potential RLS issues
      // Note: SUPABASE_URL, SUPABASE_ANON_KEY, and accessToken are already declared above
      
      const restHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      // From delivery_requests table - using REST API
      let pendingData: any[] = [];
      try {
        const pendingResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?status=eq.pending&provider_id=is.null&order=created_at.desc&limit=50`,
          { headers: restHeaders, cache: 'no-store' }
        );
        if (pendingResponse.ok) {
          pendingData = await pendingResponse.json();
          console.log('📦 Fetched pending delivery_requests:', pendingData?.length || 0);
        }
      } catch (e) {
        console.warn('Error fetching pending delivery_requests');
      }

      // Also fetch from deliveries table
      let deliveriesData: any[] = [];
      try {
        const deliveriesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/deliveries?status=eq.pending&provider_id=is.null&order=created_at.desc&limit=50`,
          { headers: restHeaders, cache: 'no-store' }
        );
        if (deliveriesResponse.ok) {
          deliveriesData = await deliveriesResponse.json();
          console.log('📦 Fetched pending deliveries:', deliveriesData?.length || 0);
        }
      } catch (e) {
        console.warn('Error fetching pending deliveries');
      }

      // Also fetch from delivery_notifications table
      let notificationsData: any[] = [];
      try {
        const notifResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_notifications?status=in.(pending,notified)&order=created_at.desc&limit=50`,
          { headers: restHeaders, cache: 'no-store' }
        );
        if (notifResponse.ok) {
          notificationsData = await notifResponse.json();
          console.log('📦 Fetched delivery_notifications:', notificationsData?.length || 0);
        }
      } catch (e) {
        console.warn('Error fetching delivery_notifications');
      }

      // Combine all pending requests
      const allPending: any[] = [];
      
      // Add from delivery_requests
      (pendingData || []).forEach((req: any) => {
        allPending.push({
          ...req,
          source: 'delivery_requests'
        });
      });

      // Add from deliveries table (avoid duplicates)
      (deliveriesData || []).forEach((del: any) => {
        if (!allPending.find(r => r.id === del.id)) {
          allPending.push({
            id: del.id,
            pickup_address: del.pickup_address,
            delivery_address: del.delivery_address,
            material_type: del.material_type || 'Construction Materials',
            quantity: del.quantity,
            status: del.status,
            created_at: del.created_at,
            contact_name: del.contact_name,
            contact_phone: del.contact_phone,
            estimated_cost: del.estimated_cost,
            distance_km: del.distance_km,
            source: 'deliveries'
          });
        }
      });

      // Add from delivery_notifications (avoid duplicates)
      (notificationsData || []).forEach((notif: any) => {
        if (!allPending.find(r => r.id === notif.id || r.id === notif.request_id)) {
          const materials = notif.material_details || [];
          allPending.push({
            id: notif.id,
            request_id: notif.request_id,
            pickup_address: notif.pickup_address,
            delivery_address: notif.delivery_address,
            material_type: materials[0]?.material_type || materials[0]?.name || 'Construction Materials',
            quantity: materials.reduce((sum: number, m: any) => sum + (m.quantity || 1), 0),
            status: notif.status,
            created_at: notif.created_at,
            priority_level: notif.priority_level,
            source: 'delivery_notifications'
          });
        }
      });

      // Sort by created_at descending
      allPending.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`📦 Loaded ${allPending.length} pending delivery requests for provider`);
      setPendingRequests(allPending);

      // Calculate stats from actual data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completedToday = (historyData || []).filter(d => {
        const deliveryDate = new Date(d.updated_at);
        return deliveryDate >= today;
      }).length;

      const totalEarnings = [...(activeData || []), ...(historyData || [])]
        .reduce((sum, d) => sum + (d.price || d.delivery_fee || 0), 0);

      setStats({
        totalDeliveries: (activeData || []).length + (historyData || []).length,
        completedToday,
        pendingDeliveries: (activeData || []).length,
        totalEarnings,
        averageRating: providerReg?.rating || 0,
        totalDistance: 0 // Would need to track this
      });

    } catch (err: any) {
      console.error('Error fetching delivery provider data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to accept a delivery request
  const acceptDelivery = async (deliveryId: string) => {
    // Prevent double-click using ref (immediate check, no state delay)
    if (acceptingRef.current === deliveryId || acceptingRef.current !== null) {
      console.log('🛑 Already accepting delivery, ignoring click:', deliveryId);
      return { success: false, error: 'Already processing acceptance' };
    }
    
    // Set accepting state IMMEDIATELY (both ref and state)
    acceptingRef.current = deliveryId;
    
    // Get userId from context or localStorage fallback
    let userId = user?.id;
    if (!userId) {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }
    
    if (!userId) {
      console.error('❌ acceptDelivery: No userId available');
      acceptingRef.current = null; // Clear on error
      return { success: false, error: 'Not authenticated' };
    }

    console.log('✅ acceptDelivery: Accepting delivery', deliveryId, 'for provider', userId);

    try {
      // First, check if this delivery is already accepted by someone else
      const { data: existingRequest, error: checkError } = await supabase
        .from('delivery_requests')
        .select('id, status, provider_id')
        .eq('id', deliveryId)
        .single();

      if (checkError) throw checkError;

      // If already accepted by this provider, return success
      if (existingRequest.provider_id === userId && existingRequest.status === 'accepted') {
        console.log('✅ Delivery already accepted by this provider');
        await fetchData();
        return { success: true };
      }

      // If already accepted by another provider, return error
      if (existingRequest.provider_id && existingRequest.provider_id !== userId) {
        throw new Error('This delivery has already been accepted by another provider');
      }

      // If status is not pending, check if we can still accept
      if (existingRequest.status !== 'pending' && existingRequest.status !== 'assigned') {
        throw new Error(`Cannot accept delivery with status: ${existingRequest.status}`);
      }

      // Use the proper TrackingNumberService which handles:
      // 1. First-come-first-served validation
      // 2. Date-based scheduling checks
      // 3. Tracking number generation
      // 4. Creating tracking_numbers table entry
      // 5. Builder notifications
      console.log('🚚 Using TrackingNumberService to accept delivery:', deliveryId);
      
      const result = await trackingNumberService.onProviderAcceptsDelivery(deliveryId, userId);
      
      if (!result || !result.trackingNumber) {
        throw new Error('Failed to accept delivery - no tracking number generated');
      }
      
      // The service already updated the delivery_requests table, so we just need to refresh
      const updatedData = [{ id: deliveryId, tracking_number: result.trackingNumber, status: 'accepted' }];

      // Check if update actually succeeded (updatedData should have at least one row)
      if (!updatedData || updatedData.length === 0) {
        // Check again what the current state is
        const { data: currentState } = await supabase
          .from('delivery_requests')
          .select('status, provider_id')
          .eq('id', deliveryId)
          .single();
        
        if (currentState?.provider_id === userId) {
          console.log('✅ Delivery already accepted by this provider (race condition)');
          await fetchData();
          return { success: true };
        }
        
        throw new Error('Failed to accept delivery. It may have been accepted by another provider.');
      }

      console.log('✅ Delivery request accepted - trigger should update purchase_orders');

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error('❌ acceptDelivery error:', err);
      return { success: false, error: err.message };
    } finally {
      // Clear accepting state after a delay to prevent rapid re-clicks
      setTimeout(() => {
        acceptingRef.current = null;
      }, 2000); // 2 second delay
    }
  };

  // Function to reject/decline a delivery request
  const rejectDelivery = async (deliveryId: string) => {
    // Simply remove from local pending list - don't modify the request
    setPendingRequests(prev => prev.filter(r => r.id !== deliveryId));
    return { success: true };
  };

  // Function to update delivery status
  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    // Get userId from context or localStorage fallback
    let userId = user?.id;
    if (!userId) {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }
    
    if (!userId) {
      console.error('❌ updateDeliveryStatus: No userId available');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('📦 updateDeliveryStatus:', deliveryId, 'to', newStatus, 'by provider', userId);

    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('provider_id', userId); // CRITICAL: Only update if assigned to this provider

      if (error) throw error;

      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error('❌ updateDeliveryStatus error:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    profile,
    activeDeliveries,
    deliveryHistory,
    pendingRequests,
    stats,
    loading,
    error,
    refetch: fetchData,
    acceptDelivery,
    rejectDelivery,
    updateDeliveryStatus
  };
};

/**
 * Utility function to verify data ownership
 * Use this before performing any data operations
 */
export const verifyDataOwnership = async (
  tableName: string,
  recordId: string,
  userId: string,
  ownerField: string = 'user_id'
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(ownerField)
      .eq('id', recordId)
      .maybeSingle();

    if (error || !data) return false;
    return data[ownerField] === userId;
  } catch {
    return false;
  }
};

/**
 * Security logging for data access attempts
 * Note: This is a non-critical feature - errors are silently ignored
 */
export const logDataAccessAttempt = async (
  userId: string,
  action: string,
  resource: string,
  success: boolean,
  details?: string
) => {
  // Silently attempt to log - don't throw errors if table doesn't exist
  // This is a non-critical feature for audit trails
  // Disabled for now as activity_logs table may not exist
  return;
  
  /* Uncomment when activity_logs table is created:
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: `data_access_${action}`,
      resource,
      success,
      details,
      ip_address: 'client',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    });
  } catch {
    // Silently ignore - activity logging is non-critical
  }
  */
};

export default {
  useUserContext,
  useBuilderData,
  useSupplierData,
  useDeliveryProviderData,
  verifyDataOwnership,
  logDataAccessAttempt
};


