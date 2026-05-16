import { describe, expect, it } from "vitest";
import {
  buildMapStopsFromDeliveryCard,
  openDeliveryNavigation,
  resolveNavTarget,
} from "@/utils/deliveryNavigation";

describe("deliveryNavigation", () => {
  it("parses lat,lng prefix with plus code label", () => {
    const t = resolveNavTarget(
      "0.6944998640233386, 35.42822220921515 | MCVH+J3V, Iten, Kenya"
    );
    expect(t?.lat).toBeCloseTo(0.6945, 3);
    expect(t?.lng).toBeCloseTo(35.4282, 3);
    expect(t?.label).toContain("Iten");
  });

  it("builds pickup and drop map stops", () => {
    const stops = buildMapStopsFromDeliveryCard({
      id: "abc-123",
      pickup_location: "Nairobi, Kenya",
      delivery_location:
        "0.6944998640233386, 35.42822220921515 | MCVH+J3V, Iten, Kenya",
      material_type: "Materials",
    });
    expect(stops).toHaveLength(1);
    expect(stops[0].type).toBe("delivery");
  });

  it("openDeliveryNavigation returns false when no locations", () => {
    expect(openDeliveryNavigation("", {}, "drop")).toBe(false);
  });
});
