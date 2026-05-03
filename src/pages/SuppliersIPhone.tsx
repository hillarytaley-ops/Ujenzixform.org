import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Shield, Database, Users, FileText, Truck, Building, UserPlus } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGridSafe } from "@/components/suppliers/MaterialsGridSafe";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { DashboardLoader } from "@/components/ui/DashboardLoader";

// Ultra-safe iPhone-optimized Suppliers page for admin
const SuppliersIPhone = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // FAST: Use cached values first for instant display
    const cachedRole = localStorage.getItem('user_role');
    const cachedUserId = localStorage.getItem('user_id');
    
    if (cachedRole && cachedUserId) {
      setUser({ id: cachedUserId });
      setUserRole(cachedRole);
      setIsAdmin(cachedRole === 'admin');
      setLoading(false);
    }
    
    // Then verify with Supabase in background
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('user_id', session.user.id);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();
        
        const role = roleData?.role || 'builder';
        setUserRole(role);
        setIsAdmin(role === 'admin');
        if (role) localStorage.setItem('user_role', role);
      } else {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is a delivery provider - they cannot access this marketplace
  const isDeliveryProvider = userRole === 'delivery' || userRole === 'delivery_provider';

  if (loading) {
    return <DashboardLoader message="Loading marketplace..." />;
  }

  // Block delivery providers from accessing the suppliers marketplace
  if (user && isDeliveryProvider) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Navigation />
        
        <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Marketplace Access Restricted</h1>
              <p className="text-lg text-teal-100 mb-6">
                The Suppliers Marketplace is exclusively for registered builders and suppliers. 
                As a delivery provider, you have access to delivery management features instead.
              </p>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-8">
                <p className="text-sm">
                  You are currently signed in as: <strong className="capitalize">Delivery Provider</strong>
                </p>
              </div>
              
              <div className="space-y-4">
                <p className="text-teal-100">
                  Access your delivery dashboard to manage pickups and deliveries.
                </p>
                <Button 
                  size="lg"
                  className="bg-white text-teal-700 hover:bg-gray-100"
                  onClick={() => navigate('/delivery-dashboard')}
                >
                  <Truck className="h-5 w-5 mr-2" />
                  Go to Delivery Dashboard
                </Button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/20">
                <p className="text-sm text-teal-100 mb-4">
                  Want to purchase materials? Register as a builder:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/professional-builder-registration')}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    CO/Contractor
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => navigate('/private-builder-registration')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Private Builder
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <CartSidebar />
      <FloatingCartButton />

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
              className="cursor-pointer shadow-md"
              onClick={() => navigate('/admin-dashboard?tab=registrations')}
            >
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold">Applications</h3>
                <p className="text-sm text-muted-foreground">Supplier Applications</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer shadow-md"
              onClick={() => navigate('/admin-dashboard?tab=user-roles')}
            >
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">Users</h3>
                <p className="text-sm text-muted-foreground">Registered Users</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer shadow-md"
              onClick={() => window.location.href = '/analytics'}
            >
              <CardContent className="p-6 text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-sm text-muted-foreground">Reports & metrics</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer shadow-md"
              onClick={() => navigate('/admin-dashboard?tab=security')}
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
              Tip: Applications, users, and security open the full admin dashboard. Use landscape or desktop for dense tables.
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

