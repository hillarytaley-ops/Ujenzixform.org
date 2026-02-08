import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// VERSION MARKER
console.log('🔒 RoleProtectedRoute BUILD v15 - TRUST LOCALSTORAGE Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute BUILD v15 - TRUST LOCALSTORAGE
 * 
 * If localStorage has valid role data, grant access immediately.
 * Don't wait for AuthContext to load.
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();

  // Check localStorage FIRST (instant check, no waiting)
  const cachedRole = localStorage.getItem('user_role');
  const cachedRoleId = localStorage.getItem('user_role_id');
  const cachedEmail = localStorage.getItem('user_email');
  
  // Admin session check
  const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
  const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
  const isValidAdminSession = adminAuth && cachedRole === 'admin' && (Date.now() - adminTime < 24 * 60 * 60 * 1000);

  // Determine the effective role
  const effectiveRole = contextRole || cachedRole;
  const hasValidSession = user || cachedEmail || isValidAdminSession;

  console.log('🔐 RoleProtectedRoute:', location.pathname);
  console.log('   Auth loading:', authLoading);
  console.log('   User:', user?.email || cachedEmail || 'NONE');
  console.log('   Role (context):', contextRole || 'NONE');
  console.log('   Role (cached):', cachedRole || 'NONE');
  console.log('   Allowed:', allowedRoles.join(', '));

  // INSTANT GRANT: If localStorage has matching role, grant immediately
  if (cachedRole && cachedRoleId) {
    if (cachedRole === 'admin' || allowedRoles.includes(cachedRole)) {
      console.log('✅ INSTANT GRANT from localStorage:', cachedRole);
      return <>{children}</>;
    }
  }

  // Admin session - always grant
  if (isValidAdminSession) {
    console.log('👑 Admin session - GRANTED');
    return <>{children}</>;
  }

  // If auth is still loading but we have no localStorage, show spinner briefly
  if (authLoading && !cachedRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check context role (after auth loaded)
  if (contextRole) {
    if (contextRole === 'admin' || allowedRoles.includes(contextRole)) {
      console.log('✅ Context role matches - GRANTED');
      return <>{children}</>;
    }
  }

  // No valid session at all - redirect to auth
  if (!hasValidSession) {
    console.log('🚫 No session - redirecting to auth');
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Has session but wrong role - redirect to correct dashboard
  const roleToUse = effectiveRole;
  console.log('🔄 Wrong role:', roleToUse, '- redirecting to correct dashboard');
  
  if (roleToUse === 'supplier') {
    return <Navigate to="/supplier-dashboard" replace />;
  }
  if (roleToUse === 'professional_builder' || roleToUse === 'builder') {
    return <Navigate to="/professional-builder-dashboard" replace />;
  }
  if (roleToUse === 'private_client') {
    return <Navigate to="/private-client-dashboard" replace />;
  }
  if (roleToUse === 'delivery_provider' || roleToUse === 'delivery') {
    return <Navigate to="/delivery-dashboard" replace />;
  }

  // Fallback - go to home
  console.log('🚫 No matching role - redirecting to home');
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
