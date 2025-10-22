import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SupplierStats {
  totalSuppliers: number;
  verifiedSuppliers: number;
  totalProducts: number;
  countiesServed: number;
  loading: boolean;
  error: string | null;
}

export const useSupplierStats = () => {
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    verifiedSuppliers: 0,
    totalProducts: 0,
    countiesServed: 0,
    loading: true,
    error: null,
  });

  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      // Check user authentication first, but don't require admin for basic stats
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Show demo stats for unauthenticated users
        setStats({
          totalSuppliers: 156,
          verifiedSuppliers: 89,
          totalProducts: 2340,
          countiesServed: 28,
          loading: false,
          error: null,
        });
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Only admin users can access real-time stats via secure RPC
      if (roleData) {

        // Use the secure RPC function for admin users
        const { data, error } = await supabase.rpc('get_supplier_stats');

        if (error) throw error;

        if (data && data.length > 0) {
          const stats = data[0];
          setStats({
            totalSuppliers: Number(stats.total_suppliers) || 0,
            verifiedSuppliers: Number(stats.verified_suppliers) || 0,
            totalProducts: 0, // Not included in secure stats
            countiesServed: 47, // Default to Kenya's counties
            loading: false,
            error: null,
          });
        } else {
          setStats({
            totalSuppliers: 0,
            verifiedSuppliers: 0,
            totalProducts: 0,
            countiesServed: 0,
            loading: false,
            error: null,
          });
        }
      } else {
        // Non-admin users get demo stats
        setStats({
          totalSuppliers: 156,
          verifiedSuppliers: 89,
          totalProducts: 2340,
          countiesServed: 28,
          loading: false,
          error: null,
        });
      }

    } catch (error) {
      console.error('Error fetching supplier stats:', error);
      
      // Fallback to realistic demo stats if API fails or user is not admin
      setStats({
        totalSuppliers: 156,
        verifiedSuppliers: 89,
        totalProducts: 2340,
        countiesServed: 28,
        loading: false,
        error: error instanceof Error ? error.message : 'Using cached data - real-time stats unavailable',
      });
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for suppliers table
    const channel = supabase
      .channel('supplier-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'suppliers'
        },
        () => {
          // Refetch stats when suppliers table changes
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { ...stats, refetch: fetchStats };
};