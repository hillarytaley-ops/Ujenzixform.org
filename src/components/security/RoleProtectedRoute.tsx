/**
 * RoleProtectedRoute - BUILD v33 - WAIT FOR SESSION
 * 
 * FIXED: Wait for Supabase session to be restored before checking auth
 * The AuthContext safety timeout was causing premature redirects
 */

import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v33 - WAIT FOR SESSION');

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
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  
  // Check session directly from Supabase
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔒 Checking session directly...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🔒 Session found:', session.user.email);
          setSessionUser(session.user);
          
          // Fetch role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();
          
          if (roleData?.role) {
            console.log('🔒 Role found:', roleData.role);
            setSessionRole(roleData.role);
            localStorage.setItem('user_role', roleData.role);
          }
        } else {
          console.log('🔒 No session found');
        }
      } catch (err) {
        console.error('🔒 Session check error:', err);
      }
      
      setChecking(false);
    };
    
    // Give a small delay for Supabase to restore session
    const timeout = setTimeout(checkSession, 100);
    return () => clearTimeout(timeout);
  }, []);
  
  // Use AuthContext values if available, otherwise use our direct check
  const effectiveUser = user || sessionUser;
  const effectiveRole = userRole || sessionRole;
  const isLoading = loading && checking;
  
  // Still loading - show spinner
  if (isLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // No user - redirect to auth
  if (!effectiveUser) {
    console.log('🔒 No user after check, redirecting to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // No role - redirect to home (user needs to register for a role)
  if (!effectiveRole) {
    console.log('🔒 No role for user, redirecting to /home');
    return <Navigate to="/home" replace />;
  }
  
  // Check if user's role is allowed
  if (allowedRoles.includes(effectiveRole)) {
    console.log('✅ Access GRANTED:', effectiveRole, 'to', location.pathname);
    return <>{children}</>;
  }
  
  // User has a role but it's not allowed for this route
  // Redirect to their correct dashboard
  const correctDashboard = DASHBOARDS[effectiveRole] || '/home';
  console.log('🔀 Access DENIED:', effectiveRole, 'tried', location.pathname, '→ redirecting to', correctDashboard);
  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
