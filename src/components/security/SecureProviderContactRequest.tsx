import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, Phone, Mail, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecureProviderContact {
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
  can_access_contact: boolean;
  contact_field_access: string;
  phone_number: string | null;
  email_address: string | null;
  physical_address: string | null;
  security_message: string;
  access_restrictions: string;
}

interface SecureProviderContactRequestProps {
  providerId: string;
  contactType?: 'basic' | 'phone' | 'email' | 'address' | 'all';
  showBusinessJustification?: boolean;
}

export const SecureProviderContactRequest: React.FC<SecureProviderContactRequestProps> = ({
  providerId,
  contactType = 'basic',
  showBusinessJustification = true
}) => {
  const [contactData, setContactData] = useState<SecureProviderContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedField, setRequestedField] = useState<string>(contactType);
  const [accessAttempts, setAccessAttempts] = useState(0);
  
  const { toast } = useToast();

  const requestSecureContact = async (fieldType: string) => {
    setLoading(true);
    setError(null);
    setAccessAttempts(prev => prev + 1);
    
    try {
      const { data, error } = await supabase.rpc('get_ultra_secure_provider_contact', {
        provider_uuid: providerId,
        requested_field: fieldType
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.length > 0) {
        setContactData(data[0]);
        setRequestedField(fieldType);
        
        // Show appropriate toast based on access level
        if (data[0].can_access_contact) {
          toast({
            title: "Contact Access Authorized",
            description: data[0].security_message,
            variant: "default"
          });
        } else {
          toast({
            title: "Contact Access Restricted",
            description: data[0].access_restrictions,
            variant: "destructive"
          });
        }
      } else {
        setError('Provider not found or access denied');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request contact information');
      console.error('Secure contact request error:', err);
      
      toast({
        title: "Contact Request Failed",
        description: "Unable to access provider contact information. You may not have the required permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestSecureContact(contactType);
  }, [providerId]);

  const getAccessIcon = (canAccess: boolean, fieldType: string) => {
    if (!canAccess) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (fieldType === 'basic') return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Shield className="h-4 w-4 text-blue-600" />;
  };

  const getAccessBadgeColor = (canAccess: boolean, accessLevel: string) => {
    if (!canAccess) return 'bg-red-100 text-red-800 border-red-300';
    if (accessLevel === 'restricted') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const renderContactField = (
    icon: React.ReactNode,
    label: string,
    value: string | null,
    fieldType: string,
    isAccessible: boolean
  ) => {
    return (
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAccessible && value ? (
            <code className="text-sm bg-white px-2 py-1 rounded border">
              {value}
            </code>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {isAccessible ? 'Not provided' : 'Protected'}
            </Badge>
          )}
          {!isAccessible && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestSecureContact(fieldType)}
              disabled={loading}
            >
              Request Access
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading && !contactData) {
    return (
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-muted-foreground">Requesting secure contact access...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            className="mt-4 w-full"
            onClick={() => requestSecureContact('basic')}
            disabled={loading}
          >
            Retry Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!contactData) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Provider contact information not available or access denied.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Secure Provider Contact
          {getAccessIcon(contactData.can_access_contact, contactData.contact_field_access)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Status */}
        <div className="flex items-center gap-2">
          <Badge className={getAccessBadgeColor(contactData.can_access_contact, contactData.contact_field_access)}>
            {contactData.can_access_contact ? 'ACCESS GRANTED' : 'ACCESS RESTRICTED'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Field Access: {contactData.contact_field_access}
          </span>
        </div>

        {/* Provider Basic Information */}
        <div className="bg-muted p-3 rounded-lg">
          <h4 className="font-medium mb-2">{contactData.provider_name}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Type: {contactData.provider_type}</span>
            <span>Rating: {contactData.rating}/5</span>
            <span>Deliveries: {contactData.total_deliveries}</span>
            <span>Capacity: {contactData.capacity_kg}kg</span>
          </div>
        </div>

        <Separator />

        {/* Contact Information with Access Control */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </h4>
          
          {renderContactField(
            <Phone className="h-4 w-4" />,
            'Phone Number',
            contactData.phone_number,
            'phone',
            contactData.can_access_contact && (requestedField === 'phone' || requestedField === 'all')
          )}
          
          {renderContactField(
            <Mail className="h-4 w-4" />,
            'Email Address',
            contactData.email_address,
            'email',
            contactData.can_access_contact && (requestedField === 'email' || requestedField === 'all')
          )}
          
          {renderContactField(
            <MapPin className="h-4 w-4" />,
            'Physical Address',
            contactData.physical_address,
            'address',
            contactData.can_access_contact && (requestedField === 'address' || requestedField === 'all')
          )}
        </div>

        <Separator />

        {/* Quick Access Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestSecureContact('phone')}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Request Phone
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestSecureContact('email')}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Request Email
          </Button>
        </div>

        {/* Security Message */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {contactData.security_message}
          </AlertDescription>
        </Alert>

        {/* Access Restrictions */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">Access Restrictions</h4>
          <p className="text-sm text-blue-700">
            {contactData.access_restrictions}
          </p>
        </div>

        {/* Privacy Notice */}
        {showBusinessJustification && (
          <div className="pt-4 border-t">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Privacy Protection Notice</h4>
              <p className="text-xs text-gray-700">
                All contact information access is strictly controlled and logged for security. 
                Access is only granted for legitimate business relationships with active or recent deliveries.
                Attempts: {accessAttempts}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};