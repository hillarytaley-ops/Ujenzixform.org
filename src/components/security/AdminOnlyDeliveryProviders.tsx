import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminAccessGuard } from "@/components/security/AdminAccessGuard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, Truck, MapPin, Phone, CheckCircle, XCircle, Shield, Lock, AlertTriangle } from "lucide-react";

interface DeliveryProvider {
  id: string;
  provider_name: string;
  provider_type: string;
  vehicle_types: string[];
  service_areas: string[];
  capacity_kg: number;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_deliveries: number;
  phone?: string;
  email?: string;
  address?: string;
  contact_status: string;
}

export const AdminOnlyDeliveryProviders: React.FC = () => {
  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminProviders();
  }, []);

  const fetchAdminProviders = async () => {
    try {
      setLoading(true);
      
      // Only admin can access delivery provider information
      const { data: adminData, error: adminError } = await supabase.rpc('get_delivery_providers_admin_only');
      
      if (adminError) {
        console.error('Admin provider access error:', adminError);
        toast({
          title: "Access Restricted",
          description: "Only UjenziPro administrators can access delivery provider information.",
          variant: "destructive"
        });
        return;
      }

      if (adminData && adminData.length > 0) {
        setProviders(adminData);
        toast({
          title: "Admin Provider Directory",
          description: `Loaded ${adminData.length} delivery providers with full administrative access.`,
        });
      } else {
        setProviders([]);
        toast({
          title: "No Providers Found",
          description: "No delivery providers available in the system.",
          variant: "default"
        });
      }

    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery provider information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAccessGuard 
      requiredRole="admin" 
      fallbackMessage="Access denied. Only UjenziPro administrators can view delivery provider information."
    >
      <div className="space-y-6">
        {/* Admin-Only Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Delivery Providers Management</h1>
            <p className="text-muted-foreground">Administrative access to delivery provider information</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              <Shield className="h-3 w-3 mr-1" />
              ADMIN ONLY
            </Badge>
            <Button variant="outline" onClick={fetchAdminProviders}>
              Refresh Providers
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4" />
          <AlertTitle>Administrative Access Only</AlertTitle>
          <AlertDescription>
            <strong>CRITICAL SECURITY:</strong> Delivery provider information including contact details, 
            personal information, and operational data is restricted to UjenziPro administrators only. 
            Builders and suppliers do not have access to this information for security and privacy protection.
          </AlertDescription>
        </Alert>

        {/* Providers Grid - Admin Only */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
              <span className="ml-2">Loading providers...</span>
            </div>
          ) : providers.length > 0 ? (
            providers.map((provider) => (
              <Card key={provider.id} className="border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{provider.provider_name}</CardTitle>
                    <div className="flex gap-1">
                      {provider.is_verified && (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {provider.is_active ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      <span>{provider.rating}/5.0</span>
                      <span className="text-muted-foreground">
                        ({provider.total_deliveries} deliveries)
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>{provider.vehicle_types?.join(', ') || 'Various vehicles'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{provider.service_areas?.join(', ') || 'Service areas available'}</span>
                      </div>

                      {provider.capacity_kg && (
                        <div>
                          <span className="font-medium">Capacity:</span> {provider.capacity_kg} kg
                        </div>
                      )}

                      <div>
                        <span className="font-medium">Type:</span> {provider.provider_type}
                      </div>

                      {/* Admin-Only Contact Information */}
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          ADMIN-ONLY INFORMATION
                        </div>
                        {provider.phone && (
                          <div className="text-xs">
                            <span className="font-medium">Phone:</span> {provider.phone}
                          </div>
                        )}
                        {provider.email && (
                          <div className="text-xs">
                            <span className="font-medium">Email:</span> {provider.email}
                          </div>
                        )}
                        {provider.address && (
                          <div className="text-xs">
                            <span className="font-medium">Address:</span> {provider.address}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Provider
                      </Button>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Delivery Providers</h3>
              <p className="text-muted-foreground">No delivery providers found in the system.</p>
            </div>
          )}
        </div>
      </div>
    </AdminAccessGuard>
  );
};
