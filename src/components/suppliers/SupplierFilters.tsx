import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Star } from "lucide-react";
import { SupplierFilters as SupplierFiltersType, MATERIAL_CATEGORIES } from "@/types/supplier";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SupplierFiltersProps {
  filters: SupplierFiltersType;
  onFiltersChange: (filters: SupplierFiltersType) => void;
  resultCount: number;
}

export const SupplierFilters = ({
  filters,
  onFiltersChange,
  resultCount,
}: SupplierFiltersProps) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value });
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ ...filters, rating: rating === filters.rating ? 0 : rating });
  };

  const handleVerifiedChange = (verified: boolean | null) => {
    onFiltersChange({ ...filters, verified });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      category: "All Categories", 
      location: "",
      rating: 0,
      verified: null,
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.category !== "All Categories" || 
    filters.rating > 0 || 
    filters.verified !== null;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers by name, specialty, or materials..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Category Filter */}
          <Select value={filters.category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Rating Filter */}
          <div className="flex items-center gap-1 border rounded-lg px-3 py-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Min:</span>
            {[1, 2, 3, 4].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingChange(rating)}
                className={`p-1 rounded ${
                  filters.rating >= rating 
                    ? "text-yellow-500" 
                    : "text-muted-foreground hover:text-yellow-400"
                }`}
              >
                <Star className={`h-3 w-3 ${filters.rating >= rating ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>

          {/* Advanced Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                    {[
                      filters.search && "search",
                      filters.category !== "All Categories" && "category",
                      filters.rating > 0 && "rating",
                      filters.verified !== null && "verified"
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Verification Status</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-verification"
                      checked={filters.verified === null}
                      onCheckedChange={() => handleVerifiedChange(null)}
                    />
                    <Label htmlFor="all-verification" className="text-sm">All suppliers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified-only"
                      checked={filters.verified === true}
                      onCheckedChange={() => handleVerifiedChange(true)}
                    />
                    <Label htmlFor="verified-only" className="text-sm">Verified only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unverified-only"
                      checked={filters.verified === false}
                      onCheckedChange={() => handleVerifiedChange(false)}
                    />
                    <Label htmlFor="unverified-only" className="text-sm">Unverified only</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {resultCount} supplier{resultCount !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
};