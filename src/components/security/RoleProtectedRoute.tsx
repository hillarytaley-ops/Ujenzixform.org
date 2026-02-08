import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// VERSION MARKER
console.log('🔒 RoleProtectedRoute BUILD v14 - SIMPLIFIED Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute BUILD v14 - SIMPLIFIED
 * 
 * Rules:
 * 1. No user = redirect to auth
 * 2. User with matching role (from context OR localStorage) = GRANT
 * 3. User with different role = redirect to their dashboard
 * 4. Admin = always grant
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  // Get role from multiple sources
  const getRole = (): string | null => {
    // 1. Context role (from AuthContext)
    if (contextRole) return contextRole;
    
    // 2. localStorage (if user ID matches)
    const cached = localStorage.getItem('user_role');
    const cachedId = localStorage.getItem('user_role_id');
    if (cached && user && cachedId === user.id) return cached;
    
    // 3. Admin session
    const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
    const adminRole = localStorage.getItem('user_role') === 'admin';
    if (adminAuth && adminRole) return 'admin';
    
    return null;
  };

  const role = getRole();

  useEffect(() => {
    if (!authLoading) {
      console.log('🔐 RoleProtectedRoute:', location.pathname);
      console.log('   User:', user?.email || 'NONE');
      console.log('   Role:', role || 'NONE');
      console.log('   Allowed:', allowedRoles.join(', '));
      setChecked(true);
    }
  }, [authLoading, user, role, allowedRoles, location.pathname]);

  // Still loading auth
  if (authLoading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    // Check admin session
    const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
    const adminRole = localStorage.getItem('user_role') === 'admin';
    const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
    const isAdmin = adminAuth && adminRole && (Date.now() - adminTime < 24 * 60 * 60 * 1000);
    
    if (isAdmin) {
      console.log('👑 Admin session - GRANTED');
      return <>{children}</>;
    }
    
    console.log('🚫 No user - redirecting to auth');
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Admin can access everything
  if (role === 'admin') {
    console.log('👑 Admin - GRANTED');
    return <>{children}</>;
  }

  // Check if role matches
  if (role && allowedRoles.includes(role)) {
    console.log('✅ Role matches - GRANTED');
    return <>{children}</>;
  }

  // Wrong role - redirect to their dashboard
  console.log('🔄 Wrong role, redirecting to correct dashboard');
  if (role === 'supplier') {
    return <Navigate to="/supplier-dashboard" replace />;
  }
  if (role === 'professional_builder' || role === 'builder') {
    return <Navigate to="/professional-builder-dashboard" replace />;
  }
  if (role === 'private_client') {
    return <Navigate to="/private-client-dashboard" replace />;
  }
  if (role === 'delivery_provider' || role === 'delivery') {
    return <Navigate to="/delivery-dashboard" replace />;
  }

  // No role - go to home
  console.log('🚫 No role - redirecting to home');
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
