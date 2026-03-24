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

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, Store, Package, Filter, PartyPopper, Plus, Minus, Check, Scale, Camera, ChevronDown, ChevronLeft, ChevronRight, X, Eye, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { QuickPurchaseOrder } from '@/components/builders/QuickPurchaseOrder';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
import { LazyImage } from '@/components/ui/LazyImage';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { PriceComparisonModal } from './PriceComparisonModal';
import { PriceComparisonTable } from './PriceComparisonTable';
import { QuoteCart, QuoteCartButton, QuoteCartItem } from './QuoteCart';
import { MobileBookView } from './MobileBookView';
import { FileText, BookOpen } from 'lucide-react';
import { ProductModal, materialToProduct, Product } from '@/components/products';
import { useAuth } from '@/contexts/AuthContext';
import { getCartProjectId, getCartProjectName } from '@/utils/builderCartProject';

// iOS/Safari compatibility check
const isIOSSafari = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
};

// Variant type for products with multiple sizes/colors/textures/prices
interface PriceVariant {
  id: string;
  sizeLabel: string;
  sizeUnit?: string;
  color?: string;
  colorHex?: string;
  texture?: string;
  price: number;
  stock: number;
  imageUrl?: string; // Optional image per variant
}

// Names that are colors not sizes - use for dynamic variant label (show "Color" not "Size")
const KNOWN_COLOR_NAMES = new Set(['silver', 'golden', 'gold', 'yellow', 'red', 'blue', 'green', 'white', 'black', 'gray', 'grey', 'orange', 'brown', 'pink', 'purple', 'beige', 'navy', 'maroon', 'cream', 'terracotta']);

function getVariantDimensionLabel(variants: PriceVariant[]): string {
  if (!variants?.length) return 'Variant';
  const sizeKeys = new Set(variants.map(v => [v.sizeLabel, v.sizeUnit].filter(Boolean).join(' ').trim()).filter(Boolean));
  const colorKeys = new Set(variants.map(v => v.color).filter(Boolean));
  const textureKeys = new Set(variants.map(v => v.texture).filter(Boolean));
  const sizesLookLikeColors = sizeKeys.size > 0 && [...sizeKeys].every(s => KNOWN_COLOR_NAMES.has(String(s).toLowerCase()));
  if (sizesLookLikeColors && colorKeys.size <= 1) return 'Color';
  if (sizeKeys.size > 1 && !sizesLookLikeColors && colorKeys.size <= 1 && textureKeys.size <= 1) return 'Size';
  if (colorKeys.size > 1 && sizeKeys.size <= 1 && textureKeys.size <= 1) return 'Color';
  if (textureKeys.size > 1 && sizeKeys.size <= 1 && colorKeys.size <= 1) return 'Texture';
  return 'Variant';
}

// Map common color names to hex for swatch display (when colorHex not set)
const COLOR_NAME_TO_HEX: Record<string, string> = {
  silver: '#C0C0C0', gray: '#808080', grey: '#808080', gold: '#FFD700', golden: '#FFD700',
  yellow: '#FFD700', red: '#DC2626', blue: '#2563EB', green: '#16A34A', white: '#FFFFFF',
  black: '#171717', orange: '#EA580C', brown: '#78350F', pink: '#DB2777', purple: '#7C3AED',
  beige: '#D4B896', navy: '#1E3A8A', maroon: '#800000', cream: '#FFFDD0', terracotta: '#C4622E',
  bronze: '#CD7F32', chrome: '#E8E8E8', brass: '#B5A642', nickel: '#727472', copper: '#B87333',
};
function getVariantSwatchColor(v: PriceVariant): string {
  if (v.colorHex && /^#[0-9A-Fa-f]{3,8}$/.test(v.colorHex)) return v.colorHex;
  const fromName = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return null;
    const key = name.toLowerCase().trim();
    return COLOR_NAME_TO_HEX[key] ?? null;
  };
  const hex = fromName(v.color) ?? fromName(v.sizeLabel) ?? fromName(v.texture);
  if (hex) return hex;
  return '#E5E7EB';
}

/** Stable key for variant selection (works when variant.id is missing, e.g. from API) */
function getVariantKey(variant: PriceVariant, index: number): string {
  if (variant?.id && String(variant.id).trim()) return String(variant.id);
  return `idx:${index}`;
}

