/**
 * RoleProtectedRoute — requires a valid Supabase session and a `user_roles` row.
 * Does not grant access from localStorage/cache alone (fixes stale admin UI after JWT expiry).
 */

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { refreshSessionIfNeeded } from '@/lib/supabaseSession';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const DASHBOARDS: Record<string, string> = {
  private_client: '/private-client-dashboard',
  professional_builder: '/professional-builder-dashboard',
  builder: '/professional-builder-dashboard',
  supplier: '/supplier-dashboard',
  delivery: '/delivery-dashboard',
  delivery_provider: '/delivery-dashboard',
  admin: '/admin-dashboard',
};

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refreshSessionIfNeeded();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session?.user) {
          setSessionUser(null);
          setDbRole(null);
          setReady(true);
          return;
        }

        setSessionUser(session.user);

        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('RoleProtectedRoute: user_roles fetch failed', error.message);
          setDbRole(null);
        } else if (roleData?.role) {
          setDbRole(roleData.role);
          localStorage.setItem('user_role', roleData.role);
        } else {
          setDbRole(null);
          localStorage.removeItem('user_role');
        }
      } catch (e) {
        console.error('RoleProtectedRoute: session check failed', e);
        if (!cancelled) {
          setSessionUser(null);
          setDbRole(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!dbRole) {
    return <Navigate to="/home" replace />;
  }

  if (allowedRoles.includes(dbRole)) {
    return <>{children}</>;
  }

  const correctDashboard = DASHBOARDS[dbRole] || '/home';
  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
