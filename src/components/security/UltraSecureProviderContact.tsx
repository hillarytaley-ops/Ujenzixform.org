import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSecureProviders } from '@/hooks/useSecureProviders';

interface UltraSecureProviderContactProps {
  providerId: string;
  onClose: () => void;
}

export const UltraSecureProviderContact = ({ providerId, onClose }: UltraSecureProviderContactProps) => {
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState<any>(null);
  const { getSecureProviderContact } = useSecureProviders();
  const { toast } = useToast();

  const handleContactRequest = async (fieldType: 'phone' | 'email' | 'address') => {
    setLoading(true);
    try {
      const data = await getSecureProviderContact(providerId, fieldType);
      setContactData(data);
      
      if (!data?.can_access_contact) {
        toast({
          title: "CRITICAL SECURITY: Access Denied",
          description: "Driver personal data is strictly protected. Only administrators can access contact information.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Contact request error:', error);
      toast({
        title: "Access Blocked",
        description: "Driver contact information is admin-only protected.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          Driver Contact Security
        </CardTitle>
        <CardDescription>
          All driver personal information is ultra-secure and admin-only protected
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>CRITICAL SECURITY:</strong> Driver names, phone numbers, email addresses, and all personal information are strictly admin-only accessible for privacy protection.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled
            onClick={() => handleContactRequest('phone')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Phone Number - ADMIN ACCESS REQUIRED
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            disabled
            onClick={() => handleContactRequest('email')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Address - ADMIN ACCESS REQUIRED
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            disabled
            onClick={() => handleContactRequest('address')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Physical Address - ADMIN ACCESS REQUIRED
          </Button>
        </div>

        {contactData && !contactData.can_access_contact && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {contactData.security_message}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            This protection prevents unauthorized access, impersonation, and harassment of drivers. All access attempts are logged for security monitoring.
          </p>
        </div>

        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      </CardContent>
    </Card>
  );
};