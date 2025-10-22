import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Route,
  Users,
  Building,
  Calculator,
  Send,
  Eye,
  Edit,
  Trash2,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Delivery, BulkDeliveryOperation, DeliveryProvider } from '@/types/delivery';
// import { useDeliveries } from '@/hooks/useDeliveries';

interface BulkDeliveryManagerProps {
  userRole?: string;
  userId?: string;
}

interface BulkDeliveryItem {
  id: string;
  material_type: string;
  quantity: number;
  unit: string;
  pickup_address: string;
  delivery_address: string;
  contact_name: string;
  contact_phone: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_cost: number;
  selected: boolean;
}

export const BulkDeliveryManager: React.FC<BulkDeliveryManagerProps> = ({ 
  userRole = 'builder',
  userId 
}) => {
  const [bulkItems, setBulkItems] = useState<BulkDeliveryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkOperations, setBulkOperations] = useState<BulkDeliveryOperation[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BulkDeliveryItem>>({
    material_type: '',
    quantity: 0,
    unit: 'bags',
    pickup_address: '',
    delivery_address: '',
    contact_name: '',
    contact_phone: '',
    priority: 'normal'
  });
  const { toast } = useToast();
  // const { createDelivery } = useDeliveries();

  useEffect(() => {
    loadBulkOperations();
  }, []);

  const loadBulkOperations = async () => {
    // Mock bulk operations data - in production this would come from database
    const mockOperations: BulkDeliveryOperation[] = [
      {
        id: 'bulk-001',
        name: 'Westlands Project Materials',
        deliveries: ['del-001', 'del-002', 'del-003'],
        status: 'in_progress',
        total_cost: 15750,
        estimated_completion: new Date(Date.now() + 86400000 * 2).toISOString(),
        created_by: userId || 'user-001',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'bulk-002',
        name: 'Karen Residential Complex',
        deliveries: ['del-004', 'del-005'],
        status: 'completed',
        total_cost: 8900,
        estimated_completion: new Date(Date.now() - 86400000).toISOString(),
        created_by: userId || 'user-001',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
    
    setBulkOperations(mockOperations);
  };

  const addBulkItem = () => {
    if (!newItem.material_type || !newItem.pickup_address || !newItem.delivery_address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const item: BulkDeliveryItem = {
      id: `item-${Date.now()}`,
      material_type: newItem.material_type!,
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'bags',
      pickup_address: newItem.pickup_address!,
      delivery_address: newItem.delivery_address!,
      contact_name: newItem.contact_name || '',
      contact_phone: newItem.contact_phone || '',
      priority: newItem.priority || 'normal',
      estimated_cost: calculateEstimatedCost(newItem),
      selected: true
    };

    setBulkItems(prev => [...prev, item]);
    setSelectedItems(prev => [...prev, item.id]);
    
    // Reset form
    setNewItem({
      material_type: '',
      quantity: 0,
      unit: 'bags',
      pickup_address: '',
      delivery_address: '',
      contact_name: '',
      contact_phone: '',
      priority: 'normal'
    });
    
    setShowCreateForm(false);
    
    toast({
      title: "Item Added",
      description: "Delivery item added to bulk operation.",
    });
  };

  const calculateEstimatedCost = (item: Partial<BulkDeliveryItem>): number => {
    // Simple cost estimation - in production this would use the cost calculator
    const baseCost = 500;
    const quantityCost = (item.quantity || 1) * 50;
    const priorityMultiplier = item.priority === 'urgent' ? 1.5 : item.priority === 'high' ? 1.2 : 1.0;
    
    return Math.round((baseCost + quantityCost) * priorityMultiplier);
  };

  const removeBulkItem = (itemId: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => prev.filter(id => id !== itemId));
    
    toast({
      title: "Item Removed",
      description: "Delivery item removed from bulk operation.",
    });
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(bulkItems.map(item => item.id));
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  const createBulkDeliveries = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to create bulk deliveries.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const selectedBulkItems = bulkItems.filter(item => selectedItems.includes(item.id));
      
      // Mock delivery creation for now
      const deliveryPromises = selectedBulkItems.map(async (item) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return { id: `delivery-${Date.now()}`, tracking_number: `UJP-${Date.now()}` };
      });

      const results = await Promise.allSettled(deliveryPromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast({
          title: "Bulk Deliveries Created",
          description: `${successful} delivery requests created successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
        });

        // Remove successfully created items
        const successfulItems = selectedBulkItems.slice(0, successful);
        setBulkItems(prev => prev.filter(item => !successfulItems.some(si => si.id === item.id)));
        setSelectedItems([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to create bulk deliveries. Please try again.",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Error creating bulk deliveries:', err);
      toast({
        title: "Error",
        description: "Failed to create bulk deliveries.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalCost = () => {
    return bulkItems
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + item.estimated_cost, 0);
  };

  const getBulkDiscount = () => {
    const itemCount = selectedItems.length;
    if (itemCount >= 10) return 0.15; // 15% discount for 10+ items
    if (itemCount >= 5) return 0.10;  // 10% discount for 5+ items
    if (itemCount >= 3) return 0.05;  // 5% discount for 3+ items
    return 0;
  };

  const getDiscountedTotal = () => {
    const total = getTotalCost();
    const discount = getBulkDiscount();
    return total * (1 - discount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Delivery Manager</h2>
          <p className="text-muted-foreground">Create and manage multiple deliveries efficiently</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Delivery Item
        </Button>
      </div>

      {/* Bulk Operations Summary */}
      {bulkOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Recent Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bulkOperations.map(operation => (
                <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      operation.status === 'completed' ? 'default' :
                      operation.status === 'in_progress' ? 'secondary' :
                      'outline'
                    }>
                      {operation.status.replace('_', ' ')}
                    </Badge>
                    <div>
                      <p className="font-medium">{operation.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {operation.deliveries.length} deliveries • KES {operation.total_cost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Bulk Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bulk Delivery Items ({bulkItems.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllItems}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllItems}>
                Deselect All
              </Button>
            </div>
          </div>
          {selectedItems.length > 0 && (
            <CardDescription>
              {selectedItems.length} items selected • Total: KES {getTotalCost().toLocaleString()}
              {getBulkDiscount() > 0 && (
                <span className="text-green-600 font-medium">
                  {' '}• {(getBulkDiscount() * 100).toFixed(0)}% bulk discount • 
                  Final: KES {getDiscountedTotal().toLocaleString()}
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {bulkItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Bulk Items</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add delivery items to create bulk operations and save on costs
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bulkItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <p className="font-medium">{item.material_type}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">From: {item.pickup_address.substring(0, 30)}...</p>
                      <p className="text-sm font-medium">To: {item.delivery_address.substring(0, 30)}...</p>
                    </div>
                    <div>
                      <p className="text-sm">{item.contact_name}</p>
                      <p className="text-sm text-muted-foreground">{item.contact_phone}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant={
                          item.priority === 'urgent' ? 'destructive' :
                          item.priority === 'high' ? 'default' :
                          'secondary'
                        }>
                          {item.priority}
                        </Badge>
                        <p className="text-sm font-medium mt-1">KES {item.estimated_cost.toLocaleString()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBulkItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Bulk Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">{selectedItems.length} items selected</p>
                <p className="text-sm text-muted-foreground">
                  Total cost: KES {getTotalCost().toLocaleString()}
                  {getBulkDiscount() > 0 && (
                    <span className="text-green-600 font-medium ml-2">
                      ({(getBulkDiscount() * 100).toFixed(0)}% discount applied)
                    </span>
                  )}
                </p>
                <p className="text-sm font-medium text-primary">
                  Final cost: KES {getDiscountedTotal().toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={createBulkDeliveries} disabled={loading}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Create {selectedItems.length} Deliveries
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Form */}
      {showCreateForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Delivery Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Material Type *</Label>
                <Input
                  value={newItem.material_type || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, material_type: e.target.value }))}
                  placeholder="e.g., Cement, Steel Bars"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={newItem.quantity || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={newItem.unit || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="bags, tons, m³"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Address *</Label>
                <Textarea
                  value={newItem.pickup_address || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, pickup_address: e.target.value }))}
                  placeholder="Full pickup address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Address *</Label>
                <Textarea
                  value={newItem.delivery_address || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, delivery_address: e.target.value }))}
                  placeholder="Full delivery address"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={newItem.contact_name || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={newItem.contact_phone || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={newItem.priority || 'normal'}
                  onChange={(e) => setNewItem(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">
                  Estimated cost: KES {calculateEstimatedCost(newItem).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={addBulkItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Discount Information */}
      {bulkItems.length > 0 && (
        <Alert>
          <Calculator className="h-4 w-4" />
          <AlertTitle>Bulk Delivery Discounts Available</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>• 3+ items: 5% discount</p>
              <p>• 5+ items: 10% discount</p>
              <p>• 10+ items: 15% discount</p>
              <p className="font-medium text-primary">
                Current selection: {selectedItems.length} items = {(getBulkDiscount() * 100).toFixed(0)}% discount
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};