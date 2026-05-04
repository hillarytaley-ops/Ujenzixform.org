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
});
