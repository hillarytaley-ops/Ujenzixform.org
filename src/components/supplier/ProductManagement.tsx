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
 * ║   │  4. SUPPLIER uploads catalog requests (photos, variants, prices, units)    │   ║
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
 * ║   │  ✅ Upload reference photos + variants on "Upload material" request        │   ║
 * ║   │  ❌ Delete products (admin only)                                           │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Remove supplier catalog-request uploads (photos / variants) without replacement ║
 * ║   - Allow suppliers to delete admin-uploaded products                              ║
 * ║   - Remove the catalog material request flow                                       ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
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
  Trash2,
  Layers
} from "lucide-react";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
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
  const [supplierPrices, setSupplierPrices] = useState<
    Record<
      string,
      {
        price: number;
        market_price?: number;
        in_stock: boolean;
        description?: string;
        variant_prices?: any[];
        etims_item_code?: string | null;
      }
    >
  >({});
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
  
  type RequestVariantRow = { id: string; name: string; color: string; price: string; unit: string };

  // Request form: multi-angle photos + optional variants (size/color/price/unit)
  const [requestForm, setRequestForm] = useState({
    productName: '',
    category: '',
    description: '',
    suggestedPrice: '',
    unit: 'piece',
    images: [] as { file: File; preview: string }[],
    variants: [] as RequestVariantRow[],
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
    // Get access token
    let accessToken = '';
    try {
      const storedSession = readPersistedAuthRawStringSync();
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
              'apikey': SUPABASE_ANON_KEY,
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
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.log('Could not get token from localStorage');
      }
      // First, test if API is responding with a simple count query
      console.log('📦 Testing API connection...');
      const testStart = Date.now();
      
      try {
        const testResponse = await fetch(
          'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images?select=id&limit=1',
          {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': accessToken ? `Bearer ${accessToken}` : '' }
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
          'apikey': SUPABASE_ANON_KEY,
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
      const storedSession = readPersistedAuthRawStringSync();
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
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
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
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const priceMap: Record<
          string,
          {
            price: number;
            market_price: number;
            in_stock: boolean;
            description?: string;
            variant_prices?: any[];
            etims_item_code?: string | null;
          }
        > = {};
        data.forEach((item: any) => {
          priceMap[item.product_id] = {
            price: item.price,
            market_price: item.market_price || 0,
            in_stock: item.in_stock,
            description: item.description || '',
            variant_prices: item.variant_prices || [],
            etims_item_code:
              typeof item.etims_item_code === 'string' && item.etims_item_code.trim()
                ? item.etims_item_code.trim()
                : null,
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
  const handleSetPrice = async (
    productId: string,
    price: number,
    inStock: boolean,
    description?: string,
    variantPrices?: any[],
    marketPrice?: number,
    etimsItemCode?: string | null,
  ) => {
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
      // Get access token
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      const etimsPayload =
        typeof etimsItemCode === 'string' && etimsItemCode.trim() ? etimsItemCode.trim() : null;

      const payload = {
        supplier_id: effectiveSupplierId,
        product_id: productId,
        price: price,
        market_price: marketPrice || 0,
        in_stock: inStock,
        description: description || null,
        variant_prices: variantPrices || [],
        etims_item_code: etimsPayload,
        updated_at: new Date().toISOString(),
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
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              price: price,
              market_price: marketPrice || 0,
              in_stock: inStock,
              description: description || null,
              variant_prices: variantPrices || [],
              etims_item_code: etimsPayload,
              updated_at: new Date().toISOString(),
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
              'apikey': SUPABASE_ANON_KEY,
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
        
        // Check if the error is about missing market_price column
        if (errorText.includes('market_price') && (errorText.includes('could not find') || errorText.includes('does not exist'))) {
          console.log('💡 market_price column not found, retrying without it...');
          
          // Retry without market_price
          const retryPayload = existingPrice
            ? {
                price: price,
                in_stock: inStock,
                description: description || null,
                variant_prices: variantPrices || [],
                etims_item_code: etimsPayload,
                updated_at: new Date().toISOString(),
              }
            : {
                supplier_id: effectiveSupplierId,
                product_id: productId,
                price: price,
                in_stock: inStock,
                description: description || null,
                variant_prices: variantPrices || [],
                etims_item_code: etimsPayload,
                updated_at: new Date().toISOString(),
              };
          
          const retryResponse = await fetch(
            existingPrice 
              ? `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices?supplier_id=eq.${effectiveSupplierId}&product_id=eq.${productId}`
              : 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices',
            {
              method: existingPrice ? 'PATCH' : 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(retryPayload)
            }
          );
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            console.error('❌ Retry also failed:', retryResponse.status, retryErrorText);
            toast({
              title: 'Error Saving Price',
              description: `Database error: ${retryResponse.status}. Please try again.`,
              variant: 'destructive'
            });
            return;
          }
          
          const retryData = await retryResponse.json();
          console.log('✅ Price saved successfully (without market_price):', retryData);
          
          setSupplierPrices(prev => ({
            ...prev,
            [productId]: {
              price,
              market_price: 0,
              in_stock: inStock,
              description: description || '',
              variant_prices: variantPrices || [],
              etims_item_code: etimsPayload,
            },
          }));

          setPricingProduct(null);
          setEditingVariantPrices({});

          toast({
            title: 'Price Updated',
            description: 'Selling price saved. Note: Market price tracking requires a database update.',
          });
          return;
        }

        if (
          errorText.includes('etims_item_code') &&
          (errorText.includes('could not find') || errorText.includes('does not exist'))
        ) {
          console.log('💡 etims_item_code column not found, retrying without it...');
          const retryPayloadNoEtims = existingPrice
            ? {
                price,
                market_price: marketPrice || 0,
                in_stock: inStock,
                description: description || null,
                variant_prices: variantPrices || [],
                updated_at: new Date().toISOString(),
              }
            : {
                supplier_id: effectiveSupplierId,
                product_id: productId,
                price,
                market_price: marketPrice || 0,
                in_stock: inStock,
                description: description || null,
                variant_prices: variantPrices || [],
                updated_at: new Date().toISOString(),
              };

          const retryEtimsResponse = await fetch(
            existingPrice
              ? `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices?supplier_id=eq.${effectiveSupplierId}&product_id=eq.${productId}`
              : 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/supplier_product_prices',
            {
              method: existingPrice ? 'PATCH' : 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify(retryPayloadNoEtims),
            },
          );

          if (!retryEtimsResponse.ok) {
            const retryEtimsErr = await retryEtimsResponse.text();
            console.error('❌ Retry without etims_item_code failed:', retryEtimsResponse.status, retryEtimsErr);
            toast({
              title: 'Error Saving Price',
              description: `Database error: ${retryEtimsResponse.status}. Please try again.`,
              variant: 'destructive',
            });
            return;
          }

          await retryEtimsResponse.json();
          setSupplierPrices(prev => ({
            ...prev,
            [productId]: {
              price,
              market_price: marketPrice || 0,
              in_stock: inStock,
              description: description || '',
              variant_prices: variantPrices || [],
              etims_item_code: null,
            },
          }));

          setPricingProduct(null);
          setEditingVariantPrices({});

          toast({
            title: 'Price Updated',
            description:
              'Selling price saved. eTIMS item code requires a database migration; your code was not stored.',
          });
          return;
        }

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
        [productId]: {
          price,
          market_price: marketPrice || 0,
          in_stock: inStock,
          description: description || '',
          variant_prices: variantPrices || [],
          etims_item_code: etimsPayload,
        },
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

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });

  /** PostgREST 400 when new columns are missing (migration not applied yet). */
  const isProductRequestsSchemaMismatch = (err: { message?: string; code?: string } | null) => {
    if (!err?.message) return false;
    const m = err.message.toLowerCase();
    return (
      err.code === 'PGRST204' ||
      (m.includes('column') && (m.includes('could not find') || m.includes('does not exist'))) ||
      m.includes('schema cache')
    );
  };

  /** Upload to product-images/supplier-material-requests/{auth.uid()}/…; fall back to data URL if storage fails */
  const uploadMaterialRequestImages = async (images: { file: File }[]): Promise<string[]> => {
    const uid = user?.id;
    const out: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i].file;
      if (uid) {
        const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
        const path = `supplier-material-requests/${uid}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(path);
          out.push(data.publicUrl);
          continue;
        }
        console.warn('Storage upload failed, using inline image:', error.message);
      }
      out.push(await fileToDataUrl(file));
    }
    return out;
  };

  const addRequestVariantRow = () => {
    setRequestForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: '',
          color: '',
          price: '',
          unit: prev.unit || 'piece',
        },
      ],
    }));
  };

  const removeRequestVariantRow = (id: string) => {
    setRequestForm((prev) => ({ ...prev, variants: prev.variants.filter((v) => v.id !== id) }));
  };

  const updateRequestVariantRow = (id: string, patch: Partial<RequestVariantRow>) => {
    setRequestForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const COLOR_SWATCHES = ['White', 'Black', 'Brown', 'Grey', 'Silver', 'Beige', 'Wood tone', 'Green', 'Blue', 'Red', '—'];

  // Request a new catalog material (admin reviews before publishing)
  const handleRequestNewProduct = async () => {
    if (!requestForm.productName || !requestForm.category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the product name and category',
        variant: 'destructive'
      });
      return;
    }

    const basePrice = parseFloat(requestForm.suggestedPrice);
    const variantPayload = requestForm.variants
      .filter((v) => v.name.trim() && v.price.trim())
      .map((v) => ({
        name: v.name.trim(),
        color: v.color.trim() || null,
        price: parseFloat(v.price),
        unit: (v.unit || requestForm.unit || 'piece').trim(),
      }))
      .filter((v) => !Number.isNaN(v.price) && v.price >= 0);

    for (const v of requestForm.variants) {
      const partial = (v.name.trim() && !v.price.trim()) || (!v.name.trim() && v.price.trim());
      if (partial) {
        toast({
          title: 'Incomplete variant',
          description: 'Each variant needs both a name (e.g. size) and a price, or clear the row.',
          variant: 'destructive'
        });
        return;
      }
    }

    const minVariant = variantPayload.length ? Math.min(...variantPayload.map((v) => v.price)) : 0;
    let suggestedForDb = 0;
    if (!Number.isNaN(basePrice) && basePrice > 0) suggestedForDb = basePrice;
    else if (variantPayload.length) suggestedForDb = minVariant;

    if (!suggestedForDb || suggestedForDb <= 0 || Number.isNaN(suggestedForDb)) {
      toast({
        title: 'Price required',
        description: 'Enter a base selling price, or add at least one variant with a price.',
        variant: 'destructive'
      });
      return;
    }

    const effectiveSupplierId = getEffectiveSupplierId();
    if (!effectiveSupplierId) {
      toast({
        title: 'Supplier not found',
        description: 'Please refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const imageUrls = await uploadMaterialRequestImages(requestForm.images);
      // Never put base64 blobs in additional_images — large JSON bodies cause PostgREST 400.
      const additionalImageUrls = imageUrls.slice(1).filter((u) => /^https?:\/\//i.test(u));
      const droppedInlineAngles =
        imageUrls.length > 1 && additionalImageUrls.length < imageUrls.length - 1;

      const primaryImage = imageUrls[0] || '';

      const fullRow = {
        supplier_id: effectiveSupplierId,
        product_name: requestForm.productName.trim(),
        category: requestForm.category,
        description: requestForm.description?.trim() || null,
        suggested_price: suggestedForDb,
        unit: requestForm.unit,
        image_data: primaryImage || null,
        additional_images: additionalImageUrls,
        variants: variantPayload,
        status: 'pending' as const,
      };

      let { error } = await supabase.from('product_requests' as any).insert(fullRow);
      let usedLegacyRow = false;

      if (error && isProductRequestsSchemaMismatch(error)) {
        const legacyDescription = [
          requestForm.description?.trim(),
          `[Material request metadata]\nUnit: ${requestForm.unit}`,
          variantPayload.length ? `Variants (JSON):\n${JSON.stringify(variantPayload, null, 2)}` : '',
          additionalImageUrls.length
            ? `Additional image URLs:\n${additionalImageUrls.join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n---\n');

        const legacyRow = {
          supplier_id: effectiveSupplierId,
          product_name: requestForm.productName.trim(),
          category: requestForm.category,
          description: legacyDescription || null,
          suggested_price: suggestedForDb,
          image_data: primaryImage || '',
          status: 'pending' as const,
        };
        ({ error } = await supabase.from('product_requests' as any).insert(legacyRow));
        usedLegacyRow = true;
      }

      if (error) {
        console.error('product_requests insert:', error, (error as any)?.details, (error as any)?.hint);
        const detail = (error as any)?.details || (error as any)?.hint;
        toast({
          title: 'Could not submit',
          description: [error.message, detail].filter(Boolean).join(' — ') || 'Database error.',
          variant: 'destructive'
        });
        return;
      }

      setShowRequestDialog(false);
      resetRequestForm();

      if (droppedInlineAngles) {
        toast({
          title: 'Request submitted (partial photos)',
          description:
            'Extra angles could not be stored inline. Upload smaller files or ensure storage is enabled so all photos use URLs.',
        });
      } else {
        toast({
          title: usedLegacyRow ? 'Request submitted (legacy format)' : 'Request submitted',
          description: usedLegacyRow
            ? 'Your database is missing the latest product_requests columns; variants and unit were embedded in the description. Run the migration 20260421120000_product_requests_material_variants.sql when possible.'
            : 'Admin will review photos, variants, and pricing before adding the material to the catalog.',
        });
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Submit failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
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
      variants: [],
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

  const basePriceNum = parseFloat(requestForm.suggestedPrice);
  const canSubmitMaterialRequest =
    Boolean(requestForm.productName.trim() && requestForm.category) &&
    ((!Number.isNaN(basePriceNum) && basePriceNum > 0) ||
      requestForm.variants.some(
        (v) =>
          v.name.trim() &&
          v.price.trim() &&
          !Number.isNaN(parseFloat(v.price)) &&
          parseFloat(v.price) > 0
      ));

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
                use &quot;Upload material&quot; to send photos, variants, and prices for admin review.
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
                <Upload className="h-4 w-4 mr-2" />
                Upload material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Upload material
                </DialogTitle>
                <DialogDescription>
                  Add photos from several angles, optional variants (size, color, unit, price), and your default selling price. Admin reviews before publishing to the catalog.
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

                {/* Variants: size / color / unit / price per SKU */}
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Layers className="h-4 w-4 text-orange-600" />
                      Variants (optional)
                    </Label>
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={addRequestVariantRow}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add variant
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this when the same product comes in different sizes, colors, or prices (e.g. door 800×2100 vs 900×2100, or red vs grey paint).
                  </p>
                  {requestForm.variants.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No variants yet — one base price below is enough for a single SKU.</p>
                  ) : (
                    <div className="space-y-3">
                      {requestForm.variants.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 gap-2 rounded-md border bg-white p-2 sm:grid-cols-12 sm:items-end"
                        >
                          <div className="space-y-1 sm:col-span-4">
                            <Label className="text-[10px] uppercase text-gray-500">Variant / size</Label>
                            <Input
                              placeholder="e.g. 900×2100 mm, 50kg bag"
                              value={row.name}
                              onChange={(e) => updateRequestVariantRow(row.id, { name: e.target.value })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <Label className="text-[10px] uppercase text-gray-500">Color</Label>
                            <Input
                              placeholder="e.g. Mahogany"
                              value={row.color}
                              onChange={(e) => updateRequestVariantRow(row.id, { color: e.target.value })}
                              className="h-9 text-sm"
                            />
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {COLOR_SWATCHES.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-orange-100"
                                  onClick={() =>
                                    updateRequestVariantRow(row.id, { color: c === '—' ? '' : c })
                                  }
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[10px] uppercase text-gray-500">Unit</Label>
                            <Select
                              value={row.unit || requestForm.unit}
                              onValueChange={(value) => updateRequestVariantRow(row.id, { unit: value })}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
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
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[10px] uppercase text-gray-500">Price (KES)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={row.price}
                              onChange={(e) => updateRequestVariantRow(row.id, { price: e.target.value })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="flex sm:col-span-1 sm:justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-red-600"
                              onClick={() => removeRequestVariantRow(row.id)}
                              aria-label="Remove variant"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Input - Prominent */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Default selling price (KES)
                    <span className="text-xs font-normal text-muted-foreground">(required if no variant prices)</span>
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
                  <p className="text-xs text-muted-foreground">
                    If you added variants with prices above, you can leave this at 0 — we will use the lowest variant price as the reference.
                  </p>
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
                  disabled={isSubmitting || !canSubmitMaterialRequest}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit for review
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
              Admin hasn't uploaded any products yet. Use Upload material to suggest a catalog item.
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
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Market Price (KES)
                          <span className="text-xs text-muted-foreground font-normal">Cost price</span>
                        </Label>
                        <Input
                          type="number"
                          defaultValue={supplierPrices[pricingProduct.id]?.market_price || 0}
                          id="market-price-input"
                          placeholder="Enter cost price"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Selling Price (KES) *
                          <span className="text-xs text-muted-foreground font-normal">Customer price</span>
                        </Label>
                        <Input
                          type="number"
                          defaultValue={supplierPrices[pricingProduct.id]?.price || 0}
                          id="pricing-input"
                          placeholder="Enter selling price"
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    {/* Profit Preview */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-700 font-medium mb-1">💰 Profit Tracking</p>
                      <p className="text-xs text-green-600">
                        Enter both market price (your cost) and selling price to track profit margins. 
                        This helps monitor your business profitability.
                      </p>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  💡 Add your own size variants (e.g., 25kg, 50kg) with custom prices. Your variants will appear alongside admin variants.
                </p>
              </div>
              
              {/* KRA eTIMS / item code — stored on supplier_product_prices */}
              <div className="space-y-2">
                <Label htmlFor="etims-item-code-input" className="flex items-center gap-2">
                  Item code (KRA eTIMS)
                  <span className="text-xs text-muted-foreground font-normal">Optional</span>
                </Label>
                <Input
                  id="etims-item-code-input"
                  key={`etims-${pricingProduct.id}-${supplierPrices[pricingProduct.id]?.etims_item_code ?? 'empty'}`}
                  defaultValue={supplierPrices[pricingProduct.id]?.etims_item_code ?? ''}
                  placeholder="e.g. KE1UCT0000001"
                  className="h-10 font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Use your integrator catalog item code for this SKU so invoice lines can map correctly.
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
                const etimsInput = document.getElementById('etims-item-code-input') as HTMLInputElement;
                const etimsTrim = etimsInput?.value?.trim() || '';
                
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
                
                // Determine main price and market price
                let mainPrice = 0;
                let marketPrice = 0;
                if (allVariantPrices.length > 0) {
                  mainPrice = allVariantPrices[0]?.price || 0;
                } else {
                  const priceInput = document.getElementById('pricing-input') as HTMLInputElement;
                  const marketPriceInput = document.getElementById('market-price-input') as HTMLInputElement;
                  mainPrice = parseFloat(priceInput?.value) || 0;
                  marketPrice = parseFloat(marketPriceInput?.value) || 0;
                }
                
                // Save price with images and variants
                await handleSetPrice(
                  pricingProduct!.id,
                  mainPrice,
                  stockCheckbox.checked,
                  descriptionInput.value.trim() || undefined,
                  allVariantPrices.length > 0 ? allVariantPrices : undefined,
                  marketPrice,
                  etimsTrim || null,
                );
                
                // If custom images were uploaded, save them to supplier_product_prices
                if (editingImage || editingAdditionalImages.some(img => img)) {
                  try {
                    const effectiveSupplierId = getEffectiveSupplierId();
                    let accessToken = '';
                    try {
                      const storedSession = readPersistedAuthRawStringSync();
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
                          'apikey': SUPABASE_ANON_KEY,
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
