import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, MapPin, DollarSign, Calendar, Award } from 'lucide-react';

interface AdvancedFiltersProps {
  onFiltersChange: (filters: any) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ onFiltersChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    specialties: [] as string[],
    rating: [0],
    priceRange: [0, 10000000],
    projectSize: '',
    availability: '',
    experience: [0],
    certifications: [] as string[],
    projectType: ''
  });

  const KENYAN_COUNTIES = [
    "All Counties", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
    "Kitale", "Garissa", "Nyeri", "Machakos", "Meru", "Kericho", "Embu", "Migori", "Kakamega"
  ];

  const SPECIALTIES = [
    "Residential Construction", "Commercial Construction", "Road Construction",
    "Bridge Construction", "Electrical Installation", "Plumbing Systems", "Roofing",
    "Interior Design", "Landscaping", "Renovation & Remodeling", "Concrete Works"
  ];

  const CERTIFICATIONS = [
    "NCA License", "KEBS Certified", "ISO 9001", "Professional Insurance", 
    "Safety Certification", "Environmental Compliance"
  ];

  const PROJECT_SIZES = [
    "Small (Under KES 1M)", "Medium (KES 1M - 5M)", "Large (KES 5M - 20M)", "Enterprise (Over KES 20M)"
  ];

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      location: '',
      specialties: [],
      rating: [0],
      priceRange: [0, 10000000],
      projectSize: '',
      availability: '',
      experience: [0],
      certifications: [],
      projectType: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less' : 'More'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Search Builders</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Name, company, or specialty..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select county..." />
              </SelectTrigger>
              <SelectContent>
                {KENYAN_COUNTIES.map((county) => (
                  <SelectItem key={county} value={county}>{county}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Rating and Experience */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Minimum Rating: {filters.rating[0]} stars</Label>
                <Slider
                  value={filters.rating}
                  onValueChange={(value) => handleFilterChange('rating', value)}
                  max={5}
                  min={0}
                  step={0.5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Minimum Experience: {filters.experience[0]} years</Label>
                <Slider
                  value={filters.experience}
                  onValueChange={(value) => handleFilterChange('experience', value)}
                  max={30}
                  min={0}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <Label>Budget Range: KES {filters.priceRange[0].toLocaleString()} - KES {filters.priceRange[1].toLocaleString()}</Label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => handleFilterChange('priceRange', value)}
                max={50000000}
                min={0}
                step={100000}
                className="mt-2"
              />
            </div>

            {/* Project Size and Type */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Project Size</Label>
                <Select value={filters.projectSize} onValueChange={(value) => handleFilterChange('projectSize', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Availability</Label>
                <Select value={filters.availability} onValueChange={(value) => handleFilterChange('availability', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Available Immediately</SelectItem>
                    <SelectItem value="week">Within 1 Week</SelectItem>
                    <SelectItem value="month">Within 1 Month</SelectItem>
                    <SelectItem value="flexible">Flexible Timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <Label>Specialties</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                {SPECIALTIES.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty}
                      checked={filters.specialties.includes(specialty)}
                      onCheckedChange={(checked) => {
                        const newSpecialties = checked
                          ? [...filters.specialties, specialty]
                          : filters.specialties.filter(s => s !== specialty);
                        handleFilterChange('specialties', newSpecialties);
                      }}
                    />
                    <Label htmlFor={specialty} className="text-sm">{specialty}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label>Required Certifications</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {CERTIFICATIONS.map((cert) => (
                  <div key={cert} className="flex items-center space-x-2">
                    <Checkbox
                      id={cert}
                      checked={filters.certifications.includes(cert)}
                      onCheckedChange={(checked) => {
                        const newCerts = checked
                          ? [...filters.certifications, cert]
                          : filters.certifications.filter(c => c !== cert);
                        handleFilterChange('certifications', newCerts);
                      }}
                    />
                    <Label htmlFor={cert} className="text-sm">{cert}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Active Filters Display */}
        {(filters.specialties.length > 0 || filters.certifications.length > 0) && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleFilterChange('specialties', filters.specialties.filter(s => s !== specialty))}
                  />
                </Badge>
              ))}
              {filters.certifications.map((cert) => (
                <Badge key={cert} variant="outline" className="text-xs">
                  {cert}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleFilterChange('certifications', filters.certifications.filter(c => c !== cert))}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
















