import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Truck,
  Package,
  Route,
  RefreshCw,
  Target,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
  openGoogleMapsNavigation,
  type MapStop,
} from "@/utils/deliveryNavigation";

export type { MapStop };

interface DeliveryMapProps {
  stops: MapStop[];
  focusOrderId?: string | null;
  onRefresh?: () => void;
}

function groupStopsByOrder(stops: MapStop[]): Map<string, { orderLabel: string; pickup?: MapStop; drop?: MapStop }> {
  const map = new Map<string, { orderLabel: string; pickup?: MapStop; drop?: MapStop }>();
  for (const s of stops) {
    let row = map.get(s.orderId);
    if (!row) {
      row = { orderLabel: s.orderLabel };
      map.set(s.orderId, row);
    }
    if (s.type === "pickup") row.pickup = s;
    else row.drop = s;
  }
  return map;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({ stops, focusOrderId, onRefresh }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(focusOrderId ?? null);

  const orderGroups = useMemo(() => groupStopsByOrder(stops), [stops]);
  const orderIds = useMemo(() => Array.from(orderGroups.keys()), [orderGroups]);

  const activeOrderId = selectedOrderId && orderGroups.has(selectedOrderId)
    ? selectedOrderId
    : focusOrderId && orderGroups.has(focusOrderId)
      ? focusOrderId
      : orderIds[0] ?? null;

  const activeGroup = activeOrderId ? orderGroups.get(activeOrderId) : undefined;
  const embedStop = activeGroup?.drop ?? activeGroup?.pickup ?? stops[0];

  React.useEffect(() => {
    if (focusOrderId && orderGroups.has(focusOrderId)) {
      setSelectedOrderId(focusOrderId);
    }
  }, [focusOrderId, orderGroups]);

  React.useEffect(() => {
    if (!isTracking || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  const startRoute = (pickup?: MapStop, drop?: MapStop) => {
    if (pickup && drop) {
      window.open(
        googleMapsDirectionsUrl({
          origin: { lat: pickup.lat, lng: pickup.lng, label: pickup.address, query: `${pickup.lat},${pickup.lng}` },
          destination: {
            lat: drop.lat,
            lng: drop.lng,
            label: drop.address,
            query: `${drop.lat},${drop.lng}`,
          },
        }),
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }
    const one = drop ?? pickup;
    if (one) {
      openGoogleMapsNavigation({
        lat: one.lat,
        lng: one.lng,
        label: one.address,
        query: `${one.lat},${one.lng}`,
      });
    }
  };

  return (
    <Card className={`shadow-lg transition-all ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-5 w-5 text-teal-600" />
              Delivery map &amp; navigation
            </CardTitle>
            <CardDescription>
              Pickup and drop-off pins from your scheduled orders — start turn-by-turn in Google Maps
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTracking(!isTracking)}
              className={isTracking ? "bg-teal-50 border-teal-300" : ""}
            >
              <Target className={`h-4 w-4 mr-1 ${isTracking ? "text-teal-600 animate-pulse" : ""}`} />
              {isTracking ? "Tracking" : "Track me"}
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh} type="button">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} type="button">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stops.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No GPS stops on scheduled deliveries</p>
            <p className="text-sm mt-1">
              Accept orders with coordinates or a full address on the drop-off line to see them here.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`relative rounded-lg overflow-hidden border bg-muted/30 ${
                isFullscreen ? "h-[calc(100vh-220px)]" : "h-72 sm:h-80"
              }`}
            >
              {embedStop ? (
                <iframe
                  title="Delivery location map"
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={googleMapsEmbedUrl(embedStop.lat, embedStop.lng, 13)}
                />
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <Package className="h-3 w-3 mr-1" />
                {stops.filter((s) => s.type === "pickup").length} pickups
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <MapPin className="h-3 w-3 mr-1" />
                {stops.filter((s) => s.type === "delivery").length} drop-offs
              </Badge>
              <Badge variant="outline">{orderIds.length} orders</Badge>
            </div>

            <div className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto">
              {orderIds.map((orderId) => {
                const g = orderGroups.get(orderId)!;
                const isActive = orderId === activeOrderId;
                return (
                  <div
                    key={orderId}
                    className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                      isActive ? "border-teal-400 bg-teal-50/80" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedOrderId(orderId)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm">{g.orderLabel}</p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 h-8"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRoute(g.pickup, g.drop);
                          }}
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1" />
                          Start route
                        </Button>
                      </div>
                    </div>
                    {g.pickup && (
                      <div className="flex gap-2 text-xs mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-green-800">Pickup</p>
                          <p className="text-muted-foreground break-words">{g.pickup.address}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {g.pickup.lat.toFixed(6)}, {g.pickup.lng.toFixed(6)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 mt-1"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGoogleMapsNavigation({
                                lat: g.pickup!.lat,
                                lng: g.pickup!.lng,
                                label: g.pickup!.address,
                                query: `${g.pickup!.lat},${g.pickup!.lng}`,
                              });
                            }}
                          >
                            <Route className="h-3 w-3 mr-1" />
                            Navigate to pickup
                          </Button>
                        </div>
                      </div>
                    )}
                    {g.drop && (
                      <div className="flex gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-red-800">Drop-off</p>
                          <p className="text-muted-foreground break-words">{g.drop.address}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {g.drop.lat.toFixed(6)}, {g.drop.lng.toFixed(6)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 mt-1"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGoogleMapsNavigation({
                                lat: g.drop!.lat,
                                lng: g.drop!.lng,
                                label: g.drop!.address,
                                query: `${g.drop!.lat},${g.drop!.lng}`,
                              });
                            }}
                          >
                            <Route className="h-3 w-3 mr-1" />
                            Navigate to drop
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryMap;
