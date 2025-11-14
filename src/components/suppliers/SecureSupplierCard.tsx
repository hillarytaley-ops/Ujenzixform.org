import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Package, Store, Shield, Lock, MessageSquare } from "lucide-react";
import { Supplier } from "@/types/supplier";
import { SupplierRatingDisplay } from "./SupplierRatingDisplay";

interface SecureSupplierCardProps {
  supplier: Supplier | any;
  onViewCatalog: (supplier: any) => void;
  onRequestQuote: (supplier: any) => void;
  onReviewSupplier?: (supplier: any) => void;
  isAuthenticated?: boolean;
  userRole?: string;
}

export const SecureSupplierCard = ({ 
  supplier, 
  onViewCatalog, 
  onRequestQuote,
  onReviewSupplier,
  isAuthenticated = false,
  userRole
}: SecureSupplierCardProps) => {
  const initials = supplier.company_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';
  
  // Secure contact info display based on new security model
  const displayContactInfo = () => {
    if (!isAuthenticated) {
      return (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {supplier.contact_info_status || 'Sign up to view contact information'}
          </p>
        </div>
      );
    }
    
    // Show status based on new secure data structure
    return (
      <div className="mt-2 pt-2 border-t space-y-1">
        <div className="text-xs text-primary font-medium flex items-center gap-1">
          <Shield className="h-3 w-3 text-blue-600" />
          Business Contact Status
        </div>
        <p className="text-xs text-muted-foreground">
          {supplier.contact_info_status || 'Contact available to registered users'}
        </p>
        {supplier.business_verified && (
          <p className="text-xs text-green-600 font-medium">
            ✓ Verified Business Partner
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-muted rounded-lg flex-shrink-0">
            <AvatarImage src={supplier.company_logo_url} alt={supplier.company_name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold rounded-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate flex items-center gap-2">
              {supplier.company_name}
              {supplier.is_verified && (
                <Shield className="h-4 w-4 text-green-600" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Business Location</span>
            </CardDescription>
            {displayContactInfo()}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {supplier.is_verified && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                Verified
              </Badge>
            )}
            {supplier.business_verified && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Business Partner
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Display */}
        {supplier.rating && (
          <SupplierRatingDisplay 
            averageRating={supplier.rating}
            totalReviews={supplier.total_reviews || 0}
            size="sm"
            className="mb-2"
          />
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            {supplier.materials_offered?.length || 0} products
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            {supplier.business_type || 'Supplier'}
          </div>
        </div>

        {supplier.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {supplier.specialties.slice(0, 3).map((specialty: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {supplier.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{supplier.specialties.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onRequestQuote(supplier)}
          >
            <Package className="h-4 w-4 mr-1" />
            Quote
          </Button>
          {onReviewSupplier && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onReviewSupplier(supplier)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onViewCatalog(supplier)}
          >
            <Store className="h-4 w-4 mr-1" />
            Catalog
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
