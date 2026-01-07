import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Eye, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Clock, 
  DollarSign,
  Star,
  Trash2,
  Edit
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  project_type: string | null;
  project_location: string | null;
  project_duration: string | null;
  project_cost_range: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  builder_profile?: {
    full_name: string;
    company_name: string;
  };
}

interface BuilderVideoGalleryProps {
  builderId?: string; // If provided, show only this builder's videos
  showUploadButton?: boolean;
  isOwner?: boolean; // If true, show edit/delete options
}

export const BuilderVideoGallery = ({ 
  builderId, 
  showUploadButton = false,
  isOwner = false 
}: BuilderVideoGalleryProps) => {
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, [builderId, filterType]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('builder_videos')
        .select(`
          *,
          builder_profile:profiles!builder_videos_builder_id_fkey(
            full_name,
            company_name
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Filter by builder if specified
      if (builderId) {
        query = query.eq('builder_id', builderId);
      }

      // Filter by project type
      if (filterType !== 'all' && filterType !== 'featured') {
        query = query.eq('project_type', filterType);
      }

      // Filter featured
      if (filterType === 'featured') {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) {
        // Silently handle error - table might not exist yet
        console.warn('Builder videos not available:', error.message);
        setVideos([]);
        setLoading(false);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      // Silently handle - don't show error toast, just log it
      console.warn('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: BuilderVideo) => {
    setSelectedVideo(video);
    // Record view
    recordView(video.id);
  };

  const recordView = async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('video_views').insert({
        video_id: videoId,
        user_id: user?.id || null,
        guest_identifier: !user ? `guest-${Date.now()}` : null,
      });

      // Update views count in state
      setVideos(prev => 
        prev.map(v => 
          v.id === videoId 
            ? { ...v, views_count: v.views_count + 1 } 
            : v
        )
      );
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('builder_videos')
        .delete()
        .eq('id', videoToDelete);

      if (dbError) throw dbError;

      // Optionally delete from storage
      const video = videos.find(v => v.id === videoToDelete);
      if (video) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('builder-videos')
            .remove([`${video.builder_id}/${fileName}`]);
        }
      }

      toast({
        title: 'Video deleted',
        description: 'Your video has been deleted successfully',
      });

      setVideos(prev => prev.filter(v => v.id !== videoToDelete));
      setVideoToDelete(null);
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    }
  };

  const projectTypes = [
    { value: 'all', label: 'All Projects' },
    { value: 'featured', label: 'Featured' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Renovation', label: 'Renovation' },
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Interior Design', label: 'Interior Design' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Project Showcase
          </h2>
          <p className="text-gray-600 mt-1">
            {videos.length} {videos.length === 1 ? 'project' : 'projects'} showcased
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {projectTypes.map((type) => (
            <Button
              key={type.value}
              variant={filterType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type.value)}
              className={filterType === type.value ? "bg-blue-600" : ""}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Play className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            🎥 Project Video Showcase
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {builderId 
              ? "Start showcasing your completed projects by uploading videos. Let clients see your quality work!" 
              : "Our builders will soon share amazing project videos showcasing their work across Kenya!"}
          </p>
          <div className="mt-6 text-sm text-gray-500">
            <p className="mb-2">✨ <strong>Coming Soon:</strong></p>
            <ul className="text-left max-w-sm mx-auto space-y-1">
              <li>• Before & After transformations</li>
              <li>• 3D walkthroughs of completed homes</li>
              <li>• Construction timelapse videos</li>
              <li>• Builder testimonials & reviews</li>
            </ul>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card 
              key={video.id}
              className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
            >
              {/* Video Thumbnail/Preview */}
              <div 
                className="relative aspect-video bg-gray-900 cursor-pointer overflow-hidden"
                onClick={() => handleVideoClick(video)}
              >
                <video
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                  <div className="bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-blue-600" fill="currentColor" />
                  </div>
                </div>
                
                {/* Featured Badge */}
                {video.is_featured && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500">
                    <Star className="h-3 w-3 mr-1" fill="white" />
                    Featured
                  </Badge>
                )}
                
                {/* Project Type Badge */}
                {video.project_type && (
                  <Badge className="absolute top-2 right-2 bg-blue-600">
                    {video.project_type}
                  </Badge>
                )}
              </div>

              {/* Video Info */}
              <CardHeader>
                <CardTitle className="line-clamp-2 text-lg">
                  {video.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {video.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Builder Info */}
                {video.builder_profile && !builderId && (
                  <div className="text-sm text-gray-600">
                    By: <span className="font-semibold">
                      {video.builder_profile.company_name || video.builder_profile.full_name}
                    </span>
                  </div>
                )}

                {/* Project Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  {video.project_location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                      {video.project_location}
                    </div>
                  )}
                  {video.project_duration && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      {video.project_duration}
                    </div>
                  )}
                  {video.project_cost_range && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-purple-600" />
                      {video.project_cost_range}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {video.views_count}
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {video.likes_count}
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {video.comments_count}
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Owner Actions */}
              {isOwner && (
                <CardFooter className="border-t pt-4">
                  <div className="flex space-x-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toast({ title: "Edit coming soon" })}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setVideoToDelete(video.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdate={fetchVideos}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project video
              and remove all associated comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};





import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Eye, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Clock, 
  DollarSign,
  Star,
  Trash2,
  Edit
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  project_type: string | null;
  project_location: string | null;
  project_duration: string | null;
  project_cost_range: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  builder_profile?: {
    full_name: string;
    company_name: string;
  };
}

interface BuilderVideoGalleryProps {
  builderId?: string; // If provided, show only this builder's videos
  showUploadButton?: boolean;
  isOwner?: boolean; // If true, show edit/delete options
}

export const BuilderVideoGallery = ({ 
  builderId, 
  showUploadButton = false,
  isOwner = false 
}: BuilderVideoGalleryProps) => {
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, [builderId, filterType]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('builder_videos')
        .select(`
          *,
          builder_profile:profiles!builder_videos_builder_id_fkey(
            full_name,
            company_name
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Filter by builder if specified
      if (builderId) {
        query = query.eq('builder_id', builderId);
      }

      // Filter by project type
      if (filterType !== 'all' && filterType !== 'featured') {
        query = query.eq('project_type', filterType);
      }

      // Filter featured
      if (filterType === 'featured') {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) {
        // Silently handle error - table might not exist yet
        console.warn('Builder videos not available:', error.message);
        setVideos([]);
        setLoading(false);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      // Silently handle - don't show error toast, just log it
      console.warn('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: BuilderVideo) => {
    setSelectedVideo(video);
    // Record view
    recordView(video.id);
  };

  const recordView = async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('video_views').insert({
        video_id: videoId,
        user_id: user?.id || null,
        guest_identifier: !user ? `guest-${Date.now()}` : null,
      });

      // Update views count in state
      setVideos(prev => 
        prev.map(v => 
          v.id === videoId 
            ? { ...v, views_count: v.views_count + 1 } 
            : v
        )
      );
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('builder_videos')
        .delete()
        .eq('id', videoToDelete);

      if (dbError) throw dbError;

      // Optionally delete from storage
      const video = videos.find(v => v.id === videoToDelete);
      if (video) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('builder-videos')
            .remove([`${video.builder_id}/${fileName}`]);
        }
      }

      toast({
        title: 'Video deleted',
        description: 'Your video has been deleted successfully',
      });

      setVideos(prev => prev.filter(v => v.id !== videoToDelete));
      setVideoToDelete(null);
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    }
  };

  const projectTypes = [
    { value: 'all', label: 'All Projects' },
    { value: 'featured', label: 'Featured' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Renovation', label: 'Renovation' },
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Interior Design', label: 'Interior Design' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Project Showcase
          </h2>
          <p className="text-gray-600 mt-1">
            {videos.length} {videos.length === 1 ? 'project' : 'projects'} showcased
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {projectTypes.map((type) => (
            <Button
              key={type.value}
              variant={filterType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type.value)}
              className={filterType === type.value ? "bg-blue-600" : ""}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Play className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            🎥 Project Video Showcase
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {builderId 
              ? "Start showcasing your completed projects by uploading videos. Let clients see your quality work!" 
              : "Our builders will soon share amazing project videos showcasing their work across Kenya!"}
          </p>
          <div className="mt-6 text-sm text-gray-500">
            <p className="mb-2">✨ <strong>Coming Soon:</strong></p>
            <ul className="text-left max-w-sm mx-auto space-y-1">
              <li>• Before & After transformations</li>
              <li>• 3D walkthroughs of completed homes</li>
              <li>• Construction timelapse videos</li>
              <li>• Builder testimonials & reviews</li>
            </ul>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card 
              key={video.id}
              className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
            >
              {/* Video Thumbnail/Preview */}
              <div 
                className="relative aspect-video bg-gray-900 cursor-pointer overflow-hidden"
                onClick={() => handleVideoClick(video)}
              >
                <video
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                  <div className="bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-blue-600" fill="currentColor" />
                  </div>
                </div>
                
                {/* Featured Badge */}
                {video.is_featured && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500">
                    <Star className="h-3 w-3 mr-1" fill="white" />
                    Featured
                  </Badge>
                )}
                
                {/* Project Type Badge */}
                {video.project_type && (
                  <Badge className="absolute top-2 right-2 bg-blue-600">
                    {video.project_type}
                  </Badge>
                )}
              </div>

              {/* Video Info */}
              <CardHeader>
                <CardTitle className="line-clamp-2 text-lg">
                  {video.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {video.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Builder Info */}
                {video.builder_profile && !builderId && (
                  <div className="text-sm text-gray-600">
                    By: <span className="font-semibold">
                      {video.builder_profile.company_name || video.builder_profile.full_name}
                    </span>
                  </div>
                )}

                {/* Project Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  {video.project_location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                      {video.project_location}
                    </div>
                  )}
                  {video.project_duration && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      {video.project_duration}
                    </div>
                  )}
                  {video.project_cost_range && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-purple-600" />
                      {video.project_cost_range}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {video.views_count}
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {video.likes_count}
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {video.comments_count}
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Owner Actions */}
              {isOwner && (
                <CardFooter className="border-t pt-4">
                  <div className="flex space-x-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toast({ title: "Edit coming soon" })}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setVideoToDelete(video.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdate={fetchVideos}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project video
              and remove all associated comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};



