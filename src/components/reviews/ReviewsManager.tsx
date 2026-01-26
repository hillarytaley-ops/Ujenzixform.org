/**
 * Reviews Manager Component
 * Admin and Supplier view for managing reviews
 */

import React, { useState, useEffect } from 'react';
import { Star, Shield, Flag, Eye, EyeOff, Trash2, Award, TrendingUp, MessageSquare, Calendar, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  supplier_id: string;
  reviewer_id: string;
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
  is_featured: boolean;
  helpful_count: number;
  status: string;
  created_at: string;
  suppliers?: { company_name: string };
}

interface ReviewsManagerProps {
  supplierId?: string; // If provided, show only this supplier's reviews
  isAdmin?: boolean;
}

const StarDisplay: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${
          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))}
  </div>
);

export const ReviewsManager: React.FC<ReviewsManagerProps> = ({ supplierId, isAdmin = false }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    flagged: 0,
    averageRating: 0
  });
  const { toast } = useToast();

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('supplier_reviews')
        .select(`
          *,
          suppliers:supplier_id (company_name)
        `)
        .order('created_at', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReviews(data || []);
      setFilteredReviews(data || []);

      // Calculate stats
      if (data) {
        const published = data.filter(r => r.status === 'published').length;
        const avgRating = data.length > 0 
          ? data.reduce((sum, r) => sum + r.overall_rating, 0) / data.length 
          : 0;

        setStats({
          total: data.length,
          published,
          pending: data.filter(r => r.status === 'pending').length,
          flagged: data.filter(r => r.status === 'flagged').length,
          averageRating: avgRating
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [supplierId]);

  useEffect(() => {
    let filtered = [...reviews];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.reviewer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.review_text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter(r => r.overall_rating === rating);
    }

    setFilteredReviews(filtered);
  }, [searchTerm, statusFilter, ratingFilter, reviews]);

  const updateReviewStatus = async (reviewId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('supplier_reviews')
        .update({ status: newStatus })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Review has been ${newStatus === 'published' ? 'published' : newStatus === 'hidden' ? 'hidden' : 'flagged'}.`
      });

      fetchReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: 'Failed to update review status',
        variant: 'destructive'
      });
    }
  };

  const toggleFeatured = async (reviewId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('supplier_reviews')
        .update({ is_featured: !currentFeatured })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: currentFeatured ? 'Unfeatured' : 'Featured',
        description: `Review has been ${currentFeatured ? 'removed from' : 'added to'} featured reviews.`
      });

      fetchReviews();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('supplier_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Review Deleted',
        description: 'The review has been permanently deleted.'
      });

      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-100 text-gray-800">Hidden</Badge>;
      case 'flagged':
        return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.published}</p>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flag className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{stats.flagged}</p>
            <p className="text-sm text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews ({filteredReviews.length})</CardTitle>
          <CardDescription>Manage and moderate customer reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No reviews found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {review.reviewer_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{review.reviewer_name || 'Anonymous'}</span>
                          {review.is_verified_purchase && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {review.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {getStatusBadge(review.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <StarDisplay rating={review.overall_rating} />
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          {new Date(review.created_at).toLocaleDateString()}
                          {!supplierId && review.suppliers && (
                            <>
                              <span>•</span>
                              <span>{review.suppliers.company_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {review.status === 'published' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateReviewStatus(review.id, 'hidden')}
                          title="Hide review"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateReviewStatus(review.id, 'published')}
                          title="Publish review"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeatured(review.id, review.is_featured)}
                        title={review.is_featured ? 'Remove from featured' : 'Feature review'}
                      >
                        <Award className={`h-4 w-4 ${review.is_featured ? 'text-yellow-500' : ''}`} />
                      </Button>
                      {review.status !== 'flagged' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateReviewStatus(review.id, 'flagged')}
                          title="Flag review"
                        >
                          <Flag className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Delete review">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The review will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteReview(review.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {review.title && (
                    <h5 className="font-semibold">{review.title}</h5>
                  )}

                  {review.review_text && (
                    <p className="text-sm text-muted-foreground">{review.review_text}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>👍 {review.helpful_count} helpful</span>
                    {review.quality_rating && <span>Quality: {review.quality_rating}★</span>}
                    {review.delivery_rating && <span>Delivery: {review.delivery_rating}★</span>}
                    {review.communication_rating && <span>Communication: {review.communication_rating}★</span>}
                    {review.value_rating && <span>Value: {review.value_rating}★</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewsManager;

