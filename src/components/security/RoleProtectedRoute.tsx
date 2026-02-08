import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

console.log('🔒 RoleProtectedRoute BUILD v24 - SIMPLE Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  // Get cached data
  const cachedRole = localStorage.getItem('user_role');
  const cachedUserId = localStorage.getItem('user_role_id');

  console.log('🔐 Route:', location.pathname);
  console.log('🔐 User:', user?.id || 'none', 'AuthRole:', userRole, 'CachedRole:', cachedRole, 'CachedUserId:', cachedUserId);

  // Still loading auth - show spinner briefly
  if (loading) {
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

  // SECURITY: If cached user ID doesn't match current user, clear cache
  if (cachedUserId && cachedUserId !== user.id) {
    console.log('🚫 SECURITY: User ID mismatch! Clearing stale cache');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_email');
    // Redirect to auth to get fresh role
    return <Navigate to="/auth" replace />;
  }

  // Use AuthContext role (from DB) if available, otherwise cached role
  const effectiveRole = userRole || cachedRole;
  
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
    console.log('✅ Access granted');
    return <>{children}</>;
  }

  // Wrong role - redirect to correct dashboard
  console.log('🚫 Wrong role - redirecting to correct dashboard');
  
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
