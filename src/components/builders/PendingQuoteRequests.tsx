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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle, 
  XCircle, 
  Store, 
  Package, 
  Calendar,
  MapPin,
  RefreshCw,
  Loader2,
  FileText,
  DollarSign,
  TrendingDown,
  Trophy,
  Star,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuoteRequests();
  }, [builderId]);

  const fetchQuoteRequests = async () => {
    setLoading(true);
    try {
      // Fetch all purchase orders that are quote requests (QR- prefix or pending/quoted status)
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('buyer_id', builderId)
        .in('status', ['pending', 'quoted'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch supplier details
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name, rating, location');

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

  const handleAcceptQuote = async (request: QuoteRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: '✅ Quote Accepted!',
        description: `Order confirmed with ${request.supplier_name}. QR codes will be generated.`,
      });

      fetchQuoteRequests();
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectQuote = async (request: QuoteRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Quote Rejected',
        description: `Quote from ${request.supplier_name} has been rejected.`,
      });

      fetchQuoteRequests();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const quotedRequests = requests.filter(r => r.status === 'quoted');

  // Group quoted requests by items (for comparison)
  const groupedByItems = quotedRequests.reduce((acc, req) => {
    // Create a key based on item names
    const itemKey = req.items?.map((i: any) => i.material_name).sort().join('|') || req.id;
    if (!acc[itemKey]) {
      acc[itemKey] = [];
    }
    acc[itemKey].push(req);
    return acc;
  }, {} as Record<string, QuoteRequest[]>);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Awaiting Response</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-500"><DollarSign className="h-3 w-3 mr-1" />Quoted</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Quote Requests</h2>
          <p className="text-gray-600">Track and compare quotes from suppliers</p>
        </div>
        <Button variant="outline" onClick={fetchQuoteRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="quoted" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Quoted ({quotedRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Pending Requests</h3>
                <p className="text-gray-500 mt-2">
                  When you request quotes, they'll appear here while waiting for supplier responses.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-yellow-600" />
                        <CardTitle className="text-lg">{request.supplier_name}</CardTitle>
                      </div>
                      {getStatusBadge(request.status)}
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
        </TabsContent>

        {/* Quoted Tab - With Comparison */}
        <TabsContent value="quoted" className="mt-4">
          {quotedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Quotes Yet</h3>
                <p className="text-gray-500 mt-2">
                  When suppliers respond with pricing, you can compare and accept quotes here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Comparison Groups */}
              {Object.entries(groupedByItems).map(([itemKey, quotes]) => (
                <Card key={itemKey} className="border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        {quotes[0]?.items?.[0]?.material_name || 'Quote Request'}
                        {quotes[0]?.items?.length > 1 && ` +${quotes[0].items.length - 1} more items`}
                      </CardTitle>
                      {quotes.length > 1 && (
                        <Badge className="bg-purple-500">
                          <Trophy className="h-3 w-3 mr-1" />
                          {quotes.length} Quotes to Compare
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Sort by price (lowest first) */}
                      {quotes
                        .sort((a, b) => (a.quoted_amount || a.total_amount) - (b.quoted_amount || b.total_amount))
                        .map((quote, index) => {
                          const isLowest = index === 0 && quotes.length > 1;
                          const price = quote.quoted_amount || quote.total_amount;
                          const lowestPrice = quotes[0]?.quoted_amount || quotes[0]?.total_amount || price;
                          const savings = price - lowestPrice;
                          
                          return (
                            <div
                              key={quote.id}
                              className={`p-4 rounded-lg border-2 ${
                                isLowest 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Store className="h-5 w-5 text-gray-500" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{quote.supplier_name}</span>
                                      {isLowest && (
                                        <Badge className="bg-green-500 text-[10px]">
                                          <TrendingDown className="h-3 w-3 mr-0.5" />
                                          Best Price
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      {quote.supplier_rating && (
                                        <span className="flex items-center gap-0.5">
                                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                          {quote.supplier_rating.toFixed(1)}
                                        </span>
                                      )}
                                      {quote.supplier_location && (
                                        <span className="flex items-center gap-0.5">
                                          <MapPin className="h-3 w-3" />
                                          {quote.supplier_location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className={`text-xl font-bold ${isLowest ? 'text-green-600' : 'text-gray-800'}`}>
                                    KES {price.toLocaleString()}
                                  </div>
                                  {!isLowest && savings > 0 && (
                                    <span className="text-xs text-red-500">
                                      +KES {savings.toLocaleString()} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {quote.supplier_notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">
                                  "{quote.supplier_notes}"
                                </p>
                              )}
                              
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  className={isLowest ? 'bg-green-600 hover:bg-green-700' : ''}
                                  onClick={() => handleAcceptQuote(quote)}
                                  disabled={processingId === quote.id}
                                >
                                  {processingId === quote.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Accept Quote
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleRejectQuote(quote)}
                                  disabled={processingId === quote.id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRequest(quote);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            {selectedRequest?.status === 'quoted' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleAcceptQuote(selectedRequest);
                  setShowDetailsDialog(false);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept This Quote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingQuoteRequests;

