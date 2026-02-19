/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 CART PRICE COMPARISON ALL - Compare prices for ALL items in cart                ║
 * ║                                                                                      ║
 * ║   CREATED: February 4, 2026                                                          ║
 * ║   UPDATED: February 19, 2026 - Added supplier selection for both builders            ║
 * ║   FEATURES:                                                                          ║
 * ║   1. Shows price comparisons for ALL cart items in one view                          ║
 * ║   2. Groups by supplier to find best overall deal                                    ║
 * ║   3. Highlights total potential savings                                              ║
 * ║   4. ALLOWS BOTH Private Clients & Professional Builders to SELECT suppliers         ║
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
  ChevronUp,
  CheckCircle2,
  ArrowRight
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
  const { items, updateCartItem } = useCart();
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // Track selected suppliers for each product
  const [selectedSuppliers, setSelectedSuppliers] = useState<Map<string, SupplierPrice>>(new Map());

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
    
    // Supabase config
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    // Create fallback comparisons without supplier alternatives
    const createFallbackComparisons = () => items.map(item => ({
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
    }));
    
    try {
      // Use native fetch with 8-second timeout for suppliers
      const suppliersController = new AbortController();
      const suppliersTimeout = setTimeout(() => suppliersController.abort(), 8000);
      
      let suppliersData: any[] = [];
      try {
        const suppliersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name,rating&limit=100`,
          {
            headers: { 'apikey': apiKey },
            signal: suppliersController.signal,
            cache: 'no-store'
          }
        );
        clearTimeout(suppliersTimeout);
        
        if (suppliersResponse.ok) {
          suppliersData = await suppliersResponse.json();
          console.log('📦 Suppliers loaded:', suppliersData.length);
        }
      } catch (e) {
        clearTimeout(suppliersTimeout);
        console.warn('⚠️ Suppliers fetch failed/timed out, continuing without supplier names');
      }

      const suppliersMap = new Map<string, any>();
      suppliersData.forEach((s: any) => {
        suppliersMap.set(s.id, s);
        if (s.user_id) suppliersMap.set(s.user_id, s);
      });

      // 2. Get all product IDs from cart
      const productIds = items.map(item => item.id);
      console.log('🛒 Cart product IDs:', productIds);

      // 3. Fetch all prices for these products with 8-second timeout
      const pricesController = new AbortController();
      const pricesTimeout = setTimeout(() => pricesController.abort(), 8000);
      
      let pricesData: any[] = [];
      try {
        // Build IN query for product IDs
        const productIdsParam = productIds.map(id => `"${id}"`).join(',');
        const pricesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/supplier_product_prices?select=product_id,supplier_id,price,in_stock&product_id=in.(${productIdsParam})`,
          {
            headers: { 'apikey': apiKey },
            signal: pricesController.signal,
            cache: 'no-store'
          }
        );
        clearTimeout(pricesTimeout);
        
        if (pricesResponse.ok) {
          pricesData = await pricesResponse.json();
          console.log('💰 Prices loaded:', pricesData.length);
        }
      } catch (e) {
        clearTimeout(pricesTimeout);
        console.warn('⚠️ Prices fetch failed/timed out, showing cart without comparisons');
        setComparisons(createFallbackComparisons());
        setLoading(false);
        return;
      }

      // 4. Build comparison data for each cart item
      const comparisonResults: ProductComparison[] = items.map(item => {
        // Find all prices for this product
        const productPrices = pricesData.filter((p: any) => p.product_id === item.id);
        
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

      console.log('✅ Comparison results:', comparisonResults);
      setComparisons(comparisonResults);
    } catch (error: any) {
      console.error('❌ Error fetching prices:', error);
      
      toast({
        title: '📡 Connection Issue',
        description: 'Showing your cart items without price comparisons.',
      });
      
      // Still show items even if comparison fails
      setComparisons(createFallbackComparisons());
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

  // Handle supplier selection for an item
  const handleSelectSupplier = (productId: string, supplier: SupplierPrice) => {
    setSelectedSuppliers(prev => {
      const next = new Map(prev);
      // If already selected, deselect
      if (next.get(productId)?.supplier_id === supplier.supplier_id) {
        next.delete(productId);
      } else {
        next.set(productId, supplier);
      }
      return next;
    });
    
    // Update the comparison to show new selection
    setComparisons(prev => prev.map(comp => {
      if (comp.product_id === productId) {
        return {
          ...comp,
          current_price: supplier.price,
          current_supplier: supplier.supplier_name
        };
      }
      return comp;
    }));
  };

  // Apply all selected suppliers to cart
  const handleApplySelections = () => {
    if (selectedSuppliers.size === 0) {
      toast({
        title: '⚠️ No Suppliers Selected',
        description: 'Click on a supplier to select them for your items.',
      });
      return;
    }

    let updatedCount = 0;
    
    selectedSuppliers.forEach((supplier, productId) => {
      const item = items.find(i => i.id === productId);
      if (item && updateCartItem) {
        updateCartItem(productId, {
          unit_price: supplier.price,
          supplier_name: supplier.supplier_name,
          supplier_id: supplier.supplier_id
        });
        updatedCount++;
      }
    });

    toast({
      title: '✅ Cart Updated!',
      description: `${updatedCount} item${updatedCount !== 1 ? 's' : ''} updated with selected suppliers.`,
    });

    // Clear selections and close
    setSelectedSuppliers(new Map());
    onClose();
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

                        {/* Expanded Alternatives - SELECTABLE */}
                        {isExpanded && item.alternatives.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase">
                              Click to select a supplier ({item.alternatives.length} available)
                            </p>
                            {item.alternatives
                              .sort((a, b) => a.price - b.price)
                              .map((alt, idx) => {
                                const isBest = alt.price === item.best_price && alt.price < item.current_price;
                                const originalPrice = items.find(i => i.id === item.product_id)?.unit_price || item.current_price;
                                const savings = (originalPrice - alt.price) * item.quantity;
                                const isSelected = selectedSuppliers.get(item.product_id)?.supplier_id === alt.supplier_id;
                                
                                return (
                                  <div 
                                    key={alt.supplier_id}
                                    onClick={() => alt.in_stock && handleSelectSupplier(item.product_id, alt)}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
                                        : isBest 
                                          ? 'bg-green-100 border border-green-200 hover:border-green-400' 
                                          : 'bg-gray-50 border border-transparent hover:border-gray-300'
                                    } ${!alt.in_stock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isSelected ? (
                                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                      ) : isBest ? (
                                        <Trophy className="h-4 w-4 text-amber-500" />
                                      ) : (
                                        <Store className="h-4 w-4 text-gray-400" />
                                      )}
                                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : ''}`}>
                                        {alt.supplier_name}
                                      </span>
                                      {isBest && !isSelected && (
                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                          Best Price
                                        </Badge>
                                      )}
                                      {!alt.in_stock && (
                                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                                          Out of Stock
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className={`font-semibold ${isSelected ? 'text-blue-700' : isBest ? 'text-green-700' : ''}`}>
                                          KES {alt.price.toLocaleString()}/unit
                                        </p>
                                        {savings > 0 && (
                                          <p className="text-xs text-green-600">
                                            Save KES {savings.toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                      {!isSelected && alt.in_stock && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectSupplier(item.product_id, alt);
                                          }}
                                        >
                                          Select
                                        </Button>
                                      )}
                                      {isSelected && (
                                        <Badge className="bg-blue-600 text-white">
                                          Selected
                                        </Badge>
                                      )}
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
              
              {/* Show selected suppliers count */}
              {selectedSuppliers.size > 0 && (
                <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <span className="text-blue-700 font-medium">
                    {selectedSuppliers.size} supplier{selectedSuppliers.size !== 1 ? 's' : ''} selected
                  </span>
                  <span className="text-blue-600 text-sm">
                    New Total: KES {comparisons.reduce((sum, c) => sum + (c.current_price * c.quantity), 0).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="flex gap-2">
                {selectedSuppliers.size > 0 ? (
                  <>
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleApplySelections} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Apply Selected Suppliers
                    </Button>
                  </>
                ) : (
                  <Button onClick={onClose} className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
