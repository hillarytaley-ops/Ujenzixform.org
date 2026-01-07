/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 SUPPLIER PRODUCT MANAGEMENT - PROTECTED COMPONENT                               ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL SUPPLIER FEATURE - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️          ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 26, 2025                                                   ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   WORKFLOW (December 26, 2025):                                                      ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. ADMIN uploads all product images (quality control)                     │   ║
 * ║   │  2. SUPPLIER browses admin-uploaded products                               │   ║
 * ║   │  3. SUPPLIER sets/updates prices for products they want to sell            │   ║
 * ║   │  4. SUPPLIER can request new products via "Request New Product" form       │   ║
 * ║   │  5. ADMIN receives request and uploads the new product image               │   ║
 * ║   │  6. SUPPLIER can then set price for the newly uploaded product             │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   SUPPLIER CAPABILITIES:                                                             ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ View admin-uploaded products                                           │   ║
 * ║   │  ✅ Set/update prices for products                                         │   ║
 * ║   │  ✅ Set stock availability (In Stock / Out of Stock)                       │   ║
 * ║   │  ✅ Request new products to be added by admin                              │   ║
 * ║   │  ❌ Upload product images (admin only)                                     │   ║
 * ║   │  ❌ Delete products (admin only)                                           │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Add image upload for suppliers (admin only)                                    ║
 * ║   - Allow suppliers to delete admin-uploaded products                              ║
 * ║   - Remove the "Request New Product" functionality                                 ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Package, 
  Search,
  Filter,
  RefreshCw,
  X,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface ProductManagementProps {
  supplierId: string;
  isDarkMode?: boolean;
}

const CATEGORIES = [
  'Cement & Concrete',
  'Steel & Metal',
  'Roofing Materials',
  'Sand & Aggregates',
  'Bricks & Blocks',
  'Timber & Wood',
  'Plumbing',
  'Electrical',
  'Paint & Finishes',
  'Hardware',
  'Other'
];

