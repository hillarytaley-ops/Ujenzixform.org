import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, MapPin, Building2, Star, Users, MessageSquare } from "lucide-react";
import { UserProfile } from "@/types/userProfile";
import { RatingDisplay } from "./RatingDisplay";
import { useEffect, useState } from "react";
import { getSafeImageUrl } from "@/utils/storage";

interface BuilderCardProps {
  builder: UserProfile & {
    company_name?: string;
    phone?: string;
    email?: string;
    rating?: number;
    total_projects?: number;
    location?: string;
    specialties?: string[];
    description?: string;
    avatar_url?: string;
    company_logo_url?: string;
    reviews?: any[];
    total_reviews?: number;
  };
  onContactClick?: (builder: BuilderCardProps['builder']) => void;
  onViewProfile?: (builder: BuilderCardProps['builder']) => void;
  onReviewClick?: (builder: BuilderCardProps['builder']) => void;
}

export const BuilderCard = ({ builder, onContactClick, onViewProfile, onReviewClick }: BuilderCardProps) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const displayImage = builder.user_type === 'company' ? builder.company_logo_url : builder.avatar_url;
  const initials = (builder.company_name || builder.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-2 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-14 w-14 border-2 border-muted group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300">
              <AvatarImage src={imgSrc || displayImage} alt={builder.company_name || builder.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold group-hover:bg-primary/20">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {builder.company_name || builder.full_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {builder.user_type === 'company' ? 'Company' : 'Individual'}
                </Badge>
                {builder.is_professional && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    Professional
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {builder.rating && (
            <RatingDisplay 
              averageRating={builder.rating}
              totalReviews={builder.total_reviews || 0}
              size="sm"
              className="flex-shrink-0"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {builder.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {builder.description}
          </p>
        )}

        {builder.specialties && builder.specialties.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Specialties</h4>
            <div className="flex flex-wrap gap-1">
              {builder.specialties.slice(0, 3).map((specialty) => (
                <Badge key={specialty} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {builder.specialties.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{builder.specialties.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          {builder.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{builder.location}</span>
            </div>
          )}
          
          {builder.total_projects && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{builder.total_projects} completed projects</span>
            </div>
          )}

          {builder.user_type === 'company' && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Company</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:scale-105 transition-transform duration-200"
            onClick={() => onContactClick?.(builder)}
          >
            <Phone className="h-4 w-4 mr-1" />
            Contact
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:scale-105 transition-transform duration-200"
            onClick={() => onReviewClick?.(builder)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Review
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 hover:scale-105 transition-transform duration-200"
            onClick={() => onViewProfile?.(builder)}
          >
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getSafeImageUrl(displayImage || undefined, 600);
      if (mounted) setImgSrc(u);
    })();
    return () => { mounted = false };
  }, [displayImage]);