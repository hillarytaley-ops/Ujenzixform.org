import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ChevronDown,
  Filter,
  Star,
  Bookmark,
  BookmarkCheck,
  Radio,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';
import { BuilderStories } from './BuilderStories';

interface BuilderFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  isBuilder?: boolean; // Whether current user is a registered builder
  onUploadVideo?: (file: File, caption: string) => void;
  onContactBuilder?: (builderId: string) => void;
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

// Location options for filtering
const LOCATIONS = ['All Locations', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu'];
const SPECIALTIES = ['All Specialties', 'Residential', 'Commercial', 'Industrial', 'Renovation', 'Foundation', 'Roofing', 'Electrical', 'Plumbing'];

export const BuilderFeed: React.FC<BuilderFeedProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  currentUserRole,
  isBuilder = false,
  onUploadVideo,
  onContactBuilder
}) => {
  // Check if user can post (must be a registered builder)
  const canPost = isBuilder || currentUserRole === 'professional_builder' || currentUserRole === 'builder' || currentUserRole === 'admin';
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [feedType, setFeedType] = useState<'all' | 'following' | 'live'>('all');

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

  const handleSavePost = (postId: string) => {
    setSavedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Filter posts based on selected filters
  const filteredPosts = posts.filter(post => {
    if (locationFilter !== 'All Locations' && post.location && !post.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'popular') {
      return b.likes - a.likes;
    }
    if (sortBy === 'trending') {
      return (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2);
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Stories Section */}
      <BuilderStories
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onCreateStory={() => setIsCreatingPost(true)}
      />

      {/* Create Post Card - Facebook Style (Only for Builders) */}
      {canPost ? (
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
      ) : (
        /* Visitor Notice - Cannot Post - Link to Registration */
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-md rounded-lg border-blue-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Want to share your projects?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Register as a builder to post videos, share updates, and connect with clients.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* For visitors not logged in - go to registration */}
                {!currentUserId ? (
                  <>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = '/professional-builder-registration'}
                    >
                      Register as Builder
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => window.location.href = '/professional-builder-signin'}
                    >
                      Already Registered? Sign In
                    </Button>
                  </>
                ) : (
                  /* Logged in but not a builder - upgrade account */
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.location.href = '/professional-builder-registration'}
                  >
                    Become a Builder
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed Navigation & Filters */}
      <Card className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden">
        {/* Feed Type Tabs */}
        <div className="flex items-center border-b">
          <button
            onClick={() => setFeedType('all')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'all'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            For You
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'following'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Following
          </button>
          <button
            onClick={() => setFeedType('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'live'
                ? 'text-red-600 border-red-600 bg-red-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Radio className="h-4 w-4" />
            Live
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="p-3 flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[130px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[140px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Specialty Filter */}
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[150px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(spec => (
                <SelectItem key={spec} value={spec}>{spec}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(locationFilter !== 'All Locations' || specialtyFilter !== 'All Specialties' || sortBy !== 'recent') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setLocationFilter('All Locations');
                setSpecialtyFilter('All Specialties');
                setSortBy('recent');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Saved Posts Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-3 ml-auto rounded-full ${savedPosts.size > 0 ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Saved ({savedPosts.size})
          </Button>
        </div>
      </Card>

      {/* Live Indicator */}
      {feedType === 'live' && (
        <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Radio className="h-8 w-8 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Live from Construction Sites</h3>
                  <p className="text-white/80 text-sm">Watch builders working in real-time across Kenya</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                3 Live Now
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div key={post.id} className="relative">
            <BuilderVideoPost
              {...post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onViewProfile={handleViewProfile}
            />
            {/* Save Button Overlay */}
            <Button
              variant="ghost"
              size="sm"
              className={`absolute top-16 right-4 h-8 w-8 p-0 rounded-full ${
                savedPosts.has(post.id) 
                  ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                  : 'text-gray-400 bg-white/80 hover:bg-white'
              }`}
              onClick={() => handleSavePost(post.id)}
            >
              {savedPosts.has(post.id) ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center py-4">
        <Button variant="outline" className="w-full max-w-xs rounded-full">
          Load More Posts
        </Button>
      </div>
    </div>
  );
};

export default BuilderFeed;
