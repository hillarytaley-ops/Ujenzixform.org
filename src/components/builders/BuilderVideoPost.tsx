import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Send,
  Heart,
  Smile,
  Image as ImageIcon,
  Globe,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Link2,
  X,
  Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface VideoComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  replies?: VideoComment[];
}

export interface BuilderVideoPostProps {
  id: string;
  builderId: string;
  builderName: string;
  builderCompany?: string;
  builderAvatar?: string;
  builderVerified?: boolean;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  caption: string;
  location?: string;
  timestamp: Date;
  likes: number;
  comments: VideoComment[];
  shares: number;
  isLiked?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  onShare?: (postId: string) => void;
  onViewProfile?: (builderId: string) => void;
  onContactBuilder?: (builderId: string) => void;
}

export const BuilderVideoPost: React.FC<BuilderVideoPostProps> = ({
  id,
  builderId,
  builderName,
  builderCompany,
  builderAvatar,
  builderVerified = false,
  videoUrl,
  imageUrl,
  thumbnailUrl,
  caption,
  location,
  timestamp,
  likes,
  comments,
  shares,
  isLiked = false,
  onLike,
  onComment,
  onShare,
  onViewProfile,
  onContactBuilder
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<VideoComment[]>(comments);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reaction emojis
  const reactions = [
    { emoji: '👍', name: 'Like', color: 'text-blue-500' },
    { emoji: '❤️', name: 'Love', color: 'text-red-500' },
    { emoji: '😂', name: 'Haha', color: 'text-yellow-500' },
    { emoji: '😮', name: 'Wow', color: 'text-yellow-500' },
    { emoji: '😢', name: 'Sad', color: 'text-yellow-500' },
    { emoji: '😡', name: 'Angry', color: 'text-orange-500' },
  ];

  const initials = (builderCompany || builderName || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(id);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    
    // Check if this is a reply
    const isReply = replyingTo !== null;
    const content = isReply 
      ? commentText.replace(`@${replyingTo?.name} `, '') 
      : commentText;
    
    const newComment: VideoComment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      content: isReply ? `@${replyingTo?.name} ${content}` : content,
      timestamp: new Date(),
      likes: 0,
      isLiked: false
    };
    
    setLocalComments(prev => [newComment, ...prev]);
    onComment?.(id, commentText);
    setCommentText('');
    setReplyingTo(null);
  };

  const handleCommentLike = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
    
    // Update comment likes count
    setLocalComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const wasLiked = likedComments.has(commentId);
        return {
          ...comment,
          likes: wasLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !wasLiked
        };
      }
      return comment;
    }));
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, name: userName });
    setCommentText(`@${userName} `);
    setShowComments(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Post link has been copied to clipboard",
    });
    onShare?.(id);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden">
      {/* Post Header - Facebook Style */}
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-12 w-12 ring-2 ring-blue-500 ring-offset-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onViewProfile?.(builderId)}
            >
              <AvatarImage src={builderAvatar} alt={builderName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                  onClick={() => onViewProfile?.(builderId)}
                >
                  {builderCompany || builderName}
                </span>
                {builderVerified && (
                  <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(timestamp)}
                </span>
                {location && (
                  <>
                    <span>•</span>
                    <span>{location}</span>
                  </>
                )}
                <span>•</span>
                <Globe className="h-3 w-3" />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onContactBuilder?.(builderId)}>
                <Phone className="h-4 w-4 mr-2" />
                Contact Builder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewProfile?.(builderId)}>
                <Mail className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>Save video</DropdownMenuItem>
              <DropdownMenuItem>Report</DropdownMenuItem>
              <DropdownMenuItem>Hide post</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Caption */}
      {caption && (
        <div className="px-4 pb-3">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{caption}</p>
        </div>
      )}

      {/* Media Display - Video or Image */}
      {videoUrl ? (
        /* Video Player - Facebook/Instagram Reels Style */
        <div 
          className="relative bg-gradient-to-b from-gray-900 to-black aspect-video cursor-pointer group overflow-hidden"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onClick={togglePlay}
        >
          {/* Thumbnail/Cover when not playing */}
          {!isPlaying && thumbnailUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center z-10"
              style={{ 
                backgroundImage: `url(${thumbnailUrl})`,
                filter: 'brightness(0.8)'
              }}
            />
          )}
          
          {/* Video element */}
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Gradient overlay for better visibility */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 z-20" />
          )}
          
          {/* Play Button Overlay - Modern Reels Style */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300 shadow-2xl border border-white/30">
                <Play className="h-10 w-10 text-white ml-1 drop-shadow-lg" fill="white" />
              </div>
            </div>
          )}
          
          {/* Video duration badge */}
          {!isPlaying && (
            <div className="absolute bottom-3 right-3 z-30 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm">
              <Video className="h-3 w-3 inline mr-1" />
              Video
            </div>
          )}
          
          {/* Builder info overlay when paused */}
          {!isPlaying && (
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Avatar className="h-6 w-6 border border-white/50">
                  <AvatarImage src={builderAvatar} />
                  <AvatarFallback className="text-xs bg-blue-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium drop-shadow-lg">
                  {builderCompany || builderName}
                </span>
                {builderVerified && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 fill-blue-400" />
                )}
              </div>
            </div>
          )}

          {/* Video Controls */}
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      ) : imageUrl && imageUrl.length > 0 ? (
        /* Image Display */
        <div className="relative bg-gray-100 dark:bg-gray-800 min-h-[200px]">
          <img
            src={imageUrl}
            alt={caption || 'Post image'}
            className="w-full max-h-[600px] object-contain"
            loading="lazy"
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              // Hide broken image
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', imageUrl);
            }}
          />
        </div>
      ) : null}

      {/* Engagement Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          {likeCount > 0 && (
            <>
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <ThumbsUp className="h-3 w-3 text-white" fill="white" />
                </div>
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <Heart className="h-3 w-3 text-white" fill="white" />
                </div>
              </div>
              <span className="ml-1 hover:underline cursor-pointer">{formatNumber(likeCount)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {localComments.length > 0 && (
            <span 
              className="hover:underline cursor-pointer"
              onClick={() => setShowComments(!showComments)}
            >
              {formatNumber(localComments.length)} comments
            </span>
          )}
          {shares > 0 && (
            <span className="hover:underline cursor-pointer">{formatNumber(shares)} shares</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Action Buttons - Facebook Style */}
      <div className="px-2 py-1">
        <div className="flex items-center justify-around">
          {/* Like Button with Reactions */}
          <div 
            className="relative flex-1"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            {/* Reaction Popup */}
            {showReactions && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => {
                      handleLike();
                      setShowReactions(false);
                    }}
                    className="text-2xl hover:scale-125 transition-transform p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title={reaction.name}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              className={`w-full h-10 gap-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${liked ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}
              onClick={handleLike}
            >
              {liked ? (
                <span className="text-lg">👍</span>
              ) : (
                <ThumbsUp className="h-5 w-5" />
              )}
              <span className="font-medium">Like</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            className="flex-1 h-10 gap-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">Comment</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 h-10 gap-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={handleShare}
          >
            <Link2 className="h-5 w-5" />
            <span className="font-medium">Share</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments Section */}
      {showComments && (
        <CardContent className="p-4 space-y-4">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Replying to <span className="font-semibold text-gray-900 dark:text-white">@{replyingTo.name}</span>
              </span>
              <button 
                onClick={() => {
                  setReplyingTo(null);
                  setCommentText('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Comment Input */}
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">You</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input
                ref={commentInputRef}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                className="pr-20 rounded-full bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-1"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                  <Smile className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                </Button>
                {commentText && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full text-blue-500"
                    onClick={handleComment}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {localComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.userAvatar} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                    {comment.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {comment.userName}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {/* Highlight @mentions */}
                      {comment.content.split(/(@\w+)/g).map((part, i) => 
                        part.startsWith('@') ? (
                          <span key={i} className="text-blue-500 font-medium">{part}</span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-1 ml-3 text-xs text-gray-500">
                    <span>{formatTimeAgo(comment.timestamp)}</span>
                    <button 
                      onClick={() => handleCommentLike(comment.id)}
                      className={`font-semibold hover:underline transition-colors ${
                        likedComments.has(comment.id) ? 'text-blue-500' : ''
                      }`}
                    >
                      {likedComments.has(comment.id) ? '❤️ Liked' : 'Like'}
                    </button>
                    <button 
                      onClick={() => handleReply(comment.id, comment.userName)}
                      className="font-semibold hover:underline"
                    >
                      Reply
                    </button>
                    {(comment.likes > 0 || likedComments.has(comment.id)) && (
                      <span className="flex items-center gap-1 text-blue-500">
                        <ThumbsUp className="h-3 w-3 fill-blue-500" />
                        {comment.likes + (likedComments.has(comment.id) && !comment.isLiked ? 1 : 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {localComments.length > 5 && (
            <Button variant="link" className="text-gray-500 p-0 h-auto">
              View more comments
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default BuilderVideoPost;
