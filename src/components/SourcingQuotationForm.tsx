import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ShoppingCart, Calendar } from "lucide-react";
import { toast } from "sonner";

interface QuotationItem {
  id: string;
  material: string;
  specification: string;
  quantity: number;
  unit: string;
  preferredBrand: string;
  priority: string;
}

const SourcingQuotationForm = () => {
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([{
    id: "1",
    material: "",
    specification: "",
    quantity: 0,
    unit: "pieces",
    preferredBrand: "",
    priority: "medium"
  }]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  const suppliers = [
    { id: "1", name: "Bamburi Cement", category: "Cement & Building Materials" },
    { id: "2", name: "Kenya Hardware Ltd", category: "Hardware & Tools" },
    { id: "3", name: "Steel & Pipes Kenya", category: "Steel & Metal Products" },
    { id: "4", name: "Tiles & Ceramics Co", category: "Tiles & Finishes" },
    { id: "5", name: "Electrical Supplies Kenya", category: "Electrical Materials" }
  ];

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      material: "",
      specification: "",
      quantity: 0,
      unit: "pieces",
      preferredBrand: "",
      priority: "medium"
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSupplierToggle = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Quotation request sent to selected suppliers");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Sourcing & Quotation Request Form
        </CardTitle>
        <CardDescription>
          Request quotations from multiple suppliers for your construction materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation">Project Location</Label>
              <Input
                id="projectLocation"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="Enter delivery location"
                required
              />
            </div>
          </div>

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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Materials Required</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 lg:grid-cols-7 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Input
                    value={item.material}
                    onChange={(e) => updateItem(item.id, 'material', e.target.value)}
                    placeholder="e.g., Portland Cement"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specification</Label>
                  <Textarea
                    value={item.specification}
                    onChange={(e) => updateItem(item.id, 'specification', e.target.value)}
                    placeholder="Technical specs..."
                    rows={1}
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
                  <Label>Preferred Brand</Label>
                  <Input
                    value={item.preferredBrand}
                    onChange={(e) => updateItem(item.id, 'preferredBrand', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={item.priority} onValueChange={(value) => updateItem(item.id, 'priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                  <SelectItem value="30_days">Net 30 Days</SelectItem>
                  <SelectItem value="60_days">Net 60 Days</SelectItem>
                  <SelectItem value="partial_advance">Partial Advance Payment</SelectItem>
                  <SelectItem value="letter_of_credit">Letter of Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryTerms">Delivery Terms</Label>
              <Select value={deliveryTerms} onValueChange={setDeliveryTerms}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivered_site">Delivered to Site</SelectItem>
                  <SelectItem value="pickup_warehouse">Pickup from Warehouse</SelectItem>
                  <SelectItem value="fob_origin">FOB Origin</SelectItem>
                  <SelectItem value="fob_destination">FOB Destination</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="Any special requirements, certifications needed, quality standards, etc."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Select Suppliers to Request Quotations</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={supplier.id}
                    checked={selectedSuppliers.includes(supplier.id)}
                    onCheckedChange={() => handleSupplierToggle(supplier.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={supplier.id} className="font-medium cursor-pointer">
                      {supplier.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{supplier.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Quotation Process</h3>
            <p className="text-sm text-muted-foreground">
              Selected suppliers will receive your request and have 48-72 hours to respond with their quotations. 
              You'll be notified when quotations are received and can compare them in your dashboard.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={selectedSuppliers.length === 0}>
              Send Quotation Requests ({selectedSuppliers.length} suppliers)
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

export default SourcingQuotationForm;