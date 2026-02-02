import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Video,
  Image as ImageIcon,
  Plus,
  Upload,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Edit,
  MoreVertical,
  Clock,
  MapPin,
  Globe,
  Lock,
  Users,
  TrendingUp,
  Calendar,
  Radio,
  Play,
  Pause,
  Settings,
  BarChart3,
  Bookmark,
  Flag,
  Pin,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentManagementProps {
  builderId: string;
  builderName: string;
}

interface Post {
  id: string;
  post_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  location?: string;
  privacy: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  status: string;
  created_at: string;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  location?: string;
  views_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export const ContentManagement: React.FC<ContentManagementProps> = ({
  builderId,
  builderName
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Form states
  const [postCaption, setPostCaption] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postPrivacy, setPostPrivacy] = useState('public');
  const [storyCaption, setStoryCaption] = useState('');

  // Analytics
  const [analytics, setAnalytics] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalViews: 0,
    activeStories: 0,
    followers: 0
  });

  useEffect(() => {
    loadContent();
  }, [builderId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('builder_posts')
        .select('*')
        .eq('builder_id', builderId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Load stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('builder_stories')
        .select('*')
        .eq('builder_id', builderId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!storiesError) {
        setStories(storiesData || []);
      }

      // Calculate analytics
      const totalLikes = (postsData || []).reduce((sum, p) => sum + p.likes_count, 0);
      const totalComments = (postsData || []).reduce((sum, p) => sum + p.comments_count, 0);
      const totalViews = (postsData || []).reduce((sum, p) => sum + p.views_count, 0);

      // Get followers count
      const { count: followersCount } = await supabase
        .from('builder_followers')
        .select('*', { count: 'exact', head: true })
        .eq('builder_id', builderId);

      setAnalytics({
        totalPosts: (postsData || []).length,
        totalLikes,
        totalComments,
        totalViews,
        activeStories: (storiesData || []).filter(s => new Date(s.expires_at) > new Date()).length,
        followers: followersCount || 0
      });

    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'post' | 'story') => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      if (type === 'post') {
        setShowCreatePost(true);
      } else {
        setShowCreateStory(true);
      }
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${builderId}/${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('builder-content')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('builder-content')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleCreatePost = async () => {
    if (!selectedFile && !postCaption) {
      toast({
        title: 'Error',
        description: 'Please add content or a caption',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = '';
      let postType = 'text';

      if (selectedFile) {
        mediaUrl = await uploadFile(selectedFile, 'posts');
        postType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase
        .from('builder_posts')
        .insert({
          builder_id: builderId,
          post_type: postType,
          media_url: mediaUrl || null,
          caption: postCaption,
          location: postLocation || null,
          privacy: postPrivacy
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post created successfully!'
      });

      // Reset form
      setShowCreatePost(false);
      setSelectedFile(null);
      setFilePreview(null);
      setPostCaption('');
      setPostLocation('');
      setPostPrivacy('public');

      // Reload content
      loadContent();

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select an image or video',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const mediaUrl = await uploadFile(selectedFile, 'stories');
      const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';

      const { error } = await supabase
        .from('builder_stories')
        .insert({
          builder_id: builderId,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: storyCaption || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Story created successfully!'
      });

      // Reset form
      setShowCreateStory(false);
      setSelectedFile(null);
      setFilePreview(null);
      setStoryCaption('');

      // Reload content
      loadContent();

    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: 'Error',
        description: 'Failed to create story',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('builder_posts')
        .update({ status: 'deleted' })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post deleted successfully'
      });

      loadContent();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive'
      });
    }
  };

  const handlePinPost = async (postId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('builder_posts')
        .update({ is_pinned: !isPinned })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: isPinned ? 'Post unpinned' : 'Post pinned to profile'
      });

      loadContent();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update post',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('builder_stories')
        .update({ is_active: false })
        .eq('id', storyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Story deleted successfully'
      });

      loadContent();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete story',
        variant: 'destructive'
      });
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours <= 0) return 'Expired';
    if (diffHours < 1) return 'Less than 1h';
    return `${diffHours}h remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Video className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{analytics.totalPosts}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{analytics.activeStories}</div>
            <div className="text-xs text-muted-foreground">Active Stories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{analytics.followers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{analytics.totalLikes}</div>
            <div className="text-xs text-muted-foreground">Total Likes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{analytics.totalComments}</div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <div className="text-xs text-muted-foreground">Views</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="posts" className="gap-2">
              <Video className="h-4 w-4" />
              Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <Clock className="h-4 w-4" />
              Stories ({stories.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Story
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Story</DialogTitle>
                  <DialogDescription>
                    Share a quick update that disappears after 24 hours
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {filePreview ? (
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[300px]">
                      {selectedFile?.type.startsWith('video/') ? (
                        <video src={filePreview} className="w-full h-full object-contain" controls />
                      ) : (
                        <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload image or video</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'story')}
                      />
                    </label>
                  )}
                  <div>
                    <Label>Caption (optional)</Label>
                    <Textarea
                      placeholder="Add a caption..."
                      value={storyCaption}
                      onChange={(e) => setStoryCaption(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowCreateStory(false);
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStory} disabled={uploading || !selectedFile}>
                    {uploading ? 'Uploading...' : 'Share Story'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                  <DialogDescription>
                    Share a video, image, or update with your followers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {filePreview ? (
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                      {selectedFile?.type.startsWith('video/') ? (
                        <video src={filePreview} className="w-full h-full object-contain" controls />
                      ) : (
                        <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload video or image</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'post')}
                      />
                    </label>
                  )}

                  <div>
                    <Label>Caption</Label>
                    <Textarea
                      placeholder="What's happening on your project?"
                      value={postCaption}
                      onChange={(e) => setPostCaption(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g., Nairobi, Kenya"
                        value={postLocation}
                        onChange={(e) => setPostLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Privacy</Label>
                      <Select value={postPrivacy} onValueChange={setPostPrivacy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Public
                            </div>
                          </SelectItem>
                          <SelectItem value="followers">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Followers
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              Private
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowCreatePost(false);
                    setSelectedFile(null);
                    setFilePreview(null);
                    setPostCaption('');
                    setPostLocation('');
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Post'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Posts Tab */}
        <TabsContent value="posts">
          {loading ? (
            <div className="text-center py-12">Loading posts...</div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Share your first construction update with your followers
                </p>
                <Button onClick={() => setShowCreatePost(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <Card key={post.id} className={post.is_pinned ? 'border-blue-500 border-2' : ''}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Media Preview */}
                      {post.media_url && (
                        <div className="w-32 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {post.post_type === 'video' ? (
                            <div className="relative w-full h-full">
                              <video src={post.media_url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-8 w-8 text-white" fill="white" />
                              </div>
                            </div>
                          ) : (
                            <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {post.is_pinned && (
                              <Badge variant="secondary" className="mb-1">
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            <p className="text-sm line-clamp-2">{post.caption || 'No caption'}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(post.created_at)}
                              </span>
                              {post.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {post.location}
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {post.privacy === 'public' ? <Globe className="h-3 w-3" /> : 
                                 post.privacy === 'followers' ? <Users className="h-3 w-3" /> :
                                 <Lock className="h-3 w-3" />}
                              </Badge>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePinPost(post.id, post.is_pinned)}>
                                <Pin className="h-4 w-4 mr-2" />
                                {post.is_pinned ? 'Unpin' : 'Pin to Profile'}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Post
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                          <span className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 text-red-500" />
                            {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1 text-sm">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            {post.comments_count}
                          </span>
                          <span className="flex items-center gap-1 text-sm">
                            <Share2 className="h-4 w-4 text-green-500" />
                            {post.shares_count}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                            <Eye className="h-4 w-4" />
                            {post.views_count} views
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories">
          {loading ? (
            <div className="text-center py-12">Loading stories...</div>
          ) : stories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active stories</h3>
                <p className="text-muted-foreground mb-4">
                  Share a quick update that disappears after 24 hours
                </p>
                <Button onClick={() => setShowCreateStory(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stories.map((story) => (
                <Card key={story.id} className="overflow-hidden group cursor-pointer">
                  <div className="relative aspect-[9/16]">
                    {story.media_type === 'video' ? (
                      <video src={story.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                    
                    {/* Time remaining */}
                    <div className="absolute top-2 left-2 right-2">
                      <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeRemaining(story.expires_at)}
                      </Badge>
                    </div>

                    {/* Views */}
                    <div className="absolute bottom-2 left-2">
                      <span className="text-white text-xs flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {story.views_count}
                      </span>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStory(story.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagement;
