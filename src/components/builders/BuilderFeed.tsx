import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';
import { BuilderStories } from './BuilderStories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  // FAST PATH: Check localStorage for role if not passed via props
  // This ensures we detect professional builders even if the prop wasn't set correctly
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  
  // User is a builder if: prop says so, OR localStorage role is professional_builder/admin
  const effectiveIsBuilder = isBuilder || 
    storedRole === 'professional_builder' || 
    storedRole === 'admin';
  
  // Use stored user ID if currentUserId not provided
  const effectiveUserId = currentUserId || storedUserId;
  
  // Check if user can post (must be a registered builder)
  // Only professional builders can post on the Builders page (not private clients)
  const canPost = isBuilder || currentUserRole === 'professional_builder' || currentUserRole === 'admin';
  const [posts, setPosts] = useState<Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'>[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [feedType, setFeedType] = useState<'all' | 'following' | 'live'>('all');

  // Fetch posts from database on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      // Fetch posts from builder_posts table
      const { data: postsData, error: postsError } = await supabase
        .from('builder_posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) {
        console.log('builder_posts table may not exist yet, using demo data:', postsError.message);
        // Fall back to demo posts if table doesn't exist
        setPosts(DEMO_POSTS);
        setLoadingPosts(false);
        return;
      }

      if (postsData && postsData.length > 0) {
        // Get unique builder IDs (user_id from auth.users)
        const builderIds = [...new Set(postsData.map(p => p.builder_id))];
        
        // Fetch profiles for these builders
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', builderIds);

        // Create a map for quick lookup
        const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));

        // Fetch comments for each post
        const postIds = postsData.map(p => p.id);
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: false });

        // Get commenter profiles
        const commenterIds = [...new Set((commentsData || []).map(c => c.user_id))];
        const { data: commenterProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', commenterIds);
        
        const commenterMap = new Map((commenterProfiles || []).map(p => [p.user_id, p]));

        // Transform posts to match component format
        const transformedPosts = postsData.map(post => {
          const profile = profilesMap.get(post.builder_id);
          const postComments = (commentsData || [])
            .filter(c => c.post_id === post.id)
            .map(c => {
              const commenter = commenterMap.get(c.user_id);
              return {
                id: c.id,
                userId: c.user_id,
                userName: commenter?.full_name || 'Anonymous',
                userAvatar: commenter?.avatar_url,
                content: c.content,
                timestamp: new Date(c.created_at),
                likes: c.likes_count || 0,
                isLiked: false
              };
            });

          return {
            id: post.id,
            builderId: post.builder_id,
            builderName: profile?.full_name || 'Builder',
            builderCompany: profile?.company_name || '',
            builderAvatar: profile?.avatar_url || '',
            builderVerified: profile?.is_verified || false,
            videoUrl: post.video_url || '', // Database column is 'video_url'
            thumbnailUrl: post.thumbnail_url || '',
            caption: post.content || '', // Database column is 'content'
            location: post.project_location || profile?.location || '',
            timestamp: new Date(post.created_at),
            likes: post.likes_count || 0,
            shares: post.shares_count || 0,
            isLiked: false,
            comments: postComments
          };
        });

        // Combine real posts with demo posts if we have few real posts
        if (transformedPosts.length < 3) {
          setPosts([...transformedPosts, ...DEMO_POSTS]);
        } else {
          setPosts(transformedPosts);
        }
      } else {
        // No posts yet, use demo data
        setPosts(DEMO_POSTS);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts(DEMO_POSTS);
    } finally {
      setLoadingPosts(false);
    }
  };

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

  const handlePost = async () => {
    if (!newPostText.trim() && !selectedVideo) return;
    
    // Use effectiveUserId which includes localStorage fallback
    const userId = effectiveUserId || currentUserId;
    
    if (!userId) {
      // Try to get user from Supabase auth as last resort
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to post',
          variant: 'destructive'
        });
        return;
      }
      // Use the auth user id
      await handlePostWithUserId(user.id);
      return;
    }
    
    await handlePostWithUserId(userId);
  };
  
  const handlePostWithUserId = async (postUserId: string) => {
    console.log('📤 handlePostWithUserId called with:', postUserId);
    
    if (!newPostText.trim() && !selectedVideo) {
      console.log('📤 No content to post');
      return;
    }

    setIsPosting(true);
    try {
      let videoUrl = '';
      
      // Upload video if selected
      if (selectedVideo) {
        console.log('📤 Uploading video...');
        const fileExt = selectedVideo.name.split('.').pop();
        const fileName = `${postUserId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('builder-videos')
          .upload(fileName, selectedVideo);
        
        if (uploadError) {
          console.error('📤 Video upload error:', uploadError);
          toast({
            title: 'Video Upload Failed',
            description: uploadError.message || 'Could not upload video. Posting without video.',
            variant: 'destructive'
          });
          // Continue without video if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('builder-videos')
            .getPublicUrl(fileName);
          videoUrl = urlData.publicUrl;
          console.log('📤 Video uploaded:', videoUrl);
        }
      }

      // Get user's profile (optional - don't fail if not found)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('user_id', postUserId)
        .single();

      console.log('📤 Profile found:', profile ? 'yes' : 'no');

      // Insert post into database (builder_id references auth.users.id, not profiles.id)
      console.log('📤 Inserting post into database...');
      const { data: newPostData, error: postError } = await supabase
        .from('builder_posts')
        .insert({
          builder_id: postUserId, // Use auth user ID, not profile ID
          post_type: videoUrl ? 'video' : 'text',
          content: newPostText, // Database column is 'content', not 'caption'
          video_url: videoUrl || null, // Database column is 'video_url', not 'media_url'
          project_location: '', // Could add location picker
          privacy: privacy,
          status: 'active',
          likes_count: 0,
          shares_count: 0,
          comments_count: 0
        })
        .select()
        .single();

      if (postError) {
        console.error('📤 Post creation error:', postError);
        toast({
          title: 'Database Error',
          description: postError.message || 'Could not save post to database',
          variant: 'destructive'
        });
        // Still add to local state for immediate feedback
      } else {
        console.log('📤 Post created successfully:', newPostData?.id);
      }

      // Also call onUploadVideo callback if provided
      if (selectedVideo && onUploadVideo) {
        onUploadVideo(selectedVideo, newPostText);
      }

      // Add to local state for immediate display
      const newPost: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'> = {
        id: newPostData?.id || `post-${Date.now()}`,
        builderId: postUserId,
        builderName: profile?.full_name || currentUserName,
        builderAvatar: profile?.avatar_url || currentUserAvatar,
        builderVerified: false,
        videoUrl: videoUrl || videoPreview || '',
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

      toast({
        title: '🎉 Posted!',
        description: 'Your post has been shared successfully'
      });
    } catch (error: any) {
      console.error('📤 Error creating post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPosting(false);
    }
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

            {/* Post Button - Always show when there's content or video */}
            {(isCreatingPost || newPostText.trim() || selectedVideo) && (
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={async () => {
                    console.log('📤 Post button clicked!');
                    await handlePost();
                  }}
                  disabled={isPosting || (!newPostText.trim() && !selectedVideo)}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : effectiveIsBuilder ? (
        /* User IS a builder but component didn't get the prop - show posting UI */
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 shadow-md rounded-lg border-green-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Video className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Welcome, Professional Builder!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can post videos and share your projects. Go to your dashboard to upload content.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => window.location.href = '/professional-builder-dashboard'}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
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
                {!effectiveUserId ? (
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
        {loadingPosts ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Video className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your construction projects!
              </p>
            </div>
          </Card>
        ) : filteredPosts.map((post) => (
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

      {/* Load More - only show if we have posts */}
      {!loadingPosts && filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline" className="w-full max-w-xs rounded-full">
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  );
};

export default BuilderFeed;
