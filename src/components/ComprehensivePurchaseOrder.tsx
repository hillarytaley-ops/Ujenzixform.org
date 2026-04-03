import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

interface PurchaseOrderItem {
  id: string;
  material_type: string;
  specification: string;
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
}

const ComprehensivePurchaseOrder = () => {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [items, setItems] = useState<PurchaseOrderItem[]>([{
    id: "1",
    material_type: "",
    specification: "",
    quantity: 0,
    unit: "pieces",
    unit_price: 0,
    total_price: 0
  }]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deliveryRequired, setDeliveryRequired] = useState(true);

  useEffect(() => {
    fetchSuppliers();
    generatePONumber();
  }, []);

  const fetchSuppliers = async () => {
    // Mock suppliers for now - replace with actual Supabase query later
    const mockSuppliers: SupplierData[] = [
      {
        id: "1",
        company_name: "Bamburi Cement Ltd",
        contact_person: "John Kamau",
        email: "john@bamburi.com",
        phone: "+254 712 345 678",
        address: "Industrial Area, Nairobi",
        specialties: ["Cement", "Building Materials"]
      },
      {
        id: "2", 
        company_name: "Steel & Pipes Kenya",
        contact_person: "Mary Wanjiku",
        email: "mary@steelkenya.com",
        phone: "+254 721 456 789",
        address: "Mombasa Road, Nairobi",
        specialties: ["Steel", "Pipes"]
      }
    ];
    setSuppliers(mockSuppliers);
  };

  const generatePONumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setPoNumber(`PO${dateStr}${randomNum}`);
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      material_type: "",
      specification: "",
      quantity: 0,
      unit: "pieces",
      unit_price: 0,
      total_price: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof PurchaseOrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const vat = subtotal * 0.16; // 16% VAT
  const grandTotal = subtotal + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to create purchase orders");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast.error("User profile not found");
        return;
      }

      const { data: poData, error } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          buyer_id: profile.id,
          supplier_id: selectedSupplier,
          items: items.map(item => ({
            material_type: item.material_type,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price
          })),
          total_amount: grandTotal,
          delivery_date: deliveryDate,
          delivery_address: deliveryAddress,
          payment_terms: paymentTerms,
          special_instructions: specialInstructions,
          delivery_required: deliveryRequired,
          delivery_requested_at: deliveryRequired ? new Date().toISOString() : null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Purchase order creation error:', error);
        const msg = (error as { message?: string; details?: string }).message || (error as { details?: string }).details || 'Failed to create purchase order';
        toast.error(msg.length > 300 ? msg.slice(0, 300) + '…' : msg);
        return;
      }
      
      // If delivery is required, notify delivery providers
      if (deliveryRequired && deliveryAddress) {
        const { error: notifyErr } = await invokeEdgeFunction(
          'notify-delivery-providers',
          {
            body: {
              request_type: 'purchase_order',
              request_id: poData.id,
              pickup_address: "Supplier location (to be confirmed)",
              delivery_address: deliveryAddress,
              material_details: items.map(item => ({
                material_type: item.material_type,
                quantity: item.quantity,
                unit: item.unit
              })),
              special_instructions: specialInstructions,
              priority_level: 'normal'
            }
          },
          { request_type: 'purchase_order', request_id: poData.id }
        );
        if (notifyErr) {
          console.error('Error notifying delivery providers:', notifyErr);
          toast.success("Purchase order created successfully");
        } else {
          toast.success("Purchase order created and delivery providers notified");
        }
      } else {
        toast.success("Purchase order created and sent to supplier for confirmation");
      }
      
      // Reset form
      setSelectedSupplier("");
      setProjectName("");
      setDeliveryDate("");
      setDeliveryAddress("");
      setItems([{
        id: "1",
        material_type: "",
        specification: "",
        quantity: 0,
        unit: "pieces",
        unit_price: 0,
        total_price: 0
      }]);
      setPaymentTerms("");
      setSpecialInstructions("");
      setTermsAccepted(false);
      setDeliveryRequired(true);
      generatePONumber();
      
    } catch (error) {
      console.error('Error creating purchase order:', error);
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Failed to create purchase order. Please try again.';
      toast.error(msg.length > 300 ? msg.slice(0, 300) + '…' : msg);
    }
  };

  const selectedSupplierDetails = suppliers.find(s => s.id === selectedSupplier);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Purchase Order Creation
        </CardTitle>
        <CardDescription>
          Create and send purchase orders to verified suppliers on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                value={poNumber}
                readOnly
                className="bg-muted font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Reference</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name/reference"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Select Supplier</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose from verified suppliers" />
              </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{supplier.company_name}</span>
                        <span className="text-sm text-muted-foreground">Verified Supplier</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          {selectedSupplierDetails && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">{selectedSupplierDetails.company_name}</h4>
                    <p className="text-sm">{selectedSupplierDetails.contact_person}</p>
                    <p className="text-sm">{selectedSupplierDetails.email}</p>
                    <p className="text-sm">{selectedSupplierDetails.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm">{selectedSupplierDetails.address}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSupplierDetails.specialties?.map((specialty, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Required Delivery Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                  <SelectItem value="net_30">Net 30 Days</SelectItem>
                  <SelectItem value="net_60">Net 60 Days</SelectItem>
                  <SelectItem value="50_advance">50% Advance, 50% on Delivery</SelectItem>
                  <SelectItem value="letter_of_credit">Letter of Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Required Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="deliveryRequired"
                checked={deliveryRequired}
                onChange={(e) => setDeliveryRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="deliveryRequired" className="text-sm font-medium">
                Delivery Required
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Check this if you need delivery service for your order. Nearby delivery providers will be automatically notified.
            </p>
          </div>

          {deliveryRequired && (
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter complete delivery address with landmarks"
                rows={3}
                required
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Order Items</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 lg:grid-cols-7 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Material Type</Label>
                  <Input
                    value={item.material_type}
                    onChange={(e) => updateItem(item.id, 'material_type', e.target.value)}
                    placeholder="e.g., Portland Cement"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specification</Label>
                  <Input
                    value={item.specification}
                    onChange={(e) => updateItem(item.id, 'specification', e.target.value)}
                    placeholder="Grade, size, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={item.unit} onValueChange={(value) => updateItem(item.id, 'unit', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                      <SelectItem value="cubic_meters">Cubic Meters</SelectItem>
                      <SelectItem value="square_meters">Square Meters</SelectItem>
                      <SelectItem value="meters">Meters</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (KES)</Label>
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Price</Label>
                  <Input
                    type="number"
                    value={item.total_price.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="text-right space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (16%):</span>
                <span>KES {vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>KES {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special delivery instructions, quality requirements, or other notes..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm">
              I confirm that all information is accurate and agree to the terms and conditions
            </Label>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Purchase Order Process
            </h3>
            <p className="text-sm text-muted-foreground">
              Once submitted, this PO will be sent to the selected supplier for confirmation. 
              The supplier has 48 hours to accept or decline. Upon acceptance, QR codes will be 
              automatically generated for tracking materials during dispatch and delivery.
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!termsAccepted || !selectedSupplier}
            >
              Create & Send Purchase Order
            </Button>
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ComprehensivePurchaseOrder;