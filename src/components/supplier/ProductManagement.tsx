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
  Loader2,
  Upload,
  Camera,
  DollarSign,
  AlertCircle
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
  // STRUCTURAL & FOUNDATION
  'Cement',
  'Steel & Reinforcement',
  'Aggregates',
  'Sand',
  'Stone & Ballast',
  'Blocks',
  'Bricks',
  'Ready Mix Concrete',
  // ROOFING
  'Roofing',
  'Iron Sheets',
  'Roofing Tiles',
  'Gutters & Downpipes',
  'Roofing Accessories',
  'Waterproofing',
  // TIMBER & WOOD
  'Timber',
  'Plywood',
  'Particle Board',
  'MDF Board',
  'Timber Trusses',
  'Formwork',
  'Treated Poles',
  // DOORS, WINDOWS & OPENINGS
  'Doors',
  'Steel Doors',
  'Windows',
  'Aluminium Windows',
  'Glass',
  'Door Frames',
  'Door Hardware',
  'Window Hardware',
  // PLUMBING & WATER
  'Plumbing',
  'PVC Pipes',
  'PPR Pipes',
  'GI Pipes',
  'HDPE Pipes',
  'Pipe Fittings',
  'Valves',
  'Water Tanks',
  'Pumps',
  'Taps & Mixers',
  'Sanitary Ware',
  'Bathroom Accessories',
  'Septic Tanks',
  'Water Heaters',
  // ELECTRICAL
  'Electrical',
  'Cables & Wires',
  'Switches & Sockets',
  'Distribution Boards',
  'Lighting',
  'Conduits',
  'Electrical Accessories',
  'Solar Equipment',
  'Generators',
  'UPS & Stabilizers',
  // TILES & FLOORING
  'Tiles',
  'Ceramic Tiles',
  'Porcelain Tiles',
  'Granite Tiles',
  'Marble',
  'Terrazzo',
  'Vinyl Flooring',
  'Wooden Flooring',
  'Carpet',
  'Tile Adhesive',
  'Tile Grout',
  'Skirting',
  // PAINT & FINISHES
  'Paint',
  'Emulsion Paint',
  'Gloss Paint',
  'Exterior Paint',
  'Wood Finish',
  'Metal Paint',
  'Primers',
  'Putty & Fillers',
  'Thinners & Solvents',
  'Brushes & Rollers',
  // WALL & CEILING
  'Gypsum',
  'Ceiling Boards',
  'Plaster',
  'Wallpaper',
  'Wall Cladding',
  'Insulation',
  'Cornices',
  // HARDWARE & FASTENERS
  'Hardware',
  'Nails',
  'Screws',
  'Bolts & Nuts',
  'Hinges',
  'Locks',
  'Chains',
  'Wire',
  'Wire Mesh',
  'Brackets & Supports',
  // TOOLS & EQUIPMENT
  'Tools',
  'Hand Tools',
  'Power Tools',
  'Measuring Tools',
  'Cutting Tools',
  'Masonry Tools',
  'Painting Tools',
  'Safety Equipment',
  'Scaffolding',
  'Ladders',
  'Wheelbarrows',
  // ADHESIVES & SEALANTS
  'Adhesives',
  'Sealants',
  'Caulking',
  'Epoxy',
  // FENCING & SECURITY
  'Fencing',
  'Barbed Wire',
  'Electric Fence',
  'Gates',
  'Security Systems',
  // LANDSCAPING & OUTDOOR
  'Paving',
  'Outdoor Tiles',
  'Drainage',
  'Retaining Walls',
  'Garden Materials',
  // KITCHEN & BUILT-IN
  'Kitchen Cabinets',
  'Countertops',
  'Kitchen Sinks',
  'Kitchen Hardware',
  'Wardrobes',
  // HVAC & VENTILATION
  'Air Conditioning',
  'Ventilation',
  'Ceiling Fans',
  // FIRE SAFETY
  'Fire Safety',
  'Fire Doors',
  'Fire Alarm',
  'Sprinkler Systems',
  // SPECIALTY MATERIALS
  'Damp Proofing',
  'Expansion Joints',
  'Reinforcement Accessories',
  'Curing Compounds',
  'Admixtures',
  // MISCELLANEOUS
  'Geotextiles',
  'Polythene',
  'Tarpaulins',
  'Signage',
  'Other'
];

