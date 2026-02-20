/**
 * RoleProtectedRoute - BUILD v32 - SIMPLE + FAST + SECURE
 * 
 * SIMPLE APPROACH:
 * 1. Get user from AuthContext
 * 2. Get role from AuthContext (already fetched from DB)
 * 3. Check if role is in allowedRoles
 * 4. Grant or deny access immediately
 * 
 * NO localStorage manipulation possible - we use AuthContext which fetches from DB
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

console.log('🔒 RoleProtectedRoute BUILD v32 - SIMPLE + FAST + SECURE');

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
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  
  // Still loading - show spinner briefly
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // No user - redirect to auth
  if (!user) {
    console.log('🔒 No user, redirecting to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // No role - redirect to auth (user needs to register for a role)
  if (!userRole) {
    console.log('🔒 No role for user, redirecting to /home');
    return <Navigate to="/home" replace />;
  }
  
  // Check if user's role is allowed
  if (allowedRoles.includes(userRole)) {
    console.log('✅ Access GRANTED:', userRole, 'to', location.pathname);
    return <>{children}</>;
  }
  
  // User has a role but it's not allowed for this route
  // Redirect to their correct dashboard
  const correctDashboard = DASHBOARDS[userRole] || '/home';
  console.log('🔀 Access DENIED:', userRole, 'tried', location.pathname, '→ redirecting to', correctDashboard);
  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
