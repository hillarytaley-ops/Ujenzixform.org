import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (url: string) => void;
  bucket: 'profile-images' | 'company-logos';
  folder: string;
  label?: string;
  fallbackText?: string;
  shape?: 'circle' | 'square';
}

export const ImageUpload = ({
  currentImageUrl,
  onImageUpload,
  bucket,
  folder,
  label = 'Upload Image',
  fallbackText = 'U',
  shape = 'circle'
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { toast } = useToast();

  // Supported image formats
  const SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif'
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type - support all common image formats
      const isValidImage = file.type.startsWith('image/') || SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
      if (!isValidImage) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPG, PNG, GIF, WEBP, AVIF, SVG, BMP, TIFF, HEIC)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (10MB max for larger formats)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 10MB',
          variant: 'destructive',
        });
        return;
      }

      setUploading(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onImageUpload(publicUrl);

      toast({
        title: 'Image uploaded',
        description: 'Your image has been uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      setUploading(true);

      // Extract file path from URL
      const urlParts = previewUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${folder}/${fileName}`;

      // Delete from storage
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      setPreviewUrl(undefined);
      onImageUpload('');

      toast({
        title: 'Image removed',
        description: 'Your image has been removed',
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Remove failed',
        description: 'Failed to remove image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className={`h-24 w-24 ${shape === 'square' ? 'rounded-lg' : ''}`}>
        <AvatarImage src={previewUrl} alt={label} />
        <AvatarFallback className={`bg-primary/10 text-primary text-2xl font-semibold ${shape === 'square' ? 'rounded-lg' : ''}`}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(`file-input-${bucket}`)?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {label}
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        id={`file-input-${bucket}`}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.avif,.svg,.bmp,.tiff,.heic,.heif"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center">
        Recommended: Square image, max 10MB
        <br />
        Formats: JPG, PNG, GIF, WEBP, AVIF, SVG, BMP, TIFF, HEIC
      </p>
    </div>
  );
};