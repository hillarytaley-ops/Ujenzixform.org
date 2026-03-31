/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🖼️ ADMIN MATERIAL IMAGES MANAGER - PROTECTED COMPONENT                             ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL ADMIN FEATURE - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️             ║
 * ║                                                                                      ║
 * ║   CREATED: December 25, 2025                                                         ║
 * ║   LAST VERIFIED: December 25, 2025                                                   ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE:                                                                           ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Upload material images for display on suppliers marketplace            │   ║
 * ║   │  2. View and approve images uploaded by registered suppliers               │   ║
 * ║   │  3. Manage which images appear on the marketplace front page               │   ║
 * ║   │  4. Images stored as base64 data URLs in admin_material_images table       │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   DATABASE TABLES:                                                                   ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  • admin_material_images - Admin uploaded images (is_approved = true)      │   ║
 * ║   │  • approved_material_images - Supplier images approved by admin            │   ║
 * ║   │  • materials - Supplier products with image_url                            │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Remove the base64 image upload functionality                                   ║
 * ║   - Change the admin_material_images table structure                               ║
 * ║   - Remove the supplier materials approval workflow                                ║
 * ║   - Modify the image preview or upload dialog                                      ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
  Eye,
  Star,
  StarOff,
  Loader2,
  Package,
  Store,
  Filter,
  Download,
  CheckCircle,
  Edit,
  Save,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface MaterialImage {
  id: string;
  name: string;
  category: string;
  image_url: string;
  additional_images?: string[]; // Array of additional angle images (front, back, sides, etc.)
  source: 'admin' | 'supplier';
  supplier_id?: string;
  supplier_name?: string;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
  material_id?: string;
}

// Image angle labels for multi-angle gallery
const IMAGE_ANGLES = [
  { id: 'main', label: 'Main/Front', icon: '📷' },
  { id: 'back', label: 'Back', icon: '🔙' },
  { id: 'left', label: 'Left Side', icon: '◀️' },
  { id: 'right', label: 'Right Side', icon: '▶️' },
  { id: 'top', label: 'Top', icon: '⬆️' },
  { id: 'bottom', label: 'Bottom', icon: '⬇️' },
  { id: 'detail', label: 'Detail/Close-up', icon: '🔍' },
  { id: 'packaging', label: 'Packaging', icon: '📦' },
];

interface SupplierMaterial {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  supplier_id: string;
  supplier?: {
    company_name: string;
  };
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const PRODUCT_CATEGORIES = [
  'All Categories',
  // STRUCTURAL & FOUNDATION
  'Cement', 'Steel', 'Aggregates', 'Sand', 'Stone', 'Blocks', 'Bricks', 'Ready Mix Concrete',
  // ROOFING
  'Roofing', 'Iron Sheets', 'Roofing Tiles', 'Gutters & Downpipes', 'Roofing Accessories', 'Waterproofing',
  // TIMBER & WOOD
  'Timber', 'Plywood', 'Particle Board', 'Timber Trusses', 'Formwork', 'Treated Poles',
  // DOORS, WINDOWS & OPENINGS
  'Doors', 'Steel Doors', 'Windows', 'Aluminium Windows', 'Glass', 'Door Frames', 'Door Hardware', 'Window Hardware',
  // WATER TANKS (Separate category - comes in various sizes: 100L, 200L, 500L, 1000L, 2000L, 5000L, 10000L etc.)
  'Water Tanks',
  // PLUMBING (Pipes, fittings, and plumbing accessories)
  'Plumbing', 'PVC Pipes', 'PPR Pipes', 'GI Pipes', 'HDPE Pipes', 'Pipe Fittings', 'Valves',
  'Pumps', 'Taps & Mixers', 'Sanitary Ware', 'Bathroom Accessories', 'Septic Tanks', 'Water Heaters',
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

// Supported image formats
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif'
];

export const MaterialImagesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admin-upload' | 'supplier-images'>('admin-upload');
  const [adminImages, setAdminImages] = useState<MaterialImage[]>([]);
  const [supplierMaterials, setSupplierMaterials] = useState<SupplierMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingImage, setEditingImage] = useState<MaterialImage | null>(null);
  const [selectedImage, setSelectedImage] = useState<MaterialImage | SupplierMaterial | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // Image loading progress tracking
  const [imageLoadProgress, setImageLoadProgress] = useState({
    totalProducts: 0,
    productsWithImages: 0,
    imagesLoaded: 0,
    isLoadingImages: false,
    lastUpdated: new Date()
  });
  
  // Variant type for multiple sizes/prices/colors/textures
  interface PriceVariant {
    id: string;
    sizeLabel: string;
    sizeUnit?: string; // e.g. inch, feet, metres, cm
    color?: string;
    colorHex?: string;
    texture?: string; // e.g. Smooth, Rough
    price: number;
    stock: number;
    imageUrl?: string; // Optional image per variant
  }

  const SIZE_UNITS = ['', 'inch', 'inches', 'ft', 'feet', 'm', 'metres', 'cm', 'mm', 'L', 'litre', 'litres'];
  const TEXTURE_OPTIONS = ['', 'Smooth', 'Rough', 'Textured', 'Matte', 'Glossy', 'Coarse', 'Fine', 'Other'];
  
  // Common color presets for quick selection
  const COLOR_PRESETS = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'Golden', hex: '#FFD700' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Brown', hex: '#92400E' },
    { name: 'Beige', hex: '#D4A574' },
    { name: 'Navy', hex: '#1E3A5F' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Cream', hex: '#FFFDD0' },
    { name: 'Terracotta', hex: '#E2725B' },
  ];

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Cement',
    description: '',
    unit: 'unit',
    suggestedPrice: 0,
    imageFile: null as File | null,
    previewUrl: '',
    pricingType: 'single' as 'single' | 'variants',
    variants: [] as PriceVariant[]
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Cement',
    description: '',
    unit: 'unit',
    suggestedPrice: 0,
    pricingType: 'single' as 'single' | 'variants',
    variants: [] as PriceVariant[]
  });

  // Bulk upload state
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [bulkUploadCategory, setBulkUploadCategory] = useState('Cement'); // Default category for new items
  const [bulkUploadUnit, setBulkUploadUnit] = useState('bag'); // Default unit for new items
  const [bulkUploadItems, setBulkUploadItems] = useState<Array<{
    id: string;
    file: File;
    previewUrl: string;
    name: string;
    category: string; // Individual category per item
    description: string;
    unit: string; // Individual unit per item
    suggestedPrice: number;
    pricingType: 'single' | 'variants'; // NEW: Pricing type
    variants: PriceVariant[]; // NEW: Variants array
    uploading: boolean;
    uploaded: boolean;
    error: string | null;
  }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Multi-angle gallery state
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [galleryImage, setGalleryImage] = useState<MaterialImage | null>(null);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState(0);
  const [showAddAnglesDialog, setShowAddAnglesDialog] = useState(false);
  const [addAnglesImage, setAddAnglesImage] = useState<MaterialImage | null>(null);
  const [newAngleImages, setNewAngleImages] = useState<Array<{ file: File; previewUrl: string; angle: string }>>([]);
  const [uploadingAngles, setUploadingAngles] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const angleFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch admin-uploaded images from Supabase storage
  // ✅ PERFORMANCE OPTIMIZED: Using REST API with timeout
  const fetchAdminImages = async () => {
    console.log('🖼️ Fetching admin material images...');
    
    // Get auth token from localStorage
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {}
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      // Reset progress
      setImageLoadProgress(prev => ({
        ...prev,
        isLoadingImages: true,
        imagesLoaded: 0,
        lastUpdated: new Date()
      }));
      
      // Use REST API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,is_featured,is_approved,created_at,description,unit,suggested_price,pricing_type,variants&order=created_at.desc`,
        { headers, signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Admin images fetch error:', response.status);
        setAdminImages([]);
        setImageLoadProgress(prev => ({ ...prev, isLoadingImages: false, totalProducts: 0 }));
        return;
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.log('📭 No admin images found in database');
        setAdminImages([]);
        setImageLoadProgress(prev => ({ ...prev, isLoadingImages: false, totalProducts: 0 }));
        return;
      }
      
      console.log(`📊 Loaded ${data.length} material metadata records`);
      
      // Update progress with total count
      setImageLoadProgress(prev => ({
        ...prev,
        totalProducts: data.length,
        productsWithImages: 0,
        lastUpdated: new Date()
      }));
      
      // Map to MaterialImage format - image_url will be loaded on-demand
      const images = data.map((item: any) => ({
        ...item,
        image_url: '', // Will be loaded lazily when displayed
        source: 'admin' as const,
        additional_images: []
      }));
      
      setAdminImages(images);
      
      // ✅ LAZY LOAD: Fetch image URLs in background - load ALL images progressively
      loadImageUrlsWithProgress(data.map((d: any) => d.id));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('❌ Admin images fetch timeout');
      } else {
        console.error('❌ Error fetching admin images:', err);
      }
      setAdminImages([]);
      setImageLoadProgress(prev => ({ ...prev, isLoadingImages: false }));
    }
  };
  
  // ✅ LAZY LOAD: Fetch image URLs for specific IDs using REST API
  const loadImageUrls = async (ids: string[]) => {
    if (ids.length === 0) return;
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {}
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,image_url&id=in.(${ids.join(',')})`,
        { headers }
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data) return;
      
      // Update images with their URLs
      setAdminImages(prev => prev.map(img => {
        const found = data.find((d: any) => d.id === img.id);
        return found ? { ...img, image_url: found.image_url } : img;
      }));
    } catch (err) {
      console.error('Error loading image URLs:', err);
    }
  };
  
  // ✅ PROGRESSIVE LOAD: Fetch image URLs in batches with progress tracking using REST API
  const loadImageUrlsWithProgress = async (allIds: string[]) => {
    if (allIds.length === 0) {
      setImageLoadProgress(prev => ({ ...prev, isLoadingImages: false }));
      return;
    }
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {}
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const BATCH_SIZE = 20; // Load 20 images at a time
    let loadedCount = 0;
    let imagesWithData = 0;
    
    console.log(`📷 Starting progressive image load for ${allIds.length} products...`);
    
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batchIds = allIds.slice(i, i + BATCH_SIZE);
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,image_url&id=in.(${batchIds.join(',')})`,
          { headers }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data) {
            // Count how many have actual image data
            const withImages = data.filter((d: any) => d.image_url && d.image_url.length > 100).length;
            imagesWithData += withImages;
            loadedCount += batchIds.length;
            
            // Update images with their URLs
            setAdminImages(prev => prev.map(img => {
              const found = data.find((d: any) => d.id === img.id);
              return found ? { ...img, image_url: found.image_url } : img;
            }));
            
            // Update progress
            setImageLoadProgress({
              totalProducts: allIds.length,
              productsWithImages: imagesWithData,
              imagesLoaded: loadedCount,
              isLoadingImages: loadedCount < allIds.length,
              lastUpdated: new Date()
            });
            
            console.log(`📷 Progress: ${loadedCount}/${allIds.length} (${Math.round(loadedCount/allIds.length*100)}%) - ${imagesWithData} with images`);
          }
        }
      } catch (err) {
        console.error('Error loading batch:', err);
        loadedCount += batchIds.length; // Still count as processed
      }
      
      // Small delay between batches to prevent overwhelming the API
      if (i + BATCH_SIZE < allIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Final update
    setImageLoadProgress(prev => ({
      ...prev,
      isLoadingImages: false,
      imagesLoaded: allIds.length,
      lastUpdated: new Date()
    }));
    
    console.log(`✅ Image loading complete: ${imagesWithData}/${allIds.length} products have images`);
  };

  // Fetch supplier materials with images
  const fetchSupplierMaterials = async () => {
    console.log('🏪 Fetching supplier materials...');
    
    // Get auth token from localStorage
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {}
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      // Use REST API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/materials?select=id,name,category,image_url,supplier_id,created_at&image_url=not.is.null&order=created_at.desc`,
        { headers, signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('🏪 Supplier materials fetch error:', response.status);
        setSupplierMaterials([]);
        return;
      }
      
      const data = await response.json();
      console.log(`🏪 Loaded ${data?.length || 0} supplier materials`);
      
      // Transform data - supplier info will be fetched separately if needed
      const transformed = ((data || []) as any[]).map((item: any) => ({
        ...item,
        supplier: { company_name: 'Supplier' } // Default, can be enhanced later
      }));
      
      setSupplierMaterials(transformed as SupplierMaterial[]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('🏪 Supplier materials fetch timeout');
      } else {
        console.error('Error fetching supplier materials:', err);
      }
      setSupplierMaterials([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Add safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.log('⚠️ MaterialImagesManager: Safety timeout - forcing loading to stop');
        setLoading(false);
      }, 15000); // 15 second timeout
      
      try {
        await Promise.all([fetchAdminImages(), fetchSupplierMaterials()]);
      } catch (err) {
        console.error('Error loading material images:', err);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidImage = file.type.startsWith('image/') || SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
    if (!isValidImage) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF, WEBP, AVIF, SVG, BMP, TIFF, HEIC)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadForm(prev => ({
      ...prev,
      imageFile: file,
      previewUrl
    }));
  };

  // Handle admin image upload
  const handleUpload = async () => {
    if (!uploadForm.imageFile || !uploadForm.name || !uploadForm.category) {
      toast({
        title: 'Missing information',
        description: 'Please provide a name, category, and image file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Convert image to base64 data URL (bypasses storage RLS issues)
      const reader = new FileReader();
      
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadForm.imageFile!);
      });
      
      // Save directly to admin_material_images table with base64 image
      await saveAdminImage(imageDataUrl);

      toast({
        title: 'Image uploaded successfully',
        description: `${uploadForm.name} has been added to the marketplace`,
      });

      // Reset form and close dialog
      setUploadForm({ name: '', category: 'Cement', description: '', unit: 'unit', suggestedPrice: 0, imageFile: null, previewUrl: '', pricingType: 'single', variants: [] });
      setShowUploadDialog(false);
      fetchAdminImages();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Save admin image record to database - using fetch API with timeout for reliability
  const saveAdminImage = async (imageUrl: string) => {
    console.log('📤 Saving image to database...');
    
    // Get session from localStorage (faster than supabase.auth.getSession which can hang)
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    if (!accessToken) {
      throw new Error('Not authenticated - please sign in again');
    }

    const payload = {
      name: uploadForm.name,
      category: uploadForm.category,
      description: uploadForm.description || '',
      unit: uploadForm.unit || 'unit',
      suggested_price: uploadForm.suggestedPrice || 0,
      pricing_type: uploadForm.pricingType || 'single',
      variants: uploadForm.variants || [],
      image_url: imageUrl,
      is_featured: false,
      is_approved: true
    };

    // Use fetch API with timeout (30 seconds for large images)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload error:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      console.log('✅ Image saved successfully');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Upload timed out - please try again with a smaller image');
      }
      throw err;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // BULK UPLOAD FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════════

  // Handle bulk file selection
  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newItems: typeof bulkUploadItems = [];
    
    Array.from(files).forEach((file, index) => {
      // Validate file type
      const isValidImage = file.type.startsWith('image/') || SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
      if (!isValidImage) {
        toast({
          title: 'Invalid file skipped',
          description: `${file.name} is not a valid image file`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive',
        });
        return;
      }

      // Extract name from filename (remove extension)
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      // Capitalize first letter of each word
      const formattedName = baseName.replace(/\b\w/g, c => c.toUpperCase());

      newItems.push({
        id: `bulk-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: formattedName,
        category: bulkUploadCategory, // Use default category (can be changed per item)
        description: '',
        unit: bulkUploadUnit, // Use default unit (can be changed per item)
        suggestedPrice: 0,
        pricingType: 'single', // Default to single price
        variants: [], // Empty variants array
        uploading: false,
        uploaded: false,
        error: null
      });
    });

    setBulkUploadItems(prev => [...prev, ...newItems]);
    
    // Reset file input
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  // Update bulk item details
  const updateBulkItem = (id: string, updates: Partial<typeof bulkUploadItems[0]>) => {
    setBulkUploadItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // Remove bulk item
  const removeBulkItem = (id: string) => {
    setBulkUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  // Helper function to save image via fetch API
  const saveImageViaFetch = async (payload: any, accessToken: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Upload timed out');
      }
      throw err;
    }
  };

  // Upload all bulk items
  const handleBulkUpload = async () => {
    const itemsToUpload = bulkUploadItems.filter(item => !item.uploaded && item.name.trim());
    
    if (itemsToUpload.length === 0) {
      toast({
        title: 'No items to upload',
        description: 'Please add images and fill in the names',
        variant: 'destructive',
      });
      return;
    }

    // Get session from localStorage (faster than supabase.auth.getSession which can hang)
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    if (!accessToken) {
      toast({ title: 'Not authenticated', description: 'Please sign in again', variant: 'destructive' });
      return;
    }

    setBulkUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToUpload) {
      updateBulkItem(item.id, { uploading: true, error: null });
      
      try {
        // Convert image to base64
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        // Save to database via fetch API
        await saveImageViaFetch({
          name: item.name.trim(),
          category: item.category,
          description: item.description || '',
          unit: item.unit,
          suggested_price: item.suggestedPrice || 0,
          pricing_type: item.pricingType || 'single',
          variants: item.variants || [],
          image_url: imageDataUrl,
          is_featured: false,
          is_approved: true
        }, accessToken);

        updateBulkItem(item.id, { uploading: false, uploaded: true });
        successCount++;
      } catch (err: any) {
        console.error('Bulk upload error for', item.name, err);
        updateBulkItem(item.id, { uploading: false, error: err.message || 'Upload failed' });
        errorCount++;
      }
    }

    setBulkUploading(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} image${successCount > 1 ? 's' : ''} uploaded successfully`,
        description: errorCount > 0 ? `${errorCount} failed` : 'All images added to marketplace',
      });
      fetchAdminImages();
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: 'Upload failed',
        description: 'Could not upload any images',
        variant: 'destructive',
      });
    }
  };

  // Clear all bulk items
  const clearBulkItems = () => {
    bulkUploadItems.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setBulkUploadItems([]);
  };

  // Close bulk upload dialog
  const closeBulkUploadDialog = () => {
    clearBulkItems();
    setShowBulkUploadDialog(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MULTI-ANGLE GALLERY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════════

  // Open gallery view for an image - fetches additional_images on demand
  const openGallery = async (image: MaterialImage) => {
    setGalleryImage(image);
    setGalleryActiveIndex(0);
    setShowGalleryDialog(true);
    
    // Fetch additional_images on-demand if not already loaded
    if (!image.additional_images || image.additional_images.length === 0) {
      try {
        const { data, error } = await (supabase as any)
          .from('admin_material_images')
          .select('additional_images')
          .eq('id', image.id)
          .single();
        
        if (!error && data?.additional_images && data.additional_images.length > 0) {
          // Update the gallery image with additional images
          setGalleryImage(prev => prev ? { ...prev, additional_images: data.additional_images } : null);
          // Also update in the main list
          setAdminImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, additional_images: data.additional_images } : img
          ));
        }
      } catch (err) {
        console.error('Error fetching additional images:', err);
      }
    }
  };

  // Get all images for gallery (main + additional angles)
  const getGalleryImages = (image: MaterialImage | null): string[] => {
    if (!image) return [];
    const images = [image.image_url];
    if (image.additional_images && Array.isArray(image.additional_images)) {
      images.push(...image.additional_images);
    }
    return images;
  };

  // Open add angles dialog
  const openAddAnglesDialog = (image: MaterialImage) => {
    setAddAnglesImage(image);
    setNewAngleImages([]);
    setShowAddAnglesDialog(true);
  };

  // Handle angle file selection
  const handleAngleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages: typeof newAngleImages = [];
    
    Array.from(files).forEach((file, index) => {
      const isValidImage = file.type.startsWith('image/') || SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
      if (!isValidImage || file.size > 10 * 1024 * 1024) return;

      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
        angle: IMAGE_ANGLES[Math.min(index + 1, IMAGE_ANGLES.length - 1)].id // Skip 'main' as it's already set
      });
    });

    setNewAngleImages(prev => [...prev, ...newImages]);
    
    if (angleFileInputRef.current) {
      angleFileInputRef.current.value = '';
    }
  };

  // Update angle label for an image
  const updateAngleLabel = (index: number, angle: string) => {
    setNewAngleImages(prev => prev.map((img, i) => 
      i === index ? { ...img, angle } : img
    ));
  };

  // Remove angle image
  const removeAngleImage = (index: number) => {
    setNewAngleImages(prev => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload additional angle images
  const handleUploadAngles = async () => {
    if (!addAnglesImage || newAngleImages.length === 0) return;

    setUploadingAngles(true);
    
    try {
      const newImageUrls: string[] = [];

      // Convert each image to base64
      for (const angleImg of newAngleImages) {
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(angleImg.file);
        });
        newImageUrls.push(imageDataUrl);
      }

      // Get existing additional images
      const existingImages = addAnglesImage.additional_images || [];
      const allAdditionalImages = [...existingImages, ...newImageUrls];

      // Update the database record
      const { error } = await (supabase as any)
        .from('admin_material_images')
        .update({ additional_images: allAdditionalImages })
        .eq('id', addAnglesImage.id);

      if (error) throw error;

      toast({
        title: 'Angle images added',
        description: `${newAngleImages.length} additional view${newAngleImages.length > 1 ? 's' : ''} added to ${addAnglesImage.name}`,
      });

      // Cleanup and close
      newAngleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setNewAngleImages([]);
      setShowAddAnglesDialog(false);
      fetchAdminImages();

    } catch (err: any) {
      console.error('Error uploading angle images:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to add angle images',
        variant: 'destructive',
      });
    } finally {
      setUploadingAngles(false);
    }
  };

  // Delete a specific angle image
  const deleteAngleImage = async (image: MaterialImage, angleIndex: number) => {
    if (!image.additional_images) return;
    
    const updatedImages = image.additional_images.filter((_, i) => i !== angleIndex);
    
    try {
      const { error } = await (supabase as any)
        .from('admin_material_images')
        .update({ additional_images: updatedImages.length > 0 ? updatedImages : null })
        .eq('id', image.id);

      if (error) throw error;

      toast({
        title: 'Angle image removed',
        description: 'The additional view has been deleted',
      });

      fetchAdminImages();
      
      // Update gallery if open
      if (galleryImage?.id === image.id) {
        setGalleryImage({ ...image, additional_images: updatedImages });
        if (galleryActiveIndex >= updatedImages.length + 1) {
          setGalleryActiveIndex(0);
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete angle image',
        variant: 'destructive',
      });
    }
  };

  // Toggle featured status
  const toggleFeatured = async (image: MaterialImage) => {
    try {
      const { error } = await (supabase as any)
        .from('admin_material_images')
        .update({ is_featured: !image.is_featured })
        .eq('id', image.id);
      
      if (error) throw error;
      
      toast({
        title: image.is_featured ? 'Removed from featured' : 'Added to featured',
        description: `${image.name} has been ${image.is_featured ? 'removed from' : 'added to'} featured images`,
      });
      
      fetchAdminImages();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update image',
        variant: 'destructive',
      });
    }
  };

  // Delete admin image
  const deleteAdminImage = async (image: MaterialImage) => {
    if (!confirm(`Are you sure you want to delete "${image.name}"?`)) return;
    
    try {
      // Delete from database (image is stored as base64 data URL, no storage cleanup needed)
      const { error } = await (supabase as any)
        .from('admin_material_images')
        .delete()
        .eq('id', image.id);
      
      if (error) throw error;
      
      toast({
        title: 'Image deleted',
        description: `${image.name} has been removed`,
      });
      
      fetchAdminImages();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete image',
        variant: 'destructive',
      });
    }
  };

  // Open edit dialog with image data
  const openEditDialog = (image: MaterialImage) => {
    setEditingImage(image);
    // Parse variants from database (stored as JSON)
    let variants: PriceVariant[] = [];
    try {
      const storedVariants = (image as any).variants;
      if (storedVariants && Array.isArray(storedVariants)) {
        variants = storedVariants;
      } else if (typeof storedVariants === 'string') {
        variants = JSON.parse(storedVariants);
      }
    } catch (e) {
      variants = [];
    }
    
    setEditForm({
      name: image.name || '',
      category: image.category || 'Cement',
      description: (image as any).description || '',
      unit: (image as any).unit || 'unit',
      suggestedPrice: (image as any).suggested_price || 0,
      pricingType: ((image as any).pricing_type || 'single') as 'single' | 'variants',
      variants: variants
    });
    setShowEditDialog(true);
  };

  // Save edited image - using fetch API for reliability
  const handleSaveEdit = async () => {
    if (!editingImage) return;
    
    if (!editForm.name.trim()) {
      toast({
        title: 'Missing name',
        description: 'Please provide a material name',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      console.log('📝 Saving edit for product:', editingImage.id);
      
      // Get session from localStorage (faster than supabase.auth.getSession which can hang)
      let accessToken: string | null = null;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token;
        }
      } catch (e) {
        console.warn('Could not get session from localStorage');
      }
      
      if (!accessToken) {
        throw new Error('Not authenticated - please sign in again');
      }
      
      const payload = {
        name: editForm.name.trim(),
        category: editForm.category,
        description: editForm.description || '',
        unit: editForm.unit || 'unit',
        suggested_price: editForm.suggestedPrice || 0,
        pricing_type: editForm.pricingType || 'single',
        variants: editForm.variants || [],
        updated_at: new Date().toISOString()
      };
      
      // Use fetch API with timeout for reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(
        `https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/admin_material_images?id=eq.${editingImage.id}`,
        {
          method: 'PATCH',
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
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed:', response.status, errorText);
        throw new Error(`Update failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Product updated:', data);
      
      toast({
        title: 'Image updated',
        description: `${editForm.name} has been updated successfully`,
      });
      
      setShowEditDialog(false);
      setEditingImage(null);
      fetchAdminImages();
    } catch (err: any) {
      console.error('Edit error:', err);
      toast({
        title: 'Update failed',
        description: err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Failed to update image'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Approve/reject supplier image for marketplace display
  const updateSupplierImageApproval = async (material: SupplierMaterial, approved: boolean) => {
    try {
      // Add to approved images list or remove
      const { error } = await (supabase as any)
        .from('approved_material_images')
        .upsert({
          material_id: material.id,
          image_url: material.image_url,
          is_approved: approved,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        }, {
          onConflict: 'material_id'
        });
      
      if (error) {
        console.log('Approved images table may not exist:', error);
      }
      
      toast({
        title: approved ? 'Image approved' : 'Image rejected',
        description: `${material.name} image has been ${approved ? 'approved for' : 'rejected from'} marketplace display`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update approval status',
        variant: 'destructive',
      });
    }
  };

  // Filter materials
  const filteredSupplierMaterials = supplierMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.supplier?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || material.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAdminImages = adminImages.filter(image => {
    const matchesSearch = image.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || image.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-3 text-slate-400">Loading material images...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Material Images Manager</h2>
          <p className="text-slate-400 mt-1">
            Upload and manage material images for the suppliers marketplace
          </p>
        </div>
        <div className="flex gap-2 relative z-10">
          {/* ✅ PERFORMANCE: Load all images button */}
          <Button
            onClick={() => {
              console.log('🔄 Load All Images button clicked!');
              const unloadedIds = adminImages.filter(img => !img.image_url).map(img => img.id);
              if (unloadedIds.length > 0) {
                toast({ title: `Loading ${unloadedIds.length} images...` });
                loadImageUrls(unloadedIds);
              } else {
                toast({ title: 'All images already loaded' });
              }
            }}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Load All Images ({adminImages.filter(img => !img.image_url).length})
          </Button>
          <Button
            onClick={() => {
              console.log('📦 Bulk Upload button clicked!');
              setShowBulkUploadDialog(true);
            }}
            variant="outline"
            className="border-orange-500 text-orange-400 hover:bg-orange-500/20"
          >
            <Package className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => {
              console.log('📤 Upload Single button clicked!');
              alert('Upload dialog opening...'); // Immediate visual feedback
              setShowUploadDialog(true);
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Single
          </Button>
        </div>
      </div>

      {/* 🎯 UPLOAD TARGET PROGRESS - Main Progress Card */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 border-2">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left: Main Stats */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-full">
                  <Upload className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Product Upload Progress</h3>
                  <p className="text-sm text-slate-400">Target: 1,000 Products</p>
                </div>
              </div>
              
              {/* Big Progress Bar */}
              <div className="relative h-8 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(adminImages.length / 1000 * 100, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg drop-shadow-lg">
                    {adminImages.length} / 1,000 ({(adminImages.length / 1000 * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                  <p className="text-2xl font-bold text-green-400">{adminImages.length}</p>
                  <p className="text-xs text-green-400/70">Uploaded ✅</p>
                  <p className="text-lg font-semibold text-green-300">{(adminImages.length / 1000 * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                  <p className="text-2xl font-bold text-red-400">{Math.max(1000 - adminImages.length, 0)}</p>
                  <p className="text-xs text-red-400/70">Remaining ❌</p>
                  <p className="text-lg font-semibold text-red-300">{Math.max((1000 - adminImages.length) / 1000 * 100, 0).toFixed(1)}%</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <p className="text-2xl font-bold text-blue-400">{imageLoadProgress.productsWithImages}</p>
                  <p className="text-xs text-blue-400/70">With Images 📷</p>
                  <p className="text-lg font-semibold text-blue-300">
                    {adminImages.length > 0 ? (imageLoadProgress.productsWithImages / adminImages.length * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right: Visual Indicator */}
            <div className="lg:w-48 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                {/* Circular Progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(adminImages.length / 1000) * 352} 352`}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{(adminImages.length / 1000 * 100).toFixed(0)}%</span>
                  <span className="text-xs text-slate-400">Complete</span>
                </div>
              </div>
              {adminImages.length >= 1000 ? (
                <p className="mt-2 text-green-400 font-semibold text-sm">🎉 Target Reached!</p>
              ) : (
                <p className="mt-2 text-slate-400 text-sm">{Math.max(1000 - adminImages.length, 0)} more to go</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Row 2: Detailed Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Uploaded</p>
                <p className="text-2xl font-bold text-white">{adminImages.length}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Package className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Products WITH Images */}
        <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">With Images ✅</p>
                <p className="text-2xl font-bold text-green-400">{imageLoadProgress.productsWithImages}</p>
                <p className="text-xs text-green-400/70 mt-1">
                  {adminImages.length > 0 ? Math.round(imageLoadProgress.productsWithImages / adminImages.length * 100) : 0}% of uploaded
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Products WITHOUT Images */}
        <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Missing Images ❌</p>
                <p className="text-2xl font-bold text-red-400">
                  {adminImages.length - imageLoadProgress.productsWithImages}
                </p>
                <p className="text-xs text-red-400/70 mt-1">
                  {adminImages.length > 0 ? Math.round((adminImages.length - imageLoadProgress.productsWithImages) / adminImages.length * 100) : 0}% need images
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-full">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Image Loading Progress Card */}
        <Card className={`border-slate-700 ${imageLoadProgress.isLoadingImages ? 'bg-blue-900/30 border-blue-500/50' : 'bg-slate-800/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-400">Load Progress</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold text-white">
                    {imageLoadProgress.imagesLoaded}/{imageLoadProgress.totalProducts}
                  </p>
                  <span className={`text-sm font-medium ${imageLoadProgress.isLoadingImages ? 'text-blue-400' : 'text-green-400'}`}>
                    ({imageLoadProgress.totalProducts > 0 ? Math.round(imageLoadProgress.imagesLoaded / imageLoadProgress.totalProducts * 100) : 0}%)
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${imageLoadProgress.isLoadingImages ? 'bg-blue-500' : 'bg-green-500'}`}
                    style={{ 
                      width: `${imageLoadProgress.totalProducts > 0 ? (imageLoadProgress.imagesLoaded / imageLoadProgress.totalProducts * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div className={`p-3 rounded-full ml-3 ${imageLoadProgress.isLoadingImages ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                {imageLoadProgress.isLoadingImages ? (
                  <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-green-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-slate-700 text-white">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            fetchAdminImages();
            fetchSupplierMaterials();
          }}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="admin-upload" className="data-[state=active]:bg-orange-600">
            <Upload className="h-4 w-4 mr-2" />
            Admin Uploads ({filteredAdminImages.length})
          </TabsTrigger>
          <TabsTrigger value="supplier-images" className="data-[state=active]:bg-blue-600">
            <Store className="h-4 w-4 mr-2" />
            Supplier Images ({filteredSupplierMaterials.length})
          </TabsTrigger>
        </TabsList>

        {/* Admin Uploads Tab */}
        <TabsContent value="admin-upload" className="mt-6">
          {filteredAdminImages.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No admin-uploaded images yet</p>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="mt-4 bg-orange-500 hover:bg-orange-600"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Image
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAdminImages.map((image, index) => (
                <Card key={image.id} className="bg-slate-800/50 border-slate-700 overflow-hidden group">
                  <div className="relative aspect-square">
                    {/* ✅ LAZY LOAD: Show placeholder while image loads */}
                    {!image.image_url ? (
                      <div 
                        className="w-full h-full bg-slate-700 flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          // Load this image's URL when clicked
                          loadImageUrls([image.id]);
                        }}
                      >
                        <div className="text-center text-slate-400">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <span className="text-xs">Click to load</span>
                        </div>
                      </div>
                    ) : (
                    <img
                      src={image.image_url}
                      alt={image.name}
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => openGallery(image)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    )}
                    {/* Multi-angle indicator */}
                    {image.additional_images && image.additional_images.length > 0 && (
                      <Badge 
                        className="absolute top-2 left-2 bg-blue-600 cursor-pointer hover:bg-blue-700"
                        onClick={() => openGallery(image)}
                      >
                        📷 {image.additional_images.length + 1} views
                      </Badge>
                    )}
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 flex-wrap p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openGallery(image)}
                        className="text-white hover:bg-white/20"
                        title="View all angles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAddAnglesDialog(image)}
                        className="text-white hover:bg-white/20"
                        title="Add more angles"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFeatured(image)}
                        className="text-white hover:bg-white/20"
                        title={image.is_featured ? 'Remove from featured' : 'Add to featured'}
                      >
                        {image.is_featured ? (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(image)}
                        className="text-white hover:bg-white/20"
                        title="Edit details"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAdminImage(image)}
                        className="text-red-400 hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Featured badge */}
                    {image.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-white text-sm truncate">{image.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {image.category}
                      </Badge>
                      {image.additional_images && image.additional_images.length > 0 && (
                        <span className="text-xs text-slate-400">
                          +{image.additional_images.length} angles
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Supplier Images Tab */}
        <TabsContent value="supplier-images" className="mt-6">
          {filteredSupplierMaterials.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <Store className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No supplier images found</p>
                <p className="text-sm text-slate-500 mt-2">
                  Supplier images will appear here when suppliers upload product images
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSupplierMaterials.map(material => (
                <Card key={material.id} className="bg-slate-800/50 border-slate-700 overflow-hidden group">
                  <div className="relative aspect-square">
                    <img
                      src={material.image_url || ''}
                      alt={material.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSupplierImageApproval(material, true)}
                        className="text-green-400 hover:bg-green-500/20"
                        title="Approve for marketplace"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedImage(material as any);
                          setShowPreviewDialog(true);
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSupplierImageApproval(material, false)}
                        className="text-red-400 hover:bg-red-500/20"
                        title="Reject from marketplace"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-white text-sm truncate">{material.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {material.supplier?.company_name || 'Unknown Supplier'}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {material.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog - Enhanced with Pricing Options */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle>Upload Material Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Row 1: Image + Name/Category */}
            <div className="flex gap-3">
              {/* Image Preview/Upload - Compact */}
              <div 
                className="w-28 h-28 flex-shrink-0 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors flex items-center justify-center overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadForm.previewUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={uploadForm.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadForm(prev => ({ ...prev, imageFile: null, previewUrl: '' }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-2">
                    <Upload className="h-6 w-6 text-orange-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Click to upload</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.avif,.svg,.bmp,.tiff,.heic,.heif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Name and Category */}
              <div className="flex-1 space-y-2">
                <div>
                  <Label htmlFor="name" className="text-xs">Material Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Bamburi Cement 50kg"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-800 border-slate-600 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Category *</Label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 h-8 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description - Compact */}
            <div>
              <Label htmlFor="description" className="text-xs">Description (optional)</Label>
              <textarea
                id="description"
                placeholder="Brief product description..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-16 px-2 py-1 text-sm rounded-md bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
            </div>

            {/* Unit Selection */}
            <div>
              <Label className="text-xs">Unit</Label>
              <Select
                value={uploadForm.unit}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {/* Weight & Mass */}
                  <SelectItem value="kg">Per Kg</SelectItem>
                  <SelectItem value="gram">Per Gram</SelectItem>
                  <SelectItem value="tonne">Per Tonne</SelectItem>
                  <SelectItem value="ton">Per Ton</SelectItem>
                  {/* Volume */}
                  <SelectItem value="liter">Per Liter</SelectItem>
                  <SelectItem value="ml">Per ML</SelectItem>
                  <SelectItem value="cubic meter">Per M³</SelectItem>
                  <SelectItem value="cubic foot">Per Cubic Foot</SelectItem>
                  {/* Length */}
                  <SelectItem value="meter">Per Meter</SelectItem>
                  <SelectItem value="mm">Per MM</SelectItem>
                  <SelectItem value="cm">Per CM</SelectItem>
                  <SelectItem value="foot">Per Foot</SelectItem>
                  <SelectItem value="ft">Per Ft</SelectItem>
                  <SelectItem value="inch">Per Inch</SelectItem>
                  {/* Area */}
                  <SelectItem value="sqm">Per Sqm</SelectItem>
                  <SelectItem value="sqft">Per Sqft</SelectItem>
                  {/* Count/Quantity */}
                  <SelectItem value="piece">Per Piece</SelectItem>
                  <SelectItem value="unit">Per Unit</SelectItem>
                  <SelectItem value="pair">Per Pair</SelectItem>
                  <SelectItem value="dozen">Per Dozen</SelectItem>
                  <SelectItem value="set">Per Set</SelectItem>
                  <SelectItem value="bundle">Per Bundle</SelectItem>
                  {/* Packaging */}
                  <SelectItem value="bag">Per Bag</SelectItem>
                  <SelectItem value="packet">Per Packet</SelectItem>
                  <SelectItem value="carton">Per Carton</SelectItem>
                  <SelectItem value="box">Per Box</SelectItem>
                  <SelectItem value="pallet">Per Pallet</SelectItem>
                  {/* Sheets & Rolls */}
                  <SelectItem value="sheet">Per Sheet</SelectItem>
                  <SelectItem value="roll">Per Roll</SelectItem>
                  <SelectItem value="coil">Per Coil</SelectItem>
                  {/* Building Specific */}
                  <SelectItem value="trip">Per Trip</SelectItem>
                  <SelectItem value="lorry">Per Lorry</SelectItem>
                  <SelectItem value="wheelbarrow">Per Wheelbarrow</SelectItem>
                  {/* Length Bundles */}
                  <SelectItem value="length">Per Length</SelectItem>
                  <SelectItem value="bar">Per Bar</SelectItem>
                  <SelectItem value="rod">Per Rod</SelectItem>
                  <SelectItem value="pole">Per Pole</SelectItem>
                  {/* Liquid Containers */}
                  <SelectItem value="drum">Per Drum</SelectItem>
                  <SelectItem value="jerrycan">Per Jerrycan</SelectItem>
                  <SelectItem value="bucket">Per Bucket</SelectItem>
                  <SelectItem value="tin">Per Tin</SelectItem>
                  {/* Water Tank Sizes */}
                  <SelectItem value="100L">100 Litres</SelectItem>
                  <SelectItem value="200L">200 Litres</SelectItem>
                  <SelectItem value="250L">250 Litres</SelectItem>
                  <SelectItem value="500L">500 Litres</SelectItem>
                  <SelectItem value="750L">750 Litres</SelectItem>
                  <SelectItem value="1000L">1,000 Litres</SelectItem>
                  <SelectItem value="1500L">1,500 Litres</SelectItem>
                  <SelectItem value="2000L">2,000 Litres</SelectItem>
                  <SelectItem value="3000L">3,000 Litres</SelectItem>
                  <SelectItem value="5000L">5,000 Litres</SelectItem>
                  <SelectItem value="10000L">10,000 Litres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Type Toggle */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-4">
              <div>
                <Label className="text-sm text-white font-semibold mb-2 block">Pricing Type *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={uploadForm.pricingType === 'single' ? 'default' : 'outline'}
                    size="sm"
                    className={`flex-1 ${uploadForm.pricingType === 'single' ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-600 text-slate-300'}`}
                    onClick={() => setUploadForm(prev => ({ ...prev, pricingType: 'single' }))}
                  >
                    💰 Single Price
                  </Button>
                  <Button
                    type="button"
                    variant={uploadForm.pricingType === 'variants' ? 'default' : 'outline'}
                    size="sm"
                    className={`flex-1 ${uploadForm.pricingType === 'variants' ? 'bg-purple-500 hover:bg-purple-600' : 'border-slate-600 text-slate-300'}`}
                    onClick={() => setUploadForm(prev => ({ 
                      ...prev, 
                      pricingType: 'variants',
                      variants: (!prev.variants || prev.variants.length === 0) ? [{ id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0 }] : prev.variants
                    }))}
                  >
                    📊 Multiple Sizes / Variants
                  </Button>
                </div>
              </div>

              {/* Suggested Price - Always visible */}
              <div>
                <Label htmlFor="suggestedPrice" className="text-sm text-white font-semibold mb-2 block">Suggested Price (KES) *</Label>
                <Input
                  id="suggestedPrice"
                  type="number"
                  placeholder="850.00"
                  value={uploadForm.suggestedPrice || ''}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, suggestedPrice: parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-700 border-slate-600 h-12 text-lg font-semibold"
                />
              </div>

              {/* Product Sizes / Variants - Always visible */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/30">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm text-purple-300 font-semibold">Product Sizes / Variants</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/20 h-8 text-xs px-3"
                    onClick={() => setUploadForm(prev => ({
                      ...prev,
                      pricingType: 'variants',
                      variants: [...prev.variants, { id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0, imageUrl: '' }]
                    }))}
                  >
                    + Add Variant
                  </Button>
                </div>
                
                {/* Variants Table */}
                {uploadForm.variants && uploadForm.variants.length > 0 ? (
                  <div className="space-y-3">
                    {/* Variant Rows */}
                    {uploadForm.variants.map((variant, index) => (
                      <div key={variant.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">Variant #{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => {
                              const newVariants = uploadForm.variants.filter(v => v.id !== variant.id);
                              setUploadForm(prev => ({
                                ...prev,
                                variants: newVariants,
                                pricingType: newVariants.length === 0 ? 'single' : 'variants'
                              }));
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {/* Size Input + Unit */}
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Size</Label>
                            <div className="flex gap-1">
                              <Input
                                placeholder="e.g., 1, 2, Large"
                                value={variant.sizeLabel}
                                onChange={(e) => {
                                  const newVariants = [...uploadForm.variants];
                                  newVariants[index].sizeLabel = e.target.value;
                                  setUploadForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                className="bg-slate-700 border-slate-600 h-8 text-sm flex-1"
                              />
                              <select
                                value={variant.sizeUnit || ''}
                                onChange={(e) => {
                                  const newVariants = [...uploadForm.variants];
                                  newVariants[index].sizeUnit = e.target.value;
                                  setUploadForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                className="bg-slate-700 border-slate-600 rounded-md h-8 text-sm min-w-[70px]"
                              >
                                {SIZE_UNITS.map((u) => (
                                  <option key={u || 'none'} value={u}>{u || '—'}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          {/* Price Input */}
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Price (KES)</Label>
                            <Input
                              type="number"
                              placeholder="120"
                              value={variant.price || ''}
                              onChange={(e) => {
                                const newVariants = [...uploadForm.variants];
                                newVariants[index].price = parseFloat(e.target.value) || 0;
                                setUploadForm(prev => ({ ...prev, variants: newVariants }));
                              }}
                              className="bg-slate-700 border-slate-600 h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        {/* Texture (optional) */}
                        <div className="mb-2">
                          <Label className="text-xs text-slate-500 mb-1 block">Texture (optional)</Label>
                          <select
                            value={variant.texture || ''}
                            onChange={(e) => {
                              const newVariants = [...uploadForm.variants];
                              newVariants[index].texture = e.target.value;
                              setUploadForm(prev => ({ ...prev, variants: newVariants }));
                            }}
                            className="w-full bg-slate-700 border-slate-600 rounded-md h-8 text-sm"
                          >
                            {TEXTURE_OPTIONS.map((t) => (
                              <option key={t || 'none'} value={t}>{t || '—'}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Color Selection */}
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Color (optional)</Label>
                          <div className="flex items-center gap-2">
                            {/* Color preview */}
                            <div 
                              className="w-8 h-8 rounded border-2 border-slate-600 flex-shrink-0"
                              style={{ backgroundColor: variant.colorHex || '#374151' }}
                            />
                            {/* Color name input */}
                            <Input
                              placeholder="e.g., Blue, Red"
                              value={variant.color || ''}
                              onChange={(e) => {
                                const newVariants = [...uploadForm.variants];
                                newVariants[index].color = e.target.value;
                                // Auto-match color hex from presets
                                const preset = COLOR_PRESETS.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                                if (preset) {
                                  newVariants[index].colorHex = preset.hex;
                                }
                                setUploadForm(prev => ({ ...prev, variants: newVariants }));
                              }}
                              className="bg-slate-700 border-slate-600 h-8 text-sm flex-1"
                            />
                            {/* Color picker */}
                            <input
                              type="color"
                              value={variant.colorHex || '#374151'}
                              onChange={(e) => {
                                const newVariants = [...uploadForm.variants];
                                newVariants[index].colorHex = e.target.value;
                                setUploadForm(prev => ({ ...prev, variants: newVariants }));
                              }}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                              title="Pick custom color"
                            />
                          </div>
                          {/* Color presets */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {COLOR_PRESETS.slice(0, 10).map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  variant.colorHex === preset.hex ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
                                }`}
                                style={{ backgroundColor: preset.hex }}
                                onClick={() => {
                                  const newVariants = [...uploadForm.variants];
                                  newVariants[index].color = preset.name;
                                  newVariants[index].colorHex = preset.hex;
                                  setUploadForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Variant Image Upload */}
                        <div className="mt-3">
                          <Label className="text-xs text-slate-500 mb-1 block">Variant Image (optional)</Label>
                          <div className="flex items-center gap-2">
                            {/* Image preview */}
                            {variant.imageUrl ? (
                              <div className="relative w-16 h-16 rounded border-2 border-slate-600 overflow-hidden flex-shrink-0">
                                <img 
                                  src={variant.imageUrl} 
                                  alt={`${variant.sizeLabel} variant`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                  onClick={() => {
                                    const newVariants = [...uploadForm.variants];
                                    newVariants[index].imageUrl = '';
                                    setUploadForm(prev => ({ ...prev, variants: newVariants }));
                                  }}
                                  title="Remove image"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 flex-shrink-0">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                            {/* Upload button */}
                            <label className="flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  // Validate file
                                  if (!file.type.startsWith('image/')) {
                                    toast({
                                      title: 'Invalid file type',
                                      description: 'Please select an image file',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({
                                      title: 'File too large',
                                      description: 'Please select an image under 10MB',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  // Convert to base64
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const newVariants = [...uploadForm.variants];
                                    newVariants[index].imageUrl = reader.result as string;
                                    setUploadForm(prev => ({ ...prev, variants: newVariants }));
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <div className="cursor-pointer bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-3 py-2 text-xs text-center transition-colors">
                                {variant.imageUrl ? 'Change Image' : 'Upload Image'}
                              </div>
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Upload a specific image for this size/variant (e.g., 1L, 4L, 20L containers)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-3 italic">No sizes added yet. Click "+ Add Size" to add product variants.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadForm({ name: '', category: 'Cement', description: '', unit: 'unit', suggestedPrice: 0, imageFile: null, previewUrl: '', pricingType: 'single', variants: [] });
              }}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading || !uploadForm.imageFile || !uploadForm.name}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* BULK UPLOAD DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showBulkUploadDialog} onOpenChange={(open) => !open && closeBulkUploadDialog()}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] max-w-6xl h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-6 w-6 text-orange-400" />
              Bulk Upload Materials
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Upload multiple images at once. Select files, then edit each item's name, category, and price below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Default Category and Unit Selection - Compact */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-3">📋 Default values for new images:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">Default Category</Label>
                  <Select value={bulkUploadCategory} onValueChange={setBulkUploadCategory}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {PRODUCT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Default Unit</Label>
                  <Select value={bulkUploadUnit} onValueChange={setBulkUploadUnit}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {/* Weight & Mass */}
                      <SelectItem value="kg">Per Kg</SelectItem>
                      <SelectItem value="gram">Per Gram</SelectItem>
                      <SelectItem value="tonne">Per Tonne</SelectItem>
                      <SelectItem value="ton">Per Ton</SelectItem>
                      {/* Volume */}
                      <SelectItem value="liter">Per Liter</SelectItem>
                      <SelectItem value="ml">Per ML</SelectItem>
                      <SelectItem value="cubic meter">Per M³</SelectItem>
                      <SelectItem value="cubic foot">Per Cubic Foot</SelectItem>
                      {/* Length */}
                      <SelectItem value="meter">Per Meter</SelectItem>
                      <SelectItem value="mm">Per MM</SelectItem>
                      <SelectItem value="cm">Per CM</SelectItem>
                      <SelectItem value="foot">Per Foot</SelectItem>
                      <SelectItem value="ft">Per Ft</SelectItem>
                      <SelectItem value="inch">Per Inch</SelectItem>
                      {/* Area */}
                      <SelectItem value="sqm">Per Sqm</SelectItem>
                      <SelectItem value="sqft">Per Sqft</SelectItem>
                      {/* Count/Quantity */}
                      <SelectItem value="piece">Per Piece</SelectItem>
                      <SelectItem value="unit">Per Unit</SelectItem>
                      <SelectItem value="pair">Per Pair</SelectItem>
                      <SelectItem value="dozen">Per Dozen</SelectItem>
                      <SelectItem value="set">Per Set</SelectItem>
                      <SelectItem value="bundle">Per Bundle</SelectItem>
                      {/* Packaging */}
                      <SelectItem value="bag">Per Bag</SelectItem>
                      <SelectItem value="packet">Per Packet</SelectItem>
                      <SelectItem value="carton">Per Carton</SelectItem>
                      <SelectItem value="box">Per Box</SelectItem>
                      <SelectItem value="pallet">Per Pallet</SelectItem>
                      {/* Sheets & Rolls */}
                      <SelectItem value="sheet">Per Sheet</SelectItem>
                      <SelectItem value="roll">Per Roll</SelectItem>
                      <SelectItem value="coil">Per Coil</SelectItem>
                      {/* Building Specific */}
                      <SelectItem value="trip">Per Trip</SelectItem>
                      <SelectItem value="lorry">Per Lorry</SelectItem>
                      <SelectItem value="wheelbarrow">Per Wheelbarrow</SelectItem>
                      {/* Length Bundles */}
                      <SelectItem value="length">Per Length</SelectItem>
                      <SelectItem value="bar">Per Bar</SelectItem>
                      <SelectItem value="rod">Per Rod</SelectItem>
                      <SelectItem value="pole">Per Pole</SelectItem>
                      {/* Liquid Containers */}
                      <SelectItem value="drum">Per Drum</SelectItem>
                      <SelectItem value="jerrycan">Per Jerrycan</SelectItem>
                      <SelectItem value="bucket">Per Bucket</SelectItem>
                      <SelectItem value="tin">Per Tin</SelectItem>
                      {/* Water Tank Sizes */}
                      <SelectItem value="100L">100 Litres</SelectItem>
                      <SelectItem value="200L">200 Litres</SelectItem>
                      <SelectItem value="250L">250 Litres</SelectItem>
                      <SelectItem value="500L">500 Litres</SelectItem>
                      <SelectItem value="750L">750 Litres</SelectItem>
                      <SelectItem value="1000L">1,000 Litres</SelectItem>
                      <SelectItem value="1500L">1,500 Litres</SelectItem>
                      <SelectItem value="2000L">2,000 Litres</SelectItem>
                      <SelectItem value="3000L">3,000 Litres</SelectItem>
                      <SelectItem value="5000L">5,000 Litres</SelectItem>
                      <SelectItem value="10000L">10,000 Litres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* File Selection Area - Compact */}
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:border-orange-500 transition-colors"
              onClick={() => bulkFileInputRef.current?.click()}
            >
              <div className="flex items-center justify-center gap-4">
                <Upload className="h-6 w-6 text-orange-400" />
                <div>
                  <p className="text-slate-300 font-medium">Click to select images</p>
                  <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF (max 10MB each)</p>
                </div>
                {bulkUploadItems.length > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-sm px-3 py-1">
                    {bulkUploadItems.length} selected
                  </Badge>
                )}
              </div>
            </div>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.avif"
              multiple
              onChange={handleBulkFileSelect}
              className="hidden"
            />

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* UPLOADED IMAGES EDITING AREA - THIS IS THE MAIN AREA */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {bulkUploadItems.length > 0 && (
              <>
                {/* Section Header */}
                <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-lg p-4 mt-4">
                  <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                    📦 Edit Your {bulkUploadItems.length} Uploaded Image{bulkUploadItems.length > 1 ? 's' : ''} Below
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Fill in the name, category, and price for each image</p>
                </div>

                {/* Items List - LARGE CARDS for easy editing */}
                <div className="space-y-6 mt-6">
                  {bulkUploadItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`bg-slate-800 rounded-xl p-5 border-2 ${
                        item.uploaded ? 'border-green-500 bg-green-900/20' : 
                        item.error ? 'border-red-500 bg-red-900/20' : 
                        'border-slate-600'
                      }`}
                    >
                      {/* Item Number Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
                        <span className="text-lg font-bold text-white">Image #{index + 1}</span>
                        {item.uploading ? (
                          <Badge className="bg-blue-500/20 text-blue-400 text-sm px-3 py-1">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </Badge>
                        ) : item.uploaded ? (
                          <Badge className="bg-green-500/20 text-green-400 text-sm px-3 py-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Uploaded
                          </Badge>
                        ) : item.error ? (
                          <Badge className="bg-red-500/20 text-red-400 text-sm px-3 py-1">
                            <XCircle className="h-4 w-4 mr-2" />
                            Error
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 text-sm px-3 py-1">
                            Pending
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-6">
                        {/* Image Preview - BIGGER */}
                        <div className="flex-shrink-0">
                          <img 
                            src={item.previewUrl} 
                            alt={item.name}
                            className="w-32 h-32 object-cover rounded-lg border-2 border-slate-600"
                          />
                          {!item.uploaded && !item.uploading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={() => removeBulkItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      
                      {/* Form Fields - BIGGER and CLEARER */}
                      <div className="flex-1 space-y-4 min-w-0">
                        {/* Row 1: Name - FULL WIDTH, BIGGER */}
                        <div>
                          <Label className="text-sm text-white font-semibold mb-2 block">Material Name *</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateBulkItem(item.id, { name: e.target.value })}
                            placeholder="e.g., Bamburi Cement 50kg"
                            className="bg-slate-700 border-slate-500 h-12 text-base"
                            disabled={item.uploaded || item.uploading}
                          />
                        </div>
                        
                        {/* Row 2: Category and Unit - BIGGER */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-white font-semibold mb-2 block">Category *</Label>
                            <Select 
                              value={item.category} 
                              onValueChange={(value) => updateBulkItem(item.id, { category: value })}
                              disabled={item.uploaded || item.uploading}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-500 h-12 text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {PRODUCT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm text-white font-semibold mb-2 block">Unit</Label>
                            <Select 
                              value={item.unit} 
                              onValueChange={(value) => updateBulkItem(item.id, { unit: value })}
                              disabled={item.uploaded || item.uploading}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-500 h-12 text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {/* Weight & Mass */}
                                <SelectItem value="kg">Per Kg</SelectItem>
                                <SelectItem value="gram">Per Gram</SelectItem>
                                <SelectItem value="tonne">Per Tonne</SelectItem>
                                <SelectItem value="ton">Per Ton</SelectItem>
                                {/* Volume */}
                                <SelectItem value="liter">Per Liter</SelectItem>
                                <SelectItem value="ml">Per ML</SelectItem>
                                <SelectItem value="cubic meter">Per M³</SelectItem>
                                <SelectItem value="cubic foot">Per Cubic Foot</SelectItem>
                                {/* Length */}
                                <SelectItem value="meter">Per Meter</SelectItem>
                                <SelectItem value="mm">Per MM</SelectItem>
                                <SelectItem value="cm">Per CM</SelectItem>
                                <SelectItem value="foot">Per Foot</SelectItem>
                                <SelectItem value="ft">Per Ft</SelectItem>
                                <SelectItem value="inch">Per Inch</SelectItem>
                                {/* Area */}
                                <SelectItem value="sqm">Per Sqm</SelectItem>
                                <SelectItem value="sqft">Per Sqft</SelectItem>
                                {/* Count/Quantity */}
                                <SelectItem value="piece">Per Piece</SelectItem>
                                <SelectItem value="unit">Per Unit</SelectItem>
                                <SelectItem value="pair">Per Pair</SelectItem>
                                <SelectItem value="dozen">Per Dozen</SelectItem>
                                <SelectItem value="set">Per Set</SelectItem>
                                <SelectItem value="bundle">Per Bundle</SelectItem>
                                {/* Packaging */}
                                <SelectItem value="bag">Per Bag</SelectItem>
                                <SelectItem value="packet">Per Packet</SelectItem>
                                <SelectItem value="carton">Per Carton</SelectItem>
                                <SelectItem value="box">Per Box</SelectItem>
                                <SelectItem value="pallet">Per Pallet</SelectItem>
                                {/* Sheets & Rolls */}
                                <SelectItem value="sheet">Per Sheet</SelectItem>
                                <SelectItem value="roll">Per Roll</SelectItem>
                                <SelectItem value="coil">Per Coil</SelectItem>
                                {/* Building Specific */}
                                <SelectItem value="trip">Per Trip</SelectItem>
                                <SelectItem value="lorry">Per Lorry</SelectItem>
                                <SelectItem value="wheelbarrow">Per Wheelbarrow</SelectItem>
                                {/* Length Bundles */}
                                <SelectItem value="length">Per Length</SelectItem>
                                <SelectItem value="bar">Per Bar</SelectItem>
                                <SelectItem value="rod">Per Rod</SelectItem>
                                <SelectItem value="pole">Per Pole</SelectItem>
                                {/* Liquid Containers */}
                                <SelectItem value="drum">Per Drum</SelectItem>
                                <SelectItem value="jerrycan">Per Jerrycan</SelectItem>
                                <SelectItem value="bucket">Per Bucket</SelectItem>
                                <SelectItem value="tin">Per Tin</SelectItem>
                                {/* Water Tank Sizes */}
                                <SelectItem value="100L">100 Litres</SelectItem>
                                <SelectItem value="200L">200 Litres</SelectItem>
                                <SelectItem value="250L">250 Litres</SelectItem>
                                <SelectItem value="500L">500 Litres</SelectItem>
                                <SelectItem value="750L">750 Litres</SelectItem>
                                <SelectItem value="1000L">1,000 Litres</SelectItem>
                                <SelectItem value="1500L">1,500 Litres</SelectItem>
                                <SelectItem value="2000L">2,000 Litres</SelectItem>
                                <SelectItem value="3000L">3,000 Litres</SelectItem>
                                <SelectItem value="5000L">5,000 Litres</SelectItem>
                                <SelectItem value="10000L">10,000 Litres</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Row 3: Description */}
                        <div>
                          <Label className="text-sm text-white font-semibold mb-2 block">Description (optional)</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateBulkItem(item.id, { description: e.target.value })}
                            placeholder="Brief product description..."
                            className="bg-slate-700 border-slate-500 h-12 text-base"
                            disabled={item.uploaded || item.uploading}
                          />
                        </div>

                        {/* Row 4: Pricing Section */}
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 space-y-4">
                          {/* Pricing Type Toggle */}
                          <div>
                            <Label className="text-sm text-white font-semibold mb-2 block">Pricing Type *</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={item.pricingType === 'single' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 ${item.pricingType === 'single' ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-500 text-slate-300'}`}
                                onClick={() => updateBulkItem(item.id, { pricingType: 'single' })}
                                disabled={item.uploaded || item.uploading}
                              >
                                💰 Single Price
                              </Button>
                              <Button
                                type="button"
                                variant={item.pricingType === 'variants' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 ${item.pricingType === 'variants' ? 'bg-purple-500 hover:bg-purple-600' : 'border-slate-500 text-slate-300'}`}
                                onClick={() => updateBulkItem(item.id, { 
                                  pricingType: 'variants',
                                  variants: item.variants.length === 0 ? [{ id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0, imageUrl: '' }] : item.variants
                                })}
                                disabled={item.uploaded || item.uploading}
                              >
                                📊 Multiple Sizes / Variants
                              </Button>
                            </div>
                          </div>

                          {/* Suggested Price - Always visible */}
                          <div>
                            <Label className="text-sm text-white font-semibold mb-2 block">Suggested Price (KES) *</Label>
                            <Input
                              type="number"
                              value={item.suggestedPrice || ''}
                              onChange={(e) => updateBulkItem(item.id, { suggestedPrice: parseFloat(e.target.value) || 0 })}
                              placeholder="850.00"
                              className="bg-slate-600 border-slate-500 h-12 text-lg font-semibold"
                              disabled={item.uploaded || item.uploading}
                            />
                          </div>

                          {/* Product Sizes / Variants - Always visible */}
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/30">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm text-purple-300 font-semibold">Product Sizes / Variants</Label>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-purple-500 text-purple-400 hover:bg-purple-500/20 h-8 text-xs px-3"
                                onClick={() => {
                                  const newVariants = [...item.variants, { id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0, imageUrl: '' }];
                                  updateBulkItem(item.id, { pricingType: 'variants', variants: newVariants });
                                }}
                                disabled={item.uploaded || item.uploading}
                              >
                                + Add Variant
                              </Button>
                            </div>
                            
                            {item.variants.length > 0 ? (
                              <div className="space-y-3">
                                {/* Variant Rows */}
                                {item.variants.map((variant, vIdx) => (
                                  <div key={variant.id} className="bg-slate-700/50 rounded-lg p-2 border border-slate-600">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-slate-400">Variant #{vIdx + 1}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-red-400 hover:text-red-300"
                                        onClick={() => {
                                          const newVariants = item.variants.filter(v => v.id !== variant.id);
                                          updateBulkItem(item.id, { 
                                            variants: newVariants,
                                            pricingType: newVariants.length === 0 ? 'single' : 'variants'
                                          });
                                        }}
                                        disabled={item.uploaded || item.uploading}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <div className="flex gap-1">
                                        <Input
                                          placeholder="Size (e.g., 1, 2)"
                                          value={variant.sizeLabel}
                                          onChange={(e) => {
                                            const newVariants = [...item.variants];
                                            newVariants[vIdx].sizeLabel = e.target.value;
                                            updateBulkItem(item.id, { variants: newVariants });
                                          }}
                                          className="bg-slate-600 border-slate-500 h-8 text-sm flex-1"
                                          disabled={item.uploaded || item.uploading}
                                        />
                                        <select
                                          value={variant.sizeUnit || ''}
                                          onChange={(e) => {
                                            const newVariants = [...item.variants];
                                            newVariants[vIdx].sizeUnit = e.target.value;
                                            updateBulkItem(item.id, { variants: newVariants });
                                          }}
                                          className="bg-slate-600 border-slate-500 rounded h-8 text-xs min-w-[60px]"
                                          disabled={item.uploaded || item.uploading}
                                        >
                                          {SIZE_UNITS.map((u) => (
                                            <option key={u || 'none'} value={u}>{u || '—'}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <Input
                                        type="number"
                                        placeholder="Price (KES)"
                                        value={variant.price || ''}
                                        onChange={(e) => {
                                          const newVariants = [...item.variants];
                                          newVariants[vIdx].price = parseFloat(e.target.value) || 0;
                                          updateBulkItem(item.id, { variants: newVariants });
                                        }}
                                        className="bg-slate-600 border-slate-500 h-8 text-sm"
                                        disabled={item.uploaded || item.uploading}
                                      />
                                    </div>
                                    <div className="mb-2">
                                      <select
                                        value={variant.texture || ''}
                                        onChange={(e) => {
                                          const newVariants = [...item.variants];
                                          newVariants[vIdx].texture = e.target.value;
                                          updateBulkItem(item.id, { variants: newVariants });
                                        }}
                                        className="w-full bg-slate-600 border-slate-500 rounded h-8 text-xs"
                                        disabled={item.uploaded || item.uploading}
                                      >
                                        {TEXTURE_OPTIONS.map((t) => (
                                          <option key={t || 'none'} value={t}>{t || '—'}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Color Selection */}
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-6 h-6 rounded border border-slate-500 flex-shrink-0"
                                        style={{ backgroundColor: variant.colorHex || '#374151' }}
                                      />
                                      <Input
                                        placeholder="Color name"
                                        value={variant.color || ''}
                                        onChange={(e) => {
                                          const newVariants = [...item.variants];
                                          newVariants[vIdx].color = e.target.value;
                                          const preset = COLOR_PRESETS.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                                          if (preset) newVariants[vIdx].colorHex = preset.hex;
                                          updateBulkItem(item.id, { variants: newVariants });
                                        }}
                                        className="bg-slate-600 border-slate-500 h-7 text-xs flex-1"
                                        disabled={item.uploaded || item.uploading}
                                      />
                                      <input
                                        type="color"
                                        value={variant.colorHex || '#374151'}
                                        onChange={(e) => {
                                          const newVariants = [...item.variants];
                                          newVariants[vIdx].colorHex = e.target.value;
                                          updateBulkItem(item.id, { variants: newVariants });
                                        }}
                                        className="w-6 h-6 rounded cursor-pointer border-0"
                                        disabled={item.uploaded || item.uploading}
                                      />
                                    </div>
                                    {/* Quick color presets */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {COLOR_PRESETS.slice(0, 8).map((preset) => (
                                        <button
                                          key={preset.name}
                                          type="button"
                                          className={`w-4 h-4 rounded-full border transition-all ${
                                            variant.colorHex === preset.hex ? 'border-white scale-110' : 'border-slate-500'
                                          }`}
                                          style={{ backgroundColor: preset.hex }}
                                          onClick={() => {
                                            const newVariants = [...item.variants];
                                            newVariants[vIdx].color = preset.name;
                                            newVariants[vIdx].colorHex = preset.hex;
                                            updateBulkItem(item.id, { variants: newVariants });
                                          }}
                                          disabled={item.uploaded || item.uploading}
                                          title={preset.name}
                                        />
                                      ))}
                                    </div>
                                    
                                    {/* Variant Image Upload */}
                                    <div className="mt-2 flex items-center gap-2">
                                      {variant.imageUrl ? (
                                        <div className="relative w-10 h-10 rounded border border-slate-500 overflow-hidden flex-shrink-0">
                                          <img 
                                            src={variant.imageUrl} 
                                            alt={`${variant.sizeLabel} variant`}
                                            className="w-full h-full object-cover"
                                          />
                                          <button
                                            type="button"
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                            onClick={() => {
                                              const newVariants = [...item.variants];
                                              newVariants[vIdx].imageUrl = '';
                                              updateBulkItem(item.id, { variants: newVariants });
                                            }}
                                            disabled={item.uploaded || item.uploading}
                                            title="Remove image"
                                          >
                                            <X className="h-2 w-2" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 rounded border border-dashed border-slate-500 flex items-center justify-center text-slate-500 flex-shrink-0">
                                          <ImageIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <label className="flex-1">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={item.uploaded || item.uploading}
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
                                              toast({
                                                title: 'Invalid file',
                                                description: 'Please select an image under 10MB',
                                                variant: 'destructive',
                                              });
                                              return;
                                            }
                                            
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                              const newVariants = [...item.variants];
                                              newVariants[vIdx].imageUrl = reader.result as string;
                                              updateBulkItem(item.id, { variants: newVariants });
                                            };
                                            reader.readAsDataURL(file);
                                          }}
                                        />
                                        <div className="cursor-pointer bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded px-2 py-1 text-[10px] text-center transition-colors">
                                          {variant.imageUrl ? 'Change' : 'Add Image'}
                                        </div>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 text-center py-3 italic">No variants added yet. Click "+ Add Variant" to add size/color options.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {bulkUploadItems.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No images selected yet</p>
                  <p className="text-xs mt-1">Click above to add images</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 flex-shrink-0 border-t border-slate-700 mt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-slate-400">
                {bulkUploadItems.filter(i => i.uploaded).length} of {bulkUploadItems.length} uploaded
              </div>
              <div className="flex gap-2">
                {bulkUploadItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearBulkItems}
                    className="border-slate-600 text-slate-300"
                    disabled={bulkUploading}
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeBulkUploadDialog}
                  className="border-slate-600"
                  disabled={bulkUploading}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkUpload}
                  disabled={bulkUploading || bulkUploadItems.filter(i => !i.uploaded && i.name.trim()).length === 0}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {bulkUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload All ({bulkUploadItems.filter(i => !i.uploaded && i.name.trim()).length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(selectedImage as any)?.name || 'Image Preview'}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img
                src={(selectedImage as any).image_url}
                alt={(selectedImage as any).name}
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline">{(selectedImage as any).category}</Badge>
                  {'supplier' in selectedImage && selectedImage.supplier && (
                    <span className="ml-2 text-sm text-slate-400">
                      by {(selectedImage as any).supplier?.company_name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {new Date((selectedImage as any).created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Enhanced with Pricing Options */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          
          {editingImage && (
            <div className="space-y-3">
              {/* Image Preview (read-only) */}
              <div className="flex gap-3">
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
                  <img
                    src={editingImage.image_url}
                    alt={editingImage.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <Label htmlFor="edit-name" className="text-xs">Material Name *</Label>
                    <Input
                      id="edit-name"
                      placeholder="e.g., Bamburi Cement 50kg"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-slate-800 border-slate-600 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 h-8 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="edit-description" className="text-xs">Description</Label>
                <textarea
                  id="edit-description"
                  placeholder="Brief product description..."
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full h-16 px-2 py-1 text-sm rounded-md bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Unit Selection */}
              <div>
                <Label className="text-xs">Unit</Label>
                <Select
                  value={editForm.unit}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {/* Weight & Mass */}
                    <SelectItem value="kg">Per Kg</SelectItem>
                    <SelectItem value="gram">Per Gram</SelectItem>
                    <SelectItem value="tonne">Per Tonne</SelectItem>
                    <SelectItem value="ton">Per Ton</SelectItem>
                    {/* Volume */}
                    <SelectItem value="liter">Per Liter</SelectItem>
                    <SelectItem value="ml">Per ML</SelectItem>
                    <SelectItem value="cubic meter">Per M³</SelectItem>
                    <SelectItem value="cubic foot">Per Cubic Foot</SelectItem>
                    {/* Length */}
                    <SelectItem value="meter">Per Meter</SelectItem>
                    <SelectItem value="mm">Per MM</SelectItem>
                    <SelectItem value="cm">Per CM</SelectItem>
                    <SelectItem value="foot">Per Foot</SelectItem>
                    <SelectItem value="ft">Per Ft</SelectItem>
                    <SelectItem value="inch">Per Inch</SelectItem>
                    {/* Area */}
                    <SelectItem value="sqm">Per Sqm</SelectItem>
                    <SelectItem value="sqft">Per Sqft</SelectItem>
                    {/* Count/Quantity */}
                    <SelectItem value="piece">Per Piece</SelectItem>
                    <SelectItem value="unit">Per Unit</SelectItem>
                    <SelectItem value="pair">Per Pair</SelectItem>
                    <SelectItem value="dozen">Per Dozen</SelectItem>
                    <SelectItem value="set">Per Set</SelectItem>
                    <SelectItem value="bundle">Per Bundle</SelectItem>
                    {/* Packaging */}
                    <SelectItem value="bag">Per Bag</SelectItem>
                    <SelectItem value="packet">Per Packet</SelectItem>
                    <SelectItem value="carton">Per Carton</SelectItem>
                    <SelectItem value="box">Per Box</SelectItem>
                    <SelectItem value="pallet">Per Pallet</SelectItem>
                    {/* Sheets & Rolls */}
                    <SelectItem value="sheet">Per Sheet</SelectItem>
                    <SelectItem value="roll">Per Roll</SelectItem>
                    <SelectItem value="coil">Per Coil</SelectItem>
                    {/* Building Specific */}
                    <SelectItem value="trip">Per Trip</SelectItem>
                    <SelectItem value="lorry">Per Lorry</SelectItem>
                    <SelectItem value="wheelbarrow">Per Wheelbarrow</SelectItem>
                    {/* Length Bundles */}
                    <SelectItem value="length">Per Length</SelectItem>
                    <SelectItem value="bar">Per Bar</SelectItem>
                    <SelectItem value="rod">Per Rod</SelectItem>
                    <SelectItem value="pole">Per Pole</SelectItem>
                    {/* Liquid Containers */}
                    <SelectItem value="drum">Per Drum</SelectItem>
                    <SelectItem value="jerrycan">Per Jerrycan</SelectItem>
                    <SelectItem value="bucket">Per Bucket</SelectItem>
                    <SelectItem value="tin">Per Tin</SelectItem>
                    {/* Water Tank Sizes */}
                    <SelectItem value="100L">100 Litres</SelectItem>
                    <SelectItem value="200L">200 Litres</SelectItem>
                    <SelectItem value="250L">250 Litres</SelectItem>
                    <SelectItem value="500L">500 Litres</SelectItem>
                    <SelectItem value="750L">750 Litres</SelectItem>
                    <SelectItem value="1000L">1,000 Litres</SelectItem>
                    <SelectItem value="1500L">1,500 Litres</SelectItem>
                    <SelectItem value="2000L">2,000 Litres</SelectItem>
                    <SelectItem value="3000L">3,000 Litres</SelectItem>
                    <SelectItem value="5000L">5,000 Litres</SelectItem>
                    <SelectItem value="10000L">10,000 Litres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-4">
                {/* Pricing Type Toggle */}
                <div>
                  <Label className="text-sm text-white font-semibold mb-2 block">Pricing Type *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={editForm.pricingType === 'single' ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${editForm.pricingType === 'single' ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-600 text-slate-300'}`}
                      onClick={() => setEditForm(prev => ({ ...prev, pricingType: 'single' }))}
                    >
                      💰 Single Price
                    </Button>
                    <Button
                      type="button"
                      variant={editForm.pricingType === 'variants' ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${editForm.pricingType === 'variants' ? 'bg-purple-500 hover:bg-purple-600' : 'border-slate-600 text-slate-300'}`}
                      onClick={() => setEditForm(prev => ({ 
                        ...prev, 
                        pricingType: 'variants',
                        variants: prev.variants.length === 0 ? [{ id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0, imageUrl: '' }] : prev.variants
                      }))}
                    >
                      📊 Multiple Sizes / Variants
                    </Button>
                  </div>
                </div>

                {/* Suggested Price - Always visible */}
                <div>
                  <Label htmlFor="edit-suggestedPrice" className="text-sm text-white font-semibold mb-2 block">Suggested Price (KES) *</Label>
                  <Input
                    id="edit-suggestedPrice"
                    type="number"
                    placeholder="850.00"
                    value={editForm.suggestedPrice || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, suggestedPrice: parseFloat(e.target.value) || 0 }))}
                    className="bg-slate-700 border-slate-600 h-12 text-lg font-semibold"
                  />
                </div>

                {/* Product Sizes / Variants - Always visible */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm text-purple-300 font-semibold">Product Sizes / Variants</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-purple-500 text-purple-400 hover:bg-purple-500/20 h-8 text-xs px-3"
                      onClick={() => setEditForm(prev => ({
                        ...prev,
                        pricingType: 'variants',
                        variants: [...prev.variants, { id: crypto.randomUUID(), sizeLabel: '', sizeUnit: '', color: '', colorHex: '', texture: '', price: 0, stock: 0, imageUrl: '' }]
                      }))}
                    >
                      + Add Variant
                    </Button>
                  </div>
                  
                  {/* Variants Table */}
                  {editForm.variants.length > 0 ? (
                    <div className="space-y-3">
                      {/* Variant Rows */}
                      {editForm.variants.map((variant, index) => (
                        <div key={variant.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">Variant #{index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={() => {
                                const newVariants = editForm.variants.filter(v => v.id !== variant.id);
                                setEditForm(prev => ({
                                  ...prev,
                                  variants: newVariants,
                                  pricingType: newVariants.length === 0 ? 'single' : 'variants'
                                }));
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {/* Size Input + Unit */}
                            <div>
                              <Label className="text-xs text-slate-500 mb-1 block">Size</Label>
                              <div className="flex gap-1">
                                <Input
                                  placeholder="e.g., 1, 2, Large"
                                  value={variant.sizeLabel}
                                  onChange={(e) => {
                                    const newVariants = [...editForm.variants];
                                    newVariants[index].sizeLabel = e.target.value;
                                    setEditForm(prev => ({ ...prev, variants: newVariants }));
                                  }}
                                  className="bg-slate-700 border-slate-600 h-8 text-sm flex-1"
                                />
                                <select
                                  value={variant.sizeUnit || ''}
                                  onChange={(e) => {
                                    const newVariants = [...editForm.variants];
                                    newVariants[index].sizeUnit = e.target.value;
                                    setEditForm(prev => ({ ...prev, variants: newVariants }));
                                  }}
                                  className="bg-slate-700 border-slate-600 rounded-md h-8 text-sm min-w-[70px]"
                                >
                                  {SIZE_UNITS.map((u) => (
                                    <option key={u || 'none'} value={u}>{u || '—'}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* Price Input */}
                            <div>
                              <Label className="text-xs text-slate-500 mb-1 block">Price (KES)</Label>
                              <Input
                                type="number"
                                placeholder="120"
                                value={variant.price || ''}
                                onChange={(e) => {
                                  const newVariants = [...editForm.variants];
                                  newVariants[index].price = parseFloat(e.target.value) || 0;
                                  setEditForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                className="bg-slate-700 border-slate-600 h-8 text-sm"
                              />
                            </div>
                          </div>
                          
                          {/* Texture (optional) */}
                          <div className="mb-2">
                            <Label className="text-xs text-slate-500 mb-1 block">Texture (optional)</Label>
                            <select
                              value={variant.texture || ''}
                              onChange={(e) => {
                                const newVariants = [...editForm.variants];
                                newVariants[index].texture = e.target.value;
                                setEditForm(prev => ({ ...prev, variants: newVariants }));
                              }}
                              className="w-full bg-slate-700 border-slate-600 rounded-md h-8 text-sm"
                            >
                              {TEXTURE_OPTIONS.map((t) => (
                                <option key={t || 'none'} value={t}>{t || '—'}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Color Selection */}
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Color (optional)</Label>
                            <div className="flex items-center gap-2">
                              {/* Color preview */}
                              <div 
                                className="w-8 h-8 rounded border-2 border-slate-600 flex-shrink-0"
                                style={{ backgroundColor: variant.colorHex || '#374151' }}
                              />
                              {/* Color name input */}
                              <Input
                                placeholder="e.g., Blue, Red"
                                value={variant.color || ''}
                                onChange={(e) => {
                                  const newVariants = [...editForm.variants];
                                  newVariants[index].color = e.target.value;
                                  // Auto-match color hex from presets
                                  const preset = COLOR_PRESETS.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                                  if (preset) {
                                    newVariants[index].colorHex = preset.hex;
                                  }
                                  setEditForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                className="bg-slate-700 border-slate-600 h-8 text-sm flex-1"
                              />
                              {/* Color picker */}
                              <input
                                type="color"
                                value={variant.colorHex || '#374151'}
                                onChange={(e) => {
                                  const newVariants = [...editForm.variants];
                                  newVariants[index].colorHex = e.target.value;
                                  setEditForm(prev => ({ ...prev, variants: newVariants }));
                                }}
                                className="w-8 h-8 rounded cursor-pointer border-0"
                                title="Pick custom color"
                              />
                            </div>
                            {/* Color presets */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {COLOR_PRESETS.slice(0, 10).map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    variant.colorHex === preset.hex ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
                                  }`}
                                  style={{ backgroundColor: preset.hex }}
                                  onClick={() => {
                                    const newVariants = [...editForm.variants];
                                    newVariants[index].color = preset.name;
                                    newVariants[index].colorHex = preset.hex;
                                    setEditForm(prev => ({ ...prev, variants: newVariants }));
                                  }}
                                  title={preset.name}
                                />
                              ))}
                            </div>
                          </div>
                          
                          {/* Variant Image Upload */}
                          <div className="mt-3">
                            <Label className="text-xs text-slate-500 mb-1 block">Variant Image (optional)</Label>
                            <div className="flex items-center gap-2">
                              {/* Image preview */}
                              {variant.imageUrl ? (
                                <div className="relative w-16 h-16 rounded border-2 border-slate-600 overflow-hidden flex-shrink-0">
                                  <img 
                                    src={variant.imageUrl} 
                                    alt={`${variant.sizeLabel} variant`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                    onClick={() => {
                                      const newVariants = [...editForm.variants];
                                      newVariants[index].imageUrl = '';
                                      setEditForm(prev => ({ ...prev, variants: newVariants }));
                                    }}
                                    title="Remove image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 flex-shrink-0">
                                  <ImageIcon className="h-6 w-6" />
                                </div>
                              )}
                              {/* Upload button */}
                              <label className="flex-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    // Validate file
                                    if (!file.type.startsWith('image/')) {
                                      toast({
                                        title: 'Invalid file type',
                                        description: 'Please select an image file',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast({
                                        title: 'File too large',
                                        description: 'Please select an image under 10MB',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    
                                    // Convert to base64
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      const newVariants = [...editForm.variants];
                                      newVariants[index].imageUrl = reader.result as string;
                                      setEditForm(prev => ({ ...prev, variants: newVariants }));
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <div className="cursor-pointer bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-3 py-2 text-xs text-center transition-colors">
                                  {variant.imageUrl ? 'Change Image' : 'Upload Image'}
                                </div>
                              </label>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Upload a specific image for this size/variant</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-3 italic">No variants added yet. Click "+ Add Variant" to add size/color options.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEditDialog(false);
                setEditingImage(null);
              }}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={uploading || !editForm.name.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MULTI-ANGLE GALLERY DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showGalleryDialog} onOpenChange={setShowGalleryDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📷 {galleryImage?.name || 'Image Gallery'}
              <Badge variant="outline" className="ml-2">{galleryImage?.category}</Badge>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              View all angles of this material. Click thumbnails to switch views.
            </DialogDescription>
          </DialogHeader>
          
          {galleryImage && (
            <div className="space-y-4">
              {/* Main Image Display */}
              <div className="relative bg-slate-800 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <img
                  src={getGalleryImages(galleryImage)[galleryActiveIndex]}
                  alt={`${galleryImage.name} - View ${galleryActiveIndex + 1}`}
                  className="w-full h-full object-contain"
                />
                
                {/* Navigation Arrows */}
                {getGalleryImages(galleryImage).length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setGalleryActiveIndex(prev => 
                        prev === 0 ? getGalleryImages(galleryImage).length - 1 : prev - 1
                      )}
                    >
                      ◀
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setGalleryActiveIndex(prev => 
                        prev === getGalleryImages(galleryImage).length - 1 ? 0 : prev + 1
                      )}
                    >
                      ▶
                    </Button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-2 right-2 bg-black/70 px-3 py-1 rounded-full text-sm">
                  {galleryActiveIndex + 1} / {getGalleryImages(galleryImage).length}
                </div>

                {/* Angle Label */}
                <div className="absolute top-2 left-2 bg-black/70 px-3 py-1 rounded-full text-sm">
                  {galleryActiveIndex === 0 ? '📷 Main/Front' : `🔄 View ${galleryActiveIndex + 1}`}
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {getGalleryImages(galleryImage).map((imgUrl, index) => (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      index === galleryActiveIndex 
                        ? 'border-orange-500 ring-2 ring-orange-500/50' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setGalleryActiveIndex(index)}
                  >
                    <img
                      src={imgUrl}
                      alt={`View ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-xs py-0.5">
                        Main
                      </div>
                    )}
                    {/* Delete button for additional images */}
                    {index > 0 && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this angle image?')) {
                            deleteAngleImage(galleryImage, index - 1);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {/* Add More Button */}
                <div
                  className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 hover:border-orange-500 cursor-pointer flex items-center justify-center transition-colors"
                  onClick={() => {
                    setShowGalleryDialog(false);
                    openAddAnglesDialog(galleryImage);
                  }}
                >
                  <div className="text-center">
                    <Upload className="h-5 w-5 text-slate-400 mx-auto" />
                    <span className="text-xs text-slate-400">Add</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (galleryImage) openAddAnglesDialog(galleryImage);
                setShowGalleryDialog(false);
              }}
              className="border-slate-600"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Add More Angles
            </Button>
            <Button onClick={() => setShowGalleryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* ADD ANGLE IMAGES DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showAddAnglesDialog} onOpenChange={(open) => {
        if (!open) {
          newAngleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
          setNewAngleImages([]);
        }
        setShowAddAnglesDialog(open);
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-400" />
              Add Angle Images
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add additional views for <strong className="text-white">{addAnglesImage?.name}</strong> (back, sides, detail, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current main image preview */}
            {addAnglesImage && (
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                <img 
                  src={addAnglesImage.image_url} 
                  alt={addAnglesImage.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <p className="font-medium">{addAnglesImage.name}</p>
                  <p className="text-sm text-slate-400">
                    Current views: {1 + (addAnglesImage.additional_images?.length || 0)}
                  </p>
                </div>
              </div>
            )}

            {/* File Selection */}
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
              onClick={() => angleFileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <p className="text-slate-300 font-medium">Click to add angle images</p>
              <p className="text-xs text-slate-500 mt-1">Back, sides, top, bottom, detail shots, etc.</p>
            </div>
            <input
              ref={angleFileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
              multiple
              onChange={handleAngleFileSelect}
              className="hidden"
            />

            {/* Selected Images List */}
            {newAngleImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Selected Images ({newAngleImages.length})</Label>
                <div className="grid grid-cols-2 gap-3">
                  {newAngleImages.map((img, index) => (
                    <div key={index} className="relative bg-slate-800 rounded-lg p-2 flex gap-2">
                      <img 
                        src={img.previewUrl} 
                        alt={`Angle ${index + 1}`}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Select value={img.angle} onValueChange={(v) => updateAngleLabel(index, v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMAGE_ANGLES.filter(a => a.id !== 'main').map(angle => (
                              <SelectItem key={angle.id} value={angle.id} className="text-sm">
                                {angle.icon} {angle.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:bg-red-500/20 flex-shrink-0"
                        onClick={() => removeAngleImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                newAngleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
                setNewAngleImages([]);
                setShowAddAnglesDialog(false);
              }}
              className="border-slate-600"
              disabled={uploadingAngles}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAngles}
              disabled={uploadingAngles || newAngleImages.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {uploadingAngles ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add {newAngleImages.length} Angle{newAngleImages.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialImagesManager;

