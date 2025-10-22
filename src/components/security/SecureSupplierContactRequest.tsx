import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Mail, MapPin, Shield, User, AlertTriangle, Building } from 'lucide-react';
import { useSecureSuppliers } from '@/hooks/useSecureSuppliers';
import { useToast } from '@/hooks/use-toast';

interface SecureSupplierContactRequestProps {
  supplierId: string;
  supplierName: string;
  className?: string;
}

export const SecureSupplierContactRequest: React.FC<SecureSupplierContactRequestProps> = ({
  supplierId,
  supplierName,
  className = ""
}) => {
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const { getSupplierWithContact, isAuthenticated, userRole } = useSecureSuppliers();
  const { toast } = useToast();

  const handleRequestSupplierContact = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request supplier contact information.",
        variant: "destructive"
      });
      return;
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      toast({
        title: "Access Restricted",
        description: "Supplier contact information is restricted to administrators only.",
        variant: "destructive"
      });
      setSupplierInfo({
        id: supplierId,
        company_name: supplierName,
        contact_person: 'Admin access required',
        email: 'Admin access required',
        phone: 'Admin access required',
        address: 'Admin access required',
        access_granted: false,
        access_reason: 'Contact information restricted to administrators only'
      });
      setHasRequested(true);
      return;
    }

    setLoading(true);
    try {
      // Get secure supplier info with emergency contact protection (admin only)
      const supplierData = await getSupplierWithContact(supplierId);
      
      if (supplierData) {
        setSupplierInfo(supplierData);
        setHasRequested(true);
        
        if (supplierData.access_granted && supplierData.email && supplierData.email !== 'Admin access required') {
          toast({
            title: "Contact Information Authorized",
            description: "Contact information access granted (Administrator)",
            variant: "default"
          });
        } else {
          toast({
            title: "Contact Access Restricted",
            description: supplierData.access_reason || "Contact information requires administrator privileges.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Supplier Not Found",
          description: "Could not retrieve supplier information.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting supplier contact:', error);
      toast({
        title: "Request Failed",
        description: "Failed to process supplier contact request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSupplierInfo = () => {
    if (!hasRequested) {
      return (
        <Card className={`border-muted ${className}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Secure Supplier Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{supplierName}</h3>
                  <p className="text-sm text-muted-foreground">Request contact information</p>
                </div>
              </div>
              
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Contact information is protected and only available to administrators.
                  All access requests are logged for security monitoring.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <Badge variant="outline">Role: {userRole || 'Unknown'}</Badge>
                <Badge variant="outline">Status: {isAuthenticated ? 'Authenticated' : 'Guest'}</Badge>
                {userRole !== 'admin' && (
                  <Badge variant="destructive">Admin Required</Badge>
                )}
              </div>

              <Button 
                onClick={handleRequestSupplierContact}
                disabled={loading || !isAuthenticated}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Processing Request...' : 'Request Contact Information'}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Contact access requires administrator privileges. Non-admin requests are logged and denied.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!supplierInfo) {
      return (
        <Card className={`border-destructive ${className}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">No Supplier Information Available</h3>
                <p className="text-sm text-muted-foreground">Supplier details are not currently accessible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`${supplierInfo.access_granted ? 'border-success' : 'border-warning'} ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            {supplierInfo.company_name}
            {supplierInfo.access_granted ? (
              <Badge variant="default" className="text-xs">Admin Access</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Access Denied</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Person:
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {supplierInfo.contact_person}
                </span>
              </div>

              {supplierInfo.access_granted && supplierInfo.email && supplierInfo.email !== 'Admin access required' ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email:
                    </span>
                    <a 
                      href={`mailto:${supplierInfo.email}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {supplierInfo.email}
                    </a>
                  </div>

                  {supplierInfo.phone && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone:
                      </span>
                      <a 
                        href={`tel:${supplierInfo.phone}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {supplierInfo.phone}
                      </a>
                    </div>
                  )}

                  {supplierInfo.address && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address:
                      </span>
                      <span className="text-sm font-semibold text-foreground text-right">
                        {supplierInfo.address}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    {supplierInfo.access_reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={supplierInfo.access_granted ? "default" : "destructive"}>
                {supplierInfo.access_granted ? 'Admin Access Granted' : 'Access Denied'}
              </Badge>
              <Badge variant="outline">Security Monitored</Badge>
              {supplierInfo.is_verified && <Badge variant="outline">Verified Supplier</Badge>}
            </div>

            {!supplierInfo.access_granted && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <p><strong>Emergency Contact Protection Active:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Administrator privileges required</li>
                  <li>• Contact information is strictly protected</li>
                  <li>• All access attempts are logged and monitored</li>
                  <li>• Non-admin access attempts are immediately blocked</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderSupplierInfo();
};