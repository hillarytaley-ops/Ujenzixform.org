/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 CART PRICE COMPARISON ALL - Compare prices for ALL items in cart                ║
 * ║                                                                                      ║
 * ║   CREATED: February 4, 2026                                                          ║
 * ║   UPDATED: February 21, 2026 - Full table view with suppliers as columns             ║
 * ║   FEATURES:                                                                          ║
 * ║   1. Shows ALL suppliers as columns in a table                                       ║
 * ║   2. Shows ALL cart items as rows                                                    ║
 * ║   3. Total per supplier at the bottom                                                ║
 * ║   4. Click to select supplier for each item                                          ║
 * ║   5. Highlights best prices in green                                                 ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
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
  CheckCircle2,
  ArrowRight,
  Building2,
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
  current_price: number;
  current_supplier: string;
  current_supplier_id?: string;
  alternatives: SupplierPrice[];
  best_price: number;
  best_supplier: string;
  savings: number;
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
  // Track selected suppliers for each product: productId -> supplierId
  const [selectedSuppliers, setSelectedSuppliers] = useState<Map<string, string>>(new Map());

  // Fetch prices for all cart items when modal opens
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
    console.log('🔍 Fetching price comparisons for', items.length, 'items');
    
    // Supabase config
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    // Create fallback comparisons without supplier alternatives
    const createFallbackComparisons = () => items.map(item => ({
      product_id: item.id,
      product_name: item.name,
      category: item.category,
      unit: item.unit || 'unit',
      quantity: item.quantity,
      current_price: item.unit_price,
      current_supplier: item.supplier_name || 'Current Supplier',
      current_supplier_id: item.supplier_id,
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

      // 4. Collect all unique suppliers from the prices data
      const uniqueSupplierIds = new Set<string>();
      pricesData.forEach((p: any) => uniqueSupplierIds.add(p.supplier_id));
      
      // Also add current suppliers from cart items
      items.forEach(item => {
        if (item.supplier_id) uniqueSupplierIds.add(item.supplier_id);
      });

      const supplierColumns: SupplierColumn[] = Array.from(uniqueSupplierIds).map(id => {
        const supplier = suppliersMap.get(id);
        return {
          id,
          name: supplier?.company_name || 'Unknown Supplier',
          rating: supplier?.rating
        };
      });

      setAllSuppliers(supplierColumns);

      // 5. Build comparison data for each cart item
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
          unit: item.unit || 'unit',
          quantity: item.quantity,
          current_price: item.unit_price,
          current_supplier: item.supplier_name || 'Current Supplier',
          current_supplier_id: item.supplier_id,
          alternatives,
          best_price: bestPrice,
          best_supplier: bestAlt?.supplier_name || item.supplier_name || 'Current',
          savings: Math.max(0, (item.unit_price - bestPrice) * item.quantity)
        };
      });

      console.log('✅ Comparison results:', comparisonResults);
      setComparisons(comparisonResults);
      
      // Initialize selected suppliers with current selections
      const initialSelections = new Map<string, string>();
      items.forEach(item => {
        if (item.supplier_id) {
          initialSelections.set(item.id, item.supplier_id);
        }
      });
      setSelectedSuppliers(initialSelections);
      
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

  // Handle supplier selection for an item
  const handleSelectSupplier = (productId: string, supplierId: string, price: number, supplierName: string) => {
    setSelectedSuppliers(prev => {
      const next = new Map(prev);
      next.set(productId, supplierId);
      return next;
    });
    
    // Update the comparison to show new selection
    setComparisons(prev => prev.map(comp => {
      if (comp.product_id === productId) {
        return {
          ...comp,
          current_price: price,
          current_supplier: supplierName,
          current_supplier_id: supplierId
        };
      }
      return comp;
    }));
  };

  // Get price for a product from a specific supplier
  const getPriceForSupplier = (comparison: ProductComparison, supplierId: string): SupplierPrice | null => {
    return comparison.alternatives.find(a => a.supplier_id === supplierId) || null;
  };

  // Calculate totals per supplier
  const supplierTotals = useMemo(() => {
    const totals = new Map<string, { total: number; itemCount: number; hasAllItems: boolean }>();
    
    allSuppliers.forEach(supplier => {
      let total = 0;
      let itemCount = 0;
      
      comparisons.forEach(comp => {
        const price = getPriceForSupplier(comp, supplier.id);
        if (price && price.in_stock) {
          total += price.price * comp.quantity;
          itemCount++;
        }
      });
      
      totals.set(supplier.id, {
        total,
        itemCount,
        hasAllItems: itemCount === comparisons.length
      });
    });
    
    return totals;
  }, [allSuppliers, comparisons]);

  // Find cheapest supplier with all items
  const cheapestSupplier = useMemo(() => {
    let cheapest: { id: string; total: number } | null = null;
    
    supplierTotals.forEach((data, supplierId) => {
      if (data.hasAllItems && data.total > 0) {
        if (!cheapest || data.total < cheapest.total) {
          cheapest = { id: supplierId, total: data.total };
        }
      }
    });
    
    // If no supplier has all items, find the one with most items and lowest total
    if (!cheapest) {
      let maxItems = 0;
      supplierTotals.forEach((data, supplierId) => {
        if (data.itemCount > maxItems || (data.itemCount === maxItems && (!cheapest || data.total < cheapest.total))) {
          maxItems = data.itemCount;
          cheapest = { id: supplierId, total: data.total };
        }
      });
    }
    
    return cheapest;
  }, [supplierTotals]);

  // Apply all selected suppliers to cart
  const handleApplySelections = () => {
    let updatedCount = 0;
    
    selectedSuppliers.forEach((supplierId, productId) => {
      const item = items.find(i => i.id === productId);
      const comparison = comparisons.find(c => c.product_id === productId);
      const supplierPrice = comparison?.alternatives.find(a => a.supplier_id === supplierId);
      
      if (item && updateCartItem && supplierPrice) {
        updateCartItem(productId, {
          unit_price: supplierPrice.price,
          supplier_name: supplierPrice.supplier_name,
          supplier_id: supplierPrice.supplier_id
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      toast({
        title: '✅ Cart Updated!',
        description: `${updatedCount} item${updatedCount !== 1 ? 's' : ''} updated with selected suppliers.`,
      });
    }

    onClose();
  };

  // Select all items from one supplier
  const handleSelectAllFromSupplier = (supplierId: string) => {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const newSelections = new Map(selectedSuppliers);
    let count = 0;
    
    comparisons.forEach(comp => {
      const price = getPriceForSupplier(comp, supplierId);
      if (price && price.in_stock) {
        newSelections.set(comp.product_id, supplierId);
        count++;
      }
    });
    
    setSelectedSuppliers(newSelections);
    
    // Update comparisons with new prices
    setComparisons(prev => prev.map(comp => {
      const price = getPriceForSupplier(comp, supplierId);
      if (price && price.in_stock) {
        return {
          ...comp,
          current_price: price.price,
          current_supplier: supplier.name,
          current_supplier_id: supplierId
        };
      }
      return comp;
    }));
    
    toast({
      title: `✅ Selected ${supplier.name}`,
      description: `${count} item${count !== 1 ? 's' : ''} selected from this supplier.`,
    });
  };

  // Calculate current total based on selections
  const currentTotal = comparisons.reduce((sum, c) => sum + (c.current_price * c.quantity), 0);

  // Find the lowest price for each material
  const getLowestPriceForProduct = (comparison: ProductComparison): number => {
    const prices = comparison.alternatives.filter(a => a.in_stock).map(a => a.price);
    if (prices.length === 0) return comparison.current_price;
    return Math.min(...prices);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Compare Prices Across Suppliers
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-0.5">
                  {items.length} item{items.length !== 1 ? 's' : ''} · {allSuppliers.length} supplier{allSuppliers.length !== 1 ? 's' : ''} · Click on a price to select that supplier
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
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500 text-lg">Comparing prices across suppliers...</p>
            <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Your cart is empty</p>
            <p className="text-gray-400 text-sm mt-1">Add items to compare prices</p>
          </div>
        ) : (
          <>
            {/* Best Deal Banner */}
            {cheapestSupplier && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 text-white p-2.5 rounded-full">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 text-lg">
                        Best Deal: {allSuppliers.find(s => s.id === cheapestSupplier.id)?.name}
                      </p>
                      <p className="text-sm text-green-700">
                        Total: <span className="font-bold">KES {cheapestSupplier.total.toLocaleString()}</span>
                        {supplierTotals.get(cheapestSupplier.id)?.hasAllItems && (
                          <span className="ml-2 text-green-600">· Has all {comparisons.length} items</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 shadow-lg"
                    onClick={() => handleSelectAllFromSupplier(cheapestSupplier.id)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Select All from This Supplier
                  </Button>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    <th className="text-left p-4 font-semibold text-gray-700 border-b-2 border-r border-gray-200 min-w-[250px] bg-gray-100 sticky left-0 z-20">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        Material / Qty
                      </div>
                    </th>
                    {allSuppliers.map((supplier) => {
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      const totals = supplierTotals.get(supplier.id);
                      return (
                        <th 
                          key={supplier.id} 
                          className={`text-center p-3 font-semibold border-b-2 border-r min-w-[160px] ${
                            isCheapest 
                              ? 'bg-green-100 border-green-300 text-green-800' 
                              : 'bg-gray-100 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <Building2 className={`h-4 w-4 ${isCheapest ? 'text-green-600' : 'text-gray-500'}`} />
                              <span className="truncate max-w-[100px] text-sm">{supplier.name}</span>
                            </div>
                            {isCheapest && (
                              <Badge className="bg-green-500 text-[10px] px-1.5">BEST DEAL</Badge>
                            )}
                            {supplier.rating && (
                              <div className="flex items-center gap-1 text-yellow-600 text-xs">
                                <Star className="h-3 w-3 fill-current" />
                                {supplier.rating.toFixed(1)}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`text-xs h-6 px-2 ${isCheapest ? 'text-green-700 hover:bg-green-200' : 'text-blue-600 hover:bg-blue-100'}`}
                              onClick={() => handleSelectAllFromSupplier(supplier.id)}
                            >
                              Select All
                            </Button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((comp, rowIdx) => {
                    const lowestPrice = getLowestPriceForProduct(comp);
                    
                    return (
                      <tr 
                        key={comp.product_id} 
                        className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/50 transition-colors`}
                      >
                        {/* Material Name - Sticky */}
                        <td className={`p-3 border-b border-r border-gray-200 sticky left-0 z-10 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm line-clamp-2">{comp.product_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{comp.category}</span>
                                <span>Qty: <strong>{comp.quantity}</strong></span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Price cells for each supplier */}
                        {allSuppliers.map((supplier) => {
                          const price = getPriceForSupplier(comp, supplier.id);
                          const isCheapestSupplier = cheapestSupplier?.id === supplier.id;
                          const isLowestPrice = price && price.price === lowestPrice;
                          const isSelected = selectedSuppliers.get(comp.product_id) === supplier.id;
                          
                          return (
                            <td 
                              key={`${comp.product_id}-${supplier.id}`}
                              className={`p-2 border-b border-r text-center transition-all ${
                                isSelected 
                                  ? 'bg-blue-100 border-blue-300' 
                                  : isCheapestSupplier 
                                    ? 'bg-green-50/50 border-green-200' 
                                    : 'border-gray-200'
                              }`}
                            >
                              {price ? (
                                <button
                                  onClick={() => price.in_stock && handleSelectSupplier(comp.product_id, supplier.id, price.price, supplier.name)}
                                  disabled={!price.in_stock}
                                  className={`w-full p-2 rounded-lg transition-all ${
                                    isSelected 
                                      ? 'bg-blue-500 text-white shadow-md' 
                                      : isLowestPrice
                                        ? 'bg-green-100 hover:bg-green-200 border border-green-300'
                                        : 'bg-white hover:bg-gray-100 border border-gray-200'
                                  } ${!price.in_stock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    {isSelected && (
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    )}
                                    {isLowestPrice && !isSelected && (
                                      <TrendingDown className="h-4 w-4 text-green-600" />
                                    )}
                                    <span className={`font-bold text-sm ${
                                      isSelected 
                                        ? 'text-white' 
                                        : isLowestPrice 
                                          ? 'text-green-700' 
                                          : 'text-gray-800'
                                    }`}>
                                      KES {price.price.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                      per {comp.unit}
                                    </span>
                                    {!price.in_stock && (
                                      <Badge variant="outline" className="text-[9px] text-red-500 border-red-200">
                                        Out of Stock
                                      </Badge>
                                    )}
                                    <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                                      Total: KES {(price.price * comp.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                </button>
                              ) : (
                                <div className="text-gray-400 text-sm p-2">
                                  <span className="block text-lg">—</span>
                                  <span className="text-xs">Not available</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                
                {/* Totals Row */}
                <tfoot className="sticky bottom-0">
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className="p-4 border-t-2 border-r border-gray-600 sticky left-0 bg-gray-800 z-20">
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-gray-300" />
                        <span className="text-lg">SUPPLIER TOTALS</span>
                      </div>
                      <p className="text-xs text-gray-400 font-normal mt-1">
                        ({comparisons.length} items)
                      </p>
                    </td>
                    {allSuppliers.map((supplier) => {
                      const totals = supplierTotals.get(supplier.id);
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      
                      return (
                        <td 
                          key={`total-${supplier.id}`}
                          className={`p-3 text-center border-t-2 border-r ${
                            isCheapest ? 'bg-green-700 border-green-500' : 'border-gray-600'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg ${isCheapest ? 'text-green-100' : 'text-white'}`}>
                              KES {totals?.total.toLocaleString() || '0'}
                            </span>
                            <span className="text-xs text-gray-300">
                              {totals?.itemCount || 0}/{comparisons.length} items
                            </span>
                            {isCheapest && totals?.hasAllItems && (
                              <Badge className="bg-green-500 text-white text-[10px]">
                                <Check className="h-3 w-3 mr-1" />
                                LOWEST
                              </Badge>
                            )}
                            {!totals?.hasAllItems && totals && totals.itemCount > 0 && (
                              <span className="text-[10px] text-yellow-300">
                                Missing {comparisons.length - totals.itemCount} item{comparisons.length - totals.itemCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Your Selection Total:</span>{' '}
                    <span className="text-lg font-bold text-gray-900">KES {currentTotal.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-green-500" />
                    Green prices = lowest price for that item
                    <span className="mx-1">·</span>
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    Blue = your selection
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplySelections}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Apply Selections
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
