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
import { Search, ShoppingCart, Store, Package, Filter, PartyPopper, Plus, Minus, Check, Scale } from 'lucide-react';
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

// iOS/Safari compatibility check
const isIOSSafari = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
};

interface Material {
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
  supplier?: {
    company_name: string;
    location: string;
    rating: number;
  };
}

const PRODUCT_CATEGORIES = [
  'All Categories',
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

// No demo materials - only show real data from database

export const MaterialsGrid = () => {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [compareItems, setCompareItems] = useState<Set<string>>(new Set());
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const { toast } = useToast();
  const { addToCart, isInCart, getItemQuantity, setIsCartOpen } = useCart();
  
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
  
  // Get quantity for a material (default to 0)
  const getQuantity = (materialId: string) => quantities[materialId] || 0;
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [materialId]: Math.max(0, qty) }));
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
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          setUserRole(roleData?.role || null);
          console.log('User role:', roleData?.role, 'BuilderId:', user.id);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    
    checkUserRole();
    
    // Wrap in try-catch to prevent crashes
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
        const { data } = await supabase
          .from('suppliers')
          .select('id, user_id, company_name, location, rating')
          .eq('status', 'active')
          .order('rating', { ascending: false })
          .limit(50);
        setAllSuppliers(data || []);
      } catch (e) {
        setAllSuppliers([]);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    try {
      filterMaterials();
    } catch (error) {
      console.error('Error in filterMaterials effect:', error);
      setFilteredMaterials(materials);
    }
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

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      // iOS/Safari specific: Add delay to prevent race conditions
      if (isIOSSafari()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // STEP 1: Fetch supplier prices from supplier_product_prices table
      // This is where suppliers set their actual selling prices
      let supplierPrices: Record<string, { price: number; in_stock: boolean; supplier_id: string }> = {};
      
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
          if (pricesData && pricesData.length > 0) {
            // Create a map of product_id -> price info
            // If multiple suppliers have prices, use the lowest price
            pricesData.forEach((item: any) => {
              const existingPrice = supplierPrices[item.product_id];
              if (!existingPrice || item.price < existingPrice.price) {
                supplierPrices[item.product_id] = {
                  price: item.price,
                  in_stock: item.in_stock,
                  supplier_id: item.supplier_id
                };
              }
            });
          }
        }
      } catch (pricesErr: any) {
        console.log('Supplier prices table not available');
      }
      
      // STEP 2: Fetch admin-uploaded images
      let adminMaterials: Material[] = [];
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/admin_material_images?select=id,name,category,description,unit,suggested_price,image_url&is_approved=eq.true&order=created_at.desc&limit=50`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const adminData = await response.json();
          if (adminData && adminData.length > 0) {
            adminMaterials = adminData.map((item: any) => {
              // Check if any supplier has set a price for this product
              const supplierPrice = supplierPrices[item.id];
              
              return {
                id: item.id,
                name: item.name,
                category: item.category,
                description: item.description || '',
                unit: item.unit || 'unit',
                // Use supplier price if available, otherwise use admin's suggested price
                unit_price: supplierPrice?.price || item.suggested_price || 0,
                image_url: item.image_url,
                // Use supplier's stock status if available
                in_stock: supplierPrice?.in_stock ?? true,
                supplier: {
                  company_name: supplierPrice ? 'Supplier' : 'Admin Catalog',
                  location: 'Kenya',
                  rating: supplierPrice ? 4.5 : 5.0
                }
              };
            });
          }
        }
      } catch (adminErr: any) {
        // Silent fail - continue with other data sources
      }
      
      // STEP 3: Fetch supplier materials from materials table  
      let data: any[] | null = null;
      
      try {
        // Fetch materials - filter by approval_status on client side for backward compatibility
        // (in case the approval_status column hasn't been added to the database yet)
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/materials?select=*&order=created_at.desc&limit=50`,
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

      // Transform supplier data with default supplier info
      // Filter to only show approved products (or products without approval_status for backward compatibility)
      const supplierMaterials = data ? data
        .filter(item => !item.approval_status || item.approval_status === 'approved')
        .map(item => ({
          ...item,
          supplier: {
            company_name: 'Supplier',
            location: 'Kenya',
            rating: 4.5
          }
        })) : [];

      // Combine: Admin materials FIRST, then supplier materials
      const combinedMaterials = [...adminMaterials, ...supplierMaterials];
      
      // Remove duplicates by name (keep first occurrence with a base64 image if available)
      const seenNames = new Set<string>();
      const allMaterials = combinedMaterials.filter(m => {
        // Skip if we've already seen this product name
        const normalizedName = m.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
      });

      // Show empty state if no materials
      if (allMaterials.length === 0) {
        setMaterials([]);
        setFilteredMaterials([]);
        setLoading(false);
        return;
      }

      setMaterials(allMaterials);
      setFilteredMaterials(allMaterials);
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
    let filtered = [...materials];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.supplier?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Price filter
    if (priceRange !== 'all') {
      filtered = filtered.filter(m => {
        if (priceRange === 'under-1000') return m.unit_price < 1000;
        if (priceRange === '1000-5000') return m.unit_price >= 1000 && m.unit_price <= 5000;
        if (priceRange === '5000-10000') return m.unit_price >= 5000 && m.unit_price <= 10000;
        if (priceRange === 'over-10000') return m.unit_price > 10000;
        return true;
      });
    }

    // Stock filter
    if (stockFilter === 'in-stock') {
      filtered = filtered.filter(m => m.in_stock);
    } else if (stockFilter === 'out-of-stock') {
      filtered = filtered.filter(m => !m.in_stock);
    }

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
          description: 'Only Professional Builders can request quotes. Private Clients can buy directly.',
          variant: 'destructive',
        });
        return;
      }
      
      const supplierId = material.supplier_id || (selectedSuppliersMap[material.id]?.[0]);
      if (!supplierId) {
        toast({
          title: '⚠️ No Supplier Selected',
          description: 'Please select a supplier for this quote request.',
          variant: 'destructive',
        });
        return;
      }

      const qty = getQuantity(material.id) || 1;
      const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: supplierId,
          total_amount: material.unit_price * qty,
          delivery_address: 'To be confirmed',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          status: 'quote_requested',
          project_name: material.category || 'Quote Request',
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
      
      toast({
        title: '📋 Quote Requested!',
        description: `Quote request for ${material.name} sent to supplier. They will respond with pricing.`,
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
      
      // Only Private Clients can buy directly
      if (userRole !== 'private_client' && userRole !== 'admin') {
        toast({
          title: '🛒 Private Client Required',
          description: 'Only Private Clients can purchase directly. Professional Builders should request quotes.',
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
          <ShoppingCart className="h-5 w-5 text-orange-600" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <strong className="text-orange-800">🏗️ Want to Buy or Request Quotes?</strong>
                <p className="text-sm text-orange-700 mt-1">
                  <strong>Private Clients</strong> can buy directly | <strong>Professional Builders</strong> can request quotes
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
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
      {isAuthenticated && userRole === 'professional_builder' && (
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 border-2">
          <Package className="h-5 w-5 text-blue-600" />
          <AlertDescription className="ml-2">
            <strong className="text-blue-800">📋 Professional Builder Mode</strong>
            <p className="text-sm text-blue-700 mt-1">
              As a Professional Builder, you can <strong>request quotes</strong> from suppliers for bulk orders and competitive pricing.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && userRole === 'private_client' && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 border-2">
          <ShoppingCart className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🛒 Private Client Mode</strong>
            <p className="text-sm text-green-700 mt-1">
              As a Private Client, you can <strong>buy materials directly</strong> from suppliers. Add items to your cart and checkout!
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && userRole && !['professional_builder', 'private_client', 'admin'].includes(userRole) && (
        <Alert className="bg-gradient-to-r from-red-50 to-orange-50 border-red-300 border-2">
          <AlertDescription className="ml-2">
            <strong className="text-red-800">⚠️ Purchasing Not Available</strong>
            <p className="text-sm text-red-700 mt-1">
              Your account type ({userRole}) cannot purchase materials. Please register as a <strong>Private Client</strong> or <strong>Professional Builder</strong>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Message for New Registrations */}
      {showWelcome && (
        <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-300">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🎉 Welcome to MradiPro!</strong>
            <p className="mt-1">
              {searchParams.get('welcome') === 'private_client' ? (
                <>You can now <strong>purchase materials directly</strong> using the <span className="text-green-600 font-bold">"Buy Now"</span> buttons below. Start shopping!</>
              ) : (
                <>You can now <strong>request quotes from suppliers</strong> using the <span className="text-blue-600 font-bold">"Request Quote"</span> buttons below. Get the best deals!</>
              )}
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
        <div className="flex items-center gap-2">
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

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials, suppliers, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price Filter */}
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-1000">Under KES 1,000</SelectItem>
                <SelectItem value="1000-5000">KES 1,000 - 5,000</SelectItem>
                <SelectItem value="5000-10000">KES 5,000 - 10,000</SelectItem>
                <SelectItem value="over-10000">Over KES 10,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="in-stock">In Stock Only</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Showing {filteredMaterials.length} of {materials.length} materials</span>
            </div>
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
                const imageUrl = material.image_url || getDefaultCategoryImage(material.category);
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
                  // Only Private Clients can buy directly
                  if (userRole !== 'private_client' && userRole !== 'admin') {
                    if (userRole === 'professional_builder') {
                      toast({
                        title: '📋 Use Request Quote Instead',
                        description: 'As a Professional Builder, please use "Request Quote" for bulk orders and competitive pricing.',
                        variant: 'destructive',
                      });
                    } else {
                      toast({
                        title: '⚠️ Private Client Account Required',
                        description: 'Only Private Clients can purchase materials directly. Please register as a Private Client.',
                        variant: 'destructive',
                      });
                    }
                    return;
                  }
                  addToCart({
                    id: material.id,
                    name: material.name,
                    category: material.category,
                    unit: material.unit,
                    unit_price: material.unit_price,
                    image_url: imageUrl,
                    supplier_name: material.supplier?.company_name || 'MradiPro Catalog',
                    supplier_id: material.supplier_id
                  }, currentQty);
                  toast({
                    title: '🛒 Added to Cart!',
                    description: `${currentQty} x ${material.name} added to your cart.`,
                  });
                };

                const isSelectedForCompare = compareItems.has(material.id);
                
                return (
                  <Card key={material.id} className={`overflow-hidden hover:shadow-xl transition-shadow duration-300 group flex flex-col ${itemInCart ? 'ring-2 ring-green-500' : ''} ${isSelectedForCompare ? 'ring-2 ring-purple-500' : ''}`}>
                    {/* Image Section - Fixed height */}
                    <div className="relative bg-white overflow-hidden h-44 flex-shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={material.name}
                          className="w-full h-full object-contain p-3 bg-white"
                          loading="lazy"
                          style={{ imageRendering: 'auto' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white">
                          <Package className="h-16 w-16 text-muted-foreground" />
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
                        <span className="font-medium truncate">{material.supplier?.company_name || 'MradiPro Catalog'}</span>
                        {material.supplier?.rating > 0 && (
                          <span className="text-yellow-500 ml-auto flex-shrink-0">⭐ {material.supplier.rating.toFixed(1)}</span>
                        )}
                      </div>
                      
                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-blue-600">KES {material.unit_price.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">/{material.unit}</span>
                      </div>
                      
                      {/* Compare Price Checkbox - Simple & Prominent */}
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
                        <span className="text-xs font-semibold text-gray-700 min-w-[50px] text-right">
                          KES {(material.unit_price * currentQty).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Role-Based Action Buttons */}
                      {/* Private Clients: Show Buy/Cart buttons */}
                      {(userRole === 'private_client' || userRole === 'admin') && (
                        <>
                          <Button 
                            className={`w-full h-10 text-sm font-semibold flex items-center justify-center gap-2 ${
                              itemInCart 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : currentQty > 0
                                  ? 'bg-orange-500 hover:bg-orange-600'
                                  : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            onClick={handleAddToCart}
                            disabled={!material.in_stock || currentQty === 0}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {itemInCart ? `Add More (${cartQty} in cart)` : currentQty === 0 ? 'Select Quantity' : 'Add to Cart'}
                          </Button>
                          <Button 
                            className="w-full h-8 text-xs font-medium bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              handleAddToCart();
                              setIsCartOpen(true);
                            }}
                            disabled={!material.in_stock || currentQty === 0}
                          >
                            🛒 Buy Now
                          </Button>
                        </>
                      )}

                      {/* Professional Builders: Show Quote Request button only */}
                      {userRole === 'professional_builder' && (
                        <Button 
                          className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                          onClick={() => handleRequestQuote(material)}
                          disabled={!material.in_stock}
                        >
                          📋 Request Quote
                        </Button>
                      )}

                      {/* Not authenticated: Show sign-in prompt */}
                      {!isAuthenticated && (
                        <div className="space-y-2">
                          <Button 
                            className="w-full h-10 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => window.location.href = '/home'}
                          >
                            Sign In to Purchase
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            Private Clients buy directly • Pro Builders request quotes
                          </p>
                        </div>
                      )}

                      {/* Other roles: Show restriction message */}
                      {isAuthenticated && userRole && !['private_client', 'professional_builder', 'admin'].includes(userRole) && (
                        <div className="text-center py-2">
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ Your account type cannot purchase materials
                          </p>
                          <a href="/home" className="text-xs text-blue-600 underline">
                            Register as Private Client or Pro Builder
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
    </div>
  );
};

