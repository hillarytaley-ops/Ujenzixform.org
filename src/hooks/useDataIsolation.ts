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
    setLoading(true);
    setError(null);
    
    // Safety timeout - finish loading after 10 seconds max
    const safetyTimeout = setTimeout(() => {
      console.log('📦 useDeliveryProviderData: Safety timeout reached');
      setLoading(false);
    }, 10000);

    try {
      // Fetch delivery provider profile - ONLY for current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch provider registration - ONLY for current user (uses auth_user_id)
      const { data: providerReg } = await supabase
        .from('delivery_provider_registrations')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      // Fetch active deliveries assigned to THIS provider only
      // Database uses provider_id column
      const { data: activeData, error: activeError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('provider_id', userId)
        .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      setActiveDeliveries(activeData || []);

      // Fetch completed deliveries for THIS provider only
      // ORDER BY: Most recent deliveries first (completed_at or updated_at descending)
      const { data: historyData, error: historyError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('provider_id', userId)
        .in('status', ['delivered', 'completed', 'cancelled']) // Include all past statuses
        .order('updated_at', { ascending: false }) // Most recent first
        .limit(100); // Increased limit for better history view

      if (historyError) throw historyError;
      
      // Sort by completed_at if available, otherwise by updated_at (most recent first)
      const sortedHistory = (historyData || []).sort((a: any, b: any) => {
        const dateA = new Date(a.completed_at || a.delivered_at || a.updated_at || a.created_at);
        const dateB = new Date(b.completed_at || b.delivered_at || b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime(); // Descending (most recent first)
      });
      
      console.log('📦 Delivery history loaded:', sortedHistory.length, 'items (most recent first)');
      setDeliveryHistory(sortedHistory);

      // Fetch ALL pending requests from multiple tables for testing
      // All registered providers can see and accept any pending request
      // Use direct REST API to bypass potential RLS issues
      
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.access_token) {
            accessToken = parsed.access_token;
          }
        }
      } catch (e) {
        console.warn('Could not get auth token');
      }
      
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
      const { error } = await supabase
        .from('delivery_requests')
        .update({ 
          provider_id: userId,
          status: 'assigned',
          accepted_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('status', 'pending') // Only accept pending requests
        .is('provider_id', null); // Only accept unassigned requests

      if (error) throw error;

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


