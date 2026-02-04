/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📖 MOBILE BOOK VIEW - Swipeable product cards like flipping book pages            ║
 * ║                                                                                      ║
 * ║   CREATED: January 23, 2026                                                          ║
 * ║   FEATURES:                                                                          ║
 * ║   - Swipe left/right to browse products like book pages                             ║
 * ║   - Full-screen product cards on mobile                                             ║
 * ║   - Page indicator dots                                                              ║
 * ║   - Smooth animations and transitions                                               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Package, 
  Store,
  Plus,
  Minus,
  X,
  BookOpen,
  Loader2
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

// Supabase config for fetching images
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  supplier_name?: string;
}

interface MobileBookViewProps {
  materials: Material[];
  onClose: () => void;
  initialIndex?: number;
  userRole?: string;
  onImageLoaded?: (id: string, imageUrl: string) => void;
}

export const MobileBookView: React.FC<MobileBookViewProps> = ({
  materials,
  onClose,
  initialIndex = 0,
  userRole,
  onImageLoaded
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Fetch image for a material if not already loaded
  const fetchImageForMaterial = useCallback(async (materialId: string) => {
    if (loadedImages[materialId] || loadingImages.has(materialId)) return;
    
    setLoadingImages(prev => new Set(prev).add(materialId));
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,image_url&id=eq.${materialId}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]?.image_url) {
          setLoadedImages(prev => ({ ...prev, [materialId]: data[0].image_url }));
          onImageLoaded?.(materialId, data[0].image_url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch image:', error);
    } finally {
      setLoadingImages(prev => {
        const next = new Set(prev);
        next.delete(materialId);
        return next;
      });
    }
  }, [loadedImages, loadingImages, onImageLoaded]);

  // Preload images for current, previous, and next materials
  useEffect(() => {
    const indicesToLoad = [currentIndex - 1, currentIndex, currentIndex + 1, currentIndex + 2];
    
    indicesToLoad.forEach(idx => {
      if (idx >= 0 && idx < materials.length) {
        const material = materials[idx];
        if (material && !material.image_url && !loadedImages[material.id]) {
          fetchImageForMaterial(material.id);
        }
      }
    });
  }, [currentIndex, materials, loadedImages, fetchImageForMaterial]);

  // Get image URL for a material (from props or loaded cache)
  const getImageUrl = (material: Material): string | undefined => {
    return material.image_url || loadedImages[material.id];
  };

  const isLoadingImage = (materialId: string): boolean => {
    return loadingImages.has(materialId);
  };

  const currentMaterial = materials[currentIndex];
  const minSwipeDistance = 50;

  // Handle touch events for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < materials.length - 1) {
      goToNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }
  };

  const goToNext = () => {
    if (currentIndex < materials.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setDirection('left');
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
        setDirection(null);
      }, 200);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setDirection('right');
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsAnimating(false);
        setDirection(null);
      }, 200);
    }
  };

  const goToPage = (index: number) => {
    if (index !== currentIndex && !isAnimating) {
      setIsAnimating(true);
      setDirection(index > currentIndex ? 'left' : 'right');
      setTimeout(() => {
        setCurrentIndex(index);
        setIsAnimating(false);
        setDirection(null);
      }, 200);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const getQuantity = (id: string) => quantities[id] || 1;
  
  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (material: Material) => {
    const qty = getQuantity(material.id);
    addToCart({
      id: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      unit_price: material.unit_price,
      image_url: material.image_url,
      supplier_name: material.supplier_name || 'UjenziXform Catalog',
      supplier_id: material.supplier_id
    }, qty);
    
    toast({
      title: '🛒 Added to Cart!',
      description: `${qty}x ${material.name} added`,
    });
  };

  if (!currentMaterial) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      ref={containerRef}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900/95 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-400" />
            <span className="text-white font-medium">Browse Products</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Page Counter */}
        <div className="text-center mt-2">
          <span className="text-green-400 font-bold text-lg">{currentIndex + 1}</span>
          <span className="text-slate-400"> / {materials.length}</span>
        </div>
      </div>

      {/* Main Content - Swipeable Area */}
      <div
        className="absolute inset-0 pt-24 pb-32 px-4 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className={`h-full transition-all duration-200 ease-out ${
            isAnimating 
              ? direction === 'left' 
                ? '-translate-x-full opacity-0' 
                : 'translate-x-full opacity-0'
              : 'translate-x-0 opacity-100'
          }`}
        >
          <Card className="h-full bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
            {/* Product Image */}
            <div className="h-[45%] relative overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900">
              {getImageUrl(currentMaterial) ? (
                <img
                  src={getImageUrl(currentMaterial)}
                  alt={currentMaterial.name}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/400x300/1e293b/64748b?text=No+Image';
                  }}
                />
              ) : isLoadingImage(currentMaterial.id) ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-12 w-12 text-green-400 animate-spin" />
                  <span className="text-slate-400 text-sm">Loading image...</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-slate-600" />
                </div>
              )}
              
              {/* Category Badge */}
              <Badge className="absolute top-4 left-4 bg-green-600/90 text-white">
                {currentMaterial.category}
              </Badge>
              
              {/* Stock Status */}
              <Badge 
                className={`absolute top-4 right-4 ${
                  currentMaterial.in_stock 
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-red-500/90 text-white'
                }`}
              >
                {currentMaterial.in_stock ? '✓ In Stock' : 'Out of Stock'}
              </Badge>
            </div>

            {/* Product Details */}
            <CardContent className="h-[55%] p-5 flex flex-col">
              {/* Name */}
              <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
                {currentMaterial.name}
              </h2>
              
              {/* Supplier */}
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                <Store className="h-4 w-4" />
                <span>{currentMaterial.supplier_name || 'UjenziXform Catalog'}</span>
              </div>
              
              {/* Description */}
              {currentMaterial.description && (
                <p className="text-slate-300 text-sm mb-4 line-clamp-3 flex-grow">
                  {currentMaterial.description}
                </p>
              )}
              
              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-green-400">
                  KES {currentMaterial.unit_price.toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">
                  per {currentMaterial.unit}
                </div>
              </div>
              
              {/* Quantity & Add to Cart */}
              {userRole !== 'professional_builder' && (
                <div className="space-y-3">
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                    <span className="text-slate-300 text-sm">Quantity:</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-slate-600 text-white"
                        onClick={() => updateQuantity(currentMaterial.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-white font-bold w-8 text-center">
                        {getQuantity(currentMaterial.id)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-slate-600 text-white"
                        onClick={() => updateQuantity(currentMaterial.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
                    onClick={() => handleAddToCart(currentMaterial)}
                    disabled={!currentMaterial.in_stock}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart - KES {(currentMaterial.unit_price * getQuantity(currentMaterial.id)).toLocaleString()}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className={`h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm text-white ${
            currentIndex === 0 ? 'opacity-30' : 'hover:bg-white/20'
          }`}
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      </div>
      
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className={`h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm text-white ${
            currentIndex === materials.length - 1 ? 'opacity-30' : 'hover:bg-white/20'
          }`}
          onClick={goToNext}
          disabled={currentIndex === materials.length - 1}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Page Indicator Dots */}
      <div className="absolute bottom-6 left-0 right-0 z-10">
        <div className="flex justify-center gap-2 flex-wrap px-4 max-w-full">
          {materials.length <= 20 ? (
            // Show all dots if 20 or fewer items
            materials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToPage(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-green-400 w-6' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))
          ) : (
            // Show condensed indicator for many items
            <div className="flex items-center gap-2 bg-slate-800/80 rounded-full px-4 py-2">
              <span className="text-green-400 font-bold">{currentIndex + 1}</span>
              <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / materials.length) * 100}%` }}
                />
              </div>
              <span className="text-slate-400">{materials.length}</span>
            </div>
          )}
        </div>
        
        {/* Swipe Hint */}
        <p className="text-center text-slate-500 text-xs mt-3">
          ← Swipe to browse →
        </p>
      </div>
    </div>
  );
};

export default MobileBookView;

