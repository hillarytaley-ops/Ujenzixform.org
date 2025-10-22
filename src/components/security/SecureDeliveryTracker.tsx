import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Shield, AlertTriangle } from 'lucide-react';
import { useSecureDeliveries } from '@/hooks/useSecureDeliveries';
import { useToast } from '@/hooks/use-toast';

interface SecureLocationData {
  id: string;
  latitude: number;
  longitude: number;
  can_access_precise: boolean;
  location_type: string;
  access_level: string;
  security_message: string;
  last_update: string;
}

interface SecureDeliveryTrackerProps {
  deliveryId: string;
  trackingRecordId: string;
}

export const SecureDeliveryTracker: React.FC<SecureDeliveryTrackerProps> = ({
  deliveryId,
  trackingRecordId
}) => {
  const [locationData, setLocationData] = useState<SecureLocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [precisionLevel, setPrecisionLevel] = useState<'approximate' | 'precise'>('approximate');
  
  const { getSecureLocationData } = useSecureDeliveries();
  const { toast } = useToast();

  const fetchSecureLocation = async (precision: 'approximate' | 'precise' = 'approximate') => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getSecureLocationData('delivery_tracking', trackingRecordId, precision);
      
      if (data) {
        setLocationData(data);
        
        // Show security notice for restricted access
        if (data.location_type === 'approximate') {
          toast({
            title: "Location Privacy Protection",
            description: "Location data shown with reduced precision for privacy protection.",
            variant: "default"
          });
        }
      } else {
        setError('Unable to access location data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch location data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecureLocation(precisionLevel);
  }, [trackingRecordId, precisionLevel]);

  const requestPreciseLocation = async () => {
    setPrecisionLevel('precise');
    await fetchSecureLocation('precise');
  };

  const formatCoordinates = (lat: number, lng: number, type: string) => {
    if (type === 'precise') {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } else if (type === 'approximate') {
      return `~${lat.toFixed(2)}, ${lng.toFixed(2)} (approx.)`;
    }
    return 'Location restricted';
  };

  const getSecurityIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'full_access':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'time_restricted':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getSecurityBadgeColor = (type: string) => {
    switch (type) {
      case 'precise':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'approximate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  if (loading) {
    return (
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-muted-foreground">Loading secure location data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!locationData) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Location data not available or access denied for privacy protection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Secure Delivery Location
          {getSecurityIcon(locationData.access_level)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Status */}
        <div className="flex items-center gap-2">
          <Badge className={getSecurityBadgeColor(locationData.location_type)}>
            {locationData.location_type.toUpperCase()} LOCATION
          </Badge>
          <span className="text-sm text-muted-foreground">
            Access Level: {locationData.access_level.replace('_', ' ')}
          </span>
        </div>

        {/* Location Coordinates */}
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Coordinates</span>
          </div>
          <code className="text-sm">
            {formatCoordinates(locationData.latitude, locationData.longitude, locationData.location_type)}
          </code>
        </div>

        {/* Security Message */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {locationData.security_message}
          </AlertDescription>
        </Alert>

        {/* Last Update */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {new Date(locationData.last_update).toLocaleString()}
        </div>

        {/* Precision Request Button */}
        {locationData.location_type === 'approximate' && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={requestPreciseLocation}
              disabled={loading}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Request Precise Location Access
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Precise location requires additional authorization and active delivery status
            </p>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="pt-4 border-t">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">Privacy Protection Notice</h4>
            <p className="text-xs text-blue-700">
              Location data access is strictly controlled and logged for security. 
              Only authorized users with active business relationships can access precise coordinates.
              All access attempts are monitored and audited.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};