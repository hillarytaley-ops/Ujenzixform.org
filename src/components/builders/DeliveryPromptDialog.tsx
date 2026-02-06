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
  DollarSign,
  Eye,
  Navigation,
  Copy,
  MapPinned
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonitoringServicePrompt } from './MonitoringServicePrompt';

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
  const [showMonitoringPrompt, setShowMonitoringPrompt] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    deliveryAddress: '',
    deliveryCoordinates: '',
    preferredDate: '',
    preferredTime: '',
    materialType: 'mixed',
    totalWeight: '',
    budgetRange: '10000-20000',
    specialInstructions: ''
  });
  const { toast } = useToast();

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location Not Supported',
        description: 'Your browser does not support GPS location.',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        setDeliveryData(prev => ({
          ...prev,
          deliveryCoordinates: coords
        }));
        
        toast({
          title: '📍 Location Captured!',
          description: `Coordinates: ${coords}`,
        });
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Could not get your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive'
        });
        
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Copy coordinates to clipboard
  const copyCoordinates = () => {
    if (deliveryData.deliveryCoordinates) {
      navigator.clipboard.writeText(deliveryData.deliveryCoordinates);
      toast({
        title: 'Copied!',
        description: 'Coordinates copied to clipboard.',
      });
    }
  };

  // Open coordinates in Google Maps
  const openInMaps = () => {
    if (deliveryData.deliveryCoordinates) {
      const [lat, lng] = deliveryData.deliveryCoordinates.split(',').map(s => s.trim());
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

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

    // Validate required fields - either address or coordinates
    if (!deliveryData.deliveryAddress.trim() && !deliveryData.deliveryCoordinates.trim()) {
      toast({
        title: 'Location Required',
        description: 'Please provide either GPS coordinates or a delivery address.',
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

      // Build delivery address with coordinates
      let fullDeliveryAddress = deliveryData.deliveryAddress;
      if (deliveryData.deliveryCoordinates) {
        fullDeliveryAddress = deliveryData.deliveryCoordinates + 
          (deliveryData.deliveryAddress ? ` | ${deliveryData.deliveryAddress}` : '');
      }

      // Create delivery request - use only core columns that exist
      // IMPORTANT: builder_id must be auth.uid() for RLS policy to pass
      const deliveryPayload: Record<string, any> = {
        builder_id: user.id, // Use auth user ID, not profile ID - RLS requires builder_id = auth.uid()
        purchase_order_id: purchaseOrder.id,
        pickup_address: pickupAddress,
        delivery_address: fullDeliveryAddress,
        pickup_date: deliveryData.preferredDate,
        material_type: deliveryData.materialType,
        quantity: purchaseOrder.items?.length || 1,
        status: 'pending'
      };

      // Add optional fields only if they have values
      if (deliveryData.deliveryCoordinates) {
        deliveryPayload.delivery_coordinates = deliveryData.deliveryCoordinates;
      }
      if (deliveryData.preferredTime && deliveryData.preferredTime !== 'anytime') {
        deliveryPayload.preferred_time = deliveryData.preferredTime;
      }
      if (deliveryData.totalWeight) {
        deliveryPayload.weight_kg = parseFloat(deliveryData.totalWeight);
      }
      if (deliveryData.specialInstructions) {
        deliveryPayload.special_instructions = deliveryData.specialInstructions;
      }
      if (deliveryData.budgetRange) {
        deliveryPayload.budget_range = deliveryData.budgetRange;
      }

      console.log('📦 Creating delivery request with payload:', deliveryPayload);

      const { data: deliveryRequest, error: deliveryError } = await supabase
        .from('delivery_requests')
        .insert(deliveryPayload)
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

  const handlePickup = async () => {
    if (!purchaseOrder) return;
    
    setSubmitting(true);
    
    try {
      // Update purchase order to mark as pickup (no delivery, no QR codes needed)
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          delivery_required: false,
          special_instructions: (purchaseOrder.special_instructions || '') + '\n[PICKUP ORDER - No delivery required]',
          qr_code_generated: false // Ensure no QR code generation
        })
        .eq('id', purchaseOrder.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: '📦 Pickup Order Confirmed!',
        description: 'You can collect your materials directly from the supplier.',
      });
      
      // Close this dialog and show monitoring prompt
      onOpenChange(false);
      setStep('prompt');
      
      // Show monitoring service prompt after a short delay
      setTimeout(() => {
        setShowMonitoringPrompt(true);
      }, 500);
      
    } catch (error: any) {
      console.error('Error setting pickup order:', error);
      toast({
        title: 'Error',
        description: 'Could not update order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle when delivery is confirmed (from prompt or form)
  const handleDeliveryConfirmed = () => {
    if (onDeliveryRequested) onDeliveryRequested();
    onOpenChange(false);
    setStep('prompt');
    
    // Show monitoring service prompt after a short delay
    setTimeout(() => {
      setShowMonitoringPrompt(true);
    }, 500);
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
    <>
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

              {/* Delivery vs Pickup info */}
              <div className="space-y-2">
                <Alert className="bg-green-50 border-green-200">
                  <Truck className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-xs">
                    <strong>🚚 Delivery Option:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>QR codes generated for tracking</li>
                      <li>Delivery provider picks up from supplier</li>
                      <li>Materials delivered to your location</li>
                      <li>Scan QR codes on receipt to verify</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <Alert className="bg-blue-50 border-blue-200">
                  <Package className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    <strong>📦 Pickup Option:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>No QR codes needed</li>
                      <li>Collect materials directly from supplier</li>
                      <li>Show your order number at pickup</li>
                      <li>No additional delivery charges</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2">
              {/* Primary action - Go to form to enter delivery location */}
              <Button 
                onClick={() => setStep('form')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                🚚 Yes, I Need Delivery
              </Button>
              
              {/* Pickup option - No delivery, no QR codes */}
              <Button 
                variant="outline" 
                onClick={handlePickup}
                disabled={submitting}
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Package className="h-4 w-4 mr-2" />
                📦 I'll Pick Up Myself (No QR Code)
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
              {/* Location Section */}
              <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <MapPinned className="h-5 w-5" />
                    Delivery Location
                  </div>

                  {/* GPS Location Button - Easy one-tap */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">📍 Quick Location (Recommended)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="w-full h-14 border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-medium"
                    >
                      {gettingLocation ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Getting Your Location...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-5 w-5 mr-2" />
                          📍 Use My Current Location (GPS)
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Tap to automatically capture your GPS coordinates
                    </p>
                  </div>

                  {/* Display captured coordinates */}
                  {deliveryData.deliveryCoordinates && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">GPS Coordinates Captured ✓</p>
                          <p className="font-mono text-sm text-green-800">{deliveryData.deliveryCoordinates}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyCoordinates}
                            className="h-8 w-8 p-0"
                            title="Copy coordinates"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={openInMaps}
                            className="h-8 w-8 p-0"
                            title="View in Google Maps"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual coordinates input */}
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCoordinates" className="text-sm text-gray-600">
                      Or Enter Coordinates Manually
                    </Label>
                    <Input
                      id="deliveryCoordinates"
                      placeholder="e.g., -1.286389, 36.817223"
                      value={deliveryData.deliveryCoordinates}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryCoordinates: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">
                      Format: latitude, longitude (e.g., -1.286389, 36.817223 for Nairobi)
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-blue-50 px-2 text-gray-500">or provide address</span>
                    </div>
                  </div>

                  {/* Delivery Address - Text */}
                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress" className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      Delivery Address (Street/Area)
                    </Label>
                    <Input
                      id="deliveryAddress"
                      placeholder="e.g., Plot 123, Ngong Road, Nairobi"
                      value={deliveryData.deliveryAddress}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    />
                  </div>

                  {/* Validation message */}
                  {!deliveryData.deliveryAddress && !deliveryData.deliveryCoordinates && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-xs">
                        Please provide either GPS coordinates or a delivery address
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

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
                      <SelectItem value="anytime">Any time</SelectItem>
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

    {/* Monitoring Service Prompt - Shows after delivery/pickup choice */}
    <MonitoringServicePrompt
      isOpen={showMonitoringPrompt}
      onOpenChange={setShowMonitoringPrompt}
      purchaseOrder={purchaseOrder}
      onServiceRequested={() => {
        if (onDeclined) onDeclined(); // Close the flow
      }}
      onDeclined={() => {
        if (onDeclined) onDeclined(); // Close the flow
      }}
    />
    </>
  );
};

export default DeliveryPromptDialog;

