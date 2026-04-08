/** Map `delivery_requests` rows to the Delivery page list UI (read-only display). */

export type DeliveryCard = {
  /** Short display id (first 8 of UUID) */
  id: string;
  rawId: string;
  materialType: string;
  quantity: string;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  driver?: string;
  driverPhone?: string;
  estimatedArrival: string;
  progress: number;
  lat?: number;
  lng?: number;
};

type Row = Record<string, unknown>;

export function normalizeDeliveryStatus(s: string | null | undefined): string {
  const v = (s ?? "pending").toString().trim().toLowerCase().replace(/\s+/g, "_");
  return v || "pending";
}

export function isCompletedDeliveryStatus(status: string): boolean {
  return status === "delivered" || status === "completed";
}

export function isActivePipelineStatus(status: string): boolean {
  return !isCompletedDeliveryStatus(status) && status !== "cancelled" && status !== "rejected";
}

export function statusToProgress(status: string): number {
  if (isCompletedDeliveryStatus(status)) return 100;
  if (["in_transit", "out_for_delivery"].includes(status)) return 85;
  if (status === "picked_up") return 70;
  if (["accepted", "assigned", "scheduled"].includes(status)) return 50;
  if (["pending", "requested"].includes(status)) return 25;
  if (status === "cancelled" || status === "rejected") return 0;
  return 35;
}

export function mapDeliveryRequestRow(row: Row): DeliveryCard {
  const status = normalizeDeliveryStatus(row.status as string | null | undefined);
  const idFull = String(row.id ?? "");
  const qty = row.quantity;
  const quantity =
    typeof qty === "number" && Number.isFinite(qty)
      ? String(qty)
      : typeof qty === "string"
        ? qty
        : String(qty ?? "");

  const pickup =
    (row.pickup_address as string) || (row.pickup_location as string) || "—";
  const dropoff =
    (row.delivery_address as string) || (row.dropoff_location as string) || "—";

  const driverName = row.driver_name != null ? String(row.driver_name) : undefined;
  const driverPhone = row.driver_phone != null ? String(row.driver_phone) : undefined;

  const pickupDate = row.pickup_date ? String(row.pickup_date) : "";
  const prefTime = row.preferred_time ? String(row.preferred_time) : "";
  let estimatedArrival = "—";
  if (isCompletedDeliveryStatus(status)) {
    estimatedArrival = "Completed";
  } else if (pickupDate) {
    try {
      estimatedArrival = new Date(pickupDate).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      estimatedArrival = pickupDate;
    }
    if (prefTime) estimatedArrival = `${estimatedArrival} · ${prefTime}`;
  } else if (prefTime) {
    estimatedArrival = prefTime;
  } else {
    estimatedArrival = "In progress";
  }

  const lat =
    typeof row.delivery_latitude === "number" && Number.isFinite(row.delivery_latitude)
      ? row.delivery_latitude
      : undefined;
  const lng =
    typeof row.delivery_longitude === "number" && Number.isFinite(row.delivery_longitude)
      ? row.delivery_longitude
      : undefined;

  return {
    id: idFull ? idFull.slice(0, 8).toUpperCase() : "—",
    rawId: idFull,
    materialType: String(row.material_type ?? "Materials"),
    quantity,
    status,
    pickupLocation: pickup,
    deliveryLocation: dropoff,
    driver: driverName,
    driverPhone,
    estimatedArrival,
    progress: statusToProgress(status),
    lat,
    lng,
  };
}
