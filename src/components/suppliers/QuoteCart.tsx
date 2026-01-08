import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Trash2, 
  Send, 
  Loader2, 
  Plus, 
  Minus, 
  ShoppingCart,
  MapPin,
  Calendar,
  Package
} from 'lucide-react';

export interface QuoteCartItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  supplier_id?: string;
  supplier_name?: string;
}

interface QuoteCartProps {
  items: QuoteCartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  isOpen,
  onOpenChange
}: QuoteCartProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const handleSubmitQuoteRequest = async () => {
    if (items.length === 0) {
      toast({
        title: '📋 No Items Selected',
        description: 'Please add items to your quote cart first.',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: '📍 Delivery Address Required',
        description: 'Please enter a delivery address for your quote request.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: '🔐 Sign In Required',
          description: 'Please sign in to submit quote requests.',
          variant: 'destructive',
        });
        return;
      }

      // Group items by supplier
      const itemsBySupplier = items.reduce((acc, item) => {
        const supplierId = item.supplier_id || 'general';
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, QuoteCartItem[]>);

      // Create a quote request for each supplier
      const supplierIds = Object.keys(itemsBySupplier);
      let successCount = 0;

      for (const supplierId of supplierIds) {
        const supplierItems = itemsBySupplier[supplierId];
        const supplierTotal = supplierItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        
        // Get a valid supplier ID (use first available if 'general')
        let validSupplierId = supplierId;
        if (supplierId === 'general') {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id')
            .limit(1)
            .single();
          validSupplierId = suppliers?.id || supplierId;
        }

        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        const { error } = await supabase
          .from('purchase_orders')
          .insert({
            po_number: poNumber,
            buyer_id: user.id,
            supplier_id: validSupplierId,
            total_amount: supplierTotal,
            delivery_address: deliveryAddress,
            delivery_date: deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending',
            project_name: projectName || 'Quote Request',
            special_instructions: notes,
            items: supplierItems.map(item => ({
              material_id: item.id,
              material_name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price
            }))
          });

        if (!error) {
          successCount++;
        } else {
          console.error('Quote request error for supplier:', supplierId, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: '📋 Quote Requests Sent!',
          description: `${successCount} quote request(s) sent to ${successCount} supplier(s). They will respond with pricing.`,
        });
        
        // Clear the cart and form
        onClearCart();
        setDeliveryAddress('');
        setDeliveryDate('');
        setProjectName('');
        setNotes('');
        onOpenChange(false);
      } else {
        throw new Error('Failed to create any quote requests');
      }

    } catch (error) {
      console.error('Failed to submit quote requests:', error);
      toast({
        title: 'Failed to Submit',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Quote Cart
            {items.length > 0 && (
              <Badge className="bg-blue-600">{totalItems} items</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your selected items and submit a quote request
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Your Quote Cart is Empty</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add items by clicking "Add to Quote" on products you're interested in.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Browse Materials
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          <p className="text-sm font-semibold text-blue-600">
                            KES {item.unit_price.toLocaleString()}/{item.unit}
                          </p>
                          {item.supplier_name && (
                            <p className="text-xs text-gray-500">{item.supplier_name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs font-medium">
                            KES {(item.unit_price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Quote Details Form */}
              <div className="space-y-4 pb-4">
                <div>
                  <Label htmlFor="projectName">Project Name (Optional)</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., Residential Building Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryAddress" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery Address *
                  </Label>
                  <Input
                    id="deliveryAddress"
                    placeholder="Enter delivery location"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryDate" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Preferred Delivery Date
                  </Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-3">
              {/* Summary */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Total:</span>
                <span className="font-bold text-lg">KES {estimatedTotal.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                * Final pricing will be provided by suppliers in their quotes
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClearCart}
                >
                  Clear All
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmitQuoteRequest}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Request Quotes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Floating Quote Cart Button
export function QuoteCartButton({ 
  itemCount, 
  onClick 
}: { 
  itemCount: number; 
  onClick: () => void;
}) {
  if (itemCount === 0) return null;

  return (
    <Button
      onClick={onClick}
      className="fixed bottom-24 right-6 h-14 px-5 bg-blue-600 hover:bg-blue-700 shadow-lg rounded-full z-40 animate-bounce"
    >
      <FileText className="h-5 w-5 mr-2" />
      Quote Cart
      <Badge className="ml-2 bg-white text-blue-600">{itemCount}</Badge>
    </Button>
  );
}

