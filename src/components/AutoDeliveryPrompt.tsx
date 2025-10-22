import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Package, Clock, MapPin, CheckCircle, XCircle } from "lucide-react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  buyer_id: string;
  supplier_id: string;
  total_amount: number;
  delivery_address: string;
  items: any[];
  delivery_date: string;
  status: string;
}

interface AutoDeliveryPromptProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onDeliveryRequested: () => void;
}

const AutoDeliveryPrompt: React.FC<AutoDeliveryPromptProps> = ({
  purchaseOrder,
  isOpen,
  onClose,
  onDeliveryRequested
}) => {
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    pickupAddress: "",
    deliveryAddress: purchaseOrder?.delivery_address || "",
    preferredDate: purchaseOrder?.delivery_date || "",
    preferredTime: "",
    materialType: "mixed",
    totalWeight: "",
    specialInstructions: "",
    budgetRange: "100-200"
  });
  const { toast } = useToast();

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      // Calculate estimated weight from items
      const estimatedWeight = purchaseOrder.items?.reduce((total, item) => {
        return total + (item.quantity * (item.estimated_weight || 50)); // Default 50kg per item
      }, 0) || 0;

      setDeliveryData(prev => ({
        ...prev,
        deliveryAddress: purchaseOrder.delivery_address || "",
        preferredDate: purchaseOrder.delivery_date || "",
        totalWeight: estimatedWeight.toString(),
        materialType: purchaseOrder.items?.length === 1 ? 
          purchaseOrder.items[0].material_type || "mixed" : "mixed"
      }));
    }
  }, [purchaseOrder, isOpen]);

  const handleRequestDelivery = async () => {
    if (!deliveryData.pickupAddress || !deliveryData.deliveryAddress) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both pickup and delivery addresses"
      });
      return;
    }

    setLoading(true);
    try {
      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Create delivery request
      const requestData = {
        builder_id: profile.id,
        pickup_address: deliveryData.pickupAddress,
        delivery_address: deliveryData.deliveryAddress,
        pickup_date: deliveryData.preferredDate,
        preferred_time: deliveryData.preferredTime || null,
        material_type: deliveryData.materialType,
        quantity: purchaseOrder.items?.length || 1,
        weight_kg: parseFloat(deliveryData.totalWeight) || null,
        special_instructions: deliveryData.specialInstructions || null,
        budget_range: deliveryData.budgetRange,
        status: 'pending',
        auto_rotation_enabled: true,
        max_rotation_attempts: 5
      };

      const { error } = await supabase
        .from('delivery_requests')
        .insert(requestData);

      if (error) throw error;

      toast({
        title: "Delivery Request Created",
        description: "Your delivery request has been submitted. Nearby providers will be notified automatically."
      });

      onDeliveryRequested();
      onClose();
    } catch (error: any) {
      console.error('Error creating delivery request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create delivery request"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: "Delivery Declined",
      description: "You can request delivery later from the delivery page."
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Delivery Required for Purchase Order
          </DialogTitle>
          <DialogDescription>
            Your purchase order {purchaseOrder?.po_number} requires delivery. 
            Would you like to arrange delivery service?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">PO Number:</span> {purchaseOrder?.po_number}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> ${purchaseOrder?.total_amount}
                </div>
                <div>
                  <span className="font-medium">Items:</span> {purchaseOrder?.items?.length || 0} items
                </div>
                <div>
                  <span className="font-medium">Delivery Date:</span> {purchaseOrder?.delivery_date}
                </div>
              </div>
              
              {purchaseOrder?.items && purchaseOrder.items.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium text-sm">Items:</span>
                  <div className="space-y-1">
                    {purchaseOrder.items.map((item, index) => (
                      <div key={index} className="text-sm bg-muted p-2 rounded">
                        {item.name} - Qty: {item.quantity} ({item.unit})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Details Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Address *</Label>
                  <Textarea
                    id="pickup"
                    placeholder="Enter supplier pickup location..."
                    value={deliveryData.pickupAddress}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery">Delivery Address *</Label>
                  <Textarea
                    id="delivery"
                    placeholder="Enter delivery location..."
                    value={deliveryData.deliveryAddress}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={deliveryData.preferredDate}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={deliveryData.preferredTime}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material">Material Type</Label>
                    <Select
                      value={deliveryData.materialType}
                      onValueChange={(value) => setDeliveryData(prev => ({ ...prev, materialType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cement">Cement</SelectItem>
                        <SelectItem value="steel">Steel Bars</SelectItem>
                        <SelectItem value="bricks">Bricks</SelectItem>
                        <SelectItem value="sand">Sand</SelectItem>
                        <SelectItem value="gravel">Gravel</SelectItem>
                        <SelectItem value="timber">Timber</SelectItem>
                        <SelectItem value="mixed">Mixed Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Total Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="Estimated weight"
                      value={deliveryData.totalWeight}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, totalWeight: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Range</Label>
                  <Select
                    value={deliveryData.budgetRange}
                    onValueChange={(value) => setDeliveryData(prev => ({ ...prev, budgetRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-50">Under $50</SelectItem>
                      <SelectItem value="50-100">$50 - $100</SelectItem>
                      <SelectItem value="100-200">$100 - $200</SelectItem>
                      <SelectItem value="200-500">$200 - $500</SelectItem>
                      <SelectItem value="over-500">Over $500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Special Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any special handling requirements..."
                    value={deliveryData.specialInstructions}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Automatic Provider Notification Info */}
          <Alert>
            <Truck className="h-4 w-4" />
            <AlertDescription>
              <strong>Automatic Provider Notification:</strong> When you request delivery, 
              nearby verified providers will be automatically notified. If one declines, 
              the request will automatically rotate to the next nearest provider.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleDecline}>
              <XCircle className="h-4 w-4 mr-2" />
              Not Now
            </Button>
            <Button onClick={handleRequestDelivery} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? "Creating Request..." : "Request Delivery"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoDeliveryPrompt;