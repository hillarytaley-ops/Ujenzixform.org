import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Package, Plus, Trash2, Send, Loader2, CheckCircle } from 'lucide-react';

interface QuickPurchaseOrderProps {
  builderId: string;
  onClose?: () => void;
}

interface OrderItem {
  id: string;
  material: string;
  category: string;
  quantity: string;
  unit: string;
  notes: string;
}

const MATERIAL_CATEGORIES = [
  'Cement',
  'Steel',
  'Aggregates (Sand, Ballast)',
  'Blocks',
  'Roofing Materials',
  'Paint',
  'Timber',
  'Hardware',
  'Plumbing',
  'Electrical',
  'Tiles',
  'Other'
];

const UNITS = ['bags', 'tonnes', 'pieces', 'meters', 'sqm', 'liters', 'rolls', 'sheets', 'boxes'];

export const QuickPurchaseOrder: React.FC<QuickPurchaseOrderProps> = ({ builderId, onClose }) => {
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', material: '', category: '', quantity: '', unit: '', notes: '' }
  ]);
  const [projectName, setProjectName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      material: '', 
      category: '', 
      quantity: '', 
      unit: '',
      notes: '' 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!projectName.trim()) {
      toast({
        title: 'Project name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    const validItems = items.filter(item => item.material && item.quantity);
    if (validItems.length === 0) {
      toast({
        title: 'No items added',
        description: 'Please add at least one material item',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create purchase order in database
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          builder_id: builderId,
          project_name: projectName,
          delivery_address: deliveryAddress,
          delivery_date: deliveryDate || null,
          status: 'pending',
          notes: additionalNotes,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add order items
      const itemsToInsert = validItems.map(item => ({
        order_id: orderData.id,
        material_name: item.material,
        category: item.category,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: '✅ Purchase Order Created!',
        description: `Order #${orderData.id.slice(0, 8)} submitted successfully. Suppliers will send quotes soon.`,
      });

      // Reset form
      setItems([{ id: '1', material: '', category: '', quantity: '', unit: '', notes: '' }]);
      setProjectName('');
      setDeliveryAddress('');
      setDeliveryDate('');
      setAdditionalNotes('');

      // Close modal if callback provided
      if (onClose) {
        setTimeout(() => onClose(), 2000);
      }

    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast({
        title: 'Error creating order',
        description: 'Failed to submit purchase order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <ShoppingCart className="h-6 w-6 text-orange-600" />
          Create Purchase Order
        </CardTitle>
        <CardDescription>
          Specify materials needed and we'll connect you with verified suppliers for quotes
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="e.g., 3-Bedroom House - Westlands"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-address">Delivery Address *</Label>
              <Input
                id="delivery-address"
                placeholder="e.g., Plot 123, Westlands, Nairobi"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-date">Preferred Delivery Date (Optional)</Label>
            <Input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Materials Required *</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={item.id} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    {/* Category */}
                    <div className="md:col-span-2">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateItem(item.id, 'category', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Material Name */}
                    <div className="md:col-span-2">
                      <Label className="text-xs">Material Name</Label>
                      <Input
                        placeholder="e.g., Bamburi Cement 50kg"
                        value={item.material}
                        onChange={(e) => updateItem(item.id, 'material', e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        min="0"
                        step="0.1"
                        className="h-9"
                      />
                    </div>

                    {/* Unit */}
                    <div className="relative">
                      <Label className="text-xs">Unit</Label>
                      <div className="flex gap-1">
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(item.id, 'unit', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item Notes */}
                  <div className="mt-2">
                    <Input
                      placeholder="Specifications or notes (optional)"
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Requirements (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements, quality standards, or delivery instructions..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Package className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <strong>How it works:</strong> After submitting, verified suppliers will review your order and send competitive quotes. 
              You'll be notified to compare and select the best offer.
            </AlertDescription>
          </Alert>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting Order...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Purchase Order
                </>
              )}
            </Button>

            {onClose && (
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
                className="sm:w-32"
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

