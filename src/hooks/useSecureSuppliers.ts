import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecureSupplierData {
  id: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialties: string[];
  materials_offered: string[];
  rating: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  can_view_contact?: boolean;
  contact_access_reason?: string;
  contact_info_status?: string;
  business_verified?: boolean;
  // Ultra-secure specific fields
  access_granted?: boolean;
  access_reason?: string;
  security_message?: string;
  access_restrictions?: string;
  contact_field_access?: string;
}

interface UseSecureSuppliersResult {
  suppliers: SecureSupplierData[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userRole: string | null;
  getSupplierWithContact: (supplierId: string) => Promise<SecureSupplierData | null>;
}

export const useSecureSuppliers = (): UseSecureSuppliersResult => {
  const [suppliers, setSuppliers] = useState<SecureSupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchSuppliers = async () => {
      try {
        setLoading(true);
        
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
          
      // Use ultra-secure directory function - NO contact info exposed
      const { data, error: fetchError } = await supabase.rpc('get_suppliers_directory_safe' as any) as { data: any[] | null, error: any };

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to match SecureSupplierData interface with contact protection
      const transformedData = (data || []).map((supplier: any) => ({
        id: supplier.id,
        company_name: supplier.company_name,
        specialties: supplier.specialties || [],
        materials_offered: supplier.materials_offered || [],
        rating: supplier.rating || 0,
        is_verified: supplier.is_verified,
        created_at: supplier.created_at,
        updated_at: supplier.updated_at,
        // Contact info - NEVER exposed from public directory
        contact_person: '[Protected - Business verification required]',
        email: '[Protected - Business verification required]',
        phone: '[Protected - Business verification required]',
        address: '[Protected - Business verification required]',
        can_view_contact: false,
        contact_info_status: 'contact_protected_business_relationship_required',
        access_restrictions: 'business_relationship_required',
        business_verified: false
      }));

          setSuppliers(transformedData);
        } else {
          console.log('No authenticated user - guest access with limited info');
          setSuppliers([]);
          setError(null); // Allow guest browsing
        }
      } catch (err) {
        console.error('Error fetching secure suppliers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchSuppliers();
  }, []);

  const getSupplierWithContact = async (supplierId: string): Promise<SecureSupplierData | null> => {
    try {
      // Use the new enhanced secure function with business validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, contact access denied');
        return null;
      }

      // Use the ultra-secure RPC with business relationship verification
      const { data, error } = await supabase.rpc('get_supplier_contact_ultra_secure', {
        supplier_uuid: supplierId
      });

      if (error) {
        console.error('Error fetching verified supplier contact:', error);
        return null;
      }

      // Transform secure function result to match interface
      if (!data || !Array.isArray(data) || data.length === 0) return null;
      
      const supplierData = data[0];
      
      return {
        id: supplierData.id,
        company_name: supplierData.company_name,
        contact_person: supplierData.contact_person,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        specialties: [], // Not returned by contact function
        materials_offered: [], // Not returned by contact function
        rating: 0, // Not returned by contact function
        is_verified: true, // Assume verified if contact returned
        created_at: new Date().toISOString(), // Default timestamp
        updated_at: new Date().toISOString(), // Default timestamp
        can_view_contact: supplierData.access_granted,
        access_granted: supplierData.access_granted,
        access_reason: supplierData.access_reason,
        security_message: supplierData.access_reason,
        access_restrictions: supplierData.access_granted ? 'verified' : 'restricted',
        contact_field_access: supplierData.access_granted ? 'full' : 'restricted',
        business_verified: supplierData.business_relationship_verified || false
      };
    } catch (err) {
      console.error('Error in getSupplierWithContact:', err);
      return null;
    }
  };

  return {
    suppliers,
    loading,
    error,
    isAuthenticated,
    userRole,
    getSupplierWithContact
  };
};