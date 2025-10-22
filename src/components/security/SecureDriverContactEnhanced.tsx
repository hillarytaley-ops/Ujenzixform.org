import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Shield, User, AlertTriangle, Truck, Lock } from 'lucide-react';
import { useSecureDeliveries } from '@/hooks/useSecureDeliveries';
import { useToast } from '@/hooks/use-toast';

interface SecureDriverContactProps {
  deliveryId: string;
  deliveryStatus: string;
  className?: string;
}

export const SecureDriverContact: React.FC<SecureDriverContactProps> = ({
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
      // Log the access request with enhanced business justification
      const justification = `CRITICAL SECURITY: Driver contact needed for ${deliveryStatus} delivery - business coordination purposes only`;
      await logDriverContactAccess(deliveryId, justification);
      
      // Fetch secure delivery information using maximum security function
      const secureInfo = await getSecureDeliveryInfo(deliveryId);
      setDriverInfo(secureInfo);
      setHasRequested(true);

      toast({
        variant: secureInfo?.has_driver_assigned ? "default" : "destructive",
        title: secureInfo?.has_driver_assigned ? "Driver Assigned" : "No Driver Assigned",
        description: secureInfo?.driver_access_message || "Driver contact not available at this time."
      });
    } catch (error) {
      console.error('Error requesting driver contact:', error);
      toast({
        title: "Request Failed",
        description: "Failed to retrieve driver contact information. This access is heavily protected.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDriverInfo = () => {
    if (!hasRequested) {
      return (
        <Card className={`border-amber-200 bg-amber-50 ${className}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              PROTECTED: Driver Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <Lock className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>SECURITY NOTICE:</strong> Driver personal information is heavily protected to prevent harassment and identity theft.
                  Access is strictly controlled and logged for security monitoring.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Badge variant="outline" className="justify-center">Role: {currentUserRole || 'Unknown'}</Badge>
                <Badge variant="outline" className="justify-center">Status: {deliveryStatus}</Badge>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                <p><strong>Access Requirements:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Must be authenticated</li>
                  <li>• Must have business relationship</li>
                  <li>• Delivery must be active</li>
                  <li>• All access is logged</li>
                </ul>
              </div>

              <Button 
                onClick={handleRequestDriverContact}
                disabled={loading || !isAuthenticated}
                variant="outline"
                size="sm"
                className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <Shield className="h-3 w-3 mr-2" />
                {loading ? 'Processing Secure Request...' : 'Request Protected Driver Contact'}
              </Button>
              
              <p className="text-xs text-amber-700">
                Contact access is logged for security and only available during active delivery phases.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!driverInfo) {
      return (
        <Card className={`border-destructive ${className}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
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

    const hasDriver = driverInfo.has_driver_assigned;

    return (
      <Card className={`${hasDriver ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'} ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Delivery Status
            {hasDriver ? (
              <Badge variant="default" className="text-xs bg-green-600">DRIVER ASSIGNED</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">NO DRIVER YET</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert variant={hasDriver ? "default" : "destructive"}>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {driverInfo.driver_access_message}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasDriver ? "default" : "outline"}>
                {hasDriver ? 'Driver Assigned' : 'Pending Driver'}
              </Badge>
              <Badge variant="outline">Security Logged</Badge>
              <Badge variant="outline">Privacy Protected</Badge>
            </div>

            {!hasDriver && (
              <div className="text-xs text-amber-700 p-2 bg-amber-100 rounded border border-amber-200">
                <p><strong>PRIVACY PROTECTION:</strong></p>
                <p>Driver personal information is protected. Contact details will be available once a driver is assigned to your delivery.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderDriverInfo();
};