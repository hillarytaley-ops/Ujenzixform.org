/**
 * ProductDetailPage - Variant-aware product detail view
 * 
 * Key UX Principles:
 * - Image = Variant (swiping images changes variant)
 * - Variant change updates: Size, Color, Price, Stock
 * - Clean separation: Cards are preview-only, detail page has all controls
 * - Mobile-first with sticky Add to Cart
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Minus, 
  Plus, 
  ShoppingCart, 
  Check, 
  X,
  Star,
  Truck,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Types
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

interface ProductDetailPageProps {
  product: Product;
  onClose?: () => void;
  onBack?: () => void;
}

// Color mapping for common colors
const COLOR_MAP: Record<string, string> = {
  'yellow': '#F59E0B',
  'black': '#1F2937',
  'red': '#EF4444',
  'blue': '#3B82F6',
  'green': '#10B981',
  'white': '#FFFFFF',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'orange': '#F97316',
  'purple': '#8B5CF6',
  'pink': '#EC4899',
  'brown': '#92400E',
  'silver': '#C0C0C0',
  'gold': '#FFD700',
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onClose,
  onBack
}) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  
  // State
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Derived state
  const selectedVariant = product.variants[selectedVariantIndex] || product.variants[0];
  
  // Get unique sizes and colors
  const { uniqueSizes, uniqueColors } = useMemo(() => {
    const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
    const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
    return { uniqueSizes: sizes as string[], uniqueColors: colors as string[] };
  }, [product.variants]);
  
  // Find variant by size and color
  const findVariant = useCallback((size?: string, color?: string) => {
    return product.variants.find(v => 
      (!size || v.size === size) && (!color || v.color === color)
    );
  }, [product.variants]);
  
  // Check if a size/color combination is available
  const isComboAvailable = useCallback((size?: string, color?: string) => {
    const variant = findVariant(size, color);
    return variant && variant.stock > 0;
  }, [findVariant]);
  
  // Handle size selection
  const handleSizeSelect = (size: string) => {
    const newVariant = findVariant(size, selectedVariant.color);
    if (newVariant) {
      const index = product.variants.findIndex(v => v.id === newVariant.id);
      if (index !== -1) setSelectedVariantIndex(index);
    }
  };
  
  // Handle color selection
  const handleColorSelect = (color: string) => {
    const newVariant = findVariant(selectedVariant.size, color);
    if (newVariant) {
      const index = product.variants.findIndex(v => v.id === newVariant.id);
      if (index !== -1) setSelectedVariantIndex(index);
    }
  };
  
  // Handle image carousel navigation
  const handlePrevImage = () => {
    setSelectedVariantIndex(prev => 
      prev === 0 ? product.variants.length - 1 : prev - 1
    );
  };
  
  const handleNextImage = () => {
    setSelectedVariantIndex(prev => 
      prev === product.variants.length - 1 ? 0 : prev + 1
    );
  };
  
  // Handle quantity change
  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, selectedVariant.stock)));
  };
  
  // Handle add to cart
  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: selectedVariant.price,
        quantity,
        image: selectedVariant.imageUrl,
        unit: product.unit,
        variant: selectedVariant.size || selectedVariant.color,
        variantId: selectedVariant.id
      });
      
      toast({
        title: '✓ Added to Cart',
        description: `${quantity}x ${product.name}${selectedVariant.size ? ` (${selectedVariant.size})` : ''}`,
      });
      
      // Reset quantity after adding
      setQuantity(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive'
      });
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  // Get color hex
  const getColorHex = (colorName: string) => {
    return COLOR_MAP[colorName.toLowerCase()] || '#6B7280';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Mobile */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={onBack || onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-gray-500 truncate max-w-[200px]">
            {product.category}
          </span>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto lg:px-8 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          
          {/* ═══════════════════════════════════════════════════════════════
              IMAGE SECTION - Variant-aware carousel
              ═══════════════════════════════════════════════════════════════ */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedVariant.id}
                  src={selectedVariant.imageUrl}
                  alt={`${product.name} - ${selectedVariant.size || ''} ${selectedVariant.color || ''}`}
                  className="w-full h-full object-contain"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onLoad={() => setImageLoaded(true)}
                />
              </AnimatePresence>
              
              {/* Navigation Arrows */}
              {product.variants.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              
              {/* Variant indicator badge */}
              {(selectedVariant.size || selectedVariant.color) && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-black/70 text-white text-xs px-2 py-1">
                    {[selectedVariant.size, selectedVariant.color].filter(Boolean).join(' • ')}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Dot Indicators */}
            {product.variants.length > 1 && (
              <div className="flex justify-center gap-2 py-4">
                {product.variants.map((variant, index) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      index === selectedVariantIndex
                        ? "bg-green-600 w-6"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                    )}
                    aria-label={`View variant ${index + 1}`}
                  />
                ))}
              </div>
            )}
            
            {/* Thumbnail Strip - Desktop */}
            {product.variants.length > 1 && (
              <div className="hidden lg:flex gap-2 mt-4 overflow-x-auto pb-2">
                {product.variants.map((variant, index) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      index === selectedVariantIndex
                        ? "border-green-600 ring-2 ring-green-600/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <img
                      src={variant.imageUrl}
                      alt={`${variant.size || ''} ${variant.color || ''}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              PRODUCT INFO SECTION
              ═══════════════════════════════════════════════════════════════ */}
          <div className="px-4 lg:px-0 py-6 lg:py-0">
            {/* Category Badge */}
            <Badge variant="secondary" className="mb-3">
              {product.category}
            </Badge>
            
            {/* Product Name */}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h1>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {product.description}
            </p>
            
            {/* Rating & Reviews */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 font-medium">{product.rating.toFixed(1)}</span>
                </div>
                {product.reviewCount && (
                  <span className="text-gray-500 text-sm">
                    ({product.reviewCount} reviews)
                  </span>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                VARIANT SELECTORS - Smart buttons, not dropdowns
                ───────────────────────────────────────────────────────────── */}
            
            {/* Size Selector */}
            {uniqueSizes.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map(size => {
                    const isSelected = selectedVariant.size === size;
                    const isAvailable = isComboAvailable(size, selectedVariant.color);
                    
                    return (
                      <button
                        key={size}
                        onClick={() => isAvailable && handleSizeSelect(size)}
                        disabled={!isAvailable}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 font-medium transition-all",
                          isSelected
                            ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : isAvailable
                              ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              : "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed line-through"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Color Selector */}
            {uniqueColors.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Color: <span className="font-normal text-gray-500">{selectedVariant.color}</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {uniqueColors.map(color => {
                    const isSelected = selectedVariant.color === color;
                    const isAvailable = isComboAvailable(selectedVariant.size, color);
                    const colorHex = getColorHex(color);
                    
                    return (
                      <button
                        key={color}
                        onClick={() => isAvailable && handleColorSelect(color)}
                        disabled={!isAvailable}
                        className={cn(
                          "relative w-10 h-10 rounded-full border-2 transition-all",
                          isSelected
                            ? "ring-2 ring-offset-2 ring-green-600"
                            : "hover:scale-110",
                          !isAvailable && "opacity-30 cursor-not-allowed"
                        )}
                        style={{ 
                          backgroundColor: colorHex,
                          borderColor: colorHex === '#FFFFFF' ? '#E5E7EB' : colorHex
                        }}
                        title={color}
                      >
                        {isSelected && (
                          <Check 
                            className={cn(
                              "absolute inset-0 m-auto h-5 w-5",
                              colorHex === '#FFFFFF' || colorHex === '#FFD700' || colorHex === '#F59E0B'
                                ? "text-gray-800"
                                : "text-white"
                            )} 
                          />
                        )}
                        {!isAvailable && (
                          <X className="absolute inset-0 m-auto h-5 w-5 text-red-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                PRICE BLOCK - Animated on change
                ───────────────────────────────────────────────────────────── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedVariant.price}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(selectedVariant.price)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    per {product.unit}
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Stock Status */}
              <div className="mt-3 flex items-center gap-2">
                {selectedVariant.stock > 0 ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">In Stock</span>
                    {selectedVariant.stock < 10 && (
                      <span className="text-orange-500 text-sm">
                        (Only {selectedVariant.stock} left)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-500 font-medium">Out of Stock</span>
                  </>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                QUANTITY & ADD TO CART - Desktop
                ───────────────────────────────────────────────────────────── */}
            <div className="hidden lg:block space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity:
                </label>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= selectedVariant.stock}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  Total: {formatPrice(selectedVariant.price * quantity)}
                </span>
              </div>
              
              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={selectedVariant.stock === 0 || isAddingToCart}
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                {isAddingToCart ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                    </motion.div>
                    Adding...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </span>
                )}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Truck className="h-5 w-5 text-green-600" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-5 w-5 text-green-600" />
                <span>Quality Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STICKY ADD TO CART - Mobile Only
          ═══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg p-4 z-50">
        <div className="flex items-center gap-4">
          {/* Quantity */}
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-medium">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= selectedVariant.stock}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          {/* Add to Cart */}
          <Button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0 || isAddingToCart}
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Add to Cart • {formatPrice(selectedVariant.price * quantity)}
          </Button>
        </div>
      </div>
      
      {/* Spacer for sticky footer on mobile */}
      <div className="lg:hidden h-24" />
    </div>
  );
};

export default ProductDetailPage;
