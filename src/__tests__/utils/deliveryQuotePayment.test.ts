import { describe, expect, it } from "vitest";
import {
  deliveryQuoteStatusLabel,
  isDeliveryQuotePaid,
  needsDeliveryQuotePayment,
  parseDeliveryQuoteAmount,
} from "@/utils/deliveryQuotePayment";

describe("deliveryQuotePayment", () => {
  it("parses valid amounts", () => {
    expect(parseDeliveryQuoteAmount(500)).toBe(500);
    expect(parseDeliveryQuoteAmount("400")).toBe(400);
    expect(parseDeliveryQuoteAmount(0)).toBeNull();
    expect(parseDeliveryQuoteAmount(null)).toBeNull();
  });

  it("detects paid vs needs payment", () => {
    const unpaid = { status: "quote_accepted", delivery_quote_paid_at: null };
    expect(needsDeliveryQuotePayment(unpaid)).toBe(true);
    expect(isDeliveryQuotePaid(unpaid)).toBe(false);

    const paidAt = {
      status: "quote_accepted",
      delivery_quote_paid_at: "2026-05-16T12:00:00Z",
    };
    expect(needsDeliveryQuotePayment(paidAt)).toBe(false);
    expect(isDeliveryQuotePaid(paidAt)).toBe(true);
    expect(deliveryQuoteStatusLabel("quote_accepted", paidAt)).toBe("Payment recorded");
  });
});
