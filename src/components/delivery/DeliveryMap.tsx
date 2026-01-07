import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Navigation, Truck, Package, Clock, Route, 
  Maximize2, Minimize2, RefreshCw, Target
} from 'lucide-react';

interface DeliveryLocation {
  id: string;
  type: 'pickup' | 'delivery' | 'driver';
  name: string;
  address: string;
  lat: number;
  lng: number;
  status?: string;
  estimatedTime?: string;
}

interface DeliveryMapProps {
  locations: DeliveryLocation[];
  driverLocation?: { lat: number; lng: number };
  onNavigate?: (location: DeliveryLocation) => void;
  onRefresh?: () => void;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  locations,
  driverLocation,
  onNavigate,
  onRefresh
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Simulate real-time location tracking
  useEffect(() => {
    if (isTracking && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('Driver location updated:', position.coords);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isTracking]);

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'pickup': return <Package className="h-4 w-4 text-blue-600" />;
      case 'delivery': return <MapPin className="h-4 w-4 text-green-600" />;
      case 'driver': return <Truck className="h-4 w-4 text-teal-600" />;
      default: return <MapPin className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openInMaps = (location: DeliveryLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <Card className={`shadow-lg transition-all ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-5 w-5 text-teal-600" />
              Live Delivery Map
            </CardTitle>
            <CardDescription>Track deliveries in real-time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsTracking(!isTracking)}
              className={isTracking ? 'bg-teal-50 border-teal-300' : ''}
            >
              <Target className={`h-4 w-4 mr-1 ${isTracking ? 'text-teal-600 animate-pulse' : ''}`} />
              {isTracking ? 'Tracking' : 'Track Me'}
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`relative bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg overflow-hidden ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-80'}`}>
          {/* Map Placeholder - In production, integrate with Google Maps, Mapbox, or Leaflet */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6 bg-white/80 backdrop-blur rounded-lg shadow-lg max-w-md">
              <Navigation className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Interactive Map</h3>
              <p className="text-sm text-gray-600 mb-4">
                Map integration ready. Connect with Google Maps, Mapbox, or Leaflet for live tracking.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="bg-blue-50">
                  <Package className="h-3 w-3 mr-1" />
                  {locations.filter(l => l.type === 'pickup').length} Pickups
                </Badge>
                <Badge variant="outline" className="bg-green-50">
                  <MapPin className="h-3 w-3 mr-1" />
                  {locations.filter(l => l.type === 'delivery').length} Deliveries
                </Badge>
              </div>
            </div>
          </div>

          {/* Location Markers Overlay */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
            {locations.slice(0, 5).map((location, index) => (
              <div
                key={location.id}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedLocation(location)}
              >
                {getLocationIcon(location.type)}
                <div className="text-xs">
                  <p className="font-medium truncate max-w-[100px]">{location.name}</p>
                  {location.estimatedTime && (
                    <p className="text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {location.estimatedTime}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Driver Location Indicator */}
          {driverLocation && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg shadow-lg">
              <Truck className="h-4 w-4" />
              <span className="text-sm font-medium">Your Location</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Location List */}
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {locations.map((location) => (
            <div 
              key={location.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedLocation?.id === location.id 
                  ? 'bg-teal-50 border-teal-300' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedLocation(location)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  location.type === 'pickup' ? 'bg-blue-100' : 
                  location.type === 'delivery' ? 'bg-green-100' : 'bg-teal-100'
                }`}>
                  {getLocationIcon(location.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{location.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{location.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {location.status && (
                  <Badge className={getStatusColor(location.status)} variant="outline">
                    {location.status.replace('_', ' ')}
                  </Badge>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInMaps(location);
                  }}
                >
                  <Route className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Location Actions */}
        {selectedLocation && (
          <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{selectedLocation.name}</h4>
                <p className="text-sm text-gray-600">{selectedLocation.address}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openInMaps(selectedLocation)}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Navigate
                </Button>
                <Button 
                  size="sm" 
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={() => onNavigate?.(selectedLocation)}
                >
                  Start Delivery
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryMap;




