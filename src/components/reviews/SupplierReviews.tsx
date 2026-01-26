/**
 * Supplier Reviews Display Component
 * Shows reviews and ratings for a supplier
 */

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Shield, Award, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SupplierReviewForm } from './SupplierReviewForm';

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_role: string;
  overall_rating: number;
  quality_rating: number | null;
  delivery_rating: number | null;
  communication_rating: number | null;
  value_rating: number | null;
  title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

interface RatingSummary {
  total_reviews: number;
  average_rating: number;
  average_quality: number;
  average_delivery: number;
  average_communication: number;
  average_value: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  is_top_rated: boolean;
}

interface SupplierReviewsProps {
  supplierId: string;
  supplierName: string;
  compact?: boolean;
}

const StarDisplay: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : star <= Math.ceil(rating) && rating % 1 !== 0
              ? 'fill-yellow-200 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const RatingBar: React.FC<{ stars: number; count: number; total: number }> = ({ stars, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right">{stars} star</span>
      <Progress value={percentage} className="h-2 flex-1" />
      <span className="w-8 text-muted-foreground">{count}</span>
    </div>
  );
};

export const SupplierReviews: React.FC<SupplierReviewsProps> = ({
  supplierId,
  supplierName,
  compact = false
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { toast } = useToast();

  const fetchReviews = async () => {
    try {
      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('supplier_reviews')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Fetch or calculate summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('supplier_rating_summary')
        .select('*')
        .eq('supplier_id', supplierId)
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for new suppliers
        console.error('Summary fetch error:', summaryError);
      }

      if (summaryData) {
        setSummary(summaryData);
      } else if (reviewsData && reviewsData.length > 0) {
        // Calculate summary from reviews if not in table
        const avgRating = reviewsData.reduce((sum, r) => sum + r.overall_rating, 0) / reviewsData.length;
        setSummary({
          total_reviews: reviewsData.length,
          average_rating: avgRating,
          average_quality: 0,
          average_delivery: 0,
          average_communication: 0,
          average_value: 0,
          five_star_count: reviewsData.filter(r => r.overall_rating === 5).length,
          four_star_count: reviewsData.filter(r => r.overall_rating === 4).length,
          three_star_count: reviewsData.filter(r => r.overall_rating === 3).length,
          two_star_count: reviewsData.filter(r => r.overall_rating === 2).length,
          one_star_count: reviewsData.filter(r => r.overall_rating === 1).length,
          is_top_rated: avgRating >= 4.5 && reviewsData.length >= 5
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [supplierId]);

  const handleHelpfulClick = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to mark reviews as helpful.',
          variant: 'destructive'
        });
        return;
      }

      // Check if already voted
      const { data: existingVote } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        toast({
          title: 'Already voted',
          description: 'You have already marked this review as helpful.'
        });
        return;
      }

      // Add vote
      await supabase
        .from('review_helpful_votes')
        .insert({ review_id: reviewId, user_id: user.id });

      // Update helpful count
      await supabase
        .from('supplier_reviews')
        .update({ helpful_count: reviews.find(r => r.id === reviewId)!.helpful_count + 1 })
        .eq('id', reviewId);

      // Refresh reviews
      fetchReviews();

      toast({
        title: 'Thanks!',
        description: 'Your feedback helps other builders.'
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  // Compact view for supplier cards
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StarDisplay rating={summary?.average_rating || 0} />
        <span className="text-sm font-medium">
          {summary?.average_rating?.toFixed(1) || '0.0'}
        </span>
        <span className="text-sm text-muted-foreground">
          ({summary?.total_reviews || 0} reviews)
        </span>
        {summary?.is_top_rated && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Award className="h-3 w-3 mr-1" />
            Top Rated
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Reviews & Ratings
        </CardTitle>
        <SupplierReviewForm
          supplierId={supplierId}
          supplierName={supplierName}
          onReviewSubmitted={fetchReviews}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Section */}
        {summary && summary.total_reviews > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="text-5xl font-bold text-yellow-500">
                  {summary.average_rating.toFixed(1)}
                </div>
                <div>
                  <StarDisplay rating={summary.average_rating} size="md" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {summary.is_top_rated && (
                <Badge className="mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                  <Award className="h-4 w-4 mr-1" />
                  Top Rated Supplier
                </Badge>
              )}
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              <RatingBar stars={5} count={summary.five_star_count} total={summary.total_reviews} />
              <RatingBar stars={4} count={summary.four_star_count} total={summary.total_reviews} />
              <RatingBar stars={3} count={summary.three_star_count} total={summary.total_reviews} />
              <RatingBar stars={2} count={summary.two_star_count} total={summary.total_reviews} />
              <RatingBar stars={1} count={summary.one_star_count} total={summary.total_reviews} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm">Be the first to review this supplier!</p>
          </div>
        )}

        {/* Individual Reviews */}
        {reviews.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Customer Reviews</h4>
            {displayedReviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {review.reviewer_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewer_name || 'Anonymous'}</span>
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <StarDisplay rating={review.overall_rating} />
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h5 className="font-semibold">{review.title}</h5>
                )}

                {review.review_text && (
                  <p className="text-sm text-muted-foreground">{review.review_text}</p>
                )}

                {/* Sub-ratings */}
                {(review.quality_rating || review.delivery_rating || review.communication_rating || review.value_rating) && (
                  <div className="flex flex-wrap gap-4 text-xs">
                    {review.quality_rating && (
                      <span>Quality: <StarDisplay rating={review.quality_rating} /></span>
                    )}
                    {review.delivery_rating && (
                      <span>Delivery: <StarDisplay rating={review.delivery_rating} /></span>
                    )}
                    {review.communication_rating && (
                      <span>Communication: <StarDisplay rating={review.communication_rating} /></span>
                    )}
                    {review.value_rating && (
                      <span>Value: <StarDisplay rating={review.value_rating} /></span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleHelpfulClick(review.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful ({review.helpful_count})
                  </Button>
                </div>
              </div>
            ))}

            {reviews.length > 3 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAllReviews(!showAllReviews)}
              >
                {showAllReviews ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show All {reviews.length} Reviews
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierReviews;

