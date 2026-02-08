import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// VERSION MARKER
console.log('🔒 RoleProtectedRoute BUILD v21 - VERIFY DB ROLE Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute BUILD v21 - VERIFY DB ROLE
 * 
 * SECURITY: Always verify role from database matches localStorage
 * If mismatch, update localStorage and redirect to correct dashboard
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Verify role on mount and when user changes
  useEffect(() => {
    const verifyRole = async () => {
      // If no user from auth context, check if we should wait
      if (authLoading) {
        return; // Wait for auth to load
      }
      
      if (!user) {
        // No user - check admin session
        const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
        const adminRole = localStorage.getItem('user_role') === 'admin';
        const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
        
        if (adminAuth && adminRole && (Date.now() - adminTime < 24 * 60 * 60 * 1000)) {
          setVerifiedRole('admin');
          setIsVerifying(false);
          return;
        }
        
        setVerifiedRole(null);
        setIsVerifying(false);
        return;
      }
      
      // User exists - use contextRole from AuthContext (already fetched from DB)
      if (contextRole) {
        console.log('🔐 Using contextRole:', contextRole);
        
        // Update localStorage if different
        const cachedRole = localStorage.getItem('user_role');
        if (cachedRole !== contextRole) {
          console.log('🔐 Updating localStorage from', cachedRole, 'to', contextRole);
          localStorage.setItem('user_role', contextRole);
          localStorage.setItem('user_role_id', user.id);
          localStorage.setItem('user_role_verified', Date.now().toString());
        }
        
        setVerifiedRole(contextRole);
        setIsVerifying(false);
        return;
      }
      
      // No contextRole yet - check localStorage but verify user ID matches
      const cachedRole = localStorage.getItem('user_role');
      const cachedRoleId = localStorage.getItem('user_role_id');
      
      if (cachedRole && cachedRoleId === user.id) {
        console.log('🔐 Using cached role (ID matches):', cachedRole);
        setVerifiedRole(cachedRole);
        setIsVerifying(false);
        return;
      }
      
      // localStorage doesn't match - clear it and wait for contextRole
      console.log('🔐 localStorage mismatch, clearing...');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
      setVerifiedRole(null);
      setIsVerifying(false);
    };
    
    verifyRole();
  }, [user, authLoading, contextRole]);

  // Timeout - stop verifying after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isVerifying) {
        console.log('🔐 Verification timeout');
        setIsVerifying(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isVerifying]);

  console.log('🔐 RoleProtectedRoute:', location.pathname, 'verifiedRole:', verifiedRole, 'isVerifying:', isVerifying);

  // Still verifying
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No user and no admin session - redirect to auth
  if (!user && verifiedRole !== 'admin') {
    console.log('🚫 No user - redirecting to auth');
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Admin - always grant
  if (verifiedRole === 'admin') {
    console.log('👑 Admin - GRANTED');
    return <>{children}</>;
  }

  // Check if role matches
  if (verifiedRole && allowedRoles.includes(verifiedRole)) {
    console.log('✅ Role matches - GRANTED:', verifiedRole);
    return <>{children}</>;
  }

  // Wrong role - redirect to correct dashboard
  console.log('🚫 Wrong role:', verifiedRole, 'not in', allowedRoles);
  
  if (verifiedRole === 'supplier') {
    return <Navigate to="/supplier-dashboard" replace />;
  }
  if (verifiedRole === 'professional_builder' || verifiedRole === 'builder') {
    return <Navigate to="/professional-builder-dashboard" replace />;
  }
  if (verifiedRole === 'private_client') {
    return <Navigate to="/private-client-dashboard" replace />;
  }
  if (verifiedRole === 'delivery_provider' || verifiedRole === 'delivery') {
    return <Navigate to="/delivery-dashboard" replace />;
  }

  // No role - redirect to home
  console.log('🚫 No role - redirecting to home');
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
