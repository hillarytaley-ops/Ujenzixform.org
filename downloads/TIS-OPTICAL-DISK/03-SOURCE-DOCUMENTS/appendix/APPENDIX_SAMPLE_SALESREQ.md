# Appendix A — Sample SalesReq payload (`POST /invoices`)

**Reference:** UJX-TIS-KRA-ARCH-2026-001  
**Applies to:** UjenziXform TIS → KRA eTIMS (upon sandbox assignment)  
**Source in codebase:** `buildEtimsInvoiceBodyFromPurchaseOrder()` in `src/lib/etims/purchaseOrderEtims.ts`

All PINs, names, and item codes below are **anonymised illustrations** for KRA architecture review.

---

## A.1 HTTP call (via etims-proxy)

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `invoices` |
| **Upstream (after sandbox assignment)** | `https://etims-api-sbx.kra.go.ke/.../invoices` |
| **Auth** | HTTP Basic (KRA-issued sandbox credentials in Edge secrets) |
| **Content-Type** | `application/json` |

**Proxy invocation (browser → Edge):**

```json
{
  "method": "POST",
  "path": "invoices",
  "body": { "... SalesReq — see A.2 ..." }
}
```

---

## A.2 Sample sales invoice body (receipt type S)

Built from a UjenziXform PO with two construction-material lines (cement bags + steel bars). Full JSON: [`APPENDIX_SAMPLE_SALESREQ.json`](./APPENDIX_SAMPLE_SALESREQ.json).

```json
{
  "traderInvoiceNo": "PO-2026-004821",
  "totalAmount": 48750.0,
  "paymentType": "01",
  "salesTypeCode": "N",
  "receiptTypeCode": "S",
  "salesStatusCode": "01",
  "salesDate": "20260603143000",
  "currency": "KES",
  "exchangeRate": 1,
  "salesItems": [
    {
      "itemCode": "KE2BSG0000123",
      "taxCode": "B",
      "qty": 50,
      "unitPrice": 750.0,
      "amount": 37500.0,
      "discountAmount": 0
    },
    {
      "itemCode": "KE2MTL0000456",
      "taxCode": "B",
      "qty": 25,
      "unitPrice": 450.0,
      "amount": 11250.0,
      "discountAmount": 0
    }
  ],
  "customerPin": "P000000000A",
  "customerName": "Example Builders Ltd",
  "traderTin": "P000000000B",
  "traderName": "Example Hardware Supplies Ltd"
}
```

### Field notes

| Field | UjenziXform source |
|-------|-------------------|
| `traderInvoiceNo` | `purchase_orders.po_number` |
| `traderTin` / `sellerPin` | `suppliers.kra_pin` (issuing vendor) |
| `traderName` | `suppliers.legal_business_name` |
| `customerPin` | `profiles.kra_pin` (buyer) |
| `customerName` | Buyer billing / company name from profile |
| `salesItems[].itemCode` | PO line or catalog `etims_item_code` |
| `salesDate` | Generated at submit (`yyyyMMddHHmmss`) |
| `receiptTypeCode` | `S` = sale |

TIS may also emit duplicate snake_case keys (`trader_tin`, `item_code`) for integrator deserializers — see full JSON file.

---

## A.3 Sample credit note body (receipt type R)

Same endpoint; references original sale:

```json
{
  "traderInvoiceNo": "PO-2026-004821-CN1",
  "traderOrgInvoiceNo": "PO-2026-004821",
  "totalAmount": 48750.0,
  "paymentType": "01",
  "salesTypeCode": "N",
  "receiptTypeCode": "R",
  "salesStatusCode": "01",
  "salesDate": "20260604100000",
  "currency": "KES",
  "exchangeRate": 1,
  "salesItems": [ "..." ],
  "customerPin": "P000000000A",
  "customerName": "Example Builders Ltd",
  "traderTin": "P000000000B",
  "traderName": "Example Hardware Supplies Ltd"
}
```

Requires prior successful sale on the PO (`etims_validated_at`, `etims_trader_invoice_no`).

---

## A.4 Illustrative success response (shape may vary per KRA spec)

Stored on `purchase_orders.etims_response` and used for fiscal receipt UI:

```json
{
  "traderInvoiceNo": "PO-2026-004821",
  "invoiceVerificationUrl": "https://etims.kra.go.ke/common/link/etims/receipt/…",
  "scuInvoiceNo": "…",
  "receiptSignature": "…",
  "internalData": "…"
}
```

Exact field names depend on KRA sandbox response schema. TIS extracts verification URL and trader reference via `pickEtimsPersistFields()`.

---

## A.5 Mapping from purchase order (before POST)

| PO / catalog field | SalesReq field |
|--------------------|----------------|
| `po_number` | `traderInvoiceNo` |
| `total_amount` | `totalAmount` (reconciled to lines) |
| `items[].quantity` | `salesItems[].qty` |
| `items[].unit_price` | `salesItems[].unitPrice` |
| `items[].etims_item_code` | `salesItems[].itemCode` |
| `items[].tax_code` | `salesItems[].taxCode` |
| Supplier row | `traderTin`, `traderName` |
| Buyer profile | `customerPin`, `customerName` |

If any line lacks `etims_item_code`, TIS **blocks** POST and records `etims_error` on the PO.
