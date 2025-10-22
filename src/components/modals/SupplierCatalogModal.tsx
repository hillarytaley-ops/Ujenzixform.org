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
  
  // Mock catalog data
  const catalogItems: CatalogItem[] = [
    {
      id: "1",
      name: "Ordinary Portland Cement",
      category: "Cement",
      price: 850,
      unit: "50kg bag",
      description: "High-quality cement suitable for all construction purposes",
      inStock: true,
      rating: 4.5
    },
    {
      id: "2", 
      name: "Steel Reinforcement Bars (12mm)",
      category: "Steel",
      price: 65,
      unit: "per meter",
      description: "Grade 60 deformed steel bars for concrete reinforcement",
      inStock: true,
      rating: 4.8
    },
    {
      id: "3",
      name: "Ceramic Floor Tiles (60x60)",
      category: "Tiles",
      price: 2500,
      unit: "per sqm",
      description: "Premium glazed ceramic tiles, slip-resistant",
      inStock: false,
      rating: 4.3
    },
    {
      id: "4",
      name: "River Sand (Fine)",
      category: "Aggregates",
      price: 3200,
      unit: "per tonne",
      description: "Washed fine river sand for construction and plastering",
      inStock: true,
      rating: 4.2
    },
    {
      id: "5",
      name: "Corrugated Iron Sheets (3m)",
      category: "Roofing",
      price: 1250,
      unit: "per sheet",
      description: "Galvanized iron sheets, gauge 30, 3-meter length",
      inStock: true,
      rating: 4.6
    },
    {
      id: "6",
      name: "Emulsion Paint (20L)",
      category: "Paint",
      price: 4800,
      unit: "20L bucket",
      description: "Premium quality wall paint, multiple colors available",
      inStock: true,
      rating: 4.4
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
          {/* Contact Information Security Notice */}
          {!isAuthenticated && (
            <div className="bg-muted border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">🔒 Supplier Contact Information Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact details are protected under business verification policies. 
                    Sign in and establish a business relationship to access full contact information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Secure Contact Display */}
          {isAuthenticated && (
            <SecureContactDisplay
              supplier={supplier}
              userRole={userRole}
              onRequestContact={handleContactRequest}
              className="mb-6"
            />
          )}

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
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
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
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground" />
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