import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ContactRequest {
  id: string;
  supplier_id: string;
  requester_id: string;
  business_reason: string;
  request_status: 'pending' | 'approved' | 'denied' | 'expired';
  requested_fields: string[];
  expires_at?: string;
  approved_at?: string;
  created_at: string;
  admin_id?: string;
  admin_response?: string;
  requester_name?: string;
  requester_company?: string;
}

export const SupplierContactApprovalManager = () => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_contact_requests')
        .select(`
          *,
          requester:requester_id(full_name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ContactRequest[]);
    } catch (error) {
      console.error('Error fetching contact requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (requestId: string, newStatus: 'approved' | 'denied', expiryDays?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const updateData: any = {
        request_status: newStatus,
        admin_id: profile?.id,
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null
      };

      if (newStatus === 'approved' && expiryDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        updateData.expires_at = expiryDate.toISOString();
      }

      const { error } = await supabase
        .from('supplier_contact_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Contact request ${newStatus}`,
      });

      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update contact request',
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
    return <div className="p-4 text-center">Loading contact requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Supplier Contact Requests
        </CardTitle>
        <CardDescription>
          Approve or deny requests to share your contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No contact requests yet
          </p>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{request.requester_company || request.requester_name || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Requesting: <strong>{request.requested_fields.join(', ')}</strong>
                      </p>
                      {request.business_reason && (
                        <p className="text-sm mt-2 p-3 bg-muted rounded">
                          "{request.business_reason}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Requested: {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.request_status)}
                      <Badge className={getStatusColor(request.request_status)}>
                        {request.request_status}
                      </Badge>
                    </div>
                  </div>

                  {request.request_status === 'pending' && (
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Select
                        defaultValue="30"
                        onValueChange={(days) => {
                          const button = document.getElementById(`approve-supplier-${request.id}`);
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
                          <SelectItem value="180">6 months</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        id={`approve-supplier-${request.id}`}
                        size="sm"
                        onClick={(e) => {
                          const days = parseInt(e.currentTarget.getAttribute('data-expiry') || '30');
                          handleApprovalAction(request.id, 'approved', days);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleApprovalAction(request.id, 'denied')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}

                  {request.request_status === 'approved' && request.expires_at && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Access expires: {new Date(request.expires_at).toLocaleDateString()}
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
