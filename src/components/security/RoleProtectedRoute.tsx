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
};

const UNLOCK_MS = 12_000;
const REFRESH_CAP_MS = 5_000;

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
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      if (cancelled) return;
      console.warn('RoleProtectedRoute: timed out — unlock UI (check network / user_roles RLS)');
      setSessionUser(null);
      setDbRole(null);
      setReady(true);
    }, UNLOCK_MS);

    const finish = () => {
      window.clearTimeout(timer);
      if (!cancelled) setReady(true);
    };

    (async () => {
      try {
        await Promise.race([
          refreshSessionIfNeeded(),
          new Promise<void>((resolve) => setTimeout(resolve, REFRESH_CAP_MS)),
        ]);

        if (cancelled || timedOut) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled || timedOut) return;

        if (!session?.user) {
          setSessionUser(null);
          setDbRole(null);
          finish();
          return;
        }

        if (cancelled || timedOut) return;
        setSessionUser(session.user);

        // Do not use maybeSingle(): users with multiple user_roles rows get a PostgREST error and no role.
        const { data: roleRows, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (cancelled || timedOut) return;

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
        if (!cancelled && !timedOut) {
          setSessionUser(null);
          setDbRole(null);
        }
      } finally {
        if (!cancelled && !timedOut) finish();
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
  // Avoid Navigate to the same path: remounts this guard and traps the UI on the loading spinner
  // (e.g. DB role is `builder` but allowedRoles only listed `professional_builder`).
  if (correctDashboard === location.pathname) {
    return <>{children}</>;
  }

  return <Navigate to={correctDashboard} replace />;
};

export default RoleProtectedRoute;
