import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';

interface CategoryImageSelectorProps {
  currentImageUrl?: string;
  onImageSelect: (url: string) => void;
  category?: string;
  productName: string;
  supplierId: string;
}

export const CategoryImageSelector = ({
  currentImageUrl,
  onImageSelect,
  category,
  productName,
  supplierId
}: CategoryImageSelectorProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [selectedTab, setSelectedTab] = useState<'default' | 'custom'>('default');
  const [isUsingDefault, setIsUsingDefault] = useState(false);
  const { toast } = useToast();

  // Get default image for selected category
  const defaultImageUrl = category ? getDefaultCategoryImage(category) : undefined;

  // Update preview when current image changes or category changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
      // Check if current image is the default for this category
      if (currentImageUrl === defaultImageUrl) {
        setIsUsingDefault(true);
        setSelectedTab('default');
      } else {
        setIsUsingDefault(false);
        setSelectedTab('custom');
      }
    } else if (defaultImageUrl) {
      // Auto-select default if available and no image is set
      setPreviewUrl(defaultImageUrl);
      setIsUsingDefault(true);
      setSelectedTab('default');
    }
  }, [currentImageUrl, defaultImageUrl]);

  const handleUseDefaultImage = () => {
    if (defaultImageUrl) {
      setPreviewUrl(defaultImageUrl);
      setIsUsingDefault(true);
      onImageSelect(defaultImageUrl);
      toast({
        title: 'Default image selected',
        description: `Using default ${category} image for your product`,
      });
    }
  };

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
      setIsUsingDefault(false);
      onImageSelect(publicUrl);

      toast({
        title: 'Custom image uploaded',
        description: 'Your custom product image has been uploaded successfully',
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

  const handleRemoveCustomImage = async () => {
    if (!previewUrl || isUsingDefault) return;

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

      // Reset to default if available
      if (defaultImageUrl) {
        setPreviewUrl(defaultImageUrl);
        setIsUsingDefault(true);
        onImageSelect(defaultImageUrl);
        setSelectedTab('default');
      } else {
        setPreviewUrl(undefined);
        onImageSelect('');
      }

      toast({
        title: 'Custom image removed',
        description: defaultImageUrl ? 'Reverted to default category image' : 'Product image has been removed',
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
    <Card className="overflow-hidden border-dashed">
      <CardContent className="p-2">
        <Tabs value={selectedTab} onValueChange={(val) => setSelectedTab(val as 'default' | 'custom')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-2">
            <TabsTrigger value="default" disabled={!defaultImageUrl} className="text-xs py-1">
              {defaultImageUrl ? '📦 Default' : '📦 None'}
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs py-1">
              📸 Upload
            </TabsTrigger>
          </TabsList>

          {/* Default Image Tab */}
          <TabsContent value="default" className="space-y-2 mt-0">
            {/* Image Preview - Compact */}
            <div className="relative w-full h-24 bg-muted rounded-md overflow-hidden flex items-center justify-center">
              {defaultImageUrl ? (
                <>
                  <img 
                    src={defaultImageUrl} 
                    alt={`Default ${category} image`}
                    className="w-full h-full object-cover"
                  />
                  {isUsingDefault && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {category ? `No default for ${category}` : 'Select category'}
                  </p>
                </div>
              )}
            </div>

            {defaultImageUrl && (
              <Button
                variant="default"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleUseDefaultImage}
                disabled={isUsingDefault}
              >
                {isUsingDefault ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Using Default
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Use Default
                  </>
                )}
              </Button>
            )}
          </TabsContent>

          {/* Custom Upload Tab */}
          <TabsContent value="custom" className="space-y-2 mt-0">
            {/* Image Preview - Compact */}
            <div className="relative w-full h-24 bg-muted rounded-md overflow-hidden flex items-center justify-center">
              {previewUrl && !isUsingDefault ? (
                <>
                  <img 
                    src={previewUrl} 
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                  {!uploading && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={handleRemoveCustomImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No custom image</p>
                </div>
              )}
            </div>

            {/* Upload Button - Compact */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              disabled={uploading}
              onClick={() => document.getElementById(`product-file-input-${supplierId}`)?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  {previewUrl && !isUsingDefault ? 'Change' : 'Upload Image'}
                </>
              )}
            </Button>

            <input
              id={`product-file-input-${supplierId}`}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.avif,.svg,.bmp,.tiff,.heic,.heif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

