import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoUploadProps {
  builderId: string;
  onUploadComplete?: () => void;
}

export const VideoUpload = ({ builderId, onUploadComplete }: VideoUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_type: "",
    project_location: "",
    project_duration: "",
    project_cost_range: "",
  });
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a video file (MP4, WebM, MOV)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a video under 500MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedVideo(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  };

  const handleUpload = async () => {
    if (!selectedVideo || !formData.title) {
      toast({
        title: 'Missing information',
        description: 'Please provide a video file and title',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      // Create unique filename
      const fileExt = selectedVideo.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${builderId}/${timestamp}-${formData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${fileExt}`;

      setUploadProgress(30);

      // Upload video to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('builder-videos')
        .upload(fileName, selectedVideo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('builder-videos')
        .getPublicUrl(fileName);

      setUploadProgress(85);

      // Save video metadata to database
      const { error: dbError } = await supabase
        .from('builder_videos')
        .insert({
          builder_id: builderId,
          title: formData.title,
          description: formData.description,
          video_url: publicUrl,
          project_type: formData.project_type || null,
          project_location: formData.project_location || null,
          project_duration: formData.project_duration || null,
          project_cost_range: formData.project_cost_range || null,
          is_published: true, // Auto-publish for immediate visibility
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: '🎬 Video uploaded successfully!',
        description: 'Your video is now live and visible to all visitors!',
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        project_type: "",
        project_location: "",
        project_duration: "",
        project_cost_range: "",
      });
      setSelectedVideo(null);
      setVideoPreview(null);
      setIsOpen(false);
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Project Video
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload Project Showcase</DialogTitle>
          <DialogDescription>
            Share your successful projects with potential clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video File Selection */}
          <div className="space-y-2">
            <Label htmlFor="video-file" className="text-base font-semibold">
              Video File *
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="video-file"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {videoPreview ? (
                  <div className="w-full">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-48 rounded-lg"
                    />
                    <p className="mt-2 text-sm text-green-600">
                      {selectedVideo?.name}
                    </p>
                  </div>
                ) : (
                  <>
                    <Video className="h-12 w-12 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to select video or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      MP4, WebM, or MOV (max 500MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Project Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Modern 3-Bedroom Villa in Runda"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={uploading}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Project Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the project, challenges overcome, and key achievements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={uploading}
              rows={4}
            />
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label htmlFor="project_type" className="text-base font-semibold">
              Project Type
            </Label>
            <Select
              value={formData.project_type}
              onValueChange={(value) => setFormData({ ...formData, project_type: value })}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Renovation">Renovation</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Interior Design">Interior Design</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-base font-semibold">
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., Nairobi, Kenya"
                value={formData.project_location}
                onChange={(e) => setFormData({ ...formData, project_location: e.target.value })}
                disabled={uploading}
              />
            </div>

            {/* Project Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-base font-semibold">
                Duration
              </Label>
              <Input
                id="duration"
                placeholder="e.g., 6 months"
                value={formData.project_duration}
                onChange={(e) => setFormData({ ...formData, project_duration: e.target.value })}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Cost Range */}
          <div className="space-y-2">
            <Label htmlFor="cost_range" className="text-base font-semibold">
              Budget Range (Optional)
            </Label>
            <Select
              value={formData.project_cost_range}
              onValueChange={(value) => setFormData({ ...formData, project_cost_range: value })}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Under 1M KES">Under 1M KES</SelectItem>
                <SelectItem value="1M - 5M KES">1M - 5M KES</SelectItem>
                <SelectItem value="5M - 10M KES">5M - 10M KES</SelectItem>
                <SelectItem value="10M - 50M KES">10M - 50M KES</SelectItem>
                <SelectItem value="50M - 100M KES">50M - 100M KES</SelectItem>
                <SelectItem value="Over 100M KES">Over 100M KES</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedVideo || !formData.title}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};















