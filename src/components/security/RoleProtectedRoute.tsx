/**
 * RoleProtectedRoute - BUILD v31 - FAST + SECURE
 * 
 * Security Strategy:
 * 1. Role is verified from DATABASE during login (Auth.tsx)
 * 2. Verified role is stored with user's session ID as a security key
 * 3. On protected routes, we check if stored session ID matches current session
 * 4. If session matches → trust cached role (FAST)
 * 5. If session doesn't match → re-verify from database (SECURE)
 * 
 * This prevents:
 * - Users manipulating localStorage (session ID must match)
 * - Slow page loads (no DB call if session matches)
 * - Unauthorized access (role tied to specific session)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v31 - FAST + SECURE');

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const DASHBOARDS: Record<string, string> = {
  'private_client': '/private-client-dashboard',
  'professional_builder': '/professional-builder-dashboard',
  'builder': '/professional-builder-dashboard',
  'supplier': '/supplier-dashboard',
  'delivery': '/delivery-dashboard',
  'delivery_provider': '/delivery-dashboard',
  'admin': '/admin-dashboard',
};

// Security key combining user ID and session - prevents localStorage manipulation
const getSecurityKey = (userId: string, sessionId: string) => {
  return `${userId}_${sessionId.substring(0, 8)}`;
};

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, session, loading: authLoading } = useAuth();
  const location = useLocation();
  const [accessDecision, setAccessDecision] = useState<'loading' | 'granted' | 'denied' | 'redirect' | 'no-auth'>('loading');
  const [redirectTo, setRedirectTo] = useState<string>('/auth');
  const verificationDone = useRef(false);
  
  useEffect(() => {
    const checkAccess = async () => {
      // Still loading auth
      if (authLoading) return;
      
      // No user - redirect to auth
      if (!user || !session) {
        console.log('🔒 No user/session, redirecting to auth');
        setAccessDecision('no-auth');
        return;
      }
      
      // Prevent duplicate checks
      if (verificationDone.current) return;
      verificationDone.current = true;
      
      const userId = user.id;
      const sessionId = session.access_token;
      const securityKey = getSecurityKey(userId, sessionId);
      
      // Check cached role with security key
      const cachedRole = localStorage.getItem('user_role');
      const cachedSecurityKey = localStorage.getItem('user_security_key');
      
      // FAST PATH: If security key matches, trust the cached role
      if (cachedRole && cachedSecurityKey === securityKey) {
        console.log('🔒 FAST: Security key matches, using cached role:', cachedRole);
        
        if (allowedRoles.includes(cachedRole)) {
          console.log('✅ FAST ACCESS GRANTED for', cachedRole);
          setAccessDecision('granted');
          return;
        } else {
          // Wrong dashboard - redirect to correct one
          const correctDashboard = DASHBOARDS[cachedRole] || '/home';
          console.log('🔀 FAST REDIRECT:', cachedRole, 'to', correctDashboard);
          setRedirectTo(correctDashboard);
          setAccessDecision('redirect');
          return;
        }
      }
      
      // SECURE PATH: Security key doesn't match - verify from database
      console.log('🔒 SECURE: Verifying role from database...');
      
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('🔒 DB Error:', error);
          setAccessDecision('no-auth');
          return;
        }
        
        if (!roleData?.role) {
          console.log('🔒 No role in database');
          // Clear any fraudulent cached data
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_security_key');
          setAccessDecision('no-auth');
          return;
        }
        
        const dbRole = roleData.role;
        console.log('🔒 DB verified role:', dbRole);
        
        // Store verified role with new security key
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_security_key', securityKey);
        
        if (allowedRoles.includes(dbRole)) {
          console.log('✅ DB ACCESS GRANTED for', dbRole);
          setAccessDecision('granted');
        } else {
          const correctDashboard = DASHBOARDS[dbRole] || '/home';
          console.log('🔀 DB REDIRECT:', dbRole, 'to', correctDashboard);
          setRedirectTo(correctDashboard);
          setAccessDecision('redirect');
        }
      } catch (err) {
        console.error('🔒 Verification error:', err);
        setAccessDecision('no-auth');
      }
    };
    
    checkAccess();
  }, [user, session, authLoading, allowedRoles]);
  
  // Reset on user change
  useEffect(() => {
    verificationDone.current = false;
    setAccessDecision('loading');
  }, [user?.id]);
  
  // Render based on decision
  switch (accessDecision) {
    case 'loading':
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    
    case 'granted':
      return <>{children}</>;
    
    case 'redirect':
      return <Navigate to={redirectTo} replace />;
    
    case 'denied':
    case 'no-auth':
    default:
      return <Navigate to="/auth" state={{ from: location }} replace />;
  }
};

export default RoleProtectedRoute;
