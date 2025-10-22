import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryFilters, DeliveryMetrics } from '@/types/delivery';
import { useToast } from '@/hooks/use-toast';

interface UseDeliveriesResult {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  metrics: DeliveryMetrics | null;
  createDelivery: (deliveryData: Partial<Delivery>) => Promise<Delivery | null>;
  updateDeliveryStatus: (deliveryId: string, status: string, notes?: string) => Promise<boolean>;
  cancelDelivery: (deliveryId: string, reason: string) => Promise<boolean>;
  confirmDelivery: (deliveryId: string, signature?: string, photos?: string[]) => Promise<boolean>;
  refetch: () => void;
}

export const useDeliveries = (
  filters: DeliveryFilters = {},
  page: number = 1,
  limit: number = 12
): UseDeliveriesResult => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const { toast } = useToast();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Authentication required to access deliveries');
        return;
      }

      // Check if deliveries table exists, if not use mock data
      const { error: tableError } = await supabase
        .from('deliveries')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        // Table doesn't exist yet, use mock data
        console.log('Deliveries table not found, using mock data');
        setDeliveries([]);
        setTotalCount(0);
        setMetrics({
          totalDeliveries: 0,
          completedDeliveries: 0,
          pendingDeliveries: 0,
          inTransitDeliveries: 0,
          averageDeliveryTime: 0,
          onTimeDeliveryRate: 0,
          totalCost: 0,
          averageCost: 0,
          topMaterials: [],
          providerPerformance: []
        });
        return;
      }

      // Build query based on user role and filters
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          delivery_providers(provider_name, provider_type, rating, phone),
          suppliers(company_name),
          profiles(full_name, company_name)
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const userRole = roleData?.role;

      if (userRole !== 'admin') {
        // Non-admin users can only see their own deliveries
        query = query.or(`builder_id.eq.${user.id},supplier_id.in.(${
          // Get supplier IDs for this user
          await supabase
            .from('suppliers')
            .select('id')
            .eq('user_id', user.id)
            .then(({ data }) => data?.map(s => s.id).join(',') || 'null')
        }),provider_id.in.(${
          // Get provider IDs for this user
          await supabase
            .from('delivery_providers')
            .select('id')
            .eq('user_id', user.id)
            .then(({ data }) => data?.map(p => p.id).join(',') || 'null')
        })`);
      }

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.material_type) {
        query = query.ilike('material_type', `%${filters.material_type}%`);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,material_type.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setDeliveries(data || []);
      setTotalCount(count || 0);

      // Fetch metrics
      await fetchMetrics();

    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('get_delivery_analytics', { 
          user_uuid: user.id,
          time_range: '30days' 
        });

      if (error) {
        console.warn('Could not fetch delivery metrics:', error);
        return;
      }

      if (data && data.length > 0) {
        const metricsData = data[0];
        setMetrics({
          totalDeliveries: metricsData.total_deliveries,
          completedDeliveries: metricsData.completed_deliveries,
          pendingDeliveries: metricsData.pending_deliveries,
          inTransitDeliveries: metricsData.in_transit_deliveries,
          averageDeliveryTime: metricsData.average_delivery_time_hours,
          onTimeDeliveryRate: metricsData.on_time_delivery_rate,
          totalCost: metricsData.total_cost,
          averageCost: metricsData.average_cost,
          topMaterials: metricsData.top_materials || [],
          providerPerformance: metricsData.provider_performance || []
        });
      }
    } catch (err) {
      console.warn('Error fetching delivery metrics:', err);
    }
  };

  const createDelivery = async (deliveryData: Partial<Delivery>): Promise<Delivery | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create a delivery request.",
          variant: "destructive"
        });
        return null;
      }

      // Use the create_delivery_request function
      const { data, error } = await supabase.rpc('create_delivery_request', {
        material_type: deliveryData.material_type,
        quantity: deliveryData.quantity,
        unit: deliveryData.unit,
        pickup_address: deliveryData.pickup_address,
        pickup_lat: deliveryData.pickup_lat,
        pickup_lng: deliveryData.pickup_lng,
        delivery_address: deliveryData.delivery_address,
        delivery_lat: deliveryData.delivery_lat,
        delivery_lng: deliveryData.delivery_lng,
        contact_name: deliveryData.contact_name,
        contact_phone: deliveryData.contact_phone,
        requested_date: deliveryData.requested_date,
        priority: deliveryData.priority || 'normal',
        special_instructions: deliveryData.special_instructions,
        weight_kg: deliveryData.weight_kg
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Delivery Request Created",
        description: `Tracking number: ${data[0].tracking_number}. ${data[0].available_providers} providers available.`,
      });

      // Refresh deliveries list
      fetchDeliveries();

      // Return the created delivery (fetch it from database)
      const { data: newDelivery } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', data[0].delivery_id)
        .single();

      return newDelivery;

    } catch (err) {
      console.error('Error creating delivery:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create delivery request',
        variant: "destructive"
      });
      return null;
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string, notes?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('update_delivery_status', {
          delivery_uuid: deliveryId,
          new_status: status,
          notes: notes
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Delivery status updated to ${status}`,
      });

      // Refresh deliveries
      fetchDeliveries();
      return true;

    } catch (err) {
      console.error('Error updating delivery status:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update delivery status',
        variant: "destructive"
      });
      return false;
    }
  };

  const cancelDelivery = async (deliveryId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'cancelled',
          internal_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) {
        throw error;
      }

      toast({
        title: "Delivery Cancelled",
        description: "The delivery has been cancelled successfully.",
      });

      fetchDeliveries();
      return true;

    } catch (err) {
      console.error('Error cancelling delivery:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to cancel delivery',
        variant: "destructive"
      });
      return false;
    }
  };

  const confirmDelivery = async (deliveryId: string, signature?: string, photos?: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'completed',
          delivery_confirmed: true,
          signature_url: signature,
          photo_urls: photos,
          actual_delivery_time: new Date().toISOString(),
          progress: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) {
        throw error;
      }

      toast({
        title: "Delivery Confirmed",
        description: "Thank you for confirming the delivery completion.",
      });

      fetchDeliveries();
      return true;

    } catch (err) {
      console.error('Error confirming delivery:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to confirm delivery',
        variant: "destructive"
      });
      return false;
    }
  };

  const refetch = () => {
    fetchDeliveries();
  };

  useEffect(() => {
    fetchDeliveries();
  }, [filters, page, limit]);

  return {
    deliveries,
    loading,
    error,
    totalCount,
    metrics,
    createDelivery,
    updateDeliveryStatus,
    cancelDelivery,
    confirmDelivery,
    refetch
  };
};
