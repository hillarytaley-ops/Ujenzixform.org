import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CreditCard, 
  Home,
  LogOut,
  User,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Heart
} from "lucide-react";

const PrivateClientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/private-client-signin');
        return;
      }

      setUser(user);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);

      // Verify role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role !== 'private_client') {
        toast({
          title: "Access Denied",
          description: "This dashboard is for Private Clients only.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Mock stats - replace with real data
      setStats({
        totalOrders: 12,
        pendingOrders: 2,
        completedOrders: 10,
        totalSpent: 245000,
      });

    } catch (error) {
      console.error('Auth error:', error);
      navigate('/private-client-signin');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {profile?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-green-100">Private Client Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/suppliers">
                <Button className="bg-white text-green-700 hover:bg-green-50">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shop Materials
                </Button>
              </Link>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto max-w-7xl px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">KES {stats.totalSpent.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="orders" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Heart className="h-4 w-4 mr-2" />
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Recent Orders
                </CardTitle>
                <CardDescription>Track and manage your material orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mb-4">Start shopping for construction materials</p>
                  <Link to="/suppliers">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Browse Materials
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  Active Deliveries
                </CardTitle>
                <CardDescription>Track your incoming deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No active deliveries</p>
                  <p className="text-sm">Your deliveries will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Payment History
                </CardTitle>
                <CardDescription>View your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No payments yet</p>
                  <p className="text-sm">Your payment history will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  My Wishlist
                </CardTitle>
                <CardDescription>Products you've saved for later</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Your wishlist is empty</p>
                  <p className="text-sm mb-4">Save products you're interested in</p>
                  <Link to="/suppliers">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Explore Products
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default PrivateClientDashboard;

