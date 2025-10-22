import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Search, 
  ShoppingCart, 
  Calculator, 
  FileText, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Plus,
  Send,
  Star,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  estimated_price: number;
  suppliers: MaterialSupplier[];
  specifications?: string;
}

interface MaterialSupplier {
  id: string;
  company_name: string;
  contact_person: string;
  price: number;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  delivery_time: string;
  rating: number;
  verified: boolean;
}

interface MaterialRequest {
  id: string;
  material_id: string;
  material_name: string;
  project_id: string;
  project_name: string;
  quantity: number;
  unit: string;
  budget_per_unit: number;
  total_budget: number;
  specifications: string;
  delivery_location: string;
  required_date: string;
  status: 'draft' | 'sent' | 'quoted' | 'ordered' | 'delivered';
  quotes_received: number;
  best_quote?: number;
}

interface Quote {
  id: string;
  material_request_id: string;
  supplier_id: string;
  supplier_name: string;
  quoted_price: number;
  delivery_time: string;
  validity_period: string;
  terms: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

const materialCategories = [
  "Cement & Concrete",
  "Steel & Reinforcement", 
  "Blocks & Bricks",
  "Roofing Materials",
  "Electrical Supplies",
  "Plumbing Supplies",
  "Paint & Finishes",
  "Hardware & Tools",
  "Timber & Wood",
  "Glass & Windows"
];

export const BuilderMaterialManager: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadMaterialData();
  }, [loadMaterialData]);

  const loadMaterialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual Supabase queries
      const mockMaterials: Material[] = [
        {
          id: 'mat-1',
          name: 'Portland Cement 50kg',
          category: 'Cement & Concrete',
          unit: 'bag',
          estimated_price: 850,
          specifications: 'Grade 42.5, Portland cement conforming to KS EAS 18-1',
          suppliers: [
            {
              id: 'sup-1',
              company_name: 'Bamburi Cement',
              contact_person: 'John Mwangi',
              price: 820,
              availability: 'in_stock',
              delivery_time: '1-2 days',
              rating: 4.8,
              verified: true
            },
            {
              id: 'sup-2',
              company_name: 'ARM Cement',
              contact_person: 'Mary Wanjiku',
              price: 840,
              availability: 'in_stock',
              delivery_time: '2-3 days',
              rating: 4.6,
              verified: true
            }
          ]
        },
        {
          id: 'mat-2',
          name: 'Steel Bars 12mm',
          category: 'Steel & Reinforcement',
          unit: 'piece',
          estimated_price: 1200,
          specifications: 'High tensile deformed bars, Grade 500',
          suppliers: [
            {
              id: 'sup-3',
              company_name: 'Devki Steel Mills',
              contact_person: 'Peter Kamau',
              price: 1180,
              availability: 'in_stock',
              delivery_time: '3-5 days',
              rating: 4.7,
              verified: true
            }
          ]
        }
      ];

      const mockRequests: MaterialRequest[] = [
        {
          id: 'req-1',
          material_id: 'mat-1',
          material_name: 'Portland Cement 50kg',
          project_id: 'proj-1',
          project_name: 'Westlands Commercial Complex',
          quantity: 100,
          unit: 'bags',
          budget_per_unit: 850,
          total_budget: 85000,
          specifications: 'Grade 42.5 Portland cement',
          delivery_location: 'Westlands Construction Site',
          required_date: '2024-10-15T00:00:00Z',
          status: 'quoted',
          quotes_received: 3,
          best_quote: 820
        },
        {
          id: 'req-2',
          material_id: 'mat-2',
          material_name: 'Steel Bars 12mm',
          project_id: 'proj-1',
          project_name: 'Westlands Commercial Complex',
          quantity: 50,
          unit: 'pieces',
          budget_per_unit: 1200,
          total_budget: 60000,
          specifications: 'High tensile deformed bars',
          delivery_location: 'Westlands Construction Site',
          required_date: '2024-10-20T00:00:00Z',
          status: 'sent',
          quotes_received: 1
        }
      ];

      const mockQuotes: Quote[] = [
        {
          id: 'quote-1',
          material_request_id: 'req-1',
          supplier_id: 'sup-1',
          supplier_name: 'Bamburi Cement',
          quoted_price: 820,
          delivery_time: '2 days',
          validity_period: '7 days',
          terms: 'Payment on delivery, 30-day warranty',
          status: 'pending',
          created_at: '2024-10-08T10:00:00Z'
        },
        {
          id: 'quote-2',
          material_request_id: 'req-1',
          supplier_id: 'sup-2',
          supplier_name: 'ARM Cement',
          quoted_price: 840,
          delivery_time: '3 days',
          validity_period: '5 days',
          terms: 'Payment on delivery, quality guarantee',
          status: 'pending',
          created_at: '2024-10-08T11:30:00Z'
        }
      ];

      setMaterials(mockMaterials);
      setRequests(mockRequests);
      setQuotes(mockQuotes);

    } catch (error: unknown) {
      console.error('Error loading material data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load material data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createMaterialRequest = async (materialId: string) => {
    try {
      // Create new material request
      toast({
        title: "Request Created",
        description: "Material request has been created and sent to suppliers",
      });
      
      loadMaterialData();
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to create material request",
        variant: "destructive"
      });
    }
  };

  const acceptQuote = async (quoteId: string) => {
    try {
      // Accept quote and create purchase order
      toast({
        title: "Quote Accepted",
        description: "Quote accepted and purchase order created",
      });
      
      loadMaterialData();
    } catch (error) {
      toast({
        title: "Accept Failed",
        description: "Failed to accept quote",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quoted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ordered': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_stock': return 'bg-green-100 text-green-800 border-green-200';
      case 'limited': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesCategory = filterCategory === 'all' || material.category === filterCategory;
    const matchesSearch = searchQuery === '' || 
      material.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      request.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading materials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Material Management</h1>
          <p className="text-muted-foreground">Source materials, request quotes, and manage procurement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMaterialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog">Material Catalog</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Catalog</CardTitle>
              <CardDescription>Browse available materials and suppliers</CardDescription>
              <div className="flex gap-2">
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {materialCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((material) => (
                  <Card key={material.id} className="border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{material.name}</CardTitle>
                        <Badge variant="outline">{material.category}</Badge>
                      </div>
                      <CardDescription>
                        Estimated: KES {material.estimated_price.toLocaleString()} per {material.unit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {material.specifications && (
                          <div>
                            <Label className="text-sm font-medium">Specifications</Label>
                            <p className="text-sm text-muted-foreground">{material.specifications}</p>
                          </div>
                        )}
                        
                        <div>
                          <Label className="text-sm font-medium">Available Suppliers ({material.suppliers.length})</Label>
                          <div className="space-y-2 mt-2">
                            {material.suppliers.slice(0, 2).map((supplier) => (
                              <div key={supplier.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{supplier.company_name}</span>
                                  {supplier.verified && (
                                    <Badge variant="secondary" className="text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-sm">KES {supplier.price.toLocaleString()}</div>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-current text-yellow-400" />
                                    <span className="text-xs">{supplier.rating}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => createMaterialRequest(material.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Request Quotes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Requests</CardTitle>
              <CardDescription>Track your material quote requests</CardDescription>
              <div className="flex gap-2">
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{request.material_name}</h3>
                        <p className="text-sm text-muted-foreground">{request.project_name}</p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <div className="font-medium">{request.quantity} {request.unit}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <div className="font-medium">KES {request.total_budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Required Date:</span>
                        <div className="font-medium">{format(new Date(request.required_date), 'MMM dd')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quotes:</span>
                        <div className="font-medium">{request.quotes_received}</div>
                      </div>
                    </div>

                    {request.best_quote && (
                      <div className="bg-green-50 p-2 rounded mb-3">
                        <span className="text-sm text-green-800">
                          Best Quote: KES {request.best_quote.toLocaleString()} per {request.unit}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setSelectedRequest(request)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {request.status === 'quoted' && (
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Review Quotes
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Received Quotes</CardTitle>
              <CardDescription>Review and compare supplier quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{quote.supplier_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Request: {requests.find(r => r.id === quote.material_request_id)?.material_name}
                        </p>
                      </div>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Quoted Price:</span>
                        <div className="font-medium">KES {quote.quoted_price.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivery Time:</span>
                        <div className="font-medium">{quote.delivery_time}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid Until:</span>
                        <div className="font-medium">{quote.validity_period}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Received:</span>
                        <div className="font-medium">{format(new Date(quote.created_at), 'MMM dd')}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label className="text-sm font-medium">Terms & Conditions</Label>
                      <p className="text-sm text-muted-foreground">{quote.terms}</p>
                    </div>

                    {quote.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => acceptQuote(quote.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Quote
                        </Button>
                        <Button size="sm" variant="outline">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Contact Supplier
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Track confirmed orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.filter(r => r.status === 'ordered' || r.status === 'delivered').map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{request.material_name}</h3>
                        <p className="text-sm text-muted-foreground">{request.project_name}</p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <div className="font-medium">{request.quantity} {request.unit}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <div className="font-medium">KES {request.total_budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivery Date:</span>
                        <div className="font-medium">{format(new Date(request.required_date), 'MMM dd')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <div className="font-medium">{request.delivery_location}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

