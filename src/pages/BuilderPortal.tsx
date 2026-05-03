import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Store, 
  FileText, 
  TrendingUp, 
  Package,
  User,
  Building2,
  Clock,
  CheckCircle,
  Truck,
  Phone
} from 'lucide-react';

const BuilderPortal = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setProfile(profileData);

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const isPrivateClient = userRole === 'private_client';
  const isProfessionalBuilder = userRole === 'professional_builder' || userRole === 'builder';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              {isPrivateClient ? <User className="h-10 w-10" /> : <Building2 className="h-10 w-10" />}
              <div>
                <h1 className="text-4xl font-bold">
                  Welcome back, {profile?.full_name || 'Builder'}!
                </h1>
                <p className="text-blue-100 text-lg">
                  {isPrivateClient ? 'Private Client Portal' : 'CO/Contractor Portal'}
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {isPrivateClient ? '🏠 Private Client' : '👔 CO/Contractor'}
            </Badge>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Browse Materials */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 hover:border-blue-400"
              onClick={() => navigate('/suppliers?from=dashboard')}
            >
              <CardContent className="p-6">
                <Store className="h-10 w-10 text-blue-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">Browse Materials</h3>
                <p className="text-sm text-muted-foreground">
                  {isPrivateClient 
                    ? 'Shop for construction materials' 
                    : 'Find suppliers and request quotes'}
                </p>
                <Button className="w-full mt-4 bg-blue-600">
                  Go to Marketplace
                </Button>
              </CardContent>
            </Card>

            {/* My Orders */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => toast({ title: 'Coming Soon', description: 'Order tracking feature' })}
            >
              <CardContent className="p-6">
                <ShoppingCart className="h-10 w-10 text-green-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">My Orders</h3>
                <p className="text-sm text-muted-foreground">
                  Track your material orders
                </p>
                <Button variant="outline" className="w-full mt-4">
                  View Orders
                </Button>
              </CardContent>
            </Card>

            {/* Deliveries */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/delivery')}
            >
              <CardContent className="p-6">
                <Truck className="h-10 w-10 text-orange-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">Deliveries</h3>
                <p className="text-sm text-muted-foreground">
                  Request and track deliveries
                </p>
                <Button variant="outline" className="w-full mt-4">
                  Manage Deliveries
                </Button>
              </CardContent>
            </Card>

            {/* Support */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/contact')}
            >
              <CardContent className="p-6">
                <Phone className="h-10 w-10 text-purple-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help from our team
                </p>
                <Button variant="outline" className="w-full mt-4">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile?.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{profile?.location || 'Not set'}</p>
              </div>
              {profile?.company_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{profile.company_name}</p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => toast({ title: 'Coming Soon', description: 'Profile editing feature' })}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Registration Complete</p>
                    <p className="text-sm text-muted-foreground">Your account is set up and ready</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Browse Materials</p>
                    <p className="text-sm text-muted-foreground">
                      {isPrivateClient 
                        ? 'Click "Browse Materials" to start shopping'
                        : 'Click "Browse Materials" to request quotes'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Place Your First Order</p>
                    <p className="text-sm text-muted-foreground">
                      {isPrivateClient
                        ? 'Use "Buy Now" for direct purchases'
                        : 'Use "Request Quote" to compare prices'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Building?</h3>
            <p className="text-muted-foreground mb-6">
              Browse our marketplace of verified suppliers and quality construction materials
            </p>
            <Button 
              size="lg" 
              className={isPrivateClient ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              onClick={() => navigate('/suppliers?from=dashboard')}
            >
              <Store className="h-5 w-5 mr-2" />
              Browse Materials Marketplace
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default BuilderPortal;

