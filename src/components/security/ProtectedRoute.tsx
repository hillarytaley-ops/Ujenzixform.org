import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Requires authentication OR admin session
 * Admins can access ALL protected pages without Supabase auth
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check for admin session (admin can bypass normal auth)
  const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
  const adminEmail = localStorage.getItem('admin_email');
  const adminLoginTime = localStorage.getItem('admin_login_time');
  const userRole = localStorage.getItem('user_role');
  
  // Validate admin session (within 24 hours)
  const sessionAge = adminLoginTime ? Date.now() - parseInt(adminLoginTime) : Infinity;
  const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
  const isValidAdminSession = isAdminAuthenticated && adminEmail && userRole === 'admin' && sessionAge < maxSessionAge;

  // If admin is logged in, allow immediate access (no loading needed)
  if (isValidAdminSession) {
    console.log('👑 ADMIN ACCESS: Bypassing ProtectedRoute for', location.pathname);
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated via Supabase, allow access
  if (user) {
    return <>{children}</>;
  }

  // No user and no admin session - redirect to auth with return URL
  const returnUrl = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/auth?redirect=${returnUrl}`} replace />;
};

export default ProtectedRoute;

