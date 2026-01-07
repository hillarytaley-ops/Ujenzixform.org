# Role-Based Access Control (RBAC) Security Documentation

## ⚠️ CRITICAL SECURITY COMPONENT - DO NOT MODIFY WITHOUT REVIEW

Last Updated: December 2025

---

## Overview

MradiPro uses a **database-verified role-based access control** system to protect dashboard routes. This ensures that users can ONLY access dashboards that match their registered role.

## Valid Roles

| Role | Description | Dashboard Access |
|------|-------------|------------------|
| `admin` | System administrator | ALL dashboards |
| `supplier` | Material supplier | `/supplier-dashboard` |
| `builder` | Construction builder | `/builder-dashboard` |
| `delivery` | Delivery provider | `/delivery-dashboard` |

## Security Architecture

### Three Layers of Protection

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: Route Protection                     │
│                    (RoleProtectedRoute.tsx)                      │
│                                                                  │
│  • Wraps all dashboard routes in App.tsx                        │
│  • Queries DATABASE for user role (not localStorage!)           │
│  • Blocks access if no role or wrong role                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 2: Dashboard Self-Check                    │
│          (SupplierDashboard, BuilderDashboard, etc.)            │
│                                                                  │
│  • Each dashboard verifies role independently                   │
│  • Double-checks DATABASE on component mount                    │
│  • Shows blocking UI if role mismatch detected                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: Sign-In Enforcement                  │
│            (SupplierSignIn, BuilderSignIn, etc.)                │
│                                                                  │
│  • Role-specific sign-in pages                                  │
│  • Creates role in user_roles table on registration             │
│  • Blocks users with different roles from signing in            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Security Principles

### 1. DATABASE IS THE SOURCE OF TRUTH

```typescript
// ❌ WRONG - Never trust localStorage alone
const role = localStorage.getItem('user_role');
if (role === 'supplier') { /* allow */ }

// ✅ CORRECT - Always verify with database
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .maybeSingle();

if (data?.role === 'supplier') { /* allow */ }
```

### 2. DEFAULT TO DENY

```typescript
// ❌ WRONG - Defaulting to allow
const [accessGranted, setAccessGranted] = useState(true);

// ✅ CORRECT - Default to deny, explicitly grant
const [status, setStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
// Only set to 'granted' after DATABASE verification
```

### 3. CLEAR FAKE LOCALSTORAGE

```typescript
// When database role is null, clear any fake localStorage values
if (!dbRole) {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_role_id');
  setStatus('no-role');
}
```

## Files Involved

| File | Purpose |
|------|---------|
| `src/utils/roleVerification.ts` | **Core security utility** - centralized role verification |
| `src/components/security/RoleProtectedRoute.tsx` | Main route protection component |
| `src/pages/SupplierDashboard.tsx` | Supplier dashboard with self-check |
| `src/pages/BuilderDashboard.tsx` | Builder dashboard with self-check |
| `src/pages/DeliveryDashboard.tsx` | Delivery dashboard with self-check |
| `src/pages/SupplierSignIn.tsx` | Supplier registration/sign-in |
| `src/pages/BuilderSignIn.tsx` | Builder registration/sign-in |
| `src/pages/DeliverySignIn.tsx` | Delivery registration/sign-in |
| `src/pages/SupplierMarketplace.tsx` | Builder-only marketplace (blocks non-builders) |
| `src/pages/Scanners.tsx` | QR Scanner page (supplier/delivery only) |
| `src/pages/Monitoring.tsx` | Monitoring page (builder with approval/admin) |
| `src/components/suppliers/MaterialsGrid.tsx` | Purchase/quote functionality (builder-only) |
| `src/App.tsx` | Route definitions with RoleProtectedRoute |

## Using the Role Verification Utility

```typescript
import { verifyUserRole, hasAllowedRole, isBuilder } from '@/utils/roleVerification';

// Verify user's role from database
const result = await verifyUserRole();
if (!result.hasRole) {
  // User has no role - block access
}

// Check if user has one of the allowed roles
const canAccess = await hasAllowedRole(['supplier', 'admin']);

// Check specific role
const isUserBuilder = await isBuilder();
```

## Additional Protected Features

### Supplier Marketplace (`/supplier-marketplace`)
- **Allowed:** Builders only (`builder`, `professional_builder`, `private_client`)
- **Blocked:** Suppliers, Delivery Providers, Users without roles
- Shows "Registration Required" for users without a role

### MaterialsGrid Purchase Functions
- **Request Quote:** Builder roles only
- **Buy Now:** Builder roles only
- **Suppliers/Delivery:** Shows error toast and blocks action
- **No Role:** Redirects to `/builder-signin`

### Scanners Page (`/scanners`)
- **Allowed:** Suppliers (dispatch), Delivery Providers (receiving), Admin
- **Blocked:** Builders, Users without roles
- **No Role:** Shows "Registration Required" with links to register

### Monitoring Page (`/monitoring`)
- **Allowed:** Admin (full access), Builders (with approved request only)
- **Blocked:** Suppliers, Delivery Providers, Users without roles
- **No Role:** Shows "Registration Required" with links to register
- **Builders without approval:** Shows "Access Required" with request form

## Database Schema

```sql
-- user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'supplier', 'builder', 'delivery')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS Policy: Users can only read their own role
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
```

## Testing Checklist

Before deploying any changes to RBAC:

### Dashboard Access
- [ ] User with NO role cannot access ANY dashboard
- [ ] Supplier can ONLY access `/supplier-dashboard`
- [ ] Builder can ONLY access `/builder-dashboard`
- [ ] Delivery can ONLY access `/delivery-dashboard`
- [ ] Admin can access ALL dashboards

### Marketplace Access
- [ ] User with NO role sees "Registration Required" on `/supplier-marketplace`
- [ ] Supplier is blocked from `/supplier-marketplace`
- [ ] Delivery provider is blocked from `/supplier-marketplace`
- [ ] Builder can access `/supplier-marketplace`

### Purchase Functions (MaterialsGrid)
- [ ] User with NO role clicking "Request Quote" redirects to `/builder-signin`
- [ ] Supplier clicking "Request Quote" sees error toast
- [ ] Delivery clicking "Buy Now" sees error toast
- [ ] Builder can request quotes and buy materials

### Scanners Page Access
- [ ] User with NO role sees "Registration Required" on `/scanners`
- [ ] Builder is blocked and redirected to `/tracking`
- [ ] Supplier can access dispatch scanner
- [ ] Delivery provider can access receiving scanner

### Monitoring Page Access
- [ ] User with NO role sees "Registration Required" on `/monitoring`
- [ ] Builder without approval sees "Access Required" with request form
- [ ] Builder with approved request can view cameras
- [ ] Admin has full access to all monitoring features

### Security
- [ ] Fake localStorage role is ignored (database is checked)
- [ ] Signing out clears all role data from localStorage
- [ ] Database is ALWAYS queried - localStorage alone is never trusted

## Common Issues & Solutions

### Issue: User can access wrong dashboard
**Solution:** Verify that `RoleProtectedRoute` is querying the DATABASE, not just localStorage.

### Issue: User stuck on loading screen
**Solution:** Check if the `user_roles` table has RLS policies that might block the query.

### Issue: Role not being set on registration
**Solution:** Check that the sign-in page is inserting into `user_roles` table.

## Emergency Contacts

If you discover a security vulnerability in the RBAC system:
1. Do NOT commit any changes
2. Document the vulnerability
3. Contact the security team immediately

---

**Remember: Security is everyone's responsibility. When in doubt, DENY access.**









