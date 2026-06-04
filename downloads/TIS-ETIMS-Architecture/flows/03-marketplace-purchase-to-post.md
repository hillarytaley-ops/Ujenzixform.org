# Flow 3 — Marketplace purchase → POST /invoices (current design)

POST /invoices is triggered from the **purchase order**, not as a standalone action.

```mermaid
flowchart TB
    CART[Cart Buy Now or Materials Buy Now]
    GATE[Supplier KRA PIN + legal name check]
    PO[(purchase_orders status confirmed or accepted)]
    ENRICH[Catalog eTIMS item codes on lines]
    BUILD[buildEtimsInvoiceBodyFromPurchaseOrder]
    PROXY[etims-proxy POST invoices]
    KRA[KRA eTIMS sandbox when assigned]
    QR[Fiscal receipt + QR on PO]

    CART --> GATE --> PO --> ENRICH --> BUILD --> PROXY --> KRA
    KRA --> QR
```

| Path | POST trigger |
|------|----------------|
| Cart / Buy Now | Automatic after PO `confirmed` |
| Quote workflow | Manual when PO past quote statuses |
| Supplier dashboard | Manual Submit to KRA eTIMS |
| Admin TIS ops | Manual retry / test |

Blocked PO statuses: pending, draft, quote_created, quote_responded, quoted, etc.
