/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔐 AUTH CONTEXT - CENTRAL AUTHENTICATION PROVIDER                                 ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  SECURITY CRITICAL - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️                   ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   RESPONSIBILITIES:                                                                  ║
 * ║   1. Manages Supabase authentication state                                          ║
 * ║   2. Fetches user role from DATABASE (source of truth)                              ║
 * ║   3. Provides signOut that clears ALL session data                                  ║
 * ║   4. Provides refreshSession for token renewal                                       ║
 * ║   5. Provides refreshUserRole for role updates                                       ║
 * ║                                                                                      ║
 * ║   SECURITY PRINCIPLES:                                                               ║
 * ║   - Role is ALWAYS fetched from user_roles table, never trusted from localStorage   ║
 * ║   - signOut clears localStorage role data to prevent stale sessions                 ║
 * ║   - Auth state changes trigger role re-fetch                                         ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { prefetchDashboardData, clearPrefetchCache } from '@/services/dataPrefetch';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role (non-blocking) and trigger data prefetch
  const fetchUserRole = useCallback(async (userId: string, triggerPrefetch: boolean = false) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      
      if (error) console.error('AuthContext: Role fetch error:', error);
      const role = roleData?.role || null;
      setUserRole(role);
      
      // Sync to localStorage for components that need instant access
      if (role) {
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_role_id', userId);
        console.log('AuthContext: Role synced to localStorage:', role);
        
        // Trigger data prefetch in background after login
        if (triggerPrefetch) {
          const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
          if (accessToken) {
            console.log('AuthContext: Starting data prefetch for faster dashboard loading...');
            // Run prefetch in background - don't await
            prefetchDashboardData(userId, role, accessToken).catch(err => {
              console.warn('AuthContext: Prefetch error (non-critical):', err);
            });
          }
        }
      }
    } catch (error) {
      console.error('AuthContext: Error fetching user role:', error);
      setUserRole(null);
    }
  }, []);

  // Public method to refresh role (call after role assignment)
  const refreshUserRole = useCallback(async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  }, [user, fetchUserRole]);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchUserRole(currentSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      } else if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await fetchUserRole(refreshedSession.user.id);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    let mounted = true;
    let rolesFetched = false;

    // Defer .from() / getSession work out of the auth callback (avoids Supabase client deadlocks with Auth.tsx).
    const schedulePostAuthWork = (userId: string, email: string | undefined, triggerPrefetch: boolean) => {
      window.setTimeout(() => {
        if (!mounted) return;
        void fetchUserRole(userId, triggerPrefetch);
        void (async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', userId)
              .maybeSingle();
            if (profile?.full_name) {
              localStorage.setItem('user_name', profile.full_name);
            }
          } catch {
            // optional
          }
        })();
      }, 0);
    };

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, currentSession?.user?.email);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
          rolesFetched = true;
          if (currentSession.user.email) {
            localStorage.setItem('user_email', currentSession.user.email);
          }
          localStorage.setItem('user_id', currentSession.user.id);
          schedulePostAuthWork(currentSession.user.id, currentSession.user.email, true);
        } else if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
          if (currentSession.user.email) {
            localStorage.setItem('user_email', currentSession.user.email);
          }
          if (!rolesFetched) {
            rolesFetched = true;
            schedulePostAuthWork(currentSession.user.id, currentSession.user.email, false);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRole(null);
          setLoading(false);
          rolesFetched = false;
          // Clear email from localStorage on sign out
          localStorage.removeItem('user_email');
        } else if (event === 'INITIAL_SESSION' && !currentSession) {
          // No session on initial load
          setLoading(false);
        }
    });

    // Also check session directly (backup)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        // Save email to localStorage for instant display on refresh
        if (initialSession.user.email) {
          localStorage.setItem('user_email', initialSession.user.email);
        }
        if (!rolesFetched) {
          rolesFetched = true;
          window.setTimeout(() => {
            if (mounted) void fetchUserRole(initialSession.user.id);
          }, 0);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error('AuthContext: getSession error:', err);
      if (mounted) setLoading(false);
    });

    // Safety: release loading if getSession/onAuthStateChange never cleared it (functional update — no stale closure)
    const timeoutId = setTimeout(() => {
      if (!mounted) return;
      setLoading((prev) => {
        if (!prev) return prev;
        if (import.meta.env.DEV) {
          console.warn('AuthContext: loading safety release (still true after 2.5s)');
        }
        return false;
      });
    }, 2500);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchUserRole]);

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserRole(null);
      // Clear ALL localStorage auth data
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
      localStorage.removeItem('user_role_verified');
      localStorage.removeItem('user_security_key');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_id');
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_login_time');
      localStorage.removeItem('supplier_id');
      // Clear prefetch cache
      clearPrefetchCache();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setUser(null);
      setSession(null);
      setUserRole(null);
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
      localStorage.removeItem('user_role_verified');
      localStorage.removeItem('user_security_key');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_id');
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_login_time');
      localStorage.removeItem('supplier_id');
      clearPrefetchCache();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut, refreshSession, refreshUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
