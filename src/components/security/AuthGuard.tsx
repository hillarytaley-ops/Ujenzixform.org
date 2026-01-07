import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const AuthGuard = ({ 
  children, 
  requireAdmin = false, 
  requireAuth = false,
  fallback 
}: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Get user role from user_roles table
              setTimeout(async () => {
                if (!mounted) return;
                
                try {
                  const { data: userRoles } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .limit(1);
                  
                  if (mounted) {
                    setUserRole(userRoles?.[0]?.role || 'builder');
                  }
                } catch (err) {
                  if (mounted) {
                    setUserRole('builder');
                  }
                } finally {
                  if (mounted) {
                    setLoading(false);
                  }
                }
              }, 0);
            } else {
              if (mounted) {
                setUserRole(null);
                setLoading(false);
              }
            }
          }
        );

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .limit(1);
            
            setUserRole(userRoles?.[0]?.role || 'builder');
          } catch (err) {
            setUserRole('builder');
          }
        }
        
        setLoading(false);
        
        return () => subscription.unsubscribe();
      } catch (err) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authentication requirements
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/home')}
              className="w-full"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin requirements
  if (requireAdmin && userRole !== 'admin') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              Administrator privileges required to access this resource
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-2">
                    🔒 Protected Content
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    This section contains sensitive business information that is restricted 
                    to prevent data harvesting and unauthorized access.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">
                      Current Role: {userRole || 'User'}
                    </Badge>
                    {user && (
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                        Account: {user.email}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                      Required: Administrator
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/home')}
                className="flex-1"
              >
                Return Home
              </Button>
              {!user && (
                <Button 
                  onClick={() => navigate('/auth')}
                  className="flex-1"
                >
                  Sign In
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};