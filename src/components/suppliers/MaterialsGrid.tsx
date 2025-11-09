import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, Store, Package, Filter, PartyPopper } from 'lucide-react';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
import { useSearchParams } from 'react-router-dom';

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

// Demo materials for when database is empty
const DEMO_MATERIALS: Material[] = [
  {
    id: 'demo-1',
    supplier_id: 'demo',
    name: 'Bamburi Cement 42.5N (50kg)',
    description: 'Premium Portland cement from Bamburi - Kenya\'s most trusted cement brand',
    category: 'Cement',
    unit: 'bag',
    unit_price: 850,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Nairobi',
      location: 'Nairobi',
      rating: 4.8
    }
  },
  {
    id: 'demo-2',
    supplier_id: 'demo',
    name: 'Y12 Deformed Steel Bars (6m)',
    description: 'High tensile deformed bars for concrete reinforcement - KEBS approved',
    category: 'Steel',
    unit: 'bar',
    unit_price: 950,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Mombasa',
      location: 'Mombasa',
      rating: 4.9
    }
  },
  {
    id: 'demo-3',
    supplier_id: 'demo',
    name: 'Vitrified Floor Tiles 600x600mm',
    description: 'Premium vitrified porcelain tiles - high gloss finish, stain resistant',
    category: 'Tiles',
    unit: 'sqm',
    unit_price: 2800,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Nairobi',
      location: 'Nairobi',
      rating: 4.7
    }
  },
  {
    id: 'demo-4',
    supplier_id: 'demo',
    name: 'Crown Emulsion Paint 20L',
    description: 'Crown Paints premium acrylic emulsion - smooth matt finish, washable',
    category: 'Paint',
    unit: '20L bucket',
    unit_price: 4800,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Kisumu',
      location: 'Kisumu',
      rating: 4.7
    }
  },
  {
    id: 'demo-5',
    supplier_id: 'demo',
    name: 'Mabati Iron Sheets Gauge 28 (3m)',
    description: 'Mabati box profile corrugated iron sheets - galvanized steel, 25-year warranty',
    category: 'Iron Sheets',
    unit: 'sheet',
    unit_price: 1350,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Eldoret',
      location: 'Eldoret',
      rating: 4.8
    }
  },
  {
    id: 'demo-6',
    supplier_id: 'demo',
    name: 'Treated Cypress Timber 4x2 (12ft)',
    description: 'Pressure-treated cypress timber - termite and borer resistant',
    category: 'Timber',
    unit: 'piece',
    unit_price: 850,
    in_stock: true,
    created_at: new Date().toISOString(),
    supplier: {
      company_name: 'Demo Supplier - Nakuru',
      location: 'Nakuru',
      rating: 4.6
    }
  }
];

