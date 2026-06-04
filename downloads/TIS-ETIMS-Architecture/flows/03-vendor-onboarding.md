# Flow 5 — Vendor onboarding (supplier taxpayer)

Pending KRA sandbox steps use status `pending_kra`.

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> pending_review
    pending_review --> pending_kra
    pending_kra --> active
    pending_review --> rejected
    active --> suspended
```

Active vendors may issue invoices through TIS once **KRA sandbox** testing is complete for that supplier.
