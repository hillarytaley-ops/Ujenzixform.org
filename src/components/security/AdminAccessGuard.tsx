import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Users, AlertTriangle, Database, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole } from "@/types/userProfile";

interface AdminAccessGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'supplier';
  fallbackMessage?: string;
}

export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({ 
  children, 
  requiredRole = 'admin',
  fallbackMessage 
}) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  useEffect(() => {
    checkUserAccess();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
      } else if (event === 'SIGNED_IN' && session) {
        checkUserAccess();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserAccess = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // Get user profile and role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, user_type, is_professional, full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to verify user permissions');
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      setUserRole((roleData?.role as UserRole) || null);
      setLoading(false);

    } catch (error) {
      console.error('Error checking user access:', error);
      setUser(null);
      setUserRole(null);
      setLoading(false);
    }
  };

  const hasRequiredAccess = () => {
    if (requiredRole === 'admin') {
      return userRole === 'admin';
    }
    if (requiredRole === 'supplier') {
      return userRole === 'admin' || userRole === 'supplier';
    }
    return false;
  };

  const getAccessMessage = () => {
    if (!user) {
      return "Please log in to access this section";
    }
    
    if (requiredRole === 'admin' && userRole !== 'admin') {
      return "Administrator access required";
    }
    
    if (requiredRole === 'supplier' && !['admin', 'supplier'].includes(userRole || '')) {
      return "Supplier or administrator access required";
    }
    
    return fallbackMessage || "Insufficient permissions";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="space-y-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Verifying access permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasRequiredAccess()) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl flex items-center gap-2 justify-center">
              <Lock className="h-6 w-6" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              {getAccessMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> This section contains sensitive supplier information 
                including contact details, addresses, and business data. Access is restricted to 
                authorized personnel only.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">Your Role</span>
                  </div>
                  <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                    {userRole || 'No Role Assigned'}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-medium">Required Role</span>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {requiredRole === 'admin' ? 'Administrator' : 'Supplier/Admin'}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                className="w-full flex items-center gap-2"
              >
                {showSecurityInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecurityInfo ? 'Hide' : 'Show'} Security Information
              </Button>

              {showSecurityInfo && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Why is this restricted?</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Supplier contact information (emails, phone numbers) is confidential</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Business addresses and location data require protection</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Pricing and commercial information is sensitive</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Only verified administrators can access the full supplier directory</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.href = '/home'}
                className="flex-1"
              >
                Return to Home
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>Need access? Contact your system administrator.</p>
              <p className="mt-1">Logged in as: {user?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};