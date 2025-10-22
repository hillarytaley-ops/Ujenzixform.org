import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Shield, User, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UltraSecureDriverAccessProps {
  deliveryId: string;
  deliveryStatus: string;
  className?: string;
}

interface SecureDriverContact {
  delivery_id: string;
  driver_name: string;
  driver_phone: string;
  driver_email: string;
  can_access_contact: boolean;
  security_message: string;
  access_level: string;
  // Legacy compatibility properties
  can_view_driver_contact?: boolean;
  driver_display_name?: string;
  driver_contact_info?: string;
}

export const UltraSecureDriverAccess: React.FC<UltraSecureDriverAccessProps> = ({
  deliveryId,
  deliveryStatus,
  className = ""
}) => {
  const [driverInfo, setDriverInfo] = useState<SecureDriverContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { toast } = useToast();

  const handleSecureDriverRequest = async () => {
    if (!deliveryId) {
      toast({
        title: "Invalid Request",
        description: "No delivery ID provided for driver contact request.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use the new ultra-secure function
      const { data, error } = await supabase
        .rpc('get_secure_driver_contact', { delivery_uuid: deliveryId });

      if (error) {
        console.error('Security function error:', error);
        toast({
          title: "Security Error",
          description: "Failed to process secure driver contact request. This incident has been logged.",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        const contactInfo = data[0] as SecureDriverContact;
        setDriverInfo(contactInfo);
        setHasRequested(true);
        
        if (contactInfo.can_access_contact) {
          toast({
            title: "Access Authorized",
            description: "Driver contact information access has been granted based on your business relationship.",
            variant: "default"
          });
        } else {
          toast({
            title: "Access Restricted",
            description: contactInfo.security_message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "No Data",
          description: "No driver contact information could be retrieved.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Ultra-secure driver access error:', error);
      toast({
        title: "Security Violation",
        description: "This unauthorized access attempt has been logged for security monitoring.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSecurityWarning = () => (
    <Alert className="border-red-200 bg-red-50 mb-4">
      <Lock className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <strong>MAXIMUM SECURITY PROTECTION:</strong> Driver personal information is ultra-protected to prevent harassment, identity theft, and unauthorized tracking. Access is strictly controlled, heavily logged, and only available during active deliveries to authorized business partners.
      </AlertDescription>
    </Alert>
  );

  const renderRequestInterface = () => (
    <Card className={`border-amber-200 bg-amber-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-600" />
          ULTRA-SECURE: Driver Contact Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderSecurityWarning()}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Badge variant="outline" className="justify-center">Status: {deliveryStatus}</Badge>
            <Badge variant="outline" className="justify-center">Security: Maximum</Badge>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
            <p><strong>Ultra-Strict Access Requirements:</strong></p>
            <ul className="mt-2 space-y-1">
              <li>• Must be authenticated and authorized</li>
              <li>• Must have active business relationship</li>
              <li>• Delivery must be in progress or out for delivery</li>
              <li>• All access attempts are logged and monitored</li>
              <li>• Security violations are reported immediately</li>
            </ul>
          </div>

          <Button 
            onClick={handleSecureDriverRequest}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <Shield className="h-3 w-3 mr-2" />
            {loading ? 'Processing Ultra-Secure Request...' : 'Request Protected Driver Contact'}
          </Button>
          
          <p className="text-xs text-amber-700">
            This request will be logged for security monitoring and audit purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderDriverInfo = () => {
    if (!driverInfo) {
      return (
        <Card className={`border-destructive ${className}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">No Driver Information Available</h3>
                <p className="text-sm text-muted-foreground">Driver details could not be retrieved or access was denied</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const isAuthorized = driverInfo.can_access_contact;

    return (
      <Card className={`${isAuthorized ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Ultra-Secure Driver Information
            {isAuthorized ? (
              <Badge variant="default" className="text-xs bg-green-600">AUTHORIZED ACCESS</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">ACCESS DENIED</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Driver:
              </span>
              <span className="text-sm font-semibold text-foreground">
                {driverInfo.driver_name}
              </span>
            </div>

            {isAuthorized && driverInfo.driver_phone ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContactInfo(!showContactInfo)}
                      className="h-6 w-6 p-0"
                    >
                      {showContactInfo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    {showContactInfo ? (
                      <a 
                        href={`tel:${driverInfo.driver_phone}`}
                        className="text-sm font-semibold text-green-800 hover:underline"
                      >
                        {driverInfo.driver_phone}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-green-800">
                        ••• ••• ••••
                      </span>
                    )}
                  </div>
                </div>
                
                <Alert className="border-green-200 bg-green-100">
                  <Shield className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-800">
                    <strong>AUTHORIZED ACCESS:</strong> You have been granted access to driver contact information based on your verified business relationship and the active delivery status.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert variant={isAuthorized ? "default" : "destructive"}>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  {driverInfo.security_message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isAuthorized ? "default" : "destructive"}>
                {isAuthorized ? 'Contact Authorized' : 'Contact Restricted'}
              </Badge>
              <Badge variant="outline">Ultra-Secure Logged</Badge>
              <Badge variant="outline">GDPR Protected</Badge>
              <Badge variant="outline">Anti-Harassment</Badge>
            </div>

            {!isAuthorized && (
              <div className="text-xs text-red-700 p-3 bg-red-100 rounded border border-red-200">
                <p><strong>MAXIMUM PRIVACY PROTECTION:</strong></p>
                <p>Driver personal information is ultra-protected to prevent harassment, identity theft, and unauthorized tracking. Contact is only available during active delivery phases for verified authorized participants.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!hasRequested) {
    return renderRequestInterface();
  }

  return renderDriverInfo();
};