/**
 * ProductCard - Simplified preview card for product listings
 * 
 * Key UX Principles:
 * - Preview-only: NO dropdowns, NO quantity, NO compare checkbox
 * - Clean, scannable grid
 * - Swipeable image carousel showing variants
 * - "From KES X" pricing
 * - Single CTA: "View Options"
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
  imageUrl: string;
}

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  rating?: number;
  variants: ProductVariant[];
  images?: string[];
  supplier?: string;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  description,
  category,
  unit,
  rating = 5.0,
  variants,
  images,
  supplier,
  onClick
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get all images from variants or use provided images
  const allImages = variants.length > 0 
    ? variants.map(v => v.imageUrl).filter(Boolean)
    : images || [];
  
  // Get price range
  const prices = variants.map(v => v.price).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const hasVariants = variants.length > 1;
  
  // Check stock
  const inStock = variants.some(v => v.stock > 0);
  
  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  // Handle image navigation
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => 
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  };
  
  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => 
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <motion.div
      className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {/* Main Image */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={allImages[currentImageIndex] || '/placeholder-product.png'}
            alt={name}
            className="w-full h-full object-contain p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
        
        {/* Navigation Arrows - Show on hover or mobile touch */}
        {allImages.length > 1 && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-between px-2 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0 md:opacity-0"
          )}>
            <button
              onClick={handlePrevImage}
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 shadow flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 shadow flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Dot Indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {allImages.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  index === currentImageIndex
                    ? "bg-green-600 w-3"
                    : "bg-gray-400/60"
                )}
              />
            ))}
          </div>
        )}
        
        {/* Category Badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 left-2 text-xs bg-white/90 dark:bg-gray-800/90"
        >
          {category}
        </Badge>
        
        {/* Stock Badge */}
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1 min-h-[2.5rem]">
          {name}
        </h3>
        
        {/* Supplier */}
        {supplier && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {supplier}
          </p>
        )}
        
        {/* Price */}
        <div className="mb-3">
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {hasVariants && minPrice !== maxPrice ? 'From ' : ''}
            {formatPrice(minPrice)}
          </span>
          <span className="text-xs text-gray-500 ml-1">
            /{unit}
          </span>
        </div>
        
        {/* Rating & Stock */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
          {inStock && (
            <span className="text-xs text-green-600 font-medium">
              ✓ In Stock
            </span>
          )}
        </div>
        
        {/* CTA Button */}
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={!inStock}
        >
          {hasVariants ? 'View Options' : 'View Details'}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
