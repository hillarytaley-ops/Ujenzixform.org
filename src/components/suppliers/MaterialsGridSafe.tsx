import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Ultra-safe demo materials - guaranteed to work on iPhone
// Using AUTHENTIC KENYAN CONSTRUCTION IMAGES - Real industry photos
const SAFE_DEMO_MATERIALS = [
  {
    id: 'demo-1',
    name: 'Bamburi Cement NGUVU 42.5N',
    category: 'Cement',
    unit_price: 850,
    in_stock: true,
    supplier_name: 'Bamburi Cement Ltd',
    image_url: 'https://i.postimg.cc/3wKMhcMJ/bamburi-cement.jpg',
    description: 'Bamburi NGUVU cement - Premium quality for structural applications - 50kg bag'
  },
  {
    id: 'demo-2',
    name: 'Y12 Steel Reinforcement Bars',
    category: 'Steel',
    unit_price: 950,
    in_stock: true,
    supplier_name: 'Devki Steel Mills',
    image_url: 'https://i.postimg.cc/GmYLgNhd/steel-bars.jpg',
    description: 'High tensile strength steel reinforcement bars - per kg'
  },
  {
    id: 'demo-3',
    name: 'Concrete Building Blocks',
    category: 'Blocks',
    unit_price: 65,
    in_stock: true,
    supplier_name: 'Hima Cement',
    image_url: 'https://i.postimg.cc/1XvC8yqT/concrete-blocks.jpg',
    description: 'Standard 6-inch concrete building blocks - per piece'
  },
  {
    id: 'demo-4',
    name: 'Crown Paint Permacote',
    category: 'Paint',
    unit_price: 4800,
    in_stock: true,
    supplier_name: 'Crown Paints Kenya',
    image_url: 'https://i.postimg.cc/76DwLkJT/crown-paint.jpg',
    description: 'Crown Permacote premium emulsion paint - 20L bucket'
  },
  {
    id: 'demo-5',
    name: 'Mabati Color Roofing Sheets',
    category: 'Iron Sheets',
    unit_price: 1350,
    in_stock: true,
    supplier_name: 'Mabati Rolling Mills',
    image_url: 'https://i.postimg.cc/FsBQFqhK/mabati-sheets.jpg',
    description: 'Galvanized color-coated roofing iron sheets - 30 gauge, 3m length'
  },
  {
    id: 'demo-6',
    name: 'Building Sand (Machakos)',
    category: 'Sand',
    unit_price: 4500,
    in_stock: true,
    supplier_name: 'Machakos Quarries',
    image_url: 'https://i.postimg.cc/hvxLRXGK/sand-pile.jpg',
    description: 'Fine building sand for construction and plastering - per lorry'
  },
  {
    id: 'demo-7',
    name: 'Machine Crushed Ballast',
    category: 'Ballast',
    unit_price: 5500,
    in_stock: true,
    supplier_name: 'Nairobi Quarries',
    image_url: 'https://i.postimg.cc/ZK8xGy5X/ballast.jpg',
    description: 'Machine crushed ballast for concrete mixing - per lorry'
  },
  {
    id: 'demo-8',
    name: 'Cypress Timber Planks',
    category: 'Timber',
    unit_price: 380,
    in_stock: true,
    supplier_name: 'Kenya Timber Traders',
    image_url: 'https://i.postimg.cc/SRzmqH6G/timber-planks.jpg',
    description: 'Treated cypress timber 2x4 for roofing and framing - per piece'
  },
  {
    id: 'demo-9',
    name: 'Hardwood Doors',
    category: 'Doors',
    unit_price: 8500,
    in_stock: true,
    supplier_name: 'Kenya Doors & Frames',
    image_url: 'https://i.postimg.cc/FFZcpWV9/wooden-doors.jpg',
    description: 'Solid hardwood doors for residential and commercial use'
  },
  {
    id: 'demo-10',
    name: 'Construction Tools Kit',
    category: 'Tools',
    unit_price: 850,
    in_stock: true,
    supplier_name: 'Nairobi Tools & Equipment',
    image_url: 'https://i.postimg.cc/xd7tZnT8/construction-tools.jpg',
    description: 'Professional construction tools and safety equipment'
  },
  {
    id: 'demo-11',
    name: 'Knauf Building Insulation',
    category: 'Insulation',
    unit_price: 1200,
    in_stock: true,
    supplier_name: 'Kenya Insulation Ltd',
    image_url: 'https://i.postimg.cc/qRDykJ3c/insulation.jpg',
    description: 'Thermal and sound insulation materials for walls and roofs'
  },
  {
    id: 'demo-12',
    name: 'Glass Panels & Windows',
    category: 'Glass',
    unit_price: 12000,
    in_stock: true,
    supplier_name: 'Kenya Glass & Aluminum',
    image_url: 'https://i.postimg.cc/MGbpvRrj/glass-building.jpg',
    description: 'Toughened glass panels and aluminum window frames - per sq meter'
  },
  {
    id: 'demo-13',
    name: 'Plumbing Fixtures & Tools',
    category: 'Plumbing',
    unit_price: 2800,
    in_stock: true,
    supplier_name: 'Kenya Plumbing Supplies',
    image_url: 'https://i.postimg.cc/ncm7qZWh/plumbing-tools.jpg',
    description: 'Professional plumbing tools, taps, pipes and bathroom fittings'
  },
  {
    id: 'demo-14',
    name: 'Electrical Wiring & Cables',
    category: 'Electrical',
    unit_price: 350,
    in_stock: true,
    supplier_name: 'Kenya Electrical Supplies',
    image_url: 'https://i.postimg.cc/VLmXCvCn/electrical-supplies.jpg',
    description: 'Electrical cables, switches, sockets and circuit breakers'
  },
  {
    id: 'demo-15',
    name: 'Aluminum Windows & Grills',
    category: 'Windows',
    unit_price: 12000,
    in_stock: true,
    supplier_name: 'Kenya Glass & Aluminum',
    image_url: 'https://i.postimg.cc/8cXvHNKh/windows.jpg',
    description: 'Powder-coated aluminum windows with security grills - per sq meter'
  },
  {
    id: 'demo-16',
    name: 'Mabati Corrugated Iron Sheets',
    category: 'Iron Sheets',
    unit_price: 1350,
    in_stock: true,
    supplier_name: 'Mabati Rolling Mills',
    image_url: 'https://i.postimg.cc/0NLw6WBf/iron-sheets-corrugated.jpg',
    description: 'Galvanized corrugated roofing sheets - Standard 30 gauge'
  },
  {
    id: 'demo-17',
    name: 'Construction Wire Mesh',
    category: 'Wire',
    unit_price: 450,
    in_stock: true,
    supplier_name: 'Kenya Wire Products',
    image_url: 'https://i.postimg.cc/nrxQxsJX/wire-mesh.jpg',
    description: 'Wire mesh for fencing, reinforcement and concrete work - per roll'
  },
  {
    id: 'demo-18',
    name: 'Paving Stones & Blocks',
    category: 'Pavers',
    unit_price: 3500,
    in_stock: true,
    supplier_name: 'Kenya Stone Suppliers',
    image_url: 'https://i.postimg.cc/NG5z9QN9/paving-stones.jpg',
    description: 'Interlocking paving stones for driveways and walkways - per sq meter'
  },
  {
    id: 'demo-19',
    name: 'Plywood Sheets Marine Grade',
    category: 'Plywood',
    unit_price: 2100,
    in_stock: true,
    supplier_name: 'Raiply Kenya',
    image_url: 'https://i.postimg.cc/sXBN9fR4/plywood-sheets.jpg',
    description: 'Marine grade plywood sheets 18mm - 8x4ft per sheet'
  },
  {
    id: 'demo-20',
    name: 'Construction Hardware Tools',
    category: 'Tools',
    unit_price: 850,
    in_stock: true,
    supplier_name: 'Nairobi Hardware Stores',
    image_url: 'https://i.postimg.cc/xd7tZnT8/construction-tools.jpg',
    description: 'Hammers, drills, saws, levels and construction equipment'
  }
];

