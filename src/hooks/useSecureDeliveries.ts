import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DataPrivacyService } from '@/services/DataPrivacyService';

interface SecureDelivery {
  id: string;
  status: string;
  tracking_number: string;
  estimated_delivery_date: string;
  pickup_address: string;
  delivery_address: string;
  delivery_notes: string;
  driver_status: string; // Generic status instead of personal info
  created_at: string;
  updated_at: string;
}

interface DeliveryListResponse {
  data: SecureDelivery[];
  count: number;
  message: string;
}

export const useSecureDeliveries = () => {
  const [deliveries, setDeliveries] = useState<SecureDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error } = await supabase.functions.invoke('secure-delivery-access', {
        body: { action: 'list' }
      });

      if (error) {
        throw new Error(error.message);
      }

      const deliveryData = response as DeliveryListResponse;
      setDeliveries(deliveryData.data || []);

      // Log successful access
      await DataPrivacyService.logDataProcessing({
        user_id: 'current_user', // In production, get actual user ID
        action: 'read',
        data_type: 'delivery',
        purpose: 'service_provision',
        legal_basis: 'contract_performance'
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch deliveries');
      console.error('Secure delivery fetch error:', err);
      
      toast({
        title: "Access Error",
        description: "Unable to access delivery data. Please check your permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getDelivery = useCallback(async (deliveryId: string): Promise<SecureDelivery | null> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('secure-delivery-access', {
        body: { 
          action: 'get',
          delivery_id: deliveryId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return response.data as SecureDelivery;
    } catch (err: any) {
      console.error('Secure delivery get error:', err);
      toast({
        title: "Access Denied",
        description: "Unable to access this delivery. You may not have permission.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  const updateDeliveryStatus = useCallback(async (
    deliveryId: string, 
    status: string, 
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('secure-delivery-access', {
        body: { 
          action: 'update_status',
          delivery_id: deliveryId,
          status: status,
          notes: notes
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setDeliveries(prev => 
        prev.map(delivery => 
          delivery.id === deliveryId 
            ? { ...delivery, status: status, delivery_notes: notes || delivery.delivery_notes }
            : delivery
        )
      );

      toast({
        title: "Status Updated",
        description: "Delivery status updated successfully",
      });

      return true;
    } catch (err: any) {
      console.error('Secure delivery update error:', err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update delivery status",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Secure function to create delivery without exposing driver data
  const createSecureDelivery = useCallback(async (deliveryData: {
    pickup_address: string;
    delivery_address: string;
    material_type: string;
    quantity: number;
    preferred_date: string;
    special_instructions?: string;
  }): Promise<boolean> => {
    try {
      // Sanitize all input data
      const sanitizedData = {
        pickup_address: DataPrivacyService.sanitizeInput(deliveryData.pickup_address),
        delivery_address: DataPrivacyService.sanitizeInput(deliveryData.delivery_address),
        material_type: DataPrivacyService.sanitizeInput(deliveryData.material_type),
        quantity: Math.max(1, Math.floor(deliveryData.quantity)), // Ensure positive integer
        preferred_date: deliveryData.preferred_date,
        special_instructions: deliveryData.special_instructions 
          ? DataPrivacyService.sanitizeInput(deliveryData.special_instructions)
          : null
      };

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Check if user is a builder
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'builder')
        .maybeSingle();
      
      if (!roleData) {
        throw new Error('Only builders can create delivery requests');
      }

      // Create delivery record (driver info will be added later by admin/system)
      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          builder_id: profile.id,
          pickup_address: sanitizedData.pickup_address,
          delivery_address: sanitizedData.delivery_address,
          material_type: sanitizedData.material_type,
          quantity: sanitizedData.quantity,
          preferred_date: sanitizedData.preferred_date,
          special_instructions: sanitizedData.special_instructions,
          status: 'pending',
          tracking_number: `UJP${Date.now()}`,
          // Provider info is NOT set here - will be assigned by admin/system later
          // Driver contact fields removed - access via driver_contact_data table
          provider_id: null
        })
        .select('id, tracking_number, status')
        .single();

      if (error) throw error;

      // Log the creation
      await DataPrivacyService.logDataProcessing({
        user_id: user.id,
        action: 'create',
        data_type: 'delivery',
        purpose: 'service_provision',
        legal_basis: 'contract_performance'
      });

      toast({
        title: "Delivery Created",
        description: `Delivery request created with tracking number: ${data.tracking_number}`,
      });

      return true;
    } catch (err: any) {
      console.error('Secure delivery creation error:', err);
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create delivery request",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Get secure delivery info with driver contact authorization
  const getSecureDeliveryInfo = useCallback(async (deliveryId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_delivery_with_secure_driver_info', {
        delivery_uuid: deliveryId
      });

      if (error) throw error;
      
      const rawData = data?.[0];
      if (!rawData) return null;

      // Map to security model with has_driver_assigned and driver_access_message
      return {
        ...rawData,
        has_driver_assigned: !!rawData.driver_contact_info,
        driver_access_message: rawData.security_message || 'Driver contact protected'
      };
    } catch (err: any) {
      console.error('Secure delivery info error:', err);
      return null;
    }
  }, []);

  // Log driver contact access attempts - this is now handled by the secure function
  const logDriverContactAccess = useCallback(async (deliveryId: string, justification: string) => {
    try {
      // Access logging is now handled automatically by get_driver_contact_secure function
      console.log(`Driver contact access logged for delivery ${deliveryId}: ${justification}`);
    } catch (err: any) {
      console.error('Failed to log driver contact access:', err);
    }
  }, []);

  // Check authentication status
  const isAuthenticated = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }, []);

  // Get user role
  const getUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      return (roleData?.role as any) || null;
    } catch (err) {
      console.error('Failed to get user role:', err);
      return null;
    }
  }, []);

  // Get secure location data with anti-stalking protection
  const getSecureLocationData = useCallback(async (
    tableName: string, 
    recordId: string, 
    precision: string = 'approximate'
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_secure_location_data', {
        table_name: tableName,
        record_id: recordId,
        requested_precision: precision
      });

      if (error) {
        console.error('Error fetching secure location data:', error);
        throw error;
      }

      return data?.[0] || null;
    } catch (err: any) {
      console.error('Failed to fetch secure location data:', err);
      toast({
        title: "Location Access Restricted",
        description: "Location data access is limited for privacy protection.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  return {
    deliveries,
    loading,
    error,
    fetchDeliveries,
    getDelivery,
    updateDeliveryStatus,
    createSecureDelivery,
    getSecureDeliveryInfo,
    logDriverContactAccess,
    isAuthenticated,
    userRole: getUserRole,
    getSecureLocationData,
    refetch: fetchDeliveries
  };
};