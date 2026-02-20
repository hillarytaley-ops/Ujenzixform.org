/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📊 ENHANCED PRICE COMPARISON TABLE                                                 ║
 * ║                                                                                      ║
 * ║   Shows materials across multiple suppliers in a matrix format                       ║
 * ║   - Rows: Materials                                                                  ║
 * ║   - Columns: Suppliers                                                               ║
 * ║   - Totals per supplier at the bottom                                                ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: February 20, 2026                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, 
  Store, 
  Star, 
  ShoppingCart, 
  X,
  Check,
  Trophy,
  ArrowRight,
  TrendingDown,
  Package,
  Building2
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  description?: string;
  image_url?: string;
  in_stock: boolean;
  supplier_id?: string;
  supplier?: {
    company_name: string;
    location?: string;
    rating?: number;
  };
}

interface PriceComparisonTableProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: Material[];
  allMaterials: Material[];
}

interface SupplierData {
  id: string;
  name: string;
  rating?: number;
  location?: string;
  materials: Map<string, Material>; // materialName -> material with price
  total: number;
  itemCount: number;
}

export const PriceComparisonTable: React.FC<PriceComparisonTableProps> = ({
  isOpen,
  onClose,
  selectedMaterials,
  allMaterials
}) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  // Process data to create supplier-based comparison
  const { suppliers, materialNames, cheapestSupplier, savings } = useMemo(() => {
    const suppliersMap = new Map<string, SupplierData>();
    const materialNamesSet = new Set<string>();

    // Group selected materials by supplier
    selectedMaterials.forEach(material => {
      const supplierId = material.supplier_id || 'unknown';
      const supplierName = material.supplier?.company_name || 'UjenziXform Catalog';
      
      materialNamesSet.add(material.name);

      if (!suppliersMap.has(supplierId)) {
        suppliersMap.set(supplierId, {
          id: supplierId,
          name: supplierName,
          rating: material.supplier?.rating,
          location: material.supplier?.location,
          materials: new Map(),
          total: 0,
          itemCount: 0
        });
      }

      const supplierData = suppliersMap.get(supplierId)!;
      supplierData.materials.set(material.name, material);
      supplierData.total += material.unit_price;
      supplierData.itemCount += 1;
    });

    // Also check all materials for same products from different suppliers
    const selectedNames = Array.from(materialNamesSet);
    allMaterials.forEach(material => {
      if (selectedNames.some(name => 
        material.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(material.name.toLowerCase())
      )) {
        const supplierId = material.supplier_id || 'unknown';
        const supplierName = material.supplier?.company_name || 'UjenziXform Catalog';
        
        if (!suppliersMap.has(supplierId)) {
          suppliersMap.set(supplierId, {
            id: supplierId,
            name: supplierName,
            rating: material.supplier?.rating,
            location: material.supplier?.location,
            materials: new Map(),
            total: 0,
            itemCount: 0
          });
        }

        const supplierData = suppliersMap.get(supplierId)!;
        // Only add if we don't already have this material from this supplier
        if (!supplierData.materials.has(material.name)) {
          // Check if this material name is similar to any selected material
          const matchingName = selectedNames.find(name => 
            material.name.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(material.name.toLowerCase())
          );
          if (matchingName) {
            supplierData.materials.set(matchingName, material);
            supplierData.total += material.unit_price;
            supplierData.itemCount += 1;
          }
        }
      }
    });

    const suppliersArray = Array.from(suppliersMap.values());
    const materialNamesArray = Array.from(materialNamesSet);

    // Find cheapest supplier (only those with all materials)
    const fullSuppliers = suppliersArray.filter(s => s.itemCount >= materialNamesArray.length);
    const cheapest = fullSuppliers.length > 0 
      ? fullSuppliers.reduce((a, b) => a.total < b.total ? a : b)
      : suppliersArray.length > 0 
        ? suppliersArray.reduce((a, b) => a.total < b.total ? a : b)
        : null;

    const mostExpensive = suppliersArray.length > 0 
      ? suppliersArray.reduce((a, b) => a.total > b.total ? a : b)
      : null;

    const totalSavings = cheapest && mostExpensive 
      ? mostExpensive.total - cheapest.total 
      : 0;

    return {
      suppliers: suppliersArray.sort((a, b) => a.total - b.total),
      materialNames: materialNamesArray,
      cheapestSupplier: cheapest,
      savings: totalSavings
    };
  }, [selectedMaterials, allMaterials]);

  const handleAddAllFromSupplier = (supplier: SupplierData) => {
    supplier.materials.forEach((material) => {
      addToCart({
        id: material.id,
        name: material.name,
        category: material.category,
        unit: material.unit,
        unit_price: material.unit_price,
        image_url: material.image_url,
        supplier_name: material.supplier?.company_name || 'UjenziXform Catalog',
        supplier_id: material.supplier_id
      }, 1);
    });
    
    toast({
      title: '✅ Added to Cart!',
      description: `${supplier.itemCount} items from ${supplier.name} added to cart`,
    });
    onClose();
  };

  const handleAddSingleItem = (material: Material) => {
    addToCart({
      id: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      unit_price: material.unit_price,
      image_url: material.image_url,
      supplier_name: material.supplier?.company_name || 'UjenziXform Catalog',
      supplier_id: material.supplier_id
    }, 1);
    
    toast({
      title: '✅ Added to Cart!',
      description: `${material.name} at KES ${material.unit_price.toLocaleString()}`,
    });
  };

  // Find cheapest price for each material across all suppliers
  const getCheapestPriceForMaterial = (materialName: string): number => {
    let cheapest = Infinity;
    suppliers.forEach(supplier => {
      const material = supplier.materials.get(materialName);
      if (material && material.unit_price < cheapest) {
        cheapest = material.unit_price;
      }
    });
    return cheapest === Infinity ? 0 : cheapest;
  };

  if (selectedMaterials.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogDescription className="sr-only">
          Compare prices from different suppliers for selected materials in a table format
        </DialogDescription>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Price Comparison Matrix
                </DialogTitle>
                <p className="text-white/80 text-sm mt-0.5">
                  {materialNames.length} materials across {suppliers.length} suppliers
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Best Deal Banner */}
        {cheapestSupplier && savings > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white p-2.5 rounded-full">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-lg">Best Deal: {cheapestSupplier.name}</p>
                  <p className="text-sm text-green-700">
                    Total: <span className="font-bold">KES {cheapestSupplier.total.toLocaleString()}</span>
                    {' · '}Save up to <span className="font-bold text-green-600">KES {savings.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700 shadow-lg"
                onClick={() => handleAddAllFromSupplier(cheapestSupplier)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy All from {cheapestSupplier.name}
              </Button>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="overflow-auto max-h-[calc(90vh-250px)]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100">
                <th className="text-left p-4 font-semibold text-gray-700 border-b-2 border-gray-200 min-w-[200px] bg-gray-100">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    Material
                  </div>
                </th>
                {suppliers.map((supplier, idx) => {
                  const isCheapest = cheapestSupplier?.id === supplier.id;
                  return (
                    <th 
                      key={supplier.id} 
                      className={`text-center p-4 font-semibold border-b-2 min-w-[180px] ${
                        isCheapest 
                          ? 'bg-green-100 border-green-300 text-green-800' 
                          : 'bg-gray-100 border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <Building2 className={`h-4 w-4 ${isCheapest ? 'text-green-600' : 'text-gray-500'}`} />
                          <span className="truncate max-w-[120px]">{supplier.name}</span>
                          {isCheapest && (
                            <Badge className="bg-green-500 text-[10px] px-1.5">BEST</Badge>
                          )}
                        </div>
                        {supplier.rating && (
                          <div className="flex items-center gap-1 text-yellow-600 text-xs">
                            <Star className="h-3 w-3 fill-current" />
                            {supplier.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {materialNames.map((materialName, rowIdx) => {
                const cheapestPrice = getCheapestPriceForMaterial(materialName);
                
                return (
                  <tr 
                    key={materialName} 
                    className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/50 transition-colors`}
                  >
                    {/* Material Name */}
                    <td className="p-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{materialName}</p>
                          <p className="text-xs text-gray-500">
                            Best price: KES {cheapestPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Price cells for each supplier */}
                    {suppliers.map((supplier) => {
                      const material = supplier.materials.get(materialName);
                      const isCheapestSupplier = cheapestSupplier?.id === supplier.id;
                      const isCheapestPrice = material && material.unit_price === cheapestPrice;
                      
                      return (
                        <td 
                          key={`${materialName}-${supplier.id}`}
                          className={`p-4 border-b text-center ${
                            isCheapestSupplier ? 'bg-green-50/50 border-green-200' : 'border-gray-200'
                          }`}
                        >
                          {material ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-1">
                                {isCheapestPrice && (
                                  <TrendingDown className="h-4 w-4 text-green-500" />
                                )}
                                <span className={`font-bold text-lg ${
                                  isCheapestPrice ? 'text-green-600' : 'text-gray-800'
                                }`}>
                                  KES {material.unit_price.toLocaleString()}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                per {material.unit}
                              </span>
                              <Button
                                size="sm"
                                variant={isCheapestPrice ? "default" : "outline"}
                                className={`text-xs h-7 ${
                                  isCheapestPrice ? 'bg-green-600 hover:bg-green-700' : ''
                                }`}
                                onClick={() => handleAddSingleItem(material)}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">
                              <span className="block">—</span>
                              <span className="text-xs">Not available</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            
            {/* Totals Row */}
            <tfoot className="sticky bottom-0">
              <tr className="bg-gray-800 text-white font-bold">
                <td className="p-4 border-t-2 border-gray-600">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-gray-300" />
                    <span className="text-lg">TOTAL</span>
                  </div>
                </td>
                {suppliers.map((supplier) => {
                  const isCheapest = cheapestSupplier?.id === supplier.id;
                  return (
                    <td 
                      key={`total-${supplier.id}`}
                      className={`p-4 text-center border-t-2 ${
                        isCheapest ? 'bg-green-700 border-green-500' : 'border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-xl ${isCheapest ? 'text-green-100' : 'text-white'}`}>
                          KES {supplier.total.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-300">
                          {supplier.itemCount} item{supplier.itemCount !== 1 ? 's' : ''}
                        </span>
                        {isCheapest && (
                          <Badge className="bg-green-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            LOWEST
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className={`mt-1 ${
                            isCheapest 
                              ? 'bg-white text-green-700 hover:bg-green-50' 
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          onClick={() => handleAddAllFromSupplier(supplier)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Buy All
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span>Green prices indicate the lowest price for that material</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Prices may vary. Contact supplier for bulk discounts.
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
