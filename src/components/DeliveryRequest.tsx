import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/userProfile";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Package, Truck, Calendar, Shield, AlertTriangle } from "lucide-react";
import { deliveryProviderNotificationService } from "@/services/DeliveryProviderNotificationService";

const DeliveryRequest = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    pickupAddress: "",
    deliveryAddress: "",
    preferredDate: "",
    preferredTime: "",
    specialInstructions: "",
    budgetRange: "",
    requiredVehicleType: "",
    materialType: "",
    quantity: "",
    weight: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
  }, []);

  // Helper: wrap promise with timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  const checkUserAccess = async () => {
    setLoading(true);
    
    // Safety timeout - show form after 5 seconds max
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ DeliveryRequest: Safety timeout reached, showing form');
      setLoading(false);
    }, 5000);
    
    try {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        3000,
        { data: { user: null }, error: null }
      );
      
      const user = userResult.data?.user;
      if (!user) {
        console.log('No user found for delivery request form');
        clearTimeout(safetyTimeout);
        setLoading(false);
        return;
      }

      const roleResult = await withTimeout(
        supabase.from('user_roles').select('role').eq('user_id', user.id).limit(1).maybeSingle(),
        3000,
        { data: null, error: null }
      );

      setUserRole((roleResult.data?.role as UserRole) || null);
      console.log('✅ DeliveryRequest: User role loaded:', roleResult.data?.role);
    } catch (error) {
      console.error('Error checking user access:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.materialType) newErrors.materialType = "Material type is required";
    if (!formData.pickupAddress.trim()) newErrors.pickupAddress = "Pickup address is required";
    if (!formData.deliveryAddress.trim()) newErrors.deliveryAddress = "Delivery address is required";
    if (!formData.preferredDate) newErrors.preferredDate = "Preferred date is required";
    if (!formData.quantity) newErrors.quantity = "Quantity is required";

    // Date validation
    const selectedDate = new Date(formData.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.preferredDate = "Delivery date cannot be in the past";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please correct the errors in the form"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Security check - only allow certain roles to create delivery requests
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (!roleData || !['builder', 'professional_builder', 'private_client', 'admin'].includes(roleData.role)) {
        throw new Error('Insufficient permissions to create delivery requests');
      }

      // Create delivery request with enhanced validation
      const requestData = {
        builder_id: profile.id,
        pickup_address: formData.pickupAddress.trim(),
        delivery_address: formData.deliveryAddress.trim(),
        pickup_date: formData.preferredDate,
        preferred_time: formData.preferredTime || null,
        special_instructions: formData.specialInstructions.trim() || null,
        budget_range: formData.budgetRange || null,
        required_vehicle_type: formData.requiredVehicleType || null,
        material_type: formData.materialType,
        quantity: parseInt(formData.quantity) || 1,
        weight_kg: parseFloat(formData.weight) || null,
        status: 'pending'
      };

      const { data: deliveryRequest, error } = await supabase
        .from('delivery_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      // ✅ AUTO-NOTIFY: Alert ALL registered delivery providers immediately
      if (deliveryRequest) {
        try {
          console.log('🚚 Notifying ALL delivery providers for request:', deliveryRequest.id);
          
          const notificationResult = await deliveryProviderNotificationService.notifyAllProviders({
            id: deliveryRequest.id,
            pickup_address: formData.pickupAddress.trim(),
            delivery_address: formData.deliveryAddress.trim(),
            pickup_date: formData.preferredDate,
            material_type: formData.materialType,
            quantity: parseInt(formData.quantity) || 1,
            weight_kg: parseFloat(formData.weight) || undefined,
            budget_range: formData.budgetRange || undefined,
            special_instructions: formData.specialInstructions.trim() || undefined
          });
          
          console.log(`✅ Delivery providers notified: ${notificationResult.notified}/${notificationResult.totalProviders}`);
          
          // Log analytics event
          await deliveryProviderNotificationService.logNotificationEvent(deliveryRequest.id, notificationResult);
        } catch (notifyError) {
          console.error('⚠️ Error notifying delivery providers:', notifyError);
          // Continue even if notification fails - delivery request is created
        }
      }

      toast({
        title: "🚚 Delivery Request Sent!",
        description: "Nearby delivery providers have been notified. First responder will be assigned."
      });

      // Reset form
      setFormData({
        pickupAddress: "",
        deliveryAddress: "",
        preferredDate: "",
        preferredTime: "",
        specialInstructions: "",
        budgetRange: "",
        requiredVehicleType: "",
        materialType: "",
        quantity: "",
        weight: ""
      });
      setErrors({});
    } catch (error: any) {
      console.error('Error submitting delivery request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit delivery request"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading delivery request form..." />;
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Secure Delivery Request:</strong> Your delivery information is protected. 
          Addresses and personal details are only shared with verified delivery providers.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Request Delivery Service
          </CardTitle>
          <CardDescription>
            Submit a secure delivery request for construction materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="materialType">Material Type *</Label>
                <Select
                  value={formData.materialType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, materialType: value }))}
                >
                  <SelectTrigger className={errors.materialType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select material type" />
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
                {errors.materialType && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.materialType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className={errors.quantity ? "border-red-500" : ""}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.quantity}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter weight in kg"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Required Vehicle Type</Label>
                <Select
                  value={formData.requiredVehicleType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requiredVehicleType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="pickup">Pickup Truck</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickupAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pickup Address
                </Label>
                <Textarea
                  id="pickupAddress"
                  placeholder="Enter the pickup location..."
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </Label>
                <Textarea
                  id="deliveryAddress"
                  placeholder="Enter the delivery location..."
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="preferredDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Preferred Date
                </Label>
                <Input
                  id="preferredDate"
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredTime">Preferred Time</Label>
                <Input
                  id="preferredTime"
                  type="time"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetRange">Budget Range</Label>
              <Select
                value={formData.budgetRange}
                onValueChange={(value) => setFormData(prev => ({ ...prev, budgetRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
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
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special handling requirements or additional notes..."
                value={formData.specialInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting || loading} 
              className="w-full"
            >
              <Truck className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Secure Delivery Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryRequest;