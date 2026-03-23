import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type DeliveryMapMarker = {
  id: string;
  driver: string;
  status: "en_route" | "loading" | "returning";
  lat: number;
  lng: number;
  fromLabel: string;
  toLabel: string;
};

const STATUS_COLOR: Record<DeliveryMapMarker["status"], string> = {
  en_route: "#22c55e",
  loading: "#eab308",
  returning: "#3b82f6",
};

/** Approximate Nairobi-area coordinates for demo rows (replace with live GPS when wired). */
export const DEFAULT_KENYA_DELIVERY_MARKERS: DeliveryMapMarker[] = [
  {
    id: "DEL-2024-0847",
    driver: "John Kamau",
    status: "en_route",
    lat: -1.2675,
    lng: 36.811,
    fromLabel: "Main Warehouse",
    toLabel: "Westlands Site",
  },
  {
    id: "DEL-2024-0848",
    driver: "Mary Wanjiku",
    status: "loading",
    lat: -1.282,
    lng: 36.787,
    fromLabel: "Supplier Depot",
    toLabel: "Kilimani Project",
  },
  {
    id: "DEL-2024-0849",
    driver: "Peter Ochieng",
    status: "returning",
    lat: -1.319,
    lng: 36.708,
    fromLabel: "Karen Site",
    toLabel: "Main Warehouse",
  },
];

const NAIROBI_CENTER: [number, number] = [-1.286, 36.817];

type KenyaDeliveryMapProps = {
  markers?: DeliveryMapMarker[];
  className?: string;
};

/**
 * Live raster map (OpenStreetMap via CARTO dark tiles), centered on Nairobi / Kenya ops.
 * Markers are demo positions until real device GPS is connected.
 */
export function KenyaDeliveryMap({
  markers = DEFAULT_KENYA_DELIVERY_MARKERS,
  className = "",
}: KenyaDeliveryMapProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className={`min-h-[320px] h-[420px] md:h-[480px] w-full rounded-lg bg-slate-800 animate-pulse ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <MapContainer
      center={NAIROBI_CENTER}
      zoom={11}
      className={`h-[420px] md:h-[480px] w-full rounded-lg z-0 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:max-w-[min(100%,280px)] [&_.leaflet-control-attribution]:leading-tight [&_.leaflet-control-attribution]:bg-slate-900/90 [&_.leaflet-control-attribution]:text-gray-400 ${className}`}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <ZoomControl position="topright" />
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={11}
          pathOptions={{
            color: STATUS_COLOR[m.status],
            fillColor: STATUS_COLOR[m.status],
            fillOpacity: 0.88,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ minWidth: 200, fontSize: 13 }}>
              <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{m.id}</p>
              <p style={{ margin: "0 0 6px", opacity: 0.85 }}>{m.driver}</p>
              <p style={{ margin: 0 }}>
                {m.fromLabel} → {m.toLabel}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
