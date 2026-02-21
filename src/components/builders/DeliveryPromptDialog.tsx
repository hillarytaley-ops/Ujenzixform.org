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
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonitoringServicePrompt } from './MonitoringServicePrompt';
import { deliveryProviderNotificationService } from '@/services/DeliveryProviderNotificationService';

// Helper for fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

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
    console.log('🚚 Starting delivery request...');

    try {
      // Get user from localStorage (faster than Supabase call)
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
          accessToken = parsed.access_token;
        }
      } catch (e) {
        console.warn('Could not parse stored session');
      }
      
      if (!userId || !accessToken) {
        throw new Error('User not authenticated');
      }

      console.log('🚚 User ID:', userId);

      // Get supplier info for pickup address using fetch
      let pickupAddress = purchaseOrder.supplier_address || 'Supplier location';
      if (purchaseOrder.supplier_id) {
        try {
          const supplierResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${purchaseOrder.supplier_id}&select=address,company_name`,
            { headers: { 'apikey': SUPABASE_ANON_KEY } },
            5000
          );
          if (supplierResponse.ok) {
            const suppliers = await supplierResponse.json();
            if (suppliers?.[0]) {
              pickupAddress = suppliers[0].address || `${suppliers[0].company_name} - Pickup Location`;
            }
          }
        } catch (e) {
          console.warn('Could not fetch supplier info');
        }
      }

      // Build delivery address with coordinates
      let fullDeliveryAddress = deliveryData.deliveryAddress;
      if (deliveryData.deliveryCoordinates) {
        fullDeliveryAddress = deliveryData.deliveryCoordinates + 
          (deliveryData.deliveryAddress ? ` | ${deliveryData.deliveryAddress}` : '');
      }

      // Create delivery request payload
      const deliveryPayload: Record<string, any> = {
        builder_id: userId,
        purchase_order_id: purchaseOrder.id,
        pickup_address: pickupAddress,
        delivery_address: fullDeliveryAddress,
        pickup_date: deliveryData.preferredDate,
        material_type: deliveryData.materialType,
        quantity: purchaseOrder.items?.length || 1,
        status: 'pending'
      };

      // Add supplier_id for address lookup later
      if (purchaseOrder.supplier_id) {
        deliveryPayload.supplier_id = purchaseOrder.supplier_id;
      }

      // Add supplier name for display
      if (purchaseOrder.supplier_name) {
        deliveryPayload.supplier_name = purchaseOrder.supplier_name;
      }

      // Add optional fields
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

      // Insert delivery request using native fetch with timeout
      let deliveryRequestId = null;
      try {
        const deliveryResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/delivery_requests`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(deliveryPayload)
          },
          10000
        );

        if (deliveryResponse.ok) {
          const deliveryData = await deliveryResponse.json();
          deliveryRequestId = Array.isArray(deliveryData) ? deliveryData[0]?.id : deliveryData?.id;
          console.log('✅ Delivery request created:', deliveryRequestId);
        } else {
          const errorText = await deliveryResponse.text();
          console.warn('⚠️ Delivery insert failed:', errorText);
        }
      } catch (insertError: any) {
        console.warn('⚠️ Insert error:', insertError.message);
      }

      // Show success immediately - don't wait for notifications
      setStep('success');
      setSubmitting(false);
      
      toast({
        title: '🚚 Delivery Request Sent!',
        description: 'Nearby delivery providers are being notified. First responder will be assigned.',
      });

      // Notify ALL registered delivery providers in background (don't block UI)
      console.log('🔔 Notifying delivery providers in background...');
      deliveryProviderNotificationService.notifyAllProviders({
        id: deliveryRequestId || purchaseOrder.id,
        po_number: purchaseOrder.po_number,
        pickup_address: pickupAddress,
        delivery_address: fullDeliveryAddress,
        pickup_date: deliveryData.preferredDate,
        material_type: deliveryData.materialType,
        quantity: purchaseOrder.items?.length || 1,
        weight_kg: deliveryData.totalWeight ? parseFloat(deliveryData.totalWeight) : undefined,
        budget_range: deliveryData.budgetRange,
        special_instructions: deliveryData.specialInstructions
      }).then(notificationResult => {
        console.log(`✅ Delivery providers notified: ${notificationResult.notified}/${notificationResult.totalProviders}`);
        // Log analytics event in background
        if (deliveryRequestId) {
          deliveryProviderNotificationService.logNotificationEvent(deliveryRequestId, notificationResult);
        }
      }).catch(notifyError => {
        console.warn('⚠️ Provider notification error (non-critical):', notifyError.message);
      });

      // Call success callback and show monitoring prompt
      if (onDeliveryRequested) {
        setTimeout(() => {
          onDeliveryRequested();
          onOpenChange(false);
          setStep('prompt');
          
          setTimeout(() => {
            setShowMonitoringPrompt(true);
          }, 500);
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Error creating delivery request:', error);
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
    console.log('📦 Setting order as pickup...');
    
    try {
      // Get access token from localStorage
      let accessToken: string | null = null;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token;
        }
      } catch (e) {
        console.warn('Could not parse stored session');
      }

      // Update purchase order using fetch with timeout
      const updateResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            delivery_required: false,
            qr_code_generated: false
          })
        },
        8000
      );
      
      if (!updateResponse.ok) {
        console.warn('Pickup update response:', updateResponse.status);
      }
      
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
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Delivery Providers Notified
              </DialogTitle>
              <DialogDescription className="text-xs">
                First provider to accept will be assigned
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              {/* Order Summary - Compact */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900 text-sm">{purchaseOrder.po_number}</p>
                      <p className="text-xs text-green-700">{purchaseOrder.items?.length || 0} items • {formatCurrency(purchaseOrder.total_amount)}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery details - Compact */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 p-2 bg-gray-50 rounded">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="truncate">{purchaseOrder.delivery_address || 'To be provided'}</span>
                </div>
                <div className="flex items-center gap-1 p-2 bg-gray-50 rounded">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span>{purchaseOrder.delivery_date ? new Date(purchaseOrder.delivery_date).toLocaleDateString() : 'TBD'}</span>
                </div>
              </div>

              {/* Options - Compact */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <p className="font-medium text-green-800">🚚 Delivery</p>
                  <p className="text-green-600">QR tracking included</p>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="font-medium text-blue-800">📦 Pickup</p>
                  <p className="text-blue-600">No delivery charge</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => setStep('form')}
                className="w-full bg-green-600 hover:bg-green-700 h-9"
                size="sm"
              >
                <Truck className="h-4 w-4 mr-1" />
                Yes, I Need Delivery
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePickup}
                disabled={submitting}
                className="w-full h-9"
                size="sm"
              >
                <Package className="h-4 w-4 mr-1" />
                I'll Pick Up Myself
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'form' && (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base">
                <MapPinned className="h-4 w-4 text-blue-600" />
                Delivery Location
              </DialogTitle>
            </DialogHeader>

            <div className="py-2 space-y-3 max-h-[55vh] overflow-y-auto">
              {/* GPS Button - Compact */}
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full h-10 border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                {gettingLocation ? 'Getting Location...' : '📍 Get My GPS Location'}
              </Button>

              {/* GPS Coordinates Display */}
              {deliveryData.deliveryCoordinates && (
                <div className="flex items-center justify-between p-2 bg-green-100 border border-green-300 rounded text-xs">
                  <div>
                    <span className="text-green-600">✓ GPS: </span>
                    <span className="font-mono text-green-800">{deliveryData.deliveryCoordinates}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={copyCoordinates} className="h-6 w-6 p-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={openInMaps} className="h-6 w-6 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual coordinates */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Or enter coordinates</Label>
                <Input
                  placeholder="-1.286389, 36.817223"
                  value={deliveryData.deliveryCoordinates}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryCoordinates: e.target.value }))}
                  className="font-mono text-xs h-8"
                />
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or address</span></div>
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
              {/* Address field */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Delivery Address</Label>
                <Input
                  placeholder="Street address, landmark..."
                  value={deliveryData.deliveryAddress}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="text-xs h-8"
                />
              </div>

              {/* Date, Time, Budget - Compact Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Date *</Label>
                  <Input
                    type="date"
                    value={deliveryData.preferredDate}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Time</Label>
                  <Select value={deliveryData.preferredTime} onValueChange={(value) => setDeliveryData(prev => ({ ...prev, preferredTime: value }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anytime">Any</SelectItem>
                      <SelectItem value="morning">AM</SelectItem>
                      <SelectItem value="afternoon">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Budget</Label>
                  <Select value={deliveryData.budgetRange} onValueChange={(value) => setDeliveryData(prev => ({ ...prev, budgetRange: value }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_RANGES.map(range => (
                        <SelectItem key={range.value} value={range.value} className="text-xs">{range.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Material & Weight - Compact */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Material</Label>
                  <Select value={deliveryData.materialType} onValueChange={(value) => setDeliveryData(prev => ({ ...prev, materialType: value }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={deliveryData.totalWeight}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, totalWeight: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Notes - Compact */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Notes (optional)</Label>
                <Input
                  placeholder="Special instructions..."
                  value={deliveryData.specialInstructions}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('prompt')} disabled={submitting} size="sm" className="h-8">
                Back
              </Button>
              <Button onClick={handleRequestDelivery} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 h-8" size="sm">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Truck className="h-4 w-4 mr-1" />Send Request</>}
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
      purchaseOrder={{
        ...purchaseOrder,
        id: purchaseOrder?.id || '',
        // Pass the user-entered delivery address to auto-fill site address
        delivery_address: deliveryData.deliveryCoordinates 
          ? `${deliveryData.deliveryCoordinates}${deliveryData.deliveryAddress ? ` | ${deliveryData.deliveryAddress}` : ''}`
          : deliveryData.deliveryAddress || purchaseOrder?.delivery_address
      }}
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

