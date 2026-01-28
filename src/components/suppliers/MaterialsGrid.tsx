/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - MATERIALGRID.TSX - DO NOT MODIFY WITHOUT APPROVAL             ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Price Comparison Feature - "Compare Price" button on each card                 ║
 * ║   2. Quantity counter starting from 0                                               ║
 * ║   3. "🔥 Compare Prices (X)" header button with purple glow animation               ║
 * ║   4. Shopping cart integration via useCart hook                                     ║
 * ║   5. Only shows approved products (approval_status.eq.approved)                     ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, Store, Package, Filter, PartyPopper, Plus, Minus, Check, Scale, Camera, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { QuickPurchaseOrder } from '@/components/builders/QuickPurchaseOrder';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
import { LazyImage } from '@/components/ui/LazyImage';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { PriceComparisonModal } from './PriceComparisonModal';
import { QuoteCart, QuoteCartButton, QuoteCartItem } from './QuoteCart';
import { MobileBookView } from './MobileBookView';
import { FileText, BookOpen } from 'lucide-react';

// iOS/Safari compatibility check
const isIOSSafari = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
};

// Variant type for products with multiple sizes/prices
interface PriceVariant {
  id: string;
  sizeLabel: string;
  price: number;
  stock: number;
}

interface Material {
  id: string;
  supplier_id?: string; // Optional - admin materials don't have supplier_id
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_price: number;
  image_url?: string;
  additional_images?: string[]; // Multi-angle images (front, back, sides, etc.)
  in_stock: boolean;
  created_at?: string;
  supplier?: {
    company_name: string;
    location: string;
    rating: number;
  };
  // New: Pricing type and variants
  pricing_type?: 'single' | 'variants';
  variants?: PriceVariant[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// Based on complete analysis of Kenya's construction industry
// Includes all materials from foundation to finishing
// ═══════════════════════════════════════════════════════════════════════════════

const PRODUCT_CATEGORIES = [
  'All Categories',
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STRUCTURAL & FOUNDATION MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Cement',                    // Bamburi, Savannah, Mombasa, Simba, Athi River cement
  'Steel',                     // Y8, Y10, Y12, Y16, Y20, Y25, Y32 rebar, BRC mesh
  'Aggregates',                // Ballast, gravel, crushed stone
  'Sand',                      // River sand, pit sand, plastering sand, building sand
  'Stone',                     // Machine cut stones, natural stones, foundation stones
  'Blocks',                    // Concrete blocks, hollow blocks, solid blocks, cabro
  'Bricks',                    // Clay bricks, fire bricks, decorative bricks
  'Ready Mix Concrete',        // Pre-mixed concrete, screed
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ROOFING MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Roofing',                   // General roofing materials
  'Iron Sheets',               // Mabati, corrugated iron sheets, box profile
  'Roofing Tiles',             // Clay tiles, concrete tiles, slate tiles
  'Gutters & Downpipes',       // PVC gutters, metal gutters, downpipes
  'Roofing Accessories',       // Ridge caps, flashing, roofing nails, screws
  'Waterproofing',             // Damp proof membrane, bitumen, roof sealants
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TIMBER & WOOD PRODUCTS
  // ─────────────────────────────────────────────────────────────────────────────
  'Timber',                    // Cypress, pine, hardwood, mahogany, mvule
  'Plywood',                   // Marine plywood, shuttering plywood, MDF
  'Particle Board',            // Chipboard, OSB, hardboard
  'Timber Trusses',            // Roof trusses, prefab trusses
  'Formwork',                  // Shuttering boards, formwork panels
  'Treated Poles',             // Fence posts, power poles, building poles
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DOORS, WINDOWS & OPENINGS
  // ─────────────────────────────────────────────────────────────────────────────
  'Doors',                     // Wooden doors, flush doors, panel doors, security doors
  'Steel Doors',               // Metal doors, security grills, roller shutters
  'Windows',                   // Wooden windows, steel windows
  'Aluminium Windows',         // Sliding windows, casement windows, louvers
  'Glass',                     // Float glass, tinted glass, frosted glass
  'Door Frames',               // Wooden frames, metal frames, architraves
  'Door Hardware',             // Locks, handles, hinges, door closers
  'Window Hardware',           // Window stays, handles, locks, hinges
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PLUMBING & WATER SYSTEMS
  // ─────────────────────────────────────────────────────────────────────────────
  'Plumbing',                  // General plumbing supplies
  'PVC Pipes',                 // Pressure pipes, drainage pipes, conduits
  'PPR Pipes',                 // Hot water pipes, cold water pipes
  'GI Pipes',                  // Galvanized iron pipes, fittings
  'HDPE Pipes',                // High density polyethylene pipes
  'Pipe Fittings',             // Elbows, tees, reducers, couplings, unions
  'Valves',                    // Gate valves, ball valves, check valves, float valves
  'Water Tanks',               // Plastic tanks, steel tanks, underground tanks
  'Pumps',                     // Water pumps, booster pumps, submersible pumps
  'Taps & Mixers',             // Kitchen taps, bathroom taps, shower mixers
  'Sanitary Ware',             // Toilets, sinks, basins, bidets
  'Bathroom Accessories',      // Towel rails, soap dishes, mirrors, shower heads
  'Septic Tanks',              // Bio-digesters, septic systems
  'Water Heaters',             // Electric heaters, solar heaters, instant heaters
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ELECTRICAL MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Electrical',                // General electrical supplies
  'Cables & Wires',            // Twin & earth, single core, armored cables
  'Switches & Sockets',        // Light switches, power sockets, dimmers
  'Distribution Boards',       // DB boxes, MCBs, RCCBs, isolators
  'Lighting',                  // Bulbs, tubes, LED lights, chandeliers
  'Conduits',                  // PVC conduits, metal conduits, trunking
  'Electrical Accessories',    // Junction boxes, cable clips, terminals
  'Solar Equipment',           // Solar panels, inverters, batteries, charge controllers
  'Generators',                // Diesel generators, petrol generators
  'UPS & Stabilizers',         // Power backup, voltage stabilizers
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TILES & FLOORING
  // ─────────────────────────────────────────────────────────────────────────────
  'Tiles',                     // General tiles
  'Ceramic Tiles',             // Wall tiles, floor tiles
  'Porcelain Tiles',           // Polished, matte, anti-slip tiles
  'Granite Tiles',             // Natural granite, engineered stone
  'Marble',                    // Natural marble, cultured marble
  'Terrazzo',                  // Terrazzo tiles, terrazzo chips
  'Vinyl Flooring',            // PVC flooring, LVT, vinyl tiles
  'Wooden Flooring',           // Parquet, laminate, engineered wood
  'Carpet',                    // Wall to wall carpet, carpet tiles
  'Tile Adhesive',             // Cement-based, ready-mixed adhesives
  'Tile Grout',                // Colored grout, epoxy grout
  'Skirting',                  // Wooden skirting, PVC skirting, tile skirting
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PAINT & FINISHES
  // ─────────────────────────────────────────────────────────────────────────────
  'Paint',                     // Crown, Basco, Sadolin, Dulux paints
  'Emulsion Paint',            // Interior wall paint, ceiling paint
  'Gloss Paint',               // Oil-based paint, enamel paint
  'Exterior Paint',            // Weather shield, textured paint
  'Wood Finish',               // Varnish, wood stain, lacquer
  'Metal Paint',               // Hammerite, rust-proof paint
  'Primers',                   // Wall primer, metal primer, wood primer
  'Putty & Fillers',           // Wall putty, wood filler, crack filler
  'Thinners & Solvents',       // Paint thinner, turpentine, spirit
  'Brushes & Rollers',         // Paint brushes, rollers, spray guns
  
  // ─────────────────────────────────────────────────────────────────────────────
  // WALL & CEILING FINISHES
  // ─────────────────────────────────────────────────────────────────────────────
  'Gypsum',                    // Gypsum boards, gypsum plaster
  'Ceiling Boards',            // PVC ceiling, T&G boards, acoustic ceiling
  'Plaster',                   // Cement plaster, lime plaster
  'Wallpaper',                 // Vinyl wallpaper, fabric wallpaper
  'Wall Cladding',             // Stone cladding, wood cladding, PVC panels
  'Insulation',                // Thermal insulation, acoustic insulation
  'Cornices',                  // Gypsum cornices, decorative moldings
  
  // ─────────────────────────────────────────────────────────────────────────────
  // HARDWARE & FASTENERS
  // ─────────────────────────────────────────────────────────────────────────────
  'Hardware',                  // General hardware
  'Nails',                     // Wire nails, masonry nails, roofing nails
  'Screws',                    // Wood screws, self-tapping, drywall screws
  'Bolts & Nuts',              // Hex bolts, anchor bolts, expansion bolts
  'Hinges',                    // Butt hinges, piano hinges, gate hinges
  'Locks',                     // Padlocks, mortise locks, rim locks
  'Chains',                    // Galvanized chain, stainless chain
  'Wire',                      // Binding wire, fencing wire, barbed wire
  'Wire Mesh',                 // BRC mesh, chicken mesh, welded mesh
  'Brackets & Supports',       // Shelf brackets, joist hangers, angles
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TOOLS & EQUIPMENT
  // ─────────────────────────────────────────────────────────────────────────────
  'Tools',                     // General tools
  'Hand Tools',                // Hammers, screwdrivers, pliers, spanners
  'Power Tools',               // Drills, grinders, saws, sanders
  'Measuring Tools',           // Tape measures, levels, squares
  'Cutting Tools',             // Hacksaws, tile cutters, bolt cutters
  'Masonry Tools',             // Trowels, floats, jointers
  'Painting Tools',            // Brushes, rollers, spray equipment
  'Safety Equipment',          // Helmets, boots, gloves, harnesses
  'Scaffolding',               // Steel scaffolding, wooden scaffolding
  'Ladders',                   // Aluminium ladders, wooden ladders
  'Wheelbarrows',              // Construction wheelbarrows, concrete mixers
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ADHESIVES & SEALANTS
  // ─────────────────────────────────────────────────────────────────────────────
  'Adhesives',                 // Construction adhesive, wood glue, contact cement
  'Sealants',                  // Silicone sealant, acrylic sealant, PU sealant
  'Caulking',                  // Gap filler, expansion joint filler
  'Epoxy',                     // Epoxy resin, epoxy grout, anchoring epoxy
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FENCING & SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  'Fencing',                   // Chain link, welded mesh, palisade
  'Barbed Wire',               // Razor wire, concertina wire
  'Electric Fence',            // Energizers, insulators, fence wire
  'Gates',                     // Steel gates, sliding gates, swing gates
  'Security Systems',          // CCTV, alarms, access control
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LANDSCAPING & OUTDOOR
  // ─────────────────────────────────────────────────────────────────────────────
  'Paving',                    // Cabro, pavers, kerbs, edging
  'Outdoor Tiles',             // Non-slip tiles, pool tiles
  'Drainage',                  // Drainage channels, manholes, gratings
  'Retaining Walls',           // Gabions, retaining blocks
  'Garden Materials',          // Topsoil, compost, mulch, pebbles
  
  // ─────────────────────────────────────────────────────────────────────────────
  // KITCHEN & BUILT-IN
  // ─────────────────────────────────────────────────────────────────────────────
  'Kitchen Cabinets',          // Base units, wall units, pantry
  'Countertops',               // Granite tops, quartz, solid surface
  'Kitchen Sinks',             // Stainless steel, ceramic, granite sinks
  'Kitchen Hardware',          // Drawer slides, soft close hinges
  'Wardrobes',                 // Built-in wardrobes, closet systems
  
  // ─────────────────────────────────────────────────────────────────────────────
  // HVAC & VENTILATION
  // ─────────────────────────────────────────────────────────────────────────────
  'Air Conditioning',          // Split units, cassette, ducted AC
  'Ventilation',               // Exhaust fans, air vents, ducting
  'Ceiling Fans',              // Decorative fans, industrial fans
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FIRE SAFETY
  // ─────────────────────────────────────────────────────────────────────────────
  'Fire Safety',               // Fire extinguishers, fire blankets
  'Fire Doors',                // Fire rated doors, smoke seals
  'Fire Alarm',                // Smoke detectors, fire alarm panels
  'Sprinkler Systems',         // Fire sprinklers, hose reels
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALTY MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Damp Proofing',             // DPC, DPM, tanking slurry
  'Expansion Joints',          // Joint fillers, movement joints
  'Reinforcement Accessories', // Spacers, chairs, tie wire
  'Curing Compounds',          // Concrete curing, membrane curing
  'Admixtures',                // Plasticizers, accelerators, retarders
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MISCELLANEOUS
  // ─────────────────────────────────────────────────────────────────────────────
  'Geotextiles',               // Woven, non-woven geotextiles
  'Polythene',                 // DPM sheets, packaging, covers
  'Tarpaulins',                // Waterproof covers, shade nets
  'Signage',                   // Safety signs, construction signs
  'Other'                      // Other construction materials
];

// No demo materials - only show real data from database

export const MaterialsGrid = () => {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMaterials, setHasMoreMaterials] = useState(false);
  const [totalMaterialsCount, setTotalMaterialsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMultiQuoteOpen, setIsMultiQuoteOpen] = useState(false);
  const [builderId, setBuilderId] = useState<string>('');
  const [preselectedSupplierUserIds, setPreselectedSupplierUserIds] = useState<string[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; user_id?: string; company_name: string; location?: string; rating?: number }[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // materialId -> variantId
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [compareItems, setCompareItems] = useState<Set<string>>(new Set());
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [quoteCartItems, setQuoteCartItems] = useState<QuoteCartItem[]>([]);
  const [isQuoteCartOpen, setIsQuoteCartOpen] = useState(false);
  
  // Multi-angle image gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMaterial, setGalleryMaterial] = useState<Material | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  
  // Mobile book view state
  const [showBookView, setShowBookView] = useState(false);
  const [bookViewStartIndex, setBookViewStartIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { toast } = useToast();
  const { addToCart, isInCart, getItemQuantity, setIsCartOpen, items: cartItems, getTotalItems } = useCart();

  // Quote Cart functions for Professional Builders
  const addToQuoteCart = (material: Material) => {
    const qty = getQuantity(material.id) || 1;
    const imageUrl = material.image_url || getDefaultCategoryImage(material.category);
    
    // Get variant info if applicable
    let itemName = material.name;
    let unitPrice = material.unit_price;
    
    if (material.pricing_type === 'variants' && material.variants && material.variants.length > 0) {
      const selectedVariantId = selectedVariants[material.id] || material.variants[0]?.id;
      const selectedVariant = material.variants.find(v => v.id === selectedVariantId) || material.variants[0];
      if (selectedVariant) {
        itemName = `${material.name} (${selectedVariant.sizeLabel})`;
        unitPrice = selectedVariant.price;
      }
    }
    
    setQuoteCartItems(prev => {
      const existing = prev.find(item => item.id === material.id);
      if (existing) {
        return prev.map(item => 
          item.id === material.id 
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, {
        id: material.id,
        name: itemName,
        category: material.category,
        unit: material.unit,
        unit_price: unitPrice,
        quantity: qty,
        image_url: imageUrl,
        supplier_id: material.supplier_id,
        supplier_name: material.supplier?.company_name
      }];
    });
    
    toast({
      title: '📋 Added to Quote Cart!',
      description: `${qty}x ${itemName} added. Click the Quote Cart to review and submit.`,
    });
  };

  const updateQuoteCartQuantity = (id: string, quantity: number) => {
    setQuoteCartItems(prev => 
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    );
  };

  const removeFromQuoteCart = (id: string) => {
    setQuoteCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearQuoteCart = () => {
    setQuoteCartItems([]);
  };

  const isInQuoteCart = (id: string) => quoteCartItems.some(item => item.id === id);
  
  // Get all images for a material (main + additional angles)
  const getAllMaterialImages = (material: Material) => {
    const images: { url: string; label: string }[] = [];
    
    // Main image first
    if (material.image_url) {
      images.push({ url: material.image_url, label: 'Main View' });
    }
    
    // Additional angle images
    if (material.additional_images && Array.isArray(material.additional_images)) {
      material.additional_images.forEach((img: any, index: number) => {
        if (typeof img === 'string') {
          images.push({ url: img, label: `View ${index + 2}` });
        } else if (img && img.url) {
          images.push({ url: img.url, label: img.angle || img.label || `View ${index + 2}` });
        }
      });
    }
    
    return images;
  };
  
  // Check if material has multiple images
  const hasMultipleImages = (material: Material) => {
    return getAllMaterialImages(material).length > 1;
  };
  
  // Open image gallery for a material - fetches additional images on-demand
  const openGallery = async (material: Material, startIndex: number = 0) => {
    setGalleryMaterial(material);
    setGalleryIndex(startIndex);
    setGalleryOpen(true);
    
    // Fetch additional images on-demand if not already loaded
    if (!material.additional_images || material.additional_images.length === 0) {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/admin_material_images?select=additional_images&id=eq.${material.id}`,
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
          if (data && data[0]?.additional_images) {
            // Update the material with additional images
            const updatedMaterial = { ...material, additional_images: data[0].additional_images };
            setGalleryMaterial(updatedMaterial);
            // Also update in the materials array for future access
            setMaterials(prev => prev.map(m => 
              m.id === material.id ? updatedMaterial : m
            ));
          }
        }
      } catch (err) {
        console.log('Could not fetch additional images:', err);
      }
    }
  };
  
  // Navigate gallery
  const nextGalleryImage = () => {
    if (!galleryMaterial) return;
    const images = getAllMaterialImages(galleryMaterial);
    setGalleryIndex((prev) => (prev + 1) % images.length);
  };
  
  const prevGalleryImage = () => {
    if (!galleryMaterial) return;
    const images = getAllMaterialImages(galleryMaterial);
    setGalleryIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  // Toggle item for comparison
  const toggleCompare = (materialId: string) => {
    setCompareItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        if (newSet.size >= 10) {
          toast({
            title: 'Maximum items reached',
            description: 'You can compare up to 10 items at a time.',
            variant: 'destructive'
          });
          return prev;
        }
        newSet.add(materialId);
      }
      return newSet;
    });
  };
  
  // Get materials selected for comparison
  const getComparisonMaterials = () => {
    return filteredMaterials.filter(m => compareItems.has(m.id));
  };
  
  // Get quantity for a material (default to 1)
  const getQuantity = (materialId: string) => quantities[materialId] || 1;
  
  // Update quantity for a material (minimum 1)
  const updateQuantity = (materialId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [materialId]: Math.max(1, qty) }));
  };
  
  // Toggle item selection
  const toggleItemSelection = (materialId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };
  
  // Get selected materials with quantities
  const getSelectedMaterialsWithQuantities = () => {
    return filteredMaterials
      .filter(m => selectedItems.has(m.id))
      .map(m => ({ ...m, quantity: getQuantity(m.id) }));
  };
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(24);
  const CARD_HEIGHT = 520; // Increased to accommodate buttons
  const BUFFER_ROWS = 2;
  
  // Check for welcome message from registration
  useEffect(() => {
    const welcomeParam = searchParams.get('welcome');
    if (welcomeParam) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 10000); // Hide after 10 seconds
    }
  }, [searchParams]);

  useEffect(() => {
    // Check user role for purchase flow
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          setBuilderId(user.id); // Set builderId when user is logged in
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (roleError) {
            console.error('Error fetching user role:', roleError);
          }
          
          const role = roleData?.role || null;
          setUserRole(role);
          console.log('MaterialsGrid - User authenticated:', user.email, 'Role:', role, 'BuilderId:', user.id);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
          console.log('MaterialsGrid - No user authenticated');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    
    checkUserRole();
    
    // Load materials data
    try {
      loadMaterials();
    } catch (error) {
      console.error('Error in loadMaterials effect:', error);
      setMaterials([]);
      setFilteredMaterials([]);
      setLoading(false);
    }
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setBuilderId(session.user.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setUserRole(roleData?.role || null);
        console.log('MaterialsGrid - Auth state changed:', event, 'Role:', roleData?.role);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, user_id, company_name, rating');
        
        if (!error && data) {
          // Filter active suppliers and sort by rating
          const activeSuppliers = data
            .filter((s: any) => s.status !== 'inactive')
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 50);
          setAllSuppliers(activeSuppliers);
        }
      } catch (e) {
        setAllSuppliers([]);
      }
    };
    fetchSuppliers();
  }, []);

  // Debounced filter for better performance on mobile
  useEffect(() => {
    // Use requestAnimationFrame for smoother filtering
    const rafId = requestAnimationFrame(() => {
      try {
        filterMaterials();
      } catch (error) {
        console.error('Error in filterMaterials effect:', error);
        setFilteredMaterials(materials);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [materials, searchQuery, selectedCategory, priceRange, stockFilter]);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w < 768) setColumns(1);
      else if (w < 1024) setColumns(2);
      else if (w < 1280) setColumns(3);
      else setColumns(4);
    };
    const updateVisible = () => {
      const rectTop = gridRef.current ? gridRef.current.getBoundingClientRect().top : 0;
      const containerTop = window.scrollY + rectTop;
      const startRow = Math.max(0, Math.floor((window.scrollY - containerTop) / CARD_HEIGHT) - BUFFER_ROWS);
      const rowsInView = Math.ceil(window.innerHeight / CARD_HEIGHT) + BUFFER_ROWS * 2;
      const startIndex = startRow * columns;
      const endIndex = Math.min(filteredMaterials.length, startIndex + rowsInView * columns);
      setVisibleStart(startIndex);
      setVisibleEnd(endIndex);
    };
    updateColumns();
    updateVisible();
    const onResize = () => { updateColumns(); updateVisible(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateVisible, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateVisible);
    };
  }, [filteredMaterials, columns]);

  // ✅ OPTIMIZED LAZY LOAD: Load images for visible items + large buffer ahead
  useEffect(() => {
    // Load visible items PLUS 50 items ahead for smoother scrolling
    const bufferSize = 50;
    const extendedEnd = Math.min(visibleEnd + bufferSize, filteredMaterials.length);
    const visibleItems = filteredMaterials.slice(visibleStart, extendedEnd);
    const itemsWithoutImages = visibleItems.filter(m => !m.image_url && m.supplier_id === 'admin-catalog');
    
    if (itemsWithoutImages.length > 0) {
      const idsToLoad = itemsWithoutImages.map(m => m.id);
      // Immediate load - no debounce for faster response
      loadMaterialImages(idsToLoad);
    }
  }, [visibleStart, visibleEnd, filteredMaterials]);

  // Track which images are being loaded to prevent duplicate requests
  const loadingImagesRef = useRef<Set<string>>(new Set());

  // ✅ ULTRA-OPTIMIZED: Fetch image URLs for specific material IDs with aggressive caching
  const loadMaterialImages = async (ids: string[]) => {
    // Filter out already loading images
    const newIds = ids.filter(id => !loadingImagesRef.current.has(id));
    if (newIds.length === 0) return;
    
    // Mark as loading
    newIds.forEach(id => loadingImagesRef.current.add(id));
    
    try {
      // Load ALL at once for speed (up to 100 items)
      const BATCH_SIZE = 100;
      const idsToFetch = newIds.slice(0, BATCH_SIZE);
      const idsParam = idsToFetch.map(id => `"${id}"`).join(',');
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,image_url&id=in.(${idsParam})`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const imageData = await response.json();
        
        if (imageData.length > 0) {
          // Create a map for O(1) lookup
          const imageMap = new Map<string, string>(imageData.map((d: any) => [d.id, d.image_url as string]));
          
          // Preload images in browser cache
          imageData.forEach((d: any) => {
            if (d.image_url) {
              const img = new Image();
              img.src = d.image_url;
            }
          });
          
          // Update materials with their image URLs
          setMaterials(prev => prev.map(mat => {
            const imageUrl = imageMap.get(mat.id);
            return imageUrl ? { ...mat, image_url: imageUrl } as Material : mat;
          }));
          
          // Also update filtered materials
          setFilteredMaterials(prev => prev.map(mat => {
            const imageUrl = imageMap.get(mat.id);
            return imageUrl ? { ...mat, image_url: imageUrl } as Material : mat;
          }));
          
          console.log(`🖼️ Loaded ${imageData.length} images`);
        }
      }
      
      // Process remaining if any
      if (newIds.length > BATCH_SIZE) {
        const remainingIds = newIds.slice(BATCH_SIZE);
        if (remainingIds.length > 0) {
          // Small delay to not overwhelm
          setTimeout(() => loadMaterialImages(remainingIds), 50);
        }
      }
    } catch (err) {
      console.error('Error loading material images:', err);
    } finally {
      // Clear loading state
      newIds.forEach(id => loadingImagesRef.current.delete(id));
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      // iOS/Safari specific: Add delay to prevent race conditions
      if (isIOSSafari()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // STEP 1: Fetch supplier prices from supplier_product_prices table
      // This is where suppliers set their actual selling prices, variant prices, and optional descriptions
      let supplierPrices: Record<string, { price: number; in_stock: boolean; supplier_id: string; description?: string; variant_prices?: any[] }> = {};
      
      try {
        const pricesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/supplier_product_prices?select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json();
          console.log(`💰 Supplier prices loaded: ${pricesData?.length || 0} entries`);
          if (pricesData && pricesData.length > 0) {
            // Create a map of product_id -> price info
            // If multiple suppliers have prices, use the lowest price
            pricesData.forEach((item: any) => {
              const existingPrice = supplierPrices[item.product_id];
              if (!existingPrice || item.price < existingPrice.price) {
                supplierPrices[item.product_id] = {
                  price: item.price,
                  in_stock: item.in_stock,
                  supplier_id: item.supplier_id,
                  description: item.description || '',
                  variant_prices: item.variant_prices || [] // Include supplier variant prices
                };
              }
            });
            console.log(`💰 Supplier prices mapped: ${Object.keys(supplierPrices).length} products with prices`);
          }
        } else {
          console.log(`❌ Failed to load supplier prices: ${pricesResponse.status}`);
        }
      } catch (pricesErr: any) {
        console.log('Supplier prices table not available');
      }
      
      // STEP 2: Fetch admin-uploaded materials - ULTRA OPTIMIZED for performance
      // ✅ PERFORMANCE: Fetch first batch WITH images, rest with metadata only
      let adminMaterials: Material[] = [];
      
      try {
        // Detect mobile devices for optimized loading
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
          || window.innerWidth < 768;
        
        console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`);
        
        // ✅ MOBILE OPTIMIZED: Smaller first batch, fewer total items
        const FIRST_BATCH = isMobile ? 12 : 40; // Mobile: 12 (fits 2 rows), Desktop: 40
        const TOTAL_LIMIT = isMobile ? 50 : 500; // Mobile: 50 total, Desktop: 500
        
        // For mobile: fetch first batch only initially, rest on scroll
        if (isMobile) {
          // MOBILE: Single fast fetch with images for immediate display
          const mobileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants,image_url&is_approved=eq.true&order=created_at.desc&limit=${FIRST_BATCH}`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'count=exact'
              }
            }
          );
          
          if (mobileResponse.ok) {
            const mobileData = await mobileResponse.json();
            const countHeader = mobileResponse.headers.get('content-range');
            if (countHeader) {
              const total = parseInt(countHeader.split('/')[1] || '0');
              setTotalMaterialsCount(total);
              setHasMoreMaterials(total > mobileData.length);
            }
            console.log(`📱 Mobile fast load: ${mobileData.length} materials with images`);
            
            // Process mobile data
            const mobileMaterials = mobileData.map((item: any) => {
              const supplierPrice = supplierPrices[item.id];
              let variants: PriceVariant[] = [];
              try {
                if (item.variants && Array.isArray(item.variants)) variants = item.variants;
                else if (item.variants && typeof item.variants === 'string') variants = JSON.parse(item.variants);
              } catch (e) { variants = []; }
              
              return {
                id: item.id,
                supplier_id: 'admin-catalog',
                name: item.name || 'Unnamed Material',
                category: item.category || 'Uncategorized',
                description: supplierPrice?.description || item.description || '',
                unit: item.unit || 'unit',
                unit_price: supplierPrice?.price || item.suggested_price || 0,
                image_url: item.image_url || '',
                additional_images: [],
                in_stock: supplierPrice?.in_stock ?? true,
                supplier: { company_name: supplierPrice ? 'Supplier' : 'Admin Catalog', location: 'Kenya', rating: supplierPrice ? 4.5 : 5.0 },
                pricing_type: item.pricing_type || 'single',
                variants: variants
              } as Material;
            });
            
            adminMaterials = mobileMaterials;
            
            // Load more in background after initial render
            setTimeout(async () => {
              try {
                const moreResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants&is_approved=eq.true&order=created_at.desc&offset=${FIRST_BATCH}&limit=${TOTAL_LIMIT - FIRST_BATCH}`,
                  { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' } }
                );
                if (moreResponse.ok) {
                  const moreData = await moreResponse.json();
                  const moreMaterials = moreData.map((item: any) => ({
                    id: item.id, supplier_id: 'admin-catalog', name: item.name || 'Unnamed Material',
                    category: item.category || 'Uncategorized', description: item.description || '',
                    unit: item.unit || 'unit', unit_price: supplierPrices[item.id]?.price || item.suggested_price || 0,
                    image_url: '', additional_images: [], in_stock: true,
                    supplier: { company_name: 'Admin Catalog', location: 'Kenya', rating: 5.0 },
                    pricing_type: item.pricing_type || 'single', variants: []
                  } as Material));
                  setMaterials(prev => [...prev, ...moreMaterials]);
                  setFilteredMaterials(prev => [...prev, ...moreMaterials]);
                  console.log(`📱 Mobile background load: +${moreData.length} materials`);
                }
              } catch (e) { /* silent fail */ }
            }, 1000); // Load more after 1 second
            
            // Skip the desktop parallel fetch
            setMaterials(mobileMaterials);
            setFilteredMaterials(mobileMaterials);
            setLoading(false);
            return;
          }
        }
        
        // DESKTOP: Parallel fetch for speed
        const [firstBatchResponse, restResponse] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants,image_url&is_approved=eq.true&order=created_at.desc&limit=${FIRST_BATCH}`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants&is_approved=eq.true&order=created_at.desc&offset=${FIRST_BATCH}&limit=${TOTAL_LIMIT - FIRST_BATCH}`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'count=exact'
              }
            }
          )
        ]);
        
        if (firstBatchResponse.ok && restResponse.ok) {
          const firstBatchData = await firstBatchResponse.json();
          const restData = await restResponse.json();
          const allAdminData = [...firstBatchData, ...restData];
          
          const countHeader = restResponse.headers.get('content-range');
          if (countHeader) {
            const total = parseInt(countHeader.split('/')[1] || '0') + FIRST_BATCH;
            setTotalMaterialsCount(total);
            setHasMoreMaterials(total > allAdminData.length);
            console.log(`📊 Loaded ${allAdminData.length} materials (total: ${total})`);
          }
          
          console.log(`⚡ Fast load: ${firstBatchData.length} with images + ${restData.length} metadata only`);
          
          // Map materials - first batch already has images, rest will be loaded lazily
          const materialsWithImages = allAdminData.map((item: any, index: number) => {
            const supplierPrice = supplierPrices[item.id];
            
            let variants: PriceVariant[] = [];
            try {
              if (item.variants && Array.isArray(item.variants) && item.variants.length > 0) {
                variants = item.variants;
              } else if (item.variants && typeof item.variants === 'string') {
                variants = JSON.parse(item.variants);
              }
            } catch (e) {
              variants = [];
            }
            
            // Apply supplier variant prices if available
            if (supplierPrice?.variant_prices && supplierPrice.variant_prices.length > 0 && variants.length > 0) {
              variants = variants.map((variant: PriceVariant) => {
                const supplierVariantPrice = supplierPrice.variant_prices?.find(
                  (svp: any) => svp.variant_id === variant.id || svp.sizeLabel === variant.sizeLabel
                );
                if (supplierVariantPrice) {
                  return {
                    ...variant,
                    price: supplierVariantPrice.price // Override with supplier price
                  };
                }
                return variant;
              });
            }
            
            // Use supplier description if available, otherwise use admin description
            const description = supplierPrice?.description || item.description || '';
            
            return {
              id: item.id,
              supplier_id: 'admin-catalog',
              name: item.name || 'Unnamed Material',
              category: item.category || 'Uncategorized',
              description: description,
              unit: item.unit || 'unit',
              unit_price: supplierPrice?.price || item.suggested_price || 0,
              // First batch has images, rest will be loaded lazily
              image_url: index < FIRST_BATCH ? (item.image_url || '') : '',
              additional_images: [],
              in_stock: supplierPrice?.in_stock ?? true,
              supplier: {
                company_name: supplierPrice ? 'Supplier' : 'Admin Catalog',
                location: 'Kenya',
                rating: supplierPrice ? 4.5 : 5.0
              },
              pricing_type: item.pricing_type || 'single',
              variants: variants
            } as Material;
          });
          
          adminMaterials = materialsWithImages;
          
          // Preload first batch images in browser cache for instant display
          firstBatchData.forEach((item: any) => {
            if (item.image_url && !item.image_url.startsWith('data:')) {
              const img = new Image();
              img.src = item.image_url;
            }
          });
        } else {
          console.warn('Failed to fetch admin materials');
        }
      } catch (adminErr: any) {
        console.error('❌ Error fetching admin materials:', adminErr);
      }
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // SHOW ADMIN + SUPPLIER UPLOADED IMAGES (NO URL-BASED IMAGES)
      // - Admin images from admin_material_images table
      // - Supplier images from materials table (ONLY base64/uploaded images, NO URLs)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      // STEP 3: Fetch supplier materials from materials table  
      let data: any[] | null = null;
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/materials?select=*&order=created_at.desc&limit=100`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          data = await response.json();
        }
      } catch (fetchError: any) {
        // Silent fail - continue with admin materials
      }

      // Filter supplier materials:
      // - Only approved products
      // - Accept base64 data URLs OR Supabase storage URLs (reject external URLs like Unsplash)
      const supplierMaterials = data ? data
        .filter(item => {
          // Must be approved (or no approval status for backward compatibility)
          const isApproved = !item.approval_status || item.approval_status === 'approved';
          
          // Accept images that are:
          // 1. Base64 data URLs (starts with 'data:image/')
          // 2. Supabase storage URLs (contains 'supabase.co/storage')
          // REJECT external URLs like Unsplash, Unsplash, etc.
          const imageUrl = item.image_url || '';
          const isBase64 = imageUrl.startsWith('data:image/');
          const isSupabaseStorage = imageUrl.includes('supabase.co/storage');
          const hasValidImage = imageUrl && (isBase64 || isSupabaseStorage);
          
          return isApproved && hasValidImage;
        })
        .map(item => ({
          ...item,
          supplier: {
            company_name: 'Supplier',
            location: 'Kenya',
            rating: 4.5
          }
        })) : [];

      // Combine: Admin materials FIRST, then supplier-uploaded materials
      const combinedMaterials = [...adminMaterials, ...supplierMaterials];
      
      console.log(`🔗 Combined materials: ${adminMaterials.length} admin + ${supplierMaterials.length} supplier = ${combinedMaterials.length} total`);
      
      // Remove duplicates by name (keep first occurrence - admin images take priority)
      const seenNames = new Set<string>();
      const duplicates: string[] = [];
      const allMaterials = combinedMaterials.filter(m => {
        const normalizedName = m.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          duplicates.push(m.name);
          return false;
        }
        seenNames.add(normalizedName);
        return true;
      });
      
      console.log(`✅ Final materials after deduplication: ${allMaterials.length}`);
      if (duplicates.length > 0) {
        console.log(`🔄 Removed ${duplicates.length} duplicate(s):`, duplicates);
      }

      // Show empty state if no materials
      if (allMaterials.length === 0) {
        console.warn('⚠️ No materials to display!');
        setMaterials([]);
        setFilteredMaterials([]);
        setLoading(false);
        return;
      }

      setMaterials(allMaterials);
      setFilteredMaterials(allMaterials);
      console.log(`🎉 Successfully loaded ${allMaterials.length} materials to display`);
    } catch (error) {
      console.error('Error loading materials:', error);
      // Show empty state on error
      console.log('Error loading materials');
      setMaterials([]);
      setFilteredMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    // Fast path: no filters applied
    const noFilters = !searchQuery && 
                      selectedCategory === 'All Categories' && 
                      priceRange === 'all' && 
                      stockFilter === 'all';
    
    if (noFilters) {
      setFilteredMaterials(materials);
      return;
    }

    // Pre-compute lowercase search query once
    const searchLower = searchQuery?.toLowerCase() || '';
    
    // Single pass filter for better performance
    const filtered = materials.filter(m => {
      // Search filter (most selective, check first)
      if (searchLower) {
        const matchesSearch = m.name.toLowerCase().includes(searchLower) ||
          m.category.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower) ||
          m.supplier?.company_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'All Categories' && m.category !== selectedCategory) {
        return false;
      }

      // Price filter
      if (priceRange !== 'all') {
        const price = m.unit_price;
        if (priceRange === 'under-1000' && price >= 1000) return false;
        if (priceRange === '1000-5000' && (price < 1000 || price > 5000)) return false;
        if (priceRange === '5000-10000' && (price < 5000 || price > 10000)) return false;
        if (priceRange === 'over-10000' && price <= 10000) return false;
      }

      // Stock filter
      if (stockFilter === 'in-stock' && !m.in_stock) return false;
      if (stockFilter === 'out-of-stock' && m.in_stock) return false;

      return true;
    });

    setFilteredMaterials(filtered);
  };

  const handleRequestQuote = async (material: Material) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/home';
        return;
      }
      // Only Professional Builders can request quotes
      if (userRole !== 'professional_builder' && userRole !== 'admin') {
        toast({
          title: '📋 Professional Builder Required',
          description: 'Only Professional Builders can request quotes. Private Builders can buy directly.',
          variant: 'destructive',
        });
        return;
      }
      
      // Get supplier ID - from material, selected map, or first available supplier
      let supplierId = material.supplier_id || (selectedSuppliersMap[material.id]?.[0]);
      
      // If no supplier on material, try to get first available supplier
      if (!supplierId && allSuppliers.length > 0) {
        supplierId = allSuppliers[0].id;
      }
      
      if (!supplierId) {
        toast({
          title: '⚠️ No Suppliers Available',
          description: 'No suppliers are currently available. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      const qty = getQuantity(material.id) || 1;
      const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      console.log('Creating quote request:', { poNumber, buyerId: user.id, supplierId, material: material.name, qty });
      
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: supplierId,
          total_amount: material.unit_price * qty,
          delivery_address: 'To be confirmed',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending', // Quote requests start as pending
          project_name: `Quote Request - ${material.category || 'Materials'}`,
          items: [{
            material_id: material.id,
            material_name: material.name,
            category: material.category,
            quantity: qty,
            unit: material.unit,
            unit_price: material.unit_price
          }]
        })
        .select()
        .single();
        
      if (orderError) {
        console.error('Quote request error:', orderError);
        throw orderError;
      }
      
      console.log('Quote request created:', orderData);
      
      toast({
        title: '📋 Quote Requested!',
        description: `Quote request for ${qty}x ${material.name} sent to supplier. PO#: ${poNumber}`,
      });
    } catch (e) {
      console.error('Failed to request quote:', e);
      toast({
        title: 'Failed to request quote',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    }
  };

  const handleBuyNow = async (material: Material) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/home';
        return;
      }
      
      // Only Private Builders can buy directly
      if (userRole !== 'private_client' && userRole !== 'admin') {
        toast({
          title: '🛒 Private Builder Required',
          description: 'Only Private Builders can purchase directly. Professional Builders should request quotes.',
          variant: 'destructive',
        });
        return;
      }

      const supplierId = material.supplier_id || (selectedSuppliersMap[material.id]?.[0]);
      if (!supplierId) {
        toast({
          title: '⚠️ No Supplier Available',
          description: 'This product does not have a supplier assigned.',
          variant: 'destructive',
        });
        return;
      }

      const qty = getQuantity(material.id) || 1;
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: supplierId,
          total_amount: material.unit_price * qty,
          delivery_address: 'To be confirmed',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'confirmed',
          project_name: 'Direct Purchase',
          items: [{
            material_id: material.id,
            material_name: material.name,
            category: material.category,
            quantity: qty,
            unit: material.unit,
            unit_price: material.unit_price
          }]
        })
        .select()
        .single();
        
