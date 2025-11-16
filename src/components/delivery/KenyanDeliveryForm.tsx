import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, Phone, MessageSquare, CheckCircle, Loader2, MapPinned } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Kenya's 47 Counties
const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret/Uasin Gishu",
  "Kiambu", "Machakos", "Kajiado", "Murang'a", "Nyeri",
  "Meru", "Embu", "Kitui", "Makueni", "Nyandarua",
  "Laikipia", "Kirinyaga", "Tharaka Nithi", "Narok",
  "Kakamega", "Bungoma", "Busia", "Vihiga", "Siaya",
  "Kisii", "Nyamira", "Migori", "Homa Bay", "Kericho",
  "Bomet", "Nandi", "Baringo", "Elgeyo Marakwet",
  "West Pokot", "Trans Nzoia", "Turkana",
  "Samburu", "Marsabit", "Isiolo", "Wajir", "Garissa",
  "Mandera", "Tana River", "Lamu", "Taita Taveta", "Kwale", "Kilifi"
];

interface DeliveryLocation {
  // Location Details
  county: string;
  area: string;
  landmark: string;
  directions: string;
  
  // GPS Data
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  what3words: string;
  
  // Contact Information
  primaryPhone: string;
  alternativePhone: string;
  whatsappNumber: string;
  mpesaNumber: string;
  
  // Additional
  buildingDescription: string;
}

interface KenyanDeliveryFormProps {
  onLocationCaptured?: (location: DeliveryLocation) => void;
}

