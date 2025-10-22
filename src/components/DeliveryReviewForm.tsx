import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";

interface DeliveryReviewFormProps {
  deliveryId: string;
  onReviewSubmitted?: () => void;
}

const DeliveryReviewForm = ({ deliveryId, onReviewSubmitted }: DeliveryReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Rating Required",
        description: "Please select a rating before submitting"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          delivery_id: deliveryId,
          rating,
          comment: comment.trim() || null,
          category: 'delivery'
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!"
      });

      setRating(0);
      setComment("");
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit review. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          className="p-1"
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(starValue)}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              isActive ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
            }`}
          />
        </button>
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Rate This Delivery
        </CardTitle>
        <CardDescription>
          Share your experience to help us improve our service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-1">
              {renderStars()}
              <span className="text-sm text-muted-foreground ml-2">
                {rating > 0 && (
                  <>
                    {rating} out of 5 star{rating !== 1 ? 's' : ''}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comments (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your delivery experience..."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading || rating === 0} className="w-full">
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DeliveryReviewForm;