      if (orderError) {
        console.error('Purchase order error:', orderError);
        throw orderError;
      }
      
      toast({
        title: '🛒 Order Placed!',
        description: `Order for ${qty}x ${material.name} has been placed. PO#: ${poNumber}`,
      });
    } catch (e) {
      console.error('Failed to create order:', e);
      toast({
        title: 'Failed to place order',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    }
  };

  const openMultiQuote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth?lite=1&redirect=' + encodeURIComponent('/suppliers?tab=purchase');
        return;
      }
      const visibleItems = filteredMaterials.slice(visibleStart, visibleEnd);
      const supplierIds = Array.from(new Set(visibleItems.map(m => m.supplier_id).filter(Boolean)));
      setPreselectedSupplierUserIds(supplierIds as string[]);
      setBuilderId(user.id);
      setIsMultiQuoteOpen(true);
    } catch (e) {
      toast({
        title: 'Failed to open',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="h-8 w-72 bg-muted rounded-md animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-muted rounded-md animate-pulse"></div>
            <div className="h-10 w-24 bg-muted rounded-md animate-pulse"></div>
          </div>
        </div>
        
        {/* Skeleton Filters */}
        <div className="bg-card border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 h-10 bg-muted rounded-md animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>
        </div>
        
        {/* Skeleton Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg overflow-hidden">
              {/* Image skeleton */}
              <div className="h-48 bg-muted animate-pulse"></div>
              {/* Content skeleton */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
                  <div className="h-5 w-16 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                  <div className="h-8 flex-1 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground text-sm">Loading materials from suppliers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner for Non-Registered Users */}
      {!isAuthenticated && (
        <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 border-2">
          <AlertDescription className="w-full">
            <div className="flex flex-col items-center justify-center text-center gap-4 py-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                <strong className="text-orange-800 text-lg">🏗️ Want to Buy or Request Quotes?</strong>
              </div>
              <p className="text-sm text-orange-700">
                <strong>Private Builders</strong> can buy directly | <strong>Professional Builders</strong> can request quotes
              </p>
              <div className="flex gap-3">
                <a href="/home">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    Register Now
                  </Button>
                </a>
                <a href="/home">
                  <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-100">
                    Sign In
                  </Button>
                </a>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Role-specific guidance banner */}
      {isAuthenticated && (userRole === 'professional_builder' || userRole === 'private_client') && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 border-2">
          <ShoppingCart className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🛒 {userRole === 'professional_builder' ? 'Professional Builder' : 'Private Client'} Mode</strong>
            <p className="text-sm text-green-700 mt-1">
              Add items to your cart, then choose to <strong className="text-blue-600">Request Quote</strong> for competitive pricing or <strong className="text-green-600">Buy Now</strong> for immediate purchase!
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && userRole && !['professional_builder', 'private_client', 'admin'].includes(userRole) && (
        <Alert className="bg-gradient-to-r from-red-50 to-orange-50 border-red-300 border-2">
          <AlertDescription className="ml-2">
            <strong className="text-red-800">⚠️ Purchasing Not Available</strong>
            <p className="text-sm text-red-700 mt-1">
              Your account type ({userRole}) cannot purchase materials. Please register as a <strong>Private Builder</strong> or <strong>Professional Builder</strong>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Message for New Registrations */}
      {showWelcome && (
        <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-300">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🎉 Welcome to UjenziXform!</strong>
            <p className="mt-1">
              <>Add items to your cart, then choose <span className="text-blue-600 font-bold">"Request Quote"</span> for competitive pricing or <span className="text-green-600 font-bold">"Buy Now"</span> for immediate purchase!</>
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Construction Materials Marketplace</h2>
          <p className="text-muted-foreground">
            Browse {filteredMaterials.length} materials from {new Set(materials.map(m => m.supplier_id)).size} suppliers
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Shopping Cart Button - For all builders */}
          {(userRole === 'professional_builder' || userRole === 'private_client' || userRole === 'admin') && (
            <Button 
              onClick={() => setIsCartOpen(true)} 
              className={`${cartItems.length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              <Badge className="ml-2 bg-white text-green-600">{getTotalItems()}</Badge>
            </Button>
          )}
          <Button 
            onClick={openMultiQuote} 
            className="bg-orange-600 hover:bg-orange-700"
          >
            <PartyPopper className="h-4 w-4 mr-2" />
            Multi-quote
          </Button>
          <Button onClick={loadMaterials} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {compareItems.size > 0 && (
            <Button 
              onClick={() => setIsCompareModalOpen(true)} 
              className="bg-purple-600 hover:bg-purple-700 animate-pulse shadow-lg shadow-purple-300"
            >
              <Scale className="h-4 w-4 mr-2" />
              🔥 Compare Prices ({compareItems.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card className="overflow-visible">
        <CardContent className="p-4 md:p-6">
          {/* Search Bar - Full Width on Mobile */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              inputMode="search"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 text-base md:text-sm rounded-xl border-2 focus:border-emerald-500 focus:ring-emerald-500"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filter Chips - Horizontal Scroll on Mobile */}
          <div className="flex flex-wrap md:grid md:grid-cols-4 gap-2 md:gap-4">
            {/* Category Filter */}
            <div className="flex-1 min-w-[140px] md:min-w-0">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 md:h-10 text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[50vh] z-[100]"
                  position="popper"
                  sideOffset={5}
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <SelectItem 
                      key={cat} 
                      value={cat}
                      className="py-3 md:py-2 text-base md:text-sm cursor-pointer"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Filter */}
            <div className="flex-1 min-w-[130px] md:min-w-0">
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="h-11 md:h-10 text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectItem value="all" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">All Prices</SelectItem>
                  <SelectItem value="under-1000" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">Under KES 1,000</SelectItem>
                  <SelectItem value="1000-5000" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">KES 1,000 - 5,000</SelectItem>
                  <SelectItem value="5000-10000" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">KES 5,000 - 10,000</SelectItem>
                  <SelectItem value="over-10000" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">Over KES 10,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stock Filter */}
            <div className="flex-1 min-w-[120px] md:min-w-0">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-11 md:h-10 text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectItem value="all" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">All Items</SelectItem>
                  <SelectItem value="in-stock" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">In Stock Only</SelectItem>
                  <SelectItem value="out-of-stock" className="py-3 md:py-2 text-base md:text-sm cursor-pointer">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Book View Button - Mobile Only */}
            {isMobile && filteredMaterials.length > 0 && (
              <Button
                variant="outline"
                className="h-11 flex-1 min-w-[100px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 hover:from-emerald-700 hover:to-teal-700 rounded-lg"
                onClick={() => {
                  setBookViewStartIndex(0);
                  setShowBookView(true);
                }}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Browse
              </Button>
            )}
          </div>

          {/* Active Filters & Results Count */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Results Count */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">{filteredMaterials.length}</span>
              <span>of {materials.length}</span>
            </div>
            
            {/* Active Filter Chips - Show what's currently filtered */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-2.5 py-1.5 rounded-full hover:bg-emerald-200 transition-colors"
              >
                <span>"{searchQuery.slice(0, 15)}{searchQuery.length > 15 ? '...' : ''}"</span>
                <X className="h-3 w-3" />
              </button>
            )}
            {selectedCategory !== 'All Categories' && (
              <button
                onClick={() => setSelectedCategory('All Categories')}
                className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2.5 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
              >
                <span>{selectedCategory}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            {priceRange !== 'all' && (
              <button
                onClick={() => setPriceRange('all')}
                className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2.5 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
              >
                <span>{priceRange === 'under-1000' ? '<1K' : priceRange === '1000-5000' ? '1K-5K' : priceRange === '5000-10000' ? '5K-10K' : '>10K'}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            {stockFilter !== 'all' && (
              <button
                onClick={() => setStockFilter('all')}
                className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-2.5 py-1.5 rounded-full hover:bg-orange-200 transition-colors"
              >
                <span>{stockFilter === 'in-stock' ? 'In Stock' : 'Out of Stock'}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            
            {/* Clear All Filters - Only show if filters are active */}
            {(searchQuery || selectedCategory !== 'All Categories' || priceRange !== 'all' || stockFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All Categories');
                  setPriceRange('all');
                  setStockFilter('all');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium underline ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Materials Found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || selectedCategory !== 'All Categories' 
                ? 'Try adjusting your filters or search query'
                : 'No materials available yet. Suppliers can add products from their dashboard.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMaterials.map((material) => {
                // Get image URL - ONLY use actual image, don't fallback to category images during loading
                // Category default images will only be used in onError handler when actual image fails
                const imageUrl = material.image_url || '';
                const currentQty = getQuantity(material.id);
                const itemInCart = isInCart(material.id);
                const cartQty = getItemQuantity(material.id);

                const handleAddToCart = () => {
                  // Only authenticated users can add to cart
                  if (!isAuthenticated) {
                    toast({
                      title: '🔐 Sign In Required',
                      description: 'Please sign in to purchase materials.',
                    });
                    setTimeout(() => {
                      window.location.href = '/home';
                    }, 1500);
                    return;
                  }
                  
                  // Both Professional Builders and Private Clients can add to cart
                  if (userRole !== 'private_client' && userRole !== 'professional_builder' && userRole !== 'admin') {
                    toast({
                      title: '⚠️ Builder Account Required',
                      description: 'Please register as a Private Client or Professional Builder to purchase materials.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  // Ensure quantity is at least 1
                  const qtyToAdd = currentQty > 0 ? currentQty : 1;
                  
                  // Get the correct price based on variant selection
                  let unitPrice = material.unit_price;
                  let itemName = material.name;
                  
                  if (material.pricing_type === 'variants' && material.variants && material.variants.length > 0) {
                    const selectedVariantId = selectedVariants[material.id] || material.variants[0]?.id;
                    const selectedVariant = material.variants.find(v => v.id === selectedVariantId) || material.variants[0];
                    if (selectedVariant) {
                      unitPrice = selectedVariant.price;
                      itemName = `${material.name} (${selectedVariant.sizeLabel})`;
                    }
                  }
                  
                  addToCart({
                    id: material.id,
                    name: itemName,
                    category: material.category,
                    unit: material.unit,
                    unit_price: unitPrice,
                    image_url: imageUrl,
                    supplier_name: material.supplier?.company_name || 'UjenziXform Catalog',
                    supplier_id: material.supplier_id
                  }, qtyToAdd);
                  
                  // Reset quantity counter after adding to cart (back to default of 1)
                  setQuantities(prev => ({ ...prev, [material.id]: 1 }));
                };

                const isSelectedForCompare = compareItems.has(material.id);
                
                return (
                  <Card key={material.id} className={`overflow-hidden hover:shadow-xl transition-shadow duration-300 group flex flex-col ${itemInCart ? 'ring-2 ring-green-500' : ''} ${isSelectedForCompare ? 'ring-2 ring-purple-500' : ''}`}>
                    {/* Image Section - Fixed height */}
                    <div className="relative bg-gray-100 overflow-hidden h-44 flex-shrink-0 group/image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={material.name}
                          className="w-full h-full object-contain p-2 bg-white cursor-pointer"
                          loading="lazy"
                          decoding="async"
                          onClick={() => openGallery(material)}
                          onError={(e) => {
                            // Fallback to category default image
                            const fallback = getDefaultCategoryImage(material.category);
                            if (fallback && e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer animate-pulse"
                          onClick={() => {
                            // ✅ LAZY LOAD: Load this material's image when clicked
                            loadMaterialImages([material.id]);
                          }}
                        >
                          <div className="text-center text-gray-400">
                            <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-gray-300 animate-pulse" />
                            <span className="text-xs text-gray-400">Loading...</span>
                          </div>
                        </div>
                      )}
                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-black/60 text-white border-none" style={{ fontSize: '10px' }}>
                          {material.category}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge className={material.in_stock ? 'bg-green-600' : 'bg-red-600'} style={{ fontSize: '10px' }}>
                          {material.in_stock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                      
                      {/* Multi-Angle Gallery Badge & Button */}
                      {hasMultipleImages(material) && (
                        <div className="absolute bottom-2 left-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openGallery(material);
                            }}
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md transition-colors shadow-lg"
                            style={{ fontSize: '10px' }}
                          >
                            <Camera className="h-3 w-3" />
                            {getAllMaterialImages(material).length} views
                          </button>
                        </div>
                      )}
                      
                      {/* View Product Button (shows on hover) */}
                      <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openGallery(material);
                          }}
                          className="bg-white/90 hover:bg-white text-gray-800 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all transform scale-90 group-hover/image:scale-100"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm font-medium">View Product</span>
                        </button>
                      </div>
                      
                      {/* In Cart Badge */}
                      {itemInCart && (
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-green-600 text-white flex items-center gap-1" style={{ fontSize: '10px' }}>
                            <Check className="h-3 w-3" />
                            {cartQty} in cart
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Content Section - Flexible */}
                    <CardHeader className="py-2 px-4 flex-shrink-0">
                      <CardTitle className="text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {material.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1 text-xs">
                        {material.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0 px-4 pb-3 space-y-2 flex-grow flex flex-col justify-end">
                      {/* Supplier Info */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium truncate">{material.supplier?.company_name || 'UjenziXform Catalog'}</span>
                        {material.supplier?.rating > 0 && (
                          <span className="text-yellow-500 ml-auto flex-shrink-0">⭐ {material.supplier.rating.toFixed(1)}</span>
                        )}
                      </div>
                      
                      {/* Price - Hidden for Professional Builders who get pricing via quotes */}
                      {userRole === 'professional_builder' ? (
                        <div className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1">
                          <FileText className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Request quote for pricing</span>
                        </div>
                      ) : material.pricing_type === 'variants' && material.variants && material.variants.length > 0 ? (
                        /* Multiple Variants - Size Selector */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Select Size</span>
                          </div>
                          {/* Variant Selector Dropdown */}
                          <select
                            value={selectedVariants[material.id] || material.variants[0]?.id || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedVariants(prev => ({ ...prev, [material.id]: e.target.value }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-9 px-2 text-sm rounded-md border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            {material.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.sizeLabel} - KES {variant.price.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          {/* Selected Variant Price Display */}
                          {(() => {
                            const selectedVariantId = selectedVariants[material.id] || material.variants[0]?.id;
                            const selectedVariant = material.variants.find(v => v.id === selectedVariantId) || material.variants[0];
                            return selectedVariant ? (
                              <div className="flex items-baseline justify-between">
                                <span className="text-lg font-bold text-blue-600">KES {selectedVariant.price.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground">/{material.unit}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        /* Single Price */
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-blue-600">KES {material.unit_price.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">/{material.unit}</span>
                        </div>
                      )}
                      
                      {/* Compare Price Checkbox - Hidden for Professional Builders (they get pricing via quotes) */}
                      {userRole !== 'professional_builder' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompare(material.id);
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                            isSelectedForCompare 
                              ? 'bg-purple-100 border-purple-500 text-purple-700' 
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelectedForCompare 
                              ? 'bg-purple-600 border-purple-600' 
                              : 'bg-white border-gray-400'
                          }`}>
                            {isSelectedForCompare && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium">
                            {isSelectedForCompare ? '✓ Comparing Price' : 'Compare Price'}
                          </span>
                        </button>
                      )}
                      
                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <span className="text-xs text-gray-600">Qty:</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(material.id, currentQty - 1)}
                            disabled={currentQty <= 0 || !material.in_stock}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={(e) => updateQuantity(material.id, parseInt(e.target.value) || 0)}
                            className="w-12 h-7 text-center text-sm px-1"
                            disabled={!material.in_stock}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(material.id, currentQty + 1)}
                            disabled={!material.in_stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Hide subtotal for Professional Builders - they get pricing via quotes */}
                        {userRole === 'professional_builder' ? (
                          <span className="text-xs text-blue-600 min-w-[50px] text-right">
                            {currentQty} {material.unit}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-700 min-w-[50px] text-right">
                            {(() => {
                              // Calculate price based on variant if available
                              if (material.pricing_type === 'variants' && material.variants && material.variants.length > 0) {
                                const selectedVariantId = selectedVariants[material.id] || material.variants[0]?.id;
                                const selectedVariant = material.variants.find(v => v.id === selectedVariantId) || material.variants[0];
                                return `KES ${((selectedVariant?.price || 0) * currentQty).toLocaleString()}`;
                              }
                              return `KES ${(material.unit_price * currentQty).toLocaleString()}`;
                            })()}
                          </span>
                        )}
                      </div>
                      
                      {/* ACTION BUTTON - Single Add to Cart for all builders */}
                      <Button 
                        className="w-full h-11 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          if (!isAuthenticated) {
                            window.location.href = '/home';
                            return;
                          }
                          const qtyToAdd = currentQty > 0 ? currentQty : 1;
                          handleAddToCart();
                          toast({
                            title: '🛒 Added to Cart!',
                            description: `${qtyToAdd} x ${material.name} added to cart.`,
                            action: (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsCartOpen(true)}
                                className="bg-white hover:bg-gray-100"
                              >
                                View Cart
                              </Button>
                            ),
                          });
                        }}
                        disabled={!material.in_stock}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                      
                      {/* Mobile Book View Button */}
                      {isMobile && (
                        <Button
                          variant="outline"
                          className="w-full h-9 text-xs mt-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => {
                            const idx = filteredMaterials.findIndex(m => m.id === material.id);
                            setBookViewStartIndex(idx >= 0 ? idx : 0);
                            setShowBookView(true);
                          }}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Browse from here
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      )}
      
      {/* Load More Button - shown when there are more materials available */}
      {hasMoreMaterials && !loading && filteredMaterials.length > 0 && (
        <div className="flex flex-col items-center justify-center mt-8 mb-4">
          <p className="text-sm text-muted-foreground mb-3">
            Showing {filteredMaterials.length} of {totalMaterialsCount} materials
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={async () => {
              setLoadingMore(true);
              try {
                // Fetch remaining materials
                const currentCount = materials.length;
                const BATCH_SIZE = 25;
                let moreMaterials: any[] = [];
                
                for (let offset = currentCount; offset < totalMaterialsCount; offset += BATCH_SIZE) {
                  const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,image_url&order=created_at.desc&limit=${BATCH_SIZE}&offset=${offset}`,
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
                    if (data && data.length > 0) {
                      moreMaterials = [...moreMaterials, ...data];
                    }
                    if (data.length < BATCH_SIZE) break;
                  } else {
                    break;
                  }
                }
                
                if (moreMaterials.length > 0) {
                  const newMaterials: Material[] = moreMaterials.map((item: any) => ({
                    id: item.id,
                    supplier_id: 'admin-catalog',
                    name: item.name || 'Unnamed Material',
                    category: item.category || 'Uncategorized',
                    description: item.description || '',
                    unit: item.unit || 'unit',
                    unit_price: item.suggested_price || 0,
                    image_url: item.image_url,
                    additional_images: [],
                    in_stock: true,
                    supplier: {
                      company_name: 'Admin Catalog',
                      location: 'Kenya',
                      rating: 5.0
                    }
                  }));
                  
                  setMaterials(prev => [...prev, ...newMaterials]);
                  setFilteredMaterials(prev => [...prev, ...newMaterials]);
                  setHasMoreMaterials(false);
                  toast({
                    title: '✅ Loaded all materials',
                    description: `Now showing all ${materials.length + newMaterials.length} materials`,
                  });
                }
              } catch (error) {
                console.error('Error loading more materials:', error);
                toast({
                  variant: 'destructive',
                  title: 'Error loading more',
                  description: 'Could not load additional materials. Please try again.',
                });
              } finally {
                setLoadingMore(false);
              }
            }}
            disabled={loadingMore}
            className="px-8"
          >
            {loadingMore ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Loading more...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Load All {totalMaterialsCount - filteredMaterials.length} Remaining Materials
              </>
            )}
          </Button>
        </div>
      )}
      
      <Dialog open={isMultiQuoteOpen} onOpenChange={setIsMultiQuoteOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Multi-quote Request</DialogTitle>
            <DialogDescription>Create a purchase order and send quote requests to multiple suppliers.</DialogDescription>
          </DialogHeader>
          {builderId && (
            <QuickPurchaseOrder 
              builderId={builderId} 
              defaultSupplierUserIds={preselectedSupplierUserIds}
              onClose={() => setIsMultiQuoteOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Price Comparison Modal */}
      <PriceComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedMaterials={getComparisonMaterials()}
        allMaterials={materials}
      />

      {/* Quote Cart removed - now using unified cart for all builders */}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          MULTI-ANGLE IMAGE GALLERY DIALOG
          Allows customers to view products from all angles (front, back, sides, etc.)
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 bg-slate-900 border-slate-700">
          {galleryMaterial && (() => {
            const images = getAllMaterialImages(galleryMaterial);
            const currentImage = images[galleryIndex];
            
            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div>
                    <DialogTitle className="text-white text-lg">{galleryMaterial.name}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {currentImage?.label || 'Product Image'} • {galleryIndex + 1} of {images.length}
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => setGalleryOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Main Image Area */}
                <div className="relative flex items-center justify-center bg-white min-h-[400px] max-h-[60vh]">
                  {currentImage && (
                    <img
                      src={currentImage.url}
                      alt={`${galleryMaterial.name} - ${currentImage.label}`}
                      className="max-w-full max-h-[60vh] object-contain p-4"
                    />
                  )}
                  
                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevGalleryImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextGalleryImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="p-4 bg-slate-800 border-t border-slate-700">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGalleryIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === galleryIndex 
                              ? 'border-blue-500 ring-2 ring-blue-500/50' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover bg-white"
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      {images.map((img, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            idx === galleryIndex 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {img.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Product Info Footer */}
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">{galleryMaterial.category}</p>
                      <p className="text-white font-semibold">
                        {userRole === 'professional_builder' 
                          ? 'Request quote for pricing' 
                          : `KES ${galleryMaterial.unit_price?.toLocaleString() || '0'} / ${galleryMaterial.unit}`
                        }
                      </p>
                    </div>
                    <Badge className={galleryMaterial.in_stock ? 'bg-green-600' : 'bg-red-600'}>
                      {galleryMaterial.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      {/* Mobile Book View - Full screen swipeable product cards */}
      {showBookView && (
        <MobileBookView
          materials={filteredMaterials.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            unit: m.unit,
            unit_price: m.unit_price,
            description: m.description,
            image_url: m.image_url,
            in_stock: m.in_stock,
            supplier_id: m.supplier_id,
            supplier_name: m.supplier?.company_name
          }))}
          onClose={() => setShowBookView(false)}
          initialIndex={bookViewStartIndex}
          userRole={userRole || undefined}
        />
      )}
    </div>
  );
};

