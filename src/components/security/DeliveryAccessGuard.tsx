import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Lock, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface DeliveryAccessGuardProps {
  children: ReactNode;
  requiredAuth?: boolean;
  allowedRoles?: string[];
  feature?: string;
}

export const DeliveryAccessGuard = ({ 
  children, 
  requiredAuth = true,
  allowedRoles = ['builder', 'supplier', 'admin'],
  feature = 'delivery services'
}: DeliveryAccessGuardProps) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!requiredAuth) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setUser(user);

      // Get user role from user_roles table
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (userRoles && userRoles.length > 0) {
        const primaryRole = userRoles[0].role;
        setUserRole(primaryRole);
        setHasAccess(allowedRoles.includes(primaryRole));
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Access check error:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {!user ? (
            <Alert className="border-amber-200 bg-amber-50">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-amber-800">Authentication Required</h3>
                    <p className="text-amber-700">
                      Please sign in to access {feature}. Only registered members can use delivery features.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-red-800">Access Restricted</h3>
                    <p className="text-red-700">
                      Your account role ({userRole}) doesn't have permission to access {feature}.
                      Contact support to upgrade your account permissions.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to="/">Return Home</Link>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};