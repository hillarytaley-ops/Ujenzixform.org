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
  MapPinned,
  Map as MapIcon
} from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { readAuthSessionForRest } from '@/utils/supabaseAccessToken';
import { useToast } from '@/hooks/use-toast';
import { MonitoringServicePrompt } from './MonitoringServicePrompt';
import { deliveryProviderNotificationService } from '@/services/DeliveryProviderNotificationService';
import { MapLocationPicker } from '@/components/location/MapLocationPicker';

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
  /** Used to advance PO workflow (e.g. awaiting_delivery_request → delivery_requested) after a real builder submission */
  status?: string;
  /** pending | delivery | pickup — from purchase_orders.builder_fulfillment_choice */
  builder_fulfillment_choice?: string | null;
}

interface DeliveryPromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  onDeliveryRequested?: (opts?: { deliveryAddress?: string }) => void;
  onDeclined?: () => void;
}

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
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    deliveryAddress: '',
    deliveryCoordinates: '',
    preferredDate: '',
    preferredTime: '',
    specialInstructions: ''
  });
  const { toast } = useToast();

  // Required for Send Request: address or coordinates (same validation as submit) — ensures address is never missing on provider dashboard
  const hasAddress = Boolean(
    deliveryData.deliveryAddress.trim() &&
    deliveryData.deliveryAddress.toLowerCase() !== 'to be provided' &&
    deliveryData.deliveryAddress.toLowerCase() !== 'tbd' &&
    deliveryData.deliveryAddress.toLowerCase() !== 'n/a'
  );
  const hasCoordinates = Boolean(deliveryData.deliveryCoordinates.trim());

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
        // CRITICAL: Don't pre-populate with purchase_order.delivery_address if it's a placeholder
        // The builder should enter their own delivery address, not inherit "To be provided"
        deliveryAddress: (purchaseOrder.delivery_address && 
                         purchaseOrder.delivery_address.toLowerCase() !== 'to be provided' &&
                         purchaseOrder.delivery_address.toLowerCase() !== 'tbd' &&
                         purchaseOrder.delivery_address.toLowerCase() !== 'n/a') 
                         ? purchaseOrder.delivery_address : '',
        preferredDate: purchaseOrder.delivery_date || ''
      }));
    }
  }, [purchaseOrder]);

  // Fresh open / different order → start at the choice step (survives refresh by reopening from dashboard)
  useEffect(() => {
    if (isOpen) setStep('prompt');
  }, [isOpen, purchaseOrder?.id]);

  const detectMaterialType = (materialName: string): string => {
    const name = materialName.toLowerCase();
    for (const type of MATERIAL_TYPES) {
      if (name.includes(type)) return type;
    }
    return 'mixed';
  };

  // Helper to normalize material types (same as DeliveryNotifications.tsx)
  const normalizeMaterialType = (materialType: string | undefined | null): string => {
    if (!materialType) return '';
    const normalized = String(materialType).trim().toLowerCase();
    if (normalized.includes('steel') || normalized.includes('construction') || normalized.includes('material')) {
      return 'construction_materials';
    }
    return normalized;
  };

  // CRITICAL: Cancel all duplicate delivery requests when one is created/updated
  const cancelDuplicateDeliveryRequests = async (
    currentDeliveryRequestId: string,
    purchaseOrderId: string,
    deliveryAddress: string,
    materialType: string,
    accessToken: string
  ) => {
    try {
      console.log('🗑️ Cancelling duplicate delivery requests for order:', purchaseOrderId);
      
      // Fetch all pending/assigned delivery_requests for this purchase_order or with same composite key
      const duplicateResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(pending,assigned,quoted,quote_accepted,delivery_quote_paid)&id=neq.${currentDeliveryRequestId}&select=id,purchase_order_id,delivery_address,material_type&limit=100`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        },
        5000
      );
      
      if (duplicateResponse.ok) {
        const allPending = await duplicateResponse.json();
        
        // Filter to find actual duplicates using same logic as DeliveryNotifications
        const duplicatesToCancel: string[] = [];
        const normalizedAddress = String(deliveryAddress).trim().toLowerCase();
        const normalizedMaterial = normalizeMaterialType(materialType);
        
        allPending.forEach((dr: any) => {
          let isDuplicate = false;
          
          // CRITICAL: Check purchase_order_id FIRST - if they're different, they're NOT duplicates
          // Check 1: Same purchase_order_id
          if (purchaseOrderId && dr.purchase_order_id === purchaseOrderId) {
            isDuplicate = true;
          }
          // Check 2: Same composite key (deliveryAddress + materialType) - ONLY if purchase_order_id is missing/NULL
          // CRITICAL: If purchase_order_id exists and is different, they are NOT duplicates even if composite key matches
          else if (!purchaseOrderId || !dr.purchase_order_id) {
            // Only check composite key if purchase_order_id is missing for BOTH
            if (deliveryAddress && materialType && dr.delivery_address && dr.material_type) {
              const normalizedDRAddress = String(dr.delivery_address).trim().toLowerCase();
              const normalizedDRMaterial = normalizeMaterialType(dr.material_type);
              
              if (normalizedAddress === normalizedDRAddress && normalizedMaterial === normalizedDRMaterial) {
                isDuplicate = true;
              }
            }
          }
          // If purchase_order_id exists and is different, they are NOT duplicates
          else if (purchaseOrderId && dr.purchase_order_id && purchaseOrderId !== dr.purchase_order_id) {
            isDuplicate = false; // Explicitly NOT a duplicate
            console.log(`   ✅ NOT A DUPLICATE: Different purchase_order_ids - current: ${purchaseOrderId.slice(0, 8)}, pending: ${dr.purchase_order_id.slice(0, 8)}`);
          }
          
          if (isDuplicate) {
            duplicatesToCancel.push(dr.id);
          }
        });
        
        // Cancel all duplicates
        if (duplicatesToCancel.length > 0) {
          console.log(`🗑️ Found ${duplicatesToCancel.length} duplicate delivery requests to cancel:`, duplicatesToCancel);
          
          const cancelResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/delivery_requests?id=in.(${duplicatesToCancel.join(',')})`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                status: 'cancelled',
                rejection_reason: `Duplicate delivery request - another delivery for this order was created (ID: ${currentDeliveryRequestId})`,
                rejected_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            },
            10000
          );
          
          if (cancelResponse.ok) {
            const cancelled = await cancelResponse.json();
            console.log(`✅ Cancelled ${Array.isArray(cancelled) ? cancelled.length : 1} duplicate delivery requests`);
          } else {
            console.warn(`⚠️ Failed to cancel duplicates: ${cancelResponse.status}`);
          }
        } else {
          console.log('✅ No duplicate delivery requests found to cancel');
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Error cancelling duplicates (non-critical):', error.message);
      // Don't throw - this is cleanup, not critical to creation
    }
  };

  const handleRequestDelivery = async () => {
    if (!purchaseOrder) return;

    // CRITICAL: Validate required fields - either address or coordinates MUST be provided
    // Delivery address is MANDATORY - builder must provide it before creating delivery request
    const hasAddress = deliveryData.deliveryAddress.trim() && 
                       deliveryData.deliveryAddress.toLowerCase() !== 'to be provided' &&
                       deliveryData.deliveryAddress.toLowerCase() !== 'tbd' &&
                       deliveryData.deliveryAddress.toLowerCase() !== 'n/a';
    const hasCoordinates = deliveryData.deliveryCoordinates.trim();
    
    if (!hasAddress && !hasCoordinates) {
      toast({
        title: 'Delivery Address Required',
        description: 'Please provide either a delivery address or GPS coordinates. This is mandatory for delivery service providers.',
        variant: 'destructive'
      });
      setSubmitting(false);
      return;
    }
    
    // If only coordinates provided, that's acceptable (will be used as address)
    // If only address provided, that's acceptable
    // But we prefer both for better accuracy

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
      const { userId, accessToken } = await readAuthSessionForRest();
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
      // CRITICAL: Use the address the builder actually entered, NOT the purchase_order.delivery_address
      // The purchase_order.delivery_address might be "To be provided" - we want the builder's actual input
      let fullDeliveryAddress = deliveryData.deliveryAddress.trim();
      
      // CRITICAL: Validate that builder actually entered an address (not just placeholder)
      const isPlaceholderInput = fullDeliveryAddress && (
        fullDeliveryAddress.toLowerCase() === 'to be provided' || 
        fullDeliveryAddress.toLowerCase() === 'tbd' ||
        fullDeliveryAddress.toLowerCase() === 't.b.d.' ||
        fullDeliveryAddress.toLowerCase() === 'n/a' ||
        fullDeliveryAddress.toLowerCase() === 'na' ||
        fullDeliveryAddress.toLowerCase() === 'tba' ||
        fullDeliveryAddress.toLowerCase() === 'to be determined' ||
        fullDeliveryAddress.toLowerCase() === 'delivery location' ||
        fullDeliveryAddress.toLowerCase() === 'address not found'
      );
      
      // CRITICAL: If the address is a placeholder, clear it - builder must provide real address
      if (isPlaceholderInput) {
        console.warn(`⚠️⚠️⚠️ BUILDER ENTERED PLACEHOLDER: "${fullDeliveryAddress}" - clearing it, builder must provide real address`);
        fullDeliveryAddress = ''; // Clear placeholder values
      }
      
      // If coordinates are provided, combine them with address
      if (deliveryData.deliveryCoordinates) {
        if (fullDeliveryAddress) {
          // Both coordinates and address: "coords | address"
          fullDeliveryAddress = `${deliveryData.deliveryCoordinates} | ${fullDeliveryAddress}`;
        } else {
          // Only coordinates: use coordinates as address
          fullDeliveryAddress = deliveryData.deliveryCoordinates;
        }
      }
      
      // CRITICAL: Final validation - ensure we have either address or coordinates
      if (!fullDeliveryAddress || fullDeliveryAddress.trim() === '') {
        toast({
          title: 'Delivery Address Required',
          description: 'Please provide either a delivery address or GPS coordinates.',
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }

      // Validate delivery instructions are provided
      if (!deliveryData.specialInstructions || !deliveryData.specialInstructions.trim()) {
        toast({
          title: 'Delivery Instructions Required',
          description: 'Please describe the products being delivered. You may also include the size of vehicle needed.',
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }

      // Create delivery request payload.
      // CRITICAL: delivery_address is shared DIRECTLY to the delivery provider dashboard (delivery_requests table);
      // the provider who accepts the order sees this address on their dashboard.
      const deliveryPayload: Record<string, any> = {
        builder_id: userId,
        purchase_order_id: purchaseOrder.id,
        pickup_address: pickupAddress,
        delivery_address: fullDeliveryAddress.trim(),
        pickup_date: deliveryData.preferredDate,
        quantity: purchaseOrder.items?.length || 1,
        status: 'pending',
        special_instructions: deliveryData.specialInstructions.trim()
      };

      // NOTE: delivery_requests table does not have supplier_id or supplier_name columns.
      // Supplier info is on purchase_orders; do not add to deliveryPayload.

      // Add optional fields
      if (deliveryData.deliveryCoordinates) {
        deliveryPayload.delivery_coordinates = deliveryData.deliveryCoordinates;
      }
      if (deliveryData.preferredTime && deliveryData.preferredTime !== 'anytime') {
        deliveryPayload.preferred_time = deliveryData.preferredTime;
      }

      console.log('📦 Creating delivery request with payload:', deliveryPayload);
      console.log('📍📍📍 ADDRESS SAVE DEBUG:', {
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryCoordinates: deliveryData.deliveryCoordinates,
        fullDeliveryAddress: fullDeliveryAddress,
        finalPayloadAddress: deliveryPayload.delivery_address,
        addressLength: deliveryPayload.delivery_address?.length || 0,
        isPlaceholder: fullDeliveryAddress.toLowerCase() === 'to be provided' || 
                      fullDeliveryAddress.toLowerCase() === 'tbd' ||
                      fullDeliveryAddress.toLowerCase() === 'n/a',
        willBeSaved: deliveryPayload.delivery_address
      });
      
      // CRITICAL VALIDATION: Ensure we're not saving a placeholder
      if (deliveryPayload.delivery_address && (
        deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
        deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
        deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a'
      )) {
        console.error('🚨🚨🚨 CRITICAL ERROR: Attempting to save placeholder address! Blocking save.');
        toast({
          title: 'Invalid Address',
          description: 'Please provide a real delivery address, not a placeholder like "To be provided".',
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }

      // CRITICAL: Validate purchase_order_id is NOT a delivery_request.id (prevent circular references)
      // This is a frontend safeguard - the database trigger will also catch this, but we want to prevent the error
      if (purchaseOrder.id) {
        try {
          const validationResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${purchaseOrder.id}&select=id&limit=1`,
            {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            },
            3000
          );
          
          if (validationResponse.ok) {
            const validationData = await validationResponse.json();
            if (Array.isArray(validationData) && validationData.length > 0) {
              console.error('🚨 CRITICAL ERROR: purchase_order_id is actually a delivery_request.id! This would create a circular reference!');
              throw new Error('Invalid purchase_order_id: The provided ID is actually a delivery_request ID, not a purchase_order ID. This would create a circular reference and is not allowed.');
            }
          }
        } catch (validationError: any) {
          // If validation fails (e.g., network error), log but continue - database trigger will catch it
          console.warn('⚠️ Could not validate purchase_order_id (database trigger will catch invalid IDs):', validationError.message);
        }
      }

      // CRITICAL: Check if delivery request already exists for this purchase_order_id
      let deliveryRequestId = null;
      try {
        // First, check for existing active delivery request
        // CRITICAL: Also select delivery_address to check if we need to protect it
        const checkResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrder.id}&status=in.(pending,assigned,quoted,quote_accepted,delivery_quote_paid,accepted,in_transit,picked_up,out_for_delivery,scheduled)&select=id,status,delivery_address&limit=1`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          },
          5000
        );

        if (checkResponse.ok) {
          const existingData = await checkResponse.json();
          if (Array.isArray(existingData) && existingData.length > 0) {
            deliveryRequestId = existingData[0].id;
            console.log('⚠️ Active delivery request already exists for this order:', deliveryRequestId, 'Status:', existingData[0].status);
            
            // CRITICAL: Fetch full delivery_request data to get the existing address
            let existingAddress = null;
            try {
              const fullCheckResponse = await fetchWithTimeout(
                `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=delivery_address&limit=1`,
                {
                  method: 'GET',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                },
                3000
              );
              
              if (fullCheckResponse.ok) {
                const fullCheckData = await fullCheckResponse.json();
                if (Array.isArray(fullCheckData) && fullCheckData.length > 0) {
                  existingAddress = fullCheckData[0].delivery_address;
                }
              }
            } catch (fetchError: any) {
              console.warn('⚠️ Could not fetch existing address (non-critical):', fetchError.message);
            }
            
            // CRITICAL: Check existing delivery_request address before updating
            // If it has a real address and we're trying to update with a placeholder, preserve the real address
            const isExistingAddressPlaceholder = existingAddress && (
              existingAddress.toLowerCase().trim() === 'to be provided' ||
              existingAddress.toLowerCase().trim() === 'tbd' ||
              existingAddress.toLowerCase().trim() === 'n/a' ||
              existingAddress.toLowerCase().trim() === 'na' ||
              existingAddress.toLowerCase().trim() === 'tba' ||
              existingAddress.toLowerCase().trim() === 'to be determined' ||
              existingAddress.toLowerCase().trim() === 'delivery location' ||
              existingAddress.toLowerCase().trim() === 'address not found'
            );
            
            // CRITICAL: If existing address is real (not placeholder) and new address is placeholder, keep the real one
            if (!isExistingAddressPlaceholder && existingAddress && existingAddress.length > 10) {
              if (deliveryPayload.delivery_address && (
                deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a'
              )) {
                console.warn('⚠️⚠️⚠️ PROTECTING REAL ADDRESS: Existing delivery_request has real address, not overwriting with placeholder');
                console.warn('   Existing address:', existingAddress.substring(0, 50));
                console.warn('   Attempted placeholder:', deliveryPayload.delivery_address);
                // Keep the existing real address
                deliveryPayload.delivery_address = existingAddress;
              }
            }
            
            // Update the existing request instead of creating duplicate
            const updateResponse = await fetchWithTimeout(
              `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                  ...deliveryPayload,
                  updated_at: new Date().toISOString()
                })
              },
              10000
            );
            
            if (updateResponse.ok) {
              console.log('✅ Updated existing delivery request:', deliveryRequestId);
              
              // CRITICAL: Also update purchase_orders.delivery_address with the real address builder provided
              // This ensures both tables stay in sync and the address doesn't disappear
              // ONLY update if the new address is NOT a placeholder
              const isNewAddressPlaceholder = deliveryPayload.delivery_address && (
                deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'na' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'tba' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'to be determined' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'delivery location' ||
                deliveryPayload.delivery_address.toLowerCase().trim() === 'address not found'
              );
              
              if (deliveryPayload.delivery_address && 
                  !isNewAddressPlaceholder &&
                  deliveryPayload.delivery_address.length > 10) {
                try {
                  // CRITICAL: Check existing purchase_order address before updating
                  // Don't overwrite a real address with a placeholder
                  const existingPOAddress = purchaseOrder.delivery_address;
                  const isExistingPOAddressPlaceholder = existingPOAddress && (
                    existingPOAddress.toLowerCase().trim() === 'to be provided' ||
                    existingPOAddress.toLowerCase().trim() === 'tbd' ||
                    existingPOAddress.toLowerCase().trim() === 'n/a'
                  );
                  
                  // Only update if: new address is real AND (existing is placeholder OR doesn't exist)
                  if (!isExistingPOAddressPlaceholder || !existingPOAddress || existingPOAddress.length <= 10) {
                    const updatePOResponse = await fetchWithTimeout(
                      `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
                      {
                        method: 'PATCH',
                        headers: {
                          'apikey': SUPABASE_ANON_KEY,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                          delivery_address: deliveryPayload.delivery_address,
                          updated_at: new Date().toISOString()
                        })
                      },
                      5000
                    );
                    
                    if (updatePOResponse.ok) {
                      console.log('✅✅✅ SYNCED: Updated purchase_orders.delivery_address with builder-provided address:', deliveryPayload.delivery_address.substring(0, 50));
                    } else {
                      const errorText = await updatePOResponse.text();
                      console.warn('⚠️ Failed to update purchase_orders.delivery_address:', errorText);
                    }
                  } else {
                    console.log('⚠️ Skipping purchase_order update - existing address is real, not overwriting');
                  }
                } catch (updatePOError: any) {
                  console.warn('⚠️ Error updating purchase_orders.delivery_address (non-critical):', updatePOError.message);
                }
              }
              
              // CRITICAL: Cancel all other duplicate delivery requests for this order
              await cancelDuplicateDeliveryRequests(deliveryRequestId, purchaseOrder.id, deliveryPayload.delivery_address, '', accessToken);
            } else {
              console.warn('⚠️ Failed to update existing delivery request');
            }
          }
        }
      } catch (checkError: any) {
        console.warn('⚠️ Error checking for existing delivery request:', checkError.message);
      }

      // CRITICAL: Double-check for duplicates before creating (database constraint will also catch this, but we want to prevent the error)
      if (!deliveryRequestId) {
        try {
          // Check by purchase_order_id first
          const finalCheckResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrder.id}&status=in.(pending,assigned,requested,quoted,quote_accepted,delivery_quote_paid)&select=id,status&limit=1`,
            {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            },
            5000
          );

          if (finalCheckResponse.ok) {
            const finalCheckData = await finalCheckResponse.json();
            if (Array.isArray(finalCheckData) && finalCheckData.length > 0) {
              deliveryRequestId = finalCheckData[0].id;
              console.log('⚠️ Found existing delivery request in final check, updating instead:', deliveryRequestId);
              
              // CRITICAL: Fetch existing delivery_request to check its address
              try {
                const existingCheckResponse = await fetchWithTimeout(
                  `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=delivery_address&limit=1`,
                  {
                    method: 'GET',
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    }
                  },
                  3000
                );
                
                if (existingCheckResponse.ok) {
                  const existingCheckData = await existingCheckResponse.json();
                  if (Array.isArray(existingCheckData) && existingCheckData.length > 0) {
                    const existingAddress = existingCheckData[0].delivery_address;
                    const isExistingAddressPlaceholder = existingAddress && (
                      existingAddress.toLowerCase().trim() === 'to be provided' ||
                      existingAddress.toLowerCase().trim() === 'tbd' ||
                      existingAddress.toLowerCase().trim() === 'n/a' ||
                      existingAddress.toLowerCase().trim() === 'na' ||
                      existingAddress.toLowerCase().trim() === 'tba' ||
                      existingAddress.toLowerCase().trim() === 'to be determined' ||
                      existingAddress.toLowerCase().trim() === 'delivery location' ||
                      existingAddress.toLowerCase().trim() === 'address not found'
                    );
                    
                    // CRITICAL: If existing address is real (not placeholder) and new address is placeholder, keep the real one
                    if (!isExistingAddressPlaceholder && existingAddress && existingAddress.length > 10) {
                      if (deliveryPayload.delivery_address && (
                        deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                        deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                        deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a'
                      )) {
                        console.warn('⚠️⚠️⚠️ PROTECTING REAL ADDRESS: Existing delivery_request has real address, not overwriting with placeholder');
                        console.warn('   Existing address:', existingAddress.substring(0, 50));
                        console.warn('   Attempted placeholder:', deliveryPayload.delivery_address);
                        // Keep the existing real address
                        deliveryPayload.delivery_address = existingAddress;
                      }
                    }
                  }
                }
              } catch (existingCheckError: any) {
                console.warn('⚠️ Could not check existing address (non-critical):', existingCheckError.message);
              }
              
              // Update existing instead of creating duplicate
              const updateResponse = await fetchWithTimeout(
                `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    ...deliveryPayload,
                    updated_at: new Date().toISOString()
                  })
                },
                10000
              );
              
              if (updateResponse.ok) {
                console.log('✅ Updated existing delivery request:', deliveryRequestId);
                
                // CRITICAL: Also update purchase_orders.delivery_address with the real address builder provided
                // This ensures both tables stay in sync and the address doesn't disappear
                const isNewAddressPlaceholder2 = deliveryPayload.delivery_address && (
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'na' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'tba' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'to be determined' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'delivery location' ||
                  deliveryPayload.delivery_address.toLowerCase().trim() === 'address not found'
                );
                
                if (deliveryPayload.delivery_address && 
                    !isNewAddressPlaceholder2 &&
                    deliveryPayload.delivery_address.length > 10) {
                  try {
                    // Check existing purchase_order address before updating
                    const existingPOAddress = purchaseOrder.delivery_address;
                    const isExistingPOAddressPlaceholder = existingPOAddress && (
                      existingPOAddress.toLowerCase().trim() === 'to be provided' ||
                      existingPOAddress.toLowerCase().trim() === 'tbd' ||
                      existingPOAddress.toLowerCase().trim() === 'n/a'
                    );
                    
                    // Only update if: new address is real AND (existing is placeholder OR doesn't exist)
                    if (isExistingPOAddressPlaceholder || !existingPOAddress || existingPOAddress.length <= 10) {
                      const updatePOResponse = await fetchWithTimeout(
                        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
                        {
                          method: 'PATCH',
                          headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                          },
                          body: JSON.stringify({
                            delivery_address: deliveryPayload.delivery_address,
                            updated_at: new Date().toISOString()
                          })
                        },
                        5000
                      );
                      
                      if (updatePOResponse.ok) {
                        console.log('✅✅✅ SYNCED: Updated purchase_orders.delivery_address with builder-provided address:', deliveryPayload.delivery_address.substring(0, 50));
                      } else {
                        const errorText = await updatePOResponse.text();
                        console.warn('⚠️ Failed to update purchase_orders.delivery_address:', errorText);
                      }
                    } else {
                      console.log('⚠️ Skipping purchase_order update - existing address is real, not overwriting');
                    }
                  } catch (updatePOError: any) {
                    console.warn('⚠️ Error updating purchase_orders.delivery_address (non-critical):', updatePOError.message);
                  }
                }
                
                await cancelDuplicateDeliveryRequests(deliveryRequestId, purchaseOrder.id, deliveryPayload.delivery_address, '', accessToken);
              }
            }
          }
        } catch (finalCheckError: any) {
          console.warn('⚠️ Error in final duplicate check (non-critical):', finalCheckError.message);
        }
      }

      // Only create new delivery request if one doesn't exist
      if (!deliveryRequestId) {
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
            const savedDelivery = Array.isArray(deliveryData) ? deliveryData[0] : deliveryData;
            console.log('✅ Delivery request created:', deliveryRequestId);
            console.log('📍📍📍 SAVED ADDRESS VERIFICATION:', {
              delivery_request_id: deliveryRequestId,
              saved_delivery_address: savedDelivery?.delivery_address,
              saved_address_length: savedDelivery?.delivery_address?.length || 0,
              saved_coordinates: savedDelivery?.delivery_coordinates,
              matches_payload: savedDelivery?.delivery_address === deliveryPayload.delivery_address
            });
            
            // CRITICAL: Also update purchase_orders.delivery_address with the real address builder provided
            // This ensures both tables stay in sync and the address doesn't disappear
            const isNewAddressPlaceholder3 = deliveryPayload.delivery_address && (
              deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'na' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'tba' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'to be determined' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'delivery location' ||
              deliveryPayload.delivery_address.toLowerCase().trim() === 'address not found'
            );
            
            if (deliveryPayload.delivery_address && 
                !isNewAddressPlaceholder3 &&
                deliveryPayload.delivery_address.length > 10) {
              try {
                // Check existing purchase_order address before updating
                const existingPOAddress = purchaseOrder.delivery_address;
                const isExistingPOAddressPlaceholder = existingPOAddress && (
                  existingPOAddress.toLowerCase().trim() === 'to be provided' ||
                  existingPOAddress.toLowerCase().trim() === 'tbd' ||
                  existingPOAddress.toLowerCase().trim() === 'n/a'
                );
                
                // Only update if: new address is real AND (existing is placeholder OR doesn't exist)
                if (isExistingPOAddressPlaceholder || !existingPOAddress || existingPOAddress.length <= 10) {
                  const updatePOResponse = await fetchWithTimeout(
                    `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                      },
                      body: JSON.stringify({
                        delivery_address: deliveryPayload.delivery_address,
                        updated_at: new Date().toISOString()
                      })
                    },
                    5000
                  );
                  
                  if (updatePOResponse.ok) {
                    const updatedPO = await updatePOResponse.json();
                    const poData = Array.isArray(updatedPO) ? updatedPO[0] : updatedPO;
                    console.log('✅✅✅ SYNCED: Updated purchase_orders.delivery_address with builder-provided address');
                    console.log('   Purchase Order ID:', purchaseOrder.id);
                    console.log('   New address:', deliveryPayload.delivery_address.substring(0, 60));
                    console.log('   Verified in DB:', poData?.delivery_address?.substring(0, 60));
                  } else {
                    const errorText = await updatePOResponse.text();
                    console.warn('⚠️ Failed to update purchase_orders.delivery_address:', errorText);
                  }
                } else {
                  console.log('⚠️ Skipping purchase_order update - existing address is real, not overwriting');
                }
              } catch (updatePOError: any) {
                console.warn('⚠️ Error updating purchase_orders.delivery_address (non-critical):', updatePOError.message);
              }
            }
            
            // CRITICAL: Cancel all other duplicate delivery requests for this order
            await cancelDuplicateDeliveryRequests(deliveryRequestId, purchaseOrder.id, deliveryPayload.delivery_address, deliveryPayload.material_type, accessToken);
          } else {
            const errorText = await deliveryResponse.text();
            console.warn('⚠️ Delivery insert failed:', errorText);
            // Check if it's a duplicate error (database constraint violation)
            if (errorText.includes('duplicate') || errorText.includes('Duplicate') || errorText.includes('unique') || errorText.includes('violates')) {
              // Try to find the existing one
              const findResponse = await fetchWithTimeout(
                `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrder.id}&status=in.(pending,assigned,requested,quoted,quote_accepted,delivery_quote_paid)&select=id&limit=1`,
                {
                  method: 'GET',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                },
                5000
              );
              if (findResponse.ok) {
                const findData = await findResponse.json();
                if (Array.isArray(findData) && findData.length > 0) {
                  deliveryRequestId = findData[0].id;
                  console.log('✅ Found existing delivery request after duplicate error, updating:', deliveryRequestId);
                  
                  // CRITICAL: Fetch existing delivery_request to check its address
                  try {
                    const existingCheckResponse = await fetchWithTimeout(
                      `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}&select=delivery_address&limit=1`,
                      {
                        method: 'GET',
                        headers: {
                          'apikey': SUPABASE_ANON_KEY,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json'
                        }
                      },
                      3000
                    );
                    
                    if (existingCheckResponse.ok) {
                      const existingCheckData = await existingCheckResponse.json();
                      if (Array.isArray(existingCheckData) && existingCheckData.length > 0) {
                        const existingAddress = existingCheckData[0].delivery_address;
                        const isExistingAddressPlaceholder = existingAddress && (
                          existingAddress.toLowerCase().trim() === 'to be provided' ||
                          existingAddress.toLowerCase().trim() === 'tbd' ||
                          existingAddress.toLowerCase().trim() === 'n/a' ||
                          existingAddress.toLowerCase().trim() === 'na' ||
                          existingAddress.toLowerCase().trim() === 'tba' ||
                          existingAddress.toLowerCase().trim() === 'to be determined' ||
                          existingAddress.toLowerCase().trim() === 'delivery location' ||
                          existingAddress.toLowerCase().trim() === 'address not found'
                        );
                        
                        // CRITICAL: If existing address is real (not placeholder) and new address is placeholder, keep the real one
                        if (!isExistingAddressPlaceholder && existingAddress && existingAddress.length > 10) {
                          if (deliveryPayload.delivery_address && (
                            deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                            deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                            deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a'
                          )) {
                            console.warn('⚠️⚠️⚠️ PROTECTING REAL ADDRESS: Existing delivery_request has real address, not overwriting with placeholder');
                            console.warn('   Existing address:', existingAddress.substring(0, 50));
                            console.warn('   Attempted placeholder:', deliveryPayload.delivery_address);
                            // Keep the existing real address
                            deliveryPayload.delivery_address = existingAddress;
                          }
                        }
                      }
                    }
                  } catch (existingCheckError: any) {
                    console.warn('⚠️ Could not check existing address (non-critical):', existingCheckError.message);
                  }
                  
                  // Update the existing one
                  const updateResponse = await fetchWithTimeout(
                    `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryRequestId}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                      },
                      body: JSON.stringify({
                        ...deliveryPayload,
                        updated_at: new Date().toISOString()
                      })
                    },
                    10000
                  );
                  if (updateResponse.ok) {
                    // CRITICAL: Also update purchase_orders.delivery_address with the real address builder provided
                    const isNewAddressPlaceholder4 = deliveryPayload.delivery_address && (
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'to be provided' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'tbd' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'n/a' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'na' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'tba' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'to be determined' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'delivery location' ||
                      deliveryPayload.delivery_address.toLowerCase().trim() === 'address not found'
                    );
                    
                    if (deliveryPayload.delivery_address && 
                        !isNewAddressPlaceholder4 &&
                        deliveryPayload.delivery_address.length > 10) {
                      try {
                        const existingPOAddress = purchaseOrder.delivery_address;
                        const isExistingPOAddressPlaceholder = existingPOAddress && (
                          existingPOAddress.toLowerCase().trim() === 'to be provided' ||
                          existingPOAddress.toLowerCase().trim() === 'tbd' ||
                          existingPOAddress.toLowerCase().trim() === 'n/a'
                        );
                        
                        if (isExistingPOAddressPlaceholder || !existingPOAddress || existingPOAddress.length <= 10) {
                          const updatePOResponse = await fetchWithTimeout(
                            `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
                            {
                              method: 'PATCH',
                              headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                              },
                              body: JSON.stringify({
                                delivery_address: deliveryPayload.delivery_address,
                                updated_at: new Date().toISOString()
                              })
                            },
                            5000
                          );
                          
                          if (updatePOResponse.ok) {
                            console.log('✅✅✅ SYNCED: Updated purchase_orders.delivery_address with builder-provided address:', deliveryPayload.delivery_address.substring(0, 50));
                          } else {
                            const errorText = await updatePOResponse.text();
                            console.warn('⚠️ Failed to update purchase_orders.delivery_address:', errorText);
                          }
                        } else {
                          console.log('⚠️ Skipping purchase_order update - existing address is real, not overwriting');
                        }
                      } catch (updatePOError: any) {
                        console.warn('⚠️ Error updating purchase_orders.delivery_address (non-critical):', updatePOError.message);
                      }
                    }
                    
                    await cancelDuplicateDeliveryRequests(deliveryRequestId, purchaseOrder.id, deliveryPayload.delivery_address, '', accessToken);
                  }
                }
              }
            }
          }
        } catch (insertError: any) {
          console.warn('⚠️ Insert error:', insertError.message);
        }
      }

      // Builder explicitly submitted delivery — sync PO flags (quote accept no longer sets delivery_required early)
      try {
        const poPatchResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              delivery_required: true,
              builder_fulfillment_choice: 'delivery',
              updated_at: new Date().toISOString(),
            }),
          },
          8000
        );
        if (!poPatchResponse.ok) {
          console.warn('⚠️ Could not set purchase_orders.delivery_required:', await poPatchResponse.text());
        }

        const rpcResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/rpc/mark_delivery_requested`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ po_id: purchaseOrder.id }),
          },
          8000
        );
        if (!rpcResponse.ok) {
          console.warn('⚠️ mark_delivery_requested RPC:', await rpcResponse.text());
        }
      } catch (poSyncErr: any) {
        console.warn('⚠️ PO sync after delivery request (non-blocking):', poSyncErr?.message);
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
        quantity: purchaseOrder.items?.length || 1,
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

      // Call success callback with builder's delivery address so monitoring form can pre-fill site address
      if (onDeliveryRequested) {
        setTimeout(() => {
          onDeliveryRequested({ deliveryAddress: fullDeliveryAddress });
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
      const { accessToken } = await readAuthSessionForRest();
      if (!accessToken) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in again to update your order.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      // Update purchase order using fetch with timeout
      const updateResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${purchaseOrder.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            delivery_required: false,
            builder_fulfillment_choice: 'pickup',
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

      if (onDeclined) onDeclined();
      
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
                Arrange delivery or pickup?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Providers are only notified after you confirm delivery and send the request with a real address or GPS.
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
              <DialogDescription className="sr-only">Enter delivery address and preferences</DialogDescription>
            </DialogHeader>

            {/* Products bought by builder - MUST show what client ordered */}
            {purchaseOrder?.items && purchaseOrder.items.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    Products in this order
                  </p>
                  <ul className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {purchaseOrder.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-xs bg-white/80 rounded px-2 py-1.5 border border-blue-100">
                        <span className="font-medium text-gray-800 truncate flex-1 mr-2">
                          {item.material_name || item.name || 'Item'}
                        </span>
                        <span className="text-gray-600 shrink-0">
                          {item.quantity} {item.unit || 'unit'}
                          {item.unit_price != null && (
                            <span className="ml-1 text-green-600">
                              · KES {((item.quantity) * (item.unit_price || 0)).toLocaleString()}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-blue-600" />
                  Or enter coordinates / Search on Map
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="-1.286389, 36.817223"
                    value={deliveryData.deliveryCoordinates}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryCoordinates: e.target.value }))}
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => {
                      console.log('🗺️ Delivery Map button clicked in DeliveryPromptDialog');
                      setShowDeliveryMap(true);
                    }}
                    title="Click to open interactive map for location selection"
                    className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-medium px-4"
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    Search on Map
                  </Button>
                </div>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <MapIcon className="h-3 w-3" />
                  💡 Click "Search on Map" to select location visually on an interactive map
                </p>
              </div>

              {/* Delivery Map Picker */}
              {showDeliveryMap && (
                  <div className="mt-3 border-2 border-blue-500 rounded-lg p-4 bg-white shadow-lg">
                    <MapLocationPicker
                      initialLocation={
                        deliveryData.deliveryCoordinates
                          ? (() => {
                              const parts = deliveryData.deliveryCoordinates.split(',').map(s => s.trim());
                              if (parts.length === 2) {
                                const lat = parseFloat(parts[0]);
                                const lng = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  return {
                                    latitude: lat,
                                    longitude: lng,
                                    address: deliveryData.deliveryAddress
                                  };
                                }
                              }
                              return undefined;
                            })()
                          : undefined
                      }
                      onLocationSelect={(location) => {
                        setDeliveryData(prev => ({
                          ...prev,
                          deliveryCoordinates: `${location.latitude}, ${location.longitude}`,
                          deliveryAddress: prev.deliveryAddress || location.address
                        }));
                        setShowDeliveryMap(false);
                        toast({
                          title: '📍 Delivery Location Set!',
                          description: `GPS coordinates saved: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                        });
                      }}
                      onClose={() => setShowDeliveryMap(false)}
                      title="Select Delivery Location"
                      description="Search for an address or click on the map to set the delivery location"
                    />
                  </div>
                )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or address</span></div>
              </div>

              {/* Address field - MANDATORY: shared DIRECTLY to delivery provider; must never be missing on their dashboard */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Delivery Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Street address, landmark... (Required)"
                  value={deliveryData.deliveryAddress}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="text-xs h-8"
                  required
                  aria-required="true"
                />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                  This address is shared <strong>directly</strong> with the delivery provider who accepts your order. It must not be missing from their dashboard. Provide a street address above or use GPS / Search on Map.
                </p>
                {!deliveryData.deliveryAddress.trim() && !deliveryData.deliveryCoordinates.trim() && (
                  <p className="text-xs text-red-500 mt-0.5">
                    Delivery address or GPS coordinates is required to send the request.
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              {/* Delivery Instructions - Required */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Delivery Instructions <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Mention products being delivered (e.g., '2 Lever Mortise Locks, steel doors'). You may also include the size of vehicle needed for delivery (e.g., 'Requires pickup truck or small lorry')."
                  value={deliveryData.specialInstructions}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  className="text-xs min-h-[80px]"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Required: Describe the products and optionally specify vehicle size needed
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('prompt')} disabled={submitting} size="sm" className="h-8">
                Back
              </Button>
              <Button
                onClick={handleRequestDelivery}
                disabled={submitting || !(hasAddress || hasCoordinates) || !deliveryData.specialInstructions?.trim()}
                className="bg-blue-600 hover:bg-blue-700 h-8"
                size="sm"
                title={
                  !(hasAddress || hasCoordinates)
                    ? 'Provide delivery address or GPS coordinates to continue'
                    : !deliveryData.specialInstructions?.trim()
                    ? 'Delivery instructions are required. Please describe the products being delivered.'
                    : undefined
                }
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Truck className="h-4 w-4 mr-1" />Send Request</>}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogDescription className="sr-only">Delivery request submitted successfully</DialogDescription>
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
          </>
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

