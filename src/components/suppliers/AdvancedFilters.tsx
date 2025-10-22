import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, MapPin, Star, Shield, Truck, Filter, X } from "lucide-react";
import { SupplierFilters as SupplierFiltersType } from "@/types/supplier";

interface AdvancedFiltersProps {
  filters: SupplierFiltersType & {
    deliveryRadius?: number;
    priceRange?: [number, number];
    hasDelivery?: boolean;
  };
  onFiltersChange: (filters: any) => void;
  resultCount: number;
}

export const AdvancedFilters = ({ filters, onFiltersChange, resultCount }: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    deliveryRadius: filters.deliveryRadius || 50,
    priceRange: filters.priceRange || [0, 10000],
    hasDelivery: filters.hasDelivery || false,
    ...filters
  });

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const resetFilters = () => {
    const resetState = {
      search: "",
      category: "All Categories",
      location: "",
      rating: 0,
      verified: null,
      deliveryRadius: 50,
      priceRange: [0, 10000] as [number, number],
      hasDelivery: false,
    };
    setLocalFilters(resetState);
    onFiltersChange(resetState);
  };

  const updateFilter = (key: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = () => {
    return (
      localFilters.search ||
      localFilters.category !== "All Categories" ||
      localFilters.location ||
      localFilters.rating > 0 ||
      localFilters.verified !== null ||
      localFilters.deliveryRadius !== 50 ||
      localFilters.priceRange[0] > 0 ||
      localFilters.priceRange[1] < 10000 ||
      localFilters.hasDelivery
    );
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Advanced Filters
                {hasActiveFilters() && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {resultCount} supplier{resultCount !== 1 ? 's' : ''} found
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Basic Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Suppliers</Label>
                <Input
                  id="search"
                  placeholder="Company name, materials..."
                  value={localFilters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={localFilters.category} onValueChange={(value) => updateFilter('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Categories">All Categories</SelectItem>
                    <SelectItem value="Cement">Cement</SelectItem>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                    <SelectItem value="Tiles">Tiles</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Aggregates">Aggregates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="City, County..."
                  value={localFilters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating Filter */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Minimum Rating: {localFilters.rating}/5
                </Label>
                <Slider
                  value={[localFilters.rating]}
                  onValueChange={(value) => updateFilter('rating', value[0])}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Any Rating</span>
                  <span>5 Stars</span>
                </div>
              </div>

              {/* Delivery Radius */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Delivery Radius: {localFilters.deliveryRadius} km
                </Label>
                <Slider
                  value={[localFilters.deliveryRadius]}
                  onValueChange={(value) => updateFilter('deliveryRadius', value[0])}
                  max={200}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label>
                Price Range: KES {localFilters.priceRange[0].toLocaleString()} - {localFilters.priceRange[1].toLocaleString()}
              </Label>
              <Slider
                value={localFilters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                max={10000}
                min={0}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>KES 0</span>
                <span>KES 10,000+</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="verified"
                  checked={localFilters.verified === true}
                  onCheckedChange={(checked) => updateFilter('verified', checked ? true : null)}
                />
                <Label htmlFor="verified" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Verified Only
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="delivery"
                  checked={localFilters.hasDelivery}
                  onCheckedChange={(checked) => updateFilter('hasDelivery', checked)}
                />
                <Label htmlFor="delivery" className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Offers Delivery
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters} className="flex items-center gap-1">
                <X className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};