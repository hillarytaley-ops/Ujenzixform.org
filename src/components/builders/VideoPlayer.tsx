import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  MessageCircle,
  Send,
  Eye,
  MapPin,
  Clock,
  DollarSign,
  User,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  video_url: string;
  project_type: string | null;
  project_location: string | null;
  project_duration: string | null;
  project_cost_range: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  builder_profile?: {
    full_name: string;
    company_name: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  video_id: string;
  user_id: string | null;
  commenter_name: string;
  comment_text: string;
  created_at: string;
  parent_comment_id: string | null;
  replies?: Comment[];
}

interface VideoPlayerProps {
  video: BuilderVideo;
  isOpen: boolean;
  onClose: () => void;
  onVideoUpdate?: () => void;
}

export const VideoPlayer = ({ video, isOpen, onClose, onVideoUpdate }: VideoPlayerProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [commenterEmail, setCommenterEmail] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(video.likes_count);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchStartTime = useRef<number>(Date.now());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      checkIfLiked();
      setLocalLikesCount(video.likes_count);
    }
  }, [isOpen, video.id]);

  useEffect(() => {
    // Track watch time when component unmounts or video changes
    return () => {
      if (videoRef.current && watchStartTime.current) {
        const watchDuration = Math.floor((Date.now() - watchStartTime.current) / 1000);
        recordWatchDuration(watchDuration);
      }
    };
  }, []);

  const recordWatchDuration = async (duration: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('video_views').insert({
        video_id: video.id,
        user_id: user?.id || null,
        guest_identifier: !user ? `guest-${Date.now()}` : null,
        watch_duration: duration,
      });
    } catch (error) {
      console.error('Error recording watch duration:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', video.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organize comments with replies
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      data?.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      data?.forEach((comment) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies?.push(commentMap.get(comment.id)!);
          }
        } else {
          rootComments.push(commentMap.get(comment.id)!);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const checkIfLiked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', video.id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsLiked(!!data);
      } else {
        // Check guest likes using localStorage
        const guestLikes = localStorage.getItem('guestLikes');
        if (guestLikes) {
          const likes = JSON.parse(guestLikes);
          setIsLiked(likes.includes(video.id));
        }
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (isLiked) {
        // Unlike
        if (user) {
          await supabase
            .from('video_likes')
            .delete()
            .eq('video_id', video.id)
            .eq('user_id', user.id);
        } else {
          // Guest unlike
          const guestIdentifier = `guest-${Date.now()}`;
          await supabase
            .from('video_likes')
            .delete()
            .eq('video_id', video.id)
            .eq('guest_identifier', guestIdentifier);
          
          // Update localStorage
          const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
          const updatedLikes = guestLikes.filter((id: string) => id !== video.id);
          localStorage.setItem('guestLikes', JSON.stringify(updatedLikes));
        }
        
        setIsLiked(false);
        setLocalLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        if (user) {
          await supabase.from('video_likes').insert({
            video_id: video.id,
            user_id: user.id,
          });
        } else {
          // Guest like
          const guestIdentifier = `guest-${Date.now()}`;
          await supabase.from('video_likes').insert({
            video_id: video.id,
            guest_identifier: guestIdentifier,
          });
          
          // Update localStorage
          const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
          guestLikes.push(video.id);
          localStorage.setItem('guestLikes', JSON.stringify(guestLikes));
        }
        
        setIsLiked(true);
        setLocalLikesCount(prev => prev + 1);
      }

      if (onVideoUpdate) {
        onVideoUpdate();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please enter a comment',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      // If not logged in, require name
      if (!user && !commenterName.trim()) {
        toast({
          title: 'Name required',
          description: 'Please enter your name',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('video_comments').insert({
        video_id: video.id,
        user_id: user?.id || null,
        commenter_name: user ? (video.builder_profile?.full_name || 'Anonymous') : commenterName,
        commenter_email: user ? user.email : commenterEmail || null,
        comment_text: newComment,
        parent_comment_id: replyTo,
      });

      if (error) throw error;

      toast({
        title: 'Comment posted',
        description: 'Your comment has been added',
      });

      setNewComment("");
      setCommenterName("");
      setCommenterEmail("");
      setReplyTo(null);
      fetchComments();
      
      if (onVideoUpdate) {
        onVideoUpdate();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'mt-4'} space-y-2`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {comment.commenter_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{comment.commenter_name}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-gray-700">{comment.comment_text}</p>
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs"
              onClick={() => setReplyTo(comment.id)}
            >
              Reply
            </Button>
          )}
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full max-h-[95vh]">
          {/* Video Section */}
          <div className="lg:col-span-2 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={video.video_url}
              controls
              autoPlay
              className="w-full h-full max-h-[95vh] object-contain"
            />
          </div>

          {/* Info & Comments Section */}
          <div className="flex flex-col h-full max-h-[95vh] bg-white">
            {/* Video Info Header */}
            <div className="p-4 border-b space-y-3">
              <DialogHeader>
                <DialogTitle className="text-xl">{video.title}</DialogTitle>
              </DialogHeader>

              {/* Builder Info */}
              {video.builder_profile && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={video.builder_profile.avatar_url} />
                    <AvatarFallback>
                      {(video.builder_profile.company_name || video.builder_profile.full_name).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {video.builder_profile.company_name || video.builder_profile.full_name}
                  </span>
                </div>
              )}

              {/* Project Details */}
              <div className="space-y-2 text-sm">
                {video.project_type && (
                  <Badge variant="secondary">{video.project_type}</Badge>
                )}
                {video.project_location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {video.project_location}
                  </div>
                )}
                {video.project_duration && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Duration: {video.project_duration}
                  </div>
                )}
                {video.project_cost_range && (
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Budget: {video.project_cost_range}
                  </div>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <p className="text-sm text-gray-600">{video.description}</p>
              )}

              {/* Stats & Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {video.views_count}
                  </div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-1" />
                    {localLikesCount}
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {comments.length}
                  </div>
                </div>

                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? "bg-red-500 hover:bg-red-600" : ""}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Liked' : 'Like'}
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Comments ({comments.length})
              </h3>

              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => renderComment(comment))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t space-y-3 bg-gray-50">
              {replyTo && (
                <div className="flex items-center justify-between text-sm text-gray-600 bg-blue-50 p-2 rounded">
                  <span>Replying to comment...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="resize-none"
              />

              {/* Guest Name/Email fields */}
              {!supabase.auth.getUser() && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Your name *"
                    value={commenterName}
                    onChange={(e) => setCommenterName(e.target.value)}
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={commenterEmail}
                    onChange={(e) => setCommenterEmail(e.target.value)}
                  />
                </div>
              )}

              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};















