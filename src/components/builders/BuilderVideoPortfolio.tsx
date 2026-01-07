import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Video, 
  Upload, 
  Play, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Trash2,
  Edit,
  RefreshCw
} from "lucide-react";

interface BuilderVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  views?: number;
}

interface BuilderVideoPortfolioProps {
  builderId: string;
  isOwner?: boolean;
}

export function BuilderVideoPortfolio({ builderId, isOwner = false }: BuilderVideoPortfolioProps) {
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });
  const { toast } = useToast();

  const fetchVideos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('builder_videos')
        .select('*')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      // If not owner, only show approved videos
      if (!isOwner) {
        query = query.eq('status', 'approved');
      }

      const { data, error } = await query;

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [builderId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File",
          description: "Please select a video file",
          variant: "destructive"
        });
        return;
      }
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 100MB",
          variant: "destructive"
        });
        return;
      }
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a video file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload video to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${builderId}/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('builder-videos')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('builder-videos')
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase
        .from('builder_videos')
        .insert({
          builder_id: builderId,
          title: uploadForm.title,
          description: uploadForm.description,
          video_url: urlData.publicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Video Uploaded",
        description: "Your video has been submitted for approval",
      });

      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', file: null });
      fetchVideos();
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('builder_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Deleted",
        description: "The video has been removed from your portfolio",
      });

      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Video Portfolio</h2>
          <p className="text-gray-400">Showcase your construction projects</p>
        </div>
        {isOwner && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700" aria-describedby="upload-dialog-description">
              <DialogHeader>
                <DialogTitle className="text-white">Upload New Video</DialogTitle>
                <DialogDescription id="upload-dialog-description" className="text-gray-400">
                  Upload a video showcasing your construction work. Videos will be reviewed before being published.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Title</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter video title"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your project..."
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="video" className="text-white">Video File</Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Maximum file size: 100MB</p>
                </div>
                <Button 
                  onClick={handleUpload}
                  disabled={uploading || !uploadForm.file || !uploadForm.title}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : videos.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Video className="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">
              {isOwner ? "You haven't uploaded any videos yet" : "No videos available"}
            </p>
            {isOwner && (
              <Button 
                onClick={() => setShowUploadDialog(true)}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                Upload Your First Video
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="bg-gray-800/50 border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors">
              <div 
                className="relative aspect-video bg-gray-900 cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-medium line-clamp-1">{video.title}</h3>
                  {isOwner && getStatusBadge(video.status)}
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{video.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{video.views || 0} views</span>
                  </div>
                  {isOwner && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700" aria-describedby="video-player-description">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedVideo?.title}</DialogTitle>
            <DialogDescription id="video-player-description" className="text-gray-400">
              {selectedVideo?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                src={selectedVideo.video_url} 
                controls 
                autoPlay
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

