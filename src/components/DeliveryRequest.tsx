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
import { MapPin, Package, Truck, Calendar, Shield, AlertTriangle, Navigation, Copy, Check } from "lucide-react";
import { deliveryProviderNotificationService } from "@/services/DeliveryProviderNotificationService";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
  // STRUCTURAL & FOUNDATION
  { value: "cement", label: "Cement & Concrete" },
  { value: "steel", label: "Steel & Reinforcement" },
  { value: "aggregates", label: "Aggregates & Ballast" },
  { value: "sand", label: "Sand" },
  { value: "stones", label: "Building Stones" },
  { value: "blocks", label: "Blocks & Bricks" },
  { value: "ready-mix", label: "Ready Mix Concrete" },
  // ROOFING
  { value: "roofing", label: "Roofing Materials" },
  { value: "iron-sheets", label: "Iron Sheets (Mabati)" },
  { value: "roofing-tiles", label: "Roofing Tiles" },
  { value: "gutters", label: "Gutters & Downpipes" },
  { value: "waterproofing", label: "Waterproofing" },
  // TIMBER & WOOD
  { value: "timber", label: "Timber & Wood" },
  { value: "plywood", label: "Plywood & Boards" },
  { value: "formwork", label: "Formwork & Shuttering" },
  { value: "treated-poles", label: "Treated Poles" },
  // DOORS, WINDOWS & OPENINGS
  { value: "doors", label: "Doors & Frames" },
  { value: "windows", label: "Windows & Glass" },
  { value: "aluminium", label: "Aluminium Works" },
  { value: "door-hardware", label: "Door & Window Hardware" },
  // PLUMBING & WATER
  { value: "plumbing", label: "Plumbing Supplies" },
  { value: "pipes", label: "Pipes & Fittings" },
  { value: "water-tanks", label: "Water Tanks & Pumps" },
  { value: "sanitary", label: "Sanitary Ware" },
  { value: "taps", label: "Taps & Mixers" },
  { value: "water-heaters", label: "Water Heaters" },
  // ELECTRICAL
  { value: "electrical", label: "Electrical Supplies" },
  { value: "cables", label: "Cables & Wires" },
  { value: "switches", label: "Switches & Sockets" },
  { value: "lighting", label: "Lighting" },
  { value: "solar", label: "Solar Equipment" },
  { value: "generators", label: "Generators" },
  // TILES & FLOORING
  { value: "tiles", label: "Tiles & Flooring" },
  { value: "ceramic", label: "Ceramic & Porcelain" },
  { value: "granite-marble", label: "Granite & Marble" },
  { value: "vinyl-carpet", label: "Vinyl & Carpet" },
  { value: "tile-adhesive", label: "Tile Adhesive & Grout" },
  // PAINT & FINISHES
  { value: "paint", label: "Paint & Finishes" },
  { value: "emulsion-paint", label: "Emulsion Paint" },
  { value: "exterior-paint", label: "Exterior Paint" },
  { value: "varnish", label: "Varnish & Wood Finish" },
  { value: "primers", label: "Primers & Putty" },
  // WALL & CEILING
  { value: "gypsum", label: "Gypsum & Ceiling" },
  { value: "insulation", label: "Insulation Materials" },
  { value: "wall-cladding", label: "Wall Cladding" },
  // HARDWARE & FASTENERS
  { value: "hardware", label: "Hardware & Fasteners" },
  { value: "nails-screws", label: "Nails & Screws" },
  { value: "bolts-nuts", label: "Bolts & Nuts" },
  { value: "locks-hinges", label: "Locks & Hinges" },
  { value: "wire-mesh", label: "Wire & Mesh" },
  // TOOLS & EQUIPMENT
  { value: "tools", label: "Tools & Equipment" },
  { value: "power-tools", label: "Power Tools" },
  { value: "hand-tools", label: "Hand Tools" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "scaffolding", label: "Scaffolding & Ladders" },
  // ADHESIVES & SEALANTS
  { value: "adhesives", label: "Adhesives & Sealants" },
  { value: "epoxy", label: "Epoxy & Grout" },
  // FENCING & SECURITY
  { value: "fencing", label: "Fencing Materials" },
  { value: "gates", label: "Gates & Security" },
  // LANDSCAPING & OUTDOOR
  { value: "paving", label: "Paving & Cabro" },
  { value: "drainage", label: "Drainage Systems" },
  { value: "garden", label: "Garden Materials" },
  // KITCHEN & BUILT-IN
  { value: "kitchen", label: "Kitchen Fittings" },
  { value: "countertops", label: "Countertops" },
  { value: "wardrobes", label: "Wardrobes & Closets" },
  // HVAC & VENTILATION
  { value: "hvac", label: "HVAC & Ventilation" },
  { value: "air-conditioning", label: "Air Conditioning" },
  // FIRE SAFETY
  { value: "fire-safety", label: "Fire Safety Equipment" },
  { value: "fire-doors", label: "Fire Doors & Alarms" },
  // SPECIALTY MATERIALS
  { value: "damp-proofing", label: "Damp Proofing" },
  { value: "admixtures", label: "Concrete Admixtures" },
  { value: "reinforcement-acc", label: "Reinforcement Accessories" },
  // MISCELLANEOUS
  { value: "geotextiles", label: "Geotextiles & Covers" },
  { value: "mixed", label: "Mixed Materials" },
  { value: "other", label: "Other Materials" }
];

