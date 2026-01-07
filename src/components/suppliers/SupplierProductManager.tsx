/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - SUPPLIERPRODUCTMANAGER.TSX - DO NOT MODIFY WITHOUT APPROVAL   ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Supplier product submission with image and price                               ║
 * ║   2. approval_status field: 'pending' | 'approved' | 'rejected'                     ║
 * ║   3. New products submit as 'pending' for admin approval                            ║
 * ║   4. Status badges showing pending/approved/rejected                                ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

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
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { CategoryImageSelector } from './CategoryImageSelector';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
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
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface SupplierProductManagerProps {
  supplierId: string;
}

const PRODUCT_CATEGORIES = [
  'Cement',
  'Steel',
  'Tiles',
  'Paint',
  'Timber',
  'Hardware',
  'Plumbing',
  'Electrical',
  'Aggregates',
  'Roofing',
  'Insulation',
  'Tools',
  'Stone',
  'Sand',
  'Plywood',
  'Doors',
  'Wire',
  'Iron Sheets',
  'Blocks',
  'Glass',
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
        // Update existing product - if changing image/price, set back to pending
        const needsReapproval = editingProduct.image_url !== formData.image_url || 
                               editingProduct.unit_price !== parseFloat(formData.unit_price);
        
        const updateData = needsReapproval 
          ? { ...productData, approval_status: 'pending' }
          : productData;

        const { error } = await supabase
          .from('materials')
          .update(updateData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: 'Product updated',
          description: needsReapproval 
            ? 'Your product has been submitted for admin approval'
            : 'Your product has been updated successfully'
        });
      } else {
        // Create new product - always set to pending for admin approval
        const { error } = await supabase
          .from('materials')
          .insert([{ ...productData, approval_status: 'pending' }]);

        if (error) throw error;

        toast({
          title: 'Product submitted',
          description: 'Your product has been submitted for admin approval. You will be notified once approved.'
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
          <DialogContent compact>
            <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
              {/* Row 1: Image + Category + Unit + Price */}
              <div className="flex gap-1.5 items-center">
                <div className="w-9 h-9 rounded border bg-muted flex-shrink-0 overflow-hidden cursor-pointer" onClick={() => document.getElementById(`up-${supplierId}`)?.click()}>
                  {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-1.5 text-muted-foreground" />}
                </div>
                <input id={`up-${supplierId}`} type="file" accept="image/*" className="hidden" onChange={async(e)=>{const f=e.target.files?.[0];if(!f)return;try{const n=`${supplierId}/${Date.now()}.${f.name.split('.').pop()}`;await supabase.storage.from('product-images').upload(n,f);const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(n);setFormData({...formData,image_url:publicUrl});}catch(err){console.error(err);}}} />
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-6 text-[10px] flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-[10px]">{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger className="h-6 text-[10px] w-12"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u} className="text-[10px]">{u}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="KES" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} className="h-6 text-[10px] w-14" required />
              </div>
              {/* Row 2: Name */}
              <Input placeholder="Product name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-6 text-[10px]" required />
              {/* Row 3: Buttons */}
              <div className="flex justify-end gap-1">
                {formData.category && !formData.image_url && <Button type="button" variant="link" className="h-5 text-[9px] p-0 mr-auto" onClick={() => { const d = getDefaultCategoryImage(formData.category); if(d) setFormData({...formData, image_url: d}); }}>Default img</Button>}
                <Button type="button" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="h-5 text-[9px] px-2">{editingProduct ? 'Save' : 'Submit'}</Button>
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
          {products.map((product) => {
            // Use custom image, fallback to default category image
            const imageUrl = product.image_url || getDefaultCategoryImage(product.category);
            
            return (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="relative aspect-square bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
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
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                  {/* Approval Status Badge */}
                  {product.approval_status === 'pending' && (
                    <Badge className="bg-yellow-500 text-white">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {product.approval_status === 'approved' && (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {product.approval_status === 'rejected' && (
                    <Badge className="bg-red-600 text-white">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {product.description || 'No description'}
                </CardDescription>
                {/* Show rejection reason if rejected */}
                {product.approval_status === 'rejected' && product.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span><strong>Rejection reason:</strong> {product.rejection_reason}</span>
                    </p>
                  </div>
                )}
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
            );
          })}
        </div>
      )}
    </div>
  );
};


