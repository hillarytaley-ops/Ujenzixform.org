import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Package, Truck, DollarSign, Calendar, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  supplierId: string;
  onSubmitReview: (review: SupplierReviewData) => void;
}

export interface SupplierReviewData {
  client_name: string;
  rating: number;
  comment: string;
  product_category: string;
  order_value: string;
  delivery_time: string;
  would_recommend: boolean;
  product_quality_rating: number;
  delivery_rating: number;
  customer_service_rating: number;
  value_for_money_rating: number;
  order_accuracy_rating: number;
  communication_rating: number;
}

const PRODUCT_CATEGORIES = [
  'Cement & Concrete',
  'Steel & Metal',
  'Roofing Materials',
  'Tiles & Flooring',
  'Electrical Supplies',
  'Plumbing Supplies',
  'Paint & Finishes',
  'Doors & Windows',
  'Hardware & Tools',
  'Insulation Materials',
  'Lumber & Wood',
  'Aggregates & Sand',
  'Other'
];

const ORDER_VALUES = [
  'Under KES 10K',
  'KES 10K - 50K',
  'KES 50K - 100K',
  'KES 100K - 500K',
  'KES 500K - 1M',
  'KES 1M - 5M',
  'Over KES 5M'
];

const DELIVERY_TIMES = [
  'Same day',
  '1-2 days',
  '3-5 days',
  '1-2 weeks',
  '2-4 weeks',
  'Over 1 month'
];

export const SupplierReviewModal: React.FC<SupplierReviewModalProps> = ({
  isOpen,
  onClose,
  supplierName,
  supplierId,
  onSubmitReview
}) => {
  const [reviewData, setReviewData] = useState<SupplierReviewData>({
    client_name: '',
    rating: 5,
    comment: '',
    product_category: '',
    order_value: '',
    delivery_time: '',
    would_recommend: true,
    product_quality_rating: 5,
    delivery_rating: 5,
    customer_service_rating: 5,
    value_for_money_rating: 5,
    order_accuracy_rating: 5,
    communication_rating: 5
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

    if (!reviewData.product_category) {
      toast({
        title: "Missing Information",
        description: "Please select the product category.",
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
      product_category: '',
      order_value: '',
      delivery_time: '',
      would_recommend: true,
      product_quality_rating: 5,
      delivery_rating: 5,
      customer_service_rating: 5,
      value_for_money_rating: 5,
      order_accuracy_rating: 5,
      communication_rating: 5
    });
    
    onClose();
    
    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback! Your review will help other builders make informed decisions."
    });
  };

  const renderStarRating = (
    rating: number, 
    onChange: (rating: number) => void,
    label: string,
    icon?: React.ReactNode
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        {icon}
        {label}
      </Label>
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Review {supplierName}
          </DialogTitle>
          <DialogDescription>
            Share your experience with this supplier to help other builders make informed purchasing decisions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Your Name/Company *</Label>
              <Input
                id="client_name"
                value={reviewData.client_name}
                onChange={(e) => setReviewData(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Enter your name or company"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_category">Product Category *</Label>
              <Select 
                value={reviewData.product_category} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, product_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {category}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_value">Order Value</Label>
              <Select 
                value={reviewData.order_value} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, order_value: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select order value range" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_VALUES.map((value) => (
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
              <Label htmlFor="delivery_time">Delivery Time</Label>
              <Select 
                value={reviewData.delivery_time} 
                onValueChange={(value) => setReviewData(prev => ({ ...prev, delivery_time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_TIMES.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {time}
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
              "Overall Experience",
              <Shield className="h-4 w-4" />
            )}
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detailed Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderStarRating(
                reviewData.product_quality_rating,
                (rating) => setReviewData(prev => ({ ...prev, product_quality_rating: rating })),
                "Product Quality",
                <Package className="h-4 w-4" />
              )}
              {renderStarRating(
                reviewData.delivery_rating,
                (rating) => setReviewData(prev => ({ ...prev, delivery_rating: rating })),
                "Delivery Service",
                <Truck className="h-4 w-4" />
              )}
              {renderStarRating(
                reviewData.customer_service_rating,
                (rating) => setReviewData(prev => ({ ...prev, customer_service_rating: rating })),
                "Customer Service"
              )}
              {renderStarRating(
                reviewData.value_for_money_rating,
                (rating) => setReviewData(prev => ({ ...prev, value_for_money_rating: rating })),
                "Value for Money",
                <DollarSign className="h-4 w-4" />
              )}
              {renderStarRating(
                reviewData.order_accuracy_rating,
                (rating) => setReviewData(prev => ({ ...prev, order_accuracy_rating: rating })),
                "Order Accuracy"
              )}
              {renderStarRating(
                reviewData.communication_rating,
                (rating) => setReviewData(prev => ({ ...prev, communication_rating: rating })),
                "Communication"
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
              placeholder="Share your experience with this supplier. How was the product quality? Was delivery on time? How was their customer service?"
              rows={4}
              required
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label>Would you recommend this supplier?</Label>
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
            <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
              Submit Review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