// Budget ranges in Kenyan Shillings
const BUDGET_RANGES = [
  { value: "under-5000", label: "Under KES 5,000" },
  { value: "5000-10000", label: "KES 5,000 - 10,000" },
  { value: "10000-25000", label: "KES 10,000 - 25,000" },
  { value: "25000-50000", label: "KES 25,000 - 50,000" },
  { value: "50000-100000", label: "KES 50,000 - 100,000" },
  { value: "over-100000", label: "Over KES 100,000" }
];

// Vehicle types with descriptions
const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle (Boda Boda) - Small items" },
  { value: "tuk-tuk", label: "Tuk-Tuk - Light loads up to 500kg" },
  { value: "pickup", label: "Pickup Truck - Up to 1 ton" },
  { value: "van", label: "Van - Enclosed delivery" },
  { value: "truck-small", label: "Small Truck (Canter) - 2-5 tons" },
  { value: "truck-medium", label: "Medium Truck - 5-10 tons" },
  { value: "truck-large", label: "Large Truck (Fuso) - 10-20 tons" },
  { value: "trailer", label: "Trailer - Heavy loads 20+ tons" }
];

const DeliveryRequest = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gettingPickupLocation, setGettingPickupLocation] = useState(false);
  const [gettingDeliveryLocation, setGettingDeliveryLocation] = useState(false);
  const [copiedPickup, setCopiedPickup] = useState(false);
  const [copiedDelivery, setCopiedDelivery] = useState(false);
  const [formData, setFormData] = useState({
    pickupAddress: "",
    pickupCoordinates: "",
    deliveryAddress: "",
    deliveryCoordinates: "",
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

  // Get current location coordinates
  const getCurrentLocation = (type: 'pickup' | 'delivery') => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services"
      });
      return;
    }

    if (type === 'pickup') {
      setGettingPickupLocation(true);
    } else {
      setGettingDeliveryLocation(true);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        if (type === 'pickup') {
          setFormData(prev => ({ ...prev, pickupCoordinates: coords }));
          setGettingPickupLocation(false);
        } else {
          setFormData(prev => ({ ...prev, deliveryCoordinates: coords }));
          setGettingDeliveryLocation(false);
        }
        toast({
          title: "📍 Location captured!",
          description: `Coordinates: ${coords}`
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (type === 'pickup') {
          setGettingPickupLocation(false);
        } else {
          setGettingDeliveryLocation(false);
        }
        toast({
          variant: "destructive",
          title: "Location Error",
          description: error.message || "Failed to get your location. Please enter coordinates manually."
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Copy coordinates to clipboard
  const copyCoordinates = (coords: string, type: 'pickup' | 'delivery') => {
    navigator.clipboard.writeText(coords).then(() => {
      if (type === 'pickup') {
        setCopiedPickup(true);
        setTimeout(() => setCopiedPickup(false), 2000);
      } else {
        setCopiedDelivery(true);
        setTimeout(() => setCopiedDelivery(false), 2000);
      }
      toast({
        title: "Copied!",
        description: "Coordinates copied to clipboard"
      });
    });
  };

  // Parse coordinates from various formats
  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    // Try format: "lat, lng" or "lat,lng"
    const commaFormat = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (commaFormat) {
      return { lat: parseFloat(commaFormat[1]), lng: parseFloat(commaFormat[2]) };
    }
    
    // Try Google Maps URL format
    const gmapsFormat = input.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (gmapsFormat) {
      return { lat: parseFloat(gmapsFormat[1]), lng: parseFloat(gmapsFormat[2]) };
    }

    // Try format with degrees: "1.2345°S, 36.7890°E"
    const degreeFormat = input.match(/(-?\d+\.?\d*)°?\s*([NS])?\s*,?\s*(-?\d+\.?\d*)°?\s*([EW])?/i);
    if (degreeFormat) {
      let lat = parseFloat(degreeFormat[1]);
      let lng = parseFloat(degreeFormat[3]);
      if (degreeFormat[2]?.toUpperCase() === 'S') lat = -lat;
      if (degreeFormat[4]?.toUpperCase() === 'W') lng = -lng;
      return { lat, lng };
    }

    return null;
  };

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
    
    // Pickup: require either address or coordinates
    if (!formData.pickupAddress.trim() && !formData.pickupCoordinates.trim()) {
      newErrors.pickupAddress = "Pickup address or coordinates required";
    }
    
    // Validate pickup coordinates format if provided
    if (formData.pickupCoordinates.trim() && !parseCoordinates(formData.pickupCoordinates)) {
      newErrors.pickupCoordinates = "Invalid coordinates format. Use: lat, lng (e.g., -1.2921, 36.8219)";
    }
    
    // Delivery: require either address or coordinates
    if (!formData.deliveryAddress.trim() && !formData.deliveryCoordinates.trim()) {
      newErrors.deliveryAddress = "Delivery address or coordinates required";
    }
    
    // Validate delivery coordinates format if provided
    if (formData.deliveryCoordinates.trim() && !parseCoordinates(formData.deliveryCoordinates)) {
      newErrors.deliveryCoordinates = "Invalid coordinates format. Use: lat, lng (e.g., -1.2921, 36.8219)";
    }
    
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

      // Build full address with coordinates if provided
      let fullPickupAddress = formData.pickupAddress.trim();
      if (formData.pickupCoordinates.trim()) {
        fullPickupAddress = fullPickupAddress 
          ? `${fullPickupAddress} [Coords: ${formData.pickupCoordinates.trim()}]`
          : `GPS: ${formData.pickupCoordinates.trim()}`;
      }
      
      let fullDeliveryAddress = formData.deliveryAddress.trim();
      if (formData.deliveryCoordinates.trim()) {
        fullDeliveryAddress = fullDeliveryAddress
          ? `${fullDeliveryAddress} [Coords: ${formData.deliveryCoordinates.trim()}]`
          : `GPS: ${formData.deliveryCoordinates.trim()}`;
      }

      // Create delivery request with enhanced validation
      const requestData = {
        builder_id: profile.id,
        pickup_address: fullPickupAddress,
        delivery_address: fullDeliveryAddress,
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
            pickup_address: fullPickupAddress,
            delivery_address: fullDeliveryAddress,
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
        pickupCoordinates: "",
        deliveryAddress: "",
        deliveryCoordinates: "",
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
                  <SelectContent className="max-h-[300px]">
                    {MATERIAL_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
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
                    {VEHICLE_TYPES.map((vehicle) => (
                      <SelectItem key={vehicle.value} value={vehicle.value}>
                        {vehicle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pickup Location Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
              <h3 className="font-semibold flex items-center gap-2 text-green-700">
                <MapPin className="h-5 w-5" />
                Pickup Location *
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Address / Description</Label>
                <Textarea
                  id="pickupAddress"
                  placeholder="e.g., Mombasa Road, Industrial Area, Near Sameer Park..."
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                  className={errors.pickupAddress ? "border-red-500" : ""}
                />
                {errors.pickupAddress && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.pickupAddress}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupCoordinates" className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  GPS Coordinates (optional but recommended)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="pickupCoordinates"
                    placeholder="e.g., -1.2921, 36.8219 or paste Google Maps link"
                    value={formData.pickupCoordinates}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickupCoordinates: e.target.value }))}
                    className={`flex-1 ${errors.pickupCoordinates ? "border-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => getCurrentLocation('pickup')}
                    disabled={gettingPickupLocation}
                    title="Get current location"
                  >
                    {gettingPickupLocation ? (
                      <LoadingSpinner className="h-4 w-4" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                  {formData.pickupCoordinates && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyCoordinates(formData.pickupCoordinates, 'pickup')}
                      title="Copy coordinates"
                    >
                      {copiedPickup ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {errors.pickupCoordinates && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.pickupCoordinates}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Click the location button to auto-detect your GPS, or paste coordinates from Google Maps
                </p>
              </div>
            </div>

            {/* Delivery Location Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
              <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                <MapPin className="h-5 w-5" />
                Delivery Location *
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Address / Description</Label>
                <Textarea
                  id="deliveryAddress"
                  placeholder="e.g., Plot 123, Kiambu Road, opposite Ridgeways Mall..."
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className={errors.deliveryAddress ? "border-red-500" : ""}
                />
                {errors.deliveryAddress && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.deliveryAddress}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryCoordinates" className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  GPS Coordinates (optional but recommended)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="deliveryCoordinates"
                    placeholder="e.g., -1.2345, 36.7890 or paste Google Maps link"
                    value={formData.deliveryCoordinates}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryCoordinates: e.target.value }))}
                    className={`flex-1 ${errors.deliveryCoordinates ? "border-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => getCurrentLocation('delivery')}
                    disabled={gettingDeliveryLocation}
                    title="Get current location"
                  >
                    {gettingDeliveryLocation ? (
                      <LoadingSpinner className="h-4 w-4" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                  {formData.deliveryCoordinates && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyCoordinates(formData.deliveryCoordinates, 'delivery')}
                      title="Copy coordinates"
                    >
                      {copiedDelivery ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {errors.deliveryCoordinates && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.deliveryCoordinates}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  💡 Tip: For construction sites without addresses, GPS coordinates help drivers find the exact location
                </p>
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
              <Label htmlFor="budgetRange">Budget Range (Delivery Cost)</Label>
              <Select
                value={formData.budgetRange}
                onValueChange={(value) => setFormData(prev => ({ ...prev, budgetRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
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