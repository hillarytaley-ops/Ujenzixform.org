# UjenziXform Database Schema Documentation

> **Last Updated:** January 17, 2026  
> **Database:** Supabase (PostgreSQL)

## Table of Contents
- [Overview](#overview)
- [Core Tables](#core-tables)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Table Details](#table-details)

---

## Overview

UjenziXform is a Kenyan construction marketplace platform. The database supports:
- **User Management**: Profiles, roles, authentication
- **Marketplace**: Suppliers, materials, products
- **Orders & Quotes**: Purchase orders, quotation requests
- **Delivery**: Delivery providers, tracking, QR codes
- **Communication**: Chat, notifications, feedback

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER MANAGEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐        │
│  │  auth.users  │────▶│   profiles   │────▶│     user_roles       │        │
│  │  (Supabase)  │     │              │     │                      │        │
│  └──────────────┘     │ - id         │     │ - user_id            │        │
│                       │ - user_id    │     │ - role               │        │
│                       │ - full_name  │     │   (professional_     │        │
│                       │ - phone      │     │    builder, private_ │        │
│                       │ - company    │     │    client, supplier, │        │
│                       │ - location   │     │    delivery, admin)  │        │
│                       └──────────────┘     └──────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKETPLACE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐                              │
│  │    suppliers     │     │  material_items  │                              │
│  │                  │     │                  │                              │
│  │ - id             │     │ - id             │                              │
│  │ - user_id        │     │ - name           │                              │
│  │ - business_name  │     │ - category       │                              │
│  │ - location       │     │ - price          │                              │
│  │ - phone          │     │ - unit           │                              │
│  │ - is_verified    │     │ - image_url      │                              │
│  │ - status         │     │ - supplier_id    │                              │
│  └──────────────────┘     │ - status         │                              │
│                           │ - stock_quantity │                              │
│                           └──────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORDERS & QUOTES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │  quotation_requests  │     │   purchase_orders    │                      │
│  │                      │     │                      │                      │
│  │ - id                 │────▶│ - id                 │                      │
│  │ - builder_id         │     │ - po_number          │                      │
│  │ - supplier_id        │     │ - buyer_id           │                      │
│  │ - items (JSONB)      │     │ - supplier_id        │                      │
│  │ - status             │     │ - items (JSONB)      │                      │
│  │   (pending, quoted,  │     │ - total_amount       │                      │
│  │    accepted,rejected)│     │ - delivery_address   │                      │
│  │ - delivery_address   │     │ - status             │                      │
│  │ - delivery_date      │     │   (pending, quoted,  │                      │
│  └──────────────────────┘     │    confirmed,        │                      │
│                               │    rejected)         │                      │
│                               └──────────────────────┘                      │
│                                                                              │
│  WORKFLOW:                                                                   │
│  1. Builder requests quote → quotation_request (pending)                     │
│  2. Supplier sends pricing → quotation_request (quoted)                      │
│  3. Builder accepts → purchase_order (confirmed) → QR codes generated        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DELIVERY                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐     ┌────────────────────┐                          │
│  │ delivery_providers │     │    deliveries      │                          │
│  │                    │     │                    │                          │
│  │ - id               │     │ - id               │                          │
│  │ - user_id          │     │ - material_type *  │ (* = required)           │
│  │ - company_name     │     │ - quantity *       │ (must be number)         │
│  │ - vehicle_type     │     │ - pickup_address * │                          │
│  │ - license_number   │     │ - delivery_address*│                          │
│  │ - is_available     │     │ - tracking_number  │                          │
│  │ - current_location │     │ - status           │                          │
│  │ - service_areas    │     │ - notes            │                          │
│  └────────────────────┘     │ - delivery_date    │                          │
│                             │ - builder_id       │                          │
│  ┌────────────────────┐     │ - supplier_id      │                          │
│  │  delivery_requests │     └────────────────────┘                          │
│  │                    │                                                      │
│  │ - id               │     ┌────────────────────┐                          │
│  │ - builder_id       │     │  material_qr_codes │                          │
│  │ - provider_id      │     │                    │                          │
│  │ - status           │     │ - id               │                          │
│  │ - pickup_address   │     │ - qr_code          │                          │
│  │ - delivery_address │     │ - material_id      │                          │
│  └────────────────────┘     │ - purchase_order_id│                          │
│                             │ - status           │                          │
│                             │   (generated,      │                          │
│                             │    scanned,        │                          │
│                             │    delivered)      │                          │
│                             └────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMMUNICATION                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │  chat_messages   │     │  support_chats   │     │   notifications  │    │
│  │                  │     │                  │     │                  │    │
│  │ - conversation_id│     │ - id             │     │ - id             │    │
│  │ - content        │     │ - user_id        │     │ - user_id        │    │
│  │ - sender_id      │     │ - status         │     │ - title          │    │
│  │ - sender_name    │     │ - created_at     │     │ - message        │    │
│  │ - sender_type    │     └──────────────────┘     │ - read           │    │
│  │   (client/staff) │                              │ - type           │    │
│  │ - read           │     ┌──────────────────┐     └──────────────────┘    │
│  └──────────────────┘     │ support_messages │                              │
│                           │                  │                              │
│                           │ - chat_id        │                              │
│                           │ - content        │                              │
│                           │ - sender_id      │                              │
│                           │ - is_admin       │                              │
│                           └──────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Details

### Core User Tables

#### `profiles`
Stores user profile information.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | References auth.users |
| full_name | text | No | User's full name |
| phone | text | No | Phone number |
| company_name | text | No | Business name |
| location | text | No | Location/address |
| avatar_url | text | No | Profile picture URL |
| created_at | timestamp | Yes | Auto-generated |
| updated_at | timestamp | Yes | Auto-updated |

#### `user_roles`
Maps users to their roles.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | References auth.users |
| role | text | Yes | One of: `professional_builder`, `private_client`, `supplier`, `delivery`, `delivery_provider`, `admin` |
| created_at | timestamp | Yes | Auto-generated |

---

### Marketplace Tables

#### `suppliers`
Registered supplier businesses.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | Owner's user ID |
| business_name | text | Yes | Company name |
| location | text | No | Business location |
| phone | text | No | Contact phone |
| email | text | No | Contact email |
| is_verified | boolean | No | Admin verification status |
| status | text | No | `pending`, `approved`, `suspended` |
| created_at | timestamp | Yes | Auto-generated |

#### `material_items`
Products/materials in the marketplace.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| name | text | Yes | Product name |
| category | text | Yes | Material category |
| price | numeric | No | Price in KES |
| unit | text | No | Unit (kg, bag, piece, etc.) |
| description | text | No | Product description |
| image_url | text | No | Product image |
| supplier_id | uuid | No | Supplier who owns it |
| status | text | No | `pending`, `approved` |
| stock_quantity | integer | No | Available stock |
| created_at | timestamp | Yes | Auto-generated |

---

### Order Tables

#### `quotation_requests`
Quote requests from professional builders.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| builder_id | uuid | Yes | Requesting builder |
| supplier_id | uuid | Yes | Target supplier |
| items | jsonb | Yes | Array of requested items |
| status | text | Yes | `pending`, `quoted`, `accepted`, `rejected` |
| delivery_address | text | Yes | Delivery location |
| delivery_date | date | No | Preferred delivery date |
| supplier_quote | jsonb | No | Supplier's pricing response |
| created_at | timestamp | Yes | Auto-generated |

#### `purchase_orders`
Confirmed orders (after quote acceptance).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| po_number | text | Yes | Unique order number |
| buyer_id | uuid | Yes | Purchasing user |
| supplier_id | uuid | Yes | Supplier |
| items | jsonb | Yes | Order items with prices |
| total_amount | numeric | Yes | Total in KES |
| delivery_address | text | Yes | Delivery location |
| delivery_date | date | Yes | Expected delivery |
| status | text | Yes | `pending`, `quoted`, `confirmed`, `rejected` |
| created_at | timestamp | Yes | Auto-generated |

---

### Delivery Tables

#### `deliveries`
Delivery requests and tracking.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| **material_type** | text | **Yes** | Type of material |
| **quantity** | numeric | **Yes** | Amount (NUMBER, not string) |
| **pickup_address** | text | **Yes** | Pickup location |
| **delivery_address** | text | **Yes** | Delivery destination |
| tracking_number | text | No | Tracking ID |
| status | text | No | `pending`, `assigned`, `in_transit`, `delivered` |
| notes | text | No | Additional instructions |
| delivery_date | date | No | Scheduled date |
| builder_id | uuid | No | Requesting builder |
| supplier_id | uuid | No | Source supplier |
| created_at | timestamp | Yes | Auto-generated |
| updated_at | timestamp | Yes | Auto-updated |

**⚠️ Important:** The `quantity` field must be a NUMBER, not a string!

#### `delivery_providers`
Registered delivery service providers.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | Owner's user ID |
| company_name | text | No | Business name |
| vehicle_type | text | No | Type of vehicle |
| license_number | text | No | Driver's license |
| is_available | boolean | No | Currently accepting jobs |
| service_areas | text[] | No | Areas served |
| created_at | timestamp | Yes | Auto-generated |

---

### Communication Tables

#### `chat_messages`
Live chat messages (widget on all pages).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| conversation_id | text | Yes | Groups messages together |
| content | text | Yes | Message text |
| sender_id | text | Yes | Sender identifier |
| sender_name | text | Yes | Display name |
| sender_type | text | Yes | `client`, `staff`, `system` |
| message_type | text | No | `text`, `file`, etc. |
| read | boolean | No | Read status |
| created_at | timestamp | Yes | Auto-generated |

#### `feedback`
User feedback submissions.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Primary key |
| name | text | No | Submitter name |
| email | text | No | Contact email |
| subject | text | No | Feedback subject |
| message | text | Yes | Feedback content |
| rating | integer | No | 1-5 star rating |
| category | text | No | Feedback category |
| created_at | timestamp | Yes | Auto-generated |

---

## Security Notes

### Row Level Security (RLS)
All tables have RLS enabled. Key policies:
- Users can only read/write their own data
- Admin users have elevated access
- Public tables (like `material_items` with `status='approved'`) are readable by anyone

### Sensitive Data
These tables contain encrypted/protected data:
- `delivery_provider_personal_data_vault`
- `payment_contact_vault`
- `profile_contact_vault`
- `driver_contact_data`

---

## Common Queries

### Get user's role
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
```

### Get approved materials
```sql
SELECT * FROM material_items WHERE status = 'approved';
```

### Get user's deliveries
```sql
SELECT * FROM deliveries WHERE builder_id = auth.uid();
```

### Insert a delivery (correct format)
```sql
INSERT INTO deliveries (
  material_type,
  quantity,          -- Must be a NUMBER
  pickup_address,
  delivery_address,
  tracking_number,
  status,
  notes
) VALUES (
  'cement',
  50,                -- NUMBER, not '50'
  '123 Supplier St',
  '456 Builder Ave',
  'DEL-123456',
  'pending',
  'Handle with care'
);
```

---

## Audit Tables

The database includes extensive audit logging:
- `contact_access_audit`
- `delivery_access_log`
- `payment_access_audit`
- `profile_access_log`
- `security_events`
- And many more...

These track all sensitive data access for compliance and security.

