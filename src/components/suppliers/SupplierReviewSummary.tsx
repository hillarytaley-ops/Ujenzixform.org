import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, ThumbsUp, Calendar, Package, DollarSign, CheckCircle, Award, Truck, Shield } from 'lucide-react';
import { SupplierRatingDisplay } from './SupplierRatingDisplay';

interface SupplierReview {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  product_category: string;
  date: string;
  order_value?: string;
  delivery_time?: string;
  verified?: boolean;
  helpful_votes?: number;
}

interface SupplierReviewSummaryProps {
  supplierId: string;
  supplierName: string;
  reviews: SupplierReview[];
  averageRating: number;
  totalReviews: number;
  className?: string;
  showAddReview?: boolean;
  onAddReview?: () => void;
}

export const SupplierReviewSummary: React.FC<SupplierReviewSummaryProps> = ({
  supplierId,
  supplierName,
  reviews,
  averageRating,
  totalReviews,
  className = '',
  showAddReview = false,
  onAddReview
}) => {
  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const getDetailedRatings = () => {
    // Mock detailed ratings - in a real app, these would be calculated from actual review data
    return {
      product_quality: averageRating * 1.02,
      delivery: averageRating * 0.98,
      customer_service: averageRating * 0.95,
      value_for_money: averageRating * 0.93,
      order_accuracy: averageRating * 1.01,
      communication: averageRating * 0.97
    };
  };

  const getRecommendationRate = () => {
    const recommendedReviews = reviews.filter(review => review.rating >= 4).length;
    return totalReviews > 0 ? (recommendedReviews / totalReviews) * 100 : 0;
  };

  const getProductCategoryBreakdown = () => {
    const categories: { [key: string]: number } = {};
    reviews.forEach(review => {
      categories[review.product_category] = (categories[review.product_category] || 0) + 1;
    });
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const sortedReviews = [...reviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentReviews = sortedReviews.slice(0, 3);
  const productCategories = getProductCategoryBreakdown();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Rating Overview */}
      <SupplierRatingDisplay
        averageRating={averageRating}
        totalReviews={totalReviews}
        ratingDistribution={getRatingDistribution()}
        detailedRatings={getDetailedRatings()}
        recommendationRate={getRecommendationRate()}
        supplierType="supplier"
      />

      {/* Product Category Reviews */}
      {productCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Product Category Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{category}</span>
                  <Badge variant="secondary">{count} reviews</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Recent Customer Reviews
          </CardTitle>
          {showAddReview && (
            <Button onClick={onAddReview} size="sm">
              Write a Review
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {recentReviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No reviews yet</p>
              {showAddReview && (
                <Button onClick={onAddReview} variant="outline" className="mt-4">
                  Be the first to review
                </Button>
              )}
            </div>
          ) : (
            recentReviews.map((review) => (
              <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(review.client_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    {/* Review Header */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.client_name}</span>
                          {review.verified && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(review.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {review.product_category}
                          </div>
                          {review.order_value && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {review.order_value}
                            </div>
                          )}
                          {review.delivery_time && (
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {review.delivery_time}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Content */}
                    <p className="text-sm leading-relaxed">{review.comment}</p>

                    {/* Review Actions */}
                    {review.helpful_votes && review.helpful_votes > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{review.helpful_votes} people found this helpful</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* View All Reviews Link */}
          {reviews.length > 3 && (
            <div className="text-center pt-4 border-t">
              <Button variant="outline" size="sm">
                View All {totalReviews} Reviews
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Performance Highlights */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Supplier Performance Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {getRecommendationRate().toFixed(0)}%
                </div>
                <div className="text-sm text-green-700">Would Recommend</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {reviews.filter(r => r.rating === 5).length}
                </div>
                <div className="text-sm text-blue-700">5-Star Reviews</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {reviews.filter(r => r.verified).length}
                </div>
                <div className="text-sm text-purple-700">Verified Purchases</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {productCategories.length}
                </div>
                <div className="text-sm text-orange-700">Product Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trust & Safety Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Trust & Safety
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Verified Business</div>
                <div className="text-sm text-green-600">Business registration verified</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-800">Secure Transactions</div>
                <div className="text-sm text-blue-600">Protected payment processing</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
