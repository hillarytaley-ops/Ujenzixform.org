/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 ADMIN PENDING PRODUCTS MANAGER - PROTECTED COMPONENT                            ║
 * ║                                                                                      ║
 * ║   PURPOSE: Review and approve/reject supplier product submissions                    ║
 * ║   - View all pending products from suppliers                                         ║
 * ║   - Approve products to make them visible in the marketplace                         ║
 * ║   - Reject products with a reason                                                    ║
 * ║   - Edit product details before approval                                             ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Package,
  Check,
  X,
  RefreshCw,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Store,
  Filter,
  Edit,
  AlertTriangle,
  DollarSign,
  Image as ImageIcon
} from 'lucide-react';

interface PendingProduct {
  id: string;
  supplier_id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_price: number;
  image_url?: string;
  in_stock: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  supplier?: {
    company_name: string;
    email?: string;
  };
}

// Product requests from suppliers (different table)
interface ProductRequestVariant {
  name: string;
  color?: string | null;
  price: number;
  unit?: string | null;
}

interface ProductRequest {
  id: string;
  supplier_id: string;
  product_name: string;
  category: string;
  description?: string;
  suggested_price: number;
  image_data?: string; // URL or data URL
  unit?: string | null;
  additional_images?: string[] | null;
  variants?: ProductRequestVariant[] | null;
  status: 'pending' | 'approved' | 'rejected';
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

export const PendingProductsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'pending' | 'approved' | 'rejected'>('requests');
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [productRequests, setProductRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [selectedProduct, setSelectedProduct] = useState<PendingProduct | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showRequestPreviewDialog, setShowRequestPreviewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unit_price: '',
    category: '',
    unit: ''
  });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Fetch product REQUESTS from suppliers (product_requests table)
  const fetchProductRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setProductRequests(data);
      } else {
        console.log('Product requests table not available or empty');
        setProductRequests([]);
      }
    } catch (err) {
      console.error('Error fetching product requests:', err);
      setProductRequests([]);
    }
  };

  // Fetch products based on approval status (materials table)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'requests') {
        await fetchProductRequests();
        setLoading(false);
        return;
      }
      
      // Fetch products with supplier info
      const { data, error } = await (supabase as any)
        .from('materials')
        .select(`
          *,
          suppliers:supplier_id (
            company_name
          )
        `)
        .eq('approval_status', activeTab)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include supplier info
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        supplier: item.suppliers ? { company_name: item.suppliers.company_name } : undefined
      }));
      
      setProducts(transformedData);
    } catch (err) {
      console.error('Error fetching products:', err);
      // If the query fails, try without the supplier join
      try {
        const { data, error } = await (supabase as any)
          .from('materials')
          .select('*')
          .eq('approval_status', activeTab)
          .order('created_at', { ascending: false });
        
        if (!error) {
          setProducts(data || []);
        }
      } catch (fallbackErr) {
        console.error('Fallback query failed:', fallbackErr);
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Always fetch requests count
    fetchProductRequests();
  }, [activeTab]);

  // Approve a product
  const handleApprove = async (product: PendingProduct) => {
    setProcessing(true);
    try {
      const { error } = await (supabase as any)
        .from('materials')
        .update({
          approval_status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (error) throw error;
      
      toast({
        title: 'Product approved',
        description: `${product.name} is now visible in the marketplace`,
      });
      
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to approve product',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Reject a product
  const handleReject = async () => {
    if (!selectedProduct) return;
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await (supabase as any)
        .from('materials')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);
      
      if (error) throw error;
      
      toast({
        title: 'Product rejected',
        description: `${selectedProduct.name} has been rejected`,
      });
      
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to reject product',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Edit product before approval
  const handleEditSave = async () => {
    if (!selectedProduct) return;

    setProcessing(true);
    try {
      const { error } = await (supabase as any)
        .from('materials')
        .update({
          name: editForm.name,
          description: editForm.description,
          unit_price: parseFloat(editForm.unit_price),
          category: editForm.category,
          unit: editForm.unit,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);
      
      if (error) throw error;
      
      toast({
        title: 'Product updated',
        description: 'Product details have been updated',
      });
      
      setShowEditDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (product: PendingProduct) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      unit_price: product.unit_price.toString(),
      category: product.category,
      unit: product.unit
    });
    setShowEditDialog(true);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.supplier?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get counts for tabs
  const getCounts = async () => {
    try {
      const [requestsRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        (supabase as any).from('product_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        (supabase as any).from('materials').select('id', { count: 'exact' }).eq('approval_status', 'pending'),
        (supabase as any).from('materials').select('id', { count: 'exact' }).eq('approval_status', 'approved'),
        (supabase as any).from('materials').select('id', { count: 'exact' }).eq('approval_status', 'rejected')
      ]);
      return {
        requests: requestsRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0
      };
    } catch {
      return { requests: 0, pending: 0, approved: 0, rejected: 0 };
    }
  };

  const [counts, setCounts] = useState({ requests: 0, pending: 0, approved: 0, rejected: 0 });
  
  useEffect(() => {
    getCounts().then(setCounts);
  }, [products, productRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-3 text-slate-400">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Submissions</h2>
          <p className="text-slate-400 mt-1">
            Review and approve supplier product submissions
          </p>
        </div>
        <Button
          onClick={fetchProducts}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-orange-700/50 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Supplier Requests</p>
                <p className="text-2xl font-bold text-orange-400">{counts.requests}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Package className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Approved</p>
                <p className="text-2xl font-bold text-green-400">{counts.approved}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Rejected</p>
                <p className="text-2xl font-bold text-red-400">{counts.rejected}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-full">
                <XCircle className="h-6 w-6 text-red-400" />
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
            placeholder="Search products or suppliers..."
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-slate-800/50 border border-slate-700 flex-wrap">
          <TabsTrigger value="requests" className="data-[state=active]:bg-orange-600">
            <Package className="h-4 w-4 mr-2" />
            Supplier Requests ({counts.requests})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-600">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({counts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-red-600">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({counts.rejected})
          </TabsTrigger>
        </TabsList>

        {/* Supplier Requests Tab */}
        <TabsContent value="requests" className="mt-6">
          {productRequests.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No supplier requests found</p>
                <p className="text-slate-500 text-sm mt-2">Suppliers can request new products to be added</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productRequests.map((request) => (
                <Card key={request.id} className="bg-slate-800/50 border-slate-700 overflow-hidden">
                  <CardContent className="p-4">
                    {/* Image Preview */}
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-700 mb-3">
                      {request.image_data ? (
                        <img
                          src={request.image_data}
                          alt={request.product_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Request Info */}
                    <h3 className="font-semibold text-white">{request.product_name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-slate-300">{request.category}</Badge>
                      {request.unit && (
                        <Badge variant="secondary" className="text-slate-200">per {request.unit}</Badge>
                      )}
                      {Array.isArray(request.variants) && request.variants.length > 0 && (
                        <Badge variant="secondary" className="bg-orange-900/50 text-orange-200">
                          {request.variants.length} variant{request.variants.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    
                    {request.description && (
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">{request.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                      <div>
                        <p className="text-green-400 font-bold">
                          KES {request.suggested_price?.toLocaleString() || '0'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRequestPreviewDialog(true);
                          }}
                          className="text-slate-300 hover:bg-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            // Mark as approved
                            await (supabase as any)
                              .from('product_requests')
                              .update({ status: 'approved' })
                              .eq('id', request.id);
                            toast({ title: 'Request approved', description: 'You can now add this product to the materials catalog' });
                            fetchProductRequests();
                          }}
                          className="text-green-400 hover:bg-green-500/20"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await (supabase as any)
                              .from('product_requests')
                              .update({ status: 'rejected' })
                              .eq('id', request.id);
                            toast({ title: 'Request rejected' });
                            fetchProductRequests();
                          }}
                          className="text-red-400 hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Products Table */}
        <TabsContent value={activeTab} className="mt-6">
          {filteredProducts.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No {activeTab} products found</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">Product</TableHead>
                    <TableHead className="text-slate-300">Supplier</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    <TableHead className="text-slate-300">Price</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{product.name}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {product.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-300">
                            {product.supplier?.company_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-slate-300">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-400 font-medium">
                          <DollarSign className="h-4 w-4" />
                          KES {product.unit_price.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400">per {product.unit}</p>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(product.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowPreviewDialog(true);
                            }}
                            className="text-slate-300 hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {activeTab === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(product)}
                                className="text-blue-400 hover:bg-blue-500/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApprove(product)}
                                disabled={processing}
                                className="text-green-400 hover:bg-green-500/20"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowRejectDialog(true);
                                }}
                                className="text-red-400 hover:bg-red-500/20"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {activeTab === 'rejected' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(product)}
                              disabled={processing}
                              className="text-green-400 hover:bg-green-500/20"
                              title="Re-approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-800">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Product Name</Label>
                  <p className="text-white font-medium">{selectedProduct.name}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Category</Label>
                  <p className="text-white">{selectedProduct.category}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Price</Label>
                  <p className="text-green-400 font-bold">
                    KES {selectedProduct.unit_price.toLocaleString()} / {selectedProduct.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Supplier</Label>
                  <p className="text-white">{selectedProduct.supplier?.company_name || 'Unknown'}</p>
                </div>
              </div>
              {selectedProduct.description && (
                <div>
                  <Label className="text-slate-400">Description</Label>
                  <p className="text-slate-300">{selectedProduct.description}</p>
                </div>
              )}
              {selectedProduct.rejection_reason && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <Label className="text-red-400">Rejection Reason</Label>
                  <p className="text-red-300">{selectedProduct.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Reject Product
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Please provide a reason for rejecting "{selectedProduct?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Image quality too low, Price seems incorrect, Missing product details..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Edit product details before approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Price (KES)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editForm.unit_price}
                  onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Request Preview Dialog */}
      <Dialog open={showRequestPreviewDialog} onOpenChange={setShowRequestPreviewDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              Supplier material upload
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Main + extra angles */}
              <div className="space-y-2">
                <Label className="text-slate-400">Photos</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="h-36 w-36 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-600">
                    {selectedRequest.image_data ? (
                      <img
                        src={selectedRequest.image_data}
                        alt={selectedRequest.product_name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-2 text-center">
                        <ImageIcon className="h-8 w-8 text-slate-500" />
                        <span className="text-[10px] text-slate-500">Main</span>
                      </div>
                    )}
                  </div>
                  {(Array.isArray(selectedRequest.additional_images) ? selectedRequest.additional_images : []).map(
                    (url, idx) =>
                      url ? (
                        <div
                          key={`${idx}-${url.slice(0, 32)}`}
                          className="h-36 w-36 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-600"
                        >
                          <img src={url} alt={`Angle ${idx + 2}`} className="h-full w-full object-contain" />
                        </div>
                      ) : null
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Product Name</Label>
                  <p className="text-white font-medium">{selectedRequest.product_name}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Category</Label>
                  <p className="text-white">{selectedRequest.category}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Reference price</Label>
                  <p className="text-green-400 font-bold">
                    KES {selectedRequest.suggested_price?.toLocaleString() || '0'}
                    {selectedRequest.unit ? (
                      <span className="text-sm font-normal text-slate-400"> / {selectedRequest.unit}</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Submitted</Label>
                  <p className="text-white">
                    {new Date(selectedRequest.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {Array.isArray(selectedRequest.variants) && selectedRequest.variants.length > 0 && (
                <div>
                  <Label className="text-slate-400 mb-2 block">Variants</Label>
                  <div className="rounded-md border border-slate-600 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 text-slate-400">
                        <tr>
                          <th className="text-left p-2 font-medium">Name / size</th>
                          <th className="text-left p-2 font-medium">Color</th>
                          <th className="text-left p-2 font-medium">Unit</th>
                          <th className="text-right p-2 font-medium">Price (KES)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.variants.map((v, i) => (
                          <tr key={i} className="border-t border-slate-700 text-slate-200">
                            <td className="p-2">{v.name}</td>
                            <td className="p-2">{v.color || '—'}</td>
                            <td className="p-2">{v.unit || selectedRequest.unit || '—'}</td>
                            <td className="p-2 text-right text-green-400">{Number(v.price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedRequest.description && (
                <div>
                  <Label className="text-slate-400">Description</Label>
                  <p className="text-slate-300">{selectedRequest.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestPreviewDialog(false)}
              className="border-slate-600"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!selectedRequest) return;
                await (supabase as any)
                  .from('product_requests')
                  .update({ status: 'approved' })
                  .eq('id', selectedRequest.id);
                toast({ title: 'Request approved!' });
                setShowRequestPreviewDialog(false);
                fetchProductRequests();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingProductsManager;



