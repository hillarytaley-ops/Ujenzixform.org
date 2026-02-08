import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v23 - DB CHECK Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * BUILD v23 - Check DB role, redirect if wrong
 */
export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied' | 'wrong_role'>('checking');
  const [correctDashboard, setCorrectDashboard] = useState<string | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Reset on route change
    if (checkedRef.current && status !== 'checking') {
      checkedRef.current = false;
      setStatus('checking');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (checkedRef.current) return;
    if (authLoading) return;

    const checkAccess = async () => {
      checkedRef.current = true;
      
      // Check admin session first
      const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
      const adminRole = localStorage.getItem('user_role') === 'admin';
      const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
      
      if (adminAuth && adminRole && (Date.now() - adminTime < 24 * 60 * 60 * 1000)) {
        console.log('👑 Admin session valid');
        setStatus('granted');
        return;
      }

      // No user = no access
      if (!user) {
        console.log('🚫 No user');
        setStatus('denied');
        return;
      }

      // Fetch role from DB with timeout
      let dbRole: string | null = null;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()
          .abortSignal(controller.signal);
        
        clearTimeout(timeoutId);
        
        if (!error && data) {
          dbRole = data.role;
        }
      } catch (e) {
        console.log('🔐 DB query failed/timeout, using localStorage');
      }

      // If no DB role, fall back to localStorage
      const effectiveRole = dbRole || localStorage.getItem('user_role');
      
      console.log('🔐 DB role:', dbRole, 'localStorage:', localStorage.getItem('user_role'), 'effective:', effectiveRole);

      // Update localStorage if DB role is different
      if (dbRole && dbRole !== localStorage.getItem('user_role')) {
        console.log('🔐 Updating localStorage to match DB:', dbRole);
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);
      }

      // Admin always allowed
      if (effectiveRole === 'admin') {
        setStatus('granted');
        return;
      }

      // Check if role is allowed
      if (effectiveRole && allowedRoles.includes(effectiveRole)) {
        console.log('✅ Access granted for', effectiveRole);
        setStatus('granted');
        return;
      }

      // Wrong role - find correct dashboard
      if (effectiveRole) {
        console.log('🚫 Wrong role:', effectiveRole, 'not in', allowedRoles);
        
        let dashboard = '/home';
        if (effectiveRole === 'supplier') dashboard = '/supplier-dashboard';
        else if (effectiveRole === 'professional_builder' || effectiveRole === 'builder') dashboard = '/professional-builder-dashboard';
        else if (effectiveRole === 'private_client') dashboard = '/private-client-dashboard';
        else if (effectiveRole === 'delivery_provider' || effectiveRole === 'delivery') dashboard = '/delivery-dashboard';
        
        setCorrectDashboard(dashboard);
        setStatus('wrong_role');
        return;
      }

      // No role at all
      console.log('🚫 No role found');
      setStatus('denied');
    };

    checkAccess();
  }, [user, authLoading, allowedRoles, location.pathname]);

  // Timeout - grant after 4 seconds if still checking (prevent infinite loading)
  useEffect(() => {
    if (status === 'checking') {
      const timeout = setTimeout(() => {
        console.log('⏱️ Timeout - granting access');
        setStatus('granted');
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (status === 'wrong_role' && correctDashboard) {
    return <Navigate to={correctDashboard} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
