import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search, Filter, Download, Eye, Calendar, MapPin, CreditCard, ShoppingCart } from "lucide-react";

interface MaterialEntry {
  id: string;
  material_type: string;
  quantity: number;
  unit: string;
  supplier_name: string;
  delivery_date: string;
  status: string;
  location: string;
  batch_number?: string;
  expiry_date?: string;
  condition: string;
  received_by: string;
  notes?: string;
  price?: number;
  available_for_purchase?: boolean;
}

const SiteMaterialRegister = () => {
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUserProfile();
    fetchMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [materials, searchTerm, statusFilter, materialTypeFilter]);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name')
          .eq('user_id', user.id)
          .single();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      // For now, we'll use mock data since the actual table structure might need to be created
      // This would be replaced with actual Supabase queries once the database structure is established
      const mockMaterials: MaterialEntry[] = [
        {
          id: "1",
          material_type: "Cement",
          quantity: 50,
          unit: "bags",
          supplier_name: "BuildMax Supplies",
          delivery_date: "2024-01-15",
          status: "available",
          location: "Warehouse A - Bay 1",
          batch_number: "CM2024001",
          condition: "good",
          received_by: "John Smith",
          notes: "Good quality cement, stored properly",
          price: 800,
          available_for_purchase: true
        },
        {
          id: "2",
          material_type: "Steel Bars",
          quantity: 100,
          unit: "pieces",
          supplier_name: "Steel Works Ltd",
          delivery_date: "2024-01-14",
          status: "available",
          location: "Site Storage - Section B",
          batch_number: "SB2024002",
          condition: "good",
          received_by: "Mike Johnson",
          notes: "12mm steel bars, grade 60",
          price: 1200,
          available_for_purchase: true
        },
        {
          id: "3",
          material_type: "Concrete Blocks",
          quantity: 500,
          unit: "pieces",
          supplier_name: "Block Masters",
          delivery_date: "2024-01-13",
          status: "available",
          location: "Yard Area C",
          batch_number: "CB2024003",
          condition: "good",
          received_by: "Sarah Wilson",
          notes: "Standard concrete blocks",
          price: 50,
          available_for_purchase: true
        },
        {
          id: "4",
          material_type: "Sand",
          quantity: 10,
          unit: "cubic_meters",
          supplier_name: "Desert Sands Co",
          delivery_date: "2024-01-12",
          status: "available",
          location: "Material Yard - North",
          condition: "good",
          received_by: "Tom Brown",
          notes: "Fine sand for concrete mixing",
          price: 2500,
          available_for_purchase: true
        }
      ];

      setMaterials(mockMaterials);
    } catch (error: any) {
      toast({
        title: "Error Loading Materials",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    let filtered = materials;

    if (searchTerm) {
      filtered = filtered.filter(material =>
        material.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(material => material.status === statusFilter);
    }

    if (materialTypeFilter !== "all") {
      filtered = filtered.filter(material => material.material_type === materialTypeFilter);
    }

    setFilteredMaterials(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "received":
        return "secondary";
      case "in_use":
        return "default";
      case "damaged":
        return "destructive";
      case "expired":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getConditionBadgeVariant = (condition: string) => {
    switch (condition) {
      case "good":
        return "secondary";
      case "damaged":
        return "destructive";
      case "expired":
        return "outline";
      default:
        return "secondary";
    }
  };

  const isIndividualBuilder = userProfile && 
    userProfile.role === 'builder' && 
    !userProfile.is_professional && 
    userProfile.user_type !== 'company';

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const getSelectedItemsTotal = () => {
    const selectedMaterials = materials.filter(m => selectedItems.includes(m.id));
    return selectedMaterials.reduce((total, material) => total + (material.price || 0), 0);
  };

  const handleProceedToPayment = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to purchase before proceeding to payment.",
        variant: "destructive",
      });
      return;
    }
    setShowPaymentSection(true);
  };

  const exportToCSV = () => {
    const headers = [
      "Material Type", "Quantity", "Unit", "Supplier", "Delivery Date", 
      "Status", "Location", "Batch Number", "Condition", "Received By", "Notes"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredMaterials.map(material => [
        material.material_type,
        material.quantity,
        material.unit,
        material.supplier_name,
        material.delivery_date,
        material.status,
        material.location,
        material.batch_number || "",
        material.condition,
        material.received_by,
        material.notes || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-material-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Material register has been exported to CSV."
    });
  };

  const uniqueMaterialTypes = Array.from(new Set(materials.map(m => m.material_type)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">Loading material register...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Site Material Register</CardTitle>
                <CardDescription>
                  Track and manage all materials received on site
                </CardDescription>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by material, supplier, batch number, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {uniqueMaterialTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Material Register Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
               <TableRow>
                 <TableHead></TableHead>
                 <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Received By</TableHead>
                 <TableHead>Actions</TableHead>
                 {isIndividualBuilder && <TableHead>Price</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={isIndividualBuilder ? 12 : 11} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <p>No materials found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                   filteredMaterials.map((material) => (
                     <TableRow key={material.id}>
                       <TableCell>
                         {isIndividualBuilder && material.available_for_purchase && (
                           <Checkbox
                             checked={selectedItems.includes(material.id)}
                             onCheckedChange={(checked) => handleItemSelection(material.id, checked as boolean)}
                           />
                         )}
                       </TableCell>
                      <TableCell className="font-medium">
                        {material.material_type}
                      </TableCell>
                      <TableCell>
                        {material.quantity} {material.unit}
                      </TableCell>
                      <TableCell>{material.supplier_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(material.delivery_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(material.status)}>
                          {material.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getConditionBadgeVariant(material.condition)}>
                          {material.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{material.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {material.batch_number || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {material.received_by}
                      </TableCell>
                       <TableCell>
                         <Button variant="ghost" size="sm">
                           <Eye className="h-4 w-4" />
                         </Button>
                       </TableCell>
                       {isIndividualBuilder && (
                         <TableCell className="font-medium">
                           {material.price ? `KSh ${material.price.toLocaleString()}` : 'N/A'}
                         </TableCell>
                       )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Individual Builder Purchase Section */}
          {isIndividualBuilder && selectedItems.length > 0 && (
            <Card className="mt-6 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Selected Items for Purchase
                </CardTitle>
                <CardDescription>
                  Review your selected items and proceed to payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    {materials
                      .filter(m => selectedItems.includes(m.id))
                      .map(material => (
                        <div key={material.id} className="flex justify-between items-center py-2">
                          <div>
                            <span className="font-medium">{material.material_type}</span>
                            <span className="text-muted-foreground ml-2">
                              ({material.quantity} {material.unit})
                            </span>
                          </div>
                          <span className="font-medium">
                            KSh {material.price?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span>KSh {getSelectedItemsTotal().toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleProceedToPayment}
                      className="flex-1"
                      size="lg"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedItems([])}
                      size="lg"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Section */}
          {showPaymentSection && isIndividualBuilder && (
            <Card className="mt-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CreditCard className="h-5 w-5" />
                  Payment Processing
                </CardTitle>
                <CardDescription className="text-green-700">
                  Complete your payment for the selected items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Payment Options</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose your preferred payment method for KSh {getSelectedItemsTotal().toLocaleString()}
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        Bank Transfer
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Mobile Banking (M-Pesa, Airtel Money)
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Cash Payment
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      className="flex-1" 
                      size="lg"
                      onClick={() => {
                        toast({
                          title: "Payment Initiated",
                          description: "Your payment is being processed. You will receive a confirmation shortly.",
                        });
                        setShowPaymentSection(false);
                        setSelectedItems([]);
                      }}
                    >
                      Complete Payment
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPaymentSection(false)}
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">
                {materials.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {materials.filter(m => m.status === 'received').length}
              </div>
              <div className="text-sm text-muted-foreground">Received</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {materials.filter(m => m.status === 'in_use').length}
              </div>
              <div className="text-sm text-muted-foreground">In Use</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {materials.filter(m => m.status === 'damaged').length}
              </div>
              <div className="text-sm text-muted-foreground">Damaged</div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteMaterialRegister;