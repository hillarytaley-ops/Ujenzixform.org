import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

console.log('🔒 RoleProtectedRoute BUILD v27 - FAST (no DB wait)');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, userRole: contextRole, loading: authLoading } = useAuth();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  // Quick ready check - max 1 second wait
  useEffect(() => {
    if (!authLoading) {
      setReady(true);
    }
    const timeout = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timeout);
  }, [authLoading]);

  // Get cached values
  const cachedRole = localStorage.getItem('user_role');
  const cachedUserId = localStorage.getItem('user_role_id');
  
  console.log('🔐 Route:', location.pathname, 'User:', user?.id?.slice(0,8), 'CachedRole:', cachedRole, 'Ready:', ready);

  // Still loading - show brief spinner (max 1 second)
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No user = redirect to auth
  if (!user) {
    // Check admin session
    const isAdmin = localStorage.getItem('admin_authenticated') === 'true' && cachedRole === 'admin';
    if (isAdmin) {
      return <>{children}</>;
    }
    console.log('🚫 No user - redirect to auth');
    return <Navigate to="/auth" replace />;
  }

  // SECURITY: Verify cached role belongs to this user
  if (cachedUserId && cachedUserId !== user.id) {
    console.log('🚫 Role mismatch - cached for different user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_email');
    return <Navigate to="/auth" replace />;
  }

  // Use context role (from AuthContext) or cached role
  const effectiveRole = contextRole || cachedRole;
  
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
