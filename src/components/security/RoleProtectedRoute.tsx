import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - SPEED OPTIMIZED role-based access control
 * 
 * OPTIMIZATION: Trust localStorage for 5 minutes after sign-in to avoid DB roundtrips
 * Users can ONLY access dashboards that match their registered role
 * EXCEPTION: Admins can access ALL pages without restrictions
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const hasLoggedAccess = useRef(false);
  const lastCheckedPath = useRef<string | null>(null);
  const hasCompletedCheck = useRef(false); // Prevent redundant checks

  useEffect(() => {
    const checkRole = async () => {
      // ✅ PERFORMANCE: Skip if we already completed a successful check for this path
      if (hasCompletedCheck.current && accessGranted && lastCheckedPath.current === location.pathname) {
        return;
      }
      
      // Only log once per path change to avoid spam
      if (lastCheckedPath.current !== location.pathname) {
        console.log('🔐 RoleProtectedRoute: Checking access for', location.pathname);
        lastCheckedPath.current = location.pathname;
        hasCompletedCheck.current = false; // Reset for new path
      }
      
      const localRole = localStorage.getItem('user_role');
      const localRoleId = localStorage.getItem('user_role_id');
      const roleVerifiedTime = localStorage.getItem('user_role_verified');
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const adminLoginTime = localStorage.getItem('admin_login_time');
      
      // ✅ SPEED OPTIMIZATION: Trust localStorage if recently verified (within 10 minutes)
      const TRUST_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)
      const roleAge = roleVerifiedTime ? Date.now() - parseInt(roleVerifiedTime) : Infinity;
      const isRecentlyVerified = roleAge < TRUST_DURATION;
      
      // ✅ INSTANT ACCESS: If localStorage has valid recent role, grant access immediately
      if (isRecentlyVerified && localRole && allowedRoles.includes(localRole)) {
        console.log('⚡ INSTANT ACCESS: Using fresh localStorage role:', localRole);
        setUserRole(localRole);
        setAccessGranted(true);
        setChecking(false);
        hasCompletedCheck.current = true;
        return;
      }
      
      // ✅ ADMIN BYPASS: Check admin session (within 24 hours)
      const adminSessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
      const maxAdminSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (isAdminAuthenticated && localRole === 'admin' && adminSessionAge < maxAdminSessionAge) {
        if (!hasCompletedCheck.current) {
          console.log('👑 ADMIN BYPASS: Granting access to', location.pathname);
        }
        setUserRole('admin');
        setAccessGranted(true);
        setChecking(false);
        hasCompletedCheck.current = true;
        return;
      }
      
      if (!user) {
        setChecking(false);
        setAccessGranted(false);
        return;
      }

      // ✅ FAST PATH: Use localStorage if recently verified AND user ID matches
      if (isRecentlyVerified && localRole && localRoleId === user.id) {
        if (!hasCompletedCheck.current) {
          console.log('⚡ FAST PATH: Using cached role:', localRole);
        }
        setUserRole(localRole);
        if (allowedRoles.includes(localRole) || localRole === 'admin') {
          setAccessGranted(true);
        } else {
          setAccessGranted(false);
        }
        setChecking(false);
        hasCompletedCheck.current = true;
        return;
      }

      // SLOW PATH: Check database (only if localStorage is stale or missing)
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // If RLS blocks us, fall back to localStorage
          if (localRole && localRoleId === user.id) {
            setUserRole(localRole);
            setAccessGranted(allowedRoles.includes(localRole) || localRole === 'admin');
          } else {
            setAccessGranted(false);
          }
          setChecking(false);
          return;
        }

        if (!roleData?.role) {
          // No role in DB - check localStorage
          if (localRole && localRoleId === user.id && (allowedRoles.includes(localRole) || localRole === 'admin')) {
            setUserRole(localRole);
            setAccessGranted(true);
          } else {
            setUserRole(null);
            setAccessGranted(false);
          }
          setChecking(false);
          return;
        }

        const dbRole = roleData.role as string;
        setUserRole(dbRole);

        // Update localStorage with fresh data
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);
        localStorage.setItem('user_role_verified', Date.now().toString());

        // ✅ ADMIN can access ANY page
        if (dbRole === 'admin') {
          setAccessGranted(true);
        } else if (allowedRoles.includes(dbRole)) {
          setAccessGranted(true);
        } else {
          setAccessGranted(false);
        }
      } catch (err) {
        // Last resort: check localStorage
        if (localRole && localRoleId === user.id && (allowedRoles.includes(localRole) || localRole === 'admin')) {
          setUserRole(localRole);
          setAccessGranted(true);
        } else {
          setAccessGranted(false);
        }
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading && user) {
      checkRole();
    } else if (!authLoading && !user) {
      // Check for admin session even without Supabase user
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const localRole = localStorage.getItem('user_role');
      const adminLoginTime = localStorage.getItem('admin_login_time');
      const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
      
      if (isAdminAuthenticated && localRole === 'admin' && sessionAge < 24 * 60 * 60 * 1000) {
        setUserRole('admin');
        setAccessGranted(true);
        setChecking(false);
      } else {
        setChecking(false);
        setAccessGranted(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, location.pathname]); // Remove allowedRoles to prevent re-runs

  // Loading state
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your access...</p>
        </div>
      </div>
    );
  }

  // Not logged in - but check for admin session first
  if (!user) {
    // Check if admin is logged in via admin portal
    const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
    const localRole = localStorage.getItem('user_role');
    const adminLoginTime = localStorage.getItem('admin_login_time');
    const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
    
    if (isAdminAuthenticated && localRole === 'admin' && sessionAge < 24 * 60 * 60 * 1000) {
      // Admin is logged in, allow access
      return <>{children}</>;
    }
    
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Access denied - redirect to correct dashboard based on database role
  if (!accessGranted) {
    // Admin should never be denied - double check
    if (userRole === 'admin') {
      return <>{children}</>;
    }
    
    // Redirect to the user's correct dashboard based on their DATABASE role
    if (userRole === 'supplier') {
      return <Navigate to="/supplier-dashboard" replace />;
    }
    
    // Handle builder types - redirect to their specific dashboard
    if (userRole === 'professional_builder' || userRole === 'builder') {
      return <Navigate to="/professional-builder-dashboard" replace />;
    }
    
    if (userRole === 'private_client') {
      return <Navigate to="/private-client-dashboard" replace />;
    }
    
    if (userRole === 'delivery_provider' || userRole === 'delivery') {
      return <Navigate to="/delivery-dashboard" replace />;
    }
    
    // No role found - redirect to home
    return <Navigate to="/" replace />;
  }

  // Access granted - only log once per session to avoid spam
  if (!hasLoggedAccess.current) {
    console.log('✅ ACCESS GRANTED for', location.pathname);
    hasLoggedAccess.current = true;
  }
  return <>{children}</>;
};

export default RoleProtectedRoute;
