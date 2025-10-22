import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Truck } from "lucide-react";

interface CreateDeliveryDialogProps {
  builders: Array<{ id: string; email: string }>;
  projects: Array<{ id: string; name: string }>;
  user: any;
  onDeliveryCreated: () => void;
}

const CreateDeliveryDialog = ({ builders, projects, user, onDeliveryCreated }: CreateDeliveryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    material_type: '',
    quantity: '',
    weight_kg: '',
    pickup_address: '',
    delivery_address: '',
    builder_id: '',
    project_id: '',
    estimated_delivery: '',
    // Driver contact fields removed for security
    vehicle_number: '',
    special_instructions: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate simple tracking number
      const trackingData = 'JG' + Date.now().toString().slice(-8);

      const deliveryData = {
        tracking_number: trackingData,
        supplier_id: user.id,
        builder_id: formData.builder_id || null,
        project_id: formData.project_id || null,
        material_type: formData.material_type,
        quantity: parseInt(formData.quantity),
        weight_kg: parseFloat(formData.weight_kg),
        pickup_address: formData.pickup_address,
        delivery_address: formData.delivery_address,
        estimated_delivery_time: formData.estimated_delivery || null,
        // Driver contact managed separately via driver_contact_data table
        vehicle_details: formData.vehicle_number || null,
        notes: formData.special_instructions || null,
        status: 'pending'
      };

      const { error } = await supabase
        .from('deliveries')
        .insert([deliveryData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Delivery created with tracking number: ${trackingData}`,
      });

      setOpen(false);
      setFormData({
        material_type: '',
        quantity: '',
        weight_kg: '',
        pickup_address: '',
        delivery_address: '',
        builder_id: '',
        project_id: '',
        estimated_delivery: '',
        // Driver contact fields removed
        vehicle_number: '',
        special_instructions: ''
      });
      onDeliveryCreated();
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast({
        title: "Error",
        description: "Failed to create delivery",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Delivery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Create New Delivery
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material_type">Material Type *</Label>
              <Input
                id="material_type"
                value={formData.material_type}
                onChange={(e) => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                placeholder="e.g., Cement, Steel Bars"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g., 100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Weight (kg) *</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                placeholder="e.g., 2500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="builder_id">Builder</Label>
              <Select
                value={formData.builder_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, builder_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select builder" />
                </SelectTrigger>
                <SelectContent>
                  {builders.map((builder) => (
                    <SelectItem key={builder.id} value={builder.id}>
                      {builder.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_delivery">Estimated Delivery</Label>
              <Input
                id="estimated_delivery"
                type="datetime-local"
                value={formData.estimated_delivery}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_delivery: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_address">Pickup Address *</Label>
            <Textarea
              id="pickup_address"
              value={formData.pickup_address}
              onChange={(e) => setFormData(prev => ({ ...prev, pickup_address: e.target.value }))}
              placeholder="Enter pickup location..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_address">Delivery Address *</Label>
            <Textarea
              id="delivery_address"
              value={formData.delivery_address}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
              placeholder="Enter delivery location..."
              required
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Driver contact information is now managed securely and will be accessible only when needed for active deliveries.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_number">Vehicle Number</Label>
            <Input
              id="vehicle_number"
              value={formData.vehicle_number}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
              placeholder="e.g., KCA 123A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
              placeholder="Any special handling requirements..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Delivery"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeliveryDialog;