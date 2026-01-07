# 🔒 Protected Features - Material Images & Pricing System

**Created:** December 25, 2025  
**Updated:** December 26, 2025  
**Status:** PROTECTED - DO NOT MODIFY WITHOUT REVIEW

---

## Overview

This document describes the protected material images and pricing system:

### Workflow
1. **Admin** uploads ALL product images (quality control)
2. **Suppliers** browse admin-uploaded products and set their prices
3. **Suppliers** can request new products to be added by admin
4. **All users** view materials on the marketplace pages

---

## Protected Components

### 1. MaterialsGrid (`src/components/suppliers/MaterialsGrid.tsx`)

**Purpose:** Displays materials on marketplace pages with images

**Key Features:**
- Fetches admin images from `admin_material_images` table (prioritized)
- Fetches supplier products from `materials` table
- Uses `object-contain` with white background (no image cropping)
- Gradient placeholders as fallback
- z-index layering: gradient (z-0) → image (z-10) → badges (z-20)

**DO NOT:**
- Change `object-contain` to `object-cover`
- Remove admin_material_images fetch logic
- Add transitions that cause blinking
- Remove Request Quote / Buy Now buttons

---

### 2. MaterialImagesManager (`src/components/admin/MaterialImagesManager.tsx`)

**Purpose:** Admin interface for uploading and managing material images

**Key Features:**
- Upload images as base64 data URLs
- View supplier-uploaded images
- Approve/reject supplier images
- Mark images as featured

**DO NOT:**
- Remove base64 image upload functionality
- Change the admin_material_images table structure
- Remove supplier materials approval workflow

---

### 3. SupplierMarketplace (`src/pages/SupplierMarketplace.tsx`)

**Purpose:** Public marketplace page for browsing materials

**Key Features:**
- Shows MaterialsGrid to all users (public browsing)
- Request Quote / Buy Now buttons redirect to sign-in if needed
- Displays both admin and supplier uploaded images

**DO NOT:**
- Remove the MaterialsGrid component
- Hide MaterialsGrid from public users
- Remove the hero section or navigation

---

### 4. ProductManagement (`src/components/supplier/ProductManagement.tsx`)

**Purpose:** Supplier interface for setting prices on admin-uploaded products

**Key Features:**
- View admin-uploaded products
- Set/update prices for products
- Set stock availability (In Stock / Out of Stock)
- Request new products to be added by admin

**Supplier Capabilities:**
- ✅ View admin-uploaded products
- ✅ Set/update prices for products
- ✅ Set stock availability
- ✅ Request new products
- ❌ Upload product images (admin only)
- ❌ Delete products (admin only)

**DO NOT:**
- Add image upload for suppliers
- Allow suppliers to delete admin products
- Remove the "Request New Product" functionality

---

## Database Tables

### `admin_material_images`
```sql
- id: UUID (primary key)
- name: VARCHAR(255)
- category: VARCHAR(100)
- image_url: TEXT (base64 data URL)
- is_featured: BOOLEAN
- is_approved: BOOLEAN
- created_at: TIMESTAMP
```

### `supplier_product_prices`
```sql
- id: UUID (primary key)
- supplier_id: UUID
- product_id: UUID (references admin_material_images)
- price: DECIMAL(12,2)
- in_stock: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(supplier_id, product_id)
```

### `product_requests`
```sql
- id: UUID (primary key)
- supplier_id: UUID
- product_name: VARCHAR(255)
- category: VARCHAR(100)
- description: TEXT
- suggested_price: DECIMAL(12,2)
- image_data: TEXT (base64)
- status: VARCHAR(20) -- pending, approved, rejected
- admin_notes: TEXT
- reviewed_by: UUID
- reviewed_at: TIMESTAMP
- created_at: TIMESTAMP
```

### `approved_material_images`
```sql
- id: UUID (primary key)
- material_id: UUID
- image_url: TEXT
- is_approved: BOOLEAN
- approved_by: UUID
- approved_at: TIMESTAMP
```

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────┐ │
│  │  Admin Upload   │────▶│ admin_material_     │────▶│ MaterialsGrid  │ │
│  │  (Dashboard)    │     │ images table        │     │ (Marketplace)  │ │
│  └─────────────────┘     └─────────────────────┘     └────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPPLIER WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────┐ │
│  │ Supplier Views  │────▶│ admin_material_     │     │ Sets Price &   │ │
│  │ Admin Products  │     │ images table        │────▶│ Stock Status   │ │
│  └─────────────────┘     └─────────────────────┘     └────────────────┘ │
│                                    │                         │           │
│                                    ▼                         ▼           │
│                          ┌─────────────────────┐                        │
│                          │ supplier_product_   │                        │
│                          │ prices table        │                        │
│                          └─────────────────────┘                        │
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────┐ │
│  │ Supplier Needs  │────▶│ product_requests    │────▶│ Admin Reviews  │ │
│  │ New Product     │     │ table               │     │ & Uploads      │ │
│  └─────────────────┘     └─────────────────────┘     └────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pages Where Images Appear

| Page | URL | Shows |
|------|-----|-------|
| Suppliers | `/suppliers` | All materials with images |
| Supplier Marketplace | `/supplier-marketplace` | All materials with images |

---

## Security

- Admin images require `is_approved = true` to display
- Supplier images stored in `materials.image_url`
- RLS policies control database access
- Base64 encoding bypasses storage RLS issues

---

## Maintenance Notes

1. **Adding new image formats:** Update the file input `accept` attribute
2. **Changing image display:** Modify `object-contain` class in MaterialsGrid
3. **Database changes:** Create new migration, don't modify existing tables

---

**⚠️ WARNING:** Any modifications to these components may break the material images system. Always test thoroughly before deploying changes.

