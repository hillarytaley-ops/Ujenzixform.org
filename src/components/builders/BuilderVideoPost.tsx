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
  Mail
} from 'lucide-react';
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
  videoUrl: string;
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
  const videoRef = useRef<HTMLVideoElement>(null);

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
    
    const newComment: VideoComment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      content: commentText,
      timestamp: new Date(),
      likes: 0,
      isLiked: false
    };
    
    setLocalComments(prev => [newComment, ...prev]);
    onComment?.(id, commentText);
    setCommentText('');
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

      {/* Video Player - Facebook Style */}
      <div 
        className="relative bg-black aspect-video cursor-pointer group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          muted={isMuted}
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
              <Play className="h-10 w-10 text-white ml-1" fill="white" />
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
          <Button
            variant="ghost"
            className={`flex-1 h-10 gap-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${liked ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={handleLike}
          >
            <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-blue-500' : ''}`} />
            <span className="font-medium">Like</span>
          </Button>
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
            onClick={() => onShare?.(id)}
          >
            <Share2 className="h-5 w-5" />
            <span className="font-medium">Share</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments Section */}
      {showComments && (
        <CardContent className="p-4 space-y-4">
          {/* Comment Input */}
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">You</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
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
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-1 ml-3 text-xs text-gray-500">
                    <span>{formatTimeAgo(comment.timestamp)}</span>
                    <button className="font-semibold hover:underline">Like</button>
                    <button className="font-semibold hover:underline">Reply</button>
                    {comment.likes > 0 && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {comment.likes}
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
