/**
 * RoleProtectedRoute — valid session + user_roles, aligned with Auth.tsx (REST role read avoids supabase-js hangs).
 */

import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserRolesViaRest } from '@/lib/userRolesRest';
import { isAdminStaffLocalSessionValid } from '@/utils/adminStaffSession';

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
  super_admin: '/admin-dashboard',
};

/** Do not hang forever if getSession never resolves (rare). */
const GET_SESSION_CAP_MS = 10_000;

function pickRoleForRoute(roles: string[], allowed: string[]): string | null {
  if (!roles.length) return null;
  const preferred = allowed.find((ar) => roles.includes(ar));
  return preferred ?? roles[0] ?? null;
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const location = useLocation();
  const allowedRef = useRef(allowedRoles);
  allowedRef.current = allowedRoles;

  /** Only /admin-dashboard — not supplier/delivery routes that also list `admin` in allowedRoles */
  const isAdminDashboardPath =
    location.pathname === '/admin-dashboard' || location.pathname.startsWith('/admin-dashboard/');
  const allowsAdminStaffStorageBypass =
    isAdminDashboardPath &&
    (allowedRoles.includes('admin') || allowedRoles.includes('super_admin'));

  /** Staff portal often has no Supabase JWT ("limited mode"); skip session wait to avoid /auth redirect loops */
  const [ready, setReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    return allowsAdminStaffStorageBypass && isAdminStaffLocalSessionValid();
  });
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    if (allowsAdminStaffStorageBypass && isAdminStaffLocalSessionValid()) {
      setReady(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), GET_SESSION_CAP_MS)
          ),
        ]);

        if (cancelled) return;

        const session = sessionResult.data?.session ?? null;

        if (!session?.user) {
          setSessionUser(null);
          setDbRole(null);
          return;
        }

        setSessionUser(session.user);

        const roleStrings = await fetchUserRolesViaRest(session.user.id, session.access_token);

        if (cancelled) return;

        const picked = pickRoleForRoute(roleStrings, allowedRef.current);
        if (picked) {
          setDbRole(picked);
          localStorage.setItem('user_role', picked);
        } else {
          setDbRole(null);
          localStorage.removeItem('user_role');
        }
      } catch (e) {
        console.error('RoleProtectedRoute: check failed', e);
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
  }, [allowsAdminStaffStorageBypass]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (allowsAdminStaffStorageBypass && isAdminStaffLocalSessionValid()) {
    return <>{children}</>;
  }

  if (!sessionUser) {
    return (
      <Navigate
        to={isAdminDashboardPath ? '/admin-login' : '/auth'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!dbRole) {
    return <Navigate to="/home" replace />;
  }

  if (allowedRoles.includes(dbRole)) {
    return <>{children}</>;
  }

  const correctDashboard = DASHBOARDS[dbRole] || '/home';
  if (correctDashboard === location.pathname) {
    return <>{children}</>;
  }

  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
