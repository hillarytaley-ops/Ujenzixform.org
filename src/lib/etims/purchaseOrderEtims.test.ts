import { describe, expect, it } from "vitest";
import { buildEtimsInvoiceBodyFromPurchaseOrder } from "./purchaseOrderEtims";

describe("buildEtimsInvoiceBodyFromPurchaseOrder", () => {
  it("aligns eTIMS line amounts to PO total when catalog line prices differ from quoted total", () => {
    const body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: "00000000-0000-4000-8000-000000000001",
        po_number: "QR-TEST",
        total_amount: 99,
        items: [
          {
            etims_item_code: "4020001000455",
            material_name: "Test material",
            quantity: 1,
            unit_price: 100,
          },
        ],
      },
      {},
    );

    expect(body.totalAmount).toBe(99);
    expect(body.salesItems).toHaveLength(1);
    expect(body.salesItems[0].amount).toBe(99);
    expect(body.salesItems[0].unitPrice).toBe(99);
    expect(body.salesItems[0].qty).toBe(1);
  });

  it("does not change lines when sum already matches PO total", () => {
    const body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: "00000000-0000-4000-8000-000000000002",
        po_number: "QR-TEST2",
        total_amount: 100,
        items: [
          {
            etims_item_code: "4020001000455",
            quantity: 1,
            unit_price: 100,
          },
        ],
      },
      {},
    );

    expect(body.totalAmount).toBe(100);
    expect(body.salesItems[0].amount).toBe(100);
    expect(body.salesItems[0].unitPrice).toBe(100);
  });

  it("scales multiple lines proportionally to header total", () => {
    const body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: "00000000-0000-4000-8000-000000000003",
        po_number: "QR-TEST3",
        total_amount: 99,
        items: [
          { etims_item_code: "A", quantity: 1, unit_price: 60 },
          { etims_item_code: "B", quantity: 1, unit_price: 40 },
        ],
      },
      {},
    );

    expect(body.totalAmount).toBe(99);
    expect(body.salesItems[0].amount + body.salesItems[1].amount).toBeCloseTo(99, 5);
  });

  it("passes tax category, unit codes, and item classification onto salesItems when present on PO lines", () => {
    const body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: "00000000-0000-4000-8000-000000000004",
        po_number: "PO-TAX-UNITS",
        total_amount: 50,
        items: [
          {
            etims_item_code: "KE1UCT0000001",
            quantity: 2,
            unit_price: 25,
            tax_code: "D",
            qty_unit_code: "UOM003",
            pkg_unit_code: "PKG01",
            item_class_code: "50211505",
          },
        ],
      },
      {},
    );

    expect(body.salesItems[0].taxCode).toBe("D");
    expect(body.salesItems[0].qtyUnitCode).toBe("UOM003");
    expect(body.salesItems[0].pkgUnitCode).toBe("PKG01");
    expect(body.salesItems[0].itemClassCode).toBe("50211505");
    expect(body.salesItems[0].pkg).toBe(0);
  });
});
