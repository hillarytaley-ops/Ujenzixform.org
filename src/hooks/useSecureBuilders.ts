import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/userProfile';

interface SecureBuilderProfile extends UserProfile {
  company_name?: string;
  phone?: string;
  email?: string;
  rating?: number;
  total_projects?: number;
  location?: string;
  specialties?: string[];
  description?: string;
}

// Function to filter sensitive builder information based on user role
const filterBuilderData = (
  builder: SecureBuilderProfile, 
  userRole: string | null, 
  isAdmin: boolean,
  currentUserId?: string
): SecureBuilderProfile => {
  // If user is admin or viewing their own profile, return all data
  if (isAdmin || builder.user_id === currentUserId) {
    return builder;
  }

  // For authenticated users, show limited contact info
  if (userRole) {
    return {
      ...builder,
      phone: 'Available after contact request',
      email: 'Contact via platform'
    };
  }

  // For unauthenticated users, hide all contact information
  return {
    ...builder,
    phone: undefined,
    email: undefined
  };
};

export const useSecureBuilders = () => {
  const [builders, setBuilders] = useState<SecureBuilderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkUserAndFetchBuilders = async () => {
      try {
        setLoading(true);
        
        // Check user role for data filtering
        const { data: { user } } = await supabase.auth.getUser();
        let role: string | null = null;
        let admin = false;
        
        if (user) {
          setCurrentUserId(user.id);
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          if (userRoles && userRoles.length > 0) {
            role = userRoles[0].role;
            admin = userRoles.some(ur => ur.role === 'admin');
            setUserRole(role);
            setIsAdmin(admin);
          }
        }

        // Fetch builders from profiles table joined with user_roles
        // SECURITY: Only select non-sensitive columns, exclude phone, business_license, etc.
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            full_name,
            company_name,
            avatar_url,
            company_logo_url,
            user_type,
            is_professional,
            created_at,
            updated_at,
            user_roles!inner(role)
          `)
          .eq('user_roles.role', 'builder')
          .order('created_at', { ascending: false });

        if (profileError) {
          throw profileError;
        }

        // Filter sensitive data based on user role
        const secureBuilders = (profileData || []).map(builder => 
          filterBuilderData(builder as SecureBuilderProfile, role, admin, user?.id)
        );
        
        setBuilders(secureBuilders);
      } catch (err) {
        console.error('Error fetching builders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch builders');
        // Use demo data as fallback for security
        setBuilders([]);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchBuilders();
  }, []);

  return {
    builders,
    loading,
    error,
    userRole,
    isAdmin,
    currentUserId
  };
};