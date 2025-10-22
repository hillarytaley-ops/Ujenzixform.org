import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Supplier, SupplierFilters } from '@/types/supplier';

interface UseSuppliersResult {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
  getSupplierContact: (supplierId: string) => Promise<any>;
}

export const useSuppliers = (
  filters: SupplierFilters,
  page: number = 1,
  limit: number = 12
): UseSuppliersResult => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSuppliers([]);
        setTotalCount(0);
        setError('Authentication required to access suppliers directory');
        return;
      }

      // Use the new secure function based on user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      const isAdmin = !!roleData;
      
      // Use ultra-secure directory function - NO contact info exposed
      const { data, error: fetchError } = await supabase.rpc('get_suppliers_directory_safe' as any) as { data: any[] | null, error: any };
      
      // NO FALLBACK to direct table access - security critical
      if (fetchError) {
        console.error('Secure suppliers function error:', fetchError);
        // Log security attempt
        try {
          await supabase.rpc('log_supplier_access_attempt' as any, {
            action_type: 'directory_access_blocked',
            attempted_access: 'direct_table_fallback_prevented'
          });
        } catch (logError) {
          console.error('Failed to log security attempt:', logError);
        }
        setError('Supplier directory access restricted - contact administrator');
        setSuppliers([]);
        setTotalCount(0);
        return;
      }


      // Handle secure function response
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No supplier data returned from secure function');
        setSuppliers([]);
        setTotalCount(0);
        setError(null); // Allow empty results for non-admins
        return;
      }

      // Convert secure data to Supplier format - ALL contact info is protected
      const convertedData: Supplier[] = data.map((supplier: any) => ({
        id: supplier.id,
        company_name: supplier.company_name,
        specialties: supplier.specialties || [],
        materials_offered: supplier.materials_offered || [],
        rating: supplier.rating || 0,
        is_verified: supplier.is_verified,
        created_at: supplier.created_at,
        updated_at: supplier.updated_at,
        // ALL contact information is protected - use secure contact system
        contact_person: '[PROTECTED - Use secure contact request]',
        email: '[PROTECTED - Use secure contact request]',
        phone: '[PROTECTED - Use secure contact request]',
        address: '[PROTECTED - Use secure contact request]',
        user_id: null // Never expose user IDs
      }));

      // Apply client-side filters
      let filteredData = convertedData;
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(supplier => 
          supplier.company_name.toLowerCase().includes(searchTerm) ||
          (supplier.specialties && supplier.specialties.some(s => s.toLowerCase().includes(searchTerm))) ||
          (supplier.materials_offered && supplier.materials_offered.some(m => m.toLowerCase().includes(searchTerm)))
        );
      }

      if (filters.verified !== null) {
        filteredData = filteredData.filter(supplier => 
          supplier.is_verified === filters.verified
        );
      }

      if (filters.category) {
        filteredData = filteredData.filter(supplier =>
          supplier.specialties && supplier.specialties.some(s => 
            s.toLowerCase().includes(filters.category!.toLowerCase())
          )
        );
      }

      if (filters.rating && filters.rating > 0) {
        filteredData = filteredData.filter(supplier => 
          supplier.rating >= filters.rating!
        );
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedData = filteredData.slice(startIndex, startIndex + limit);
      
      setSuppliers(paginatedData);
      setTotalCount(filteredData.length);
    } catch (err) {
      console.error('Network error:', err);
      setSuppliers([]);
      setTotalCount(0);
      setError('Access restricted or network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to get supplier contact information with business relationship verification
  const getSupplierContact = async (supplierId: string) => {
    try {
      console.log('Requesting secure supplier contact with business verification for:', supplierId);
      
      const { data, error } = await supabase.rpc('get_supplier_contact_ultra_secure', {
        supplier_uuid: supplierId,
        access_justification: 'contact_request_from_builder'
      });

      if (error) {
        console.error('Error fetching supplier contact:', error);
        throw new Error(`Contact access error: ${error.message}`);
      }

      const result = data && data.length > 0 ? data[0] : null;
      
      if (result && !result.access_granted) {
        console.log('Contact access denied:', result.access_reason);
        throw new Error(`Contact access denied: ${result.access_reason || 'Business relationship verification required'}`);
      }
      
      console.log('Contact access result:', result?.access_reason || 'No data returned');
      return result;
    } catch (err) {
      console.error('Error in getSupplierContact:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [filters, page, limit]);

  return {
    suppliers,
    loading,
    error,
    totalCount,
    refetch: fetchSuppliers,
    getSupplierContact
  };
};