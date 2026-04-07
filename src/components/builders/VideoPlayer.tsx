import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
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
  Phone,
  Mail,
  Building,
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
    phone?: string;
    email?: string;
    location?: string;
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
      console.log('💬 Fetching comments for video:', video.id);
      
      // Use REST API to bypass RLS issues
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/video_comments?video_id=eq.${video.id}&is_approved=eq.true&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      );

      if (!response.ok) {
        console.error('💬 Failed to fetch comments:', response.status);
        return;
      }

      const data = await response.json();
      console.log('💬 Fetched', data?.length || 0, 'comments');

      // Organize comments with replies
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      data?.forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      data?.forEach((comment: any) => {
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
      // Get user info from localStorage
      let userId: string | null = null;
      let accessToken = '';
      
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id || null;
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      if (userId) {
        // Check via REST API
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/video_likes?video_id=eq.${video.id}&user_id=eq.${userId}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data && data.length > 0);
        }
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
      // Get user info from localStorage
      let userId: string | null = null;
      let accessToken = '';
      
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id || null;
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}

      if (isLiked) {
        // Unlike - delete the like record
        console.log('💔 Removing like via REST API...');
        
        let deleteUrl = `${SUPABASE_URL}/rest/v1/video_likes?video_id=eq.${video.id}`;
        if (userId) {
          deleteUrl += `&user_id=eq.${userId}`;
        }
        
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          },
        });

        if (response.ok) {
          console.log('💔 Like removed successfully!');
        } else {
          console.error('💔 Unlike failed:', response.status);
        }
        
        setIsLiked(false);
        setLocalLikesCount(prev => Math.max(0, prev - 1));
        
        // Update localStorage
        const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
        const updatedLikes = guestLikes.filter((id: string) => id !== video.id);
        localStorage.setItem('guestLikes', JSON.stringify(updatedLikes));
      } else {
        // Like using REST API
        console.log('❤️ Adding like via REST API...');
        
        const guestIdentifier = !userId ? `guest-${Date.now()}` : null;
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/video_likes`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            video_id: video.id,
            user_id: userId,
            guest_identifier: guestIdentifier,
          }),
        });

        if (response.status === 409) {
          // Already liked - this means we should toggle to unlike
          console.log('❤️ Already liked, toggling to unlike...');
          setIsLiked(true);
          // Try to delete instead
          const deleteUrl = `${SUPABASE_URL}/rest/v1/video_likes?video_id=eq.${video.id}${userId ? `&user_id=eq.${userId}` : ''}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          });
          setIsLiked(false);
          setLocalLikesCount(prev => Math.max(0, prev - 1));
          return;
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error('❤️ Like failed:', response.status, errorText);
        } else {
          console.log('❤️ Like added successfully!');
        }
        
        setIsLiked(true);
        setLocalLikesCount(prev => prev + 1);
        
        // Update localStorage
        const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
        if (!guestLikes.includes(video.id)) {
          guestLikes.push(video.id);
          localStorage.setItem('guestLikes', JSON.stringify(guestLikes));
        }
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
      
      // Get user info
      let userId: string | null = null;
      let userEmail: string | null = null;
      let userName: string = commenterName.trim() || 'Anonymous';
      let accessToken = '';
      
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id || null;
          userEmail = parsed.user?.email || null;
          userName = parsed.user?.user_metadata?.full_name || parsed.user?.email?.split('@')[0] || userName;
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}

      // If not logged in, require name
      if (!userId && !commenterName.trim()) {
        toast({
          title: 'Name required',
          description: 'Please enter your name to comment',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      console.log('💬 Posting comment via REST API...');
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/video_comments`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          video_id: video.id,
          user_id: userId,
          commenter_name: userName,
          commenter_email: userEmail || commenterEmail || null,
          comment_text: newComment,
          parent_comment_id: replyTo,
          is_approved: true, // Auto-approve for now
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💬 Comment post failed:', response.status, errorText);
        throw new Error('Failed to post comment');
      }

      console.log('💬 Comment posted successfully!');

      toast({
        title: '✅ Comment posted!',
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
        description: 'Failed to post comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});

  const handleCommentLike = async (commentId: string) => {
    // Toggle like state locally
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
    
    toast({
      title: commentLikes[commentId] ? 'Unliked' : '❤️ Liked!',
      description: 'Comment reaction updated',
    });
  };

  const handleReply = (commentId: string, commenterName: string) => {
    setReplyTo(commentId);
    setNewComment(`@${commenterName} `);
    document.getElementById('comment-input')?.focus();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-10 mt-2' : 'mt-3'}`}>
      <div className="flex items-start space-x-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-bold">
            {comment.commenter_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
            <span className="font-semibold text-sm text-gray-900 block">{comment.commenter_name}</span>
            <p className="text-sm text-gray-800">{comment.comment_text}</p>
          </div>
          <div className="flex items-center space-x-3 mt-1 ml-2 text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
            <button 
              className={`font-semibold hover:underline ${commentLikes[comment.id] ? 'text-blue-600' : ''}`}
              onClick={() => handleCommentLike(comment.id)}
            >
              {commentLikes[comment.id] ? '❤️ Liked' : 'Like'}
            </button>
            {!isReply && (
              <button 
                className="font-semibold hover:underline"
                onClick={() => handleReply(comment.id, comment.commenter_name)}
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
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
              playsInline
              className="w-full h-full max-h-[95vh] object-contain"
              onError={() => {
                toast({
                  title: 'Video could not play',
                  description:
                    'Check your connection, try another browser, or re-export as H.264 MP4 if this was recorded on a phone.',
                  variant: 'destructive',
                });
              }}
            />
          </div>

          {/* Info & Comments Section */}
          <div className="flex flex-col h-full max-h-[95vh] bg-white">
            {/* Video Info Header */}
            <div className="p-4 border-b space-y-3">
              <DialogHeader>
                <DialogTitle className="text-xl">{video.title}</DialogTitle>
              </DialogHeader>

              {/* Builder Info - Always show with defaults */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Avatar className="h-12 w-12 border-2 border-orange-300">
                    <AvatarImage src={video.builder_profile?.avatar_url} />
                    <AvatarFallback className="bg-orange-500 text-white font-bold">
                      {(video.builder_profile?.company_name || video.builder_profile?.full_name || video.title || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-gray-900">
                      {video.builder_profile?.company_name || video.builder_profile?.full_name || video.title?.split(' ')[0] || 'UjenziXform'}
                    </p>
                    <p className="text-xs text-gray-600">Professional Builder</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-3 w-3 mr-2 text-green-600" />
                    <a href={`tel:${video.builder_profile?.phone || '+254700000000'}`} className="hover:text-green-600">
                      {video.builder_profile?.phone || '+254 700 000 000'}
                    </a>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-3 w-3 mr-2 text-blue-600" />
                    <a href={`mailto:${video.builder_profile?.email || 'info@ujenzixform.org'}`} className="hover:text-blue-600 text-xs">
                      {video.builder_profile?.email || 'info@ujenzixform.org'}
                    </a>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Building className="h-3 w-3 mr-2 text-purple-600" />
                    <span className="text-xs">{video.builder_profile?.location || 'Kenya'}</span>
                  </div>
                </div>
              </div>

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

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-500 pt-2 border-t">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {video.views_count || 0} views
                </div>
                <div className="flex items-center">
                  <span className="text-base mr-1">👍❤️</span>
                  {localLikesCount}
                </div>
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {comments.length} comments
                </div>
              </div>

              {/* Facebook-style Reaction Bar */}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                {/* Reaction Button with Hover Menu */}
                <div className="relative group flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`w-full justify-center hover:bg-gray-100 ${isLiked ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    {isLiked ? (
                      <>
                        <span className="text-xl mr-2">👍</span>
                        <span className="font-semibold">Liked</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="h-5 w-5 mr-2" />
                        <span>Like</span>
                      </>
                    )}
                  </Button>
                  
                  {/* Reaction Popup on Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex bg-white rounded-full shadow-lg border p-1 space-x-1 z-50">
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Like"
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Love"
                    >
                      ❤️
                    </button>
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Haha"
                    >
                      😂
                    </button>
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Wow"
                    >
                      😮
                    </button>
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Sad"
                    >
                      😢
                    </button>
                    <button 
                      onClick={() => { handleLike(); }} 
                      className="text-2xl hover:scale-125 transition-transform p-1"
                      title="Angry"
                    >
                      😡
                    </button>
                  </div>
                </div>

                {/* Comment Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center text-gray-600 hover:bg-gray-100"
                  onClick={() => document.getElementById('comment-input')?.focus()}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  <span>Comment</span>
                </Button>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center text-gray-600 hover:bg-gray-100"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link copied!", description: "Share this video with others" });
                  }}
                >
                  <Send className="h-5 w-5 mr-2" />
                  <span>Share</span>
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
                <div className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">↩️</span>
                    <span className="text-gray-700">Replying to comment</span>
                  </div>
                  <button
                    className="text-gray-500 hover:text-red-500 font-medium text-xs"
                    onClick={() => {
                      setReplyTo(null);
                      setNewComment('');
                    }}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                    {commenterName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Textarea
                    id="comment-input"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    rows={1}
                    className="resize-none rounded-2xl bg-gray-100 border-0 pr-10 min-h-[40px]"
                  />
                  <button 
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || !newComment.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 disabled:text-gray-300"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Guest Name field - only show if not logged in */}
              {!commenterName && (
                <Input
                  placeholder="Your name (optional)"
                  value={commenterName}
                  onChange={(e) => setCommenterName(e.target.value)}
                  className="text-sm h-8 rounded-full bg-gray-100 border-0"
                />
              )}
              
              <p className="text-xs text-gray-400 text-center">
                Press Enter to post • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};















