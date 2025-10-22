import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, Award, TrendingUp } from 'lucide-react';

interface RatingDisplayProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: { [key: number]: number };
  detailedRatings?: {
    communication: number;
    quality: number;
    timeliness: number;
    value: number;
  };
  recommendationRate?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  averageRating,
  totalReviews,
  ratingDistribution,
  detailedRatings,
  recommendationRate,
  className = '',
  size = 'md'
}) => {
  const renderStars = (rating: number, starSize: 'sm' | 'md' | 'lg' = size) => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    const sizeClass = sizeClasses[starSize];
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : star <= rating
                ? 'fill-yellow-200 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.8) return 'Exceptional';
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Average';
    return 'Below Average';
  };

  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {renderStars(averageRating, 'sm')}
        <span className={`text-sm font-medium ${getRatingColor(averageRating)}`}>
          {averageRating.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">
          ({totalReviews} reviews)
        </span>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Customer Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <span className={`text-4xl font-bold ${getRatingColor(averageRating)}`}>
              {averageRating.toFixed(1)}
            </span>
            <div className="space-y-1">
              {renderStars(averageRating, 'lg')}
              <Badge variant="secondary" className="text-xs">
                {getRatingLabel(averageRating)}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            Based on {totalReviews} customer reviews
          </p>
        </div>

        {/* Rating Distribution */}
        {ratingDistribution && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Rating Breakdown</h4>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 w-12">
                    <span>{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Ratings */}
        {detailedRatings && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detailed Ratings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Communication</span>
                  <span className="font-medium">{detailedRatings.communication.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.communication * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Quality</span>
                  <span className="font-medium">{detailedRatings.quality.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.quality * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Timeliness</span>
                  <span className="font-medium">{detailedRatings.timeliness.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.timeliness * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Value</span>
                  <span className="font-medium">{detailedRatings.value.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.value * 20} className="h-2" />
              </div>
            </div>
          </div>
        )}

        {/* Recommendation Rate */}
        {recommendationRate !== undefined && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Recommendation Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-600">
                {recommendationRate.toFixed(0)}%
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Highly Recommended
              </Badge>
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        {averageRating >= 4.8 && totalReviews >= 10 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <Award className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Top Rated Builder
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
