import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Package, 
  Clock, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrderItem {
  material_name?: string;
  name?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_address?: string;
  total_amount: number;
  delivery_address: string;
  delivery_date: string;
  items: PurchaseOrderItem[];
  project_name?: string;
}

interface DeliveryPromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  onDeliveryRequested?: () => void;
  onDeclined?: () => void;
}

const BUDGET_RANGES = [
  { value: '0-5000', label: 'KES 0 - 5,000' },
  { value: '5000-10000', label: 'KES 5,000 - 10,000' },
  { value: '10000-20000', label: 'KES 10,000 - 20,000' },
  { value: '20000-50000', label: 'KES 20,000 - 50,000' },
  { value: '50000+', label: 'KES 50,000+' },
];

const MATERIAL_TYPES = [
  'cement',
  'steel',
  'timber',
  'blocks',
  'sand',
  'aggregates',
  'roofing',
  'tiles',
  'plumbing',
  'electrical',
  'mixed'
];

export const DeliveryPromptDialog: React.FC<DeliveryPromptDialogProps> = ({
  isOpen,
  onOpenChange,
  purchaseOrder,
  onDeliveryRequested,
  onDeclined
}) => {
  const [step, setStep] = useState<'prompt' | 'form' | 'success'>('prompt');
  const [submitting, setSubmitting] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    deliveryAddress: '',
    preferredDate: '',
    preferredTime: '',
    materialType: 'mixed',
    totalWeight: '',
    budgetRange: '10000-20000',
    specialInstructions: ''
  });
  const { toast } = useToast();

  // Pre-fill form with purchase order data
  useEffect(() => {
    if (purchaseOrder) {
      setDeliveryData(prev => ({
        ...prev,
        deliveryAddress: purchaseOrder.delivery_address || '',
        preferredDate: purchaseOrder.delivery_date || '',
        // Auto-detect material type if single item
        materialType: purchaseOrder.items?.length === 1 
          ? detectMaterialType(purchaseOrder.items[0]?.material_name || purchaseOrder.items[0]?.name || '')
          : 'mixed',
        // Estimate weight: 50kg per item as default
        totalWeight: String((purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1) * 50)
      }));
    }
  }, [purchaseOrder]);

  const detectMaterialType = (materialName: string): string => {
    const name = materialName.toLowerCase();
    for (const type of MATERIAL_TYPES) {
      if (name.includes(type)) return type;
    }
    return 'mixed';
  };

  const handleRequestDelivery = async () => {
    if (!purchaseOrder) return;

    // Validate required fields
    if (!deliveryData.deliveryAddress.trim()) {
      toast({
        title: 'Delivery Address Required',
        description: 'Please enter the delivery address.',
        variant: 'destructive'
      });
      return;
    }

    if (!deliveryData.preferredDate) {
      toast({
        title: 'Delivery Date Required',
        description: 'Please select a preferred delivery date.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get supplier info for pickup address
      let pickupAddress = purchaseOrder.supplier_address || 'Supplier location';
      if (purchaseOrder.supplier_id) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('address, company_name')
          .eq('id', purchaseOrder.supplier_id)
          .maybeSingle();
        
        if (supplier) {
          pickupAddress = supplier.address || `${supplier.company_name} - Pickup Location`;
        }
      }

      // Create delivery request
      const { data: deliveryRequest, error: deliveryError } = await supabase
        .from('delivery_requests')
        .insert({
          builder_id: profile.id,
          purchase_order_id: purchaseOrder.id,
          pickup_address: pickupAddress,
          delivery_address: deliveryData.deliveryAddress,
          pickup_date: deliveryData.preferredDate,
          preferred_time: deliveryData.preferredTime || null,
          material_type: deliveryData.materialType,
          quantity: purchaseOrder.items?.length || 1,
          weight_kg: parseFloat(deliveryData.totalWeight) || null,
          special_instructions: deliveryData.specialInstructions || null,
          budget_range: deliveryData.budgetRange,
          status: 'pending',
          max_rotation_attempts: 5,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Notify delivery providers via edge function
      try {
        await supabase.functions.invoke('notify-delivery-providers', {
          body: {
            request_type: 'quote_accepted',
            request_id: deliveryRequest.id,
            builder_id: profile.id,
            pickup_address: pickupAddress,
            delivery_address: deliveryData.deliveryAddress,
            material_details: purchaseOrder.items?.map(item => ({
              material_type: item.material_name || item.name,
              quantity: item.quantity,
              unit: item.unit || 'units'
            })),
            special_instructions: deliveryData.specialInstructions,
            priority_level: 'normal',
            po_number: purchaseOrder.po_number
          }
        });
      } catch (notifyError) {
        console.error('Error notifying delivery providers:', notifyError);
        // Continue even if notification fails - delivery request is created
      }

      setStep('success');
      
      toast({
        title: '🚚 Delivery Request Sent!',
        description: 'Nearby delivery providers have been notified. First responder will be assigned.',
      });

      // Call success callback
      if (onDeliveryRequested) {
        setTimeout(() => {
          onDeliveryRequested();
          onOpenChange(false);
          setStep('prompt');
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error creating delivery request:', error);
      toast({
        title: 'Failed to Request Delivery',
        description: error.message || 'Please try again or contact support.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: 'Delivery Declined',
      description: 'You can request delivery later from the Delivery page.',
    });
    if (onDeclined) onDeclined();
    onOpenChange(false);
    setStep('prompt');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!purchaseOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setStep('prompt');
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        {step === 'prompt' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Truck className="h-6 w-6 text-green-600" />
                🚚 Delivery Providers Notified!
              </DialogTitle>
              <DialogDescription>
                Nearby delivery providers have been automatically alerted. First provider to accept will be assigned.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Order Summary */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">
                        {purchaseOrder.po_number}
                      </p>
                      <p className="text-sm text-green-700">
                        {purchaseOrder.items?.length || 0} item(s) • {formatCurrency(purchaseOrder.total_amount)}
                      </p>
                      {purchaseOrder.project_name && (
                        <p className="text-xs text-green-600 mt-1">
                          Project: {purchaseOrder.project_name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* First-come-first-served notice */}
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>First-Come-First-Served:</strong> The first delivery provider to accept your request will be assigned. You'll receive a notification when matched.
                </AlertDescription>
              </Alert>

              {/* Delivery details */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Delivery to:</span>
                  <span className="font-medium">{purchaseOrder.delivery_address || 'Address pending'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Expected:</span>
                  <span className="font-medium">{purchaseOrder.delivery_date ? new Date(purchaseOrder.delivery_date).toLocaleDateString() : 'Date pending'}</span>
                </div>
              </div>

              {/* What's next */}
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  <strong>What happens next:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>QR codes are being generated for your materials</li>
                    <li>Supplier will prepare items with QR labels</li>
                    <li>Delivery provider will pick up and deliver</li>
                    <li>Scan QR codes on receipt to verify</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              {/* Primary action - Accept delivery */}
              <Button 
                onClick={() => {
                  if (onDeliveryRequested) onDeliveryRequested();
                  onOpenChange(false);
                }}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, Proceed with Delivery
              </Button>
              
              {/* Secondary - Update details */}
              <Button 
                variant="outline" 
                onClick={() => setStep('form')}
                className="w-full sm:flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Update Details
              </Button>
              
              {/* Reject - No delivery needed */}
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="w-full sm:w-auto text-gray-500 hover:text-red-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                No Delivery Needed
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Update Delivery Details
              </DialogTitle>
              <DialogDescription>
                Modify delivery details if needed - providers will be updated
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Delivery Address *
                </Label>
                <Input
                  id="deliveryAddress"
                  placeholder="Enter full delivery address"
                  value={deliveryData.deliveryAddress}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Delivery Date *
                  </Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={deliveryData.preferredDate}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredTime" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Preferred Time
                  </Label>
                  <Select
                    value={deliveryData.preferredTime}
                    onValueChange={(value) => setDeliveryData(prev => ({ ...prev, preferredTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any time</SelectItem>
                      <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                      <SelectItem value="evening">Evening (4PM - 6PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Material Type and Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="materialType">Material Type</Label>
                  <Select
                    value={deliveryData.materialType}
                    onValueChange={(value) => setDeliveryData(prev => ({ ...prev, materialType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalWeight">Est. Weight (kg)</Label>
                  <Input
                    id="totalWeight"
                    type="number"
                    placeholder="e.g., 500"
                    value={deliveryData.totalWeight}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, totalWeight: e.target.value }))}
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <Label htmlFor="budgetRange" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Delivery Budget
                </Label>
                <Select
                  value={deliveryData.budgetRange}
                  onValueChange={(value) => setDeliveryData(prev => ({ ...prev, budgetRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Special Instructions */}
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="Any special delivery requirements..."
                  value={deliveryData.specialInstructions}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Info Alert */}
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  <strong>First-Come-First-Served:</strong> Your request will be sent to nearby delivery providers. 
                  The first provider to accept will be assigned to your delivery.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('prompt')}
                disabled={submitting}
              >
                Back
              </Button>
              <Button 
                onClick={handleRequestDelivery}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Request Delivery
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Delivery Request Sent!
            </h3>
            <p className="text-gray-600 mb-4">
              Nearby delivery providers have been notified. You'll receive updates when a provider accepts.
            </p>
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              First-come-first-served matching active
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryPromptDialog;

