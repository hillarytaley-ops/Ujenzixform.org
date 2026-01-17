/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - PRICECOMPARISONMODAL.TSX - DO NOT MODIFY WITHOUT APPROVAL     ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Simple price comparison table with BEST/HIGH badges                            ║
 * ║   2. "Best Deal Found!" banner with savings calculation                             ║
 * ║   3. One-click "Buy Best" button                                                    ║
 * ║   4. Clean purple header design                                                     ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, 
  Store, 
  Star, 
  ShoppingCart, 
  X,
  Check,
  Trophy,
  ArrowRight
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  description?: string;
  image_url?: string;
  in_stock: boolean;
  supplier_id?: string;
  supplier?: {
    company_name: string;
    location?: string;
    rating?: number;
  };
}

interface PriceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: Material[];
  allMaterials: Material[];
}

export const PriceComparisonModal: React.FC<PriceComparisonModalProps> = ({
  isOpen,
  onClose,
  selectedMaterials,
  allMaterials
}) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Sort selected materials by price (lowest first)
  const sortedMaterials = [...selectedMaterials].sort((a, b) => a.unit_price - b.unit_price);
  
  // Find the cheapest item
  const cheapestItem = sortedMaterials[0];
  const mostExpensiveItem = sortedMaterials[sortedMaterials.length - 1];
  
  // Calculate potential savings
  const savings = mostExpensiveItem && cheapestItem 
    ? mostExpensiveItem.unit_price - cheapestItem.unit_price 
    : 0;

  const handleBuyNow = (material: Material) => {
    addToCart({
      id: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      unit_price: material.unit_price,
      image_url: material.image_url,
      supplier_name: material.supplier?.company_name || 'UjenziXform Catalog',
      supplier_id: material.supplier_id
    }, 1);
    
    toast({
      title: '✅ Added to Cart!',
      description: `${material.name} added at KES ${material.unit_price.toLocaleString()}`,
    });
    onClose();
  };

  const handleBuyCheapest = () => {
    if (cheapestItem) {
      handleBuyNow(cheapestItem);
    }
  };

  if (selectedMaterials.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              <DialogTitle className="text-white text-lg font-bold">
                Price Comparison
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
          <p className="text-white/80 text-sm mt-1">
            {selectedMaterials.length} items selected
          </p>
        </div>

        {/* Best Deal Highlight */}
        {cheapestItem && savings > 0 && (
          <div className="bg-green-50 border-b border-green-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 text-white p-2 rounded-full">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-800">Best Deal Found!</p>
                <p className="text-sm text-green-700">
                  Save <span className="font-bold">KES {savings.toLocaleString()}</span> by choosing the lowest price
                </p>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleBuyCheapest}
              >
                Buy Best <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Price List - Simple Table */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium text-right">Price</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.map((material, index) => {
                const isCheapest = index === 0 && savings > 0;
                const isMostExpensive = index === sortedMaterials.length - 1 && savings > 0;
                
                return (
                  <tr 
                    key={material.id}
                    className={`border-b last:border-b-0 ${
                      isCheapest ? 'bg-green-50' : ''
                    }`}
                  >
                    {/* Product */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {material.image_url ? (
                          <img 
                            src={material.image_url} 
                            alt={material.name}
                            className="w-10 h-10 rounded object-contain bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Store className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{material.name}</p>
                          <p className="text-xs text-gray-500">/{material.unit}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Supplier */}
                    <td className="py-3">
                      <div className="text-sm">
                        <p className="text-gray-700">{material.supplier?.company_name || 'UjenziXform'}</p>
                        {material.supplier?.rating && (
                          <div className="flex items-center gap-0.5 text-yellow-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs">{material.supplier.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Price */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCheapest && (
                          <Badge className="bg-green-500 text-[10px]">BEST</Badge>
                        )}
                        {isMostExpensive && sortedMaterials.length > 1 && (
                          <Badge variant="outline" className="text-red-500 border-red-300 text-[10px]">HIGH</Badge>
                        )}
                        <span className={`font-bold ${isCheapest ? 'text-green-600 text-lg' : 'text-gray-800'}`}>
                          KES {material.unit_price.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    
                    {/* Action */}
                    <td className="py-3 pl-2">
                      <Button
                        size="sm"
                        variant={isCheapest ? "default" : "outline"}
                        className={isCheapest ? "bg-green-600 hover:bg-green-700" : ""}
                        onClick={() => handleBuyNow(material)}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Buy
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <p className="text-xs text-gray-500">
            Prices may vary. Contact supplier for bulk discounts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
