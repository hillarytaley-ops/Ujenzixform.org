import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ThumbsUp, MessageSquare, Calendar, Building, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  project_type: string;
  date: string;
  project_value?: string;
  verified?: boolean;
  helpful_votes?: number;
}

interface ReviewsSystemProps {
  builderId: string;
  builderName: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onAddReview?: (review: Omit<Review, 'id' | 'date'>) => void;
}

export const ReviewsSystem: React.FC<ReviewsSystemProps> = ({
  builderId,
  builderName,
  reviews,
  averageRating,
  totalReviews,
  onAddReview
}) => {
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({
    client_name: '',
    rating: 5,
    comment: '',
    project_type: '',
    project_value: ''
  });
  const { toast } = useToast();

  const handleSubmitReview = () => {
    if (!newReview.client_name || !newReview.comment || !newReview.project_type) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (onAddReview) {
      onAddReview({
        client_name: newReview.client_name,
        rating: newReview.rating,
        comment: newReview.comment,
        project_type: newReview.project_type,
        project_value: newReview.project_value
      });
    }

    setNewReview({
      client_name: '',
      rating: 5,
      comment: '',
      project_type: '',
      project_value: ''
    });
    setShowAddReview(false);
    
    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback! Your review will be published after verification."
    });
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Reviews & Ratings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{averageRating.toFixed(1)}</div>
              {renderStars(averageRating, 'lg')}
              <p className="text-muted-foreground mt-2">{totalReviews} reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${totalReviews > 0 ? (ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">
                    {ratingDistribution[rating as keyof typeof ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Review Button */}
          <div className="mt-6 pt-6 border-t">
            <Button 
              onClick={() => setShowAddReview(!showAddReview)}
              className="w-full sm:w-auto"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Write a Review
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Review Form */}
      {showAddReview && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review for {builderName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Name *</label>
                <Input
                  placeholder="Enter your name"
                  value={newReview.client_name}
                  onChange={(e) => setNewReview(prev => ({ ...prev, client_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Project Type *</label>
                <Select 
                  value={newReview.project_type} 
                  onValueChange={(value) => setNewReview(prev => ({ ...prev, project_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Renovation">Renovation</SelectItem>
                    <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Project Value (Optional)</label>
              <Input
                placeholder="e.g., KES 2.5M"
                value={newReview.project_value}
                onChange={(e) => setNewReview(prev => ({ ...prev, project_value: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Rating *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= newReview.rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Your Review *</label>
              <Textarea
                placeholder="Share your experience working with this builder..."
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitReview}>Submit Review</Button>
              <Button variant="outline" onClick={() => setShowAddReview(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{review.client_name}</h4>
                      {review.verified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.date).toLocaleDateString()}
                      <Building className="h-3 w-3 ml-2" />
                      {review.project_type}
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              <p className="text-muted-foreground mb-4">{review.comment}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {review.project_value && (
                    <span>Project Value: {review.project_value}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Helpful ({review.helpful_votes || 0})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reviews.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share your experience with {builderName}
            </p>
            <Button onClick={() => setShowAddReview(true)}>
              Write First Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
















