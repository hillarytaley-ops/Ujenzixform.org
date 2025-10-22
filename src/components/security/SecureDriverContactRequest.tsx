import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Shield, User, AlertTriangle } from 'lucide-react';
import { useSecureDeliveries } from '@/hooks/useSecureDeliveries';
import { useToast } from '@/hooks/use-toast';

interface SecureDriverContactRequestProps {
  deliveryId: string;
  deliveryStatus: string;
  className?: string;
}

export const SecureDriverContactRequest: React.FC<SecureDriverContactRequestProps> = ({
  deliveryId,
  deliveryStatus,
  className = ""
}) => {
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { getSecureDeliveryInfo, logDriverContactAccess, isAuthenticated, userRole: getUserRole } = useSecureDeliveries();
  const { toast } = useToast();

  const handleRequestDriverContact = async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request driver contact information.",
        variant: "destructive"
      });
      return;
    }

    // Get user role
    const role = await getUserRole();
    setCurrentUserRole(role);

    setLoading(true);
    try {
      // Log the access request with business justification
      const justification = `Requesting driver contact for delivery ${deliveryId} (status: ${deliveryStatus}) for business coordination purposes`;
      await logDriverContactAccess(deliveryId, justification);

      // Get secure delivery info which includes controlled driver data
      const deliveryData = await getSecureDeliveryInfo(deliveryId);
      
      if (deliveryData) {
        setDriverInfo(deliveryData);
        setHasRequested(true);
        
        toast({
          variant: deliveryData.has_driver_assigned ? "default" : "destructive",
          title: deliveryData.has_driver_assigned ? "Driver assigned" : "No driver assigned",
          description: deliveryData.driver_access_message || "Driver contact access is limited based on delivery status and your role."
        });
      } else {
        toast({
          title: "Delivery Not Found",
          description: "Could not retrieve delivery information.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting driver contact:', error);
      toast({
        title: "Request Failed",
        description: "Failed to process driver contact request. Please try again.",
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
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Secure Driver Contact</h3>
                <p className="text-sm text-muted-foreground">Request access to driver contact information</p>
              </div>
            </div>
            
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Driver contact information is protected and only available to authorized parties during active deliveries.
                All access requests are logged for security monitoring.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Role: {currentUserRole || 'Unknown'}</Badge>
              <Badge variant="outline">Delivery: {deliveryStatus}</Badge>
            </div>

            <Button 
              onClick={handleRequestDriverContact}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Processing Request...' : 'Request Driver Contact'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!driverInfo) {
      return (
        <Card className={`border-destructive ${className}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">No Driver Information Available</h3>
                <p className="text-sm text-muted-foreground">Driver details are not currently accessible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`${driverInfo.has_driver_assigned ? 'border-success' : 'border-warning'} ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Delivery Information</h3>
              <p className="text-sm text-muted-foreground">
                {driverInfo.has_driver_assigned ? 'Driver assigned' : 'Pending driver assignment'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {driverInfo.driver_access_message}
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Badge variant={driverInfo.has_driver_assigned ? "default" : "secondary"}>
                {driverInfo.has_driver_assigned ? 'Driver Assigned' : 'No Driver Yet'}
              </Badge>
              <Badge variant="outline">Logged & Monitored</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderDriverInfo();
};