/**
 * RoleProtectedRoute — requires a valid Supabase session and a `user_roles` row.
 * Does not grant access from localStorage/cache alone (fixes stale admin UI after JWT expiry).
 */

import { useState, useEffect, useRef } from 'react';
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
  super_admin: '/admin-dashboard',
};

/** Max wait before we stop blocking the UI (then show redirect / children). */
const UNLOCK_MS = 12_000;
const REFRESH_CAP_MS = 5_000;
const GET_SESSION_CAP_MS = 8_000;

function pickRoleForRoute(roles: string[], allowed: string[]): string | null {
  if (!roles.length) return null;
  const preferred = allowed.find((ar) => roles.includes(ar));
  return preferred ?? roles[0] ?? null;
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const location = useLocation();
  const allowedRef = useRef(allowedRoles);
  allowedRef.current = allowedRoles;

  const [ready, setReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timedOutRef = { current: false };

    const timer = window.setTimeout(() => {
      timedOutRef.current = true;
      if (cancelled) return;
      console.warn('RoleProtectedRoute: timed out — unlock UI (check network / user_roles RLS)');
      setSessionUser(null);
      setDbRole(null);
      setReady(true);
    }, UNLOCK_MS);

    const end = () => {
      window.clearTimeout(timer);
      if (!cancelled) setReady(true);
    };

    void (async () => {
      try {
        await Promise.race([
          refreshSessionIfNeeded(),
          new Promise<void>((resolve) => setTimeout(resolve, REFRESH_CAP_MS)),
        ]);

        if (cancelled || timedOutRef.current) return;

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), GET_SESSION_CAP_MS)
          ),
        ]);

        if (cancelled || timedOutRef.current) return;

        const session = sessionResult.data?.session ?? null;

        if (!session?.user) {
          setSessionUser(null);
          setDbRole(null);
          return;
        }

        setSessionUser(session.user);

        const { data: roleRows, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (cancelled || timedOutRef.current) return;

        const roleStrings = (roleRows ?? [])
          .map((r: { role?: string }) => r?.role)
          .filter((r): r is string => Boolean(r));

        if (error) {
          console.warn('RoleProtectedRoute: user_roles fetch failed', error.message);
          setDbRole(null);
        } else {
          const picked = pickRoleForRoute(roleStrings, allowedRef.current);
          if (picked) {
            setDbRole(picked);
            localStorage.setItem('user_role', picked);
          } else {
            setDbRole(null);
            localStorage.removeItem('user_role');
          }
        }
      } catch (e) {
        console.error('RoleProtectedRoute: session check failed', e);
        if (!cancelled && !timedOutRef.current) {
          setSessionUser(null);
          setDbRole(null);
        }
      } finally {
        // Always unblock the UI when this async flow finishes (unless unmounted).
        // Do not gate on timedOut — that left ready=false in edge races with the unlock timer.
        end();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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
  if (correctDashboard === location.pathname) {
    return <>{children}</>;
  }

  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
