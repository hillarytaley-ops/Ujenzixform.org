import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/userProfile';

/**
 * Hook to get the current user's role from the secure user_roles table
 * This replaces the deprecated profiles.role column
 */
export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserRole(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        if (userRoles && userRoles.length > 0) {
          // Get primary role (admin takes precedence)
          const hasAdmin = userRoles.some(ur => ur.role === 'admin');
          const primaryRole = hasAdmin ? 'admin' : userRoles[0].role;
          
          setUserRole(primaryRole as UserRole);
          setIsAdmin(hasAdmin);
        } else {
          // Default to builder if no role found
          setUserRole('builder');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('builder');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { userRole, isAdmin, loading };
};

/**
 * Helper function to check if user has a specific role
 * Can be used in components without the hook
 */
export const checkUserHasRole = async (role: UserRole): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', role)
      .limit(1);

    return userRoles && userRoles.length > 0;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};
