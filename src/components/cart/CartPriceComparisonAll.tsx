/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 CART PRICE COMPARISON - SIMPLE & CLEAN VERSION                                  ║
 * ║                                                                                      ║
 * ║   UPDATED: February 21, 2026 - Simplified for better UX                              ║
 * ║   - Clean table with clear prices                                                    ║
 * ║   - Easy to read and compare                                                         ║
 * ║   - One-click supplier selection                                                     ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, 
  Star,
  ShoppingCart, 
  Trophy,
  Loader2,
  Check,
  X
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
  unit: string;
  quantity: number;
  alternatives: SupplierPrice[];
}

interface SupplierColumn {
  id: string;
  name: string;
  rating?: number;
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
  const [allSuppliers, setAllSuppliers] = useState<SupplierColumn[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      fetchAllPrices();
    } else if (isOpen && items.length === 0) {
      setLoading(false);
      setComparisons([]);
      setAllSuppliers([]);
    }
  }, [isOpen]);

  const fetchAllPrices = async () => {
    setLoading(true);
    
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      // Fetch suppliers
      let suppliersData: any[] = [];
      try {
        const suppliersResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name,rating&limit=100`,
          { headers: { 'apikey': apiKey }, cache: 'no-store' }
        );
        if (suppliersResponse.ok) {
          suppliersData = await suppliersResponse.json();
        }
      } catch (e) {
        console.warn('Suppliers fetch failed');
      }

      const suppliersMap = new Map<string, any>();
      suppliersData.forEach((s: any) => {
        suppliersMap.set(s.id, s);
        if (s.user_id) suppliersMap.set(s.user_id, s);
      });

      // Fetch prices
      const productIds = items.map(item => item.id);
      let pricesData: any[] = [];
      
      try {
        const productIdsParam = productIds.map(id => `"${id}"`).join(',');
        const pricesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/supplier_product_prices?select=product_id,supplier_id,price,in_stock&product_id=in.(${productIdsParam})`,
          { headers: { 'apikey': apiKey }, cache: 'no-store' }
        );
        if (pricesResponse.ok) {
          pricesData = await pricesResponse.json();
        }
      } catch (e) {
        console.warn('Prices fetch failed');
      }

      // Collect unique suppliers
      const uniqueSupplierIds = new Set<string>();
      pricesData.forEach((p: any) => uniqueSupplierIds.add(p.supplier_id));
      items.forEach(item => {
        if (item.supplier_id) uniqueSupplierIds.add(item.supplier_id);
      });

      const supplierColumns: SupplierColumn[] = Array.from(uniqueSupplierIds).map(id => {
        const supplier = suppliersMap.get(id);
        return {
          id,
          name: supplier?.company_name || 'Supplier',
          rating: supplier?.rating
        };
      });

      setAllSuppliers(supplierColumns);

      // Build comparisons
      const comparisonResults: ProductComparison[] = items.map(item => {
        const productPrices = pricesData.filter((p: any) => p.product_id === item.id);
        
        const alternatives: SupplierPrice[] = productPrices.map((p: any) => {
          const supplier = suppliersMap.get(p.supplier_id);
          return {
            supplier_id: p.supplier_id,
            supplier_name: supplier?.company_name || 'Supplier',
            price: p.price,
            in_stock: p.in_stock ?? true
          };
        });

        return {
          product_id: item.id,
          product_name: item.name,
          category: item.category,
          unit: item.unit || 'unit',
          quantity: item.quantity,
          alternatives
        };
      });

      setComparisons(comparisonResults);
      
    } catch (error: any) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get price for a product from a supplier
  const getPrice = (comp: ProductComparison, supplierId: string): number | null => {
    const alt = comp.alternatives.find(a => a.supplier_id === supplierId);
    return alt?.in_stock ? alt.price : null;
  };

  // Calculate total for a supplier
  const getSupplierTotal = (supplierId: string): { total: number; itemCount: number } => {
    let total = 0;
    let itemCount = 0;
    
    comparisons.forEach(comp => {
      const price = getPrice(comp, supplierId);
      if (price !== null) {
        total += price * comp.quantity;
        itemCount++;
      }
    });
    
    return { total, itemCount };
  };

  // Find cheapest supplier
  const cheapestSupplier = useMemo(() => {
    let cheapest: { id: string; total: number; name: string } | null = null;
    
    allSuppliers.forEach(supplier => {
      const { total, itemCount } = getSupplierTotal(supplier.id);
      if (itemCount === comparisons.length && total > 0) {
        if (!cheapest || total < cheapest.total) {
          cheapest = { id: supplier.id, total, name: supplier.name };
        }
      }
    });
    
    return cheapest;
  }, [allSuppliers, comparisons]);

  // Apply selected supplier to cart
  const handleSelectSupplier = (supplierId: string) => {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    let updatedCount = 0;
    
    comparisons.forEach(comp => {
      const alt = comp.alternatives.find(a => a.supplier_id === supplierId && a.in_stock);
      if (alt && updateCartItem) {
        updateCartItem(comp.product_id, {
          unit_price: alt.price,
          supplier_name: alt.supplier_name,
          supplier_id: alt.supplier_id
        });
        updatedCount++;
      }
    });

    toast({
      title: '✅ Cart Updated!',
      description: `${updatedCount} item${updatedCount !== 1 ? 's' : ''} now from ${supplier.name}`,
    });

    onClose();
  };

  // Find lowest price for a material
  const getLowestPrice = (comp: ProductComparison): number => {
    const prices = comp.alternatives.filter(a => a.in_stock).map(a => a.price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6" />
              <div>
                <DialogTitle className="text-white text-lg font-bold">
                  Compare Prices
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {items.length} item{items.length !== 1 ? 's' : ''} · {allSuppliers.length} supplier{allSuppliers.length !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-gray-500">Loading prices...</p>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <>
            {/* Simple Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                {/* Header Row - Suppliers */}
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600 border-b min-w-[200px]">
                      Material
                    </th>
                    {allSuppliers.map((supplier) => {
                      const { total, itemCount } = getSupplierTotal(supplier.id);
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      const hasAllItems = itemCount === comparisons.length;
                      
                      return (
                        <th 
                          key={supplier.id} 
                          className={`text-center p-3 border-b min-w-[140px] ${
                            isCheapest ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-gray-800 text-sm">
                              {supplier.name}
                            </span>
                            {supplier.rating && (
                              <div className="flex items-center gap-1 text-yellow-500 text-xs">
                                <Star className="h-3 w-3 fill-current" />
                                {supplier.rating.toFixed(1)}
                              </div>
                            )}
                            {isCheapest && (
                              <Badge className="bg-green-500 text-[10px]">
                                <Trophy className="h-3 w-3 mr-1" />
                                BEST
                              </Badge>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                
                {/* Body - Materials */}
                <tbody>
                  {comparisons.map((comp, idx) => {
                    const lowestPrice = getLowestPrice(comp);
                    
                    return (
                      <tr key={comp.product_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {/* Material Name */}
                        <td className="p-3 border-b">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{comp.product_name}</p>
                            <p className="text-xs text-gray-500">Qty: {comp.quantity}</p>
                          </div>
                        </td>
                        
                        {/* Prices */}
                        {allSuppliers.map((supplier) => {
                          const price = getPrice(comp, supplier.id);
                          const isCheapest = cheapestSupplier?.id === supplier.id;
                          const isLowest = price !== null && price === lowestPrice;
                          
                          return (
                            <td 
                              key={`${comp.product_id}-${supplier.id}`}
                              className={`p-3 border-b text-center ${isCheapest ? 'bg-green-50' : ''}`}
                            >
                              {price !== null ? (
                                <div className={`font-semibold ${isLowest ? 'text-green-600' : 'text-gray-800'}`}>
                                  KES {price.toLocaleString()}
                                  {isLowest && (
                                    <span className="block text-[10px] text-green-500 font-normal">
                                      Lowest
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                
                {/* Footer - Totals */}
                <tfoot className="sticky bottom-0 bg-gray-800 text-white">
                  <tr>
                    <td className="p-3 font-bold">
                      TOTAL
                    </td>
                    {allSuppliers.map((supplier) => {
                      const { total, itemCount } = getSupplierTotal(supplier.id);
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      const hasAllItems = itemCount === comparisons.length;
                      
                      return (
                        <td 
                          key={`total-${supplier.id}`}
                          className={`p-3 text-center ${isCheapest ? 'bg-green-700' : ''}`}
                        >
                          <div className="font-bold text-lg">
                            KES {total.toLocaleString()}
                          </div>
                          {!hasAllItems && (
                            <div className="text-xs text-gray-300">
                              {itemCount}/{comparisons.length} items
                            </div>
                          )}
                          <Button
                            size="sm"
                            className={`mt-2 ${
                              isCheapest 
                                ? 'bg-white text-green-700 hover:bg-green-50' 
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                            onClick={() => handleSelectSupplier(supplier.id)}
                            disabled={itemCount === 0}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Select
                          </Button>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-white flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Click <strong>Select</strong> to buy all items from that supplier
              </p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
