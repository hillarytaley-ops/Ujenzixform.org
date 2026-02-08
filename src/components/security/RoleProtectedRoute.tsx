import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v26 - FETCH DB ROLE Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch role from database when user is available
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          console.log('🔐 DB Role fetched:', data.role);
          setDbRole(data.role);
          // Update localStorage to match DB
          localStorage.setItem('user_role', data.role);
          localStorage.setItem('user_role_id', user.id);
        }
      } catch (e) {
        console.error('🔐 Error fetching role:', e);
      }
      
      setRoleLoading(false);
    };

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  // Safety timeout - stop loading after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (roleLoading) {
        console.log('🔐 Role fetch timeout');
        setRoleLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [roleLoading]);

  console.log('🔐 Route:', location.pathname, 'User:', user?.id?.slice(0,8), 'DbRole:', dbRole, 'Loading:', authLoading || roleLoading);

  // Still loading - show spinner
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No user = redirect to auth
  if (!user) {
    // Check admin session
    const isAdmin = localStorage.getItem('admin_authenticated') === 'true' && 
                    localStorage.getItem('user_role') === 'admin';
    if (isAdmin) {
      return <>{children}</>;
    }
    console.log('🚫 No user - redirect to auth');
    return <Navigate to="/auth" replace />;
  }

  // Use DB role (source of truth), fallback to localStorage
  const effectiveRole = dbRole || localStorage.getItem('user_role');
  
  console.log('🔐 Effective role:', effectiveRole, 'Allowed:', allowedRoles.join(','));

  // No role at all
  if (!effectiveRole) {
    console.log('🚫 No role - redirect to auth');
    return <Navigate to="/auth" replace />;
  }

  // Admin can access everything
  if (effectiveRole === 'admin') {
    return <>{children}</>;
  }

  // Check if role is allowed for this route
  if (allowedRoles.includes(effectiveRole)) {
    console.log('✅ Access granted for', effectiveRole);
    return <>{children}</>;
  }

  // WRONG ROLE - redirect to their correct dashboard
  console.log('🚫 DENIED:', effectiveRole, 'tried to access', location.pathname);
  
  const dashboards: Record<string, string> = {
    'private_client': '/private-client-dashboard',
    'professional_builder': '/professional-builder-dashboard',
    'builder': '/professional-builder-dashboard',
    'supplier': '/supplier-dashboard',
    'delivery': '/delivery-dashboard',
    'delivery_provider': '/delivery-dashboard',
  };

  const correctDashboard = dashboards[effectiveRole] || '/home';
  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
