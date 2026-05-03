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
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreHorizontal,
  Flag,
  Smile,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  dislikes_count?: number;
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
  likes_count?: number;
  emoji_reactions?: Record<string, number>;
  replies?: Comment[];
}

interface EnhancedVideoPlayerProps {
  video: BuilderVideo;
  isOpen: boolean;
  onClose: () => void;
  onVideoUpdate?: () => void;
}

// Emoji reactions available
const EMOJI_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😍", label: "Amazing" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "👏", label: "Clap" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🏗️", label: "Building" },
  { emoji: "⭐", label: "Star" },
];

export const EnhancedVideoPlayer = ({ video, isOpen, onClose, onVideoUpdate }: EnhancedVideoPlayerProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [commenterEmail, setCommenterEmail] = useState("");
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [localLikesCount, setLocalLikesCount] = useState(video.likes_count || 0);
  const [localDislikesCount, setLocalDislikesCount] = useState(video.dislikes_count || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [videoEmojiReactions, setVideoEmojiReactions] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchStartTime = useRef<number>(Date.now());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      checkUserReaction();
      fetchVideoReactions();
      getCurrentUser();
      setLocalLikesCount(video.likes_count || 0);
      setLocalDislikesCount(video.dislikes_count || 0);
    }
  }, [isOpen, video.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchVideoReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('video_emoji_reactions')
        .select('emoji')
        .eq('video_id', video.id);

      if (error) {
        console.warn('Video reactions table may not exist:', error.message);
        return;
      }

      // Count reactions
      const reactionCounts: Record<string, number> = {};
      data?.forEach((r) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });
      setVideoEmojiReactions(reactionCounts);
    } catch (error) {
      console.warn('Error fetching video reactions:', error);
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

  const checkUserReaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('video_likes')
          .select('reaction_type')
          .eq('video_id', video.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setUserReaction(data.reaction_type as 'like' | 'dislike');
        }
      } else {
        // Check guest reactions using localStorage
        const guestReactions = localStorage.getItem('guestVideoReactions');
        if (guestReactions) {
          const reactions = JSON.parse(guestReactions);
          setUserReaction(reactions[video.id] || null);
        }
      }
    } catch (error) {
      console.error('Error checking reaction status:', error);
    }
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const previousReaction = userReaction;

      // Update local state optimistically
      if (previousReaction === type) {
        // Remove reaction
        setUserReaction(null);
        if (type === 'like') setLocalLikesCount(prev => Math.max(0, prev - 1));
        else setLocalDislikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Add or change reaction
        setUserReaction(type);
        if (type === 'like') {
          setLocalLikesCount(prev => prev + 1);
          if (previousReaction === 'dislike') setLocalDislikesCount(prev => Math.max(0, prev - 1));
        } else {
          setLocalDislikesCount(prev => prev + 1);
          if (previousReaction === 'like') setLocalLikesCount(prev => Math.max(0, prev - 1));
        }
      }

      if (user) {
        if (previousReaction === type) {
          // Remove reaction
          await supabase
            .from('video_likes')
            .delete()
            .eq('video_id', video.id)
            .eq('user_id', user.id);
        } else if (previousReaction) {
          // Update reaction
          await supabase
            .from('video_likes')
            .update({ reaction_type: type })
            .eq('video_id', video.id)
            .eq('user_id', user.id);
        } else {
          // Insert new reaction
          await supabase.from('video_likes').insert({
            video_id: video.id,
            user_id: user.id,
            reaction_type: type
          });
        }
      } else {
        // Guest reaction - store in localStorage
        const guestReactions = JSON.parse(localStorage.getItem('guestVideoReactions') || '{}');
        if (previousReaction === type) {
          delete guestReactions[video.id];
        } else {
          guestReactions[video.id] = type;
        }
        localStorage.setItem('guestVideoReactions', JSON.stringify(guestReactions));
      }

      if (onVideoUpdate) {
        onVideoUpdate();
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reaction',
        variant: 'destructive',
      });
    }
  };

  const handleEmojiReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update local state
      setVideoEmojiReactions(prev => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + 1
      }));

      // Save to database
      await supabase.from('video_emoji_reactions').insert({
        video_id: video.id,
        user_id: user?.id || null,
        emoji: emoji,
        guest_identifier: !user ? `guest-${Date.now()}` : null
      });

      setShowEmojiPicker(null);
      
      toast({
        title: `${emoji} Added!`,
        description: 'Your reaction has been recorded',
      });
    } catch (error) {
      console.warn('Error adding emoji reaction:', error);
    }
  };

  const handleCommentEmojiReaction = async (commentId: string, emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('comment_emoji_reactions').insert({
        comment_id: commentId,
        user_id: user?.id || null,
        emoji: emoji,
        guest_identifier: !user ? `guest-${Date.now()}` : null
      });

      setShowEmojiPicker(null);
      fetchComments();
      
      toast({
        title: `${emoji} Added!`,
        description: 'Your reaction has been added to the comment',
      });
    } catch (error) {
      console.warn('Error adding comment emoji:', error);
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
        commenter_name: user ? (currentUser?.user_metadata?.full_name || 'User') : commenterName,
        commenter_email: user ? user.email : commenterEmail || null,
        comment_text: newComment,
        parent_comment_id: replyTo,
        is_approved: true // Auto-approve for now
      });

      if (error) throw error;

      toast({
        title: 'Comment posted!',
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/builder/${video.builder_id}?video=${video.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Check out this project video: ${video.title}`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Video link has been copied to clipboard',
      });
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'mt-4'} space-y-2`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
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
          
          {/* Comment Actions */}
          <div className="flex items-center gap-2 mt-2">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setReplyTo(comment.id)}
              >
                Reply
              </Button>
            )}
            
            {/* Emoji Reaction for Comment */}
            <Popover open={showEmojiPicker === comment.id} onOpenChange={(open) => setShowEmojiPicker(open ? comment.id : null)}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                  <Smile className="h-3 w-3 mr-1" />
                  React
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1 flex-wrap">
                  {EMOJI_REACTIONS.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      onClick={() => handleCommentEmojiReaction(comment.id, reaction.emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1 hover:bg-gray-100 rounded"
                      title={reaction.label}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Display emoji reactions on comment */}
            {comment.emoji_reactions && Object.entries(comment.emoji_reactions).length > 0 && (
              <div className="flex gap-1">
                {Object.entries(comment.emoji_reactions).map(([emoji, count]) => (
                  <span key={emoji} className="text-xs bg-gray-200 rounded-full px-2 py-0.5">
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}
          </div>
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
          <div className="lg:col-span-2 bg-black flex items-center justify-center relative">
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
                <DialogTitle className="text-xl pr-8">{video.title}</DialogTitle>
              </DialogHeader>

              {/* Builder Info */}
              {video.builder_profile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-10 w-10 border-2 border-blue-200">
                      <AvatarImage src={video.builder_profile.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {(video.builder_profile.company_name || video.builder_profile.full_name).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium block">
                        {video.builder_profile.company_name || video.builder_profile.full_name}
                      </span>
                      <span className="text-xs text-gray-500">CO/Contractor</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                    View Profile
                  </Button>
                </div>
              )}

              {/* Project Details */}
              <div className="flex flex-wrap gap-2 text-sm">
                {video.project_type && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    {video.project_type}
                  </Badge>
                )}
                {video.project_location && (
                  <Badge variant="outline" className="text-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    {video.project_location}
                  </Badge>
                )}
                {video.project_duration && (
                  <Badge variant="outline" className="text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {video.project_duration}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
              )}

              {/* Like/Dislike/Share Actions */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  {/* Like Button */}
                  <Button
                    variant={userReaction === 'like' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleReaction('like')}
                    className={userReaction === 'like' ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <ThumbsUp className={`h-4 w-4 mr-1 ${userReaction === 'like' ? 'fill-current' : ''}`} />
                    {localLikesCount}
                  </Button>

                  {/* Dislike Button */}
                  <Button
                    variant={userReaction === 'dislike' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleReaction('dislike')}
                    className={userReaction === 'dislike' ? "bg-gray-600 hover:bg-gray-700" : ""}
                  >
                    <ThumbsDown className={`h-4 w-4 mr-1 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
                    {localDislikesCount}
                  </Button>

                  {/* Emoji Reactions */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {EMOJI_REACTIONS.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleEmojiReaction(reaction.emoji)}
                            className="text-2xl hover:scale-125 transition-transform p-1 hover:bg-gray-100 rounded"
                            title={reaction.label}
                          >
                            {reaction.emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  {/* Share Button */}
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>

                  {/* More Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Flag className="h-4 w-4 mr-2" />
                        Report Video
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Emoji Reactions Display */}
              {Object.keys(videoEmojiReactions).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(videoEmojiReactions).map(([emoji, count]) => (
                    <span 
                      key={emoji} 
                      className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm hover:bg-gray-200 cursor-pointer transition-colors"
                      onClick={() => handleEmojiReaction(emoji)}
                    >
                      {emoji} <span className="text-gray-600">{count}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 pt-2">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {video.views_count} views
                </div>
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {comments.length} comments
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
                Comments ({comments.length})
              </h3>

              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    No comments yet. Be the first to comment!
                  </p>
                </div>
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
                    <X className="h-4 w-4" />
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
              {!currentUser && (
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

