/**
 * RoleProtectedRoute - BUILD v30 - SECURE DATABASE VERIFICATION
 * 
 * CRITICAL SECURITY FIX: Always verify role against database, NOT localStorage!
 * localStorage can be manipulated by users in browser DevTools.
 * 
 * Security Flow:
 * 1. Check if user is authenticated
 * 2. Verify user's role from DATABASE (not localStorage)
 * 3. Only allow access if DB role matches allowed roles
 * 4. Redirect unauthorized users to their correct dashboard or auth page
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

console.log('🔒 RoleProtectedRoute BUILD v30 - SECURE DB VERIFICATION');

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

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const verificationAttempted = useRef(false);
  
  // SECURITY: Always verify role from DATABASE, never trust localStorage alone
  useEffect(() => {
    const verifyRoleFromDatabase = async () => {
      // Prevent duplicate verification attempts
      if (verificationAttempted.current) return;
      verificationAttempted.current = true;
      
      // If no user, skip verification
      if (!user) {
        setVerifying(false);
        return;
      }
      
      try {
        console.log('🔒 Verifying role from database for user:', user.id);
        
        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.log('🔒 Role verification timeout');
          setVerifying(false);
        }, 5000);
        
        // Query the database for the user's actual role
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('🔒 Error verifying role:', error);
          setVerifying(false);
          return;
        }
        
        if (roleData?.role) {
          console.log('🔒 Database verified role:', roleData.role);
          // Update localStorage with verified role (for faster future access)
          localStorage.setItem('user_role', roleData.role);
          localStorage.setItem('user_role_id', user.id);
          setVerifiedRole(roleData.role);
        } else {
          console.log('🔒 No role found in database for user');
          // Clear any cached role that might be fraudulent
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_role_id');
          setVerifiedRole(null);
        }
        
        setVerifying(false);
      } catch (err) {
        console.error('🔒 Role verification error:', err);
        setVerifying(false);
      }
    };
    
    // Reset verification state when user changes
    if (user) {
      verificationAttempted.current = false;
      setVerifying(true);
      verifyRoleFromDatabase();
    } else if (!authLoading) {
      setVerifying(false);
    }
  }, [user, authLoading]);
  
  // Still loading auth context or verifying role
  if (authLoading || verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // No user - redirect to auth
  if (!user) {
    console.log('🚫 No authenticated user, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // User exists but no verified role - redirect to auth
  if (!verifiedRole) {
    console.log('🚫 No verified role for user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  // SECURITY CHECK: Verify role is in allowed roles
  if (allowedRoles.includes(verifiedRole)) {
    console.log('✅ Access GRANTED for', verifiedRole, 'to', location.pathname);
    return <>{children}</>;
  }
  
  // User has a role but it's not allowed for this route
  // Redirect them to their correct dashboard
  const correctDashboard = DASHBOARDS[verifiedRole] || '/home';
  console.log('🚫 Access DENIED for', verifiedRole, 'to', location.pathname, '- Redirecting to', correctDashboard);
  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
