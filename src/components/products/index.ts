/**
 * Product Components - Variant-aware product display system
 * 
 * Usage:
 * 
 * 1. ProductCard - For listing grids (simplified, preview-only)
 *    <ProductCard 
 *      {...product} 
 *      onClick={() => setSelectedProduct(product)} 
 *    />
 * 
 * 2. ProductDetailPage - Full detail view with variants
 *    <ProductDetailPage product={product} onBack={handleBack} />
 * 
 * 3. ProductModal - Dialog wrapper for detail page
 *    <ProductModal 
 *      product={selectedProduct} 
 *      isOpen={!!selectedProduct} 
 *      onClose={() => setSelectedProduct(null)} 
 *    />
 */

export { ProductCard } from './ProductCard';
export { ProductDetailPage } from './ProductDetailPage';
export { ProductModal } from './ProductModal';

// Type exports
export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: number;
  stock: number;
  imageUrl: string;
  sku?: string;
}

export interface Product {
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

// Helper to convert existing material format to new Product format
export const materialToProduct = (material: any): Product => {
  // Handle variants from material.variants or create single variant
  const variants: ProductVariant[] = material.variants?.length > 0
    ? material.variants.map((v: any, index: number) => ({
        id: v.id || `${material.id}-v${index}`,
        size: v.sizeLabel || v.size,
        color: v.color,
        colorHex: v.colorHex,
        price: v.price || material.unit_price || 0,
        stock: v.stock ?? 100,
        imageUrl: v.imageUrl || material.image_url || '',
      }))
    : [{
        id: `${material.id}-default`,
        price: material.unit_price || 0,
        stock: material.in_stock !== false ? 100 : 0,
        imageUrl: material.image_url || '',
      }];

  // If material has additional_images, create variants from them
  if (!material.variants?.length && material.additional_images?.length > 0) {
    material.additional_images.forEach((img: string, index: number) => {
      if (img && index > 0) { // Skip first as it's already the main image
        variants.push({
          id: `${material.id}-img${index}`,
          price: material.unit_price || 0,
          stock: material.in_stock !== false ? 100 : 0,
          imageUrl: img,
        });
      }
    });
  }

  return {
    id: material.id,
    name: material.name,
    description: material.description || '',
    category: material.category || 'General',
    unit: material.unit || 'piece',
    basePrice: material.unit_price || 0,
    rating: material.rating || 5.0,
    reviewCount: material.review_count,
    variants,
    images: material.additional_images,
    supplier: material.supplier ? {
      name: material.supplier.company_name || 'Supplier',
      rating: material.supplier.rating || 4.5,
    } : undefined,
  };
};
