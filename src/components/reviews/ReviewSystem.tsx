/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   ⭐ REVIEWS & RATINGS SYSTEM                                                       ║
 * ║                                                                                      ║
 * ║   Created: January 29, 2026                                                          ║
 * ║   Features:                                                                          ║
 * ║   - Post-delivery review prompts                                                    ║
 * ║   - Star ratings with comments                                                      ║
 * ║   - Supplier rating display                                                         ║
 * ║   - Review moderation                                                               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Shield,
  Flag,
  RefreshCw
} from 'lucide-react';

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  supplier_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment: string;
  delivery_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  helpful_count: number;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  response?: string;
  response_at?: string;
}

interface SupplierRating {
  supplier_id: string;
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  average_delivery: number;
  average_quality: number;
  average_communication: number;
}

// Star Rating Component
interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = 'md' 
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          onClick={() => onRatingChange?.(star)}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// Review Form Component
interface ReviewFormProps {
  supplierId: string;
  orderId?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ supplierId, orderId, onSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating Required',
        description: 'Please select an overall rating'
      });
      return;
    }
    
    if (comment.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Comment Required',
        description: 'Please write at least 10 characters'
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const { error } = await supabase
        .from('supplier_reviews')
        .insert({
          reviewer_id: user.id,
          reviewer_name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
          supplier_id: supplierId,
          order_id: orderId,
          rating,
          title,
          comment,
          delivery_rating: deliveryRating || null,
          quality_rating: qualityRating || null,
          communication_rating: communicationRating || null,
          is_verified_purchase: !!orderId,
          status: 'approved' // Auto-approve for now
        });
      
      if (error) throw error;
      
      // Update supplier's average rating
      await updateSupplierRating(supplierId);
      
      toast({
        title: '⭐ Review Submitted',
        description: 'Thank you for your feedback!'
      });
      
      onSubmit();
      
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit review'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Overall Rating *</label>
        <div className="flex items-center gap-3">
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          <span className="text-slate-400">
            {rating > 0 ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating] : 'Select rating'}
          </span>
        </div>
      </div>
      
      {/* Detailed Ratings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            <Truck className="h-3 w-3 inline mr-1" />
            Delivery
          </label>
          <StarRating rating={deliveryRating} onRatingChange={setDeliveryRating} size="sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            <Package className="h-3 w-3 inline mr-1" />
            Quality
          </label>
          <StarRating rating={qualityRating} onRatingChange={setQualityRating} size="sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            <MessageSquare className="h-3 w-3 inline mr-1" />
            Communication
          </label>
          <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} size="sm" />
        </div>
      </div>
      
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Review Title (Optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
          maxLength={100}
        />
      </div>
      
      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Your Review *</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this supplier..."
          className="bg-slate-800 border-slate-600 min-h-[120px]"
          maxLength={1000}
        />
        <p className="text-xs text-slate-500 mt-1">{comment.length}/1000 characters</p>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
};

// Helper function to update supplier rating
async function updateSupplierRating(supplierId: string) {
  try {
    const { data: reviews } = await supabase
      .from('supplier_reviews')
      .select('rating')
      .eq('supplier_id', supplierId)
      .eq('status', 'approved');
    
    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      await supabase
        .from('suppliers')
        .update({ rating: avgRating.toFixed(1) })
        .or(`id.eq.${supplierId},user_id.eq.${supplierId}`);
    }
  } catch (error) {
    console.error('Error updating supplier rating:', error);
  }
}

// Helper function to get Supabase config
const getSupabaseConfig = () => {
  let accessToken = '';
  try {
    const storedSession = readPersistedAuthRawStringSync();
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed.access_token || '';
    }
  } catch (e) {}
  
  return { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken };
};

// Helper function to add timeout to any promise
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
};

// Supplier Rating Summary Component
interface SupplierRatingSummaryProps {
  supplierId: string;
  compact?: boolean;
}

export const SupplierRatingSummary: React.FC<SupplierRatingSummaryProps> = ({ supplierId, compact = false }) => {
  const [rating, setRating] = useState<SupplierRating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRating();
    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Rating summary safety timeout');
    }, 8000);
    return () => clearTimeout(safetyTimeout);
  }, [supplierId]);

  const loadRating = async () => {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      console.log('⭐ Loading rating summary for supplier:', supplierId);
      
      // Use REST API for faster loading
      const response = await withTimeout(
        fetch(
          `${SUPABASE_URL}/rest/v1/supplier_reviews?supplier_id=eq.${supplierId}&status=eq.approved&select=rating,delivery_rating,quality_rating,communication_rating`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          }
        ),
        5000
      );
      
      if (response.ok) {
        const reviews = await response.json();
        console.log('⭐ Reviews loaded for rating:', reviews?.length);
        
        if (reviews && reviews.length > 0) {
          const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          let totalDelivery = 0, totalQuality = 0, totalComm = 0;
          let deliveryCount = 0, qualityCount = 0, commCount = 0;
          
          reviews.forEach((r: any) => {
            breakdown[r.rating as keyof typeof breakdown]++;
            if (r.delivery_rating) { totalDelivery += r.delivery_rating; deliveryCount++; }
            if (r.quality_rating) { totalQuality += r.quality_rating; qualityCount++; }
            if (r.communication_rating) { totalComm += r.communication_rating; commCount++; }
          });
          
          setRating({
            supplier_id: supplierId,
            average_rating: reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length,
            total_reviews: reviews.length,
            rating_breakdown: breakdown,
            average_delivery: deliveryCount > 0 ? totalDelivery / deliveryCount : 0,
            average_quality: qualityCount > 0 ? totalQuality / qualityCount : 0,
            average_communication: commCount > 0 ? totalComm / commCount : 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading rating:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-8 bg-slate-700 rounded" />;
  }

  if (!rating) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <StarRating rating={0} readonly size="sm" />
        <span className="text-sm">No reviews yet</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StarRating rating={Math.round(rating.average_rating)} readonly size="sm" />
        <span className="text-white font-medium">{rating.average_rating.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">({rating.total_reviews})</span>
      </div>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <p className="text-4xl font-bold text-white">{rating.average_rating.toFixed(1)}</p>
            <StarRating rating={Math.round(rating.average_rating)} readonly />
            <p className="text-sm text-slate-400 mt-1">{rating.total_reviews} reviews</p>
          </div>
          
          {/* Rating Breakdown */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = rating.rating_breakdown[star as keyof typeof rating.rating_breakdown];
              const percentage = (count / rating.total_reviews) * 100;
              
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 w-4">{star}</span>
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs text-slate-400 w-8">{count}</span>
                </div>
              );
            })}
          </div>
          
          {/* Category Ratings */}
          <div className="space-y-2 text-sm">
            {rating.average_delivery > 0 && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Delivery</span>
                <span className="text-white font-medium">{rating.average_delivery.toFixed(1)}</span>
              </div>
            )}
            {rating.average_quality > 0 && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Quality</span>
                <span className="text-white font-medium">{rating.average_quality.toFixed(1)}</span>
              </div>
            )}
            {rating.average_communication > 0 && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Communication</span>
                <span className="text-white font-medium">{rating.average_communication.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Reviews List Component
interface ReviewsListProps {
  supplierId: string;
  limit?: number;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ supplierId, limit }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
    
    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Reviews list safety timeout');
    }, 8000);
    
    // Set up real-time subscription for new reviews
    const channel = supabase
      .channel('reviews-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'supplier_reviews', filter: `supplier_id=eq.${supplierId}` },
        () => {
          console.log('⭐ Real-time review update received');
          loadReviews();
        }
      )
      .subscribe();
    
    return () => {
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
    };
  }, [supplierId]);

  const loadReviews = async () => {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      console.log('⭐ Loading reviews for supplier:', supplierId);
      
      // Build URL with query params
      let url = `${SUPABASE_URL}/rest/v1/supplier_reviews?supplier_id=eq.${supplierId}&status=eq.approved&order=created_at.desc`;
      if (limit) {
        url += `&limit=${limit}`;
      }
      
      // Use REST API for faster loading
      const response = await withTimeout(
        fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          },
        }),
        5000
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('⭐ Reviews loaded:', data?.length);
        setReviews((data || []) as Review[]);
      }
      
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      await supabase.rpc('increment_helpful_count', { review_id: reviewId });
      loadReviews();
    } catch (error) {
      // RPC might not exist
      console.log('Helpful count update not available');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No reviews yet</p>
        <p className="text-sm mt-1">Be the first to review this supplier</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="bg-slate-800/30 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.reviewer_avatar} />
                <AvatarFallback>{review.reviewer_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{review.reviewer_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={review.rating} readonly size="sm" />
                      {review.is_verified_purchase && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400/50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {review.title && (
                  <p className="font-semibold text-white mt-2">{review.title}</p>
                )}
                
                <p className="text-slate-300 mt-2">{review.comment}</p>
                
                {/* Supplier Response */}
                {review.response && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">
                      <Shield className="h-3 w-3 inline mr-1" />
                      Supplier Response
                    </p>
                    <p className="text-slate-300 text-sm">{review.response}</p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => handleHelpful(review.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Helpful ({review.helpful_count || 0})
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Post-Delivery Review Prompt Component
interface ReviewPromptProps {
  orderId: string;
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

export const ReviewPrompt: React.FC<ReviewPromptProps> = ({ orderId, supplierId, supplierName, onClose }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Rate Your Experience
          </DialogTitle>
          <DialogDescription>
            How was your order from {supplierName}?
          </DialogDescription>
        </DialogHeader>
        
        {!showForm ? (
          <div className="py-6 text-center">
            <p className="text-slate-300 mb-4">Your feedback helps other buyers make informed decisions.</p>
            <Button onClick={() => setShowForm(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              <Star className="h-4 w-4 mr-2" />
              Write a Review
            </Button>
            <Button variant="ghost" onClick={onClose} className="ml-2">
              Maybe Later
            </Button>
          </div>
        ) : (
          <ReviewForm
            supplierId={supplierId}
            orderId={orderId}
            onSubmit={onClose}
            onCancel={() => setShowForm(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewsList;

