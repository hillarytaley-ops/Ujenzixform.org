import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecureDeliveryInfo {
  id: string;
  tracking_number: string;
  material_type: string;
  quantity: number;
  weight_kg?: number;
  pickup_address: string;
  delivery_address: string;
  status: string;
  pickup_date?: string;
  delivery_date?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  vehicle_details?: string;
  notes?: string;
  builder_id: string;
  supplier_id?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  has_driver_assigned: boolean;
  driver_access_message: string;
}

interface SafeDeliveryListing {
  id: string;
  tracking_number: string;
  material_type: string;
  quantity: number;
  status: string;
  pickup_date?: string;
  delivery_date?: string;
  estimated_delivery_time?: string;
  created_at: string;
  builder_id: string;
  supplier_id?: string;
  has_driver_assigned: boolean;
  general_location: string;
  can_request_driver_contact: boolean;
}

interface UseSecureDeliveryDataResult {
  deliveries: SafeDeliveryListing[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userRole: string | null;
  getDeliveryDetails: (deliveryId: string) => Promise<SecureDeliveryInfo | null>;
  refreshDeliveries: () => void;
}

export const useSecureDeliveryData = (): UseSecureDeliveryDataResult => {
  const [deliveries, setDeliveries] = useState<SafeDeliveryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        setUserRole((roleData?.role as any) || null);

        // Use enhanced secure delivery listings function
        const { data, error: fetchError } = await supabase
          .rpc('get_secure_delivery_listings');

        if (fetchError) {
          throw fetchError;
        }

        setDeliveries(data || []);
      } else {
        setDeliveries([]);
        setUserRole(null);
      }
    } catch (err) {
      console.error('Error fetching secure delivery data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryDetails = async (deliveryId: string): Promise<SecureDeliveryInfo | null> => {
    try {
      // Use enhanced secure function that properly protects driver data
      const { data, error } = await supabase
        .rpc('get_delivery_with_secure_driver_info', { delivery_uuid: deliveryId });

      if (error) {
        console.error('Error fetching delivery details:', error);
        return null;
      }

      const rawData = data?.[0];
      if (!rawData) return null;

      // Map to new security model
      return {
        ...rawData,
        has_driver_assigned: !!rawData.driver_contact_info,
        driver_access_message: rawData.security_message || 'Driver contact protected'
      };
    } catch (err) {
      console.error('Error in getDeliveryDetails:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          fetchDeliveries();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    deliveries,
    loading,
    error,
    isAuthenticated,
    userRole,
    getDeliveryDetails,
    refreshDeliveries: fetchDeliveries
  };
};