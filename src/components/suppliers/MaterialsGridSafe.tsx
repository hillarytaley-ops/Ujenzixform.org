import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

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
                <div className="space-y-2">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

