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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <Tabs value={selectedTab} onValueChange={(val) => setSelectedTab(val as 'default' | 'custom')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="default" disabled={!defaultImageUrl}>
              {defaultImageUrl ? '📦 Use Default' : '📦 No Default'}
            </TabsTrigger>
            <TabsTrigger value="custom">
              📸 Custom Upload
            </TabsTrigger>
          </TabsList>

          {/* Default Image Tab */}
          <TabsContent value="default" className="space-y-4">
            {/* Image Preview */}
            <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {defaultImageUrl ? (
                <>
                  <img 
                    src={defaultImageUrl} 
                    alt={`Default ${category} image`}
                    className="w-full h-full object-cover"
                  />
                  {isUsingDefault && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {category ? `No default image for ${category}` : 'Select a category first'}
                  </p>
                </div>
              )}
            </div>

            {defaultImageUrl && (
              <Button
                variant="default"
                className="w-full"
                onClick={handleUseDefaultImage}
                disabled={isUsingDefault}
              >
                {isUsingDefault ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Using Default Image
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Use This Default Image
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {defaultImageUrl 
                ? `Default ${category} image - quick and easy option`
                : 'Please select a product category to see default images'
              }
            </p>
          </TabsContent>

          {/* Custom Upload Tab */}
          <TabsContent value="custom" className="space-y-4">
            {/* Image Preview */}
            <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
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
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveCustomImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No custom image uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="w-full space-y-2">
              <Label htmlFor={`product-image-${supplierId}`} className="text-sm font-medium">
                Upload Your Own Image
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
                    {previewUrl && !isUsingDefault ? 'Change Custom Image' : 'Upload Custom Image'}
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
                Upload a clear photo of your specific product
                <br />
                Recommended: 800x800px, max 5MB
                <br />
                Formats: JPG, PNG, WEBP
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>💡 Tip:</strong> Use the default image for quick setup, or upload your own product photo for better visibility and sales!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

