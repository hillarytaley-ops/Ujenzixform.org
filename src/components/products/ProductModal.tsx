/**
 * ProductModal - Dialog wrapper for ProductDetailPage
 * Opens when user clicks "View Options" on a product card
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ProductDetailPage } from './ProductDetailPage';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: number;
  stock: number;
  imageUrl: string;
  sku?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  basePrice: number;
  rating?: number;
  reviewCount?: number;
  variants: ProductVariant[];
  images?: string[];
  supplier?: {
    name: string;
    rating: number;
  };
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 bg-white/80 hover:bg-white rounded-full shadow"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <ProductDetailPage 
          product={product} 
          onClose={onClose}
          onBack={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
