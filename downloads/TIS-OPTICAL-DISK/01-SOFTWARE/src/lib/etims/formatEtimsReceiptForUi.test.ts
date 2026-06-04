import { describe, expect, it } from "vitest";
import { resolveEtimsReceiptTaxBreakdown } from "./formatEtimsReceiptForUi";

describe("resolveEtimsReceiptTaxBreakdown", () => {
  it("splits VAT-inclusive amount when subtotal equals total", () => {
    const tb = resolveEtimsReceiptTaxBreakdown(null, {
      invoiceSubtotal: 32900,
      invoiceTaxAmount: 0,
      invoiceTotalAmount: 32900,
      poTotalAmount: 32900,
    });
    expect(tb.taxAmount).not.toBeNull();
    expect(tb.subtotalOrTaxable).not.toBeNull();
    expect(tb.totalAmount).toBe("32,900.00");
    const tax = parseFloat(tb.taxAmount!.replace(/,/g, ""));
    const sub = parseFloat(tb.subtotalOrTaxable!.replace(/,/g, ""));
    expect(Math.round((tax + sub) * 100) / 100).toBe(32900);
    expect(tb.taxLabel).toContain("16%");
  });

  it("uses tax-exclusive gap when total exceeds subtotal", () => {
    const tb = resolveEtimsReceiptTaxBreakdown(null, {
      invoiceSubtotal: 8250,
      invoiceTotalAmount: 9570,
    });
    expect(tb.taxAmount).toBe("1,320.00");
    expect(tb.subtotalOrTaxable).toBe("8,250.00");
    expect(tb.totalAmount).toBe("9,570.00");
  });
});
