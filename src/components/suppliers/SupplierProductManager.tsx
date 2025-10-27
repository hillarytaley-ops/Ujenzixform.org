import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Package, Image as ImageIcon } from 'lucide-react';
import { ProductImageUpload } from './ProductImageUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  supplier_id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_price: number;
  image_url?: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierProductManagerProps {
  supplierId: string;
}

const PRODUCT_CATEGORIES = [
  'Cement',
  'Steel',
  'Paint',
  'Tiles',
  'Roofing',
  'Timber',
  'Blocks',
  'Aggregates',
  'Plumbing',
  'Electrical',
  'Hardware',
  'Glass',
  'Doors',
  'Windows',
  'Other'
];

const UNITS = [
  'bag',
  'piece',
  'meter',
  'sqm',
  'tonne',
  'kg',
  'liter',
  'roll',
  'sheet',
  'box',
  'set'
];

export const SupplierProductManager: React.FC<SupplierProductManagerProps> = ({ supplierId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    unit_price: '',
    image_url: '',
    in_stock: true
  });

  useEffect(() => {
    fetchProducts();
  }, [supplierId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error loading products',
        description: 'Failed to fetch your product list',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unit || !formData.unit_price) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.image_url) {
      toast({
        title: 'Product image required',
        description: 'Please upload an image of your product',
        variant: 'destructive'
      });
      return;
    }

    try {
      const productData = {
        supplier_id: supplierId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        unit_price: parseFloat(formData.unit_price),
        image_url: formData.image_url,
        in_stock: formData.in_stock,
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('materials')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: 'Product updated',
          description: 'Your product has been updated successfully'
        });
      } else {
        // Create new product
        const { error } = await supabase
          .from('materials')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: 'Product added',
          description: 'Your product has been added to your catalog'
        });
      }

      // Reset form and refresh
      setFormData({
        name: '',
        description: '',
        category: '',
        unit: '',
        unit_price: '',
        image_url: '',
        in_stock: true
      });
      setShowAddDialog(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save product',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      unit: product.unit,
      unit_price: product.unit_price.toString(),
      image_url: product.image_url || '',
      in_stock: product.in_stock
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Product deleted',
        description: 'Product has been removed from your catalog'
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      unit: '',
      unit_price: '',
      image_url: '',
      in_stock: true
    });
    setEditingProduct(null);
    setShowAddDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Your Product Catalog</h3>
          <p className="text-muted-foreground">Manage your construction materials and products</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                Add product details and upload a clear image for buyers to see
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Image Upload */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Product Image *</Label>
                <ProductImageUpload
                  currentImageUrl={formData.image_url}
                  onImageUpload={(url) => setFormData({ ...formData, image_url: url })}
                  productName={formData.name || 'product'}
                  supplierId={supplierId}
                />
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name *</Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Bamburi Cement 42.5N (50kg)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed product description, specifications, and features"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Category and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Unit Price (KES) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 850.00"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Status *</Label>
                  <Select
                    value={formData.in_stock ? 'in-stock' : 'out-of-stock'}
                    onValueChange={(value) => setFormData({ ...formData, in_stock: value === 'in-stock' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your product catalog by adding your first product
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="relative aspect-square bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className={product.in_stock ? 'bg-green-600' : 'bg-red-600'}>
                    {product.in_stock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>
              </div>

              {/* Product Info */}
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {product.description || 'No description'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{product.category}</Badge>
                  <span className="text-xs text-muted-foreground">{product.unit}</span>
                </div>

                <div className="text-2xl font-bold text-primary">
                  KES {product.unit_price.toLocaleString()}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

