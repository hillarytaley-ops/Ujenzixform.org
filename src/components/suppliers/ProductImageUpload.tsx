import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (url: string) => void;
  productName: string;
  supplierId: string;
}

export const ProductImageUpload = ({
  currentImageUrl,
  onImageUpload,
  productName,
  supplierId
}: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPG, PNG, WEBP)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }

      setUploading(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${supplierId}/${Date.now()}-${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onImageUpload(publicUrl);

      toast({
        title: 'Product image uploaded',
        description: 'Your product image has been uploaded successfully',
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
      const storageIndex = urlParts.findIndex(part => part === 'product-images');
      if (storageIndex !== -1) {
        const filePath = urlParts.slice(storageIndex + 1).join('/');

        // Delete from storage
        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      }

      setPreviewUrl(undefined);
      onImageUpload('');

      toast({
        title: 'Image removed',
        description: 'Product image has been removed',
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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-4">
          {/* Image Preview */}
          <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              <>
                <img 
                  src={previewUrl} 
                  alt={productName}
                  className="w-full h-full object-cover"
                />
                {!uploading && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center p-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No product image</p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="w-full space-y-2">
            <Label htmlFor={`product-image-${supplierId}`} className="text-sm font-medium">
              Product Image *
            </Label>
            <Button
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => document.getElementById(`product-file-input-${supplierId}`)?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {previewUrl ? 'Change Image' : 'Upload Product Image'}
                </>
              )}
            </Button>

            <input
              id={`product-file-input-${supplierId}`}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground text-center">
              Upload a clear photo of your product
              <br />
              Recommended: 500x500px, max 5MB
              <br />
              Formats: JPG, PNG, WEBP
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


