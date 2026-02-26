/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🗺️ MAP LOCATION PICKER                                                            ║
 * ║                                                                                      ║
 * ║   Created: February 25, 2026                                                         ║
 * ║   Features:                                                                          ║
 * ║   - Interactive map with Leaflet                                                     ║
 * ║   - Search for locations by name/address                                             ║
 * ║   - Click on map to set location                                                     ║
 * ║   - Use current GPS location                                                         ║
 * ║   - Reverse geocoding for address display                                            ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Loader2, 
  CheckCircle,
  X,
  Target,
  Map as MapIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Leaflet CSS is loaded dynamically
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  county?: string;
}

interface MapLocationPickerProps {
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  onLocationSelect: (location: LocationData) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

// Search result interface
interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    county?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  onClose,
  title = "Select Delivery Location",
  description = "Search for an address or click on the map to set the delivery location"
}) => {
  console.log('🗺️ MapLocationPicker component rendered', { title, hasInitialLocation: !!initialLocation });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation?.latitude && initialLocation?.longitude
      ? {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          address: initialLocation.address || ''
        }
      : null
  );
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { toast } = useToast();

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      // Check if already loaded
      if ((window as any).L) {
        setLeafletLoaded(true);
        return;
      }

      // Load CSS
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        document.head.appendChild(link);
      }

      // Load JS
      if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
        const script = document.createElement('script');
        script.src = LEAFLET_JS;
        script.async = true;
        script.onload = () => {
          setLeafletLoaded(true);
        };
        document.head.appendChild(script);
      } else {
        // Script exists, wait for it to load
        const checkLeaflet = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkLeaflet);
            setLeafletLoaded(true);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkLeaflet), 10000);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    
    // Default to Kenya center if no initial location
    const defaultLat = initialLocation?.latitude || -1.2921;
    const defaultLng = initialLocation?.longitude || 36.8219;
    const defaultZoom = initialLocation?.latitude ? 15 : 6;

    // Create map
    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], defaultZoom);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add click handler
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      await setLocationFromCoords(lat, lng, L, map);
    });

    mapRef.current = map;
    setMapLoaded(true);

    // If initial location, add marker
    if (initialLocation?.latitude && initialLocation?.longitude) {
      const marker = L.marker([initialLocation.latitude, initialLocation.longitude], {
        draggable: true
      }).addTo(map);
      
      marker.on('dragend', async (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        await setLocationFromCoords(lat, lng, L, map);
      });
      
      markerRef.current = marker;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Set location from coordinates
  const setLocationFromCoords = async (lat: number, lng: number, L?: any, map?: any) => {
    const leaflet = L || (window as any).L;
    const mapInstance = map || mapRef.current;

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (mapInstance) {
      const marker = leaflet.marker([lat, lng], { draggable: true }).addTo(mapInstance);
      marker.on('dragend', async (e: any) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        await setLocationFromCoords(newLat, newLng);
      });
      markerRef.current = marker;
    }

    // Reverse geocode to get address
    let address = '';
    let county = '';
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'UjenziXform/1.0' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        county = data.address?.county || data.address?.city || data.address?.state || '';
      }
    } catch (error) {
      console.log('Reverse geocoding failed');
      address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address,
      county
    });
  };

  // Search for locations
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      // Add Kenya bias to search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ke&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'UjenziXform/1.0' } }
      );
      
      if (response.ok) {
        let results = await response.json();
        
        // If no results in Kenya, try worldwide
        if (results.length === 0) {
          const globalResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
            { headers: { 'User-Agent': 'UjenziXform/1.0' } }
          );
          if (globalResponse.ok) {
            results = await globalResponse.json();
          }
        }
        
        setSearchResults(results);
        
        if (results.length === 0) {
          toast({
            title: 'No results found',
            description: 'Try a different search term or click on the map to select a location.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Please try again or click on the map to select a location.',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  // Select a search result
  const selectSearchResult = async (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Pan map to location
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16);
    }
    
    await setLocationFromCoords(lat, lng);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive'
      });
      return;
    }

    setGettingCurrentLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Pan map to location
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], 16);
      }
      
      await setLocationFromCoords(latitude, longitude);
      
      toast({
        title: '📍 Location Found!',
        description: 'Your current location has been set.'
      });
    } catch (error: any) {
      console.error('Geolocation error:', error);
      toast({
        title: 'Location Error',
        description: error.message || 'Could not get your current location. Please search or click on the map.',
        variant: 'destructive'
      });
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      if (onClose) onClose();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-600" />
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search for an address, landmark, or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button 
          variant="outline" 
          onClick={getCurrentLocation}
          disabled={gettingCurrentLocation}
          title="Use my current location"
        >
          {gettingCurrentLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-2">
            <Label className="text-xs text-blue-700 font-medium mb-2 block">Search Results</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => selectSearchResult(result)}
                  className="w-full text-left p-2 rounded hover:bg-blue-100 transition-colors text-sm"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-800 line-clamp-2">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[300px] rounded-lg border border-gray-300 overflow-hidden bg-gray-100"
        >
          {!leafletLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Map Instructions Overlay */}
        {mapLoaded && !selectedLocation && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-center text-sm text-gray-700 border border-gray-200">
            <Target className="h-4 w-4 inline-block mr-1 text-blue-600" />
            Click anywhere on the map to set the delivery location
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">Location Selected</p>
                <p className="text-xs text-green-700 font-mono mt-1">
                  Lat: {selectedLocation.latitude.toFixed(6)}, Lng: {selectedLocation.longitude.toFixed(6)}
                </p>
                {selectedLocation.address && (
                  <p className="text-xs text-green-600 mt-1 truncate">
                    📍 {selectedLocation.address}
                  </p>
                )}
                {selectedLocation.county && (
                  <Badge className="mt-2 bg-green-200 text-green-800 border-green-300">
                    {selectedLocation.county}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleConfirm}
          disabled={!selectedLocation}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
};

export default MapLocationPicker;