export const MaterialsGrid = () => {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<Material[]>(DEMO_MATERIALS);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>(DEMO_MATERIALS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { toast } = useToast();
  
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
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          setUserRole(roleData?.role || null);
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
      setMaterials(DEMO_MATERIALS);
      setFilteredMaterials(DEMO_MATERIALS);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      filterMaterials();
    } catch (error) {
      console.error('Error in filterMaterials effect:', error);
      setFilteredMaterials(materials.length > 0 ? materials : DEMO_MATERIALS);
    }
  }, [materials, searchQuery, selectedCategory, priceRange, stockFilter]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      // iOS/Safari specific: Add delay to prevent race conditions
      if (isIOSSafari()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // First, try to load materials without join (in case suppliers table has issues)
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading materials:', error);
        // Don't throw - just use demo materials instead
        console.log('Database error, using demo materials');
        setMaterials(DEMO_MATERIALS);
        setFilteredMaterials(DEMO_MATERIALS);
        setLoading(false);
        return;
      }

      // Transform data with default supplier info
      // iOS Safari compatible: Avoid optional chaining in maps
      const transformedData = data ? data.map(item => ({
        ...item,
        supplier: {
          company_name: 'Supplier', // Default - we'll fetch supplier info separately if needed
          location: 'Kenya',
          rating: 4.5
        }
      })) : [];

      // Use demo materials if database is empty
      if (transformedData.length === 0) {
        console.log('No materials in database, using demo materials');
        setMaterials(DEMO_MATERIALS);
        setFilteredMaterials(DEMO_MATERIALS);
        setLoading(false);
        return;
      }

      setMaterials(transformedData);
      
      // Optionally fetch supplier names (but don't fail if this errors)
      if (data && data.length > 0) {
        try {
          const supplierIds = Array.from(new Set(data.map(m => m.supplier_id).filter(Boolean)));
          
          if (supplierIds.length > 0) {
            const { data: suppliersData, error: suppliersError } = await supabase
              .from('suppliers')
              .select('id, user_id, company_name, location, rating')
              .in('user_id', supplierIds);

            if (!suppliersError && suppliersData && suppliersData.length > 0) {
              // Update materials with supplier info - iOS Safari compatible
              const updated = transformedData.map(material => {
                const supplier = suppliersData.find(s => s.user_id === material.supplier_id);
                return {
                  ...material,
                  supplier: supplier ? {
                    company_name: supplier.company_name || 'Supplier',
                    location: supplier.location || 'Kenya',
                    rating: supplier.rating || 4.5
                  } : material.supplier
                };
              });
              setMaterials(updated);
            } else {
              console.log('Could not fetch supplier info, using defaults');
            }
          }
        } catch (suppError) {
          console.log('Error fetching suppliers, using default supplier info');
          // Continue with existing data - don't fail
        }
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      // Don't show error toast - just use demo materials
      console.log('Falling back to demo materials');
      setMaterials(DEMO_MATERIALS);
      setFilteredMaterials(DEMO_MATERIALS);
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

  const handleRequestQuote = (material: Material) => {
    toast({
      title: 'Quote Request',
      description: `Request sent for ${material.name} from ${material.supplier?.company_name}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading materials catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message for New Registrations */}
      {showWelcome && (
        <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-300">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            <strong className="text-green-800">🎉 Welcome to UjenziPro!</strong>
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
        <Button onClick={loadMaterials} variant="outline">
          <Package className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMaterials.map((material) => {
            // Use custom image or fallback to default category image
            const imageUrl = material.image_url || getDefaultCategoryImage(material.category);

            return (
              <Card key={material.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                {/* Material Image - Larger */}
                <div className="relative aspect-square bg-muted overflow-hidden h-64 sm:h-72 md:h-80">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={material.name}
                      className="w-full h-full object-contain p-4 bg-white group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <Package className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={material.in_stock ? 'bg-green-600' : 'bg-red-600'}>
                      {material.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-black/60 text-white border-none">
                      {material.category}
                    </Badge>
                  </div>
                </div>

                {/* Material Info */}
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {material.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {material.description || 'No description available'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Supplier Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4" />
                    <span className="font-medium">{material.supplier?.company_name}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        KES {material.unit_price.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        per {material.unit}
                      </div>
                    </div>
                    {material.supplier?.rating > 0 && (
                      <Badge variant="outline" className="bg-yellow-50">
                        ⭐ {material.supplier.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {/* Actions - Mobile Friendly Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Professional Builders: Request Quote */}
                    {userRole === 'builder' || userRole === 'professional_builder' ? (
                      <Button 
                        className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
                        onClick={() => handleRequestQuote(material)}
                        disabled={!material.in_stock}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Request Quote
                      </Button>
                    ) : userRole === 'private_client' ? (
                      /* Private Clients: Purchase Directly (No quote needed) */
                      <Button 
                        className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 h-12 text-base font-semibold"
                        onClick={() => toast({
                          title: '✅ Adding to Cart',
                          description: `${material.name} from ${material.supplier?.company_name}. Proceed to checkout to complete purchase.`,
                        })}
                        disabled={!material.in_stock}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Buy Now
                      </Button>
                    ) : (
                      /* Not logged in - Redirect to Sign In with return to suppliers */
                      <Button 
                        className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 h-12 text-base font-semibold"
                        onClick={() => {
                          // Save current page to return after login
                          sessionStorage.setItem('returnTo', '/suppliers?tab=purchase');
                          window.location.href = '/auth';
                        }}
                        disabled={!material.in_stock}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Sign In to Purchase
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      onClick={() => toast({
                        title: 'Supplier Info',
                        description: `${material.supplier?.company_name} - ${material.supplier?.location}`
                      })}
                    >
                      <Store className="h-4 w-4" />
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

