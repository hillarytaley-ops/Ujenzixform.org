import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v28 - DB ROLE CHECK');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const DASHBOARDS: Record<string, string> = {
  'private_client': '/private-client-dashboard',
  'professional_builder': '/professional-builder-dashboard',
  'builder': '/professional-builder-dashboard',
  'supplier': '/supplier-dashboard',
  'delivery': '/delivery-dashboard',
  'delivery_provider': '/delivery-dashboard',
  'admin': '/admin-dashboard',
};

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied' | 'redirect'>('loading');
  const [correctDashboard, setCorrectDashboard] = useState<string>('/home');
  const checkedRef = useRef(false);

  useEffect(() => {
    // Reset on route change
    checkedRef.current = false;
    setStatus('loading');
  }, [location.pathname]);

  useEffect(() => {
    const checkAccess = async () => {
      // Don't check twice
      if (checkedRef.current) return;
      
      // Wait for auth to load
      if (authLoading) return;

      // No user = redirect to auth
      if (!user) {
        // Check admin session
        const isAdmin = localStorage.getItem('admin_authenticated') === 'true' && 
                        localStorage.getItem('user_role') === 'admin';
        if (isAdmin && allowedRoles.includes('admin')) {
          checkedRef.current = true;
          setStatus('granted');
          return;
        }
        checkedRef.current = true;
        setStatus('denied');
        return;
      }

      // Verify cached user matches current user
      const cachedUserId = localStorage.getItem('user_role_id');
      if (cachedUserId && cachedUserId !== user.id) {
        console.log('🚫 Cached role for different user - clearing');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        localStorage.removeItem('user_email');
      }

      // SECURITY: Fetch actual role from database
      console.log('🔐 Fetching DB role for user:', user.id.slice(0, 8));
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('🔐 DB error:', error);
          // On error, fall back to cached role but log it
        }

        const dbRole = roleData?.role;
        const cachedRole = localStorage.getItem('user_role');
        
        // Use DB role as source of truth, fallback to cached
        const actualRole = dbRole || cachedRole;
        
        console.log('🔐 DB role:', dbRole, 'Cached:', cachedRole, 'Using:', actualRole);

        // Update localStorage to match DB
        if (dbRole && dbRole !== cachedRole) {
          console.log('🔐 Updating localStorage to match DB role');
          localStorage.setItem('user_role', dbRole);
          localStorage.setItem('user_role_id', user.id);
        }

        checkedRef.current = true;

        // No role at all
        if (!actualRole) {
          console.log('🚫 No role found');
          setStatus('denied');
          return;
        }

        // Admin can access everything
        if (actualRole === 'admin') {
          console.log('✅ Admin access granted');
          setStatus('granted');
          return;
        }

        // Check if role is allowed for this route
        if (allowedRoles.includes(actualRole)) {
          console.log('✅ Access granted for', actualRole);
          setStatus('granted');
          return;
        }

        // WRONG ROLE - redirect to their correct dashboard
        console.log('🚫 DENIED:', actualRole, 'tried to access', location.pathname);
        const dashboard = DASHBOARDS[actualRole] || '/home';
        setCorrectDashboard(dashboard);
        setStatus('redirect');

      } catch (e) {
        console.error('🔐 Exception:', e);
        // On exception, use cached role
        const cachedRole = localStorage.getItem('user_role');
        if (cachedRole && allowedRoles.includes(cachedRole)) {
          checkedRef.current = true;
          setStatus('granted');
        } else {
          checkedRef.current = true;
          setStatus('denied');
        }
      }
    };

    checkAccess();
  }, [user, authLoading, allowedRoles, location.pathname]);

  // Safety timeout - max 3 seconds loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        console.log('🔐 Safety timeout - checking cached role');
        const cachedRole = localStorage.getItem('user_role');
        if (cachedRole && allowedRoles.includes(cachedRole)) {
          setStatus('granted');
        } else if (cachedRole) {
          setCorrectDashboard(DASHBOARDS[cachedRole] || '/home');
          setStatus('redirect');
        } else {
          setStatus('denied');
        }
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [status, allowedRoles]);

  // Render based on status
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/auth" replace />;
  }

  if (status === 'redirect') {
    return <Navigate to={correctDashboard} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
