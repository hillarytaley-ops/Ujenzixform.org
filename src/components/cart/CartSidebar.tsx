/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - CARTSIDEBAR.TSX - DO NOT MODIFY WITHOUT APPROVAL              ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Slide-out shopping cart sidebar                                                ║
 * ║   2. Quantity controls for each item                                                ║
 * ║   3. Request Quote and Buy Now buttons                                              ║
 * ║   4. Cart summary with totals                                                       ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, Package, X, FileText, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CartSidebar: React.FC = () => {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    getTotalPrice, 
    getTotalItems,
    isCartOpen,
    setIsCartOpen 
  } = useCart();
  const { toast } = useToast();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleRequestQuote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to request a quote for your cart items.',
          variant: 'destructive'
        });
        window.location.href = '/builder-signin?redirect=/supplier-marketplace';
        return;
      }

      // Create purchase order with cart items
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          builder_id: user.id,
          project_name: 'Cart Order - ' + new Date().toLocaleDateString(),
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add all cart items to order
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        material_name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        notes: `Price: KES ${item.unit_price.toLocaleString()} per ${item.unit}`
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: '✅ Quote Requested!',
        description: `Your quote request for ${getTotalItems()} items has been submitted. Suppliers will respond shortly.`,
      });

      clearCart();
      setIsCartOpen(false);
    } catch (error) {
      console.error('Error requesting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quote request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleBuyNow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to purchase your cart items.',
          variant: 'destructive'
        });
        window.location.href = '/builder-signin?redirect=/supplier-marketplace';
        return;
      }

      // Create purchase order
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          builder_id: user.id,
          project_name: 'Direct Purchase - ' + new Date().toLocaleDateString(),
          status: 'confirmed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add all cart items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        material_name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        notes: `Price: KES ${item.unit_price.toLocaleString()} per ${item.unit}`
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: '🎉 Order Placed!',
        description: `Your order for ${getTotalItems()} items (KES ${getTotalPrice().toLocaleString()}) has been placed successfully!`,
      });

      clearCart();
      setIsCartOpen(false);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="space-y-2 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Shopping Cart
              {getTotalItems() > 0 && (
                <Badge className="bg-green-600">{getTotalItems()}</Badge>
              )}
            </SheetTitle>
          </div>
          {items.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCart}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-fit"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-4">
              Browse our materials and add items to your cart
            </p>
            <Button onClick={() => setIsCartOpen(false)} className="bg-green-600 hover:bg-green-700">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="flex gap-3">
                      {/* Item Image */}
                      <div className="w-16 h-16 bg-white rounded-md overflow-hidden flex-shrink-0 border">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-gray-500">{item.supplier_name}</span>
                        </div>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          KES {item.unit_price.toLocaleString()}/{item.unit}
                        </p>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between bg-white rounded-md p-2">
                      <span className="text-xs text-gray-600">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-center text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-right">
                        KES {(item.unit_price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="my-2" />

            {/* Cart Summary */}
            <div className="space-y-3 pt-2">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items ({getTotalItems()})</span>
                  <span className="font-medium">KES {getTotalPrice().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className="text-green-600 font-medium">To be quoted</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Estimated Total</span>
                  <span className="text-green-600">KES {getTotalPrice().toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 h-12 flex flex-col items-center justify-center"
                  onClick={handleRequestQuote}
                >
                  <FileText className="h-4 w-4 mb-0.5" />
                  <span className="text-xs">Request Quote</span>
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 h-12 flex flex-col items-center justify-center"
                  onClick={handleBuyNow}
                >
                  <CreditCard className="h-4 w-4 mb-0.5" />
                  <span className="text-xs">Buy Now</span>
                </Button>
              </div>
              
              <p className="text-[10px] text-center text-gray-500">
                💡 Tip: Request a quote for bulk orders to get the best prices from suppliers
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

