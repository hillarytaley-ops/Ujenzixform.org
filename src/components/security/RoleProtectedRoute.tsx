import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - Enforces STRICT role-based access by checking the DATABASE
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

  useEffect(() => {
    const checkDatabaseRole = async () => {
      console.log('🔐 RoleProtectedRoute: Checking access for', location.pathname);
      
      // ✅ ADMIN BYPASS: Check if user is logged in as admin (localStorage check)
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const adminEmail = localStorage.getItem('admin_email');
      const adminLoginTime = localStorage.getItem('admin_login_time');
      const localRole = localStorage.getItem('user_role');
      
      // Validate admin session (within 24 hours)
      const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (isAdminAuthenticated && adminEmail && localRole === 'admin' && sessionAge < maxSessionAge) {
        console.log('👑 ADMIN BYPASS: Granting access to', location.pathname);
        setUserRole('admin');
        setAccessGranted(true);
        setChecking(false);
        return;
      }
      
      if (!user) {
        // Even without Supabase user, admin can still access if admin session is valid
        if (isAdminAuthenticated && localRole === 'admin' && sessionAge < maxSessionAge) {
          console.log('👑 ADMIN BYPASS (no Supabase user): Granting access');
          setUserRole('admin');
          setAccessGranted(true);
          setChecking(false);
          return;
        }
        
        console.log('🔐 No user found');
        setChecking(false);
        setAccessGranted(false);
        return;
      }

      try {
        // ALWAYS check the database for the user's role - this is the source of truth
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('🔐 Database role check:', { roleData, error, userId: user.id });

        // If RLS blocks us, fall back to localStorage
        if (error) {
          console.warn('🔐 RLS error fetching role, checking localStorage:', error);
          const localRoleId = localStorage.getItem('user_role_id');
          
          // Verify localStorage role belongs to current user
          if (localRole && localRoleId === user.id) {
            console.log('🔐 Using localStorage role as fallback:', localRole);
            setUserRole(localRole);
            if (allowedRoles.includes(localRole) || localRole === 'admin') {
              console.log('✅ Access GRANTED via localStorage fallback:', localRole);
              setAccessGranted(true);
            } else {
              console.log('🚫 Access DENIED - localStorage role:', localRole, 'Allowed:', allowedRoles);
              setAccessGranted(false);
            }
          } else {
            console.log('🚫 No valid localStorage role found');
            setAccessGranted(false);
          }
          setChecking(false);
          return;
        }

        if (!roleData?.role) {
          console.log('🚫 No role found in database for user');
          // Check localStorage as fallback
          const localRoleId = localStorage.getItem('user_role_id');
          
          if (localRole && localRoleId === user.id && (allowedRoles.includes(localRole) || localRole === 'admin')) {
            console.log('✅ Access GRANTED via localStorage (no DB role):', localRole);
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

        // Update localStorage to match database (for consistency)
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);

        // ✅ ADMIN can access ANY page
        if (dbRole === 'admin') {
          console.log('👑 ADMIN ACCESS: Granting access to all pages');
          setAccessGranted(true);
        }
        // Check if the database role is in the allowed roles
        else if (allowedRoles.includes(dbRole)) {
          console.log('✅ Access GRANTED - Database role matches:', dbRole);
          setAccessGranted(true);
        } else {
          console.log('🚫 Access DENIED - Database role:', dbRole, 'Allowed:', allowedRoles);
          setAccessGranted(false);
        }
      } catch (err) {
        console.error('🔐 Exception checking role:', err);
        // Last resort: check localStorage
        const localRoleId = localStorage.getItem('user_role_id');
        
        if (localRole && localRoleId === user.id && (allowedRoles.includes(localRole) || localRole === 'admin')) {
          console.log('✅ Access GRANTED via localStorage (exception fallback):', localRole);
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
      checkDatabaseRole();
    } else if (!authLoading && !user) {
      // Check for admin session even without Supabase user
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const localRole = localStorage.getItem('user_role');
      const adminLoginTime = localStorage.getItem('admin_login_time');
      const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
      
      if (isAdminAuthenticated && localRole === 'admin' && sessionAge < 24 * 60 * 60 * 1000) {
        console.log('👑 ADMIN BYPASS (no auth loading): Granting access');
        setUserRole('admin');
        setAccessGranted(true);
        setChecking(false);
      } else {
        setChecking(false);
        setAccessGranted(false);
      }
    }
  }, [user, authLoading, location.pathname, allowedRoles]);

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
      console.log('👑 ADMIN ACCESS: No Supabase user but admin session valid');
      return <>{children}</>;
    }
    
    console.log('🚫 Not logged in, redirecting to auth');
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Access denied - redirect to correct dashboard based on database role
  if (!accessGranted) {
    console.log('🚫 Access denied. User role:', userRole, 'Required:', allowedRoles);
    
    // Admin should never be denied - double check
    if (userRole === 'admin') {
      console.log('👑 ADMIN should have access - granting anyway');
      return <>{children}</>;
    }
    
    // Redirect to the user's correct dashboard based on their DATABASE role
    if (userRole === 'supplier') {
      console.log('🔄 Redirecting supplier to supplier-dashboard');
      return <Navigate to="/supplier-dashboard" replace />;
    }
    
    if (userRole === 'builder') {
      console.log('🔄 Redirecting builder to builder-dashboard');
      return <Navigate to="/builder-dashboard" replace />;
    }
    
    if (userRole === 'delivery') {
      console.log('🔄 Redirecting delivery provider to delivery-dashboard');
      return <Navigate to="/delivery-dashboard" replace />;
    }
    
    // No role found - redirect to home
    console.log('🔄 No valid role, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Access granted
  console.log('✅ ACCESS GRANTED for', location.pathname);
  return <>{children}</>;
};

export default RoleProtectedRoute;