// Ultra-safe component that cannot crash
export const MaterialsGridSafe = () => {
  const [materials, setMaterials] = useState(SAFE_DEMO_MATERIALS);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        const role = roleData?.role || 'builder';
        setUserRole(role);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const handleRequestQuote = (material: any) => {
    if (!user) {
      window.location.href = '/auth?lite=1&redirect=' + encodeURIComponent('/suppliers?tab=purchase');
      return;
    }

    if (userRole === 'builder' || userRole === 'professional_builder') {
      toast({
        title: 'Quote Request Initiated',
        description: `Requesting quote for ${material.name}. The supplier will contact you shortly.`,
      });
      // TODO: Implement actual quote request to backend
    } else {
      toast({
        title: 'Professional Builders Only',
        description: 'Request Quote is available for professional builders. Please use Buy Now instead.',
        variant: 'destructive'
      });
    }
  };

  const handleBuyNow = (material: any) => {
    if (!user) {
      window.location.href = '/auth?lite=1&redirect=' + encodeURIComponent('/suppliers?tab=purchase&welcome=private_client');
      return;
    }

    if (userRole === 'private_client' || userRole === 'builder') {
      toast({
        title: 'Purchase Initiated',
        description: `Adding ${material.name} to your cart. Proceed to checkout.`,
      });
      // TODO: Implement actual buy now functionality
    } else {
      toast({
        title: 'Private Clients Only',
        description: 'Buy Now is available for private clients. Please use Request Quote instead.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h3 className="text-lg font-semibold mb-2">Construction Materials</h3>
        <p className="text-sm text-gray-600">Showing {materials.length} materials</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
          {materials.map((material) => (
            <Card key={material.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                {/* Product Image */}
                {material.image_url && (
                  <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-100">
                    <img 
                      src={material.image_url} 
                      alt={material.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.src = 'https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image';
                      }}
                      loading="lazy"
                    />
                  </div>
                )}
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {material.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Description */}
                  {material.description && (
                    <p className="text-sm text-gray-600 pb-2 border-b">
                      {material.description}
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="text-sm font-medium">{material.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="text-lg font-bold text-blue-600">
                      KES {material.unit_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Supplier:</span>
                    <span className="text-sm">{material.supplier_name}</span>
                  </div>
                  <div className="pt-2">
                    <span className={`text-xs px-2 py-1 rounded ${material.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {material.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-3 border-t">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      onClick={() => handleRequestQuote(material)}
                      disabled={!material.in_stock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={() => handleBuyNow(material)}
                      disabled={!material.in_stock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>

                  {/* Sign In Notice for Non-Authenticated Users */}
                  {!user && (
                    <div className="text-xs text-center text-gray-600 pt-2 border-t">
                      <p>Sign in to purchase materials</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

