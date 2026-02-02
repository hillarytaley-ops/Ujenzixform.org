import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Filter, X, Star, DollarSign, Clock } from 'lucide-react';
import { KENYAN_COUNTIES, CONSTRUCTION_SPECIALTIES } from '@/data/kenyanBuilders';

interface EnhancedSearchProps {
  onSearchChange: (filters: SearchFilters) => void;
  className?: string;
}

export interface SearchFilters {
  search: string;
  county: string;
  specialty: string;
  priceRange: string;
  availability: string;
  minRating: number;
}

const PRICE_RANGES = [
  { value: 'all', label: 'Any Budget' },
  { value: '0-500K', label: 'Under KES 500K' },
  { value: '500K-2M', label: 'KES 500K - 2M' },
  { value: '2M-10M', label: 'KES 2M - 10M' },
  { value: '10M-50M', label: 'KES 10M - 50M' },
  { value: '50M+', label: 'KES 50M+' }
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'Any Availability' },
  { value: 'Available', label: 'Available Now' },
  { value: 'Busy', label: 'Busy' },
  { value: 'Booking', label: 'Taking Bookings' }
];

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ onSearchChange, className = '' }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    county: '',
    specialty: '',
    priceRange: '',
    availability: '',
    minRating: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onSearchChange(updated);
  };

  const clearFilters = () => {
    const cleared: SearchFilters = {
      search: '',
      county: '',
      specialty: '',
      priceRange: '',
      availability: '',
      minRating: 0
    };
    setFilters(cleared);
    onSearchChange(cleared);
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== 0 && value !== 'all'
  ).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Quick Filters - All in one row on large screens */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch">
        {/* Main Search Bar */}
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search builders, companies, or specialties..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10 pr-4 h-10 text-base w-full"
          />
        </div>

        {/* Quick Filters - All in row with search on large screens */}
        <div className="flex flex-row gap-2 sm:gap-3 overflow-x-auto pb-1 lg:pb-0">
          {/* Location Filter */}
          <div className="flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px]">
            <Select value={filters.county} onValueChange={(value) => updateFilters({ county: value })}>
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="All Counties" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {KENYAN_COUNTIES.map(county => (
                  <SelectItem key={county} value={county}>{county}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specialty Filter */}
          <div className="flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px]">
            <Select value={filters.specialty} onValueChange={(value) => updateFilters({ specialty: value })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {CONSTRUCTION_SPECIALTIES.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-10 px-3 flex-shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Range
                </label>
                <Select value={filters.priceRange} onValueChange={(value) => updateFilters({ priceRange: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Availability
                </label>
                <Select value={filters.availability} onValueChange={(value) => updateFilters({ availability: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Minimum Rating
                </label>
                <Select 
                  value={filters.minRating.toString()} 
                  onValueChange={(value) => updateFilters({ minRating: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ search: '' })}
              />
            </Badge>
          )}
          {filters.county && filters.county !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.county}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ county: '' })}
              />
            </Badge>
          )}
          {filters.specialty && filters.specialty !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.specialty}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ specialty: '' })}
              />
            </Badge>
          )}
          {filters.priceRange && filters.priceRange !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {PRICE_RANGES.find(r => r.value === filters.priceRange)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ priceRange: '' })}
              />
            </Badge>
          )}
          {filters.availability && filters.availability !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {AVAILABILITY_OPTIONS.find(o => o.value === filters.availability)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ availability: '' })}
              />
            </Badge>
          )}
          {filters.minRating > 0 && (
            <Badge variant="secondary" className="gap-1">
              {filters.minRating}+ Stars
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ minRating: 0 })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
