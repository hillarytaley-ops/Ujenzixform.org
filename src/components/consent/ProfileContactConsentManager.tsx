import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ConsentRequest {
  id: string;
  profile_id: string;
  requester_id: string;
  consent_type: 'phone' | 'email' | 'full_contact';
  consent_status: 'pending' | 'approved' | 'denied' | 'expired';
  request_reason: string;
  expires_at?: string;
  granted_at?: string;
  created_at: string;
  requester_name?: string;
  requester_company?: string;
}

export const ProfileContactConsentManager = () => {
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_contact_consent')
        .select(`
          *,
          requester:requester_id(full_name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ConsentRequest[]);
    } catch (error) {
      console.error('Error fetching consent requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consent requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAction = async (requestId: string, newStatus: 'approved' | 'denied', expiryDays?: number) => {
    try {
      const updateData: any = {
        consent_status: newStatus,
        granted_at: newStatus === 'approved' ? new Date().toISOString() : null
      };

      if (newStatus === 'approved' && expiryDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        updateData.expires_at = expiryDate.toISOString();
      }

      const { error } = await supabase
        .from('profile_contact_consent')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Consent request ${newStatus}`,
      });

      fetchRequests();
    } catch (error) {
      console.error('Error updating consent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update consent request',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading consent requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Contact Consent Requests
        </CardTitle>
        <CardDescription>
          Manage who can access your contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No consent requests yet
          </p>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{request.requester_company || request.requester_name || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Requesting access to: <strong>{request.consent_type.replace('_', ' ')}</strong>
                      </p>
                      {request.request_reason && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          Reason: {request.request_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.consent_status)}
                      <Badge className={getStatusColor(request.consent_status)}>
                        {request.consent_status}
                      </Badge>
                    </div>
                  </div>

                  {request.consent_status === 'pending' && (
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Select
                        defaultValue="30"
                        onValueChange={(days) => {
                          const button = document.getElementById(`approve-${request.id}`);
                          if (button) button.setAttribute('data-expiry', days);
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        id={`approve-${request.id}`}
                        size="sm"
                        onClick={(e) => {
                          const days = parseInt(e.currentTarget.getAttribute('data-expiry') || '30');
                          handleConsentAction(request.id, 'approved', days);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleConsentAction(request.id, 'denied')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}

                  {request.consent_status === 'approved' && request.expires_at && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Expires: {new Date(request.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};
