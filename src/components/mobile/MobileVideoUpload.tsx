import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, 
  Upload, 
  Camera,
  X,
  CheckCircle,
  RefreshCw,
  Film
} from "lucide-react";

interface MobileVideoUploadProps {
  builderId: string;
  onUploadComplete?: () => void;
}

export function MobileVideoUpload({ builderId, onUploadComplete }: MobileVideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

      // Validate file size (max 100MB for mobile)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 100MB",
          variant: "destructive"
        });
        return;
      }

      setVideoFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a video",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Upload to storage
      const fileExt = videoFile.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${builderId}/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('builder-videos')
        .upload(filePath, videoFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('builder-videos')
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase
        .from('builder_videos')
        .insert({
          builder_id: builderId,
          title: title.trim(),
          description: description.trim(),
          video_url: urlData.publicUrl,
          is_published: true // Auto-publish for immediate visibility
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: "🎬 Video Uploaded!",
        description: "Your video is now live and visible to all visitors!",
      });

      // Reset form
      setTitle('');
      setDescription('');
      clearVideo();
      
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Film className="w-5 h-5 text-purple-400" />
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Selection */}
        {!videoFile ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
          >
            <Video className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="text-white font-medium">Tap to select video</p>
            <p className="text-slate-400 text-sm mt-1">or use camera to record</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Gallery
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // For mobile, we can use capture attribute
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                    fileInputRef.current.removeAttribute('capture');
                  }
                }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video 
              src={videoPreview || undefined}
              controls
              className="w-full aspect-video"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={clearVideo}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Title */}
        <div>
          <Label htmlFor="mobile-title" className="text-white">Title</Label>
          <Input
            id="mobile-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="mobile-description" className="text-white">Description (optional)</Label>
          <Textarea
            id="mobile-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project..."
            rows={3}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-slate-400 text-sm text-center">
              {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={uploading || !videoFile || !title.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Upload Video
            </>
          )}
        </Button>

        <p className="text-slate-500 text-xs text-center">
          Videos are reviewed before being published. Max size: 100MB
        </p>
      </CardContent>
    </Card>
  );
}

