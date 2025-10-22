import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

const MaterialCalculationForm = () => {
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([{
    id: "1",
    name: "",
    quantity: 0,
    unit: "pieces",
    unitCost: 0,
    totalCost: 0
  }]);
  const [contingency, setContingency] = useState(10);
  const [notes, setNotes] = useState("");

  const addMaterial = () => {
    const newMaterial: MaterialItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 0,
      unit: "pieces",
      unitCost: 0,
      totalCost: 0
    };
    setMaterials([...materials, newMaterial]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(material => material.id !== id));
  };

  const updateMaterial = (id: string, field: keyof MaterialItem, value: any) => {
    setMaterials(materials.map(material => {
      if (material.id === id) {
        const updated = { ...material, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updated.totalCost = updated.quantity * updated.unitCost;
        }
        return updated;
      }
      return material;
    }));
  };

  const subtotal = materials.reduce((sum, material) => sum + material.totalCost, 0);
  const contingencyAmount = (subtotal * contingency) / 100;
  const grandTotal = subtotal + contingencyAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Material calculation saved successfully");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Material Calculation Form
        </CardTitle>
        <CardDescription>
          Calculate material requirements and costs for your construction project
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
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Materials</Label>
              <Button type="button" onClick={addMaterial} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </div>

            {materials.map((material, index) => (
              <div key={material.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Material Name</Label>
                  <Input
                    value={material.name}
                    onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                    placeholder="e.g., Cement"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={material.unit} onValueChange={(value) => updateMaterial(material.id, 'unit', value)}>
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
                  <Label>Unit Cost (KES)</Label>
                  <Input
                    type="number"
                    value={material.unitCost}
                    onChange={(e) => updateMaterial(material.id, 'unitCost', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cost</Label>
                  <Input
                    type="number"
                    value={material.totalCost.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMaterial(material.id)}
                    disabled={materials.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contingency">Contingency (%)</Label>
                <Input
                  id="contingency"
                  type="number"
                  value={contingency}
                  onChange={(e) => setContingency(Number(e.target.value))}
                  min="0"
                  max="50"
                  step="0.1"
                />
              </div>
              <div className="space-y-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Subtotal: KES {subtotal.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Contingency ({contingency}%): KES {contingencyAmount.toLocaleString()}</div>
                  <div className="text-lg font-bold">Grand Total: KES {grandTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or specifications..."
              rows={4}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              Save Calculation
            </Button>
            <Button type="button" variant="outline">
              Export PDF
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MaterialCalculationForm;