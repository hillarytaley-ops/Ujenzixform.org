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
 */

import { useEffect, useState, useCallback } from 'react';
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

      // Fetch supplier registration - ONLY for current user (uses auth_user_id)
      const { data: supplierReg } = await supabase
        .from('supplier_registrations')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // Fetch orders where this supplier is the vendor - ONLY for current user
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', user.id)
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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch delivery provider profile - ONLY for current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch provider registration - ONLY for current user (uses auth_user_id)
      const { data: providerReg } = await supabase
        .from('delivery_provider_registrations')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // Fetch active deliveries assigned to THIS provider only
      // Database uses driver_id instead of provider_id
      const { data: activeData, error: activeError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      setActiveDeliveries(activeData || []);

      // Fetch completed deliveries for THIS provider only
      const { data: historyData, error: historyError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setDeliveryHistory(historyData || []);

      // Fetch pending requests that this provider can accept
      // (requests in their service area that haven't been assigned)
      const { data: pendingData } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      setPendingRequests(pendingData || []);

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
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to accept a delivery request
  const acceptDelivery = async (deliveryId: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ 
          driver_id: user.id,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('status', 'pending') // Only accept pending requests
        .is('driver_id', null); // Only accept unassigned requests

      if (error) throw error;

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('driver_id', user.id); // CRITICAL: Only update if assigned to this driver

      if (error) throw error;

      await fetchData();
      return { success: true };
    } catch (err: any) {
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


