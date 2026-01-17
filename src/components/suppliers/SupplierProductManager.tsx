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

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Clock, CheckCircle, XCircle, AlertCircle, Upload, X, Camera, Loader2, DollarSign } from 'lucide-react';
import { CategoryImageSelector } from './CategoryImageSelector';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  additional_images?: string[]; // Multiple images from different angles
  in_stock: boolean;
  created_at: string;
  updated_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface SupplierProductManagerProps {
  supplierId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const PRODUCT_CATEGORIES = [
  // STRUCTURAL & FOUNDATION
  'Cement', 'Steel', 'Aggregates', 'Sand', 'Stone', 'Blocks', 'Bricks', 'Ready Mix Concrete',
  // ROOFING
  'Roofing', 'Iron Sheets', 'Roofing Tiles', 'Gutters & Downpipes', 'Roofing Accessories', 'Waterproofing',
  // TIMBER & WOOD
  'Timber', 'Plywood', 'Particle Board', 'Timber Trusses', 'Formwork', 'Treated Poles',
  // DOORS, WINDOWS & OPENINGS
  'Doors', 'Steel Doors', 'Windows', 'Aluminium Windows', 'Glass', 'Door Frames', 'Door Hardware', 'Window Hardware',
  // PLUMBING & WATER
  'Plumbing', 'PVC Pipes', 'PPR Pipes', 'GI Pipes', 'HDPE Pipes', 'Pipe Fittings', 'Valves',
  'Water Tanks', 'Pumps', 'Taps & Mixers', 'Sanitary Ware', 'Bathroom Accessories', 'Septic Tanks', 'Water Heaters',
  // ELECTRICAL
  'Electrical', 'Cables & Wires', 'Switches & Sockets', 'Distribution Boards', 'Lighting', 'Conduits',
  'Electrical Accessories', 'Solar Equipment', 'Generators', 'UPS & Stabilizers',
  // TILES & FLOORING
  'Tiles', 'Ceramic Tiles', 'Porcelain Tiles', 'Granite Tiles', 'Marble', 'Terrazzo', 'Vinyl Flooring',
  'Wooden Flooring', 'Carpet', 'Tile Adhesive', 'Tile Grout', 'Skirting',
  // PAINT & FINISHES
  'Paint', 'Emulsion Paint', 'Gloss Paint', 'Exterior Paint', 'Wood Finish', 'Metal Paint',
  'Primers', 'Putty & Fillers', 'Thinners & Solvents', 'Brushes & Rollers',
  // WALL & CEILING
  'Gypsum', 'Ceiling Boards', 'Plaster', 'Wallpaper', 'Wall Cladding', 'Insulation', 'Cornices',
  // HARDWARE & FASTENERS
  'Hardware', 'Nails', 'Screws', 'Bolts & Nuts', 'Hinges', 'Locks', 'Chains', 'Wire', 'Wire Mesh', 'Brackets & Supports',
  // TOOLS & EQUIPMENT
  'Tools', 'Hand Tools', 'Power Tools', 'Measuring Tools', 'Cutting Tools', 'Masonry Tools',
  'Painting Tools', 'Safety Equipment', 'Scaffolding', 'Ladders', 'Wheelbarrows',
  // ADHESIVES & SEALANTS
  'Adhesives', 'Sealants', 'Caulking', 'Epoxy',
  // FENCING & SECURITY
  'Fencing', 'Barbed Wire', 'Electric Fence', 'Gates', 'Security Systems',
  // LANDSCAPING & OUTDOOR
  'Paving', 'Outdoor Tiles', 'Drainage', 'Retaining Walls', 'Garden Materials',
  // KITCHEN & BUILT-IN
  'Kitchen Cabinets', 'Countertops', 'Kitchen Sinks', 'Kitchen Hardware', 'Wardrobes',
  // HVAC & VENTILATION
  'Air Conditioning', 'Ventilation', 'Ceiling Fans',
  // FIRE SAFETY
  'Fire Safety', 'Fire Doors', 'Fire Alarm', 'Sprinkler Systems',
  // SPECIALTY MATERIALS
  'Damp Proofing', 'Expansion Joints', 'Reinforcement Accessories', 'Curing Compounds', 'Admixtures',
  // MISCELLANEOUS
  'Geotextiles', 'Polythene', 'Tarpaulins', 'Signage', 'Other'
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE UNITS OF MEASUREMENT FOR KENYA CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════
const UNITS = [
  // WEIGHT & MASS
  'kg', 'gram', 'tonne', 'ton',
  // VOLUME
  'liter', 'ml', 'cubic meter', 'cubic foot',
  // LENGTH
  'meter', 'mm', 'cm', 'foot', 'inch',
  // AREA
  'sqm', 'sqft', 'acre',
  // COUNT/QUANTITY
  'piece', 'unit', 'pair', 'dozen', 'set', 'bundle',
  // PACKAGING
  'bag', 'packet', 'carton', 'box', 'pallet', 'container',
  // SHEETS & ROLLS
  'sheet', 'roll', 'coil', 'reel',
  // BUILDING SPECIFIC
  'trip', 'lorry', 'wheelbarrow', 'head load',
  // LENGTH BUNDLES
  'length', 'bar', 'rod', 'pole',
  // LIQUID CONTAINERS
  'drum', 'jerrycan', 'bucket', 'tin',
  // OTHER
  'lot', 'job', 'day', 'hour'
];

export const SupplierProductManager: React.FC<SupplierProductManagerProps> = ({ supplierId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  // Form state with multiple images support
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    unit_price: '',
    image_url: '',
    additional_images: [] as string[], // Up to 4 additional angle images
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
        additional_images: formData.additional_images.filter(img => img), // Filter empty strings
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
        additional_images: [],
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
      additional_images: product.additional_images || [],
      in_stock: product.in_stock
    });
    setShowAddDialog(true);
  };

  // Handle image upload for main or additional images
  const handleImageUpload = async (file: File, index: number) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, WebP)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadingIndex(index);

    try {
      const fileName = `${supplierId}/${Date.now()}-${index}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (index === 0) {
        // Main image
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      } else {
        // Additional images (index 1-4)
        setFormData(prev => {
          const newAdditionalImages = [...prev.additional_images];
          newAdditionalImages[index - 1] = publicUrl;
          return { ...prev, additional_images: newAdditionalImages };
        });
      }

      toast({
        title: 'Image uploaded',
        description: index === 0 ? 'Main product image uploaded' : `Angle ${index} image uploaded`
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const removeImage = (index: number) => {
    if (index === 0) {
      setFormData(prev => ({ ...prev, image_url: '' }));
    } else {
      setFormData(prev => {
        const newAdditionalImages = [...prev.additional_images];
        newAdditionalImages[index - 1] = '';
        return { ...prev, additional_images: newAdditionalImages };
      });
    }
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
      additional_images: [],
      in_stock: true
    });
    setEditingProduct(null);
    setShowAddDialog(false);
  };

  // Image slot labels
  const imageSlots = [
    { index: 0, label: 'Main Photo', description: 'Front view' },
    { index: 1, label: 'Angle 2', description: 'Side view' },
    { index: 2, label: 'Angle 3', description: 'Back view' },
    { index: 3, label: 'Angle 4', description: 'Detail shot' },
    { index: 4, label: 'Angle 5', description: 'In use/context' },
  ];

  const getImageUrl = (index: number) => {
    if (index === 0) return formData.image_url;
    return formData.additional_images[index - 1] || '';
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
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                Upload product photos from all angles and set your price. Products require admin approval before appearing in the marketplace.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              {/* Product Images Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Product Photos (Upload from all angles)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Upload up to 5 photos showing your product from different angles. The first photo will be the main display image.
                </p>
                
                <div className="grid grid-cols-5 gap-3">
                  {imageSlots.map((slot) => {
                    const imageUrl = getImageUrl(slot.index);
                    const isUploading = uploading && uploadingIndex === slot.index;
                    
                    return (
                      <div key={slot.index} className="space-y-1">
                        <div 
                          className={`relative aspect-square rounded-lg border-2 border-dashed overflow-hidden cursor-pointer transition-all hover:border-orange-400 ${
                            slot.index === 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'
                          } ${imageUrl ? 'border-solid border-green-400' : ''}`}
                          onClick={() => !isUploading && fileInputRefs.current[slot.index]?.click()}
                        >
                          {isUploading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                            </div>
                          ) : imageUrl ? (
                            <>
                              <img src={imageUrl} alt={slot.label} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(slot.index); }}
                                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {slot.index === 0 && (
                                <Badge className="absolute bottom-1 left-1 bg-orange-600 text-[10px] px-1 py-0">Main</Badge>
                              )}
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                              <Upload className={`h-5 w-5 mb-1 ${slot.index === 0 ? 'text-orange-400' : 'text-gray-400'}`} />
                              <span className={`text-[10px] text-center ${slot.index === 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                                {slot.label}
                              </span>
                            </div>
                          )}
                          <input
                            ref={el => fileInputRefs.current[slot.index] = el}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, slot.index);
                              e.target.value = '';
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground">{slot.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Use default category image button */}
                {formData.category && !formData.image_url && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => { 
                      const d = getDefaultCategoryImage(formData.category); 
                      if(d) setFormData({...formData, image_url: d}); 
                    }}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Use Default Category Image
                  </Button>
                )}
              </div>

              {/* Product Details Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Product Details</Label>
                
                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name *</Label>
                  <Input
                    id="product-name"
                    placeholder="e.g., Portland Cement 50kg Bag"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Category and Unit Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Unit of Measurement *</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Input - Prominent */}
                <div className="space-y-2">
                  <Label htmlFor="product-price" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Price (KES) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KES</span>
                    <Input
                      id="product-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      className="pl-12 text-lg font-semibold h-12"
                      required
                    />
                    {formData.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        per {formData.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="product-description">Description (optional)</Label>
                  <Textarea
                    id="product-description"
                    placeholder="Describe your product, specifications, quality, brand, etc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="in-stock"
                    checked={formData.in_stock}
                    onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="in-stock" className="cursor-pointer">Product is currently in stock</Label>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Admin Approval Required</p>
                    <p className="text-sm text-amber-700">
                      Your product will be reviewed by our team before appearing in the marketplace. 
                      This usually takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={uploading || !formData.name || !formData.category || !formData.unit || !formData.unit_price}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : editingProduct ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Product
                    </>
                  )}
                </Button>
              </DialogFooter>
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
            const additionalImages = product.additional_images || [];
            const totalImages = 1 + additionalImages.filter(img => img).length;
            
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
                {/* Show image count if multiple */}
                {totalImages > 1 && (
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="bg-black/60 text-white">
                      <Camera className="h-3 w-3 mr-1" />
                      {totalImages} photos
                    </Badge>
                  </div>
                )}
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


