import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// VERSION MARKER
console.log('🔒 RoleProtectedRoute BUILD v12 - FIX CROSS-DASHBOARD Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute BUILD v12
 * 
 * FIX: Re-check on EVERY route change (removed ref that was caching result)
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();
  
  // Reset state on route change by using pathname as key
  const [checkKey, setCheckKey] = useState(location.pathname);
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [finalRole, setFinalRole] = useState<string | null>(null);

  // Reset when pathname changes
  useEffect(() => {
    if (checkKey !== location.pathname) {
      console.log('🔄 Route changed, re-checking access');
      setCheckKey(location.pathname);
      setStatus('checking');
      setFinalRole(null);
    }
  }, [location.pathname, checkKey]);

  // Main security check
  useEffect(() => {
    // Only run when status is 'checking'
    if (status !== 'checking') return;
    
    // Wait for auth to load
    if (authLoading) return;
    
    console.log('🔐 Checking access for:', location.pathname);
    console.log('   User:', user?.email || 'NONE');
    console.log('   Context role:', contextRole || 'NONE');
    console.log('   Allowed roles:', allowedRoles.join(', '));
    
    // ===== CHECK 1: Must have user =====
    if (!user) {
      // Check admin portal session
      const adminAuth = localStorage.getItem('admin_authenticated') === 'true';
      const adminRole = localStorage.getItem('user_role') === 'admin';
      const adminTime = parseInt(localStorage.getItem('admin_login_time') || '0');
      const isValidAdmin = adminAuth && adminRole && (Date.now() - adminTime < 24 * 60 * 60 * 1000);
      
      if (isValidAdmin) {
        console.log('👑 Admin portal session - GRANTED');
        setFinalRole('admin');
        setStatus('granted');
        return;
      }
      
      console.log('🚫 No user - DENIED');
      setStatus('denied');
      return;
    }
    
    // ===== GET USER'S ROLE =====
    let role = contextRole;
    
    if (!role) {
      const cached = localStorage.getItem('user_role');
      const cachedId = localStorage.getItem('user_role_id');
      if (cached && cachedId === user.id) {
        role = cached;
        console.log('   Using cached role:', role);
      }
    }
    
    // ===== CHECK 2: Must have role =====
    if (!role) {
      console.log('⚠️ No role yet, waiting...');
      return; // Timeout will handle
    }
    
    setFinalRole(role);
    
    // ===== CHECK 3: Admin bypass =====
    if (role === 'admin') {
      console.log('👑 Admin - GRANTED');
      setStatus('granted');
      return;
    }
    
    // ===== CHECK 4: Role must match =====
    if (allowedRoles.includes(role)) {
      console.log('✅ Role', role, 'matches - GRANTED');
      setStatus('granted');
      return;
    }
    
    // WRONG ROLE
    console.log('🚫 DENIED:', role, 'cannot access (needs:', allowedRoles.join(', '), ')');
    setFinalRole(role);
    setStatus('denied');
    
  }, [status, user, authLoading, contextRole, allowedRoles, location.pathname]);

  // Timeout
  useEffect(() => {
    if (status !== 'checking') return;
    
    const t = setTimeout(() => {
      if (status === 'checking') {
        // Check localStorage one more time
        if (user) {
          const cached = localStorage.getItem('user_role');
          const cachedId = localStorage.getItem('user_role_id');
          
          if (cached && cachedId === user.id) {
            setFinalRole(cached);
            if (cached === 'admin' || allowedRoles.includes(cached)) {
              console.log('⏱️ Timeout - cached role valid - GRANTED');
              setStatus('granted');
              return;
            } else {
              console.log('⏱️ Timeout - wrong role - DENIED');
              setStatus('denied');
              return;
            }
          }
        }
        
        console.log('⏱️ Timeout - no valid role - DENIED');
        setStatus('denied');
      }
    }, 2000);
    
    return () => clearTimeout(t);
  }, [status, user, allowedRoles]);

  // RENDER

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (status === 'granted') {
    return <>{children}</>;
  }

  // DENIED
  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // Redirect to correct dashboard based on role
  if (finalRole === 'supplier') {
    return <Navigate to="/supplier-dashboard" replace />;
  }
  if (finalRole === 'professional_builder' || finalRole === 'builder') {
    return <Navigate to="/professional-builder-dashboard" replace />;
  }
  if (finalRole === 'private_client') {
    return <Navigate to="/private-client-dashboard" replace />;
  }
  if (finalRole === 'delivery_provider' || finalRole === 'delivery') {
    return <Navigate to="/delivery-dashboard" replace />;
  }
  
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
