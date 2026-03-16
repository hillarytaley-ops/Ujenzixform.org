import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryPromptDialog } from './DeliveryPromptDialog';
import { 
  CheckCircle, 
  Loader2, 
  Star, 
  MapPin, 
  Package, 
  DollarSign,
  Clock,
  Award,
  TrendingDown,
  MessageSquare,
  Phone,
  Truck
} from 'lucide-react';

interface QuoteComparisonProps {
  orderId: string;
  builderId: string;
}

interface Quote {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_location: string;
  supplier_rating: number;
  total_price: number;
  delivery_days: number;
  notes: string;
  status: string;
  created_at: string;
  items: Array<{
    material_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    subtotal: number;
  }>;
}

export const QuoteComparison: React.FC<QuoteComparisonProps> = ({ orderId, builderId }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [acceptedPurchaseOrder, setAcceptedPurchaseOrder] = useState<any>(null);
  const { toast } = useToast();

  // Handle when user chooses DELIVERY (called from DeliveryPromptDialog after builder submitted form WITH address)
  // CRITICAL: We do NOT create a delivery_request here. The dialog already created/updated it with the builder's
  // real address. Creating one here would use PO.delivery_address which is often "To be provided" and would
  // show "Delivery address missing" on the provider dashboard. Under NO circumstance should the provider
  // see a request without the address the builder entered on the form.
  const handleDeliveryRequested = async () => {
    if (!acceptedPurchaseOrder) return;
    
    try {
      let pickupAddress = acceptedPurchaseOrder.supplier_address || 'Supplier location';
      if (acceptedPurchaseOrder.supplier_id) {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('address, company_name')
          .eq('id', acceptedPurchaseOrder.supplier_id)
          .maybeSingle();
        if (supplierData) {
          pickupAddress = supplierData.address || `${supplierData.company_name} - Pickup Location`;
        }
      }

      // Delivery request was already created/updated by DeliveryPromptDialog with the builder's address.
      // Fetch it (may need a short delay so the dialog's POST has committed).
      let deliveryRequest = null;
      const { data: existingRequest } = await supabase
        .from('delivery_requests')
        .select('id, status, delivery_address')
        .eq('purchase_order_id', acceptedPurchaseOrder.id)
        .in('status', ['pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRequest) {
        deliveryRequest = existingRequest;
      } else {
        // Dialog just created it; allow a moment for commit then refetch
        await new Promise(r => setTimeout(r, 600));
        const { data: refetched } = await supabase
          .from('delivery_requests')
          .select('id, status, delivery_address')
          .eq('purchase_order_id', acceptedPurchaseOrder.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (refetched) deliveryRequest = refetched;
      }

      if (deliveryRequest) {
        try {
          await supabase.functions.invoke('notify-delivery-providers', {
            body: {
              request_type: 'quote_accepted',
              request_id: deliveryRequest.id,
              builder_id: builderId,
              pickup_address: pickupAddress,
              delivery_address: deliveryRequest.delivery_address ?? acceptedPurchaseOrder.delivery_address,
              material_details: acceptedPurchaseOrder.items?.map((item: any) => ({
                material_type: item.material_name,
                quantity: item.quantity,
                unit: item.unit || 'units'
              })),
              priority_level: 'normal',
              po_number: acceptedPurchaseOrder.po_number
            }
          });
          console.log('Delivery providers notified successfully');
        } catch (notifyError) {
          console.error('Error notifying delivery providers:', notifyError);
        }
      }

      toast({
        title: '🚚 Delivery Requested!',
        description: 'QR codes will be generated. Nearby delivery providers have been notified.',
      });
      
    } catch (error: any) {
      console.error('Error requesting delivery:', error);
      toast({
        title: 'Delivery request failed',
        description: error.message || 'Please try again from the Delivery page.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [orderId]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          supplier:suppliers(company_name, address, rating),
          quote_items(*)
        `)
        .eq('order_id', orderId)
        .order('total_price', { ascending: true });

      if (error) throw error;

      // Transform data
      const transformedQuotes = (data || []).map((quote: any) => ({
        id: quote.id,
        supplier_id: quote.supplier_id,
        supplier_name: quote.supplier?.company_name || 'Unknown Supplier',
        supplier_location: quote.supplier?.address || 'Kenya',
        supplier_rating: quote.supplier?.rating || 0,
        total_price: quote.total_price || 0,
        delivery_days: quote.delivery_days || 7,
        notes: quote.notes || '',
        status: quote.status || 'pending',
        created_at: quote.created_at,
        items: quote.quote_items || []
      }));

      setQuotes(transformedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error loading quotes',
        description: 'Could not load supplier quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptQuote = async (quoteId: string, supplierName: string, quote: Quote) => {
    setAccepting(quoteId);
    try {
      // Update quote status to accepted
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId);

      if (quoteError) throw quoteError;

      // Update order status to 'confirmed'
      // Note: delivery_required defaults to true, will be updated if user chooses pickup
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'confirmed',
          accepted_quote_id: quoteId,
          supplier_id: quote.supplier_id,
          total_amount: quote.total_price,
          delivery_required: true // Default to delivery, user can change to pickup
        })
        .eq('id', orderId)
        .select('*')
        .single();

      if (orderError) throw orderError;

      toast({
        title: '✅ Quote Accepted!',
        description: 'Please choose delivery or pickup option.',
      });

      // Prepare purchase order data for delivery/pickup choice dialog
      const deliveryAddress = orderData?.delivery_address || '';
      const deliveryDate = orderData?.delivery_date || new Date().toISOString().split('T')[0];
      
      const purchaseOrderForDelivery = {
        id: orderId,
        po_number: orderData?.po_number || `PO-${orderId.slice(0, 8)}`,
        supplier_id: quote.supplier_id,
        supplier_name: supplierName,
        supplier_address: quote.supplier_location,
        total_amount: quote.total_price,
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate,
        items: quote.items.map(item => ({
          material_name: item.material_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price
        })),
        project_name: orderData?.project_name
      };

      setAcceptedPurchaseOrder(purchaseOrderForDelivery);
      
      // Show delivery confirmation dialog
      setTimeout(() => {
        setShowDeliveryPrompt(true);
      }, 500);

      // Refresh quotes
      fetchQuotes();
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast({
        title: 'Error accepting quote',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-4">Loading quotes from suppliers...</p>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Waiting for Quotes
          </CardTitle>
          <CardDescription>
            Suppliers are reviewing your order and will send quotes soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>No quotes yet.</strong> Suppliers typically respond within 2-24 hours. 
              You'll be notified when quotes arrive.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Find best price and fastest delivery
  const bestPrice = Math.min(...quotes.map(q => q.total_price));
  const fastestDelivery = Math.min(...quotes.map(q => q.delivery_days));

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            Compare {quotes.length} Quote{quotes.length > 1 ? 's' : ''}
          </CardTitle>
          <CardDescription>
            Review and compare quotes from suppliers. Best deals highlighted.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {quotes.map((quote, index) => {
          const isBestPrice = quote.total_price === bestPrice;
          const isFastestDelivery = quote.delivery_days === fastestDelivery;
          const isAccepted = quote.status === 'accepted';

          return (
            <Card 
              key={quote.id} 
              className={`relative ${
                isAccepted ? 'border-green-500 border-2' : 
                isBestPrice ? 'border-orange-500 border-2' : 
                ''
              }`}
            >
              {/* Best Price Badge */}
              {isBestPrice && !isAccepted && (
                <Badge className="absolute -top-3 left-4 bg-orange-500 text-white">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Best Price
                </Badge>
              )}

              {/* Fastest Delivery Badge */}
              {isFastestDelivery && !isAccepted && (
                <Badge className="absolute -top-3 right-4 bg-blue-500 text-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Fastest
                </Badge>
              )}

              {/* Accepted Badge */}
              {isAccepted && (
                <Badge className="absolute -top-3 left-4 bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Accepted
                </Badge>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {quote.supplier_name}
                      {quote.supplier_rating > 0 && (
                        <div className="flex items-center gap-1 text-sm font-normal">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-gray-600">{quote.supplier_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3" />
                      {quote.supplier_location}
                    </div>
                  </div>
                  <Badge variant={isAccepted ? "default" : "outline"} className="text-xs">
                    Quote #{index + 1}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Price</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        KES {quote.total_price.toLocaleString()}
                      </div>
                      {isBestPrice && (
                        <div className="text-xs text-orange-600 font-semibold">
                          Lowest price! 💰
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Delivery Time</span>
                    <span className="font-semibold">
                      {quote.delivery_days} day{quote.delivery_days > 1 ? 's' : ''}
                      {isFastestDelivery && ' ⚡'}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {quote.items.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600">Items:</Label>
                    <div className="mt-2 space-y-1">
                      {quote.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm bg-white rounded p-2">
                          <span className="text-gray-700">
                            <Package className="h-3 w-3 inline mr-1" />
                            {item.material_name} ({item.quantity} {item.unit})
                          </span>
                          <span className="font-semibold text-gray-900">
                            KES {item.subtotal?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supplier Notes */}
                {quote.notes && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-800">
                      <strong>Supplier Notes:</strong> {quote.notes}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!isAccepted ? (
                    <>
                      <Button
                        onClick={() => acceptQuote(quote.id, quote.supplier_name, quote)}
                        disabled={accepting !== null}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {accepting === quote.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Quote
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          toast({
                            title: 'Contact Supplier',
                            description: `Contact ${quote.supplier_name} for more details`,
                          });
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </>
                  ) : (
                    <div className="w-full space-y-2">
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-sm w-full justify-center py-2">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Quote Accepted - QR codes generated
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setAcceptedPurchaseOrder({
                            id: orderId,
                            po_number: `PO-${orderId.slice(0, 8)}`,
                            supplier_id: quote.supplier_id,
                            supplier_name: quote.supplier_name,
                            supplier_address: quote.supplier_location,
                            total_amount: quote.total_price,
                            delivery_address: '',
                            delivery_date: '',
                            items: quote.items.map(item => ({
                              material_name: item.material_name,
                              quantity: item.quantity,
                              unit: item.unit,
                              unit_price: item.unit_price
                            })),
                          });
                          setShowDeliveryPrompt(true);
                        }}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Request Delivery
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-2">
        <CardHeader>
          <CardTitle className="text-lg">Quote Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                KES {bestPrice.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 mt-1">Best Price</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {fastestDelivery} days
              </div>
              <div className="text-xs text-gray-600 mt-1">Fastest Delivery</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {quotes.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Quotes</div>
            </div>
          </div>

          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <Award className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              <strong>💡 Smart Tip:</strong> Consider both price AND delivery time. 
              Sometimes paying a bit more for faster delivery is worth it for urgent projects!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Delivery/Pickup Choice Dialog - Shows after quote acceptance */}
      <DeliveryPromptDialog
        isOpen={showDeliveryPrompt}
        onOpenChange={setShowDeliveryPrompt}
        purchaseOrder={acceptedPurchaseOrder}
        onDeliveryRequested={handleDeliveryRequested}
        onDeclined={() => {
          // User chose pickup - no delivery, no QR codes
          toast({
            title: '📦 Pickup Order Confirmed!',
            description: 'Collect your materials directly from the supplier. No QR code needed.',
          });
        }}
      />
    </div>
  );
};


