import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";

export interface BuilderFilters {
  search: string;
  location: string;
  specialties: string[];
  rating: number;
  professionalOnly: boolean;
  companyOnly: boolean;
}

interface BuilderFiltersProps {
  filters: BuilderFilters;
  onFiltersChange: (filters: BuilderFilters) => void;
}

const KENYAN_COUNTIES = [
  "All Counties",
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
  "Kitale", "Garissa", "Nyeri", "Machakos", "Meru", "Kericho", "Embu",
  "Migori", "Kakamega", "Lamu", "Naivasha", "Nanyuki", "Voi", "Kilifi",
  "Lodwar", "Wajir", "Marsabit", "Moyale", "Chuka", "Kiambu", "Kajiado",
  "Murang'a", "Kirinyaga", "Nyandarua", "Laikipia", "Samburu", "Trans Nzoia",
  "Uasin Gishu", "Elgeyo Marakwet", "Nandi", "Baringo", "West Pokot", 
  "Turkana", "Bomet", "Narok", "Makueni", "Kitui", "Mwingi", "Tharaka Nithi", 
  "Isiolo", "Mandera"
];

const BUILDER_SPECIALTIES = [
  "All Specialties",
  "Residential Construction",
  "Commercial Construction", 
  "Road Construction",
  "Bridge Construction",
  "Electrical Installation",
  "Plumbing Systems",
  "Roofing",
  "Interior Design",
  "Landscaping",
  "Renovation & Remodeling",
  "Concrete Works",
  "Steel Construction",
  "HVAC Systems",
  "Solar Installation",
  "Water Systems",
  "Drainage Systems",
  "Foundation Work",
  "Masonry",
  "Carpentry",
  "Painting & Finishing"
];

export const BuilderFilters = ({ filters, onFiltersChange }: BuilderFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleLocationChange = (value: string) => {
    onFiltersChange({ ...filters, location: value });
  };

  const handleSpecialtyToggle = (specialty: string) => {
    const currentSpecialties = filters.specialties || [];
    const newSpecialties = currentSpecialties.includes(specialty)
      ? currentSpecialties.filter(s => s !== specialty)
      : [...currentSpecialties, specialty];
    
    onFiltersChange({ ...filters, specialties: newSpecialties });
  };

  const handleRatingChange = (value: string) => {
    onFiltersChange({ ...filters, rating: parseInt(value) || 0 });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      location: "All Counties",
      specialties: [],
      rating: 0,
      professionalOnly: false,
      companyOnly: false
    });
  };

  const hasActiveFilters = filters.search || 
    (filters.location && filters.location !== "All Counties") ||
    filters.specialties.length > 0 ||
    filters.rating > 0 ||
    filters.professionalOnly ||
    filters.companyOnly;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Find Builders
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Less" : "More"} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Builders</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name, company, or specialties..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={filters.location || "All Counties"} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select county..." />
            </SelectTrigger>
            <SelectContent>
              {KENYAN_COUNTIES.map((county) => (
                <SelectItem key={county} value={county}>
                  {county}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isExpanded && (
          <>
            {/* Rating */}
            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <Select value={filters.rating.toString()} onValueChange={handleRatingChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="5">5 Stars Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Builder Type */}
            <div className="space-y-3">
              <Label>Builder Type</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="professional-only"
                    checked={filters.professionalOnly}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, professionalOnly: !!checked })
                    }
                  />
                  <Label htmlFor="professional-only" className="text-sm font-normal">
                    Professional Builders Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="company-only"
                    checked={filters.companyOnly}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, companyOnly: !!checked })
                    }
                  />
                  <Label htmlFor="company-only" className="text-sm font-normal">
                    Companies Only
                  </Label>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="space-y-3">
              <Label>Specialties</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {BUILDER_SPECIALTIES.slice(1).map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty}
                      checked={filters.specialties.includes(specialty)}
                      onCheckedChange={() => handleSpecialtyToggle(specialty)}
                    />
                    <Label htmlFor={specialty} className="text-xs font-normal">
                      {specialty}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};