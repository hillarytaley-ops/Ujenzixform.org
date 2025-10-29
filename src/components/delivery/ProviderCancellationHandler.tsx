import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, AlertTriangle, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeliveryReassignmentService } from '@/services/DeliveryReassignmentService';

interface ProviderCancellationHandlerProps {
  deliveryId: string;
  deliveryInfo: {
    delivery_id: string;
    material_type: string;
    quantity: string;
    pickup_address: string;
    delivery_address: string;
  };
  providerId: string;
  onCancelled: () => void;
}

const CANCELLATION_REASONS = [
  'Vehicle breakdown',
  'Driver unavailable',
  'Route too far',
  'Already booked',
  'Weather conditions',
  'Traffic/Road closure',
  'Personal emergency',
  'Other (specify below)'
];

export const ProviderCancellationHandler: React.FC<ProviderCancellationHandlerProps> = ({
  deliveryId,
  deliveryInfo,
  providerId,
  onCancelled
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleCancelDelivery = async () => {
    if (!selectedReason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a cancellation reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      const reason = selectedReason === 'Other (specify below)' 
        ? customReason 
        : selectedReason;

      // Process cancellation and trigger automatic reassignment
      await DeliveryReassignmentService.handleDeliveryCancellation(
        deliveryId,
        providerId,
        reason
      );

      toast({
        title: '✅ Delivery Cancelled',
        description: 'Automatically re-alerting other providers...',
      });

      // Show success message
      setTimeout(() => {
        toast({
          title: '🔄 Reassignment in Progress',
          description: 'All available delivery providers have been notified. Builder will be updated shortly.',
          duration: 5000
        });
      }, 1500);

      setShowDialog(false);
      onCancelled();

    } catch (error) {
      console.error('Error cancelling delivery:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel delivery. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Cancel Button */}
      <Button
        variant="destructive"
        onClick={() => setShowDialog(true)}
        className="w-full md:w-auto"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Delivery
      </Button>

      {/* Cancellation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Cancel Delivery Acceptance
            </DialogTitle>
            <DialogDescription>
              Cancelling will automatically alert all other providers to take this delivery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Delivery Info */}
            <Alert>
              <AlertDescription>
                <strong>{deliveryInfo.delivery_id}:</strong> {deliveryInfo.quantity} {deliveryInfo.material_type}
                <br />
                <span className="text-xs text-muted-foreground">
                  {deliveryInfo.pickup_address} → {deliveryInfo.delivery_address}
                </span>
              </AlertDescription>
            </Alert>

            {/* Cancellation Reason */}
            <div className="space-y-3">
              <Label>Reason for Cancellation *</Label>
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={reason} />
                    <Label htmlFor={reason} className="font-normal cursor-pointer">
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === 'Other (specify below)' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-reason">Please specify:</Label>
                  <Textarea
                    id="custom-reason"
                    placeholder="Describe the reason for cancellation..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Warning about automatic reassignment */}
            <Alert className="bg-blue-50 border-blue-200">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertTitle>Automatic Reassignment</AlertTitle>
              <AlertDescription className="space-y-2 text-sm">
                <p>When you cancel, the system will automatically:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Alert ALL other delivery providers instantly</li>
                  <li>Send SMS, Email, and Push notifications</li>
                  <li>Notify the builder of the reassignment</li>
                  <li>Add 15% bonus payment to attract providers</li>
                  <li>You won't be alerted about this delivery again</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={processing}
            >
              Keep Delivery
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelDelivery}
              disabled={processing || !selectedReason}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling & Re-alerting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Confirm Cancellation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