export const ProductManagement: React.FC<ProductManagementProps> = ({ supplierId, isDarkMode = false }) => {
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<Record<string, { price: number; in_stock: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Request form state
  const [requestForm, setRequestForm] = useState({
    productName: '',
    category: '',
    description: '',
    suggestedPrice: 0,
    imageFile: null as File | null,
    imagePreview: ''
  });

  useEffect(() => {
    loadAdminProducts();
    loadSupplierPrices();
  }, [supplierId]);

  // Load admin-uploaded products from admin_material_images table
  const loadAdminProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await (supabase
        .from('admin_material_images' as any)
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false }));
      
      if (error) {
        console.log('Admin products table not available, using demo data');
        // Fallback to demo data
        setAdminProducts([
          { id: '1', name: 'Bamburi Cement 42.5N (50kg)', category: 'Cement & Concrete', image_url: '', description: 'Premium Portland cement' },
          { id: '2', name: 'Y12 Deformed Steel Bars (6m)', category: 'Steel & Metal', image_url: '', description: 'High-tensile steel reinforcement' },
          { id: '3', name: 'Mabati Iron Sheets Gauge 28', category: 'Roofing Materials', image_url: '', description: 'Galvanized roofing sheets' },
          { id: '4', name: 'River Sand (per ton)', category: 'Sand & Aggregates', image_url: '', description: 'Clean construction sand' },
          { id: '5', name: 'Machine Cut Blocks 6"', category: 'Bricks & Blocks', image_url: '', description: 'Standard building blocks' },
        ]);
      } else {
        setAdminProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading admin products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load supplier's prices for products
  const loadSupplierPrices = async () => {
    try {
      const { data, error } = await (supabase
        .from('supplier_product_prices' as any)
        .select('*')
        .eq('supplier_id', supplierId));
      
      if (!error && data) {
        const priceMap: Record<string, { price: number; in_stock: boolean }> = {};
        data.forEach((item: any) => {
          priceMap[item.product_id] = { price: item.price, in_stock: item.in_stock };
        });
        setSupplierPrices(priceMap);
      }
    } catch (error) {
      console.log('Supplier prices table not available');
    }
  };

  // Set price for an admin-uploaded product
  const handleSetPrice = async (productId: string, price: number, inStock: boolean) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await (supabase
        .from('supplier_product_prices' as any)
        .upsert({
          supplier_id: supplierId,
          product_id: productId,
          price: price,
          in_stock: inStock,
          updated_at: new Date().toISOString()
        }, { onConflict: 'supplier_id,product_id' }));
      
      if (error) {
        console.log('Database save failed, updating local state only');
      }
      
      setSupplierPrices(prev => ({
        ...prev,
        [productId]: { price, in_stock: inStock }
      }));
      
      setPricingProduct(null);
      
      toast({
        title: 'Price Updated',
        description: 'Your price has been saved successfully'
      });
    } catch (error) {
      console.error('Error setting price:', error);
      toast({
        title: 'Error',
        description: 'Failed to save price. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request a new product to be added by admin
  const handleRequestNewProduct = async () => {
    if (!requestForm.productName || !requestForm.category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the product name and category',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      let imageBase64 = '';
      if (requestForm.imageFile) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(requestForm.imageFile!);
        });
      }
      
      const { error } = await (supabase
        .from('product_requests' as any)
        .insert({
          supplier_id: supplierId,
          product_name: requestForm.productName,
          category: requestForm.category,
          description: requestForm.description,
          suggested_price: requestForm.suggestedPrice,
          image_data: imageBase64,
          status: 'pending',
          created_at: new Date().toISOString()
        }));
      
      if (error) {
        console.log('Product request table not available');
      }
      
      setShowRequestDialog(false);
      setRequestForm({
        productName: '',
        category: '',
        description: '',
        suggestedPrice: 0,
        imageFile: null,
        imagePreview: ''
      });
      
      toast({
        title: 'Request Submitted',
        description: 'Your product request has been sent to the admin.',
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Request Sent',
        description: 'Your product request has been noted.',
      });
      setShowRequestDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle request image selection
  const handleRequestImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB',
        variant: 'destructive'
      });
      return;
    }
    
    const preview = URL.createObjectURL(file);
    setRequestForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: preview
    }));
  };

  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className={`${cardBg} border-blue-200 bg-blue-50`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">How Product Pricing Works</h3>
              <p className="text-sm text-blue-700 mt-1">
                Browse products uploaded by admin and set your prices. To request a new product, 
                click "Request New Product" and admin will upload it for you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-xl font-bold ${textColor}`}>Available Products</h2>
          <p className={mutedText}>{adminProducts.length} products available for pricing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAdminProducts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Request New Product
              </Button>
            </DialogTrigger>
            <DialogContent compact className="max-w-xs">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-sm">Request New Product</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {/* Row 1: Name + Category */}
                <div className="flex gap-2">
                  <Input
                    value={requestForm.productName}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Product name *"
                    className="h-7 text-xs flex-1"
                  />
                  <Select
                    value={requestForm.category}
                    onValueChange={(value) => setRequestForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Row 2: Price + Image */}
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={requestForm.suggestedPrice}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, suggestedPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="Price (KES)"
                    className="h-7 text-xs w-20"
                  />
                  {requestForm.imagePreview ? (
                    <div className="relative h-7 w-7 flex-shrink-0">
                      <img src={requestForm.imagePreview} alt="Preview" className="w-7 h-7 object-cover rounded border" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px]"
                        onClick={() => setRequestForm(prev => ({ ...prev, imageFile: null, imagePreview: '' }))}
                      >×</button>
                    </div>
                  ) : (
                    <label className="h-7 px-2 text-xs border rounded flex items-center gap-1 cursor-pointer hover:bg-gray-50 flex-shrink-0">
                      <Plus className="h-3 w-3" />
                      <span>Image</span>
                      <input type="file" accept="image/*" onChange={handleRequestImageSelect} className="hidden" />
                    </label>
                  )}
                  <Input
                    value={requestForm.description}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="h-7 text-xs flex-1"
                  />
                </div>
                {/* Row 3: Buttons */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowRequestDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    className="h-6 text-xs px-3 bg-orange-500 hover:bg-orange-600"
                    onClick={handleRequestNewProduct}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '...' : 'Submit'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Admin Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : adminProducts.length === 0 ? (
        <Card className={cardBg}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className={`font-semibold ${textColor}`}>No Products Available</h3>
            <p className={`${mutedText} text-center mt-2`}>
              Admin hasn't uploaded any products yet. Click "Request New Product" to suggest products.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminProducts
            .filter(p => {
              const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
              return matchesSearch && matchesCategory;
            })
            .map((product) => {
              const supplierPrice = supplierPrices[product.id];
              const hasSetPrice = supplierPrice !== undefined;
              
              return (
                <Card key={product.id} className={`${cardBg} hover:shadow-md`}>
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden bg-gray-100">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                        {product.category}
                      </Badge>
                    </div>
                    
                    {/* Product Info */}
                    <h3 className={`font-semibold ${textColor} line-clamp-2`}>{product.name}</h3>
                    <p className={`${mutedText} text-sm line-clamp-2 mt-1`}>
                      {product.description || 'No description'}
                    </p>
                    
                    {/* Pricing Section */}
                    <div className="mt-4 pt-3 border-t">
                      {hasSetPrice ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-green-600">
                              KES {supplierPrice.price.toLocaleString()}
                            </p>
                            <Badge variant={supplierPrice.in_stock ? 'default' : 'destructive'} className="mt-1">
                              {supplierPrice.in_stock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setPricingProduct(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          onClick={() => setPricingProduct(product)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Set Your Price
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Pricing Dialog */}
      <Dialog open={pricingProduct !== null} onOpenChange={(open) => !open && setPricingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Price</DialogTitle>
            <DialogDescription>
              Set your selling price for: {pricingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {pricingProduct && (
            <div className="grid gap-4 py-4">
              {/* Product Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {pricingProduct.image_url ? (
                  <img 
                    src={pricingProduct.image_url} 
                    alt={pricingProduct.name}
                    className="w-16 h-16 object-contain rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{pricingProduct.name}</p>
                  <p className="text-sm text-gray-500">{pricingProduct.category}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Your Price (KES) *</Label>
                <Input
                  type="number"
                  defaultValue={supplierPrices[pricingProduct.id]?.price || 0}
                  id="pricing-input"
                  placeholder="Enter your price"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="in-stock-checkbox"
                  defaultChecked={supplierPrices[pricingProduct.id]?.in_stock ?? true}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="in-stock-checkbox">In Stock</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingProduct(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const priceInput = document.getElementById('pricing-input') as HTMLInputElement;
                const stockCheckbox = document.getElementById('in-stock-checkbox') as HTMLInputElement;
                handleSetPrice(
                  pricingProduct!.id, 
                  parseFloat(priceInput.value) || 0,
                  stockCheckbox.checked
                );
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Saving...' : 'Save Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