/** Resolve selected variant from stored key */
function getVariantByKey(variants: PriceVariant[], key: string | undefined): PriceVariant | undefined {
  if (!key || !variants?.length) return variants?.[0];
  if (key.startsWith('idx:')) {
    const i = parseInt(key.slice(4), 10);
    if (!Number.isNaN(i) && i >= 0 && i < variants.length) return variants[i];
  }
  const byId = variants.find((v) => v.id === key);
  if (byId) return byId;
  return variants[0];
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
  
  // Use AuthContext for reliable auth state (instead of making separate Supabase calls)
  const { user: authUser, userRole: authUserRole, loading: authLoading } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // Default 12 items per page (3 rows x 4 cols)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  
  // Derive auth state from AuthContext with localStorage fallback
  const userRole = authUserRole || localStorage.getItem('user_role');
  
  // Check authentication from multiple sources for reliability
  const isAuthenticated = !!authUser || !!localStorage.getItem('user_id') || (() => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return !!parsed.user?.id;
      }
    } catch (e) {}
    return false;
  })();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMultiQuoteOpen, setIsMultiQuoteOpen] = useState(false);
  const [builderId, setBuilderId] = useState<string>('');
  const [preselectedSupplierUserIds, setPreselectedSupplierUserIds] = useState<string[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; user_id?: string; company_name: string; location?: string; rating?: number }[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // materialId -> variantId
  const [openColorPopoverMaterialId, setOpenColorPopoverMaterialId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [compareItems, setCompareItems] = useState<Set<string>>(new Set());
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [quoteCartItems, setQuoteCartItems] = useState<QuoteCartItem[]>([]);
  const [isQuoteCartOpen, setIsQuoteCartOpen] = useState(false);
  
  // Multi-angle image gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMaterial, setGalleryMaterial] = useState<Material | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  
  // NEW: Product detail modal state (variant-aware UI)
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  
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

  // Close color dropdown when clicking outside
  useEffect(() => {
    if (openColorPopoverMaterialId == null) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (document.querySelector(`[data-color-dropdown="${openColorPopoverMaterialId}"]`)?.contains(target)) return;
      setOpenColorPopoverMaterialId(null);
    };
    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [openColorPopoverMaterialId]);

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
      const selectedVariant = getVariantByKey(material.variants, selectedVariants[material.id]) ?? material.variants[0];
      if (selectedVariant) {
        const sizePart = [selectedVariant.sizeLabel, selectedVariant.sizeUnit].filter(Boolean).join(' ');
        const variantParts = [sizePart, selectedVariant.color, selectedVariant.texture].filter(Boolean);
        itemName = variantParts.length > 0 ? `${material.name} (${variantParts.join(', ')})` : `${material.name} (${selectedVariant.sizeLabel})`;
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

  // Set builderId from AuthContext user
  useEffect(() => {
    if (authUser?.id) {
      setBuilderId(authUser.id);
      console.log('MaterialsGrid - User from AuthContext:', authUser.email, 'Role:', authUserRole, 'BuilderId:', authUser.id);
    } else {
      console.log('MaterialsGrid - No user in AuthContext');
    }
  }, [authUser, authUserRole]);
  
  useEffect(() => {
    // Load materials data
    try {
      loadMaterials();
    } catch (error) {
      console.error('Error in loadMaterials effect:', error);
      setMaterials([]);
      setFilteredMaterials([]);
      setLoading(false);
    }
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

  // Filter materials when dependencies change - using useMemo for immediate computation
  const computedFilteredMaterials = useMemo(() => {
    // Fast path: no filters applied
    const noFilters = !searchQuery && 
                      selectedCategory === 'All Categories' && 
                      priceRange === 'all' && 
                      stockFilter === 'all';
    
    if (noFilters) {
      return materials;
    }

    // Pre-compute lowercase search query once
    const searchLower = searchQuery?.toLowerCase().trim() || '';
    
    // Single pass filter for better performance
    const filtered = materials.filter(m => {
      // Search filter - STRICT matching on name and category ONLY
      // This ensures searching "cement" only returns cement products
      if (searchLower) {
        const nameLower = m.name.toLowerCase();
        const categoryLower = m.category.toLowerCase();
        
        // Check if search term matches name or category
        const matchesName = nameLower.includes(searchLower);
        const matchesCategory = categoryLower.includes(searchLower);
        
        // Only match on name and category for precise results
        if (!matchesName && !matchesCategory) return false;
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

    console.log(`🔍 Search filter: "${searchQuery}" found ${filtered.length} results`);
    return filtered;
  }, [materials, searchQuery, selectedCategory, priceRange, stockFilter]);
  
  // Pagination calculations - use computedFilteredMaterials for immediate reactivity
  const totalPages = useMemo(() => Math.ceil(computedFilteredMaterials.length / itemsPerPage), [computedFilteredMaterials.length, itemsPerPage]);
  
  // Ensure currentPage is valid when filters change
  const validCurrentPage = useMemo(() => {
    const maxPage = Math.max(1, totalPages);
    return Math.min(currentPage, maxPage);
  }, [currentPage, totalPages]);
  
  const paginatedMaterials = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return computedFilteredMaterials.slice(startIndex, endIndex);
  }, [computedFilteredMaterials, validCurrentPage, itemsPerPage]);
  
  // Sync computed filtered materials to state (for components that need the state)
  useEffect(() => {
    setFilteredMaterials(computedFilteredMaterials);
    // Don't reset page here - it causes jumping when materials load
  }, [computedFilteredMaterials]);
  
  // Reset to page 1 only when FILTER CRITERIA change (not when data changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, priceRange, stockFilter]);

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
      const endIndex = Math.min(paginatedMaterials.length, startIndex + rowsInView * columns);
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
  }, [paginatedMaterials, columns]);

  // ✅ OPTIMIZED LAZY LOAD: Load images for visible items + buffer
  useEffect(() => {
    // Load visible items PLUS buffer for smoother scrolling
    const bufferSize = 20;
    const extendedEnd = Math.min(visibleEnd + bufferSize, paginatedMaterials.length);
    const visibleItems = paginatedMaterials.slice(visibleStart, extendedEnd);
    const itemsWithoutImages = visibleItems.filter(m => !m.image_url && m.supplier_id === 'admin-catalog');
    
    if (itemsWithoutImages.length > 0) {
      const idsToLoad = itemsWithoutImages.map(m => m.id);
      // Immediate load - no debounce for faster response
      loadMaterialImages(idsToLoad);
    }
  }, [visibleStart, visibleEnd, paginatedMaterials]);

  // ✅ PREFETCH: Preload images for next page when approaching end of current page
  useEffect(() => {
    // When user is on the last 3 items of current page, prefetch next page images
    const currentPageEnd = validCurrentPage * itemsPerPage;
    const itemsRemaining = paginatedMaterials.length - (visibleEnd - ((validCurrentPage - 1) * itemsPerPage));
    
    if (itemsRemaining <= 3 && validCurrentPage < totalPages) {
      // Prefetch next page images
      const nextPageStart = currentPageEnd;
      const nextPageEnd = Math.min(nextPageStart + itemsPerPage, computedFilteredMaterials.length);
      const nextPageMaterials = computedFilteredMaterials.slice(nextPageStart, nextPageEnd);
      
      // Use requestIdleCallback for non-blocking prefetch
      const prefetchImages = () => {
        nextPageMaterials.forEach(material => {
          if (material.image_url) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = material.image_url;
            document.head.appendChild(link);
          }
        });
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prefetchImages);
      } else {
        setTimeout(prefetchImages, 200);
      }
    }
  }, [visibleEnd, validCurrentPage, totalPages, itemsPerPage, computedFilteredMaterials, paginatedMaterials.length]);

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
          // Note: Only update the main materials state - filteredMaterials will be
          // recomputed automatically via computedFilteredMaterials useMemo
          setMaterials(prev => prev.map(mat => {
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
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            cache: 'no-store'
          }
        );
        
        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json();
          console.log(`💰 Supplier prices loaded: ${pricesData?.length || 0} entries`);
          
          if (pricesData && pricesData.length > 0) {
            // DEBUG: Show raw response
            console.log('💰 RAW supplier_product_prices (first 5):', pricesData.slice(0, 5));
            
            // Create a map of product_id -> price info
            // Sort by updated_at descending to get most recent first
            const sortedPrices = [...pricesData].sort((a: any, b: any) => {
              const dateA = new Date(a.updated_at || 0).getTime();
              const dateB = new Date(b.updated_at || 0).getTime();
              return dateB - dateA;
            });
            
            sortedPrices.forEach((item: any) => {
              if (!supplierPrices[item.product_id]) {
                supplierPrices[item.product_id] = {
                  price: item.price,
                  in_stock: item.in_stock,
                  supplier_id: item.supplier_id,
                  description: item.description || '',
                  variant_prices: item.variant_prices || []
                };
              }
            });
            
            console.log(`💰 Mapped ${Object.keys(supplierPrices).length} supplier prices`);
          } else {
            console.warn('⚠️ supplier_product_prices table is EMPTY - showing admin prices');
          }
        } else {
          console.error(`❌ Failed to load supplier prices: ${pricesResponse.status}`);
        }
      } catch (pricesErr: any) {
        console.error('❌ Error fetching supplier prices:', pricesErr);
      }
      
      console.log(`📊 Supplier prices ready: ${Object.keys(supplierPrices).length} products`);
      
      // STEP 2: Fetch admin-uploaded materials - ULTRA OPTIMIZED for performance
      // ✅ PERFORMANCE: Fetch first batch WITH images, rest with metadata only
      let adminMaterials: Material[] = [];
      
      try {
        // Detect mobile devices for optimized loading
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
          || window.innerWidth < 768;
        
        console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`);
        
        // ✅ FAST LOADING: Load metadata first (fast), then images in parallel
        const isIOS = isIOSSafari();
        const FIRST_BATCH_WITH_IMAGES = 48; // First 48 with images for immediate display (4 pages)
        const METADATA_LIMIT = 600; // Load metadata for 600 items (fast, no images)
        
        console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}, iOS: ${isIOS}`);
        
        // STRATEGY: Load first batch WITH images (fast display), then metadata only, then lazy load remaining images
        try {
          // Step 1: Load first batch with images + rest as metadata only (PARALLEL)
          const [firstBatchResponse, metadataResponse] = await Promise.all([
            // First 48 items WITH images for immediate display
            fetch(
              `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants,image_url&is_approved=eq.true&order=created_at.desc&limit=${FIRST_BATCH_WITH_IMAGES}`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                cache: 'no-store'
              }
            ),
            // Rest of items WITHOUT images (much faster)
            fetch(
              `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants&is_approved=eq.true&order=created_at.desc&offset=${FIRST_BATCH_WITH_IMAGES}&limit=${METADATA_LIMIT - FIRST_BATCH_WITH_IMAGES}`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'count=exact',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                cache: 'no-store'
              }
            )
          ]);
          
          if (firstBatchResponse.ok && metadataResponse.ok) {
            const firstBatchData = await firstBatchResponse.json();
            const metadataData = await metadataResponse.json();
            
            // DEBUG: Log first few admin material IDs
            console.log('🔍 DEBUG - First 5 admin_material_images IDs:', firstBatchData.slice(0, 5).map((m: any) => ({ id: m.id, name: m.name })));
            console.log('🔍 DEBUG - Supplier prices product_ids:', Object.keys(supplierPrices).slice(0, 10));
            
            // Check for matches
            const matchCount = firstBatchData.filter((m: any) => supplierPrices[m.id]).length;
            console.log(`🔍 DEBUG - Matched ${matchCount} of ${firstBatchData.length} products with supplier prices`);
            
            // Get total count
            const countHeader = metadataResponse.headers.get('content-range');
            if (countHeader) {
              const total = parseInt(countHeader.split('/')[1] || '0');
              setTotalMaterialsCount(total);
              setHasMoreMaterials(total > firstBatchData.length + metadataData.length);
            }
            
            const allData = [...firstBatchData, ...metadataData];
            console.log(`⚡ Fast load: ${firstBatchData.length} with images + ${metadataData.length} metadata = ${allData.length} total`);
            
            // Process all data - first batch has images, rest will load lazily
            const processedMaterials = allData.map((item: any, index: number) => {
              const supplierPrice = supplierPrices[item.id];
              
              // Debug: Log when supplier price is found vs admin price
              if (supplierPrice) {
                console.log(`💰 Product "${item.name}" (${item.id}): Supplier price KES ${supplierPrice.price} (admin suggested: KES ${item.suggested_price})`);
              }
              
              // Get admin's variants as base
              let adminVariants: PriceVariant[] = [];
              try {
                if (item.variants && Array.isArray(item.variants)) adminVariants = item.variants;
                else if (item.variants && typeof item.variants === 'string') adminVariants = JSON.parse(item.variants);
              } catch (e) { adminVariants = []; }
              
              // Use SUPPLIER's variant prices if available, otherwise use admin's variants
              // Supplier variant prices take priority over admin's suggested variant prices
              let finalVariants: PriceVariant[] = adminVariants;
              if (supplierPrice?.variant_prices && Array.isArray(supplierPrice.variant_prices) && supplierPrice.variant_prices.length > 0) {
                finalVariants = supplierPrice.variant_prices;
                console.log(`💰 Using supplier variant prices for ${item.name}:`, supplierPrice.variant_prices);
              }
              
              // Final price: supplier price takes priority over admin suggested price
              const finalPrice = supplierPrice?.price ?? item.suggested_price ?? 0;
              
              return {
                id: item.id,
                // Use actual supplier_id from pricing if available, otherwise mark as admin-catalog
                supplier_id: supplierPrice?.supplier_id || 'admin-catalog',
                name: item.name || 'Unnamed Material',
                category: item.category || 'Uncategorized',
                description: supplierPrice?.description || item.description || '',
                unit: (item.unit && item.unit.trim()) ? item.unit : 'unit',
                unit_price: finalPrice,
                // First batch has images, rest will be loaded on-demand
                image_url: index < FIRST_BATCH_WITH_IMAGES ? (item.image_url || '') : '',
                additional_images: [],
                in_stock: supplierPrice?.in_stock ?? true,
                supplier: { company_name: supplierPrice ? 'Supplier' : 'Admin Catalog', location: 'Kenya', rating: supplierPrice ? 4.5 : 5.0 },
                pricing_type: item.pricing_type || 'single',
                variants: finalVariants
              } as Material;
            });
            
            adminMaterials = processedMaterials;
            
            // Set materials immediately for fast display
            setMaterials(processedMaterials);
            setLoading(false);
            console.log(`✅ ${processedMaterials.length} materials ready (${FIRST_BATCH_WITH_IMAGES} with images, rest lazy-loaded)`);
          }
        } catch (loadError) {
          console.error('❌ Fast load failed:', loadError);
        }
        
        // If we already loaded materials above, skip the fallback
        if (adminMaterials.length > 0) {
          // Continue to combine with supplier materials below
        } else {
          // FALLBACK: Simple single request (smaller limit)
          console.log('⚠️ Using fallback loading...');
          const fallbackResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,pricing_type,variants,image_url&is_approved=eq.true&order=created_at.desc&limit=100`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'count=exact'
              }
            }
          );
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const countHeader = fallbackResponse.headers.get('content-range');
            if (countHeader) {
              const total = parseInt(countHeader.split('/')[1] || '0');
              setTotalMaterialsCount(total);
              setHasMoreMaterials(total > fallbackData.length);
            }
            
            adminMaterials = fallbackData.map((item: any) => {
              const supplierPrice = supplierPrices[item.id];
              let variants: PriceVariant[] = [];
              try {
                if (item.variants && Array.isArray(item.variants)) variants = item.variants;
                else if (item.variants && typeof item.variants === 'string') variants = JSON.parse(item.variants);
              } catch (e) { variants = []; }
              
              return {
                id: item.id,
                // Use actual supplier_id from pricing if available, otherwise mark as admin-catalog
                supplier_id: supplierPrice?.supplier_id || 'admin-catalog',
                name: item.name || 'Unnamed Material',
                category: item.category || 'Uncategorized',
                description: supplierPrice?.description || item.description || '',
                unit: (item.unit && item.unit.trim()) ? item.unit : 'unit',
                unit_price: supplierPrice?.price || item.suggested_price || 0,
                image_url: item.image_url || '',
                additional_images: [],
                in_stock: supplierPrice?.in_stock ?? true,
                supplier: { company_name: supplierPrice ? 'Supplier' : 'Admin Catalog', location: 'Kenya', rating: supplierPrice ? 4.5 : 5.0 },
                pricing_type: item.pricing_type || 'single',
                variants: variants
              } as Material;
            });
          }
        }
        
        // adminMaterials is now populated from the fast loading above
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
      // - Only approved products (or no approval status for backward compatibility)
      // - Accept any valid image (base64, Supabase storage, or will use category default)
      const supplierMaterials = data ? data
        .filter(item => {
          // Must be approved (or no approval status for backward compatibility)
          const isApproved = !item.approval_status || item.approval_status === 'approved';
          
          // Log filtered out items for debugging
          if (!isApproved) {
            console.log(`⏳ Supplier product "${item.name}" filtered out - status: ${item.approval_status}`);
          }
          
          return isApproved;
        })
        .map(item => {
          // Accept images that are:
          // 1. Base64 data URLs (starts with 'data:image/')
          // 2. Supabase storage URLs (contains 'supabase.co/storage')
          // 3. If no valid image, will use category default in the UI
          const imageUrl = item.image_url || '';
          const isBase64 = imageUrl.startsWith('data:image/');
          const isSupabaseStorage = imageUrl.includes('supabase.co/storage');
          const hasValidImage = imageUrl && (isBase64 || isSupabaseStorage);
          
          return {
            ...item,
            image_url: hasValidImage ? imageUrl : '', // Will fallback to category default in UI
            supplier: {
              company_name: 'Supplier',
              location: 'Kenya',
              rating: 4.5
            }
          };
        }) : [];
      
      console.log(`📦 Supplier materials loaded: ${supplierMaterials.length} approved products`);

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

      // Only update materials - filteredMaterials will be recomputed via useMemo
      setMaterials(allMaterials);
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

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (validCurrentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (validCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of grid
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Prefetch next page images in background
      if (page < totalPages) {
        const nextPageStart = page * itemsPerPage;
        const nextPageEnd = Math.min(nextPageStart + itemsPerPage, computedFilteredMaterials.length);
        const nextPageMaterials = computedFilteredMaterials.slice(nextPageStart, nextPageEnd);
        
        // Preload images for next page
        setTimeout(() => {
          nextPageMaterials.forEach(material => {
            if (material.image_url) {
              const img = new Image();
              img.src = material.image_url;
            }
          });
        }, 100);
      }
    }
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
      const cartPid = getCartProjectId();
      const cartPname = getCartProjectName();
      const projectName =
        cartPname != null
          ? `${cartPname} — Quote: ${material.name}`
          : `Quote Request - ${material.category || 'Materials'}`;

      console.log('Creating quote request:', { poNumber, buyerId: user.id, supplierId, material: material.name, qty, cartPid });
      
      const insertRow: Record<string, unknown> = {
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: supplierId,
          total_amount: material.unit_price * qty,
          delivery_address: 'To be confirmed',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending', // Quote requests start as pending
          project_name: projectName,
          items: [{
            material_id: material.id,
            material_name: material.name,
            category: material.category,
            quantity: qty,
            unit: material.unit,
            unit_price: material.unit_price
          }]
      };
      if (cartPid) insertRow.project_id = cartPid;

      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert(insertRow as any)
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
            <div className="h-8 w-72 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer mb-2"></div>
            <div className="h-4 w-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer"></div>
            <div className="h-10 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer"></div>
          </div>
        </div>
        
        {/* Skeleton Filters */}
        <div className="bg-card border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer"></div>
            <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-shimmer" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        {/* Skeleton Product Grid - Enhanced with shimmer effect */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(itemsPerPage)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg overflow-hidden shadow-sm" style={{ animationDelay: `${i * 0.05}s` }}>
              {/* Image skeleton with shimmer */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                {/* Category badge placeholder */}
                <div className="absolute top-2 left-2 h-5 w-16 bg-gray-300/50 rounded-full"></div>
                {/* Stock badge placeholder */}
                <div className="absolute top-2 right-2 h-5 w-14 bg-gray-300/50 rounded-full"></div>
              </div>
              {/* Content skeleton */}
              <div className="p-4 space-y-3">
                {/* Title */}
                <div className="h-5 w-3/4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer"></div>
                {/* Description */}
                <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer" style={{ animationDelay: '0.1s' }}></div>
                {/* Supplier info */}
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer"></div>
                </div>
                {/* Price */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="h-6 w-24 bg-gradient-to-r from-blue-100 via-blue-50 to-blue-100 rounded animate-shimmer"></div>
                  <div className="h-4 w-12 bg-gray-200 rounded"></div>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-12 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 flex-1 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer"></div>
                </div>
                {/* Action button */}
                <div className="h-10 w-full bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 rounded-lg animate-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Loading indicator with progress */}
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-600"></div>
            <Package className="absolute inset-0 m-auto h-4 w-4 text-orange-600" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading construction materials...</p>
          <p className="text-xs text-gray-400">Fetching latest prices from suppliers</p>
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

      {/* ═══════════════════════════════════════════════════════════════════════════════
          ROLE-SPECIFIC GUIDANCE BANNER - STRICT ENFORCEMENT
          - Professional Builder: ONLY Request Quote
          - Private Client: ONLY Buy Now
          ═══════════════════════════════════════════════════════════════════════════════ */}
      {isAuthenticated && userRole === 'professional_builder' && (
        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 border-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <AlertDescription className="ml-2">
            <strong className="text-blue-800">🏗️ Professional Builder Mode</strong>
            <p className="text-sm text-blue-700 mt-1">
              Add items to your cart, then <strong className="text-blue-600">Request Quotes from Multiple Suppliers</strong> to compare prices and get the best deal!
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ℹ️ As a Professional Builder, you request quotes instead of buying directly.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {isAuthenticated && userRole === 'private_client' && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 border-2">
          <ShoppingCart className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🏠 Private Client Mode</strong>
            <p className="text-sm text-green-700 mt-1">
              Add items to your cart, then <strong className="text-green-600">Buy Now</strong> to complete your purchase instantly at listed prices!
            </p>
            <p className="text-xs text-green-600 mt-1 font-medium">
              ℹ️ As a Private Client, you can purchase directly from suppliers.
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
            Browse {computedFilteredMaterials.length} materials from {new Set(materials.map(m => m.supplier_id)).size} suppliers
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

      {/* Filters - All in one row on large screens */}
      <Card className="overflow-visible">
        <CardContent className="p-4 md:p-6">
          {/* Search and Filters - ALL IN ONE ROW on large screens */}
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-center">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                inputMode="search"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-10 text-sm rounded-lg border-2 focus:border-emerald-500 focus:ring-emerald-500"
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

            {/* Category Filter */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 w-full sm:w-[160px] text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="All Categories" />
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
                      className="py-2 text-sm cursor-pointer"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Filter */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="h-10 w-full sm:w-[140px] text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectItem value="all" className="py-2 text-sm cursor-pointer">All Prices</SelectItem>
                  <SelectItem value="under-1000" className="py-2 text-sm cursor-pointer">Under KES 1,000</SelectItem>
                  <SelectItem value="1000-5000" className="py-2 text-sm cursor-pointer">KES 1,000 - 5,000</SelectItem>
                  <SelectItem value="5000-10000" className="py-2 text-sm cursor-pointer">KES 5,000 - 10,000</SelectItem>
                  <SelectItem value="over-10000" className="py-2 text-sm cursor-pointer">Over KES 10,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stock Filter */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-10 w-full sm:w-[130px] text-sm rounded-lg border-2 focus:border-emerald-500">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectItem value="all" className="py-2 text-sm cursor-pointer">All Items</SelectItem>
                  <SelectItem value="in-stock" className="py-2 text-sm cursor-pointer">In Stock Only</SelectItem>
                  <SelectItem value="out-of-stock" className="py-2 text-sm cursor-pointer">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Book View Button - Mobile Only */}
            {isMobile && computedFilteredMaterials.length > 0 && (
              <Button
                variant="outline"
                className="flex-shrink-0 h-10 w-full sm:w-auto min-w-[100px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 hover:from-emerald-700 hover:to-teal-700 rounded-lg"
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
              <span className="font-medium">{computedFilteredMaterials.length}</span>
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
      {computedFilteredMaterials.length === 0 ? (
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
          {paginatedMaterials.map((material) => {
                // Get image URL - ONLY use actual image, don't fallback to category images during loading
                // Category default images will only be used in onError handler when actual image fails
                const imageUrl = material.image_url || '';
                const currentQty = getQuantity(material.id);
                const itemInCart = isInCart(material.id);
                const cartQty = getItemQuantity(material.id);

                const handleAddToCart = () => {
                  try {
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
                    
                    // Allow cart additions for:
                    // 1. Private Clients, Professional Builders, Admins (explicit roles)
                    // 2. Users with null role (role not yet loaded or not assigned - let them shop, check at checkout)
                    const allowedRoles = ['private_client', 'professional_builder', 'admin', 'builder'];
                    const canAddToCart = userRole === null || allowedRoles.includes(userRole);
                    
                    if (!canAddToCart) {
                      toast({
                        title: '⚠️ Builder Account Required',
                        description: `Your role (${userRole}) cannot purchase materials. Please register as a Private Client or Professional Builder.`,
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    if (!material?.id) {
                      toast({
                        title: 'Cannot add to cart',
                        description: 'This item is missing required data. Please refresh and try again.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    // Ensure quantity is at least 1
                    const qtyToAdd = currentQty > 0 ? currentQty : 1;
                    
                    // Get the correct price based on variant selection
                    let unitPrice = material.unit_price ?? 0;
                    let itemName = material.name ?? 'Material';
                    
                    if (material.pricing_type === 'variants' && material.variants && material.variants.length > 0) {
                      const selectedVariant = getVariantByKey(material.variants, selectedVariants[material.id]) ?? material.variants[0];
                      if (selectedVariant) {
                        unitPrice = selectedVariant.price;
                        const sizePart = [selectedVariant.sizeLabel, selectedVariant.sizeUnit].filter(Boolean).join(' ');
                        const variantParts = [sizePart, selectedVariant.color, selectedVariant.texture].filter(Boolean);
                        itemName = variantParts.length > 0 ? `${material.name} (${variantParts.join(', ')})` : `${material.name} (${selectedVariant.sizeLabel})`;
                      }
                    }
                    
                    console.log('🛒 Adding to cart:', itemName, 'qty:', qtyToAdd, 'price:', unitPrice);
                    
                    addToCart({
                      id: material.id,
                      name: itemName,
                      category: material.category ?? '',
                      unit: material.unit ?? 'piece',
                      unit_price: unitPrice,
                      image_url: imageUrl,
                      supplier_name: material.supplier?.company_name || 'UjenziXform Catalog',
                      supplier_id: material.supplier_id
                    }, qtyToAdd);
                    
                    // Show success toast
                    toast({
                      title: '✅ Added to Cart',
                      description: `${itemName} x${qtyToAdd} added to your cart`,
                    });
                    
                    // Reset quantity counter after adding to cart (back to default of 1)
                    setQuantities(prev => ({ ...prev, [material.id]: 1 }));
                  } catch (err) {
                    console.error('Add to cart error:', err);
                    toast({
                      title: 'Could not add to cart',
                      description: err instanceof Error ? err.message : 'Please try again or refresh the page.',
                      variant: 'destructive',
                    });
                  }
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
                          onClick={() => {
                            // Open new variant-aware product detail modal
                            const product = materialToProduct(material);
                            setSelectedProductDetail(product);
                          }}
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
                      
                      {/* View Product Button (shows on hover) - Opens variant-aware detail modal */}
                      <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open new variant-aware product detail modal
                            const product = materialToProduct(material);
                            setSelectedProductDetail(product);
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
                      
                      {/* Variant selector - visible at first sight for ALL users (before price) */}
                      {material.pricing_type === 'variants' && material.variants && material.variants.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded block w-fit">
                            Select {getVariantDimensionLabel(material.variants)}
                          </span>
                          {getVariantDimensionLabel(material.variants) === 'Color' ? (
                            <div className="relative" data-color-dropdown={material.id}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenColorPopoverMaterialId((prev) => (prev === material.id ? null : material.id));
                                }}
                                className="h-9 w-full text-sm rounded-md border border-purple-300 bg-white px-3 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-left"
                              >
                                {(() => {
                                  const storedKey = selectedVariants[material.id];
                                  const v = getVariantByKey(material.variants, storedKey) ?? material.variants[0];
                                  if (!v) return <span className="text-muted-foreground">Select…</span>;
                                  const sizePart = [v.sizeLabel, v.sizeUnit].filter(Boolean).join(' ');
                                  const parts = [sizePart, v.color, v.texture].filter(Boolean);
                                  const label = parts.length > 0 ? parts.join(', ') : v.sizeLabel || 'Variant';
                                  return (
                                    <>
                                      <span className="flex items-center gap-2 min-w-0">
                                        <span className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: getVariantSwatchColor(v) }} />
                                        <span className="truncate">{label} - KES {v.price.toLocaleString()}/{material.unit}</span>
                                      </span>
                                      <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-50 transition-transform ${openColorPopoverMaterialId === material.id ? 'rotate-180' : ''}`} />
                                    </>
                                  );
                                })()}
                              </button>
                              {openColorPopoverMaterialId === material.id && (
                                <div
                                  className="absolute left-0 right-0 top-full mt-1 rounded-md border border-purple-200 bg-white shadow-lg z-50 py-1 max-h-60 overflow-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {material.variants.map((variant, idx) => {
                                    const sizePart = [variant.sizeLabel, variant.sizeUnit].filter(Boolean).join(' ');
                                    const parts = [sizePart, variant.color, variant.texture].filter(Boolean);
                                    const label = parts.length > 0 ? parts.join(', ') : variant.sizeLabel || 'Variant';
                                    const variantKey = getVariantKey(variant, idx);
                                    const currentKey = selectedVariants[material.id] ?? getVariantKey(material.variants[0], 0);
                                    const isSelected = currentKey === variantKey;
                                    return (
                                      <button
                                        key={variant.id ?? variantKey}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedVariants((prev) => ({ ...prev, [material.id]: variantKey }));
                                          setOpenColorPopoverMaterialId(null);
                                        }}
                                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-purple-50 cursor-pointer ${isSelected ? 'bg-purple-100 ring-1 ring-purple-300' : ''}`}
                                      >
                                        <span className="h-6 w-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: getVariantSwatchColor(variant) }} />
                                        <span>{label} - KES {variant.price.toLocaleString()}/{material.unit}</span>
                                        {isSelected && <Check className="h-4 w-4 ml-auto text-purple-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <select
                              value={selectedVariants[material.id] ?? (material.variants[0] ? getVariantKey(material.variants[0], 0) : '')}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedVariants(prev => ({ ...prev, [material.id]: e.target.value }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-9 px-2 text-sm rounded-md border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              {material.variants.map((variant, idx) => {
                                const sizePart = [variant.sizeLabel, variant.sizeUnit].filter(Boolean).join(' ');
                                const parts = [sizePart, variant.color, variant.texture].filter(Boolean);
                                const label = parts.length > 0 ? parts.join(', ') : variant.sizeLabel || 'Variant';
                                return (
                                  <option key={variant.id ?? getVariantKey(variant, idx)} value={getVariantKey(variant, idx)}>
                                    {label} - KES {variant.price.toLocaleString()}/{material.unit}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      )}
                      
                      {/* Price - Hidden for Professional Builders who get pricing via quotes */}
                      {userRole === 'professional_builder' ? (
                        <div className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1">
                          <FileText className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Request quote for pricing</span>
                        </div>
                      ) : material.pricing_type === 'variants' && material.variants && material.variants.length > 0 ? (
                        /* Multiple Variants - show selected price only; variant selector is above Add to Cart */
                        (() => {
                          const selectedVariant = getVariantByKey(material.variants, selectedVariants[material.id]) ?? material.variants[0];
                          return selectedVariant ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-lg font-bold text-blue-600">KES {selectedVariant.price.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">/{material.unit}</span>
                            </div>
                          ) : null;
                        })()
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
                                const selectedVariant = getVariantByKey(material.variants, selectedVariants[material.id]) ?? material.variants[0];
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
                          try {
                            handleAddToCart();
                            // Success toast is shown inside handleAddToCart
                          } catch (err) {
                            // Error toast already shown in handleAddToCart
                          }
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
      
      {/* Pagination Controls */}
      {computedFilteredMaterials.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center justify-center mt-8 mb-4 space-y-4">
          {/* Results Summary */}
          <p className="text-sm text-muted-foreground">
            Showing {((validCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(validCurrentPage * itemsPerPage, computedFilteredMaterials.length)} of {computedFilteredMaterials.length} materials
          </p>
          
          {/* Pagination Navigation */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* First Page Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={validCurrentPage === 1}
              className="hidden sm:flex h-9 w-9 p-0"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            {/* Previous Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(validCurrentPage - 1)}
              disabled={validCurrentPage === 1}
              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={validCurrentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page as number)}
                    className={`h-9 w-9 p-0 font-medium ${
                      validCurrentPage === page 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    }`}
                  >
                    {page}
                  </Button>
                )
              ))}
            </div>
            
            {/* Next Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(validCurrentPage + 1)}
              disabled={validCurrentPage === totalPages}
              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            
            {/* Last Page Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="hidden sm:flex h-9 w-9 p-0"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Items Per Page Selector */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Show:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
                <SelectItem value="96">96</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">per page</span>
          </div>
        </div>
      )}
      
      {/* Load All Materials Button - shown when there are more materials in database */}
      {hasMoreMaterials && !loading && computedFilteredMaterials.length > 0 && (
        <div className="flex flex-col items-center justify-center mt-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setLoadingMore(true);
              try {
                // Fetch remaining materials - use larger batch for faster loading
                const currentCount = materials.length;
                const BATCH_SIZE = 100; // Increased from 25 for faster loading
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
                    unit: (item.unit && item.unit.trim()) ? item.unit : 'unit',
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
                  
                  // Only update materials - filteredMaterials will be recomputed via useMemo
                  setMaterials(prev => [...prev, ...newMaterials]);
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
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {loadingMore ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Loading...
              </>
            ) : (
              <>
                <Package className="mr-2 h-3 w-3" />
                Load {totalMaterialsCount - computedFilteredMaterials.length} more from database
              </>
            )}
          </Button>
        </div>
      )}
      
      <Dialog open={isMultiQuoteOpen} onOpenChange={setIsMultiQuoteOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {builderId && (
            <QuickPurchaseOrder 
              builderId={builderId} 
              defaultSupplierUserIds={preselectedSupplierUserIds}
              onClose={() => setIsMultiQuoteOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Price Comparison Table - Enhanced matrix view */}
      <PriceComparisonTable
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
          onImageLoaded={(id, imageUrl) => {
            // Update materials state with newly loaded image
            setMaterials(prev => prev.map(m => 
              m.id === id ? { ...m, image_url: imageUrl } : m
            ));
          }}
        />
      )}
      
      {/* NEW: Product Detail Modal - Variant-aware UI */}
      <ProductModal
        product={selectedProductDetail}
        isOpen={!!selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
      />
    </div>
  );
};

