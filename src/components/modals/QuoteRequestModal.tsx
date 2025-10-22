import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, FileText, Store } from "lucide-react";
import { Supplier } from "@/types/supplier";

interface QuoteRequestModalProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
}

interface MaterialItem {
  material: string;
  quantity: string;
  unit: string;
}

export const QuoteRequestModal = ({ supplier, isOpen, onClose }: QuoteRequestModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    deliveryAddress: "",
    timeline: "",
    notes: ""
  });

  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([
    { material: "", quantity: "", unit: "pieces" }
  ]);
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Quote Request Sent",
      description: `Your quote request has been sent to ${supplier.company_name}. You'll receive a response within 24-48 hours.`,
    });
    
    onClose();
    setFormData({
      name: "", email: "", phone: "", company: "", deliveryAddress: "", timeline: "", notes: ""
    });
    setMaterialItems([{ material: "", quantity: "", unit: "pieces" }]);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    setMaterialItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addMaterialItem = () => {
    setMaterialItems(prev => [...prev, { material: "", quantity: "", unit: "pieces" }]);
  };

  const removeMaterialItem = (index: number) => {
    setMaterialItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Quote from {supplier.company_name}
          </DialogTitle>
          <DialogDescription>
            Get detailed pricing for your construction materials.
          </DialogDescription>
        </DialogHeader>

        {/* Supplier Info */}
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{supplier.company_name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Specializes in: {supplier.specialties.slice(0, 3).join(", ")}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Full Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder="Company Name"
                />
              </div>
            </div>
          </div>

          {/* Materials List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Materials Required</h3>
              <Button type="button" variant="outline" size="sm" onClick={addMaterialItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {materialItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6 space-y-1">
                    <Label className="text-xs">Material</Label>
                    <Select
                      value={item.material}
                      onValueChange={(value) => handleMaterialChange(index, "material", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplier.materials_offered.map((material) => (
                          <SelectItem key={material} value={material}>
                            {material}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      className="h-9"
                      value={item.quantity}
                      onChange={(e) => handleMaterialChange(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => handleMaterialChange(index, "unit", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="tons">Tons</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    {materialItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => removeMaterialItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Project Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Select value={formData.timeline} onValueChange={(value) => handleInputChange("timeline", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="When do you need this?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent (Within 1 week)</SelectItem>
                    <SelectItem value="soon">Soon (1-2 weeks)</SelectItem>
                    <SelectItem value="month">Within 1 month</SelectItem>
                    <SelectItem value="flexible">Flexible timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Delivery Location *</Label>
                <Input
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                  placeholder="City, County"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any specific requirements, quality standards, or delivery instructions..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Request Quote
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};