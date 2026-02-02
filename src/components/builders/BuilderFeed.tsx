import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Image as ImageIcon, 
  Smile, 
  MapPin, 
  Users,
  Camera,
  FileVideo,
  X,
  Upload,
  Globe,
  Lock,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';

interface BuilderFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onUploadVideo?: (file: File, caption: string) => void;
}

// Sample demo posts for builders
const DEMO_POSTS: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'>[] = [
  {
    id: 'post-1',
    builderId: 'builder-1',
    builderName: 'John Kamau',
    builderCompany: 'Kamau Construction Ltd',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: '',
    caption: '🏗️ Progress update on our latest residential project in Karen, Nairobi! The foundation work is complete and we\'re moving to the structural phase. Quality workmanship guaranteed! 💪\n\n#KenyaConstruction #NairobiBuilders #QualityHomes',
    location: 'Karen, Nairobi',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 234,
    shares: 45,
    isLiked: false,
    comments: [
      {
        id: 'c1',
        userId: 'user-1',
        userName: 'Grace Wanjiku',
        content: 'Amazing progress! Looking forward to seeing the final result 🏠',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        likes: 12,
        isLiked: false
      },
      {
        id: 'c2',
        userId: 'user-2',
        userName: 'Peter Mwangi',
        content: 'Great work as always! Your team does excellent foundation work.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        likes: 8,
        isLiked: false
      }
    ]
  },
  {
    id: 'post-2',
    builderId: 'builder-2',
    builderName: 'Grace Wanjiku',
    builderCompany: 'Elite Builders Kenya',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: '',
    caption: '✨ Just completed this beautiful commercial plaza in Mombasa CBD! 5 floors of modern office and retail space. Thank you to our amazing team and clients for trusting us with this project.\n\nContact us for your next project! 📞 +254 733 456 789',
    location: 'Mombasa, Kenya',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    likes: 567,
    shares: 89,
    isLiked: true,
    comments: [
      {
        id: 'c3',
        userId: 'user-3',
        userName: 'David Ochieng',
        content: 'Congratulations on another successful project! The design is stunning.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        likes: 23,
        isLiked: false
      }
    ]
  },
  {
    id: 'post-3',
    builderId: 'builder-3',
    builderName: 'David Ochieng',
    builderCompany: '',
    builderAvatar: '',
    builderVerified: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: '',
    caption: '⚡ Solar installation completed for a residential home in Kisumu! Going green with renewable energy. This 10kW system will power the entire household.\n\n🌞 Solar is the future! Contact me for your solar needs.',
    location: 'Kisumu, Kenya',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    likes: 189,
    shares: 34,
    isLiked: false,
    comments: []
  },
  {
    id: 'post-4',
    builderId: 'builder-4',
    builderName: 'Mary Njeri',
    builderCompany: 'Njeri Masonry Works',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: '',
    caption: '🧱 Foundation work in progress! Our team specializes in strong, durable foundations that last generations. Using quality materials from certified suppliers.\n\n📍 Currently working in Nakuru region. Book your consultation today!',
    location: 'Nakuru, Kenya',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    likes: 312,
    shares: 56,
    isLiked: false,
    comments: [
      {
        id: 'c4',
        userId: 'user-4',
        userName: 'Samuel Kiprop',
        content: 'Your masonry work is top notch! Recommended to all my friends.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        likes: 15,
        isLiked: false
      },
      {
        id: 'c5',
        userId: 'user-5',
        userName: 'Ann Chebet',
        content: 'How much for a foundation for a 4 bedroom house?',
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
        likes: 3,
        isLiked: false
      }
    ]
  }
];

