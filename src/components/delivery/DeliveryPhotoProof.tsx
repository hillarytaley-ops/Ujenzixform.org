import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, Upload, Image, X, CheckCircle, AlertCircle,
  MapPin, Clock, User, Package, Send, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryPhotoProofProps {
  deliveryId: string;
  deliveryType: 'pickup' | 'delivery';
  customerName: string;
  onComplete?: (proofData: ProofData) => void;
}

interface ProofData {
  photos: string[];
  signature?: string;
  notes: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  receiverName?: string;
}

export const DeliveryPhotoProof: React.FC<DeliveryPhotoProofProps> = ({
  deliveryId,
  deliveryType,
  customerName,
  onComplete
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location captured",
            description: "GPS coordinates recorded for proof of delivery",
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location unavailable",
            description: "Could not get GPS location. Continuing without it.",
            variant: "destructive"
          });
        }
      );
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setPhotos(prev => [...prev, imageData]);
      
      stream.getTracks().forEach(track => track.stop());
      
      toast({
        title: "Photo captured",
        description: "Photo added to delivery proof",
      });
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera unavailable",
        description: "Please use file upload instead",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotos(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Simple signature pad
  const startSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!('buttons' in e && e.buttons === 1) && !('touches' in e)) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSignature(canvas.toDataURL('image/png'));
    toast({
      title: "Signature saved",
      description: "Customer signature recorded",
    });
  };

  // Submit proof
  const handleSubmit = async () => {
    if (photos.length === 0) {
      toast({
        title: "Photo required",
        description: "Please capture at least one photo as proof",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const proofData: ProofData = {
        photos,
        signature: signature || undefined,
        notes,
        timestamp: new Date().toISOString(),
        location: location || undefined,
        receiverName: receiverName || undefined
      };

      // In production, upload to Supabase storage and save record
      // const { data, error } = await supabase
      //   .from('delivery_proofs')
      //   .insert({
      //     delivery_id: deliveryId,
      //     proof_type: deliveryType,
      //     photos: proofData.photos,
      //     signature: proofData.signature,
      //     notes: proofData.notes,
      //     location: proofData.location,
      //     receiver_name: proofData.receiverName,
      //     created_at: proofData.timestamp
      //   });

      toast({
        title: "Proof submitted",
        description: `${deliveryType === 'pickup' ? 'Pickup' : 'Delivery'} proof recorded successfully`,
      });

      onComplete?.(proofData);
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Submission failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Camera className="h-4 w-4 text-teal-600" />
          {deliveryType === 'pickup' ? 'Pickup' : 'Delivery'} Proof
        </CardTitle>
        <CardDescription className="text-xs">
          Capture photos and signature for {customerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {/* Photo Capture Section */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <Image className="h-3.5 w-3.5" />
            Photos (Required)
          </Label>
          
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                <img src={photo} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            
            {photos.length < 4 && (
              <div className="flex gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-20 h-20 flex flex-col items-center justify-center border-dashed p-1"
                  onClick={handleCameraCapture}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mb-0.5" />
                      <span className="text-[10px]">Camera</span>
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-20 h-20 flex flex-col items-center justify-center border-dashed p-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mb-0.5" />
                  <span className="text-[10px]">Upload</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-gray-500">
            Capture photos of materials, packaging, or delivery location ({photos.length}/4)
          </p>
        </div>

        {/* Signature Section */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Customer Signature
          </Label>
          
          <div className="border border-gray-200 rounded p-1.5 bg-white">
            <canvas
              ref={canvasRef}
              width={300}
              height={80}
              className="w-full touch-none cursor-crosshair bg-gray-50 rounded"
              onMouseDown={startSignature}
              onMouseMove={drawSignature}
              onTouchStart={startSignature}
              onTouchMove={drawSignature}
            />
            <div className="flex justify-between mt-1.5 gap-1.5">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={clearSignature}>
                Clear
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={saveSignature}>
                <CheckCircle className="h-3 w-3 mr-0.5" />
                Save
              </Button>
            </div>
          </div>
          
          {signature && (
            <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5">
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
              Signature captured
            </Badge>
          )}
        </div>

        {/* Receiver Name */}
        <div className="space-y-1.5">
          <Label htmlFor="receiverName" className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Receiver Name
          </Label>
          <Input
            id="receiverName"
            className="h-8 text-xs"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Name of person receiving delivery"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="flex items-center gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            Delivery Notes
          </Label>
          <Textarea
            id="notes"
            className="text-xs min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about the delivery..."
            rows={2}
          />
        </div>

        {/* Location Capture */}
        <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs">
              {location 
                ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : 'GPS location not captured'
              }
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={getCurrentLocation}>
            <MapPin className="h-3 w-3 mr-0.5" />
            Capture
          </Button>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Timestamp: {new Date().toLocaleString()}</span>
        </div>

        {/* Submit Button */}
        <Button 
          size="sm"
          className="w-full h-8 bg-teal-600 hover:bg-teal-700 text-xs"
          onClick={handleSubmit}
          disabled={isSubmitting || photos.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Submit {deliveryType === 'pickup' ? 'Pickup' : 'Delivery'} Proof
            </>
          )}
        </Button>

        {photos.length === 0 && (
          <Alert className="py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
              At least one photo is required as proof of {deliveryType}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryPhotoProof;




