/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 CART PRICE COMPARISON - Compare prices for items in cart                        ║
 * ║                                                                                      ║
 * ║   CREATED: January 22, 2026                                                          ║
 * ║   FEATURES:                                                                          ║
 * ║   1. Shows alternative prices from different suppliers for cart items                ║
 * ║   2. Highlights potential savings                                                    ║
 * ║   3. One-click switch to cheaper option                                              ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { catalogMaterialIdFromCartLineId } from '@/utils/cartLineId';
import { supplierLocationLine } from '@/utils/supplierLocationLine';
import { 
  Scale, 
  Store, 
  Star,
  ShoppingCart, 
  X,
  Trophy,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Loader2,
  Package,
  MapPin
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  supplier_name?: string;
  supplier_id?: string;
  supplier_location?: string;
  supplier_pick_confirmed?: boolean;
}

interface AlternativePrice {
  product_id: string;
  product_name: string;
  supplier_id: string;
  supplier_name: string;
  price: number;
  in_stock: boolean;
  rating?: number;
  image_url?: string;
  locationLabel?: string;
}

interface CartPriceComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  cartItem: CartItem | null;
}

export const CartPriceComparison: React.FC<CartPriceComparisonProps> = ({
  isOpen,
  onClose,
  cartItem
}) => {
  const { removeFromCart, addToCart } = useCart();
  const { toast } = useToast();
  const [alternatives, setAlternatives] = useState<AlternativePrice[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch alternative prices when modal opens
  useEffect(() => {
    if (isOpen && cartItem) {
      fetchAlternativePrices();
    }
  }, [isOpen, cartItem]);

  const fetchAlternativePrices = async () => {
    if (!cartItem) return;
    
    setLoading(true);
    try {
      // 1. Fetch all suppliers first (to map IDs to names)
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name, rating, location, address, physical_address, county');

      if (suppliersError) {
        console.error('Error fetching suppliers:', suppliersError);
      }

      // Create TWO maps: one by id, one by user_id
      const suppliersByIdMap = new Map((suppliersData || []).map((s: any) => [s.id, s]));
      const suppliersByUserIdMap = new Map((suppliersData || []).map((s: any) => [s.user_id, s]));
      console.log('📦 Suppliers loaded:', suppliersData?.length, 'entries');

      // 2. Catalog UUID (cart line id may be `uuid::v:idx:n` for marketplace variants)
      const catalogProductId = catalogMaterialIdFromCartLineId(cartItem.id);
      const productName = cartItem.name;
      
      console.log('🔍 Looking for prices for product:', catalogProductId, productName);

      const alternativesWithPrices: AlternativePrice[] = [];

      // 3. Fetch supplier prices for THIS EXACT PRODUCT from supplier_product_prices table
      const { data: supplierPricesData, error: pricesError } = await supabase
        .from('supplier_product_prices')
        .select('product_id, price, in_stock, supplier_id')
        .eq('product_id', catalogProductId)
        .gt('price', 0);

      if (pricesError) {
        console.error('Error fetching supplier prices:', pricesError);
      }

      console.log('📦 Found supplier prices for this product:', supplierPricesData?.length || 0);

      // Get the product image from admin_material_images
      const { data: adminMaterial } = await supabase
        .from('admin_material_images')
        .select('id, name, image_url')
        .eq('id', catalogProductId)
        .maybeSingle();

      // Add supplier prices for this exact product - ONLY from registered suppliers
      if (supplierPricesData) {
        for (const sp of supplierPricesData) {
          // Skip if it's the same supplier as current selection
          if (sp.supplier_id === cartItem.supplier_id) continue;

          // Get supplier info - MUST be a registered supplier
          const supplier = suppliersByIdMap.get(sp.supplier_id) || suppliersByUserIdMap.get(sp.supplier_id);
          
          // ONLY include if supplier is registered (exists in suppliers table)
          if (!supplier || !supplier.company_name) {
            console.log('⏭️ Skipping unregistered supplier:', sp.supplier_id);
            continue;
          }
          
          alternativesWithPrices.push({
            product_id: sp.product_id,
            product_name: adminMaterial?.name || productName,
            supplier_id: sp.supplier_id,
            supplier_name: supplier.company_name,
            price: sp.price,
            in_stock: sp.in_stock ?? true,
            rating: supplier.rating,
            image_url: adminMaterial?.image_url || cartItem.image_url,
            locationLabel: supplierLocationLine(supplier),
          });
        }
      }

      // 4. Also check materials table for exact name match (for supplier's own products)
      // This handles cases where suppliers upload their own products with the same name
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id, name, category, unit, unit_price, image_url, in_stock, supplier_id, approval_status')
        .eq('approval_status', 'approved')
        .eq('name', productName)  // EXACT name match
        .gt('unit_price', 0);

      if (materialsError) {
        console.error('Error fetching materials:', materialsError);
      }

      console.log('📦 Found materials with exact name match:', materialsData?.length || 0);

      // Add materials with exact name match - ONLY from registered suppliers
      if (materialsData) {
        for (const material of materialsData) {
          // Skip if it's the same item or same supplier
          if (material.id === cartItem.id) continue;
          if (material.supplier_id === cartItem.supplier_id) continue;

          // Get supplier info - MUST be a registered supplier
          const supplier = material.supplier_id 
            ? (suppliersByIdMap.get(material.supplier_id) || suppliersByUserIdMap.get(material.supplier_id))
            : null;

          // ONLY include if supplier is registered (exists in suppliers table)
          if (!supplier || !supplier.company_name) {
            console.log('⏭️ Skipping material from unregistered supplier:', material.supplier_id);
            continue;
          }

          // Check if we already have this supplier in alternatives
          const alreadyExists = alternativesWithPrices.some(
            a => a.supplier_id === material.supplier_id
          );
          if (alreadyExists) continue;

          alternativesWithPrices.push({
            product_id: material.id,
            product_name: material.name,
            supplier_id: material.supplier_id,
            supplier_name: supplier.company_name,
            price: material.unit_price,
            in_stock: material.in_stock ?? true,
            rating: supplier.rating,
            image_url: material.image_url || cartItem.image_url,
            locationLabel: supplierLocationLine(supplier),
          });
        }
      }

      // Sort by price (cheapest first)
      const validAlternatives = alternativesWithPrices
        .filter(a => a.price > 0)
        .sort((a, b) => a.price - b.price);

      console.log('✅ Found alternatives for exact product:', validAlternatives.length, validAlternatives);
      setAlternatives(validAlternatives);
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load price comparisons',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToAlternative = (alt: AlternativePrice) => {
    if (!cartItem) return;

    // Remove current item and add the alternative
    removeFromCart(cartItem.id);
    addToCart({
      id: alt.product_id,
      name: alt.product_name,
      category: cartItem.category,
      unit: cartItem.unit,
      unit_price: alt.price,
      image_url: alt.image_url,
      supplier_name: alt.supplier_name,
      supplier_id: alt.supplier_id,
      supplier_location: alt.locationLabel,
      supplier_pick_confirmed: true,
    }, cartItem.quantity);

    const savings = cartItem.unit_price - alt.price;
    toast({
      title: '✅ Switched to Better Price!',
      description: `Saved KES ${(savings * cartItem.quantity).toLocaleString()} on ${alt.product_name}`,
    });
    onClose();
  };

  if (!cartItem) return null;

  const cheapestAlternative = alternatives[0];
  const potentialSavings = cheapestAlternative 
    ? (cartItem.unit_price - cheapestAlternative.price) * cartItem.quantity
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogDescription className="sr-only">
          Compare prices from different suppliers for your cart items
        </DialogDescription>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              <DialogTitle className="text-white text-lg font-bold">
                Compare Prices
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current Item */}
        <div className="p-4 bg-blue-50 border-b">
          <p className="text-xs text-blue-600 font-medium mb-2">YOUR CURRENT SELECTION</p>
          <div className="flex items-center gap-3">
            {cartItem.image_url ? (
              <img 
                src={cartItem.image_url} 
                alt={cartItem.name}
                className="w-12 h-12 rounded object-contain bg-white border"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-white border flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-sm line-clamp-1">{cartItem.name}</p>
              <p className="text-xs text-gray-500">{cartItem.supplier_name}</p>
              {cartItem.supplier_location ? (
                <p className="text-[10px] text-gray-500 flex items-start gap-0.5 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-400" aria-hidden />
                  <span className="line-clamp-2">{cartItem.supplier_location}</span>
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-600">KES {cartItem.unit_price.toLocaleString()}</p>
              <p className="text-xs text-gray-500">x{cartItem.quantity} = KES {(cartItem.unit_price * cartItem.quantity).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Savings Banner */}
        {potentialSavings > 0 && (
          <div className="bg-green-50 border-b border-green-200 p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-bold text-green-800 text-sm">Save up to KES {potentialSavings.toLocaleString()}!</p>
                <p className="text-xs text-green-600">Cheaper alternatives available below</p>
              </div>
            </div>
          </div>
        )}

        {/* Alternatives List */}
        <ScrollArea className="max-h-[300px]">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Finding best prices...</span>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="text-center py-8">
                <TrendingDown className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No alternative prices found</p>
                <p className="text-xs text-gray-400 mt-1">You already have a great deal!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">ALTERNATIVE OPTIONS ({alternatives.length})</p>
                {alternatives.slice(0, 10).map((alt, index) => {
                  const isCheaper = alt.price < cartItem.unit_price;
                  const savings = cartItem.unit_price - alt.price;
                  const totalSavings = savings * cartItem.quantity;
                  
                  return (
                    <div 
                      key={`${alt.product_id}-${alt.supplier_id}-${index}`}
                      className={`p-3 rounded-lg border ${
                        isCheaper ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {alt.image_url ? (
                          <img 
                            src={alt.image_url} 
                            alt={alt.product_name}
                            className="w-10 h-10 rounded object-contain bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                            <Store className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{alt.product_name}</p>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="text-xs text-gray-500">{alt.supplier_name}</p>
                              {alt.rating != null && !Number.isNaN(Number(alt.rating)) && (
                                <div className="flex items-center gap-0.5 text-yellow-500">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span className="text-[10px]">{Number(alt.rating).toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                            {alt.locationLabel && (
                              <div className="flex items-start gap-0.5 text-[10px] text-gray-500">
                                <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-400" aria-hidden />
                                <span className="line-clamp-2 leading-tight">{alt.locationLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {isCheaper && (
                              <Badge className="bg-green-500 text-[10px]">
                                -{Math.round((savings / cartItem.unit_price) * 100)}%
                              </Badge>
                            )}
                            {!isCheaper && alt.price > cartItem.unit_price && (
                              <Badge variant="outline" className="text-orange-500 border-orange-300 text-[10px]">
                                +{Math.round(((alt.price - cartItem.unit_price) / cartItem.unit_price) * 100)}%
                              </Badge>
                            )}
                            <span className={`font-bold ${isCheaper ? 'text-green-600' : 'text-gray-700'}`}>
                              KES {alt.price.toLocaleString()}
                            </span>
                          </div>
                          {isCheaper ? (
                            <p className="text-[10px] text-green-600">
                              Save KES {totalSavings.toLocaleString()}
                            </p>
                          ) : alt.price > cartItem.unit_price ? (
                            <p className="text-[10px] text-orange-500">
                              +KES {Math.abs(totalSavings).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-500">Same price</p>
                          )}
                        </div>
                      </div>
                      {/* Always show select button - let buyer choose any supplier */}
                      <Button
                        size="sm"
                        className={`w-full mt-2 ${
                          isCheaper 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                        onClick={() => handleSwitchToAlternative(alt)}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {isCheaper 
                          ? `Switch & Save KES ${totalSavings.toLocaleString()}`
                          : `Select This Supplier`
                        }
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Keep Current
          </Button>
          <p className="text-[10px] text-gray-500">
            💡 Prices from verified suppliers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CartPriceComparison;

