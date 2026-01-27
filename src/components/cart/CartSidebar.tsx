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

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart, CartItem } from '@/contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, Package, X, FileText, CreditCard, Scale, Store, Users, Truck, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CartPriceComparison } from './CartPriceComparison';
import { MultiSupplierQuoteDialog } from './MultiSupplierQuoteDialog';
import { DeliveryPromptDialog } from '@/components/builders/DeliveryPromptDialog';
import { MonitoringServicePrompt } from '@/components/builders/MonitoringServicePrompt';

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
  const [comparisonItem, setComparisonItem] = useState<CartItem | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showMultiSupplierQuote, setShowMultiSupplierQuote] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [showMonitoringPrompt, setShowMonitoringPrompt] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);

  // Check user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserRole(roleData?.role || null);
      }
    };
    checkUserRole();
  }, [isCartOpen]);

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

      // Fetch all suppliers for mapping
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name');
      
      let suppliersMap: Record<string, string> = {};
      let defaultSupplierId: string | null = null;
      
      if (suppliersData && suppliersData.length > 0) {
        suppliersData.forEach(s => {
          suppliersMap[s.id] = s.company_name;
          if (s.user_id) suppliersMap[s.user_id] = s.company_name;
        });
        // Use first supplier as default for admin catalog items
        defaultSupplierId = suppliersData[0].user_id || suppliersData[0].id;
      }

      // Group items by supplier (normalize admin-catalog and general to use default supplier)
      const itemsBySupplier: Record<string, CartItem[]> = {};
      for (const item of items) {
        let supplierId = item.supplier_id;
        
        // Handle admin-catalog and general items - they need a real supplier UUID
        if (!supplierId || supplierId === 'general' || supplierId === 'admin-catalog') {
          supplierId = defaultSupplierId || user.id;
        }
        
        if (!itemsBySupplier[supplierId]) {
          itemsBySupplier[supplierId] = [];
        }
        itemsBySupplier[supplierId].push(item);
      }

      // Create separate quote requests for each supplier
      let successCount = 0;
      const supplierNames: string[] = [];

      for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
        const supplierTotal = supplierItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Get supplier name
        const supplierName = suppliersMap[supplierId] || supplierItems[0]?.supplier_name || 'General Catalog';
        
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            po_number: poNumber,
            buyer_id: user.id,
            supplier_id: supplierId,
            total_amount: supplierTotal,
            delivery_address: 'To be provided',
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            project_name: `Quote Request - ${supplierName}`,
            status: 'pending',
            items: supplierItems.map(item => ({
              material_id: item.id,
              material_name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              supplier_name: item.supplier_name
            })),
            created_at: new Date().toISOString()
          });

        if (!orderError) {
          successCount++;
          if (!supplierNames.includes(supplierName)) {
            supplierNames.push(supplierName);
          }
        } else {
          console.error('Quote request error for supplier:', supplierId, orderError);
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ Quote Requested!',
          description: `Quote sent to ${supplierNames.length} supplier(s): ${supplierNames.join(', ')}. They will respond shortly.`,
        });
        clearCart();
        setIsCartOpen(false);
      } else {
        throw new Error('Failed to create any quote requests');
      }
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
    if (isProcessing) return;
    setIsProcessing(true);
    
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

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Get a valid supplier UUID (not 'admin-catalog' or 'general')
      let supplierId = items[0]?.supplier_id;
      
      // If supplier_id is not a valid UUID, fetch a real supplier
      if (!supplierId || supplierId === 'admin-catalog' || supplierId === 'general') {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, user_id')
          .limit(1)
          .single();
        
        supplierId = suppliers?.user_id || suppliers?.id || user.id;
      }
      
      // Create purchase order
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: supplierId,
          total_amount: getTotalPrice(),
          delivery_address: 'To be provided',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          project_name: 'Direct Purchase - ' + new Date().toLocaleDateString(),
          status: 'confirmed',
          items: items.map(item => ({
            material_id: item.id,
            material_name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price
          })),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Success! Store order info for delivery/monitoring prompts
      const orderTotal = getTotalPrice();
      const orderItemCount = getTotalItems();
      
      setLastOrderId(orderData.id);
      setLastOrderTotal(orderTotal);
      
      clearCart();
      setIsCartOpen(false);
      
      toast({
        title: '🎉 Order Placed Successfully!',
        description: `Your order #${poNumber} for ${orderItemCount} items (KES ${orderTotal.toLocaleString()}) has been confirmed.`,
        duration: 4000,
      });

      // Show delivery prompt for private clients
      if (userRole === 'private_client') {
        setTimeout(() => {
          setShowDeliveryPrompt(true);
        }, 500);
      }

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
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
                {/* Group items by supplier for display */}
                {(() => {
                  const groupedItems: Record<string, CartItem[]> = {};
                  items.forEach(item => {
                    const supplierKey = item.supplier_name || 'UjenziXform Catalog';
                    if (!groupedItems[supplierKey]) {
                      groupedItems[supplierKey] = [];
                    }
                    groupedItems[supplierKey].push(item);
                  });
                  
                  return Object.entries(groupedItems).map(([supplierName, supplierItems]) => (
                    <div key={supplierName} className="space-y-2">
                      {/* Supplier Header */}
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                        <Store className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">{supplierName}</span>
                        <Badge className="bg-blue-600 ml-auto">{supplierItems.length} item(s)</Badge>
                      </div>
                      
                      {/* Items from this supplier */}
                      {supplierItems.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-3 space-y-3 ml-2 border-l-2 border-blue-200">
                          <div className="flex gap-3">
                            {/* Item Image */}
                            <div className="w-14 h-14 bg-white rounded-md overflow-hidden flex-shrink-0 border">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                                {item.name}
                              </h4>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                                {item.category}
                              </Badge>
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
                    
                          {/* Compare Prices Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                            onClick={() => {
                              setComparisonItem(item);
                              setShowComparison(true);
                            }}
                          >
                            <Scale className="h-3 w-3 mr-1.5" />
                            Compare Prices
                          </Button>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
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

              {/* Action Buttons - Different for Professional Builders */}
              {userRole === 'professional_builder' ? (
                <>
                  {/* Professional Builder: Multi-Supplier Quote Flow */}
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-14 flex items-center justify-center gap-3"
                    onClick={() => setShowMultiSupplierQuote(true)}
                  >
                    <Users className="h-5 w-5" />
                    <div className="text-left">
                      <span className="text-sm font-semibold">Request Quotes from Multiple Suppliers</span>
                      <p className="text-[10px] opacity-80">Compare prices & get the best deal</p>
                    </div>
                  </Button>
                  <p className="text-[10px] text-center text-blue-600 font-medium">
                    🏗️ Professional Builder: Send your list to multiple suppliers and compare their quotes!
                  </p>
                </>
              ) : (
                <>
                  {/* Private Client / Other: Standard Flow */}
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
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <div className="h-4 w-4 mb-0.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mb-0.5" />
                          <span className="text-xs">Buy Now</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-gray-500">
                    💡 Tip: Request a quote for bulk orders to get the best prices from suppliers
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {/* Price Comparison Modal */}
        <CartPriceComparison
          isOpen={showComparison}
          onClose={() => {
            setShowComparison(false);
            setComparisonItem(null);
          }}
          cartItem={comparisonItem}
        />

        {/* Multi-Supplier Quote Dialog (for Professional Builders) */}
        <MultiSupplierQuoteDialog
          isOpen={showMultiSupplierQuote}
          onClose={() => setShowMultiSupplierQuote(false)}
          cartItems={items}
          onQuotesSent={() => {
            clearCart();
            setIsCartOpen(false);
          }}
        />
      </SheetContent>

      {/* Delivery Prompt Dialog (for Private Clients after purchase) */}
      {lastOrderId && (
        <DeliveryPromptDialog
          isOpen={showDeliveryPrompt}
          onClose={() => {
            setShowDeliveryPrompt(false);
            // Show monitoring prompt after delivery decision
            setTimeout(() => {
              setShowMonitoringPrompt(true);
            }, 300);
          }}
          purchaseOrderId={lastOrderId}
          orderTotal={lastOrderTotal}
          onDeliveryRequested={() => {
            setShowDeliveryPrompt(false);
            toast({
              title: '🚚 Delivery Requested!',
              description: 'A delivery provider will be assigned to your order soon.',
            });
            // Show monitoring prompt after delivery request
            setTimeout(() => {
              setShowMonitoringPrompt(true);
            }, 500);
          }}
        />
      )}

      {/* Monitoring Service Prompt (after delivery decision) */}
      <MonitoringServicePrompt
        isOpen={showMonitoringPrompt}
        onClose={() => {
          setShowMonitoringPrompt(false);
          setLastOrderId(null);
          setLastOrderTotal(0);
        }}
        orderTotal={lastOrderTotal}
      />
    </Sheet>
  );
};

