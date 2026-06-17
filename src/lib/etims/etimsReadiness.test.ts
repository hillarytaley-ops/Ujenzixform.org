import { describe, expect, it } from "vitest";
import {
  assessBuyerEtimsReadiness,
  assessSupplierEtimsReadiness,
  computeProductCodeCoverage,
} from "./etimsReadiness";

describe("etimsReadiness", () => {
  it("assesses supplier readiness", () => {
    expect(
      assessSupplierEtimsReadiness({
        kra_pin: "P051234567X",
        legal_business_name: "Acme Ltd",
        etims_branch_code: "001",
      }).ready,
    ).toBe(true);
    expect(assessSupplierEtimsReadiness({ kra_pin: "P051234567X" }).ready).toBe(false);
  });

  it("assesses buyer readiness", () => {
    expect(
      assessBuyerEtimsReadiness({
        kra_pin: "P051234567X",
        billing_company_name: "Builder Co",
      }).ready,
    ).toBe(true);
  });

  it("computes product code coverage", () => {
    const c = computeProductCodeCoverage([
      { etims_item_code: "KE1ABC" },
      { etims_item_code: "" },
      { etims_item_code: "KE2XYZ" },
    ]);
    expect(c.total).toBe(3);
    expect(c.withCode).toBe(2);
    expect(c.missing).toBe(1);
    expect(c.pct).toBe(67);
  });
});
