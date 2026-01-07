import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
// FloatingSocialSidebar moved to App.tsx for global availability
import { DeliveryAccessGuard } from '@/components/security/DeliveryAccessGuard';
import { Package, Truck, Shield, Eye, Search, MapPin, ArrowLeft, Navigation as NavIcon, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GPSTracker } from '@/components/delivery/GPSTracker';
import { trackingNumberService } from '@/services/TrackingNumberService';


// Delivery Tracking Input Component with GPS Map View
const DeliveryTrackingInput: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [tracking, setTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [showGPSMap, setShowGPSMap] = useState(false);
  const { toast } = useToast();

  const handleTrackDelivery = async () => {
    if (!trackingNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Tracking Number Required",
        description: "Please enter a delivery tracking number"
      });
      return;
    }

    setTracking(true);
    setTrackingResult(null);
    setShowGPSMap(false);

    try {
      // First, search by tracking_number (new format: TRK-YYYYMMDD-XXXXX)
      const { data: trackingData, error: trackingError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('tracking_number', trackingNumber.toUpperCase())
        .maybeSingle();

      if (trackingError && trackingError.code !== 'PGRST116') {
        console.error('Tracking query error:', trackingError);
      }

      if (trackingData) {
        setTrackingResult({
          type: 'delivery_request',
          data: trackingData
        });
        toast({
          title: "✅ Delivery Found",
          description: "Click 'View Live GPS Map' to see real-time location"
        });
        setTracking(false);
        return;
      }

      // Also try case-insensitive search
      const { data: trackingDataLower, error: trackingErrorLower } = await supabase
        .from('delivery_requests')
        .select('*')
        .ilike('tracking_number', trackingNumber)
        .maybeSingle();

      if (trackingDataLower) {
        setTrackingResult({
          type: 'delivery_request',
          data: trackingDataLower
        });
        toast({
          title: "✅ Delivery Found",
          description: "Click 'View Live GPS Map' to see real-time location"
        });
        setTracking(false);
        return;
      }

      // Search for delivery by builder_email if it looks like an email
      if (trackingNumber.includes('@')) {
        const { data: emailData } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('builder_email', trackingNumber.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emailData) {
          setTrackingResult({
            type: 'delivery_request',
            data: emailData
          });
          toast({
            title: "✅ Delivery Found",
            description: "Found delivery for this email"
          });
          setTracking(false);
          return;
        }
      }

      // Search for delivery by ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trackingNumber)) {
        const { data, error } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('id', trackingNumber)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setTrackingResult({
            type: 'delivery_request',
            data: data
          });
          toast({
            title: "✅ Delivery Found",
            description: "Click 'View Live GPS Map' to see real-time location"
          });
          setTracking(false);
          return;
        }
      }

      // Try searching deliveries table (legacy) - by tracking number
      try {
        const { data: legacyData } = await supabase
          .from('deliveries')
          .select('*')
          .eq('tracking_number', trackingNumber)
          .maybeSingle();

        if (legacyData) {
          setTrackingResult({
            type: 'delivery',
            data: legacyData
          });
          toast({
            title: "✅ Delivery Found",
            description: "Click 'View Live GPS Map' to see real-time location"
          });
          setTracking(false);
          return;
        }
      } catch (legacyErr) {
        console.log('Legacy deliveries table search skipped');
      }

      // Also try searching purchase orders
      try {
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('po_number', trackingNumber)
          .maybeSingle();

        if (poData) {
          setTrackingResult({
            type: 'purchase_order',
            data: poData
          });
          toast({
            title: "✅ Order Found",
            description: "View your order details below"
          });
          setTracking(false);
          return;
        }
      } catch (poErr) {
        console.log('Purchase orders search skipped');
      }

      // Nothing found
      toast({
        variant: "destructive",
        title: "Not Found",
        description: `No delivery found with tracking number "${trackingNumber}". Make sure you entered it correctly.`
      });
    } catch (error: any) {
      console.error('Tracking error:', error);
      toast({
        variant: "destructive",
        title: "Tracking Failed",
        description: error.message || "Failed to track delivery"
      });
    } finally {
      setTracking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrackDelivery();
    }
  };

  const handleBackToSearch = () => {
    setShowGPSMap(false);
  };

  const handleNewSearch = () => {
    setTrackingResult(null);
    setShowGPSMap(false);
    setTrackingNumber('');
  };

  // If showing GPS Map view
  if (showGPSMap && trackingResult) {
    const deliveryId = trackingResult.data.tracking_number || trackingResult.data.id;
    
    return (
      <div className="space-y-4">
        {/* Back Button and Delivery Info Header */}
        <Card className="border-2 border-green-500/30 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToSearch}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Details
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNewSearch}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                New Search
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-full">
                <NavIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Live GPS Tracking
                  <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tracking: <span className="font-mono font-medium">{deliveryId}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GPS Tracker Component with Full Map View */}
        <GPSTracker 
          deliveryId={trackingResult.data.id}
          userRole="builder"
          showDriverContact={false}
          autoRefresh={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Track Your Delivery
          </CardTitle>
          <CardDescription>
            Enter your delivery tracking number, PO number, or order ID to track your shipment in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter tracking number (e.g., TRK-20251213-A7B3C)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-mono"
            />
            <Button onClick={handleTrackDelivery} disabled={tracking}>
              <Search className="h-4 w-4 mr-2" />
              {tracking ? 'Searching...' : 'Track'}
            </Button>
          </div>
          
          {/* Where to find tracking number info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Where to find your tracking number?
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• <strong>Notification:</strong> You'll receive a tracking number when a delivery provider accepts your request</li>
              <li>• <strong>Builder Dashboard:</strong> Go to Deliveries tab to see all your tracking numbers</li>
              <li>• <strong>SMS/Email:</strong> Tracking number is sent automatically when provider accepts</li>
            </ul>
            <div className="mt-3 p-2 bg-blue-100 rounded">
              <p className="text-xs text-blue-700">
                <strong>Tracking Number Format:</strong> <code className="bg-white px-1 rounded">TRK-20251213-A7B3C</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Result with GPS Map Button */}
      {trackingResult && (
        <Card className="border-2 border-green-500/30">
          <CardHeader className="pb-3 bg-green-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-green-600" />
                {trackingResult.type === 'delivery_request' ? 'Delivery Found' : 
                 trackingResult.type === 'delivery' ? 'Delivery Found' : 'Order Found'}
              </CardTitle>
              <Badge className="bg-green-500">Found</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {(trackingResult.type === 'delivery_request' || trackingResult.type === 'delivery') ? (
              <div className="space-y-4">
                {/* Tracking Number - Prominent Display */}
                {trackingResult.data.tracking_number && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                    <span className="text-xs text-muted-foreground">Tracking Number</span>
                    <p className="font-mono font-bold text-2xl text-green-700">{trackingResult.data.tracking_number}</p>
                  </div>
                )}

                {/* Delivery Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Delivery ID</span>
                    <p className="font-mono font-medium">{trackingResult.data.id?.slice(0, 8)}...</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div>
                      <Badge className={`capitalize text-sm ${
                        trackingResult.data.status === 'accepted' ? 'bg-green-500' :
                        trackingResult.data.status === 'in_transit' ? 'bg-blue-500' :
                        trackingResult.data.status === 'delivered' ? 'bg-purple-500' :
                        trackingResult.data.status === 'pending' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}>
                        {trackingResult.data.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                        {trackingResult.data.status === 'pending' && <Clock className="h-3 w-3 mr-1 inline" />}
                        {trackingResult.data.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Provider Info - if assigned */}
                {trackingResult.data.provider && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">Delivery Provider Assigned</span>
                    </div>
                    <p className="font-semibold text-blue-900">
                      {trackingResult.data.provider.company_name || trackingResult.data.provider.provider_name}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Pickup Location
                    </span>
                    <p className="text-sm font-medium">{trackingResult.data.pickup_address || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-600" /> Delivery Location
                    </span>
                    <p className="text-sm font-medium">{trackingResult.data.delivery_address || 'Not specified'}</p>
                  </div>
                </div>

                {trackingResult.data.material_type && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Material</span>
                    <p className="font-medium">{trackingResult.data.material_type} {trackingResult.data.quantity && `(Qty: ${trackingResult.data.quantity})`}</p>
                  </div>
                )}

                {/* GPS Map Button - Only show if provider is assigned */}
                {trackingResult.data.status === 'accepted' || trackingResult.data.status === 'in_transit' ? (
                  <Button 
                    onClick={() => setShowGPSMap(true)}
                    className="w-full h-14 text-lg gap-3 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <NavIcon className="h-6 w-6" />
                    View Live GPS Map
                    <Badge variant="secondary" className="ml-2 bg-white/20">Real-Time</Badge>
                  </Button>
                ) : trackingResult.data.status === 'pending' ? (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                    <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="font-medium text-yellow-800">Waiting for Delivery Provider</p>
                    <p className="text-sm text-yellow-700">GPS tracking will be available once a provider accepts your delivery request.</p>
                  </div>
                ) : trackingResult.data.status === 'delivered' ? (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-800">Delivery Completed!</p>
                    <p className="text-sm text-green-700">Your materials have been delivered successfully.</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Purchase Order Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">PO Number</span>
                    <p className="font-mono font-bold text-lg">{trackingResult.data.po_number}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div>
                      <Badge className="capitalize text-sm">{trackingResult.data.status}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Delivery Address</span>
                    <p className="text-sm font-medium">{trackingResult.data.delivery_address || 'Not specified'}</p>
                  </div>
                  {trackingResult.data.total_amount && (
                    <div>
                      <span className="text-xs text-muted-foreground">Total Amount</span>
                      <p className="text-lg font-bold text-green-600">KES {trackingResult.data.total_amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-800">Purchase Order Found</p>
                  <p className="text-sm text-blue-700">Once a delivery is scheduled, you'll receive a tracking number to track the shipment.</p>
                </div>
              </div>
            )}

            {/* New Search Button */}
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleNewSearch} className="w-full gap-2">
                <Search className="h-4 w-4" />
                Search Another Tracking Number
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Tracking = () => {

  return (
    <DeliveryAccessGuard requiredAuth={false} allowedRoles={['builder', 'supplier', 'admin', 'guest']} feature="tracking dashboard">
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-gradient-construction overflow-x-hidden">
          {/* FloatingSocialSidebar now in App.tsx */}
          <Navigation />
          
          {/* Hero Section with REAL Kenya Map Background */}
          <section className="relative py-20 px-4 overflow-hidden min-h-[480px]">
            {/* Dark Base Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900" />
            
            {/* ACTUAL Kenya Map - Accurate SVG Shape */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                viewBox="0 0 500 600" 
                className="w-full h-full max-w-2xl opacity-40"
                style={{ filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.5))' }}
              >
                {/* Accurate Kenya Country Outline */}
                <path 
                  d="M250 50 
                     L280 55 L310 65 L340 80 L365 100 L385 125 
                     L400 155 L410 190 L415 230 L420 270 
                     L425 310 L430 350 L435 390 L440 430 
                     L435 470 L420 500 L395 520 L360 535 
                     L320 545 L280 550 L240 548 L200 540 
                     L165 525 L135 505 L110 480 L90 450 
                     L75 415 L65 375 L60 335 L58 295 
                     L60 255 L65 215 L75 180 L90 150 
                     L110 125 L135 105 L165 90 L200 75 
                     L235 60 L250 50 Z"
                  fill="rgba(34, 197, 94, 0.15)"
                  stroke="rgba(34, 197, 94, 0.8)"
                  strokeWidth="3"
                />
                {/* Lake Victoria (Western) */}
                <ellipse cx="95" cy="320" rx="35" ry="45" fill="rgba(59, 130, 246, 0.3)" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" />
                {/* Indian Ocean Coast Line */}
                <path d="M420 270 Q450 320 435 390 Q445 450 420 500" fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="2" />
              </svg>
            </div>
            
            {/* GPS Tracking Points on Kenya Map */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-full max-w-2xl h-full">
                {/* Nairobi - Capital (Center-South) */}
                <div className="absolute top-[55%] left-[55%] flex flex-col items-center z-20">
                  <div className="w-8 h-8 bg-green-500/40 rounded-full animate-ping" />
                  <div className="w-5 h-5 bg-green-500 rounded-full absolute shadow-lg shadow-green-500/60 border-2 border-white" />
                  <span className="text-green-300 text-sm mt-7 font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap">📍 Nairobi</span>
                </div>
                
                {/* Mombasa - Coast (Southeast) */}
                <div className="absolute top-[75%] left-[70%] flex flex-col items-center z-20">
                  <div className="w-6 h-6 bg-blue-500/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                  <div className="w-4 h-4 bg-blue-500 rounded-full absolute shadow-lg shadow-blue-500/60 border-2 border-white" />
                  <span className="text-blue-300 text-xs mt-6 font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap">📍 Mombasa</span>
                </div>
                
                {/* Kisumu - Lake Victoria (West) */}
                <div className="absolute top-[50%] left-[20%] flex flex-col items-center z-20">
                  <div className="w-6 h-6 bg-orange-500/40 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                  <div className="w-4 h-4 bg-orange-500 rounded-full absolute shadow-lg shadow-orange-500/60 border-2 border-white" />
                  <span className="text-orange-300 text-xs mt-6 font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap">📍 Kisumu</span>
                </div>
                
                {/* Nakuru - Rift Valley (Central) */}
                <div className="absolute top-[45%] left-[45%] flex flex-col items-center z-20">
                  <div className="w-5 h-5 bg-purple-500/40 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
                  <div className="w-3 h-3 bg-purple-500 rounded-full absolute shadow-lg shadow-purple-500/60 border-2 border-white" />
                  <span className="text-purple-300 text-xs mt-5 font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap hidden lg:block">📍 Nakuru</span>
                </div>
                
                {/* Eldoret - North Rift (Northwest) */}
                <div className="absolute top-[30%] left-[35%] flex flex-col items-center z-20">
                  <div className="w-5 h-5 bg-cyan-500/40 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
                  <div className="w-3 h-3 bg-cyan-500 rounded-full absolute shadow-lg shadow-cyan-500/60 border-2 border-white" />
                  <span className="text-cyan-300 text-xs mt-5 font-bold bg-black/50 px-2 py-1 rounded whitespace-nowrap hidden lg:block">📍 Eldoret</span>
                </div>
                
                {/* Garissa - Northeast */}
                <div className="absolute top-[40%] left-[75%] flex flex-col items-center z-20">
                  <div className="w-4 h-4 bg-yellow-500/40 rounded-full animate-ping" style={{ animationDelay: '2.5s' }} />
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full absolute shadow-lg shadow-yellow-500/60 border-2 border-white" />
                </div>
                
                {/* Delivery Route Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 15 }}>
                  {/* Nairobi to Mombasa */}
                  <line x1="55%" y1="55%" x2="70%" y2="75%" stroke="rgba(34, 197, 94, 0.7)" strokeWidth="3" strokeDasharray="10,5">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                  </line>
                  {/* Nairobi to Kisumu */}
                  <line x1="55%" y1="55%" x2="20%" y2="50%" stroke="rgba(249, 115, 22, 0.7)" strokeWidth="3" strokeDasharray="10,5">
                    <animate attributeName="stroke-dashoffset" from="80" to="0" dur="2.5s" repeatCount="indefinite" />
                  </line>
                  {/* Nairobi to Nakuru */}
                  <line x1="55%" y1="55%" x2="45%" y2="45%" stroke="rgba(168, 85, 247, 0.7)" strokeWidth="2" strokeDasharray="8,4">
                    <animate attributeName="stroke-dashoffset" from="60" to="0" dur="1.5s" repeatCount="indefinite" />
                  </line>
                </svg>
              </div>
            </div>
            
            {/* GPS Grid Pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} />
            
            {/* Glowing Orbs */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
            
            {/* Kenya Flag Stripe - Top */}
            <div className="absolute top-0 left-0 w-full h-2 flex">
              <div className="flex-1 bg-black"></div>
              <div className="flex-1 bg-red-600"></div>
              <div className="flex-1 bg-green-600"></div>
            </div>
            
            {/* Glowing Orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Floating Icons - Left Side */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-10">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group">
                <MapPin className="h-7 w-7 text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group">
                <Truck className="h-7 w-7 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group">
                <Package className="h-7 w-7 text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group">
                <Eye className="h-7 w-7 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 container mx-auto max-w-5xl">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Left Content */}
                <div className="text-white text-center lg:text-left">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-green-400/30 mb-6">
                    <MapPin className="h-5 w-5 text-green-400" />
                    <span className="text-green-200 font-semibold text-sm">🇰🇪 Real-Time GPS Tracking</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                    Track Your
                    <span className="block text-green-400">Deliveries Live</span>
                  </h1>
                  
                  <p className="text-xl text-blue-100 mb-8 max-w-xl">
                    Monitor your construction material deliveries in real-time with GPS tracking. Know exactly where your materials are at any moment.
                  </p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                    <Badge className="bg-green-500/80 text-white px-3 py-1.5">
                      <MapPin className="h-3 w-3 mr-1" />
                      Live Location
                    </Badge>
                    <Badge className="bg-blue-500/80 text-white px-3 py-1.5">
                      <Truck className="h-3 w-3 mr-1" />
                      Vehicle Tracking
                    </Badge>
                    <Badge className="bg-orange-500/80 text-white px-3 py-1.5">
                      <Shield className="h-3 w-3 mr-1" />
                      Secure & Private
                    </Badge>
                  </div>
                  
                  {/* Access Badge */}
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/30 px-4 py-1.5">
                      <Eye className="h-3 w-3 mr-1" />
                      Public Access
                    </Badge>
                  </div>
                </div>
                
                {/* Right Side - Stats & Live Preview */}
                <div className="hidden lg:block">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <MapPin className="h-6 w-6 text-green-400" />
                      </div>
                      <p className="text-2xl font-black text-white">Live</p>
                      <p className="text-blue-200 text-sm">GPS Tracking</p>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Truck className="h-6 w-6 text-blue-400" />
                      </div>
                      <p className="text-2xl font-black text-white">500+</p>
                      <p className="text-blue-200 text-sm">Active Trucks</p>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Package className="h-6 w-6 text-orange-400" />
                      </div>
                      <p className="text-2xl font-black text-white">10K+</p>
                      <p className="text-blue-200 text-sm">Deliveries/Day</p>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <div className="w-12 h-12 bg-cyan-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Eye className="h-6 w-6 text-cyan-400" />
                      </div>
                      <p className="text-2xl font-black text-white">24/7</p>
                      <p className="text-blue-200 text-sm">Monitoring</p>
                    </div>
                  </div>
                  
                  {/* Live Tracking Preview */}
                  <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-semibold text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Tracking Active
                      </span>
                      <Badge className="bg-green-500/80 text-white text-xs">Online</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">DEL-2024-001</p>
                          <p className="text-blue-200 text-xs">Cement • 50 bags • ETA: 25 mins</p>
                        </div>
                        <MapPin className="h-4 w-4 text-green-400 animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Wave */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" fillOpacity="0.05"/>
              </svg>
            </div>
          </section>
          
          <main className="flex-1 bg-gray-50" role="main">
            <div className="container mx-auto px-4 py-8">
              {/* Single Tracking Portal */}
              <div className="max-w-2xl mx-auto">
                <DeliveryTrackingInput />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </DeliveryAccessGuard>
  );
};

export default Tracking;
