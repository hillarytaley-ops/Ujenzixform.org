import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Building2, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  builderName: string;
  builderId: string;
  onSubmitReview: (review: ReviewData) => void;
}

export interface ReviewData {
  client_name: string;
  rating: number;
  comment: string;
  project_type: string;
  project_value: string;
  project_duration: string;
  would_recommend: boolean;
  communication_rating: number;
  quality_rating: number;
  timeliness_rating: number;
  value_rating: number;
}

const PROJECT_TYPES = [
  'Residential Construction',
  'Commercial Buildings', 
  'Renovation & Remodeling',
  'Industrial Construction',
  'Road Construction',
  'Water & Sanitation',
  'Green Building',
  'Affordable Housing',
  'Other'
];

const PROJECT_VALUES = [
  'Under KES 100K',
  'KES 100K - 500K',
  'KES 500K - 1M',
  'KES 1M - 5M',
  'KES 5M - 10M',
  'KES 10M - 50M',
  'Over KES 50M'
];

const PROJECT_DURATIONS = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6-12 months',
  'Over 1 year'
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  builderName,
  builderId,
  onSubmitReview
}) => {
  const [reviewData, setReviewData] = useState<ReviewData>({
    client_name: '',
    rating: 5,
    comment: '',
    project_type: '',
    project_value: '',
    project_duration: '',
    would_recommend: true,
    communication_rating: 5,
    quality_rating: 5,
    timeliness_rating: 5,
    value_rating: 5
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!reviewData.client_name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name.",
        variant: "destructive"
      });
      return;
    }

    if (!reviewData.comment.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please write a review comment.",
        variant: "destructive"
      });
      return;
    }

    if (!reviewData.project_type) {
      toast({
        title: "Missing Information",
        description: "Please select the project type.",
        variant: "destructive"
      });
      return;
    }

    onSubmitReview(reviewData);
    
    // Reset form
    setReviewData({
      client_name: '',
      rating: 5,
      comment: '',
      project_type: '',
      project_value: '',
      project_duration: '',
      would_recommend: true,
      communication_rating: 5,
      quality_rating: 5,
      timeliness_rating: 5,
      value_rating: 5
    });
    
    onClose();
    
    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback! Your review will be published after verification."
    });
  };

  const renderStarRating = (
    rating: number, 
    onChange: (rating: number) => void,
    label: string
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating}/5
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Review {builderName}
          </DialogTitle>
          <DialogDescription>
            Share your experience working with this builder to help other clients make informed decisions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Your Name *</Label>
              <Input
                id="client_name"
                value={reviewData.client_name}
                onChange={(e) => setReviewData(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type *</Label>
              <Select 
                value={reviewData.project_type} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, project_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_value">Project Value</Label>
              <Select 
                value={reviewData.project_value} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, project_value: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project value range" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {value}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_duration">Project Duration</Label>
              <Select 
                value={reviewData.project_duration} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, project_duration: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project duration" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_DURATIONS.map((duration) => (
                    <SelectItem key={duration} value={duration}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {duration}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Overall Rating</h3>
            {renderStarRating(
              reviewData.rating,
              (rating) => setReviewData(prev => ({ ...prev, rating })),
              "Overall Experience"
            )}
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detailed Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderStarRating(
                reviewData.communication_rating,
                (rating) => setReviewData(prev => ({ ...prev, communication_rating: rating })),
                "Communication"
              )}
              {renderStarRating(
                reviewData.quality_rating,
                (rating) => setReviewData(prev => ({ ...prev, quality_rating: rating })),
                "Work Quality"
              )}
              {renderStarRating(
                reviewData.timeliness_rating,
                (rating) => setReviewData(prev => ({ ...prev, timeliness_rating: rating })),
                "Timeliness"
              )}
              {renderStarRating(
                reviewData.value_rating,
                (rating) => setReviewData(prev => ({ ...prev, value_rating: rating })),
                "Value for Money"
              )}
            </div>
          </div>

          {/* Review Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              value={reviewData.comment}
              onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience working with this builder. What went well? What could be improved?"
              rows={4}
              required
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label>Would you recommend this builder?</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recommend"
                  checked={reviewData.would_recommend}
                  onChange={() => setReviewData(prev => ({ ...prev, would_recommend: true }))}
                  className="text-green-600"
                />
                <span className="text-green-600 font-medium">Yes, I would recommend</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recommend"
                  checked={!reviewData.would_recommend}
                  onChange={() => setReviewData(prev => ({ ...prev, would_recommend: false }))}
                  className="text-red-600"
                />
                <span className="text-red-600 font-medium">No, I would not recommend</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white">
              Submit Review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
