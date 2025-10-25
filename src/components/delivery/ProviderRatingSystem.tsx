import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  User, 
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  Shield,
  Truck,
  Package,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ProviderRating {
  id: string;
  provider_id: string;
  delivery_id: string;
  user_id: string;
  overall_rating: number;
  punctuality_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  material_handling_rating: number;
  review_text?: string;
  would_recommend: boolean;
  created_at: string;
  delivery_info: {
    tracking_number: string;
    material_type: string;
    delivery_date: string;
  };
  user_info: {
    name: string;
    user_type: string;
  };
}

interface ProviderStats {
  provider_id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  total_ratings: number;
  average_overall: number;
  average_punctuality: number;
  average_communication: number;
  average_professionalism: number;
  average_material_handling: number;
  recommendation_rate: number;
  total_deliveries: number;
  recent_ratings: ProviderRating[];
}

interface RatingFormData {
  overall_rating: number;
  punctuality_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  material_handling_rating: number;
  review_text: string;
  would_recommend: boolean;
}

interface ProviderRatingSystemProps {
  providerId?: string;
  deliveryId?: string;
  showRatingForm?: boolean;
  showProviderStats?: boolean;
  userRole?: string;
}

export const ProviderRatingSystem: React.FC<ProviderRatingSystemProps> = ({ 
  providerId,
  deliveryId,
  showRatingForm = false,
  showProviderStats = true,
  userRole = 'builder'
}) => {
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [ratings, setRatings] = useState<ProviderRating[]>([]);
  const [ratingForm, setRatingForm] = useState<RatingFormData>({
    overall_rating: 0,
    punctuality_rating: 0,
    communication_rating: 0,
    professionalism_rating: 0,
    material_handling_rating: 0,
    review_text: '',
    would_recommend: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (providerId) {
      loadProviderStats();
      loadProviderRatings();
    }
  }, [providerId]);

  const loadProviderStats = async () => {
    try {
      setLoading(true);
      
      // Mock provider stats - in production this would come from database
      const mockStats: ProviderStats = {
        provider_id: providerId || 'prv-001',
        provider_name: 'Swift Logistics Ltd',
        provider_type: 'company',
        total_ratings: 127,
        average_overall: 4.7,
        average_punctuality: 4.6,
        average_communication: 4.8,
        average_professionalism: 4.7,
        average_material_handling: 4.5,
        recommendation_rate: 89.5,
        total_deliveries: 456,
        recent_ratings: []
      };

      setProviderStats(mockStats);
    } catch (error) {
      console.error('Error loading provider stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderRatings = async () => {
    try {
      // Mock ratings data
      const mockRatings: ProviderRating[] = [
        {
          id: 'rating-001',
          provider_id: providerId || 'prv-001',
          delivery_id: 'del-001',
          user_id: 'user-001',
          overall_rating: 5,
          punctuality_rating: 5,
          communication_rating: 4,
          professionalism_rating: 5,
          material_handling_rating: 5,
          review_text: 'Excellent service! Materials delivered on time and in perfect condition.',
          would_recommend: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          delivery_info: {
            tracking_number: 'UJP-001-2024',
            material_type: 'Cement',
            delivery_date: new Date(Date.now() - 86400000).toISOString()
          },
          user_info: {
            name: 'John Builder',
            user_type: 'Professional Builder'
          }
        },
        {
          id: 'rating-002',
          provider_id: providerId || 'prv-001',
          delivery_id: 'del-002',
          user_id: 'user-002',
          overall_rating: 4,
          punctuality_rating: 3,
          communication_rating: 5,
          professionalism_rating: 4,
          material_handling_rating: 4,
          review_text: 'Good service overall, but delivery was slightly delayed due to traffic.',
          would_recommend: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          delivery_info: {
            tracking_number: 'UJP-002-2024',
            material_type: 'Steel Bars',
            delivery_date: new Date(Date.now() - 172800000).toISOString()
          },
          user_info: {
            name: 'Mary Constructor',
            user_type: 'Private Builder'
          }
        }
      ];

      setRatings(mockRatings);
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const submitRating = async () => {
    try {
      setIsSubmitting(true);

      // Validate ratings
      if (ratingForm.overall_rating === 0) {
        toast({
          title: 'Rating Required',
          description: 'Please provide an overall rating',
          variant: 'destructive'
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to submit a rating',
          variant: 'destructive'
        });
        return;
      }

      const ratingData = {
        provider_id: providerId,
        delivery_id: deliveryId,
        user_id: user.id,
        ...ratingForm,
        created_at: new Date().toISOString()
      };

      // In production, submit to database
      console.log('Submitting rating:', ratingData);

      toast({
        title: 'Rating Submitted',
        description: 'Thank you for your feedback!',
      });

      // Reset form
      setRatingForm({
        overall_rating: 0,
        punctuality_rating: 0,
        communication_rating: 0,
        professionalism_rating: 0,
        material_handling_rating: 0,
        review_text: '',
        would_recommend: true
      });

      // Reload stats
      loadProviderStats();
      loadProviderRatings();

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    readonly = false,
    size = 'default'
  }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'small' | 'default' | 'large';
  }) => {
    const sizeClass = size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4';
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} cursor-pointer transition-colors ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            onClick={() => !readonly && onRatingChange?.(star)}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Statistics */}
      {showProviderStats && providerStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {providerStats.provider_type === 'company' ? (
                    <Building className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-green-600" />
                  )}
                  {providerStats.provider_name}
                </CardTitle>
                <CardDescription>
                  {providerStats.provider_type === 'company' ? 'Delivery Company' : 'Private Provider'} • 
                  {providerStats.total_deliveries} deliveries • 
                  {providerStats.total_ratings} reviews
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{providerStats.average_overall}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {providerStats.recommendation_rate}% recommend
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="font-semibold">{providerStats.average_punctuality}</div>
                <div className="text-xs text-muted-foreground">Punctuality</div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="font-semibold">{providerStats.average_communication}</div>
                <div className="text-xs text-muted-foreground">Communication</div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="font-semibold">{providerStats.average_professionalism}</div>
                <div className="text-xs text-muted-foreground">Professionalism</div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <Package className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="font-semibold">{providerStats.average_material_handling}</div>
                <div className="text-xs text-muted-foreground">Material Handling</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Form */}
      {showRatingForm && (
        <Card>
          <CardHeader>
            <CardTitle>Rate This Provider</CardTitle>
            <CardDescription>
              Share your experience to help other builders make informed decisions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <h4 className="font-medium">Overall Rating</h4>
              <StarRating
                rating={ratingForm.overall_rating}
                onRatingChange={(rating) => setRatingForm(prev => ({ ...prev, overall_rating: rating }))}
                size="large"
              />
            </div>

            {/* Detailed Ratings */}
            <div className="space-y-4">
              <h4 className="font-medium">Detailed Ratings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Punctuality</span>
                  </div>
                  <StarRating
                    rating={ratingForm.punctuality_rating}
                    onRatingChange={(rating) => setRatingForm(prev => ({ ...prev, punctuality_rating: rating }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Communication</span>
                  </div>
                  <StarRating
                    rating={ratingForm.communication_rating}
                    onRatingChange={(rating) => setRatingForm(prev => ({ ...prev, communication_rating: rating }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Professionalism</span>
                  </div>
                  <StarRating
                    rating={ratingForm.professionalism_rating}
                    onRatingChange={(rating) => setRatingForm(prev => ({ ...prev, professionalism_rating: rating }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Material Handling</span>
                  </div>
                  <StarRating
                    rating={ratingForm.material_handling_rating}
                    onRatingChange={(rating) => setRatingForm(prev => ({ ...prev, material_handling_rating: rating }))}
                  />
                </div>
              </div>
            </div>

            {/* Written Review */}
            <div className="space-y-2">
              <h4 className="font-medium">Written Review (Optional)</h4>
              <Textarea
                value={ratingForm.review_text}
                onChange={(e) => setRatingForm(prev => ({ ...prev, review_text: e.target.value }))}
                placeholder="Share details about your experience with this provider..."
                rows={4}
              />
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <h4 className="font-medium">Would you recommend this provider?</h4>
              <div className="flex gap-4">
                <Button
                  variant={ratingForm.would_recommend ? 'default' : 'outline'}
                  onClick={() => setRatingForm(prev => ({ ...prev, would_recommend: true }))}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes, I recommend
                </Button>
                <Button
                  variant={!ratingForm.would_recommend ? 'default' : 'outline'}
                  onClick={() => setRatingForm(prev => ({ ...prev, would_recommend: false }))}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No, I don't recommend
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={submitRating}
              disabled={isSubmitting || ratingForm.overall_rating === 0}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>
            Latest feedback from builders and customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ratings.map((rating) => (
              <Card key={rating.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={rating.overall_rating} readonly size="small" />
                          <Badge variant="outline" className="text-xs">
                            {rating.delivery_info.material_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          By {rating.user_info.name} • {format(new Date(rating.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {rating.would_recommend ? (
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    {/* Review Text */}
                    {rating.review_text && (
                      <p className="text-sm">{rating.review_text}</p>
                    )}

                    {/* Detailed Ratings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span>Punctuality: {rating.punctuality_rating}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-green-500" />
                        <span>Communication: {rating.communication_rating}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-purple-500" />
                        <span>Professional: {rating.professionalism_rating}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-orange-500" />
                        <span>Handling: {rating.material_handling_rating}/5</span>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="text-xs text-muted-foreground">
                      Delivery: {rating.delivery_info.tracking_number} • 
                      {format(new Date(rating.delivery_info.delivery_date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {ratings.length === 0 && (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Reviews Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to review this provider's service
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provider Performance Insights */}
      {providerStats && userRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Strengths</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• High customer satisfaction ({providerStats.average_overall}/5)</li>
                  <li>• {providerStats.recommendation_rate}% recommendation rate</li>
                  <li>• Consistent service quality</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Opportunities</span>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Improve punctuality (current: {providerStats.average_punctuality}/5)</li>
                  <li>• Enhance material handling processes</li>
                  <li>• Increase delivery frequency</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Reliability</span>
                </div>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• {providerStats.total_deliveries} successful deliveries</li>
                  <li>• Verified and trusted provider</li>
                  <li>• Professional service standards</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderRatingSystem;



















