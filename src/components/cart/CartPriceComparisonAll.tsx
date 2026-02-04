/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 CART PRICE COMPARISON ALL - Compare prices for ALL items in cart                ║
 * ║                                                                                      ║
 * ║   CREATED: February 4, 2026                                                          ║
 * ║   FEATURES:                                                                          ║
 * ║   1. Shows price comparisons for ALL cart items in one view                          ║
 * ║   2. Groups by supplier to find best overall deal                                    ║
 * ║   3. Highlights total potential savings                                              ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Scale, 
  Store, 
  Star,
  ShoppingCart, 
  Trophy,
  TrendingDown,
  Loader2,
  Package,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SupplierPrice {
  supplier_id: string;
  supplier_name: string;
  price: number;
  in_stock: boolean;
}

interface ProductComparison {
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  current_price: number;
  current_supplier: string;
  alternatives: SupplierPrice[];
  best_price: number;
  best_supplier: string;
  savings: number;
}

interface CartPriceComparisonAllProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartPriceComparisonAll: React.FC<CartPriceComparisonAllProps> = ({
  isOpen,
  onClose
}) => {
  const { items } = useCart();
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch prices for all cart items when modal opens
  useEffect(() => {
    if (isOpen && items.length > 0) {
      fetchAllPrices();
    } else if (isOpen && items.length === 0) {
      setLoading(false);
      setComparisons([]);
    }
  }, [isOpen]);

  const fetchAllPrices = async () => {
    setLoading(true);
    console.log('🔍 Fetching price comparisons for', items.length, 'items');
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Price comparison timed out after 10s');
      setLoading(false);
      // Show items without comparisons if timeout
      setComparisons(items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        quantity: item.quantity,
        current_price: item.unit_price,
        current_supplier: item.supplier_name || 'Current Supplier',
        alternatives: [],
        best_price: item.unit_price,
        best_supplier: item.supplier_name || 'Current',
        savings: 0
      })));
    }, 10000); // 10 second timeout
    
    try {
      // 1. Fetch all suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name, rating')
        .limit(100);

      if (suppliersError) {
        console.error('❌ Error fetching suppliers:', suppliersError);
      }
      console.log('📦 Suppliers loaded:', suppliersData?.length || 0);

      const suppliersMap = new Map<string, any>();
      (suppliersData || []).forEach((s: any) => {
        suppliersMap.set(s.id, s);
        if (s.user_id) suppliersMap.set(s.user_id, s);
      });

      // 2. Get all product IDs from cart
      const productIds = items.map(item => item.id);
      console.log('🛒 Cart product IDs:', productIds);

      // 3. Fetch all prices for these products
      const { data: pricesData, error: pricesError } = await supabase
        .from('supplier_product_prices')
        .select('product_id, supplier_id, price, in_stock')
        .in('product_id', productIds);

      if (pricesError) {
        console.error('❌ Error fetching prices:', pricesError);
      }
      console.log('💰 Prices loaded:', pricesData?.length || 0);

      // 4. Build comparison data for each cart item
      const comparisonResults: ProductComparison[] = items.map(item => {
        // Find all prices for this product
        const productPrices = (pricesData || []).filter((p: any) => p.product_id === item.id);
        
        // Map to supplier names
        const alternatives: SupplierPrice[] = productPrices.map((p: any) => {
          const supplier = suppliersMap.get(p.supplier_id);
          return {
            supplier_id: p.supplier_id,
            supplier_name: supplier?.company_name || 'Unknown Supplier',
            price: p.price,
            in_stock: p.in_stock ?? true
          };
        });

        // Find best price
        const allPrices = [item.unit_price, ...alternatives.map(a => a.price)].filter(p => p > 0);
        const bestPrice = allPrices.length > 0 ? Math.min(...allPrices) : item.unit_price;
        const bestAlt = alternatives.find(a => a.price === bestPrice);
        
        return {
          product_id: item.id,
          product_name: item.name,
          category: item.category,
          quantity: item.quantity,
          current_price: item.unit_price,
          current_supplier: item.supplier_name || 'Current Supplier',
          alternatives,
          best_price: bestPrice,
          best_supplier: bestAlt?.supplier_name || item.supplier_name || 'Current',
          savings: Math.max(0, (item.unit_price - bestPrice) * item.quantity)
        };
      });

      clearTimeout(timeoutId);
      console.log('✅ Comparison results:', comparisonResults);
      setComparisons(comparisonResults);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ Error fetching prices:', error);
      
      // Check if it's an offline/CORS error
      const isOffline = error?.offline || error?.message?.includes('offline') || error?.message?.includes('CORS');
      
      toast({
        title: isOffline ? '📡 Connection Issue' : 'Error',
        description: isOffline 
          ? 'Unable to fetch prices. Showing your cart items.' 
          : 'Failed to fetch price comparisons',
        variant: isOffline ? 'default' : 'destructive'
      });
      
      // Still show items even if comparison fails
      setComparisons(items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        quantity: item.quantity,
        current_price: item.unit_price,
        current_supplier: item.supplier_name || 'Current Supplier',
        alternatives: [],
        best_price: item.unit_price,
        best_supplier: item.supplier_name || 'Current',
        savings: 0
      })));
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Calculate totals
  const currentTotal = comparisons.reduce((sum, c) => sum + (c.current_price * c.quantity), 0);
  const bestTotal = comparisons.reduce((sum, c) => sum + (c.best_price * c.quantity), 0);
  const totalSavings = currentTotal - bestTotal;
  const itemsWithSavings = comparisons.filter(c => c.savings > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-600" />
            Compare Prices for All Items
          </DialogTitle>
          <DialogDescription>
            Find the best prices for your {items.length} cart item{items.length !== 1 ? 's' : ''} across all suppliers
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500">Comparing prices across suppliers...</p>
          </div>
        ) : (
          <>
            {/* Savings Summary */}
            {totalSavings > 0 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Potential Savings Found!</p>
                        <p className="text-sm text-green-600">
                          {itemsWithSavings} item{itemsWithSavings !== 1 ? 's' : ''} with better prices available
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        KES {totalSavings.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600">total savings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Comparison Table */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {comparisons.map((item) => {
                  const isExpanded = expandedItems.has(item.product_id);
                  const hasBetterPrice = item.savings > 0;
                  
                  return (
                    <Card 
                      key={item.product_id} 
                      className={`overflow-hidden ${hasBetterPrice ? 'border-green-200 bg-green-50/30' : ''}`}
                    >
                      <CardContent className="p-3">
                        {/* Product Header */}
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpand(item.product_id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                              {hasBetterPrice && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  Save KES {item.savings.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{item.category}</span>
                              <span>•</span>
                              <span>Qty: {item.quantity}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">
                                KES {(item.current_price * item.quantity).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                @ KES {item.current_price.toLocaleString()}/unit
                              </p>
                            </div>
                            {item.alternatives.length > 0 && (
                              isExpanded ? 
                                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Alternatives */}
                        {isExpanded && item.alternatives.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase">
                              Alternative Prices ({item.alternatives.length} suppliers)
                            </p>
                            {item.alternatives
                              .sort((a, b) => a.price - b.price)
                              .map((alt, idx) => {
                                const isBest = alt.price === item.best_price && alt.price < item.current_price;
                                const savings = (item.current_price - alt.price) * item.quantity;
                                
                                return (
                                  <div 
                                    key={alt.supplier_id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                      isBest ? 'bg-green-100 border border-green-200' : 'bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isBest && <Trophy className="h-4 w-4 text-amber-500" />}
                                      <Store className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium">{alt.supplier_name}</span>
                                      {!alt.in_stock && (
                                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                                          Out of Stock
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className={`font-semibold ${isBest ? 'text-green-700' : ''}`}>
                                          KES {alt.price.toLocaleString()}/unit
                                        </p>
                                        {savings > 0 && (
                                          <p className="text-xs text-green-600">
                                            Save KES {savings.toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* No alternatives message */}
                        {isExpanded && item.alternatives.length === 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-500 text-center py-2">
                              No alternative prices found for this item
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Summary Footer */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Cart Total:</span>
                <span className="font-semibold">KES {currentTotal.toLocaleString()}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Best Possible Total:</span>
                  <span className="font-bold text-lg">KES {bestTotal.toLocaleString()}</span>
                </div>
              )}
              <Button onClick={onClose} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
