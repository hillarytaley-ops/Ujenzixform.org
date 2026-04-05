/**
 * Map location picker: Google Maps when VITE_GOOGLE_MAPS_API_KEY is set (recommended),
 * otherwise Leaflet + OpenStreetMap.
 *
 * Google Cloud: enable Maps JavaScript API, Places API, and Geocoding API for this key.
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
  Map as MapIcon,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const GMAPS_SCRIPT_ID = 'ujenzi-google-maps-js';

/** Kenya — soft restriction; users can still pan slightly outside with strictBounds: false */
const KENYA_LAT_LNG_BOUNDS = { north: 5.2, south: -5.0, west: 33.5, east: 42.0 };

/** Stable map panel height (Leaflet/Google both need a real pixel height, not a collapsed flex box). */
const MAP_PANEL_STYLE: React.CSSProperties = {
  width: '100%',
  height: 'clamp(280px, min(52vh, 420px), 420px)',
  minHeight: 280,
};

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  const w = window as Window & { google?: { maps?: { Map?: unknown } } };
  if (w.google?.maps?.Map) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GMAPS_SCRIPT_ID) as HTMLScriptElement | null;
    const finish = () => {
      if (w.google?.maps?.Map) resolve();
      else reject(new Error('Google Maps API unavailable'));
    };
    const fail = () => reject(new Error('Failed to load Google Maps'));

    if (existing) {
      if (w.google?.maps?.Map) {
        resolve();
        return;
      }
      existing.addEventListener('load', finish);
      existing.addEventListener('error', fail);
      return;
    }

    const script = document.createElement('script');
    script.id = GMAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&language=en&region=KE`;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = fail;
    document.head.appendChild(script);
  });
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  county?: string;
}

export interface MapLocationPickerProps {
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

function countyFromGeocoderComponents(
  components?: { long_name?: string; types?: string[] }[]
): string {
  if (!components?.length) return '';
  const admin1 = components.find((c) => c.types?.includes('administrative_area_level_1'));
  if (admin1?.long_name) return admin1.long_name;
  const locality = components.find((c) => c.types?.includes('locality'));
  return locality?.long_name || '';
}

const GoogleMapLocationPicker: React.FC<MapLocationPickerProps & { apiKey: string }> = ({
  initialLocation,
  onLocationSelect,
  onClose,
  title = 'Select Delivery Location',
  description = 'Search for an address or tap the map to set the location',
  apiKey,
}) => {
  const mapsDivRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);

  const [scriptState, setScriptState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mapReady, setMapReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(() => {
    if (
      initialLocation?.latitude == null ||
      initialLocation?.longitude == null ||
      Number.isNaN(initialLocation.latitude) ||
      Number.isNaN(initialLocation.longitude)
    ) {
      return null;
    }
    return {
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
      address: initialLocation.address || '',
      county: '',
    };
  });
  const { toast } = useToast();
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const initialSnapRef = useRef(initialLocation);
  initialSnapRef.current = initialLocation;

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const maps = (window as unknown as { google?: { maps?: { Geocoder?: new () => { geocode: (...args: unknown[]) => void } } } })
      .google?.maps;
    if (!maps?.Geocoder) {
      setSelectedLocation({
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        county: '',
      });
      return;
    }
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: unknown, status: string) => {
      const list = results as { formatted_address?: string; address_components?: { long_name?: string; types?: string[] }[] }[] | null;
      if (status !== 'OK' || !list?.[0]) {
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          county: '',
        });
        return;
      }
      const r = list[0];
      setSelectedLocation({
        latitude: lat,
        longitude: lng,
        address: r.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        county: countyFromGeocoderComponents(r.address_components),
      });
    });
  }, []);

  const ensureMarker = useCallback(
    (lat: number, lng: number) => {
      const g = (window as unknown as { google?: { maps?: unknown } }).google;
      const maps = g?.maps as {
        Marker: new (opts: Record<string, unknown>) => {
          setPosition: (p: { lat: number; lng: number }) => void;
          setMap: (m: unknown | null) => void;
          addListener: (ev: string, fn: () => void) => { remove: () => void };
          getPosition: () => { lat: () => number; lng: () => number };
        };
      };
      const map = mapRef.current;
      if (!maps?.Marker || !map) return;
      if (markerRef.current) {
        (markerRef.current as { setPosition: (p: { lat: number; lng: number }) => void }).setPosition({
          lat,
          lng,
        });
      } else {
        const marker = new maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
        });
        const dragL = marker.addListener('dragend', () => {
          const p = marker.getPosition();
          reverseGeocode(p.lat(), p.lng());
        });
        listenersRef.current.push(dragL);
        markerRef.current = marker;
      }
      (map as { panTo: (p: { lat: number; lng: number }) => void }).panTo({ lat, lng });
    },
    [reverseGeocode]
  );

  useEffect(() => {
    setScriptState('loading');
    loadGoogleMapsScript(apiKey)
      .then(() => setScriptState('ready'))
      .catch(() => setScriptState('error'));
  }, [apiKey]);

  useEffect(() => {
    if (scriptState !== 'ready' || !mapsDivRef.current) return;

    const g = (window as unknown as { google?: { maps?: unknown } }).google;
    const maps = g?.maps as {
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => {
        addListener: (ev: string, fn: (e: { latLng?: { lat: () => number; lng: () => number } }) => void) => {
          remove: () => void;
        };
        panTo: (p: { lat: number; lng: number }) => void;
        setZoom: (z: number) => void;
      };
      places: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts: Record<string, unknown>
        ) => {
          addListener: (ev: string, fn: () => void) => { remove: () => void };
          getPlace: () => {
            geometry?: { location?: { lat: () => number; lng: () => number } };
            formatted_address?: string;
            name?: string;
            address_components?: { long_name?: string; types?: string[] }[];
          };
        };
      };
      Marker: new (opts: Record<string, unknown>) => unknown;
    };
    if (!maps?.Map) return;

    const il = initialSnapRef.current;
    const defaultLat = il?.latitude ?? -0.0236;
    const defaultLng = il?.longitude ?? 37.9062;
    const defaultZoom =
      il?.latitude != null &&
      il?.longitude != null &&
      !Number.isNaN(il.latitude) &&
      !Number.isNaN(il.longitude)
        ? 15
        : 6;

    const map = new maps.Map(mapsDivRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: defaultZoom,
      /** Roadmap always has coverage; Satellite/Hybrid often shows "no imagery" in rural Kenya. */
      mapTypeId: 'roadmap',
      streetViewControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'terrain'],
      },
      fullscreenControl: true,
      gestureHandling: 'greedy',
      restriction: {
        latLngBounds: KENYA_LAT_LNG_BOUNDS,
        strictBounds: false,
      },
    });
    mapRef.current = map;

    const gEvent = (g.maps as { event: { trigger: (m: unknown, ev: string) => void; addListenerOnce: (m: unknown, ev: string, fn: () => void) => { remove: () => void } } }).event;
    const triggerResize = () => {
      const m = map as {
        getCenter?: () => { lat: () => number; lng: () => number };
        setCenter?: (c: { lat: number; lng: number }) => void;
      };
      if (!m || !gEvent) return;
      const c = typeof m.getCenter === 'function' ? m.getCenter() : null;
      gEvent.trigger(m, 'resize');
      if (c && typeof m.setCenter === 'function') {
        m.setCenter({ lat: c.lat(), lng: c.lng() });
      }
    };
    const idleOnce = gEvent.addListenerOnce(map, 'idle', triggerResize);
    listenersRef.current.push(idleOnce);
    requestAnimationFrame(() => {
      requestAnimationFrame(triggerResize);
    });
    const t1 = window.setTimeout(triggerResize, 120);
    const t2 = window.setTimeout(triggerResize, 450);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapsDivRef.current) {
      resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      resizeObserver.observe(mapsDivRef.current);
    }

    const clickL = map.addListener('click', (e) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      ensureMarker(lat, lng);
      reverseGeocode(lat, lng);
    });
    listenersRef.current.push(clickL);

    if (searchInputRef.current && maps.places?.Autocomplete) {
      const ac = new maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'ke' },
        fields: ['geometry', 'formatted_address', 'name', 'address_components'],
      });
      const pl = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) {
          toast({
            title: 'Choose a suggestion',
            description: 'Pick a place from the dropdown to move the pin.',
            variant: 'destructive',
          });
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.setZoom(16);
        map.panTo({ lat, lng });
        ensureMarker(lat, lng);
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address:
            place.formatted_address ||
            place.name ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          county: countyFromGeocoderComponents(place.address_components),
        });
      });
      listenersRef.current.push(pl);
    }

    if (
      il?.latitude != null &&
      il?.longitude != null &&
      !Number.isNaN(il.latitude) &&
      !Number.isNaN(il.longitude)
    ) {
      const lat = il.latitude;
      const lng = il.longitude;
      ensureMarker(lat, lng);
      if (il.address) {
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: il.address,
          county: '',
        });
      } else {
        reverseGeocode(lat, lng);
      }
    }

    setMapReady(true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      resizeObserver?.disconnect();
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
      const m = markerRef.current as { setMap: (x: null) => void } | null;
      m?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      if (mapsDivRef.current) mapsDivRef.current.innerHTML = '';
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once when script is ready; avoid remount on parent re-renders
  }, [scriptState]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not supported',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }
    if (!mapReady) return;
    setGettingCurrentLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const { latitude, longitude } = position.coords;
      const map = mapRef.current as { setZoom: (z: number) => void; panTo: (p: { lat: number; lng: number }) => void } | null;
      map?.setZoom(16);
      map?.panTo({ lat: latitude, lng: longitude });
      ensureMarker(latitude, longitude);
      reverseGeocode(latitude, longitude);
      toast({
        title: 'Location updated',
        description: 'Your current position is set on the map.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not read your location.';
      toast({
        title: 'Location error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose?.();
    }
  };

  if (scriptState === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-600" />
            {title}
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Google Maps did not load</p>
              <p className="mt-1 text-amber-800/90">
                Check that the API key is valid and that <strong>Maps JavaScript API</strong>,{' '}
                <strong>Places API</strong>, and <strong>Geocoding API</strong> are enabled for your
                Google Cloud project. Billing must be active for production use.
              </p>
            </div>
          </CardContent>
        </Card>
        {onClose && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (scriptState === 'loading' || scriptState === 'idle') {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading Google Maps…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapIcon className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="truncate">{title}</span>
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search places in Kenya (Google)…"
            className="pl-10"
            type="text"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={gettingCurrentLocation || !mapReady}
          title="Use my current location"
          className="shrink-0 sm:w-auto"
        >
          {gettingCurrentLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">My location</span>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
        <div ref={mapsDivRef} className="bg-gray-200" style={MAP_PANEL_STYLE} />
        {mapReady && !selectedLocation && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg border border-gray-200 bg-white/95 p-2 text-center text-sm text-gray-700 shadow-sm backdrop-blur-sm">
            <Target className="mr-1 inline-block h-4 w-4 text-blue-600" />
            Tap the map or search to set the pin
          </div>
        )}
      </div>

      {selectedLocation && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800">Location selected</p>
                <p className="mt-1 font-mono text-xs text-green-700">
                  Lat: {selectedLocation.latitude.toFixed(6)}, Lng:{' '}
                  {selectedLocation.longitude.toFixed(6)}
                </p>
                {selectedLocation.address ? (
                  <p className="mt-1 truncate text-xs text-green-600" title={selectedLocation.address}>
                    {selectedLocation.address}
                  </p>
                ) : null}
                {selectedLocation.county ? (
                  <Badge className="mt-2 border-green-300 bg-green-200 text-green-800">
                    {selectedLocation.county}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleConfirm} disabled={!selectedLocation} className="bg-blue-600 hover:bg-blue-700">
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm location
        </Button>
      </div>
    </div>
  );
};

const LeafletMapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  onClose,
  title = 'Select Delivery Location',
  description = 'Search for an address or click on the map to set the delivery location',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation?.latitude && initialLocation?.longitude
      ? {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          address: initialLocation.address || '',
        }
      : null
  );
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadLeaflet = async () => {
      if ((window as unknown as { L?: unknown }).L) {
        setLeafletLoaded(true);
        return;
      }
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        document.head.appendChild(link);
      }
      if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
        const script = document.createElement('script');
        script.src = LEAFLET_JS;
        script.async = true;
        script.onload = () => setLeafletLoaded(true);
        document.head.appendChild(script);
      } else {
        const checkLeaflet = setInterval(() => {
          if ((window as unknown as { L?: unknown }).L) {
            clearInterval(checkLeaflet);
            setLeafletLoaded(true);
          }
        }, 100);
        setTimeout(() => clearInterval(checkLeaflet), 10000);
      }
    };
    loadLeaflet();
  }, []);

  const setLocationFromCoords = async (lat: number, lng: number, L?: unknown, map?: unknown) => {
    const leaflet = L || (window as unknown as { L: typeof import('leaflet') }).L;
    const mapInstance = map || mapRef.current;
    const LTyped = leaflet as typeof import('leaflet');

    if (markerRef.current) {
      (markerRef.current as import('leaflet').Marker).setLatLng([lat, lng]);
    } else if (mapInstance) {
      const marker = LTyped.marker([lat, lng], { draggable: true }).addTo(
        mapInstance as import('leaflet').Map
      );
      marker.on('dragend', async (e: import('leaflet').DragEndEvent) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        await setLocationFromCoords(newLat, newLng);
      });
      markerRef.current = marker;
    }

    let address = '';
    let county = '';
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'UjenziXform/1.0' } }
      );
      if (response.ok) {
        const data = (await response.json()) as {
          display_name?: string;
          address?: { county?: string; city?: string; state?: string };
        };
        address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        county = data.address?.county || data.address?.city || data.address?.state || '';
      }
    } catch {
      address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address,
      county,
    });
  };

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const el = mapContainerRef.current;
    const L = (window as unknown as { L: typeof import('leaflet') }).L;
    const defaultLat = initialLocation?.latitude || -1.2921;
    const defaultLng = initialLocation?.longitude || 36.8219;
    const defaultZoom = initialLocation?.latitude ? 15 : 6;
    el.classList.add('ujenzi-leaflet-picker');
    const map = L.map(el, { zoomControl: true }).setView([defaultLat, defaultLng], defaultZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.on('click', async (e: import('leaflet').LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      await setLocationFromCoords(lat, lng, L, map);
    });
    mapRef.current = map;
    setMapLoaded(true);

    const invalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    };
    invalidate();
    requestAnimationFrame(() => {
      invalidate();
      requestAnimationFrame(invalidate);
    });
    const t1 = window.setTimeout(invalidate, 80);
    const t2 = window.setTimeout(invalidate, 250);
    const t3 = window.setTimeout(invalidate, 600);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => invalidate());
      resizeObserver.observe(el);
    }

    if (initialLocation?.latitude && initialLocation?.longitude) {
      const marker = L.marker([initialLocation.latitude, initialLocation.longitude], {
        draggable: true,
      }).addTo(map);
      marker.on('dragend', async (e: import('leaflet').DragEndEvent) => {
        const { lat, lng } = e.target.getLatLng();
        await setLocationFromCoords(lat, lng, L, map);
      });
      markerRef.current = marker;
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      resizeObserver?.disconnect();
      el.classList.remove('ujenzi-leaflet-picker');
      if (mapRef.current) {
        (mapRef.current as import('leaflet').Map).remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ke&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'UjenziXform/1.0' } }
      );
      let results: SearchResult[] = [];
      if (response.ok) {
        results = (await response.json()) as SearchResult[];
      }
      if (results.length === 0) {
        const globalResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'UjenziXform/1.0' } }
        );
        if (globalResponse.ok) {
          results = (await globalResponse.json()) as SearchResult[];
        }
      }
      setSearchResults(results);
      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try a different search or tap the map.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Search failed',
        description: 'Try again or tap the map.',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (mapRef.current) {
      (mapRef.current as import('leaflet').Map).setView([lat, lng], 16);
    }
    await setLocationFromCoords(lat, lng);
    setSearchResults([]);
    setSearchQuery('');
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not supported',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }
    setGettingCurrentLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const { latitude, longitude } = position.coords;
      if (mapRef.current) {
        (mapRef.current as import('leaflet').Map).setView([latitude, longitude], 16);
      }
      await setLocationFromCoords(latitude, longitude);
      toast({
        title: 'Location found',
        description: 'Your current location has been set.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not get your location.';
      toast({
        title: 'Location error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
        <p className="font-semibold">You are on the OpenStreetMap preview</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900">
          For the full Google Maps experience (labels, satellite, familiar search), add{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code> in Vercel
          env and redeploy. Enable Maps JavaScript, Places, and Geocoding APIs for that key.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search address or place…"
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
      {searchResults.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-2">
            <Label className="mb-2 block text-xs font-medium text-blue-700">Search results</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="w-full rounded p-2 text-left text-sm transition-colors hover:bg-blue-100"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span className="line-clamp-2 text-gray-800">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="relative w-full">
        <div
          ref={mapContainerRef}
          className="overflow-hidden rounded-lg border border-gray-300 bg-gray-100"
          style={MAP_PANEL_STYLE}
        >
          {!leafletLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Loading map…</p>
              </div>
            </div>
          )}
        </div>
        {mapLoaded && !selectedLocation && (
          <div className="absolute bottom-2 left-2 right-2 rounded-lg border border-gray-200 bg-white/90 p-2 text-center text-sm text-gray-700 backdrop-blur-sm">
            <Target className="mr-1 inline-block h-4 w-4 text-blue-600" />
            Click anywhere on the map to set the location
          </div>
        )}
      </div>
      {selectedLocation && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800">Location selected</p>
                <p className="mt-1 font-mono text-xs text-green-700">
                  Lat: {selectedLocation.latitude.toFixed(6)}, Lng: {selectedLocation.longitude.toFixed(6)}
                </p>
                {selectedLocation.address && (
                  <p className="mt-1 truncate text-xs text-green-600">{selectedLocation.address}</p>
                )}
                {selectedLocation.county && (
                  <Badge className="mt-2 border-green-300 bg-green-200 text-green-800">
                    {selectedLocation.county}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-end gap-2">
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
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm location
        </Button>
      </div>
    </div>
  );
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = (props) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  if (apiKey) {
    return <GoogleMapLocationPicker {...props} apiKey={apiKey} />;
  }
  return <LeafletMapLocationPicker {...props} />;
};

export default MapLocationPicker;
