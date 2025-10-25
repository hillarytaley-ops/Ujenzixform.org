import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calculator, 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  DollarSign,
  Route,
  Fuel,
  User,
  Building,
  TrendingUp,
  Info,
  Zap
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface DeliveryCalculation {
  baseRate: number;
  distanceRate: number;
  weightRate: number;
  urgencyMultiplier: number;
  providerTypeMultiplier: number;
  totalDistance: number;
  totalWeight: number;
  estimatedTime: number;
  fuelCost: number;
  subtotal: number;
  taxes: number;
  total: number;
}

interface CostBreakdown {
  baseCost: number;
  distanceCost: number;
  weightCost: number;
  urgencyCost: number;
  providerTypeCost: number;
  fuelCost: number;
  taxes: number;
  total: number;
}

interface DeliveryCostCalculatorProps {
  onCostCalculated?: (cost: number, breakdown: CostBreakdown) => void;
  embedded?: boolean;
}

export const DeliveryCostCalculator: React.FC<DeliveryCostCalculatorProps> = ({ 
  onCostCalculated,
  embedded = false 
}) => {
  const [formData, setFormData] = useState({
    pickupLocation: '',
    deliveryLocation: '',
    materialType: '',
    weight: 0,
    distance: 0,
    urgency: 'standard',
    providerType: 'individual',
    vehicleType: 'van',
    deliveryTime: 'business_hours'
  });

  const [calculation, setCalculation] = useState<DeliveryCalculation | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  // Pricing rates (in KES)
  const pricingRates = {
    individual: {
      baseRate: 500,
      perKmRate: 50,
      perKgRate: 10,
      hourlyRate: 800
    },
    company: {
      baseRate: 800,
      perKmRate: 80,
      perKgRate: 15,
      hourlyRate: 1200
    }
  };

  const urgencyMultipliers = {
    standard: 1.0,
    urgent: 1.5,
    emergency: 2.0
  };

  const vehicleMultipliers = {
    motorcycle: 0.7,
    van: 1.0,
    pickup: 1.2,
    truck: 1.8,
    trailer: 2.5
  };

  const timeMultipliers = {
    business_hours: 1.0,
    after_hours: 1.3,
    weekend: 1.5,
    holiday: 2.0
  };

  useEffect(() => {
    if (formData.distance > 0 && formData.weight > 0) {
      calculateCost();
    }
  }, [formData]);

  const calculateCost = async () => {
    try {
      setIsCalculating(true);

      const providerRates = pricingRates[formData.providerType as keyof typeof pricingRates];
      const urgencyMultiplier = urgencyMultipliers[formData.urgency as keyof typeof urgencyMultipliers];
      const vehicleMultiplier = vehicleMultipliers[formData.vehicleType as keyof typeof vehicleMultipliers];
      const timeMultiplier = timeMultipliers[formData.deliveryTime as keyof typeof timeMultipliers];

      // Calculate individual components
      const baseCost = providerRates.baseRate;
      const distanceCost = formData.distance * providerRates.perKmRate;
      const weightCost = formData.weight * providerRates.perKgRate;
      
      // Apply multipliers
      const subtotal = (baseCost + distanceCost + weightCost) * vehicleMultiplier;
      const urgencyCost = subtotal * (urgencyMultiplier - 1);
      const timeCost = subtotal * (timeMultiplier - 1);
      
      // Estimated fuel cost (rough calculation)
      const fuelCost = formData.distance * 12; // KES 12 per km average
      
      // Calculate total before tax
      const beforeTax = subtotal + urgencyCost + timeCost + fuelCost;
      
      // Add 16% VAT
      const taxes = beforeTax * 0.16;
      const total = beforeTax + taxes;

      const costBreakdown: CostBreakdown = {
        baseCost,
        distanceCost,
        weightCost,
        urgencyCost,
        providerTypeCost: subtotal * (formData.providerType === 'company' ? 0.6 : 0),
        fuelCost,
        taxes,
        total
      };

      const calculationResult: DeliveryCalculation = {
        baseRate: providerRates.baseRate,
        distanceRate: providerRates.perKmRate,
        weightRate: providerRates.perKgRate,
        urgencyMultiplier,
        providerTypeMultiplier: vehicleMultiplier,
        totalDistance: formData.distance,
        totalWeight: formData.weight,
        estimatedTime: Math.ceil(formData.distance / 40 * 60), // Assuming 40km/h average speed
        fuelCost,
        subtotal: beforeTax,
        taxes,
        total
      };

      setCalculation(calculationResult);
      setBreakdown(costBreakdown);
      
      onCostCalculated?.(total, costBreakdown);

    } catch (error) {
      console.error('Error calculating cost:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate delivery cost',
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const CostBreakdownCard = () => (
    breakdown && (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of delivery costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Base Rate</span>
              <span>KES {breakdown.baseCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Distance ({formData.distance}km)</span>
              <span>KES {breakdown.distanceCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Weight ({formData.weight}kg)</span>
              <span>KES {breakdown.weightCost.toLocaleString()}</span>
            </div>
            {breakdown.urgencyCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Urgency Surcharge</span>
                <span>KES {breakdown.urgencyCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Fuel Cost</span>
              <span>KES {breakdown.fuelCost.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>KES {(breakdown.total - breakdown.taxes).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (16%)</span>
                <span>KES {breakdown.taxes.toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Cost</span>
                <span className="text-primary">KES {breakdown.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {calculation && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Delivery Estimate</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Estimated Time: {calculation.estimatedTime} minutes</div>
                  <div>Provider Type: {formData.providerType === 'individual' ? 'Private Provider' : 'Delivery Company'}</div>
                  <div>Vehicle: {formData.vehicleType}</div>
                  <div>Urgency: {formData.urgency}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  );

  if (embedded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <Input
                type="number"
                value={formData.distance}
                onChange={(e) => updateFormData('distance', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={formData.weight}
                onChange={(e) => updateFormData('weight', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          
          {breakdown && (
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                KES {breakdown.total.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Estimated Total Cost</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6" />
          Delivery Cost Calculator
        </h2>
        <p className="text-muted-foreground">
          Get instant cost estimates for your delivery requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <CardDescription>
              Enter your delivery requirements for cost estimation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Details
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Pickup Location</Label>
                  <Input
                    value={formData.pickupLocation}
                    onChange={(e) => updateFormData('pickupLocation', e.target.value)}
                    placeholder="Enter pickup address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Delivery Location</Label>
                  <Input
                    value={formData.deliveryLocation}
                    onChange={(e) => updateFormData('deliveryLocation', e.target.value)}
                    placeholder="Enter delivery address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Distance (km)</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.distance]}
                      onValueChange={(value) => updateFormData('distance', value[0])}
                      max={200}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 km</span>
                      <span className="font-medium">{formData.distance} km</span>
                      <span>200 km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Material Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Material Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Type</Label>
                  <Select value={formData.materialType} onValueChange={(value) => updateFormData('materialType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cement">Cement</SelectItem>
                      <SelectItem value="steel">Steel Bars</SelectItem>
                      <SelectItem value="blocks">Building Blocks</SelectItem>
                      <SelectItem value="sand">Sand</SelectItem>
                      <SelectItem value="gravel">Gravel</SelectItem>
                      <SelectItem value="timber">Timber</SelectItem>
                      <SelectItem value="other">Other Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Total Weight (kg)</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.weight]}
                      onValueChange={(value) => updateFormData('weight', value[0])}
                      max={5000}
                      min={1}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 kg</span>
                      <span className="font-medium">{formData.weight} kg</span>
                      <span>5,000 kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Options */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Service Options
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider Type</Label>
                  <Select value={formData.providerType} onValueChange={(value) => updateFormData('providerType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Private Provider
                        </div>
                      </SelectItem>
                      <SelectItem value="company">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Delivery Company
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={formData.vehicleType} onValueChange={(value) => updateFormData('vehicleType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="pickup">Pickup Truck</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="trailer">Trailer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(value) => updateFormData('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (1-2 days)</SelectItem>
                      <SelectItem value="urgent">Urgent (Same day) +50%</SelectItem>
                      <SelectItem value="emergency">Emergency (< 4 hours) +100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Delivery Time</Label>
                  <Select value={formData.deliveryTime} onValueChange={(value) => updateFormData('deliveryTime', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business_hours">Business Hours</SelectItem>
                      <SelectItem value="after_hours">After Hours +30%</SelectItem>
                      <SelectItem value="weekend">Weekend +50%</SelectItem>
                      <SelectItem value="holiday">Holiday +100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              onClick={calculateCost} 
              disabled={isCalculating || formData.distance === 0 || formData.weight === 0}
              className="w-full"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Cost
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        {breakdown && <CostBreakdownCard />}
      </div>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pricing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                Private Providers
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span>KES {pricingRates.individual.baseRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per KM:</span>
                  <span>KES {pricingRates.individual.perKmRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per KG:</span>
                  <span>KES {pricingRates.individual.perKgRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hourly Rate:</span>
                  <span>KES {pricingRates.individual.hourlyRate}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                Delivery Companies
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span>KES {pricingRates.company.baseRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per KM:</span>
                  <span>KES {pricingRates.company.perKmRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per KG:</span>
                  <span>KES {pricingRates.company.perKgRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hourly Rate:</span>
                  <span>KES {pricingRates.company.hourlyRate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-700">
                <strong>Note:</strong> These are estimated costs based on standard rates. 
                Final pricing may vary based on specific requirements, provider availability, 
                and current market conditions. All prices include 16% VAT.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryCostCalculator;



















