import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, QrCode, Receipt, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PurchaseItem {
  id: string;
  material_type: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface SupplierData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  specialties: string[];
  rating: number;
  is_verified: boolean;
}

interface PaymentMethod {
  id: string;
  payment_method: string;
  is_default: boolean;
  payment_details: any;
}

const PrivateBuilderDirectPurchase = () => {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deliveryRequired, setDeliveryRequired] = useState(true);

  useEffect(() => {
    checkUserAccess();
    fetchSuppliers();
    fetchPaymentMethods();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, user_type')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Mock data for now - replace with actual Supabase query when suppliers table is ready
      const mockSuppliers: SupplierData[] = [
        {
          id: "1",
          company_name: "Cement Masters Ltd",
          contact_person: "John Doe",
          email: "john@cementmasters.com",
          phone: "+254700123456",
          address: "Industrial Area, Nairobi",
          specialties: ["Cement", "Concrete", "Blocks"],
          rating: 4.8,
          is_verified: true
        },
        {
          id: "2", 
          company_name: "Steel & Iron Works",
          contact_person: "Jane Smith",
          email: "jane@steelworks.com", 
          phone: "+254700654321",
          address: "Ruiru, Kiambu",
          specialties: ["Steel", "Iron", "Rebar"],
          rating: 4.6,
          is_verified: true
        }
      ];
      setSuppliers(mockSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const fetchPaymentMethods = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('payment_preferences')
        .select('id, payment_method, is_default, payment_details')
        .eq('user_id', userProfile.id);

      if (error) throw error;
      setPaymentMethods(data?.map(method => ({
        id: method.id,
        payment_method: method.payment_method,
        is_default: method.is_default,
        payment_details: method.payment_details
      })) || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const addItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      material_type: "",
      description: "",
      quantity: 1,
      unit: "pieces",
      unit_price: 0,
      total_price: 0
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setPurchaseItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const generateReceipt = async () => {
    try {
      // Get user email for receipt sending
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User email not found');

      // Generate receipt via edge function
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: {
          purchase_data: {
            buyer_id: userProfile.id,
            supplier_id: selectedSupplier?.id || selectedSupplier?.company_name,
            items: purchaseItems,
            total_amount: calculateTotal(),
            payment_method: selectedPaymentMethod,
            payment_reference: paymentReference,
            delivery_address: deliveryAddress,
            special_instructions: specialInstructions
          },
          builder_email: user.email,
          builder_name: userProfile.full_name || userProfile.company_name || 'Builder',
          supplier_name: selectedSupplier?.company_name || 'Supplier'
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  };

  const generateQRCodes = async (receiptId: string) => {
    try {
      const qrPromises = purchaseItems.map(async (item) => {
        const { data, error } = await supabase.functions.invoke('generate-qr-code', {
          body: {
            material_type: item.material_type,
            supplier_id: selectedSupplier?.id,
            receipt_id: receiptId,
            quantity: item.quantity,
            unit: item.unit
          }
        });

        if (error) throw error;
        return data;
      });

      await Promise.all(qrPromises);
      toast.success('QR codes generated for all items');
    } catch (error) {
      console.error('Error generating QR codes:', error);
      toast.error('Failed to generate QR codes');
    }
  };

  const processPurchase = async () => {
    if (!selectedSupplier || purchaseItems.length === 0 || !selectedPaymentMethod) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsProcessing(true);
    try {
      // Generate receipt and automatically send to builder
      const receipt = await generateReceipt();

      // Generate QR codes for all items
      await generateQRCodes(receipt.receipt_id);

      // If delivery is required, notify delivery providers
      if (deliveryRequired && deliveryAddress) {
        try {
          await supabase.functions.invoke('notify-delivery-providers', {
            body: {
              request_type: 'private_purchase',
              request_id: receipt.receipt_id,
              pickup_address: selectedSupplier?.address || "Supplier location",
              delivery_address: deliveryAddress,
              material_details: purchaseItems.map(item => ({
                material_type: item.material_type,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit
              })),
              special_instructions: specialInstructions,
              priority_level: 'normal'
            }
          });
        } catch (deliveryError) {
          console.error('Error notifying delivery providers:', deliveryError);
        }
      }

      // Clear form
      setPurchaseItems([]);
      setSelectedSupplier(null);
      setSelectedPaymentMethod("");
      setPaymentReference("");
      setDeliveryAddress("");
      setSpecialInstructions("");

      toast.success(`Purchase completed! Receipt #${receipt.receipt_number} sent to your email.`);
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userProfile || userProfile.role !== 'builder' || userProfile.user_type !== 'individual') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This direct purchase system is exclusively for private/individual builders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Direct Purchase System - Private Builders
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            <Shield className="h-4 w-4 inline mr-1" />
            Secure direct purchasing with automatic QR coding and receipt generation
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suppliers">Select Supplier</TabsTrigger>
          <TabsTrigger value="items">Add Items</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {suppliers.map((supplier) => (
                  <Card 
                    key={supplier.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedSupplier?.id === supplier.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{supplier.company_name}</h3>
                          <p className="text-sm text-muted-foreground">Verified Business Partner</p>
                          <div className="flex gap-2 mt-2">
                            {supplier.specialties?.slice(0, 3).map((specialty, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{supplier.rating}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                          {supplier.is_verified && (
                            <Badge variant="default" className="text-xs mt-1">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                Purchase Items
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div>
                          <Label htmlFor={`material-${item.id}`}>Material Type</Label>
                          <Input
                            id={`material-${item.id}`}
                            value={item.material_type}
                            onChange={(e) => updateItem(item.id, 'material_type', e.target.value)}
                            placeholder="e.g., Cement, Steel bars"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`description-${item.id}`}>Description</Label>
                          <Input
                            id={`description-${item.id}`}
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Details"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`unit-${item.id}`}>Unit</Label>
                          <Select value={item.unit} onValueChange={(value) => updateItem(item.id, 'unit', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pieces">Pieces</SelectItem>
                              <SelectItem value="bags">Bags</SelectItem>
                              <SelectItem value="tons">Tons</SelectItem>
                              <SelectItem value="meters">Meters</SelectItem>
                              <SelectItem value="cubic_meters">Cubic Meters</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`price-${item.id}`}>Unit Price (KES)</Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div>
                            <Label>Total: KES {item.total_price.toFixed(2)}</Label>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {purchaseItems.length > 0 && (
                  <div className="flex justify-end">
                    <Card className="w-fit">
                      <CardContent className="p-4">
                        <div className="text-lg font-semibold">
                          Total Amount: KES {calculateTotal().toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment-method">Select Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.payment_method} ({method.is_default ? 'Default' : 'Saved'})
                      </SelectItem>
                    ))}
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="cash">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment-reference">Payment Reference</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID or reference number"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delivery-address">Delivery Address</Label>
                <Textarea
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter complete delivery address"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="special-instructions">Special Instructions</Label>
                <Textarea
                  id="special-instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special delivery instructions or requirements"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <QrCode className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Automatic QR Code Generation</p>
                  <p className="text-sm text-muted-foreground">
                    QR codes will be automatically generated for all purchased items for tracking and verification
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Digital Receipt</p>
                  <p className="text-sm text-muted-foreground">
                    A digital receipt will be generated and stored in the system for your records
                  </p>
                </div>
              </div>

              <Button
                onClick={processPurchase}
                disabled={isProcessing || !selectedSupplier || purchaseItems.length === 0 || !selectedPaymentMethod}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Processing Purchase..." : "Complete Purchase"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivateBuilderDirectPurchase;