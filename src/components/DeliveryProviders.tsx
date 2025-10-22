import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, AlertTriangle, Truck, User, Building, Plus } from "lucide-react";
import { DeliveryProviderDirectory } from "./delivery/DeliveryProviderDirectory";
import DelivererApplication from "./DelivererApplication";

const DeliveryProviders = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const role = roleData?.role || 'builder';
      setUserRole(role);

      // Check if user has access to delivery provider information
      if (role !== 'admin') {
        setAccessDenied(true);
      }

    } catch (error) {
      console.error('Error checking access:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (accessDenied && userRole !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted - Admin Only</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Delivery provider information is strictly confidential and restricted to UjenziPro administrators only.</strong>
              </p>
              <p>
                This includes provider contact details, personal information, vehicle data, and operational information.
                All delivery provider data is protected under our privacy and security policies.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Public Information About Delivery Services */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Services Available
            </CardTitle>
            <CardDescription>
              UjenziPro partners with both private delivery providers and delivery companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Private Delivery Providers</h3>
                    <p className="text-sm text-muted-foreground">
                      Individual drivers with personal vehicles
                    </p>
                  </div>
                </div>
                <ul className="text-sm space-y-1 ml-11">
                  <li>• Flexible and personalized service</li>
                  <li>• Competitive rates for small deliveries</li>
                  <li>• Direct communication with driver</li>
                  <li>• Ideal for urgent or specialized deliveries</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Delivery Companies</h3>
                    <p className="text-sm text-muted-foreground">
                      Professional logistics companies with fleets
                    </p>
                  </div>
                </div>
                <ul className="text-sm space-y-1 ml-11">
                  <li>• Large capacity and fleet availability</li>
                  <li>• Professional logistics management</li>
                  <li>• Insurance and liability coverage</li>
                  <li>• Ideal for bulk and scheduled deliveries</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Privacy Protection</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    All delivery provider contact information is protected and only accessible to UjenziPro administrators. 
                    Delivery coordination is handled through our secure platform to protect provider privacy and ensure professional service.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Become a Delivery Provider
            </CardTitle>
            <CardDescription>
              Join our network as either a private provider or delivery company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DelivererApplication />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view with full access
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Delivery Provider Management</h1>
          <p className="text-muted-foreground">
            Manage private providers and delivery companies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-600">Admin Access</span>
        </div>
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Provider Directory
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <DeliveryProviderDirectory userRole={userRole} showAdminView={true} />
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Provider Application</CardTitle>
              <CardDescription>
                Register new private providers or delivery companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DelivererApplication />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryProviders;