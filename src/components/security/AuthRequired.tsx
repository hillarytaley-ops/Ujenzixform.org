/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔒 AUTH REQUIRED COMPONENT - BASIC AUTHENTICATION GATE                            ║
 * ║                                                                                      ║
 * ║   ⚠️  SECURITY COMPONENT - DO NOT MODIFY WITHOUT REVIEW  ⚠️                         ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE: Ensures user is authenticated before accessing protected routes          ║
 * ║   NOTE: This does NOT check roles - use RoleProtectedRoute for role-based access    ║
 * ║                                                                                      ║
 * ║   AUTHENTICATION SOURCES (in order):                                                 ║
 * ║   1. Supabase session (primary)                                                      ║
 * ║   2. Admin localStorage session (24-hour expiry)                                     ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

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
    // Allow access to auth pages without authentication
    const publicPaths = ['/auth', '/admin-login'];
    if (publicPaths.includes(location.pathname)) {
      setIsAuthenticated(true); // Bypass auth check for auth pages
      setLoading(false);
      return;
    }

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Check admin localStorage fallback
      const adminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const isAuth = !!session || adminAuthenticated;
      
      setIsAuthenticated(isAuth);
      if (!isAuth && !publicPaths.includes(location.pathname)) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Also check localStorage for admin authentication (fallback for admin portal)
      const adminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const adminLoginTime = localStorage.getItem('admin_login_time');
      
      // Check if admin session is still valid (24 hour expiry)
      const isAdminSessionValid = adminAuthenticated && adminLoginTime && 
        (Date.now() - parseInt(adminLoginTime)) < 24 * 60 * 60 * 1000;
      
      const isAuthenticated = !!session || isAdminSessionValid;
      
      setIsAuthenticated(isAuthenticated);
      setLoading(false);

      // If not authenticated, redirect to auth page
      if (!isAuthenticated) {
        navigate('/auth');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      
      // Check localStorage fallback even on error
      const adminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      if (adminAuthenticated) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
      
      setIsAuthenticated(false);
      setLoading(false);
      navigate('/auth');
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