export const BuilderFeed: React.FC<BuilderFeedProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  onUploadVideo
}) => {
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public');

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setIsCreatingPost(true);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  const handlePost = () => {
    if (!newPostText.trim() && !selectedVideo) return;

    // In a real app, this would upload to the server
    if (selectedVideo && onUploadVideo) {
      onUploadVideo(selectedVideo, newPostText);
    }

    // Add to local state for demo
    const newPost: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'> = {
      id: `post-${Date.now()}`,
      builderId: currentUserId || 'current-user',
      builderName: currentUserName,
      builderAvatar: currentUserAvatar,
      builderVerified: false,
      videoUrl: videoPreview || '',
      caption: newPostText,
      timestamp: new Date(),
      likes: 0,
      shares: 0,
      isLiked: false,
      comments: []
    };

    setPosts([newPost, ...posts]);
    setNewPostText('');
    handleRemoveVideo();
    setIsCreatingPost(false);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const handleComment = (postId: string, comment: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newComment: VideoComment = {
          id: `comment-${Date.now()}`,
          userId: currentUserId || 'current-user',
          userName: currentUserName,
          userAvatar: currentUserAvatar,
          content: comment,
          timestamp: new Date(),
          likes: 0,
          isLiked: false
        };
        return {
          ...post,
          comments: [newComment, ...post.comments]
        };
      }
      return post;
    }));
  };

  const handleShare = (postId: string) => {
    // In a real app, this would open a share dialog
    console.log('Sharing post:', postId);
  };

  const handleViewProfile = (builderId: string) => {
    // In a real app, this would navigate to the builder's profile
    console.log('Viewing profile:', builderId);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Create Post Card - Facebook Style */}
      <Card className="bg-white dark:bg-gray-900 shadow-md rounded-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUserAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {currentUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setIsCreatingPost(true)}
            >
              What's on your mind, {currentUserName.split(' ')[0]}?
            </button>
          </div>

          {/* Video Preview */}
          {videoPreview && (
            <div className="relative mb-3 rounded-lg overflow-hidden bg-black">
              <video 
                src={videoPreview} 
                className="w-full max-h-64 object-contain"
                controls
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/60 hover:bg-black/80"
                onClick={handleRemoveVideo}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          )}

          {/* Expanded Post Creator */}
          {isCreatingPost && (
            <div className="space-y-3">
              <Textarea
                placeholder="Share your construction project, progress updates, or tips..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg"
              />
              
              {/* Privacy Selector */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {privacy === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {privacy === 'public' ? 'Public' : 'Friends'}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPrivacy('public')}>
                      <Globe className="h-4 w-4 mr-2" />
                      Public
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPrivacy('friends')}>
                      <Lock className="h-4 w-4 mr-2" />
                      Friends
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <Separator className="my-3" />

          {/* Action Buttons */}
          <div className="flex items-center justify-around">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors flex-1 justify-center">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />
              <FileVideo className="h-6 w-6 text-red-500" />
              <span className="font-medium text-gray-600 dark:text-gray-400">Video</span>
            </label>
            
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors flex-1 justify-center">
              <input
                type="file"
                accept="image/*"
                className="hidden"
              />
              <ImageIcon className="h-6 w-6 text-green-500" />
              <span className="font-medium text-gray-600 dark:text-gray-400">Photo</span>
            </label>

            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-1 justify-center">
              <MapPin className="h-6 w-6 text-orange-500" />
              <span className="font-medium text-gray-600 dark:text-gray-400">Location</span>
            </button>
          </div>

          {/* Post Button */}
          {isCreatingPost && (
            <div className="mt-3 flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setIsCreatingPost(false);
                  handleRemoveVideo();
                  setNewPostText('');
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handlePost}
                disabled={!newPostText.trim() && !selectedVideo}
              >
                Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200">
            All Posts
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
            Videos
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
            Photos
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
            Projects
          </Button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <BuilderVideoPost
            key={post.id}
            {...post}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onViewProfile={handleViewProfile}
          />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center py-4">
        <Button variant="outline" className="w-full max-w-xs">
          Load More Posts
        </Button>
      </div>
    </div>
  );
};

export default BuilderFeed;
