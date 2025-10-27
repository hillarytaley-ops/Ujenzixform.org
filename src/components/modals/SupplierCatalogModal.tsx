import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Star, ShoppingCart, X, Filter, Shield, Lock } from "lucide-react";
import { Supplier } from "@/types/supplier";
import { SecureContactDisplay } from "@/components/suppliers/SecureContactDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/userProfile";

interface SupplierCatalogModalProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  onRequestQuote: (supplier: Supplier) => void;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  inStock: boolean;
  rating: number;
  image?: string;
}

export const SupplierCatalogModal = ({ supplier, isOpen, onClose, onRequestQuote }: SupplierCatalogModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  
  // Check authentication status and user role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          setUserRole((roleData?.role as UserRole) || null);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  // Secure contact request handler
  const handleContactRequest = async (supplierId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request supplier contact information.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Contact Request Submitted",
      description: "Your request for supplier contact information has been logged for verification.",
    });
  };
  
  // Kenyan construction materials catalog with authentic local market images
  const catalogItems: CatalogItem[] = [
    {
      id: "1",
      name: "Bamburi Cement 42.5N (50kg)",
      category: "Cement",
      price: 850,
      unit: "50kg bag",
      description: "Premium Portland cement from Bamburi - Kenya's most trusted cement brand for foundations, slabs, and structural work",
      inStock: true,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1618491994992-2f6d7105d8b2?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "2", 
      name: "Y12 Deformed Steel Bars (6m)",
      category: "Steel",
      price: 950,
      unit: "per bar",
      description: "High tensile deformed bars (Y12 - 12mm diameter) for concrete reinforcement - KEBS approved, 6-meter length",
      inStock: true,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1565084888279-aca607ecce8c?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "3",
      name: "Vitrified Floor Tiles 600x600mm",
      category: "Tiles",
      price: 2800,
      unit: "per sqm",
      description: "Premium imported vitrified porcelain tiles - high gloss finish, stain resistant, suitable for high traffic areas",
      inStock: true,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "4",
      name: "Machakos Building Stones",
      category: "Aggregates",
      price: 3500,
      unit: "per tonne",
      description: "High-quality ballast and building stones from Machakos quarries - graded for concrete mixing and construction",
      inStock: true,
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "5",
      name: "Mabati Iron Sheets Gauge 28 (3m)",
      category: "Roofing",
      price: 1350,
      unit: "per sheet",
      description: "Mabati box profile corrugated iron sheets - galvanized steel, gauge 28, 3-meter length, 25-year warranty",
      inStock: true,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "6",
      name: "Crown Emulsion Paint 20L",
      category: "Paint",
      price: 4800,
      unit: "20L bucket",
      description: "Crown Paints premium acrylic emulsion - smooth matt finish, washable, covers 140-160 sqm, available in 1000+ colors",
      inStock: true,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "7",
      name: "Hima Cement Pozzolana (50kg)",
      category: "Cement",
      price: 780,
      unit: "50kg bag",
      description: "Eco-friendly pozzolana cement blend - ideal for mass concreting, plasters, and general construction in Kenya",
      inStock: true,
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1618491994992-2f6d7105d8b2?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "8",
      name: "Machine Cut Building Stones",
      category: "Aggregates",
      price: 4200,
      unit: "per tonne",
      description: "Machakos machine-cut stones (20mm, 40mm, 60mm) - graded aggregates for concrete work and construction",
      inStock: true,
      rating: 4.4,
      image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "9",
      name: "Versalite Roofing Tiles",
      category: "Roofing",
      price: 850,
      unit: "per tile",
      description: "Premium concrete roofing tiles from Versalite Kenya - interlocking design, 50-year lifespan, multiple colors",
      inStock: true,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1604762512592-3d83f6543bde?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "10",
      name: "Treated Cypress Timber 4x2 (12ft)",
      category: "Timber",
      price: 850,
      unit: "per piece",
      description: "Pressure-treated cypress timber - 4x2 inches, 12 feet length, termite and borer resistant, ideal for roofing",
      inStock: true,
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "11",
      name: "Kenpipe PVC Pipes 4-inch",
      category: "Plumbing",
      price: 1200,
      unit: "per 6m length",
      description: "KenPipe pressure PVC pipes - 4-inch diameter, 6-meter length, KEBS approved for water supply systems",
      inStock: true,
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "12",
      name: "Concrete Hollow Blocks 6-inch",
      category: "Blocks",
      price: 65,
      unit: "per block",
      description: "Standard 6-inch concrete hollow blocks - 450x225x150mm, high compressive strength, ideal for wall construction",
      inStock: true,
      rating: 4.3,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "13",
      name: "Nyayo Electrical Cables 2.5mm",
      category: "Electrical",
      price: 2800,
      unit: "per 100m roll",
      description: "Nyayo twin & earth electrical cables - 2.5mm² copper conductor, PVC insulated, KEBS certified for house wiring",
      inStock: true,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1591696331296-6174cd5e31c9?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "14",
      name: "Simba Cement Paving Blocks",
      category: "Blocks",
      price: 85,
      unit: "per block",
      description: "Interlocking concrete paving blocks - 200x100x60mm, various colors, ideal for driveways, walkways, and parking",
      inStock: true,
      rating: 4.4,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&q=85"
    },
    {
      id: "15",
      name: "Meru Oak Hardwood Timber 6x2",
      category: "Timber",
      price: 1850,
      unit: "per piece",
      description: "Natural Meru Oak hardwood - 6x2 inches, 12 feet, seasoned and treated, perfect for door frames and heavy-duty applications",
      inStock: true,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1601596846439-ea13e8c0ca59?w=500&h=500&fit=crop&q=85"
    }
  ];

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesPrice = priceFilter === "all" || 
                        (priceFilter === "under-1000" && item.price < 1000) ||
                        (priceFilter === "1000-3000" && item.price >= 1000 && item.price <= 3000) ||
                        (priceFilter === "over-3000" && item.price > 3000);
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const categories = ["all", ...new Set(catalogItems.map(item => item.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{supplier.company_name}</h2>
            <p className="text-muted-foreground">Product Catalog</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.filter(cat => cat !== "all").map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-1000">Under KSh 1,000</SelectItem>
                <SelectItem value="1000-3000">KSh 1,000 - 3,000</SelectItem>
                <SelectItem value="over-3000">Over KSh 3,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="grid" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <div className="text-sm text-muted-foreground">
                {filteredItems.length} of {catalogItems.length} products
              </div>
            </div>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                          {!item.inStock && (
                            <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {item.rating}
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <div className="font-semibold">KSh {item.price.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">per {item.unit}</div>
                          </div>
                          <Button size="sm" variant="outline" disabled={!item.inStock}>
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium">{item.name}</h3>
                            {!item.inStock && (
                              <Badge variant="secondary">Out of Stock</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <Badge variant="outline">{item.category}</Badge>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {item.rating}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-lg">KSh {item.price.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">per {item.unit}</div>
                          <Button size="sm" className="mt-2" disabled={!item.inStock}>
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Add to Quote
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close Catalog
            </Button>
            <Button onClick={() => onRequestQuote(supplier)} className="flex-1">
              Request Custom Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};