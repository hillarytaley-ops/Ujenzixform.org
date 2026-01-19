import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Mail,
  Calendar,
  Send,
  Reply,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { FeedbackRecord } from '../types';
import { StatsCard, StatsGrid } from '../components/StatsCard';
import { DataTable, StatusBadge, Column, RowAction } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedbackTabProps {
  feedback: FeedbackRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({
  feedback,
  loading,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const total = feedback.length;
    const positive = feedback.filter((f) => f.rating >= 4).length;
    const negative = feedback.filter((f) => f.rating > 0 && f.rating <= 2).length;
    const neutral = feedback.filter((f) => f.rating === 3).length;
    const unrated = feedback.filter((f) => !f.rating || f.rating === 0).length;
    const replied = feedback.filter((f) => f.admin_reply).length;
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating > 0).length
      : 0;

    return { total, positive, negative, neutral, unrated, replied, avgRating };
  }, [feedback]);

  // Handle opening reply dialog
  const handleReply = (item: FeedbackRecord) => {
    setSelectedFeedback(item);
    setReplyText(item.admin_reply || '');
    setReplyDialogOpen(true);
  };

  // Handle viewing feedback details
  const handleView = (item: FeedbackRecord) => {
    setSelectedFeedback(item);
    setViewDialogOpen(true);
  };

  // Submit reply
  const submitReply = async () => {
    if (!selectedFeedback || !replyText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a reply message',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('feedback')
        .update({
          admin_reply: replyText.trim(),
          admin_reply_at: new Date().toISOString(),
          replied_by: userData.user?.id,
          replied_by_name: profile?.full_name || 'Admin',
          status: 'replied',
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast({
        title: 'Reply Sent',
        description: 'Your reply has been saved successfully',
      });

      setReplyDialogOpen(false);
      setReplyText('');
      setSelectedFeedback(null);
      onRefresh();
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit reply. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark as read
  const markAsRead = async (item: FeedbackRecord) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: 'read' })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Marked as Read',
        description: 'Feedback has been marked as read',
      });
      onRefresh();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  // Render rating stars
  const renderRating = (rating: number) => {
    if (!rating || rating === 0) {
      return <span className="text-gray-500 text-sm">No rating</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 ml-1">({rating})</span>
      </div>
    );
  };

  // Table columns
  const columns: Column<FeedbackRecord>[] = [
    {
      key: 'user_email',
      label: 'From',
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          {row.name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-gray-500" />
              <span className="text-white font-medium">{row.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-gray-500" />
            <span className="text-gray-400 text-sm">{row.user_email}</span>
          </div>
          {row.user_type && (
            <Badge variant="outline" className="text-xs border-slate-600">
              {row.user_type}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (_, row) => (
        <div>
          <p className="text-white font-medium">{row.subject || 'No subject'}</p>
          <p className="text-gray-400 text-sm line-clamp-2">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (v) => (
        <Badge className="bg-slate-700">{v as string}</Badge>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (v) => renderRating(v as number),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v, row) => (
        <div className="space-y-1">
          <StatusBadge status={v as string} />
          {row.admin_reply && (
            <Badge className="bg-green-600/20 text-green-400 text-xs">
              <Reply className="h-3 w-3 mr-1" />
              Replied
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Calendar className="h-3 w-3" />
          {new Date(v as string).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Table actions
  const actions: RowAction<FeedbackRecord>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: handleView,
    },
    {
      label: 'Mark as Read',
      icon: CheckCircle,
      onClick: markAsRead,
      show: (row) => row.status === 'pending',
    },
    {
      label: row => row.admin_reply ? 'Edit Reply' : 'Reply',
      icon: Reply,
      onClick: handleReply,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid columns={6}>
        <StatsCard
          title="Total Feedback"
          value={stats.total}
          icon={MessageSquare}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Positive"
          value={stats.positive}
          subtitle="4-5 stars"
          icon={ThumbsUp}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Negative"
          value={stats.negative}
          subtitle="1-2 stars"
          icon={ThumbsDown}
          iconColor="text-red-500"
        />
        <StatsCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          iconColor="text-yellow-500"
        />
        <StatsCard
          title="Pending"
          value={feedback.filter((f) => f.status === 'pending').length}
          icon={Clock}
          iconColor="text-orange-500"
        />
        <StatsCard
          title="Replied"
          value={stats.replied}
          icon={Reply}
          iconColor="text-purple-500"
        />
      </StatsGrid>

      {/* Rating Distribution */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = feedback.filter((f) => f.rating === rating).length;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm text-gray-400">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rating >= 4
                          ? 'bg-green-500'
                          : rating === 3
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <DataTable
        title="Feedback Messages"
        description="View and manage user feedback submissions"
        icon={MessageSquare}
        data={feedback}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search feedback..."
        emptyState={{
          icon: MessageSquare,
          title: 'No Feedback Yet',
          description: 'User feedback will appear here once submitted',
        }}
        onRefresh={onRefresh}
        pageSize={10}
      />

      {/* Recent Feedback Cards */}
      {feedback.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              Recent Feedback
            </CardTitle>
            <CardDescription className="text-gray-400">
              Latest feedback submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedback.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">
                        {item.name || item.user_email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderRating(item.rating)}
                      <StatusBadge status={item.status} />
                      {item.admin_reply && (
                        <Badge className="bg-green-600/20 text-green-400">
                          <Reply className="h-3 w-3 mr-1" />
                          Replied
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.subject && (
                    <p className="text-sm text-blue-400 mb-1">{item.subject}</p>
                  )}
                  <p className="text-gray-300 text-sm">{item.message}</p>
                  
                  {/* Show admin reply if exists */}
                  {item.admin_reply && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                      <p className="text-xs text-green-400 mb-1 flex items-center gap-1">
                        <Reply className="h-3 w-3" />
                        Admin Reply {item.replied_by_name && `by ${item.replied_by_name}`}
                        {item.admin_reply_at && ` • ${new Date(item.admin_reply_at).toLocaleDateString()}`}
                      </p>
                      <p className="text-gray-300 text-sm">{item.admin_reply}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3">
                    {item.user_type && (
                      <Badge variant="outline" className="text-xs border-slate-600">
                        {item.user_type}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto text-xs"
                      onClick={() => handleReply(item)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      {item.admin_reply ? 'Edit Reply' : 'Reply'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Reply className="h-5 w-5 text-blue-500" />
              {selectedFeedback?.admin_reply ? 'Edit Reply' : 'Reply to Feedback'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Your reply will be saved and associated with this feedback
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Original Feedback */}
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">
                      {selectedFeedback.name || selectedFeedback.user_email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(selectedFeedback.created_at).toLocaleString()}
                    </p>
                  </div>
                  {renderRating(selectedFeedback.rating)}
                </div>
                {selectedFeedback.subject && (
                  <p className="text-sm text-blue-400 mb-1">{selectedFeedback.subject}</p>
                )}
                <p className="text-gray-300 text-sm">{selectedFeedback.message}</p>
              </div>

              {/* Reply Input */}
              <div className="space-y-2">
                <Label htmlFor="reply" className="text-white">Your Reply</Label>
                <Textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="min-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                  rows={5}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyText('');
                setSelectedFeedback(null);
              }}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReply}
              disabled={isSubmitting || !replyText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {selectedFeedback?.admin_reply ? 'Update Reply' : 'Send Reply'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              Feedback Details
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs">From</Label>
                  <p className="text-white">{selectedFeedback.name || 'Anonymous'}</p>
                  <p className="text-gray-400 text-sm">{selectedFeedback.user_email}</p>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Submitted</Label>
                  <p className="text-white">
                    {new Date(selectedFeedback.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {new Date(selectedFeedback.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs">Category</Label>
                  <Badge className="bg-slate-700 mt-1">{selectedFeedback.category}</Badge>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Rating</Label>
                  <div className="mt-1">{renderRating(selectedFeedback.rating)}</div>
                </div>
              </div>

              {selectedFeedback.user_type && (
                <div>
                  <Label className="text-gray-400 text-xs">User Type</Label>
                  <Badge variant="outline" className="mt-1 border-slate-600">
                    {selectedFeedback.user_type}
                  </Badge>
                </div>
              )}

              {/* Message */}
              <div>
                <Label className="text-gray-400 text-xs">Subject</Label>
                <p className="text-blue-400 font-medium">
                  {selectedFeedback.subject || 'No subject'}
                </p>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Message</Label>
                <p className="text-gray-300 bg-slate-800/50 p-3 rounded-lg mt-1">
                  {selectedFeedback.message}
                </p>
              </div>

              {/* Admin Reply */}
              {selectedFeedback.admin_reply && (
                <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <Label className="text-green-400 text-xs flex items-center gap-1">
                    <Reply className="h-3 w-3" />
                    Admin Reply
                    {selectedFeedback.replied_by_name && ` by ${selectedFeedback.replied_by_name}`}
                  </Label>
                  <p className="text-gray-300 mt-1">{selectedFeedback.admin_reply}</p>
                  {selectedFeedback.admin_reply_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Replied on {new Date(selectedFeedback.admin_reply_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-slate-700"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setViewDialogOpen(false);
                if (selectedFeedback) handleReply(selectedFeedback);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Reply className="h-4 w-4 mr-2" />
              {selectedFeedback?.admin_reply ? 'Edit Reply' : 'Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


