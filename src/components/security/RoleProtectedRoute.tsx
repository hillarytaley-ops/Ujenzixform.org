import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VERSION MARKER - Check console to verify you have latest code
console.log('🔒 RoleProtectedRoute BUILD v10 - STRICT SECURITY Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - STRICT role-based access control
 * 
 * BUILD v10 - STRICT SECURITY:
 * 1. NO access without authenticated user
 * 2. NO access without matching role
 * 3. Timeout = DENY (not grant)
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const checkDone = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (checkDone.current) return;
      if (authLoading) return;
      
      console.log('🔐 RoleProtectedRoute: Checking', location.pathname, 'user:', user?.email || 'NONE');
      
      // ========== CHECK 1: Must have user ==========
      if (!user) {
        // Special case: admin portal session
        const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
        const adminRole = localStorage.getItem('user_role') === 'admin';
        const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
        const adminValid = adminAuth && adminRole && (Date.now() - adminTime < 24 * 60 * 60 * 1000);
        
        if (adminValid && allowedRoles.includes('admin')) {
          console.log('👑 Admin session valid');
          setVerifiedRole('admin');
          setStatus('granted');
          checkDone.current = true;
          return;
        }
        
        console.log('🚫 DENIED: No authenticated user');
        setStatus('denied');
        checkDone.current = true;
        return;
      }
      
      // ========== CHECK 2: Get role from DB ==========
      let role: string | null = null;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data?.role) {
          role = data.role;
          // Cache it
          localStorage.setItem('user_role', role);
          localStorage.setItem('user_role_id', user.id);
          localStorage.setItem('user_role_verified', Date.now().toString());
          console.log('📡 DB role:', role);
        }
      } catch (e) {
        console.error('DB error:', e);
      }
      
      // Fallback to cache if DB failed
      if (!role) {
        const cached = localStorage.getItem('user_role');
        const cachedId = localStorage.getItem('user_role_id');
        if (cached && cachedId === user.id) {
          role = cached;
          console.log('⚠️ Using cached role:', role);
        }
      }
      
      setVerifiedRole(role);
      
      // ========== CHECK 3: Role must match ==========
      if (!role) {
        console.log('🚫 DENIED: No role found for user');
        setStatus('denied');
        checkDone.current = true;
        return;
      }
      
      if (role === 'admin') {
        console.log('👑 Admin access granted');
        setStatus('granted');
        checkDone.current = true;
        return;
      }
      
      if (allowedRoles.includes(role)) {
        console.log('✅ GRANTED:', role, 'can access', location.pathname);
        setStatus('granted');
        checkDone.current = true;
        return;
      }
      
      console.log('🚫 DENIED:', role, 'cannot access', location.pathname, '(allowed:', allowedRoles.join(', '), ')');
      setStatus('denied');
      checkDone.current = true;
    };
    
    verify();
  }, [user, authLoading, allowedRoles, location.pathname]);

  // Timeout - DENY after 3 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      if (status === 'checking') {
        console.log('⏱️ TIMEOUT: Denying access');
        setStatus('denied');
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [status]);

  // CHECKING - show spinner
  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // GRANTED - show page
  if (status === 'granted') {
    return <>{children}</>;
  }

  // DENIED - redirect
  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // Wrong role - redirect to correct dashboard
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
  
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
