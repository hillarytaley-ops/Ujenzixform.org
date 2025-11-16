import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Ultra-safe demo materials - guaranteed to work on iPhone
const SAFE_DEMO_MATERIALS = [
  {
    id: 'demo-1',
    name: 'Bamburi Cement 42.5N',
    category: 'Cement',
    unit_price: 850,
    in_stock: true,
    supplier_name: 'Demo Supplier'
  },
  {
    id: 'demo-2',
    name: 'Y12 Steel Bars',
    category: 'Steel',
    unit_price: 950,
    in_stock: true,
    supplier_name: 'Demo Supplier'
  },
  {
    id: 'demo-3',
    name: 'Floor Tiles',
    category: 'Tiles',
    unit_price: 2800,
    in_stock: true,
    supplier_name: 'Demo Supplier'
  },
  {
    id: 'demo-4',
    name: 'Crown Paint 20L',
    category: 'Paint',
    unit_price: 4800,
    in_stock: true,
    supplier_name: 'Demo Supplier'
  },
  {
    id: 'demo-5',
    name: 'Mabati Iron Sheets',
    category: 'Iron Sheets',
    unit_price: 1350,
    in_stock: true,
    supplier_name: 'Demo Supplier'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <Card key={material.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {material.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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

