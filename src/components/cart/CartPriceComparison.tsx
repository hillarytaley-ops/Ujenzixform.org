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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
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
  Package
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
      // Fetch all supplier prices for similar products
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/supplier_product_prices?select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch prices');
      
      const pricesData = await response.json();

      // Fetch admin materials to get product names
      const materialsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,image_url&is_approved=eq.true`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!materialsResponse.ok) throw new Error('Failed to fetch materials');
      
      const materialsData = await materialsResponse.json();
      const materialsMap = new Map(materialsData.map((m: any) => [m.id, m]));

      // Find products in the same category or with similar names
      const searchTerms = cartItem.name.toLowerCase().split(' ').filter(t => t.length > 3);
      
      const alternativeProducts = materialsData.filter((m: any) => {
        // Same category
        if (m.category === cartItem.category) return true;
        // Similar name
        const nameLower = m.name.toLowerCase();
        return searchTerms.some(term => nameLower.includes(term));
      });

      // Map prices to alternatives
      const alternativesWithPrices: AlternativePrice[] = [];
      
      for (const product of alternativeProducts) {
        // Find supplier prices for this product
        const supplierPrices = pricesData.filter((p: any) => p.product_id === product.id);
        
        for (const sp of supplierPrices) {
          alternativesWithPrices.push({
            product_id: product.id,
            product_name: product.name,
            supplier_id: sp.supplier_id,
            supplier_name: 'Supplier', // Could fetch supplier name if needed
            price: sp.price,
            in_stock: sp.in_stock,
            image_url: product.image_url
          });
        }

        // Also add the admin price if no supplier price exists
        if (supplierPrices.length === 0) {
          alternativesWithPrices.push({
            product_id: product.id,
            product_name: product.name,
            supplier_id: 'admin',
            supplier_name: 'UjenziXform Catalog',
            price: 0, // Admin products may not have a price
            in_stock: true,
            image_url: product.image_url
          });
        }
      }

      // Filter out items with 0 price and sort by price
      const validAlternatives = alternativesWithPrices
        .filter(a => a.price > 0 && a.product_id !== cartItem.id)
        .sort((a, b) => a.price - b.price);

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
      supplier_id: alt.supplier_id
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
                          <p className="text-xs text-gray-500">{alt.supplier_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {isCheaper && (
                              <Badge className="bg-green-500 text-[10px]">
                                -{Math.round((savings / cartItem.unit_price) * 100)}%
                              </Badge>
                            )}
                            <span className={`font-bold ${isCheaper ? 'text-green-600' : 'text-gray-700'}`}>
                              KES {alt.price.toLocaleString()}
                            </span>
                          </div>
                          {isCheaper && (
                            <p className="text-[10px] text-green-600">
                              Save KES {totalSavings.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {isCheaper && (
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          onClick={() => handleSwitchToAlternative(alt)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Switch & Save KES {totalSavings.toLocaleString()}
                        </Button>
                      )}
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

