import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Mail, MapPin, User, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecureContactButtonProps {
  supplierId: string;
  supplierName: string;
  isAdmin?: boolean;
}

interface ContactData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  access_granted: boolean;
  access_reason: string;
}

export const SecureContactButton: React.FC<SecureContactButtonProps> = ({
  supplierId,
  supplierName,
  isAdmin = false
}) => {
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAccessContact = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Requesting secure contact access for supplier:', supplierId);
      
      const { data, error: fetchError } = await supabase.rpc('get_supplier_contact_secure', {
        supplier_uuid: supplierId
      });

      if (fetchError) {
        console.error('Error fetching secure contact:', fetchError);
        setError(`Access error: ${fetchError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setError('No supplier data found');
        return;
      }

      const result = data[0];
      setContactData(result);

      if (!result.access_granted) {
        setError(`Access denied: ${result.access_reason}`);
      }
    } catch (err) {
      console.error('Error in handleAccessContact:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const requestBusinessRelationship = async () => {
    try {
      const { data, error } = await supabase.rpc('verify_business_relationship', {
        target_supplier_id: supplierId,
        relationship_evidence: {
          reason: 'Contact access for potential business collaboration',
          requested_at: new Date().toISOString()
        }
      }) as { data: any, error: any };

      if (error) {
        setError(`Failed to request business relationship: ${error.message}`);
        return;
      }

      setError('Business relationship request submitted. Contact access will be available once approved.');
    } catch (err) {
      setError('Failed to submit business relationship request');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleAccessContact}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          {loading ? 'Checking Access...' : 'Secure Contact'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Contact Access - {supplierName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {contactData?.access_granted ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-green-700">
                  Access granted: {contactData.access_reason}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="font-medium">Contact Person:</span>
                    <p className="text-sm">{contactData.contact_person || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="font-medium">Email:</span>
                    <p className="text-sm">{contactData.email || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="font-medium">Phone:</span>
                    <p className="text-sm">{contactData.phone || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="font-medium">Address:</span>
                    <p className="text-sm">{contactData.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : contactData ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Contact information is protected. {contactData.access_reason}
                </AlertDescription>
              </Alert>
              
              {!isAdmin && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    To access contact information, you need to establish a legitimate business relationship.
                  </p>
                  
                  <Button 
                    onClick={requestBusinessRelationship}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Request Business Relationship
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">
                {loading ? 'Verifying access permissions...' : 'Click above to check contact access'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
