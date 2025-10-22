import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useSecureSuppliers } from "@/hooks/useSecureSuppliers";
import { toast } from "sonner";

interface UltraSecureSupplierContactRequestProps {
  supplierId: string;
  supplierName: string;
  className?: string;
}

export const UltraSecureSupplierContactRequest = ({ 
  supplierId, 
  supplierName, 
  className = "" 
}: UltraSecureSupplierContactRequestProps) => {
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const { getSupplierWithContact } = useSecureSuppliers();

  const handleRequestSupplierContact = async () => {
    try {
      setRequestStatus('loading');
      
      const result = await getSupplierWithContact(supplierId);
      
      if (result?.access_granted) {
        setSupplierInfo(result);
        setRequestStatus('success');
        toast.success('Contact access granted - Time-limited access approved');
      } else {
        setRequestStatus('denied');
        toast.error('Contact access denied - Business verification required');
      }
    } catch (error) {
      console.error('Error requesting supplier contact:', error);
      setRequestStatus('denied');
      toast.error('Contact request failed');
    }
  };

  const renderContactInfo = () => {
    if (!supplierInfo) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-800">Contact Access Granted</span>
          <Badge variant="outline" className="text-xs">
            {supplierInfo.access_restrictions}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Contact Person</label>
            <p className="text-sm font-medium">{supplierInfo.contact_person || 'Not available'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
            <p className="text-sm font-medium">{supplierInfo.email || 'Not available'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone</label>
            <p className="text-sm font-medium">{supplierInfo.phone || 'Not available'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Address</label>
            <p className="text-sm font-medium">{supplierInfo.address || 'Not available'}</p>
          </div>
        </div>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Access Details:</p>
              <p className="text-sm">{supplierInfo.access_reason}</p>
              <p className="text-xs text-muted-foreground">{supplierInfo.security_message}</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderAccessDenied = () => (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">Contact Access Denied</p>
          <p className="text-sm">Business verification required for contact information access.</p>
          <p className="text-xs">Requirements: Recent purchase order or admin approval needed.</p>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <Card className={`${className} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Ultra-Secure Contact Request
        </CardTitle>
        <CardDescription>
          Request access to {supplierName} contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requestStatus === 'idle' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Contact Information Protected</p>
                  <p className="text-sm">Access requires business relationship verification and is time-limited.</p>
                  <ul className="text-xs space-y-1 mt-2">
                    <li>• Recent purchase orders (30 days)</li>
                    <li>• Admin approval required</li>
                    <li>• 24-hour access window</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleRequestSupplierContact}
              className="w-full"
              variant="outline"
            >
              <Shield className="h-4 w-4 mr-2" />
              Request Contact Access
            </Button>
          </div>
        )}

        {requestStatus === 'loading' && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Verifying business relationship...</p>
          </div>
        )}

        {requestStatus === 'success' && renderContactInfo()}
        {requestStatus === 'denied' && renderAccessDenied()}
      </CardContent>
    </Card>
  );
};