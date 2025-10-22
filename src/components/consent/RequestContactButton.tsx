import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Phone, Mail, User } from 'lucide-react';

interface RequestContactButtonProps {
  targetType: 'profile' | 'supplier';
  targetId: string;
  targetName: string;
  requestType?: 'phone' | 'email' | 'full_contact';
  className?: string;
}

export const RequestContactButton = ({ 
  targetType, 
  targetId, 
  targetName,
  requestType = 'full_contact',
  className 
}: RequestContactButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the request',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      if (targetType === 'profile') {
        const { error } = await supabase
          .from('profile_contact_consent')
          .insert({
            profile_id: targetId,
            requester_id: profile.id,
            consent_type: requestType,
            request_reason: reason,
            consent_status: 'pending'
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_contact_requests')
          .insert({
            requester_id: profile.id,
            supplier_id: targetId,
            business_reason: reason,
            requested_fields: requestType === 'full_contact' ? ['email', 'phone', 'address'] : [requestType],
            request_status: 'pending'
          });

        if (error) throw error;
      }

      toast({
        title: 'Request Sent',
        description: `Contact request sent to ${targetName}. They will be notified to approve or deny.`,
      });

      setOpen(false);
      setReason('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      
      if (error.message?.includes('duplicate key')) {
        toast({
          title: 'Request Already Exists',
          description: 'You have already requested contact information from this entity.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit contact request',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (requestType) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          {getIcon()}
          <span className="ml-2">Request Contact</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Contact Information</DialogTitle>
          <DialogDescription>
            Request access to {targetName}'s contact information. They will receive your request and can approve or deny it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a business reason for this request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Providing a clear reason helps the recipient understand your request
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
