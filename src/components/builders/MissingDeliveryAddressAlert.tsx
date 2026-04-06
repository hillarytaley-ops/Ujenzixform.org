import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, CheckCircle, X } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface DeliveryRequestMissingAddress {
  id: string;
  purchase_order_id: string;
  status: string;
  created_at: string;
  po_number?: string;
  material_type?: string;
}

interface MissingDeliveryAddressAlertProps {
  builderId: string;
  userId: string;
}

export const MissingDeliveryAddressAlert: React.FC<MissingDeliveryAddressAlertProps> = ({
  builderId,
  userId
}) => {
  const [missingAddressRequests, setMissingAddressRequests] = useState<DeliveryRequestMissingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequestMissingAddress | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [coordinatesInput, setCoordinatesInput] = useState('');
  const { toast } = useToast();

  // Fetch delivery requests with missing addresses
  const fetchMissingAddressRequests = async () => {
    try {
      setLoading(true);
      
      // Get access token
      const storedSession = readPersistedAuthRawStringSync();
      let accessToken = '';
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token || '';
      }

      // Fetch delivery requests with NULL or empty addresses
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?` +
        `builder_id=eq.${builderId}&` +
        `status=in.(pending,requested,assigned,accepted,scheduled,in_transit,picked_up,out_for_delivery)&` +
        `or=(delivery_address.is.null,delivery_address.eq.)&` +
        `select=id,purchase_order_id,status,created_at,material_type&` +
        `order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      );

      if (response.ok) {
        const requests = await response.json();
        
        // Fetch purchase order numbers for each request
        const requestsWithPO = await Promise.all(
          requests.map(async (req: any) => {
            if (req.purchase_order_id) {
              try {
                const poResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${req.purchase_order_id}&select=po_number&limit=1`,
                  {
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    cache: 'no-store'
                  }
                );
                if (poResponse.ok) {
                  const poData = await poResponse.json();
                  if (Array.isArray(poData) && poData.length > 0) {
                    req.po_number = poData[0].po_number;
                  }
                }
              } catch (e) {
                console.warn('Could not fetch PO number:', e);
              }
            }
            return req;
          })
        );
        
        setMissingAddressRequests(requestsWithPO);
      }
    } catch (error: any) {
      console.error('Error fetching missing address requests:', error);
      toast({
        title: 'Error',
        description: 'Could not load delivery requests with missing addresses.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissingAddressRequests();

    // Set up real-time subscription for delivery_requests
    const channel = supabase
      .channel('missing-address-delivery-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests',
          filter: `builder_id=eq.${builderId}`
        },
        (payload) => {
          console.log('🔄 Delivery request changed:', payload);
          // Refresh the list
          fetchMissingAddressRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [builderId]);

  const handleUpdateAddress = async () => {
    if (!selectedRequest) return;
    
    if (!addressInput.trim() && !coordinatesInput.trim()) {
      toast({
        title: 'Address Required',
        description: 'Please provide either a delivery address or GPS coordinates.',
        variant: 'destructive'
      });
      return;
    }

    // Validate address is not a placeholder
    const address = addressInput.trim();
    const isPlaceholder = address && (
      address.toLowerCase() === 'to be provided' ||
      address.toLowerCase() === 'tbd' ||
      address.toLowerCase() === 'n/a' ||
      address.toLowerCase() === 'na' ||
      address.toLowerCase() === 'tba' ||
      address.toLowerCase() === 'to be determined' ||
      address.toLowerCase() === 'delivery location' ||
      address.toLowerCase() === 'address not found'
    );

    if (isPlaceholder) {
      toast({
        title: 'Invalid Address',
        description: 'Please provide a specific delivery address, not a placeholder.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUpdating(selectedRequest.id);

      // Get access token
      const storedSession = readPersistedAuthRawStringSync();
      let accessToken = '';
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token || '';
      }

      // Build full address with coordinates
      let fullAddress = address;
      if (coordinatesInput.trim()) {
        if (fullAddress) {
          fullAddress = `${coordinatesInput.trim()} | ${fullAddress}`;
        } else {
          fullAddress = coordinatesInput.trim();
        }
      }

      // Update delivery request
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${selectedRequest.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            delivery_address: fullAddress.trim(),
            delivery_coordinates: coordinatesInput.trim() || null,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (updateResponse.ok) {
        // Also update purchase_order if it has a placeholder
        if (selectedRequest.purchase_order_id) {
          try {
            const poResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${selectedRequest.purchase_order_id}&select=delivery_address&limit=1`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );

            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (Array.isArray(poData) && poData.length > 0) {
                const existingPOAddress = poData[0].delivery_address;
                const isPOPlaceholder = existingPOAddress && (
                  existingPOAddress.toLowerCase().trim() === 'to be provided' ||
                  existingPOAddress.toLowerCase().trim() === 'tbd' ||
                  existingPOAddress.toLowerCase().trim() === 'n/a'
                );

                if (isPOPlaceholder || !existingPOAddress || existingPOAddress.length <= 10) {
                  await fetch(
                    `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${selectedRequest.purchase_order_id}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        delivery_address: fullAddress.trim(),
                        updated_at: new Date().toISOString()
                      })
                    }
                  );
                }
              }
            }
          } catch (poError) {
            console.warn('Could not update purchase_order address:', poError);
          }
        }

        toast({
          title: 'Address Updated',
          description: 'Delivery address has been updated. Delivery providers can now see and accept your request.',
          variant: 'default'
        });

        setEditDialogOpen(false);
        setSelectedRequest(null);
        setAddressInput('');
        setCoordinatesInput('');
        fetchMissingAddressRequests();
      } else {
        const errorText = await updateResponse.text();
        throw new Error(errorText);
      }
    } catch (error: any) {
      console.error('Error updating address:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not update delivery address. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const openEditDialog = (request: DeliveryRequestMissingAddress) => {
    setSelectedRequest(request);
    setAddressInput('');
    setCoordinatesInput('');
    setEditDialogOpen(true);
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (missingAddressRequests.length === 0) {
    return null; // Don't show alert if no missing addresses
  }

  return (
    <>
      <Card className="border-red-300 bg-red-50 mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">
                Action Required: Missing Delivery Addresses
              </CardTitle>
            </div>
            <Badge variant="destructive" className="text-sm">
              {missingAddressRequests.length} {missingAddressRequests.length === 1 ? 'request' : 'requests'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 mb-4">
            The following delivery requests are missing delivery addresses. Delivery providers cannot accept these requests until you provide an address.
          </p>
          
          <div className="space-y-2">
            {missingAddressRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-gray-900">
                      {request.po_number || 'Order #' + request.purchase_order_id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {request.status}
                    </Badge>
                  </div>
                  {request.material_type && (
                    <p className="text-xs text-gray-600">
                      {request.material_type}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openEditDialog(request)}
                  className="ml-4"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Provide Address
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Address Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Delivery Address</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>Please provide the delivery address for order {selectedRequest.po_number || selectedRequest.purchase_order_id.slice(0, 8)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="address">Delivery Address *</Label>
              <Input
                id="address"
                placeholder="Enter full delivery address (e.g., 123 Main St, Nairobi, Kenya)"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide a complete address where materials should be delivered
              </p>
            </div>
            
            <div>
              <Label htmlFor="coordinates">GPS Coordinates (Optional)</Label>
              <Input
                id="coordinates"
                placeholder="e.g., -1.2921, 36.8219"
                value={coordinatesInput}
                onChange={(e) => setCoordinatesInput(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: GPS coordinates for more accurate location
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedRequest(null);
                  setAddressInput('');
                  setCoordinatesInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAddress}
                disabled={updating === selectedRequest?.id || (!addressInput.trim() && !coordinatesInput.trim())}
              >
                {updating === selectedRequest?.id ? (
                  <>Updating...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Update Address
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