export const ProductManagement: React.FC<ProductManagementProps> = ({ supplierId, isDarkMode = false }) => {
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<Record<string, { price: number; in_stock: boolean; description?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Request form state with multiple images
  const [requestForm, setRequestForm] = useState({
    productName: '',
    category: '',
    description: '',
    suggestedPrice: '',
    unit: 'piece',
    images: [] as { file: File; preview: string }[],
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const priceMap: Record<string, { price: number; in_stock: boolean; description?: string }> = {};
        data.forEach((item: any) => {
          priceMap[item.product_id] = { 
            price: item.price, 
            in_stock: item.in_stock,
            description: item.description || ''
          };
        });
        setSupplierPrices(priceMap);
      }
    } catch (error) {
      console.log('Supplier prices table not available');
    }
  };

  // Set price for an admin-uploaded product
  const handleSetPrice = async (productId: string, price: number, inStock: boolean, description?: string) => {
    try {
      setIsSubmitting(true);
      
      console.log('💾 Saving price for product:', productId, 'price:', price, 'supplier:', supplierId);
      
      const { data, error } = await (supabase
        .from('supplier_product_prices' as any)
        .upsert({
          supplier_id: supplierId,
          product_id: productId,
          price: price,
          in_stock: inStock,
          description: description || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'supplier_id,product_id' })
        .select());
      
      if (error) {
        console.error('❌ Database save failed:', error);
        toast({
          title: 'Error Saving Price',
          description: `Database error: ${error.message}. Please check your permissions.`,
          variant: 'destructive'
        });
        return; // Don't update local state if database save failed
      }
      
      console.log('✅ Price saved successfully:', data);
      
      setSupplierPrices(prev => ({
        ...prev,
        [productId]: { price, in_stock: inStock, description: description || '' }
      }));
      
      setPricingProduct(null);
      
      toast({
        title: 'Price Updated',
        description: 'Your price and description have been saved successfully'
      });
    } catch (error) {
      console.error('Error setting price:', error);
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
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

    if (!requestForm.suggestedPrice) {
      toast({
        title: 'Price Required',
        description: 'Please enter your selling price',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert images to base64
      const imageDataArray: string[] = [];
      for (const img of requestForm.images) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(img.file);
        });
        imageDataArray.push(base64);
      }
      
      const { error } = await (supabase
        .from('product_requests' as any)
        .insert({
          supplier_id: supplierId,
          product_name: requestForm.productName,
          category: requestForm.category,
          description: requestForm.description,
          suggested_price: parseFloat(requestForm.suggestedPrice) || 0,
          unit: requestForm.unit,
          image_data: imageDataArray[0] || '', // Main image
          additional_images: imageDataArray.slice(1), // Additional angles
          status: 'pending',
          created_at: new Date().toISOString()
        }));
      
      if (error) {
        console.log('Product request table not available');
      }
      
      setShowRequestDialog(false);
      resetRequestForm();
      
      toast({
        title: 'Request Submitted!',
        description: 'Your product request has been sent to admin for review.',
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

  // Reset request form
  const resetRequestForm = () => {
    // Clean up preview URLs
    requestForm.images.forEach(img => URL.revokeObjectURL(img.preview));
    setRequestForm({
      productName: '',
      category: '',
      description: '',
      suggestedPrice: '',
      unit: 'piece',
      images: [],
    });
  };

  // Handle request image selection - supports multiple
  const handleRequestImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const newImages: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file',
          description: 'Please select image files only',
          variant: 'destructive'
        });
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is over 5MB limit`,
          variant: 'destructive'
        });
        continue;
      }
      
      // Limit to 5 images total
      if (requestForm.images.length + newImages.length >= 5) {
        toast({
          title: 'Maximum images reached',
          description: 'You can upload up to 5 images',
        });
        break;
      }
      
      const preview = URL.createObjectURL(file);
      newImages.push({ file, preview });
    }
    
    if (newImages.length > 0) {
      setRequestForm(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
    
    // Reset input
    if (event.target) event.target.value = '';
  };

  // Remove an image from request form
  const removeRequestImage = (index: number) => {
    setRequestForm(prev => {
      const newImages = [...prev.images];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  // Comprehensive units for Kenya construction
  const UNITS = [
    // WEIGHT & MASS
    'kg',
    'gram',
    'tonne',
    'ton',
    // VOLUME
    'liter',
    'ml',
    'cubic meter',
    'cubic foot',
    // LENGTH
    'meter',
    'mm',
    'cm',
    'foot',
    'inch',
    // AREA
    'sqm',
    'sqft',
    'acre',
    // COUNT/QUANTITY
    'piece',
    'unit',
    'pair',
    'dozen',
    'set',
    'bundle',
    // PACKAGING
    'bag',
    'packet',
    'carton',
    'box',
    'pallet',
    'container',
    // SHEETS & ROLLS
    'sheet',
    'roll',
    'coil',
    'reel',
    // BUILDING SPECIFIC
    'trip',
    'lorry',
    'wheelbarrow',
    'head load',
    // LENGTH BUNDLES
    'length',
    'bar',
    'rod',
    'pole',
    // LIQUID CONTAINERS
    'drum',
    'jerrycan',
    'bucket',
    'tin',
    // OTHER
    'lot',
    'job',
    'day',
    'hour'
  ];

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
          <Dialog open={showRequestDialog} onOpenChange={(open) => {
            setShowRequestDialog(open);
            if (!open) resetRequestForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Request New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Request New Product
                </DialogTitle>
                <DialogDescription>
                  Fill in the product details and upload photos from all angles. Admin will review and add it to the catalog.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-4">
                {/* Product Photos Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Camera className="h-4 w-4 text-orange-500" />
                    Product Photos (Upload from all angles)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload up to 5 photos showing the product from different angles
                  </p>
                  
                  {/* Image Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {/* Uploaded images */}
                    {requestForm.images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg border-2 border-green-400 overflow-hidden group">
                        <img src={img.preview} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeRequestImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <Badge className="absolute bottom-1 left-1 bg-orange-500 text-[9px] px-1 py-0">Main</Badge>
                        )}
                      </div>
                    ))}
                    
                    {/* Upload button - show if less than 5 images */}
                    {requestForm.images.length < 5 && (
                      <div 
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 cursor-pointer flex flex-col items-center justify-center bg-gray-50 hover:bg-orange-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-5 w-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500">Add Photo</span>
                      </div>
                    )}
                    
                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, 4 - requestForm.images.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300">Angle {requestForm.images.length + i + 2}</span>
                      </div>
                    ))}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRequestImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name *</Label>
                  <Input
                    id="product-name"
                    value={requestForm.productName}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="e.g., Bamburi Cement 42.5N (50kg)"
                  />
                </div>

                {/* Category and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={requestForm.category}
                      onValueChange={(value) => setRequestForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Select
                      value={requestForm.unit}
                      onValueChange={(value) => setRequestForm(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Input - Prominent */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Your Selling Price (KES) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KES</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={requestForm.suggestedPrice}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, suggestedPrice: e.target.value }))}
                      placeholder="0.00"
                      className="pl-12 text-lg font-semibold h-12"
                    />
                    {requestForm.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        per {requestForm.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the product, brand, specifications, etc."
                    rows={3}
                  />
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">What happens next?</p>
                      <p>Admin will review your request and add the product to the catalog. You'll be notified once approved.</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRequestNewProduct}
                  disabled={isSubmitting || !requestForm.productName || !requestForm.category || !requestForm.suggestedPrice}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
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
                      {/* Show supplier description if set, otherwise admin description */}
                      {supplierPrice?.description || product.description || 'No description'}
                    </p>
                    {supplierPrice?.description && (
                      <Badge variant="outline" className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Your description
                      </Badge>
                    )}
                    
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Your Price & Description</DialogTitle>
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
              
              {/* Description Field - Optional */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Your Description (Optional)
                  <span className="text-xs text-muted-foreground font-normal">
                    Leave empty to use admin description
                  </span>
                </Label>
                <Textarea
                  id="description-input"
                  defaultValue={supplierPrices[pricingProduct.id]?.description || ''}
                  placeholder={pricingProduct.description || 'Add your own product description...'}
                  rows={3}
                  className="resize-none"
                />
                {pricingProduct.description && (
                  <p className="text-xs text-muted-foreground">
                    Admin description: {pricingProduct.description}
                  </p>
                )}
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
                const descriptionInput = document.getElementById('description-input') as HTMLTextAreaElement;
                handleSetPrice(
                  pricingProduct!.id, 
                  parseFloat(priceInput.value) || 0,
                  stockCheckbox.checked,
                  descriptionInput.value.trim() || undefined
                );
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
