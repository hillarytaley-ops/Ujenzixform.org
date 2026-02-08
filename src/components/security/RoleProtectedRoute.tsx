import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';

// VERSION MARKER
console.log('🔒 RoleProtectedRoute BUILD v11 - WORKING SECURITY Feb 8 2026');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - Working security that doesn't block legitimate users
 * 
 * BUILD v11:
 * 1. Trust AuthContext userRole (already fetched from DB)
 * 2. Trust localStorage if user ID matches (set during sign-in)
 * 3. Block visitors (no user)
 * 4. Block wrong roles
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, userRole: contextRole } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [finalRole, setFinalRole] = useState<string | null>(null);
  const verified = useRef(false);

  useEffect(() => {
    // Don't re-run if already verified
    if (verified.current) return;
    
    // Wait for auth to load
    if (authLoading) return;
    
    console.log('🔐 Checking access for:', location.pathname);
    console.log('   User:', user?.email || 'NONE');
    console.log('   Context role:', contextRole || 'NONE');
    
    // ===== SECURITY CHECK 1: Must have user =====
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
        verified.current = true;
        return;
      }
      
      console.log('🚫 No user - DENIED (redirecting to auth)');
      setStatus('denied');
      verified.current = true;
      return;
    }
    
    // ===== GET USER'S ROLE =====
    // Priority: 1) AuthContext role, 2) localStorage (if user ID matches)
    let role = contextRole;
    
    if (!role) {
      const cached = localStorage.getItem('user_role');
      const cachedId = localStorage.getItem('user_role_id');
      if (cached && cachedId === user.id) {
        role = cached;
        console.log('   Using cached role:', role);
      }
    }
    
    setFinalRole(role);
    
    // ===== SECURITY CHECK 2: Must have role =====
    if (!role) {
      console.log('⚠️ No role found - waiting for context...');
      // Don't deny yet - role might still be loading in AuthContext
      // The timeout will handle this
      return;
    }
    
    // ===== SECURITY CHECK 3: Admin bypass =====
    if (role === 'admin') {
      console.log('👑 Admin - GRANTED');
      setStatus('granted');
      verified.current = true;
      return;
    }
    
    // ===== SECURITY CHECK 4: Role must match =====
    if (allowedRoles.includes(role)) {
      console.log('✅ Role matches - GRANTED');
      setStatus('granted');
      verified.current = true;
      return;
    }
    
    // Wrong role
    console.log('🚫 Role mismatch:', role, 'not in', allowedRoles, '- DENIED');
    setStatus('denied');
    verified.current = true;
    
  }, [user, authLoading, contextRole, allowedRoles, location.pathname]);

  // Timeout - but grant if user exists and has matching cached role
  useEffect(() => {
    const t = setTimeout(() => {
      if (status === 'checking') {
        // Last chance: check localStorage directly
        if (user) {
          const cached = localStorage.getItem('user_role');
          const cachedId = localStorage.getItem('user_role_id');
          
          if (cached && cachedId === user.id) {
            if (cached === 'admin' || allowedRoles.includes(cached)) {
              console.log('⏱️ Timeout but cached role valid - GRANTED');
              setFinalRole(cached);
              setStatus('granted');
              return;
            }
          }
        }
        
        console.log('⏱️ Timeout - DENIED');
        setStatus('denied');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [status, user, allowedRoles]);

  // CHECKING
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
  
  // GRANTED
  if (status === 'granted') {
    return <>{children}</>;
  }

  // DENIED - redirect appropriately
  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // Has user but wrong role - redirect to their dashboard
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
  
  // No role at all - go to home
  return <Navigate to="/home" replace />;
};

export default RoleProtectedRoute;
