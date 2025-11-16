import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, Loader2, CheckCircle, MapPinned, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface GPSLocationCaptureProps {
  onLocationCaptured?: (coords: GPSCoordinates) => void;
  showMap?: boolean;
}

export const GPSLocationCapture: React.FC<GPSLocationCaptureProps> = ({ 
  onLocationCaptured,
  showMap = true 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GPSCoordinates | null>(null);

  const captureLocation = () => {
    setLoading(true);

    if (!navigator.geolocation) {
      toast({
        title: '❌ GPS Not Available',
        description: 'Your device does not support GPS location services.',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GPSCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        };

        setLocation(coords);
        setLoading(false);

        toast({
          title: '✅ Location Captured!',
          description: `GPS coordinates saved with ${coords.accuracy.toFixed(0)}m accuracy`,
        });

        if (onLocationCaptured) {
          onLocationCaptured(coords);
        }
      },
      (error) => {
        setLoading(false);
        
        let message = 'Unable to capture GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location unavailable. Ensure GPS is enabled.';
        } else if (error.code === error.TIMEOUT) {
          message = 'GPS timeout. Please try again.';
        }

        toast({
          title: 'GPS Error',
          description: message,
          variant: 'destructive'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const copyCoordinates = () => {
    if (location) {
      const coords = `${location.latitude},${location.longitude}`;
      navigator.clipboard.writeText(coords);
      toast({
        title: '📋 Copied!',
        description: 'GPS coordinates copied to clipboard',
      });
    }
  };

  const openInGoogleMaps = () => {
    if (location) {
      window.open(
        `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
        '_blank'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Main GPS Capture Button */}
      <Button
        onClick={captureLocation}
        disabled={loading}
        size="lg"
        className={`w-full h-16 font-bold text-lg ${
          location 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-6 w-6 mr-2 animate-spin" />
            Capturing GPS Location...
          </>
        ) : location ? (
          <>
            <CheckCircle className="h-6 w-6 mr-2" />
            GPS Location Captured ✓
          </>
        ) : (
          <>
            <Navigation className="h-6 w-6 mr-2" />
            📍 Capture My GPS Location
          </>
        )}
      </Button>

      {/* Location Details */}
      {location && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-green-900">Location Captured</h4>
              <Badge className="bg-green-600">
                ±{location.accuracy.toFixed(0)}m accuracy
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-700" />
                <span className="font-mono text-green-900">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              </div>
              
              <div className="text-xs text-green-700">
                Captured: {location.timestamp.toLocaleString()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-green-200">
              <Button
                variant="outline"
                size="sm"
                onClick={openInGoogleMaps}
                className="flex-1 border-green-300 hover:bg-green-100"
              >
                <MapPinned className="h-4 w-4 mr-1" />
                View on Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCoordinates}
                className="flex-1 border-green-300 hover:bg-green-100"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Copy GPS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={captureLocation}
                className="flex-1 border-green-300 hover:bg-green-100"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Recapture
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!location && (
        <Alert>
          <Navigation className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>How GPS Capture Works:</strong>
            <ol className="mt-2 space-y-1 text-xs list-decimal list-inside">
              <li>Click the button above</li>
              <li>Allow location access when prompted</li>
              <li>Your exact GPS coordinates will be captured</li>
              <li>Driver will use these coordinates for delivery</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GPSLocationCapture;

