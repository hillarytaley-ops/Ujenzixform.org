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
  is_published?: boolean;
  created_at: string;
  views_count?: number;
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
    console.log('📹 Fetching videos for builder:', builderId, 'isOwner:', isOwner);
    
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      // Build query params
      let queryParams = `builder_id=eq.${builderId}&order=created_at.desc`;
      if (!isOwner) {
        // Only show published videos to non-owners
        queryParams += '&is_published=eq.true';
      }
      
      // Use native fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_videos?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      const error = response.ok ? null : data;
      console.log('📹 Videos fetched:', data?.length || 0, 'Error:', error);

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
    console.log('📹 Starting video upload...');
    
    // Safety timeout - 2 minutes for large files
    const uploadTimeout = setTimeout(() => {
      console.log('📹 Upload timeout reached');
      setUploading(false);
      toast({
        title: "Upload Timeout",
        description: "The upload is taking too long. Please try with a smaller file or check your connection.",
        variant: "destructive"
      });
    }, 120000);
    
    try {
      // Upload video to storage using native fetch for better reliability
      const fileExt = uploadForm.file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${builderId}/${timestamp}.${fileExt}`;

      console.log('📹 Uploading to path:', filePath);
      const fileSizeMB = (uploadForm.file.size / 1024 / 1024).toFixed(2);
      console.log('📹 File size:', fileSizeMB, 'MB');

      // Get auth token from localStorage
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
          console.log('📹 Got access token from localStorage');
        }
      } catch (e) {
        console.warn('📹 Could not get access token from localStorage');
      }

      if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

      // Use builder-videos bucket (RLS fixed with allow_all_storage_operations policy)
      const bucketName = 'builder-videos';
      
      // Use XMLHttpRequest for better large file handling and progress
      console.log('📹 Starting upload via XMLHttpRequest to bucket:', bucketName);
      
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Set timeout for large files (5 minutes)
        xhr.timeout = 300000;
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            console.log(`📹 Upload progress: ${percentComplete}% (${(event.loaded / 1024 / 1024).toFixed(2)}MB / ${fileSizeMB}MB)`);
          }
        };
        
        xhr.onload = () => {
          console.log('📹 XHR response status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('📹 Upload successful via XMLHttpRequest!');
            resolve();
          } else {
            console.error('📹 XHR upload error:', xhr.responseText);
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => {
          console.error('📹 XHR network error');
          reject(new Error('Network error during upload. Please check your connection.'));
        };
        
        xhr.ontimeout = () => {
          console.error('📹 XHR timeout');
          reject(new Error('Upload timed out. The file may be too large or your connection is slow.'));
        };
        
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Content-Type', uploadForm.file.type);
        xhr.setRequestHeader('x-upsert', 'true');
        
        xhr.send(uploadForm.file);
      });

      // Get public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
      console.log('📹 Video uploaded successfully to', bucketName);

      console.log('📹 Public URL:', publicUrl);

      // Create database record using native fetch
      console.log('📹 Creating database record...');
      const dbResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_videos`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            builder_id: builderId,
            title: uploadForm.title,
            description: uploadForm.description || '',
            video_url: publicUrl,
            is_published: true // Videos are published immediately
          })
        }
      );

      console.log('📹 DB insert response status:', dbResponse.status);

      if (!dbResponse.ok) {
        const dbErrorText = await dbResponse.text();
        console.error('📹 DB error:', dbErrorText);
        throw new Error(`Database error: ${dbErrorText}`);
      }

      clearTimeout(uploadTimeout);

      toast({
        title: "Video Uploaded! 🎉",
        description: "Your video has been submitted for approval",
      });

      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', file: null });
      fetchVideos();
    } catch (error: any) {
      clearTimeout(uploadTimeout);
      console.error('📹 Error uploading video:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video. Please try again.",
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

  const getPublishedBadge = (isPublished?: boolean) => {
    // Treat null/undefined as published (database default is true)
    if (isPublished === false) {
      return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
    }
    return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Published</Badge>;
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
                ) : video.video_url ? (
                  /* Show video preview with first frame as poster */
                  <video 
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      // Seek to 1 second to get a better frame
                      const videoEl = e.target as HTMLVideoElement;
                      videoEl.currentTime = 1;
                    }}
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
                  {isOwner && getPublishedBadge(video.is_published)}
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{video.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{video.views_count || 0} views</span>
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

