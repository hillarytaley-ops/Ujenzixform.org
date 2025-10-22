import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Supplier, SupplierCapabilities } from '@/types/supplier';

interface UseSupplierCapabilitiesResult {
  capabilities: SupplierCapabilities | null;
  loading: boolean;
  error: string | null;
  searchByCapabilities: (criteria: SearchCriteria) => Promise<Supplier[]>;
  findSuppliersInRadius: (lat: number, lng: number, radius?: number) => Promise<Supplier[]>;
  checkDeliveryAvailability: (lat: number, lng: number) => Promise<boolean>;
}

interface SearchCriteria {
  required_services?: string[];
  required_certifications?: string[];
  max_lead_time?: number;
  min_order_value?: number;
  max_order_value?: number;
  payment_term?: string;
}

export const useSupplierCapabilities = (supplierId?: string): UseSupplierCapabilitiesResult => {
  const [capabilities, setCapabilities] = useState<SupplierCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = async () => {
    if (!supplierId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_supplier_capabilities', { supplier_uuid: supplierId });

      if (fetchError) {
        throw fetchError;
      }

      setCapabilities(data?.[0] || null);
    } catch (err) {
      console.error('Error fetching supplier capabilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch capabilities');
    } finally {
      setLoading(false);
    }
  };

  const searchByCapabilities = async (criteria: SearchCriteria): Promise<Supplier[]> => {
    try {
      const { data, error } = await supabase
        .rpc('search_suppliers_by_capabilities', {
          required_services: criteria.required_services || [],
          required_certifications: criteria.required_certifications || [],
          max_lead_time: criteria.max_lead_time,
          min_order_value: criteria.min_order_value,
          max_order_value: criteria.max_order_value,
          payment_term: criteria.payment_term
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error searching suppliers by capabilities:', err);
      return [];
    }
  };

  const findSuppliersInRadius = async (lat: number, lng: number, radius: number = 50): Promise<Supplier[]> => {
    try {
      const { data, error } = await supabase
        .rpc('find_suppliers_in_radius', {
          target_lat: lat,
          target_lng: lng,
          max_distance_km: radius
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error finding suppliers in radius:', err);
      return [];
    }
  };

  const checkDeliveryAvailability = async (lat: number, lng: number): Promise<boolean> => {
    if (!supplierId) return false;

    try {
      const { data, error } = await supabase
        .rpc('supplier_delivers_to_location', {
          supplier_uuid: supplierId,
          target_lat: lat,
          target_lng: lng
        });

      if (error) {
        throw error;
      }

      return data || false;
    } catch (err) {
      console.error('Error checking delivery availability:', err);
      return false;
    }
  };

  useEffect(() => {
    if (supplierId) {
      fetchCapabilities();
    }
  }, [supplierId]);

  return {
    capabilities,
    loading,
    error,
    searchByCapabilities,
    findSuppliersInRadius,
    checkDeliveryAvailability
  };
};
