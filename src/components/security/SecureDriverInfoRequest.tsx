import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Shield, User, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from "@/types/userProfile";

interface SecureDriverInfoRequestProps {
  deliveryId: string;
  deliveryStatus: string;
  className?: string;
}

export const SecureDriverInfoRequest: React.FC<SecureDriverInfoRequestProps> = ({
  deliveryId,
  deliveryStatus,
  className = ""
}) => {
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRequestDriverInfo = async () => {
    setLoading(true);
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access driver information.",
          variant: "destructive"
        });
        return;
      }

      // Get user role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      setUserRole((roleData?.role as UserRole) || null);

      // Use enhanced secure function
      const { data, error } = await supabase
        .rpc('get_delivery_info_secure', { delivery_uuid: deliveryId });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const deliveryData = data[0];
        setDriverInfo(deliveryData);
        setHasRequested(true);
        
        if (deliveryData.can_view_driver_details) {
          toast({
            title: "Driver Information Authorized",
            description: "You now have access to driver contact information based on your business relationship.",
            variant: "default"
          });
        } else {
          toast({
            title: "Access Restricted",
            description: deliveryData.driver_contact_access_message || "Driver contact access is limited based on delivery status and your role.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Delivery Not Found",
          description: "Could not retrieve delivery information.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting driver info:', error);
      toast({
        title: "Request Failed",
        description: "Failed to process driver information request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDriverInfo = () => {
    if (!hasRequested) {
      return (
        <Card className={`border-muted ${className}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Secure Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Driver Contact Request</h3>
                  <p className="text-sm text-muted-foreground">Access protected driver information</p>
                </div>
              </div>
              
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>CRITICAL SECURITY:</strong> Driver personal information is highly protected. 
                  Access is strictly controlled and all requests are logged for security monitoring.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <Badge variant="outline">Status: {deliveryStatus}</Badge>
                <Badge variant="outline">Role: {userRole || 'Unknown'}</Badge>
              </div>

              <Button 
                onClick={handleRequestDriverInfo}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Processing Secure Request...' : 'Request Driver Information'}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Access requires authentication and active business relationship. All requests are logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!driverInfo) {
      return (
        <Card className={`border-destructive ${className}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">No Driver Information Available</h3>
                <p className="text-sm text-muted-foreground">Driver details could not be retrieved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`${driverInfo.can_view_driver_details ? 'border-success' : 'border-warning'} ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Driver Information
            {driverInfo.can_view_driver_details ? (
              <Badge variant="default" className="text-xs">Access Authorized</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Access Restricted</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Driver Status:
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {driverInfo.has_driver_assigned ? 'Driver Assigned' : 'No Driver Assigned'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information:
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {driverInfo.driver_display_info}
                </span>
              </div>
            </div>

            {!driverInfo.can_view_driver_details && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  {driverInfo.driver_contact_access_message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={driverInfo.can_view_driver_details ? "default" : "secondary"}>
                {driverInfo.can_view_driver_details ? 'Access Authorized' : 'Access Restricted'}
              </Badge>
              <Badge variant="outline">{driverInfo.security_level}</Badge>
              <Badge variant="outline">Logged & Monitored</Badge>
            </div>

            {!driverInfo.can_view_driver_details && (
              <div className="text-xs text-muted-foreground p-3 bg-amber-50 border border-amber-200 rounded">
                <p><strong>To access driver contact information:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Delivery must be in progress or out for delivery</li>
                  <li>• You must be the builder (for active deliveries)</li>
                  <li>• You must be the assigned supplier (for active deliveries)</li>
                  <li>• Admin access is always available</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderDriverInfo();
};