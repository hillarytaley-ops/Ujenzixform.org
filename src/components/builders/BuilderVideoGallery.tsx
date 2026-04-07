import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Edit,
  Share2,
  ThumbsUp,
  MoreHorizontal,
  Globe,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { formatDistanceToNow } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    phone?: string;
    email?: string;
    location?: string;
    avatar_url?: string;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    id: '',
    title: '',
    description: '',
    project_type: '',
    project_location: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
    
    // Safety timeout - stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [builderId, filterType]);

  const fetchVideos = async () => {
    type ProfileRow = {
      id?: string;
      user_id?: string;
      full_name?: string | null;
      company_name?: string | null;
      phone?: string | null;
      email?: string | null;
      location?: string | null;
      avatar_url?: string | null;
    };

    const defaultProfile = (title: string) => ({
      full_name: title || 'UjenziXform Builder',
      company_name: 'UjenziXform Professional',
      phone: '+254 700 000 000',
      email: 'info@ujenzixform.org',
      location: 'Kenya',
    });

    const mergeProfilesIntoMap = (rows: ProfileRow[] | null | undefined) => {
      const profilesMap: Record<
        string,
        NonNullable<BuilderVideo['builder_profile']>
      > = {};
      (rows || []).forEach((p) => {
        const profileData = {
          full_name: p.full_name || 'UjenziXform Builder',
          company_name: p.company_name || '',
          phone: p.phone || '',
          email: p.email || '',
          location: p.location || '',
          avatar_url: p.avatar_url || '',
        };
        if (p.id) profilesMap[p.id] = profileData;
        if (p.user_id) profilesMap[p.user_id] = profileData;
      });
      return profilesMap;
    };

    try {
      setLoading(true);

      let q = supabase.from('builder_videos').select('*').order('created_at', { ascending: false });

      if (builderId) {
        q = q.eq('builder_id', builderId);
      }
      if (filterType !== 'all' && filterType !== 'featured') {
        q = q.eq('project_type', filterType);
      }
      if (filterType === 'featured') {
        q = q.eq('is_featured', true);
      }

      const { data, error } = await q;

      if (error) {
        console.warn('Builder videos fetch:', error.message);
        setVideos([]);
        return;
      }

      const rows = data || [];
      const builderIds = [...new Set(rows.map((v) => v.builder_id).filter(Boolean))] as string[];

      let profilesMap: Record<string, NonNullable<BuilderVideo['builder_profile']>> = {};

      if (builderIds.length > 0) {
        const { data: byUser } = await supabase
          .from('profiles')
          .select('id,user_id,full_name,company_name,phone,email,location,avatar_url')
          .in('user_id', builderIds);

        profilesMap = { ...profilesMap, ...mergeProfilesIntoMap(byUser as ProfileRow[]) };

        const { data: byId } = await supabase
          .from('profiles')
          .select('id,user_id,full_name,company_name,phone,email,location,avatar_url')
          .in('id', builderIds);

        profilesMap = { ...profilesMap, ...mergeProfilesIntoMap(byId as ProfileRow[]) };
      }

      const mapped: BuilderVideo[] = rows.map((video: Record<string, unknown>) => ({
        ...(video as unknown as BuilderVideo),
        views_count: Number(video.view_count) || 0,
        likes_count: Number(video.likes_count) || 0,
        comments_count: Number(video.comments_count) || 0,
        builder_profile:
          profilesMap[String(video.builder_id)] ||
          defaultProfile(String((video.title as string) || '')),
      }));

      setVideos(mapped);
    } catch (error) {
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

  const openEditDialog = (video: BuilderVideo) => {
    setEditDraft({
      id: video.id,
      title: video.title,
      description: video.description || '',
      project_type: video.project_type || '',
      project_location: video.project_location || '',
    });
    setEditOpen(true);
  };

  const saveVideoEdits = async () => {
    if (!editDraft.id || !editDraft.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this video.',
        variant: 'destructive',
      });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('builder_videos')
        .update({
          title: editDraft.title.trim(),
          description: editDraft.description.trim() || null,
          project_type: editDraft.project_type.trim() || null,
          project_location: editDraft.project_location.trim() || null,
        })
        .eq('id', editDraft.id);

      if (error) throw error;

      setVideos((prev) =>
        prev.map((v) =>
          v.id === editDraft.id
            ? {
                ...v,
                title: editDraft.title.trim(),
                description: editDraft.description.trim() || null,
                project_type: editDraft.project_type.trim() || null,
                project_location: editDraft.project_location.trim() || null,
              }
            : v
        )
      );
      if (selectedVideo?.id === editDraft.id) {
        setSelectedVideo((s) =>
          s
            ? {
                ...s,
                title: editDraft.title.trim(),
                description: editDraft.description.trim() || null,
                project_type: editDraft.project_type.trim() || null,
                project_location: editDraft.project_location.trim() || null,
              }
            : null
        );
      }
      toast({ title: 'Saved', description: 'Video details updated.' });
      setEditOpen(false);
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: 'Update failed',
        description: 'Could not save changes. Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading project videos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Pills - Compact */}
      <div className="flex flex-wrap gap-2 pb-2 border-b">
        {projectTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all ${
              filterType === type.value 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Social Feed Style Video List */}
      {videos.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
          <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No Project Videos Yet
          </h3>
          <p className="text-gray-600 text-sm">
            Professional builders will share their project videos here soon!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card 
              key={video.id}
              className="overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Post Header - Facebook Style */}
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-blue-500 ring-offset-1">
                      {video.builder_profile?.avatar_url ? (
                        <AvatarImage src={video.builder_profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                        {(video.builder_profile?.company_name || video.builder_profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">
                          {video.builder_profile?.company_name || video.builder_profile?.full_name || 'UjenziXform Builder'}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-blue-500" fill="currentColor" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                        <span>•</span>
                        <Globe className="h-3 w-3" />
                        {video.project_location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {video.project_location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Caption/Description */}
                <div className="mt-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{video.title}</h3>
                  {video.description && (
                    <p className="text-gray-700 text-sm mt-1 line-clamp-2">{video.description}</p>
                  )}
                  
                  {/* Project Tags */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {video.project_type && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        {video.project_type}
                      </Badge>
                    )}
                    {video.is_featured && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                        <Star className="h-3 w-3 mr-1" fill="white" />
                        Featured
                      </Badge>
                    )}
                    {video.project_duration && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {video.project_duration}
                      </Badge>
                    )}
                    {video.project_cost_range && (
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {video.project_cost_range}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Player Area - Click to Play */}
              <div 
                className="relative aspect-video bg-black cursor-pointer group"
                onClick={() => handleVideoClick(video)}
              >
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  className="w-full h-full object-contain"
                  preload="metadata"
                  playsInline
                  onError={() =>
                    toast({
                      title: 'Video could not play',
                      description:
                        'If you are on a strict network or browser, try H.264 MP4 or open the file link directly.',
                      variant: 'destructive',
                    })
                  }
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-4 shadow-xl transform group-hover:scale-110 transition-transform">
                    <Play className="h-10 w-10 text-blue-600" fill="currentColor" />
                  </div>
                </div>
                
                {/* Duration/Views overlay */}
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  {video.views_count || 0} views
                </div>
              </div>

              {/* Engagement summary: likes are their own counter (not views/comments). Hide when zero like the main feed. */}
              {((video.likes_count || 0) > 0 || (video.comments_count || 0) > 0) && (
                <div className="px-4 py-2 border-b flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    {(video.likes_count || 0) > 0 && (
                      <>
                        <span className="bg-blue-500 text-white rounded-full p-0.5">
                          <ThumbsUp className="h-3 w-3" />
                        </span>
                        <span className="bg-red-500 text-white rounded-full p-0.5">
                          <Heart className="h-3 w-3" />
                        </span>
                        <span className="ml-1">{video.likes_count}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(video.comments_count || 0) > 0 && (
                      <span>
                        {video.comments_count}{' '}
                        {video.comments_count === 1 ? 'comment' : 'comments'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons - Facebook Style */}
              <div className="px-2 py-1 flex items-center justify-around border-b">
                <Button 
                  variant="ghost" 
                  className="flex-1 text-gray-600 hover:bg-gray-100 gap-2"
                  onClick={() => handleVideoClick(video)}
                >
                  <ThumbsUp className="h-5 w-5" />
                  <span className="hidden sm:inline">Like</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 text-gray-600 hover:bg-gray-100 gap-2"
                  onClick={() => handleVideoClick(video)}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">Comment</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 text-gray-600 hover:bg-gray-100 gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link copied!", description: "Share this video with others" });
                  }}
                >
                  <Share2 className="h-5 w-5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </div>

              {/* Owner Actions */}
              {isOwner && (
                <div className="px-4 py-2 bg-gray-50 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(video)}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit video details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-type">Project type</Label>
              <Input
                id="edit-type"
                value={editDraft.project_type}
                onChange={(e) => setEditDraft((d) => ({ ...d, project_type: e.target.value }))}
                placeholder="e.g. Residential"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-loc">Location</Label>
              <Input
                id="edit-loc"
                value={editDraft.project_location}
                onChange={(e) => setEditDraft((d) => ({ ...d, project_location: e.target.value }))}
                placeholder="e.g. Nairobi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveVideoEdits} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
