# 📚 MradiPro Documentation

Welcome to the MradiPro documentation. This folder contains comprehensive documentation for Kenya's Premier Construction Marketplace.

---

## 📋 Documentation Index

### Main Documentation

| Document | Description |
|----------|-------------|
| [Complete Workflow Documentation](./MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md) | Full platform overview with all workflows |
| [Pending & future work (plain text, printable)](./UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt) | Layman summary of gaps, TODOs, and roadmap-style items |

### Workflow Documentation

| Document | Description |
|----------|-------------|
| [User Registration Flows](./workflows/USER_REGISTRATION_FLOWS.md) | All user registration processes |
| [Order & Delivery Flows](./workflows/ORDER_AND_DELIVERY_FLOWS.md) | Material ordering and delivery workflows |
| [Suppliers Workflow](./workflows/SUPPLIERS_WORKFLOW.md) | Supplier Marketplace & Supplier Dashboard |
| [Payment & Security Flows](./workflows/PAYMENT_AND_SECURITY_FLOWS.md) | Payment processing and security framework |
| [Monitoring & QR Flows](./workflows/MONITORING_AND_QR_FLOWS.md) | Site monitoring and QR verification |
| [Kenya GPS Location System](./workflows/KENYA_GPS_LOCATION_SYSTEM.md) | GPS tracking for Kenya's address-less environment |

---

## 🗂️ Documentation Structure

```
docs/
├── README.md                                    # This file
├── MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md  # Main documentation
└── workflows/
    ├── USER_REGISTRATION_FLOWS.md               # Registration workflows
    ├── ORDER_AND_DELIVERY_FLOWS.md              # Order & delivery workflows
    ├── SUPPLIERS_WORKFLOW.md                    # Supplier Marketplace & Dashboard
    ├── PAYMENT_AND_SECURITY_FLOWS.md            # Payment & security workflows
    ├── MONITORING_AND_QR_FLOWS.md               # Monitoring & QR workflows
    └── KENYA_GPS_LOCATION_SYSTEM.md             # GPS tracking for Kenya
```

---

## 🎯 Quick Links by User Role

### For Builders 🏗️
- [Builder Registration](./workflows/USER_REGISTRATION_FLOWS.md#1-builder-registration-paths)
- [Material Sourcing](./MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md#42-material-sourcing-workflow)
- [Order Tracking](./workflows/ORDER_AND_DELIVERY_FLOWS.md#5-order-tracking)
- [Site Monitoring](./workflows/MONITORING_AND_QR_FLOWS.md#1-site-monitoring-service)

### For Suppliers 📦
- [Supplier Registration](./workflows/USER_REGISTRATION_FLOWS.md#2-supplier-registration)
- [Supplier Marketplace](./workflows/SUPPLIERS_WORKFLOW.md#1-supplier-marketplace-for-buyers)
- [Supplier Dashboard](./workflows/SUPPLIERS_WORKFLOW.md#2-supplier-dashboard-for-suppliers)
- [Product Management](./workflows/SUPPLIERS_WORKFLOW.md#3-product-management)
- [Order Management](./workflows/SUPPLIERS_WORKFLOW.md#4-order-processing)
- [Quote Management](./workflows/SUPPLIERS_WORKFLOW.md#5-quote-management)
- [QR Code Generation](./workflows/MONITORING_AND_QR_FLOWS.md#21-qr-code-generation-supplier-side)
- [Payment Processing](./workflows/PAYMENT_AND_SECURITY_FLOWS.md#3-escrow-payment-system)

### For Delivery Providers 🚚
- [Driver Registration](./workflows/USER_REGISTRATION_FLOWS.md#3-delivery-provider-registration)
- [Delivery Acceptance](./MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md#62-delivery-acceptance-flow)
- [QR Scanning](./workflows/MONITORING_AND_QR_FLOWS.md#22-qr-scanning-workflow)
- [Delivery Execution](./workflows/ORDER_AND_DELIVERY_FLOWS.md#32-delivery-execution)

### For Administrators 👨‍💼
- [Admin Dashboard](./MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md#10-admin-workflows)
- [Security Framework](./workflows/PAYMENT_AND_SECURITY_FLOWS.md#5-security-framework)
- [Monitoring Management](./workflows/MONITORING_AND_QR_FLOWS.md#13-access-control-matrix)
- [User Management](./MRADIPRO_COMPLETE_WORKFLOW_DOCUMENTATION.md#102-user-approval-workflow)

---

## 📊 Key Diagrams

### Platform Overview
```
┌─────────────────────────────────────────────────────────────┐
│                     MradiPro Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   BUILDERS ←──────→ MARKETPLACE ←──────→ SUPPLIERS         │
│      │                   │                    │             │
│      │                   │                    │             │
│      └───────→ DELIVERY PROVIDERS ←──────────┘             │
│                         │                                   │
│                         ▼                                   │
│              CONSTRUCTION SITES                             │
│              (47 Counties in Kenya)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### User Role Hierarchy
```
                    ┌─────────────┐
                    │    ADMIN    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  SUPPLIER   │ │   BUILDER   │ │  DELIVERY   │
    │             │ │             │ │  PROVIDER   │
    └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   PRIVATE   │
                    │   CLIENT    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    GUEST    │
                    └─────────────┘
```

---

## 🔧 Technical Reference

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Security**: JWT, OAuth 2.0, RLS, AES-256 encryption
- **Payments**: M-Pesa (Daraja API), Airtel Money, Cards

### Key Files Reference

| Category | Key Files |
|----------|-----------|
| Pages | `src/pages/*.tsx` |
| Components | `src/components/**/*.tsx` |
| Hooks | `src/hooks/*.ts` |
| Services | `src/services/*.ts` |
| Types | `src/types/*.ts` |
| Database | `supabase/migrations/*.sql` |
| Edge Functions | `supabase/functions/*/index.ts` |

---

## 📞 Support

- **Technical Support**: support@mradipro.co.ke
- **Security Issues**: security@mradipro.co.ke
- **Data Protection**: dpo@mradipro.co.ke

---

## 📝 Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| Complete Workflow | 2.0 | December 3, 2025 |
| User Registration | 2.0 | December 3, 2025 |
| Order & Delivery | 2.0 | December 3, 2025 |
| Suppliers Workflow | 2.0 | December 4, 2025 |
| Payment & Security | 2.0 | December 3, 2025 |
| Monitoring & QR | 2.0 | December 3, 2025 |

---

*🏗️ MradiPro - Building Kenya's Future, One Connection at a Time*

