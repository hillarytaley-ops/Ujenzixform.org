import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthRequiredProps {
  children: React.ReactNode;
}

export const AuthRequired = ({ children }: AuthRequiredProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session && location.pathname !== '/auth' && location.pathname !== '/') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);

      // If not authenticated and trying to access protected route, redirect to auth
      if (!session && location.pathname !== '/auth' && location.pathname !== '/') {
        navigate('/auth');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
              <Lock className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription className="text-base mt-2">
              Please sign in to access UjenziPro's construction marketplace features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Access includes:
              </p>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>• Browse certified builders and suppliers</li>
                <li>• Request deliveries and track shipments</li>
                <li>• Scan QR codes for material verification</li>
                <li>• Monitor construction sites (if authorized)</li>
                <li>• Create purchase orders and invoices</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link to="/auth" className="block">
                <Button className="w-full" size="lg">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Sign In / Sign Up
                </Button>
              </Link>
              
              <p className="text-center text-sm text-muted-foreground">
                New to UjenziPro?{' '}
                <Link to="/auth" className="text-primary hover:underline font-medium">
                  Create a free account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

