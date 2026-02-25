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

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, currentSession?.user?.email);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          // User just signed in - fetch role immediately
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
          rolesFetched = true;
          // Save email and user_id to localStorage for instant display on refresh
          if (currentSession.user.email) {
            localStorage.setItem('user_email', currentSession.user.email);
          }
          localStorage.setItem('user_id', currentSession.user.id);
          
          // Fetch role synchronously on sign-in AND trigger prefetch
          await fetchUserRole(currentSession.user.id, true);
          
          // Also fetch user profile name for display
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', currentSession.user.id)
              .single();
            if (profile?.full_name) {
              localStorage.setItem('user_name', profile.full_name);
            }
          } catch (e) {
            // Profile fetch is optional, don't fail
          }
        } else if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
          // Save email to localStorage for instant display on refresh
          if (currentSession.user.email) {
            localStorage.setItem('user_email', currentSession.user.email);
          }
          // Fetch role in background (only once)
          if (!rolesFetched) {
            rolesFetched = true;
            fetchUserRole(currentSession.user.id).catch(console.error);
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
      }
    );

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
          fetchUserRole(initialSession.user.id).catch(console.error);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error('AuthContext: getSession error:', err);
      if (mounted) setLoading(false);
    });

    // Safety timeout - ensure loading is false after 1 second
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.log('AuthContext: Safety timeout - setting loading false');
        setLoading(false);
      }
    }, 1000);

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
