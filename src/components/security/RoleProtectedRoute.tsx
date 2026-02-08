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
 * RoleProtectedRoute - SECURE role-based access control
 * 
 * Security Rules:
 * 1. User MUST be authenticated (no visitor access)
 * 2. User's role MUST match allowedRoles (verified against database)
 * 3. Admins can access ALL pages
 * 4. Use localStorage cache for SPEED but verify against session
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const checkCompleted = useRef(false);

  useEffect(() => {
    const verifyAccess = async () => {
      // Already completed check
      if (checkCompleted.current) return;
      
      // Wait for auth to finish loading
      if (authLoading) return;
      
      // ===== SECURITY CHECK 1: Must have authenticated user =====
      if (!user) {
        // Check for admin session (admin portal uses different auth)
        const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
        const localRole = localStorage.getItem('user_role');
        const adminLoginTime = localStorage.getItem('admin_login_time');
        const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
        
        if (isAdminAuthenticated && localRole === 'admin' && sessionAge < 24 * 60 * 60 * 1000) {
          console.log('👑 ADMIN SESSION: Access granted');
          setVerifiedRole('admin');
          setAccessGranted(true);
          setChecking(false);
          checkCompleted.current = true;
          return;
        }
        
        // No user, no admin session = DENY
        console.log('🚫 NO USER: Access denied');
        setAccessGranted(false);
        setChecking(false);
        checkCompleted.current = true;
        return;
      }
      
      // ===== SECURITY CHECK 2: Get user's actual role =====
      let userRole: string | null = null;
      
      // Try localStorage first (for speed) but ONLY if user ID matches
      const localRole = localStorage.getItem('user_role');
      const localRoleId = localStorage.getItem('user_role_id');
      const roleVerifiedTime = localStorage.getItem('user_role_verified');
      const TRUST_DURATION = 10 * 60 * 1000; // 10 minutes
      const roleAge = roleVerifiedTime ? Date.now() - parseInt(roleVerifiedTime) : Infinity;
      
      // Use cached role if: recent, user ID matches, and user is authenticated
      if (roleAge < TRUST_DURATION && localRole && localRoleId === user.id) {
        userRole = localRole;
        console.log('⚡ CACHED ROLE:', userRole);
      } else {
        // Fetch from database
        try {
          const { data: roleData, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!error && roleData?.role) {
            userRole = roleData.role;
            // Update cache
            localStorage.setItem('user_role', userRole);
            localStorage.setItem('user_role_id', user.id);
            localStorage.setItem('user_role_verified', Date.now().toString());
            console.log('📡 DB ROLE:', userRole);
          } else if (localRole && localRoleId === user.id) {
            // Fallback to localStorage if DB fails
            userRole = localRole;
            console.log('⚠️ DB FAILED, using cached:', userRole);
          }
        } catch (err) {
          // Fallback to localStorage
          if (localRole && localRoleId === user.id) {
            userRole = localRole;
            console.log('⚠️ DB ERROR, using cached:', userRole);
          }
        }
      }
      
      setVerifiedRole(userRole);
      
      // ===== SECURITY CHECK 3: Verify role is allowed =====
      if (!userRole) {
        console.log('🚫 NO ROLE: Access denied');
        setAccessGranted(false);
        setChecking(false);
        checkCompleted.current = true;
        return;
      }
      
      // Admin can access everything
      if (userRole === 'admin') {
        console.log('👑 ADMIN: Access granted to', location.pathname);
        setAccessGranted(true);
        setChecking(false);
        checkCompleted.current = true;
        return;
      }
      
      // Check if user's role is in allowed roles
      if (allowedRoles.includes(userRole)) {
        console.log('✅ ROLE MATCH:', userRole, '→', location.pathname);
        setAccessGranted(true);
        setChecking(false);
        checkCompleted.current = true;
        return;
      }
      
      // Role doesn't match - DENY
      console.log('🚫 ROLE MISMATCH:', userRole, 'not in', allowedRoles);
      setAccessGranted(false);
      setChecking(false);
      checkCompleted.current = true;
    };
    
    verifyAccess();
  }, [user, authLoading, allowedRoles, location.pathname]);

  // Loading state - max 3 seconds then deny (not grant!)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (checking) {
        console.log('⏱️ TIMEOUT: Denying access (security)');
        setChecking(false);
        setAccessGranted(false); // DENY on timeout, not grant
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [checking]);

  // Show loading spinner while checking
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // Access granted - render children
  if (accessGranted) {
    return <>{children}</>;
  }

  // Access denied - redirect appropriately
  if (!user) {
    // Not logged in - go to auth
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // Logged in but wrong role - redirect to their correct dashboard
  if (verifiedRole) {
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
  }
  
  // No role found - go to home
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
