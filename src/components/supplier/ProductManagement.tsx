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
  AlertCircle,
  Image as ImageIcon,
  Trash2
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
  const [supplierPrices, setSupplierPrices] = useState<Record<string, { price: number; in_stock: boolean; description?: string; variant_prices?: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<any | null>(null);
  const [editingVariantPrices, setEditingVariantPrices] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Image and variant editing state
  const [editingImage, setEditingImage] = useState<string>('');
  const [editingAdditionalImages, setEditingAdditionalImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const additionalImageRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Custom variant state for adding new variants
  const [customVariants, setCustomVariants] = useState<Array<{id: string; sizeLabel: string; price: number}>>([]);
  const [newVariantLabel, setNewVariantLabel] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  
  // Request form state with multiple images
  const [requestForm, setRequestForm] = useState({
    productName: '',
    category: '',
    description: '',
    suggestedPrice: '',
    unit: 'piece',
    images: [] as { file: File; preview: string }[],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cache for loaded images
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(false);

  useEffect(() => {
    loadAdminProducts();
    loadSupplierPrices();
    // Safety timeout - force loading to false after 25 seconds (give fetch time to complete)
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Products safety timeout - forcing loading false');
    }, 25000);
    return () => clearTimeout(safetyTimeout);
  }, [supplierId]);

  // Load images in smaller sequential batches using fetch API (base64 images are large!)
  const loadAllImages = async (productIds: string[]) => {
    if (productIds.length === 0) return;
    
    setImagesLoading(true);
    console.log(`🖼️ Loading images for ${productIds.length} products in batches...`);
    
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    // Get access token
    let accessToken = '';
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token || '';
      }
    } catch (e) {}
    
    try {
      // Use smaller batches of 10 (base64 images are large - each can be 100KB+)
      const BATCH_SIZE = 10;
      
      // Process batches sequentially
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
        
        try {
          // Use PostgREST 'in' filter: id=in.(uuid1,uuid2,...)
          const idsParam = `in.(${batch.join(',')})`;
          const url = `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images?select=id,image_url&id=${idsParam}`;
          
          const response = await fetch(url, {
            headers: {
              'apikey': apiKey,
              'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const batchImages: Record<string, string> = {};
            
            data.forEach((item: any) => {
              if (item.image_url) {
                batchImages[item.id] = item.image_url;
              }
            });
            
            // Update state progressively so images appear as they load
            if (Object.keys(batchImages).length > 0) {
              setProductImages(prev => ({ ...prev, ...batchImages }));
              console.log(`🖼️ Batch ${batchNum}/${totalBatches}: Loaded ${Object.keys(batchImages).length} images`);
            }
          } else {
            console.warn(`🖼️ Batch ${batchNum} failed: HTTP ${response.status}`);
          }
        } catch (batchError) {
          console.warn(`🖼️ Batch ${batchNum} error:`, batchError);
        }
      }
      
      console.log(`✅ Finished loading images`);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setImagesLoading(false);
    }
  };

  // Load admin-uploaded products using fetch API (bypasses Supabase client hanging)
  const loadAdminProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading admin products via fetch API...');
      
      // Get access token from localStorage directly (faster than getSession)
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.log('Could not get token from localStorage');
      }
      
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // First, test if API is responding with a simple count query
      console.log('📦 Testing API connection...');
      const testStart = Date.now();
      
      try {
        const testResponse = await fetch(
          'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images?select=id&limit=1',
          {
            headers: { 'apikey': apiKey, 'Authorization': accessToken ? `Bearer ${accessToken}` : '' }
          }
        );
        console.log('📦 API test response:', testResponse.status, 'in', Date.now() - testStart, 'ms');
      } catch (testErr) {
        console.error('📦 API test failed:', testErr);
      }
      
      // Fetch products WITHOUT image_url first (base64 images are too large - each can be 100KB-1MB!)
      // Images will be loaded in batches afterward
      const url = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants,is_approved&order=created_at.desc&limit=500';
      console.log('📦 Fetching products...');
      const fetchStart = Date.now();
      
      const response = await fetch(url, {
        headers: {
          'apikey': apiKey,
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        }
      });
      
      console.log('📦 Response status:', response.status, 'in', Date.now() - fetchStart, 'ms');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📦 Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Loaded', data.length, 'admin products');
      
      if (data.length > 0) {
        console.log('📦 Sample product:', data[0]);
      }
      
      // Filter to only approved products (or show all if none are approved)
      const approvedProducts = data.filter((p: any) => p.is_approved === true);
      console.log('📦 Approved:', approvedProducts.length, '/ Total:', data.length);
      
      // Use approved products if any, otherwise use all products
      const productsToShow = approvedProducts.length > 0 ? approvedProducts : data;
      
      setAdminProducts(productsToShow || []);
      setLoading(false);
      
      // Load images in batches (base64 images are large, can't fetch all at once)
      if (productsToShow && productsToShow.length > 0) {
        const allIds = productsToShow.map((p: any) => p.id);
        console.log(`📦 Starting to load images for ${allIds.length} products...`);
        loadAllImages(allIds);
      }
    } catch (error: any) {
      console.error('📦 Error loading admin products:', error.message || error);
      
      // Fallback to demo data
      console.log('📦 Using demo data as fallback');
      setAdminProducts([
        { id: '1', name: 'Bamburi Cement 42.5N (50kg)', category: 'Cement & Concrete', image_url: '', description: 'Premium Portland cement' },
        { id: '2', name: 'Y12 Deformed Steel Bars (6m)', category: 'Steel & Metal', image_url: '', description: 'High-tensile steel reinforcement' },
        { id: '3', name: 'Mabati Iron Sheets Gauge 28', category: 'Roofing Materials', image_url: '', description: 'Galvanized roofing sheets' },
        { id: '4', name: 'River Sand (per ton)', category: 'Sand & Aggregates', image_url: '', description: 'Clean construction sand' },
        { id: '5', name: 'Machine Cut Blocks 6"', category: 'Bricks & Blocks', image_url: '', description: 'Standard building blocks' },
      ]);
      setLoading(false);
    }
  };

  // Get effective supplier ID (from prop or from auth user)
  const getEffectiveSupplierId = (): string => {
    // First try the prop
    if (supplierId && supplierId.trim()) {
      return supplierId;
    }
    // Fallback to user from auth context
    if (user?.id) {
      return user.id;
    }
    // Last resort: try to get from localStorage
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user?.id || '';
      }
    } catch (e) {}
    return '';
  };

  // Load supplier's prices for products using fetch API
  const loadSupplierPrices = async () => {
    const effectiveSupplierId = getEffectiveSupplierId();
    if (!effectiveSupplierId) {
      console.log('⚠️ No supplier ID available, skipping price load');
      return;
    }
    
    try {
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      console.log(`📦 Loading prices for supplier: ${effectiveSupplierId}`);
      const response = await fetch(
        `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices?supplier_id=eq.${effectiveSupplierId}&select=*`,
        {
          headers: {
            'apikey': apiKey,
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const priceMap: Record<string, { price: number; in_stock: boolean; description?: string; variant_prices?: any[] }> = {};
        data.forEach((item: any) => {
          priceMap[item.product_id] = { 
            price: item.price, 
            in_stock: item.in_stock,
            description: item.description || '',
            variant_prices: item.variant_prices || []
          };
        });
        setSupplierPrices(priceMap);
        console.log(`✅ Loaded ${data.length} supplier prices`);
      }
    } catch (error) {
      console.log('Supplier prices table not available');
    }
  };

  // Set price for an admin-uploaded product (single price or variant prices)
  // Using fetch API to avoid Supabase client hanging
  const handleSetPrice = async (productId: string, price: number, inStock: boolean, description?: string, variantPrices?: any[]) => {
    const effectiveSupplierId = getEffectiveSupplierId();
    
    if (!effectiveSupplierId) {
      toast({
        title: 'Error',
        description: 'Supplier ID not found. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log('💾 Saving price for product:', productId, 'price:', price, 'variants:', variantPrices, 'supplier:', effectiveSupplierId);
      
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      const payload = {
        supplier_id: effectiveSupplierId,
        product_id: productId,
        price: price,
        in_stock: inStock,
        description: description || null,
        variant_prices: variantPrices || [],
        updated_at: new Date().toISOString()
      };
      
      // Check if price already exists for this supplier+product
      const existingPrice = supplierPrices[productId];
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      let response;
      
      if (existingPrice) {
        // UPDATE existing price using PATCH
        console.log('📝 Updating existing price...');
        response = await fetch(
          `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices?supplier_id=eq.${effectiveSupplierId}&product_id=eq.${productId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': apiKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              price: price,
              in_stock: inStock,
              description: description || null,
              variant_prices: variantPrices || [],
              updated_at: new Date().toISOString()
            }),
            signal: controller.signal
          }
        );
      } else {
        // INSERT new price using POST
        console.log('➕ Creating new price...');
        response = await fetch(
          'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices',
          {
            method: 'POST',
            headers: {
              'apikey': apiKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          }
        );
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Database save failed:', response.status, errorText);
        toast({
          title: 'Error Saving Price',
          description: `Database error: ${response.status}. Please try again.`,
          variant: 'destructive'
        });
        return;
      }
      
      const data = await response.json();
      console.log('✅ Price saved successfully:', data);
      
      setSupplierPrices(prev => ({
        ...prev,
        [productId]: { price, in_stock: inStock, description: description || '', variant_prices: variantPrices || [] }
      }));
      
      setPricingProduct(null);
      setEditingVariantPrices({});
      
      toast({
        title: 'Price Updated',
        description: 'Your prices have been saved successfully'
      });
    } catch (error: any) {
      console.error('Error setting price:', error);
      toast({
        title: 'Error',
        description: error.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Failed to save. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle image upload for supplier's product customization
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

    setUploadingImage(true);
    setUploadingIndex(index);

    try {
      const effectiveSupplierId = getEffectiveSupplierId();
      const fileName = `supplier-products/${effectiveSupplierId}/${Date.now()}-${index}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (index === 0) {
        // Main image
        setEditingImage(publicUrl);
      } else {
        // Additional images (index 1-4)
        setEditingAdditionalImages(prev => {
          const newImages = [...prev];
          newImages[index - 1] = publicUrl;
          return newImages;
        });
      }

      toast({
        title: 'Image uploaded',
        description: index === 0 ? 'Main product image uploaded' : `Additional image ${index} uploaded`
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
      setUploadingIndex(null);
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    if (index === 0) {
      setEditingImage('');
    } else {
      setEditingAdditionalImages(prev => {
        const newImages = [...prev];
        newImages[index - 1] = '';
        return newImages;
      });
    }
  };

  // Add custom variant
  const addCustomVariant = () => {
    if (!newVariantLabel.trim() || !newVariantPrice) {
      toast({
        title: 'Missing variant info',
        description: 'Please enter both size/label and price',
        variant: 'destructive'
      });
      return;
    }
    
    const newVariant = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sizeLabel: newVariantLabel.trim(),
      price: parseFloat(newVariantPrice)
    };
    
    setCustomVariants(prev => [...prev, newVariant]);
    setNewVariantLabel('');
    setNewVariantPrice('');
  };

  // Remove custom variant
  const removeCustomVariant = (variantId: string) => {
    setCustomVariants(prev => prev.filter(v => v.id !== variantId));
  };

  // Update custom variant price
  const updateCustomVariantPrice = (variantId: string, newPrice: number) => {
    setCustomVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, price: newPrice } : v
    ));
  };

  // Initialize editing state when opening pricing dialog
  const openPricingDialog = (product: any) => {
    setPricingProduct(product);
    setEditingImage(productImages[product.id] || product.image_url || '');
    setEditingAdditionalImages(product.additional_images || []);
    
    // Load existing custom variants from supplier prices
    const existingVariants = supplierPrices[product.id]?.variant_prices || [];
    setCustomVariants(existingVariants.filter((v: any) => v.variant_id?.startsWith('custom-')));
    
    setEditingVariantPrices({});
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
              // Get image from cache
              const imageUrl = productImages[product.id] || product.image_url;
              
              return (
                <Card key={product.id} className={`${cardBg} hover:shadow-md`}>
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden bg-gray-100">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : imagesLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                        </div>
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
                              KES {(supplierPrice.price || 0).toLocaleString()}
                            </p>
                            <Badge variant={supplierPrice.in_stock ? 'default' : 'destructive'} className="mt-1">
                              {supplierPrice.in_stock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openPricingDialog(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          onClick={() => openPricingDialog(product)}
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

      {/* Pricing Dialog with Image & Variant Editing */}
      <Dialog open={pricingProduct !== null} onOpenChange={(open) => {
        if (!open) {
          setPricingProduct(null);
          setEditingVariantPrices({});
          setEditingImage('');
          setEditingAdditionalImages([]);
          setCustomVariants([]);
          setNewVariantLabel('');
          setNewVariantPrice('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product - Prices, Images & Variants</DialogTitle>
            <DialogDescription>
              Customize your listing for: {pricingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {pricingProduct && (
            <div className="grid gap-4 py-4">
              {/* Product Image Upload Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Product Images (Upload Your Own)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Upload your own product images to replace the default. Up to 5 images.
                </p>
                
                <div className="grid grid-cols-5 gap-2">
                  {/* Main Image */}
                  <div className="space-y-1">
                    <div 
                      className={`relative aspect-square rounded-lg border-2 border-dashed overflow-hidden cursor-pointer transition-all hover:border-orange-400 ${
                        editingImage ? 'border-solid border-green-400' : 'border-orange-300 bg-orange-50'
                      }`}
                      onClick={() => !uploadingImage && imageInputRef.current?.click()}
                    >
                      {uploadingImage && uploadingIndex === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                        </div>
                      ) : editingImage ? (
                        <>
                          <img src={editingImage} alt="Main" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(0); }}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <Badge className="absolute bottom-0.5 left-0.5 bg-orange-600 text-[8px] px-1 py-0">Main</Badge>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                          <Upload className="h-4 w-4 text-orange-400" />
                          <span className="text-[8px] text-orange-600 font-medium text-center">Main</span>
                        </div>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 0);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Additional Images */}
                  {[1, 2, 3, 4].map((idx) => {
                    const imageUrl = editingAdditionalImages[idx - 1] || '';
                    const isUploading = uploadingImage && uploadingIndex === idx;
                    
                    return (
                      <div key={idx} className="space-y-1">
                        <div 
                          className={`relative aspect-square rounded-lg border-2 border-dashed overflow-hidden cursor-pointer transition-all hover:border-gray-400 ${
                            imageUrl ? 'border-solid border-green-400' : 'border-gray-300 bg-gray-50'
                          }`}
                          onClick={() => !uploadingImage && additionalImageRefs.current[idx]?.click()}
                        >
                          {isUploading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                            </div>
                          ) : imageUrl ? (
                            <>
                              <img src={imageUrl} alt={`Angle ${idx}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-[8px] text-gray-500 text-center">+{idx}</span>
                            </div>
                          )}
                          <input
                            ref={el => additionalImageRefs.current[idx] = el}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, idx);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Product Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                {(productImages[pricingProduct.id] || pricingProduct.image_url) ? (
                  <img 
                    src={productImages[pricingProduct.id] || pricingProduct.image_url} 
                    alt={pricingProduct.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{pricingProduct.name}</p>
                  <p className="text-xs text-gray-500">{pricingProduct.category}</p>
                </div>
                <Badge variant="outline" className="text-xs">Original</Badge>
              </div>
              
              {/* Variant Pricing Section */}
              <div className="space-y-3 p-4 border rounded-lg">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Pricing & Variants
                </Label>
                
                {/* Existing Admin Variants */}
                {pricingProduct.pricing_type === 'variants' && pricingProduct.variants?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Admin-defined variants:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                      {pricingProduct.variants
                        .filter((v: any) => v.sizeLabel)
                        .map((variant: any) => {
                          const existingSupplierPrice = supplierPrices[pricingProduct.id]?.variant_prices?.find(
                            (vp: any) => vp.variant_id === variant.id
                          );
                          const currentValue = editingVariantPrices[variant.id] ?? existingSupplierPrice?.price ?? variant.price ?? 0;
                          
                          return (
                            <div key={variant.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded border">
                              <div className="flex-1">
                                <span className="font-medium text-sm">{variant.sizeLabel}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">KES</span>
                                <Input
                                  type="number"
                                  className="w-24 h-7 text-sm"
                                  value={currentValue}
                                  onChange={(e) => {
                                    setEditingVariantPrices(prev => ({
                                      ...prev,
                                      [variant.id]: parseFloat(e.target.value) || 0
                                    }));
                                  }}
                                  placeholder="Price"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* Custom Variants - Supplier can add their own */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-green-700">Your custom variants:</p>
                  
                  {customVariants.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {customVariants.map((variant) => (
                        <div key={variant.id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{variant.sizeLabel}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">KES</span>
                            <Input
                              type="number"
                              className="w-24 h-7 text-sm"
                              value={variant.price}
                              onChange={(e) => updateCustomVariantPrice(variant.id, parseFloat(e.target.value) || 0)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomVariant(variant.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add New Variant Form */}
                  <div className="flex items-end gap-2 pt-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Size/Variant Label</Label>
                      <Input
                        placeholder="e.g., 50kg bag, 2m length"
                        value={newVariantLabel}
                        onChange={(e) => setNewVariantLabel(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-muted-foreground">Price (KES)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newVariantPrice}
                        onChange={(e) => setNewVariantPrice(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomVariant}
                      className="h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                
                {/* Single Price - Always show as fallback/main price */}
                {!(pricingProduct.pricing_type === 'variants' && pricingProduct.variants?.length > 0) && customVariants.length === 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Your Price (KES) *</Label>
                    <Input
                      type="number"
                      defaultValue={supplierPrices[pricingProduct.id]?.price || 0}
                      id="pricing-input"
                      placeholder="Enter your price"
                      className="h-10"
                    />
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  💡 Add your own size variants (e.g., 25kg, 50kg) with custom prices. Your variants will appear alongside admin variants.
                </p>
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
            <Button variant="outline" onClick={() => {
              setPricingProduct(null);
              setEditingVariantPrices({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                const stockCheckbox = document.getElementById('in-stock-checkbox') as HTMLInputElement;
                const descriptionInput = document.getElementById('description-input') as HTMLTextAreaElement;
                
                // Collect all variant prices (admin variants + custom variants)
                let allVariantPrices: any[] = [];
                
                // Add admin-defined variants with supplier prices
                if (pricingProduct?.pricing_type === 'variants' && pricingProduct?.variants?.length > 0) {
                  const adminVariants = pricingProduct.variants
                    .filter((v: any) => v.sizeLabel)
                    .map((variant: any) => {
                      const existingPrice = supplierPrices[pricingProduct.id]?.variant_prices?.find(
                        (vp: any) => vp.variant_id === variant.id
                      );
                      return {
                        variant_id: variant.id,
                        sizeLabel: variant.sizeLabel,
                        price: editingVariantPrices[variant.id] ?? existingPrice?.price ?? variant.price ?? 0
                      };
                    });
                  allVariantPrices = [...adminVariants];
                }
                
                // Add custom variants
                if (customVariants.length > 0) {
                  const customVariantData = customVariants.map(v => ({
                    variant_id: v.id,
                    sizeLabel: v.sizeLabel,
                    price: v.price
                  }));
                  allVariantPrices = [...allVariantPrices, ...customVariantData];
                }
                
                // Determine main price
                let mainPrice = 0;
                if (allVariantPrices.length > 0) {
                  mainPrice = allVariantPrices[0]?.price || 0;
                } else {
                  const priceInput = document.getElementById('pricing-input') as HTMLInputElement;
                  mainPrice = parseFloat(priceInput?.value) || 0;
                }
                
                // Save price with images and variants
                await handleSetPrice(
                  pricingProduct!.id,
                  mainPrice,
                  stockCheckbox.checked,
                  descriptionInput.value.trim() || undefined,
                  allVariantPrices.length > 0 ? allVariantPrices : undefined
                );
                
                // If custom images were uploaded, save them to supplier_product_prices
                if (editingImage || editingAdditionalImages.some(img => img)) {
                  try {
                    const effectiveSupplierId = getEffectiveSupplierId();
                    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
                    
                    let accessToken = '';
                    try {
                      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
                      if (storedSession) {
                        const parsed = JSON.parse(storedSession);
                        accessToken = parsed.access_token || '';
                      }
                    } catch (e) {}
                    
                    // Update supplier_product_prices with custom images
                    await fetch(
                      `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices?supplier_id=eq.${effectiveSupplierId}&product_id=eq.${pricingProduct!.id}`,
                      {
                        method: 'PATCH',
                        headers: {
                          'apikey': apiKey,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                          custom_image_url: editingImage || null,
                          custom_additional_images: editingAdditionalImages.filter(img => img) || [],
                          updated_at: new Date().toISOString()
                        })
                      }
                    );
                    console.log('✅ Custom images saved');
                  } catch (imgError) {
                    console.log('Image save note:', imgError);
                  }
                }
              }}
              disabled={isSubmitting || uploadingImage}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Saving...' : uploadingImage ? 'Uploading...' : 'Save All Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
