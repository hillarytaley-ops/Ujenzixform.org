/**
 * SECURE ADDRESS AND LOCATION MANAGER
 * Handles address display with pin location fallback while maintaining security
 */
import React, { useState } from 'react';
import { MapPin, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface AddressLocationProps {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  userRole: string;
  canViewLocation: boolean;
  className?: string;
}

export const AddressLocationManager: React.FC<AddressLocationProps> = ({
  address,
  latitude,
  longitude,
  userRole,
  canViewLocation,
  className = ""
}) => {
  const [showPinLocation, setShowPinLocation] = useState(false);
  const [locationAccessed, setLocationAccessed] = useState(false);

  // Log location access for security monitoring
  const logLocationAccess = async (accessType: string) => {
    try {
      await supabase.from('location_data_access_log').insert({
        access_type: accessType,
        data_fields_accessed: [accessType === 'address' ? 'address' : 'coordinates'],
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
    } catch (error) {
      console.warn('Location access logging failed:', error);
    }
  };

  const handleLocationToggle = async () => {
    if (!locationAccessed) {
      await logLocationAccess(showPinLocation ? 'address' : 'coordinates');
      setLocationAccessed(true);
    }
    setShowPinLocation(!showPinLocation);
  };

  // Security check for location data visibility
  if (!canViewLocation) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Lock className="h-4 w-4" />
        <span>Location protected</span>
        <Badge variant="outline" className="text-xs">
          {userRole} access
        </Badge>
      </div>
    );
  }

  // Show address if available
  if (address && !showPinLocation) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <MapPin className="h-4 w-4 text-primary" />
        <span className="flex-1">{address}</span>
        {(latitude && longitude) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocationToggle}
            className="h-6 px-2"
          >
            <Eye className="h-3 w-3" />
            Pin
          </Button>
        )}
      </div>
    );
  }

  // Show pin location if coordinates available
  if ((latitude && longitude) && (showPinLocation || !address)) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <MapPin className="h-4 w-4 text-blue-500" />
        <span className="flex-1 font-mono text-sm">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
        {address && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocationToggle}
            className="h-6 px-2"
          >
            <EyeOff className="h-3 w-3" />
            Address
          </Button>
        )}
        <Badge variant="secondary" className="text-xs">
          Pin Location
        </Badge>
      </div>
    );
  }

  // Fallback when no location data
  return (
    <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
      <MapPin className="h-4 w-4" />
      <span>Location not specified</span>
    </div>
  );
};