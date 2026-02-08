/**
 * RoleProtectedRoute - BUILD v29 - INSTANT ACCESS
 * 
 * Trust localStorage immediately when coming from auth pages.
 * The auth pages already verified the DB role before redirecting.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

console.log('🔒 RoleProtectedRoute BUILD v29 - INSTANT ACCESS');

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
  
  // INSTANT CHECK: Use localStorage immediately
  const cachedRole = localStorage.getItem('user_role');
  const cachedUserId = localStorage.getItem('user_role_id');
  
  // If we have a cached role that matches allowed roles, show content immediately
  // The auth pages already verified this against the database
  if (cachedRole && allowedRoles.includes(cachedRole)) {
    console.log('✅ INSTANT access for', cachedRole, 'to', location.pathname);
    return <>{children}</>;
  }
  
  // Admin special case
  if (cachedRole === 'admin' || 
      (localStorage.getItem('admin_authenticated') === 'true' && allowedRoles.includes('admin'))) {
    console.log('✅ INSTANT admin access');
    return <>{children}</>;
  }
  
  // If cached role exists but doesn't match, redirect to correct dashboard
  if (cachedRole && !allowedRoles.includes(cachedRole)) {
    const correctDashboard = DASHBOARDS[cachedRole] || '/home';
    console.log('🔀 Redirecting', cachedRole, 'to', correctDashboard);
    return <Navigate to={correctDashboard} replace />;
  }
  
  // No cached role - need to wait for auth or redirect to login
  // But don't wait long - if no role after auth loads, redirect to auth
  
  // Still loading auth context
  if (authLoading) {
    // Show spinner briefly, but we already handled cached roles above
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // Auth loaded but no user
  if (!user) {
    console.log('🚫 No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  // User exists but no cached role - shouldn't happen if they came from auth pages
  // Redirect to auth to get proper role assignment
  console.log('🚫 User exists but no role cached, redirecting to auth');
  return <Navigate to="/auth" replace />;
};

export default RoleProtectedRoute;
