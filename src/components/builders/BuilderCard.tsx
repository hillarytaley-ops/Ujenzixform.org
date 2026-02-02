import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, MapPin, Building2, Star, Users, MessageSquare, CheckCircle2, Briefcase } from "lucide-react";
import { UserProfile } from "@/types/userProfile";
import { RatingDisplay } from "./RatingDisplay";

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
    cover_photo_url?: string;
    reviews?: any[];
    total_reviews?: number;
    years_experience?: number;
    is_verified?: boolean;
  };
  onContactClick?: (builder: BuilderCardProps['builder']) => void;
  onViewProfile?: (builder: BuilderCardProps['builder']) => void;
  onReviewClick?: (builder: BuilderCardProps['builder']) => void;
}

export const BuilderCard = ({ builder, onContactClick, onViewProfile, onReviewClick }: BuilderCardProps) => {
  const displayImage = builder.user_type === 'company' ? builder.company_logo_url : builder.avatar_url;
  const initials = (builder.company_name || builder.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group border-2 hover:border-primary/20 overflow-hidden">
      {/* Cover Photo Banner */}
      <div className="relative h-24 bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden">
        {builder.cover_photo_url ? (
          <img 
            src={builder.cover_photo_url} 
            alt="Cover" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600" />
        )}
        {/* Verified Badge on Cover */}
        {builder.is_verified && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Verified</span>
          </div>
        )}
      </div>
      
      <CardHeader className="pb-3 pt-0 relative">
        {/* Avatar overlapping cover */}
        <div className="flex justify-between items-end gap-3 -mt-8">
          <div className="flex items-end gap-3 flex-1 min-w-0">
            <Avatar className="h-16 w-16 border-4 border-white shadow-lg group-hover:scale-110 transition-all duration-300">
              <AvatarImage src={displayImage} alt={builder.company_name || builder.full_name} />
              <AvatarFallback className="bg-primary text-white font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {builder.rating && (
            <RatingDisplay 
              averageRating={builder.rating}
              totalReviews={builder.total_reviews || 0}
              size="sm"
              className="flex-shrink-0 mb-1"
            />
          )}
        </div>
        
        {/* Name and badges below avatar */}
        <div className="mt-2">
          <CardTitle className="text-lg font-semibold line-clamp-1 flex items-center gap-2">
            {builder.company_name || builder.full_name}
            {builder.is_verified && (
              <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {builder.user_type === 'company' ? 'Company' : 'Individual'}
            </Badge>
            {builder.is_professional && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                Professional
              </Badge>
            )}
            {builder.years_experience && builder.years_experience > 0 && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Briefcase className="h-3 w-3 mr-1" />
                {builder.years_experience}+ yrs
              </Badge>
            )}
          </div>
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