export const KenyanDeliveryForm: React.FC<KenyanDeliveryFormProps> = ({ onLocationCaptured }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryLocation>({
    county: '',
    area: '',
    landmark: '',
    directions: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    what3words: '',
    primaryPhone: '',
    alternativePhone: '',
    whatsappNumber: '',
    mpesaNumber: '',
    buildingDescription: ''
  });

  // Capture GPS Location
  const captureGPSLocation = () => {
    setGpsLoading(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'GPS Not Supported',
        description: 'Your device does not support GPS location capture.',
        variant: 'destructive'
      });
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setDeliveryInfo({
          ...deliveryInfo,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy
        });

        setLocationCaptured(true);
        setGpsLoading(false);

        // Fetch What3Words address (optional - requires API key)
        // await fetchWhat3Words(lat, lng);

        toast({
          title: '📍 Location Captured Successfully!',
          description: `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy.toFixed(0)}m)`,
        });

        if (onLocationCaptured) {
          onLocationCaptured({
            ...deliveryInfo,
            latitude: lat,
            longitude: lng,
            accuracy: accuracy
          });
        }
      },
      (error) => {
        setGpsLoading(false);
        
        let errorMessage = 'Could not capture GPS location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        toast({
          title: 'GPS Capture Failed',
          description: errorMessage,
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

  // Open location in Google Maps
  const openInGoogleMaps = () => {
    if (deliveryInfo.latitude && deliveryInfo.longitude) {
      window.open(
        `https://maps.google.com/?q=${deliveryInfo.latitude},${deliveryInfo.longitude}`,
        '_blank'
      );
    }
  };

  // Share location via WhatsApp
  const shareViaWhatsApp = () => {
    if (deliveryInfo.latitude && deliveryInfo.longitude && deliveryInfo.whatsappNumber) {
      const message = encodeURIComponent(
        `My delivery location:\nhttps://maps.google.com/?q=${deliveryInfo.latitude},${deliveryInfo.longitude}\n\nLandmark: ${deliveryInfo.landmark}\nDirections: ${deliveryInfo.directions}`
      );
      
      const phone = deliveryInfo.whatsappNumber.replace(/^0/, '254');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🇰🇪 Delivery Location (Kenya)
        </CardTitle>
        <CardDescription>
          Most areas in Kenya don't have formal addresses. Use GPS, landmarks, and phone contacts for accurate delivery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* GPS CAPTURE BUTTON - PROMINENT */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex flex-col items-center text-center mb-4">
            <MapPin className="h-12 w-12 text-blue-600 mb-2" />
            <h3 className="text-lg font-bold text-gray-900">Capture Your GPS Location</h3>
            <p className="text-sm text-gray-600 mt-1">
              This is the most accurate way to ensure delivery to the right place
            </p>
          </div>

          <Button
            onClick={captureGPSLocation}
            disabled={gpsLoading}
            size="lg"
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Capturing GPS Location...
              </>
            ) : locationCaptured ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                GPS Location Captured ✓
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5 mr-2" />
                Capture My Current GPS Location
              </>
            )}
          </Button>

          {locationCaptured && deliveryInfo.latitude && deliveryInfo.longitude && (
            <div className="mt-4 space-y-2">
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>Location Saved!</strong><br />
                  GPS: {deliveryInfo.latitude.toFixed(6)}, {deliveryInfo.longitude.toFixed(6)}<br />
                  Accuracy: ±{deliveryInfo.accuracy?.toFixed(0)}m
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInGoogleMaps}
                  className="flex-1"
                >
                  <MapPinned className="h-4 w-4 mr-1" />
                  View on Map
                </Button>
                {deliveryInfo.whatsappNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaWhatsApp}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Share via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* County Selection */}
        <div className="space-y-2">
          <Label htmlFor="county">County *</Label>
          <Select
            value={deliveryInfo.county}
            onValueChange={(value) => setDeliveryInfo({ ...deliveryInfo, county: value })}
          >
            <SelectTrigger id="county">
              <SelectValue placeholder="Select your county" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {KENYAN_COUNTIES.map((county) => (
                <SelectItem key={county} value={county}>
                  {county}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area/Estate */}
        <div className="space-y-2">
          <Label htmlFor="area">Area/Estate/Village *</Label>
          <Input
            id="area"
            placeholder="e.g., Parklands, Umoja, Githurai, Karen"
            value={deliveryInfo.area}
            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, area: e.target.value })}
          />
        </div>

        {/* Nearest Landmark */}
        <div className="space-y-2">
          <Label htmlFor="landmark">Nearest Landmark *</Label>
          <Input
            id="landmark"
            placeholder="e.g., ABC Place Mall, Total Petrol Station, St. Mary's Church"
            value={deliveryInfo.landmark}
            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, landmark: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            Well-known place near your location (shopping center, school, hospital, etc.)
          </p>
        </div>

        {/* Detailed Directions */}
        <div className="space-y-2">
          <Label htmlFor="directions">Detailed Directions *</Label>
          <Textarea
            id="directions"
            rows={4}
            placeholder="Example: From ABC Place, take Waiyaki Way towards Kangemi. Turn left at Total petrol station, drive 200 meters, blue gate on right side, next to M-Pesa shop. 3-story white building."
            value={deliveryInfo.directions}
            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, directions: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            Describe how to get to your location from the landmark (Swahili/English)
          </p>
        </div>

        {/* Building Description */}
        <div className="space-y-2">
          <Label htmlFor="building">Building/Gate Description</Label>
          <Input
            id="building"
            placeholder="e.g., Blue gate, 3-story building, brown fence, security guard at entrance"
            value={deliveryInfo.buildingDescription}
            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, buildingDescription: e.target.value })}
          />
        </div>

        {/* What3Words (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="what3words">What3Words Address (Optional)</Label>
          <div className="flex gap-2">
            <Input
              id="what3words"
              placeholder="e.g., tables.drums.sugar"
              value={deliveryInfo.what3words}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, what3words: e.target.value })}
            />
            <Button
              variant="outline"
              onClick={() => window.open('https://what3words.com/tables.drums.sugar', '_blank')}
            >
              Find Mine
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Get your What3Words address at <a href="https://what3words.com" target="_blank" rel="noopener" className="text-blue-600 underline">what3words.com</a>
          </p>
        </div>

        {/* Contact Information */}
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </h4>

          {/* Primary Phone */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="primaryPhone">Primary Phone Number (M-Pesa) *</Label>
            <Input
              id="primaryPhone"
              type="tel"
              placeholder="07XX XXX XXX or 01XX XXX XXX"
              value={deliveryInfo.primaryPhone}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, primaryPhone: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Driver will call this number when nearby
            </p>
          </div>

          {/* Alternative Phone */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="altPhone">Alternative Phone Number</Label>
            <Input
              id="altPhone"
              type="tel"
              placeholder="Backup contact number"
              value={deliveryInfo.alternativePhone}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, alternativePhone: e.target.value })}
            />
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="For location pin sharing"
              value={deliveryInfo.whatsappNumber}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, whatsappNumber: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Driver can send you location updates via WhatsApp
            </p>
          </div>

          {/* M-Pesa Number */}
          <div className="space-y-2">
            <Label htmlFor="mpesa">M-Pesa Number (for payment)</Label>
            <Input
              id="mpesa"
              type="tel"
              placeholder="07XX XXX XXX"
              value={deliveryInfo.mpesaNumber}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, mpesaNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Location Summary */}
        {(locationCaptured || deliveryInfo.landmark) && (
          <Alert className="bg-blue-50 border-blue-300">
            <MapPin className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong className="text-blue-900">Delivery Location Summary:</strong>
              <div className="mt-2 space-y-1 text-sm text-blue-800">
                {deliveryInfo.county && <div>📍 County: {deliveryInfo.county}</div>}
                {deliveryInfo.area && <div>📍 Area: {deliveryInfo.area}</div>}
                {deliveryInfo.landmark && <div>🏛️ Landmark: {deliveryInfo.landmark}</div>}
                {locationCaptured && (
                  <div>
                    🌍 GPS: {deliveryInfo.latitude?.toFixed(6)}, {deliveryInfo.longitude?.toFixed(6)}
                  </div>
                )}
                {deliveryInfo.primaryPhone && <div>📞 Phone: {deliveryInfo.primaryPhone}</div>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Helpful Tips */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>💡 Tips for accurate delivery:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>✅ Capture GPS if you're at the delivery location</li>
              <li>✅ Mention well-known landmarks (malls, petrol stations, schools)</li>
              <li>✅ Include gate color, building description</li>
              <li>✅ Provide multiple phone numbers</li>
              <li>✅ Be available to receive driver's call</li>
            </ul>
          </AlertDescription>
        </Alert>

      </CardContent>
    </Card>
  );
};

export default KenyanDeliveryForm;

