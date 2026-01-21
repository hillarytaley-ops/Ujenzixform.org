# UjenziXform API Documentation

## Overview

UjenziXform uses **Supabase** as its backend, providing a PostgreSQL database with Row Level Security (RLS), real-time subscriptions, and authentication.

**Base URL:** `https://wuuyjjpgzgeimiptuuws.supabase.co`

---

## Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe',
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

## User Roles

MradiPro supports the following user roles:

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `supplier` | Material suppliers |
| `professional_builder` | Professional construction companies |
| `private_client` | Individual home builders |
| `delivery_provider` | Delivery service providers |
| `delivery` | Delivery drivers |

### Get User Role
```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();
```

---

## Materials API

### List Materials
```typescript
const { data, error } = await supabase
  .from('materials')
  .select('*')
  .eq('is_approved', true)
  .order('created_at', { ascending: false });
```

### Get Material by ID
```typescript
const { data, error } = await supabase
  .from('materials')
  .select('*, supplier:suppliers(*)')
  .eq('id', materialId)
  .single();
```

### Search Materials
```typescript
const { data, error } = await supabase
  .from('materials')
  .select('*')
  .ilike('name', `%${searchTerm}%`)
  .eq('is_approved', true);
```

### Filter by Category
```typescript
const { data, error } = await supabase
  .from('materials')
  .select('*')
  .eq('category', 'Cement')
  .eq('is_approved', true);
```

---

## Suppliers API

### List Suppliers
```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select('*')
  .eq('status', 'approved')
  .order('company_name');
```

### Get Supplier by ID
```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select('*, materials(*)')
  .eq('id', supplierId)
  .single();
```

### Get Supplier Products
```typescript
const { data, error } = await supabase
  .from('materials')
  .select('*')
  .eq('supplier_id', supplierId)
  .eq('is_approved', true);
```

---

## Purchase Orders API

### Create Purchase Order
```typescript
const { data, error } = await supabase
  .from('purchase_orders')
  .insert({
    po_number: `PO-${Date.now()}`,
    buyer_id: userId,
    supplier_id: supplierId,
    items: [
      { material_id: 'xxx', quantity: 10, unit_price: 500 }
    ],
    total_amount: 5000,
    delivery_address: 'Nairobi, Kenya',
    delivery_date: '2026-02-01',
    status: 'pending'
  })
  .select()
  .single();
```

### Get User's Orders
```typescript
const { data, error } = await supabase
  .from('purchase_orders')
  .select('*, supplier:suppliers(company_name)')
  .eq('buyer_id', userId)
  .order('created_at', { ascending: false });
```

### Update Order Status
```typescript
const { error } = await supabase
  .from('purchase_orders')
  .update({ status: 'confirmed' })
  .eq('id', orderId);
```

**Order Status Flow:**
1. `pending` → Initial state
2. `quoted` → Supplier has provided pricing
3. `confirmed` → Buyer accepted quote
4. `rejected` → Buyer rejected quote
5. `delivered` → Order delivered
6. `cancelled` → Order cancelled

---

## Quotation Requests API (Professional Builders)

### Create Quote Request
```typescript
const { data, error } = await supabase
  .from('quotation_requests')
  .insert({
    requester_id: userId,
    supplier_id: supplierId,
    material_name: 'Portland Cement 50kg',
    quantity: 100,
    unit: 'bag',
    delivery_address: 'Nairobi, Kenya',
    project_description: 'Residential building project',
    status: 'pending'
  })
  .select()
  .single();
```

### Get Quote Requests
```typescript
const { data, error } = await supabase
  .from('quotation_requests')
  .select('*, supplier:suppliers(company_name)')
  .eq('requester_id', userId)
  .order('created_at', { ascending: false });
```

### Supplier Responds to Quote
```typescript
const { error } = await supabase
  .from('quotation_requests')
  .update({
    quote_amount: 50000,
    supplier_notes: 'Price valid for 7 days',
    status: 'quoted'
  })
  .eq('id', quoteId);
```

---

## Delivery Orders API

### Create Delivery Order
```typescript
const { data, error } = await supabase
  .from('delivery_orders')
  .insert({
    order_number: `DO-${Date.now()}`,
    builder_id: builderId,
    supplier_id: supplierId,
    pickup_address: 'Supplier warehouse address',
    delivery_address: 'Construction site address',
    materials: [
      { name: 'Cement', quantity: 50, unit: 'bags' }
    ],
    total_items: 50,
    status: 'pending'
  })
  .select()
  .single();
```

### Track Delivery
```typescript
const { data, error } = await supabase
  .from('delivery_orders')
  .select('*, delivery_provider:delivery_providers(*)')
  .eq('id', deliveryId)
  .single();
```

---

## Real-time Subscriptions

### Subscribe to Order Updates
```typescript
const subscription = supabase
  .channel('order-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'purchase_orders',
      filter: `buyer_id=eq.${userId}`
    },
    (payload) => {
      console.log('Order updated:', payload);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Subscribe to Chat Messages
```typescript
const subscription = supabase
  .channel('chat-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

---

## File Storage

### Upload Material Image
```typescript
const { data, error } = await supabase.storage
  .from('materials')
  .upload(`${userId}/${Date.now()}.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: false
  });
```

### Get Public URL
```typescript
const { data } = supabase.storage
  .from('materials')
  .getPublicUrl('path/to/image.jpg');

const imageUrl = data.publicUrl;
```

### Delete File
```typescript
const { error } = await supabase.storage
  .from('materials')
  .remove(['path/to/image.jpg']);
```

---

## Error Handling

All Supabase operations return `{ data, error }`. Always check for errors:

```typescript
const { data, error } = await supabase.from('materials').select('*');

if (error) {
  console.error('Error:', error.message);
  // Handle error appropriately
  return;
}

// Use data safely
console.log('Materials:', data);
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `PGRST301` | JWT expired |
| `23505` | Unique constraint violation |
| `23503` | Foreign key violation |
| `42501` | Insufficient privileges |
| `PGRST204` | Column not found |

---

## Rate Limiting

The API has rate limiting enabled:
- **Anonymous:** 100 requests/minute
- **Authenticated:** 1000 requests/minute

---

## Webhooks (Coming Soon)

Webhooks will be available for:
- Order status changes
- New quote requests
- Delivery updates
- Payment confirmations

---

## Support

For API support, contact:
- Email: support@ujenzixform.com
- Live Chat: Available in-app

