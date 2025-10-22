import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, Award, TrendingUp, Package, Truck, DollarSign, Shield } from 'lucide-react';

interface SupplierRatingDisplayProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: { [key: number]: number };
  detailedRatings?: {
    product_quality: number;
    delivery: number;
    customer_service: number;
    value_for_money: number;
    order_accuracy: number;
    communication: number;
  };
  recommendationRate?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  supplierType?: string;
}

export const SupplierRatingDisplay: React.FC<SupplierRatingDisplayProps> = ({
  averageRating,
  totalReviews,
  ratingDistribution,
  detailedRatings,
  recommendationRate,
  className = '',
  size = 'md',
  supplierType = 'supplier'
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
    if (rating >= 4.8) return 'Exceptional Supplier';
    if (rating >= 4.5) return 'Excellent Supplier';
    if (rating >= 4.0) return 'Very Good Supplier';
    if (rating >= 3.5) return 'Good Supplier';
    if (rating >= 3.0) return 'Average Supplier';
    return 'Below Average';
  };

  const getSupplierBadge = (rating: number, reviews: number) => {
    if (rating >= 4.8 && reviews >= 20) return { text: 'Premium Supplier', color: 'bg-purple-100 text-purple-800' };
    if (rating >= 4.5 && reviews >= 10) return { text: 'Trusted Supplier', color: 'bg-green-100 text-green-800' };
    if (rating >= 4.0 && reviews >= 5) return { text: 'Reliable Supplier', color: 'bg-blue-100 text-blue-800' };
    return null;
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
        {getSupplierBadge(averageRating, totalReviews) && (
          <Badge className={`text-xs ${getSupplierBadge(averageRating, totalReviews)?.color}`}>
            {getSupplierBadge(averageRating, totalReviews)?.text}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Customer Reviews & Ratings
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
          {getSupplierBadge(averageRating, totalReviews) && (
            <Badge className={getSupplierBadge(averageRating, totalReviews)?.color}>
              <Award className="h-3 w-3 mr-1" />
              {getSupplierBadge(averageRating, totalReviews)?.text}
            </Badge>
          )}
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

        {/* Detailed Ratings for Suppliers */}
        {detailedRatings && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detailed Performance</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Product Quality
                  </span>
                  <span className="font-medium">{detailedRatings.product_quality.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.product_quality * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Truck className="h-3 w-3" />
                    Delivery Service
                  </span>
                  <span className="font-medium">{detailedRatings.delivery.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.delivery * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Customer Service
                  </span>
                  <span className="font-medium">{detailedRatings.customer_service.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.customer_service * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Value for Money
                  </span>
                  <span className="font-medium">{detailedRatings.value_for_money.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.value_for_money * 20} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Order Accuracy</span>
                  <span className="font-medium">{detailedRatings.order_accuracy.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.order_accuracy * 20} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Communication</span>
                  <span className="font-medium">{detailedRatings.communication.toFixed(1)}</span>
                </div>
                <Progress value={detailedRatings.communication * 20} className="h-2" />
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

        {/* Supplier Achievements */}
        <div className="space-y-2">
          {averageRating >= 4.8 && totalReviews >= 20 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-purple-50 rounded-lg">
              <Award className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Premium Verified Supplier
              </span>
            </div>
          )}
          
          {averageRating >= 4.5 && totalReviews >= 10 && (
            <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 rounded-lg">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Trusted Business Partner
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
