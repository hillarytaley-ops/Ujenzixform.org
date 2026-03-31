/**
 * PendingQuoteRequests - Shows all quote requests sent to suppliers
 * 
 * This component displays:
 * 1. Pending quotes (waiting for supplier response)
 * 2. Quoted (supplier has responded with pricing)
 * 3. Allows comparison of quotes from multiple suppliers for the same items
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Clock, 
  Store, 
  Package, 
  Calendar,
  MapPin,
  RefreshCw,
  Loader2,
  FileText,
  Star
} from 'lucide-react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuoteRequest {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_rating?: number;
  supplier_location?: string;
  total_amount: number;
  status: 'pending' | 'quoted' | 'confirmed' | 'rejected';
  items: any[];
  delivery_address: string;
  delivery_date: string;
  project_name: string;
  created_at: string;
  updated_at?: string;
  // For quoted status
  quoted_amount?: number;
  supplier_notes?: string;
}

interface PendingQuoteRequestsProps {
  builderId: string;
}

export const PendingQuoteRequests: React.FC<PendingQuoteRequestsProps> = ({ builderId }) => {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  // Helper to get auth token from localStorage
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.access_token) {
          headers['Authorization'] = `Bearer ${parsed.access_token}`;
        }
      }
    } catch (e) {
      console.warn('Could not get auth token');
    }
    return headers;
  };

  useEffect(() => {
    fetchQuoteRequests();
    // Safety timeout
    const safetyTimeout = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(safetyTimeout);
  }, [builderId]);

  const fetchQuoteRequests = async () => {
    if (!builderId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const headers = getAuthHeaders();
    
    try {
      // Fetch only PENDING quote requests (awaiting supplier response)
      // Quoted requests are shown in the "Supplier Responses" tab
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const ordersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${builderId}&status=eq.pending&order=created_at.desc`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);

      if (!ordersResponse.ok) {
        throw new Error(`Orders fetch failed: ${ordersResponse.status}`);
      }
      
      const ordersData = await ordersResponse.json();
      console.log('📋 Quote requests loaded:', ordersData?.length || 0);

      // Fetch supplier details
      let suppliersData: any[] = [];
      try {
        const suppliersController = new AbortController();
        const suppliersTimeoutId = setTimeout(() => suppliersController.abort(), 5000);
        
        const suppliersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name,rating,location`,
          { headers, signal: suppliersController.signal, cache: 'no-store' }
        );
        clearTimeout(suppliersTimeoutId);
        
        if (suppliersResponse.ok) {
          suppliersData = await suppliersResponse.json();
        }
      } catch (e) {
        console.log('Suppliers fetch timeout');
      }

      const suppliersMap = new Map();
      suppliersData?.forEach(s => {
        suppliersMap.set(s.id, s);
        if (s.user_id) suppliersMap.set(s.user_id, s);
      });

      // Map orders with supplier info
      const requestsWithSuppliers = (ordersData || []).map(order => {
        const supplier = suppliersMap.get(order.supplier_id);
        return {
          ...order,
          supplier_name: supplier?.company_name || 'Supplier',
          supplier_rating: supplier?.rating,
          supplier_location: supplier?.location,
        };
      });

      setRequests(requestsWithSuppliers);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quote requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // All requests here are pending (awaiting supplier response)
  const pendingRequests = requests;

  const getStatusBadge = () => {
    // All requests in this component are pending
    return <Badge className="bg-amber-500 text-white"><Clock className="h-3 w-3 mr-1" />Awaiting Response</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading quote requests...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchQuoteRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Requests List */}
      {pendingRequests.length === 0 ? (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-amber-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Pending Quote Requests</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              When you request quotes from suppliers, they'll appear here while waiting for their responses.
            </p>
            <p className="text-sm text-amber-600 mt-4">
              💡 Tip: Request quotes from the marketplace to compare prices from multiple suppliers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-amber-200 bg-gradient-to-r from-amber-50/50 to-yellow-50/30 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-lg">{request.supplier_name}</CardTitle>
                  </div>
                      {getStatusBadge()}
                </div>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Sent: {new Date(request.created_at).toLocaleDateString()}
                  </span>
                  {request.supplier_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {request.supplier_location}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Items Summary */}
                  <div className="flex flex-wrap gap-2">
                    {request.items?.slice(0, 3).map((item: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-white">
                        <Package className="h-3 w-3 mr-1" />
                        {item.material_name} x{item.quantity}
                      </Badge>
                    ))}
                    {request.items?.length > 3 && (
                      <Badge variant="outline" className="bg-white">
                        +{request.items.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-500">
                      Estimated: KES {request.total_amount?.toLocaleString() || '0'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Quote Request Details
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.po_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* Supplier Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{selectedRequest.supplier_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {selectedRequest.supplier_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedRequest.supplier_location}
                    </span>
                  )}
                  {selectedRequest.supplier_rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {selectedRequest.supplier_rating.toFixed(1)} rating
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Items Requested</h4>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {selectedRequest.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{item.material_name}</span>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{item.quantity} {item.unit}</span>
                          {item.unit_price && (
                            <p className="text-sm text-gray-500">
                              Est: KES {(item.unit_price * item.quantity).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Delivery Address</span>
                  <p className="font-medium">{selectedRequest.delivery_address}</p>
                </div>
                <div>
                  <span className="text-gray-500">Requested Date</span>
                  <p className="font-medium">{new Date(selectedRequest.delivery_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Total */}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {selectedRequest.status === 'quoted' ? 'Quoted Amount' : 'Estimated Total'}
                </span>
                <span className="text-xl font-bold text-blue-600">
                  KES {(selectedRequest.quoted_amount || selectedRequest.total_amount)?.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingQuoteRequests;

