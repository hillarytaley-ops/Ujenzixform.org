import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupplierReview, SupplierRatingStats } from '@/types/supplier';
import { useToast } from '@/hooks/use-toast';

interface UseSupplierReviewsResult {
  reviews: SupplierReview[];
  ratingStats: SupplierRatingStats | null;
  loading: boolean;
  error: string | null;
  submitReview: (reviewData: Omit<SupplierReview, 'id' | 'created_at' | 'reviewer_name' | 'reviewer_company'>) => Promise<boolean>;
  updateReview: (reviewId: string, reviewData: Partial<SupplierReview>) => Promise<boolean>;
  deleteReview: (reviewId: string) => Promise<boolean>;
  markHelpful: (reviewId: string) => Promise<boolean>;
  refetch: () => void;
}

export const useSupplierReviews = (supplierId: string): UseSupplierReviewsResult => {
  const [reviews, setReviews] = useState<SupplierReview[]>([]);
  const [ratingStats, setRatingStats] = useState<SupplierRatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch reviews using the secure function
      const { data: reviewsData, error: reviewsError } = await supabase
        .rpc('get_supplier_reviews', { supplier_uuid: supplierId });

      if (reviewsError) {
        throw reviewsError;
      }

      // Fetch rating statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_supplier_rating_stats', { supplier_uuid: supplierId });

      if (statsError) {
        console.warn('Could not fetch rating stats:', statsError);
      }

      setReviews(reviewsData || []);
      setRatingStats(statsData?.[0] || null);
    } catch (err) {
      console.error('Error fetching supplier reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (reviewData: Omit<SupplierReview, 'id' | 'created_at' | 'reviewer_name' | 'reviewer_company'>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit a review.",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('supplier_reviews')
        .insert({
          ...reviewData,
          reviewer_id: user.id
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback! Your review has been published.",
      });

      // Refresh reviews
      fetchReviews();
      return true;
    } catch (err) {
      console.error('Error submitting review:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to submit review',
        variant: "destructive"
      });
      return false;
    }
  };

  const updateReview = async (reviewId: string, reviewData: Partial<SupplierReview>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('supplier_reviews')
        .update(reviewData)
        .eq('id', reviewId);

      if (error) {
        throw error;
      }

      toast({
        title: "Review Updated",
        description: "Your review has been updated successfully.",
      });

      // Refresh reviews
      fetchReviews();
      return true;
    } catch (err) {
      console.error('Error updating review:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update review',
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('supplier_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) {
        throw error;
      }

      toast({
        title: "Review Deleted",
        description: "Your review has been deleted.",
      });

      // Refresh reviews
      fetchReviews();
      return true;
    } catch (err) {
      console.error('Error deleting review:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete review',
        variant: "destructive"
      });
      return false;
    }
  };

  const markHelpful = async (reviewId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .rpc('increment_review_helpful_votes', { review_id: reviewId });

      if (error) {
        throw error;
      }

      // Refresh reviews to show updated count
      fetchReviews();
      return true;
    } catch (err) {
      console.error('Error marking review helpful:', err);
      return false;
    }
  };

  const refetch = () => {
    fetchReviews();
  };

  useEffect(() => {
    if (supplierId) {
      fetchReviews();
    }
  }, [supplierId]);

  return {
    reviews,
    ratingStats,
    loading,
    error,
    submitReview,
    updateReview,
    deleteReview,
    markHelpful,
    refetch
  };
};
