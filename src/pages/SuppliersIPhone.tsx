import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Shield, Database, Users, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGridSafe } from "@/components/suppliers/MaterialsGridSafe";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

// Ultra-safe iPhone-optimized Suppliers page for admin
const SuppliersIPhone = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        const role = roleData?.role || 'builder';
        setUserRole(role);
        setIsAdmin(role === 'admin');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Admin Header */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">🇰🇪 Admin Dashboard</h1>
            <p className="text-muted-foreground mb-4">
              Welcome, Administrator - Full access enabled
            </p>
            <div className="space-y-2">
              <Badge className="bg-blue-600 text-white">✅ Admin Access</Badge>
              <Badge variant="outline">📱 iPhone Optimized</Badge>
            </div>
          </div>
        )}

        {/* Materials Marketplace */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <Package className="h-5 w-5 inline mr-2" />
              Materials Marketplace
            </CardTitle>
            <CardDescription>
              Browse construction materials from suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialsGridSafe />
          </CardContent>
        </Card>

        {/* Admin Quick Links */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => toast({ title: 'Applications', description: 'Supplier applications - coming soon on mobile' })}
            >
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold">Applications</h3>
                <p className="text-sm text-muted-foreground">Supplier Applications</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => toast({ title: 'Users', description: 'User management - coming soon on mobile' })}
            >
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">Users</h3>
                <p className="text-sm text-muted-foreground">Registered Users</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => window.location.href = '/analytics'}
            >
              <CardContent className="p-6 text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold">ML Analytics</h3>
                <p className="text-sm text-muted-foreground">AI Insights</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => toast({ title: 'Security', description: 'Security dashboard - coming soon on mobile' })}
            >
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <h3 className="font-semibold">Security</h3>
                <p className="text-sm text-muted-foreground">System Security</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desktop Note */}
        {isAdmin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              💡 For full admin features (Applications, User Management, etc.), please use desktop browser
            </p>
          </div>
        )}

        {/* Non-admin Message */}
        {!isAdmin && (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Browse materials and suppliers. Sign in as admin for additional features.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default SuppliersIPhone;

