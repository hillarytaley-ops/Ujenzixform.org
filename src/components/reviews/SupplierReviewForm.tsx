/**
 * Supplier Review Form Component
 * Allows builders to rate and review suppliers after completed orders
 */

import React, { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SupplierReviewFormProps {
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string;
  onReviewSubmitted?: () => void;
  trigger?: React.ReactNode;
}

interface RatingCategory {
  key: string;
  label: string;
  description: string;
}

const RATING_CATEGORIES: RatingCategory[] = [
  { key: 'overall', label: 'Overall Experience', description: 'Your overall satisfaction' },
  { key: 'quality', label: 'Product Quality', description: 'Quality of materials received' },
  { key: 'delivery', label: 'Delivery', description: 'Timeliness and condition' },
  { key: 'communication', label: 'Communication', description: 'Responsiveness and clarity' },
  { key: 'value', label: 'Value for Money', description: 'Price vs quality received' },
];

const StarRating: React.FC<{
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ rating, onRatingChange, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none transition-transform hover:scale-110"
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onRatingChange(star)}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

export const SupplierReviewForm: React.FC<SupplierReviewFormProps> = ({
  supplierId,
  supplierName,
  purchaseOrderId,
  onReviewSubmitted,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    overall: 0,
    quality: 0,
    delivery: 0,
    communication: 0,
    value: 0
  });
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const { toast } = useToast();

  const handleRatingChange = (category: string, rating: number) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (ratings.overall === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please provide at least an overall rating.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to submit a review');

      // Get user's name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('supplier_reviews')
        .insert({
          supplier_id: supplierId,
          reviewer_id: user.id,
          reviewer_name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
          reviewer_role: profile?.role || 'builder',
          purchase_order_id: purchaseOrderId,
          overall_rating: ratings.overall,
          quality_rating: ratings.quality || null,
          delivery_rating: ratings.delivery || null,
          communication_rating: ratings.communication || null,
          value_rating: ratings.value || null,
          title: title || null,
          review_text: reviewText || null,
          is_verified_purchase: !!purchaseOrderId,
          status: 'published'
        });

      if (error) throw error;

      toast({
        title: '⭐ Review Submitted!',
        description: 'Thank you for your feedback. It helps other builders make informed decisions.',
      });

      // Reset form
      setRatings({ overall: 0, quality: 0, delivery: 0, communication: 0, value: 0 });
      setTitle('');
      setReviewText('');
      setIsOpen(false);
      onReviewSubmitted?.();

    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return 'Select rating';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    return 'Excellent';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Star className="h-4 w-4" />
            Write a Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Review {supplierName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Categories */}
          <div className="space-y-4">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">
                      {category.label}
                      {category.key === 'overall' && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={ratings[category.key as keyof typeof ratings]}
                      onRatingChange={(r) => handleRatingChange(category.key, r)}
                      size="md"
                    />
                    <span className="text-sm text-muted-foreground w-20">
                      {getRatingLabel(ratings[category.key as keyof typeof ratings])}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={100}
            />
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review">Your Review (Optional)</Label>
            <Textarea
              id="review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share details about your experience with this supplier..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Review
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierReviewForm;

