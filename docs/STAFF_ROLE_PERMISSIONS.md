# Staff Role-Based Permissions System

## Overview

UjenziXform's Admin Dashboard now supports **granular role-based access control** for staff members. Different staff roles have access to specific dashboard sections based on their job responsibilities.

## Available Staff Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Super Admin** | Complete system access | All tabs, can manage other admins |
| **Admin** | Full dashboard access | All tabs, can manage staff |
| **IT Helpdesk** | Technical support | Pages, Security, Activity Log, Settings, Chat |
| **Logistics Officer** | Delivery management | GPS, Delivery Apps, Delivery Requests, Analytics, Scanning |
| **Registrations Officer** | User verification | Registrations, Delivery Apps, Documents, Activity Log |
| **Finance Officer** | Financial oversight | Financial, Delivery Analytics, Activity Log |
| **Monitoring Officer** | Site surveillance | Monitoring, Monitoring Requests, GPS |
| **Customer Support** | User assistance | Feedback, Chat, Registrations, Delivery Requests |
| **Moderator** | Content review | Feedback, Documents |
| **Viewer** | Read-only access | Overview only |

## Dashboard Tab Access Matrix

| Tab | IT Help | Logistics | Registrations | Finance | Monitoring | Support | Moderator | Viewer |
|-----|---------|-----------|---------------|---------|------------|---------|-----------|--------|
| Overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Site Monitoring | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| GPS Tracking | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| App Pages | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Registrations | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Delivery Apps | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delivery Requests | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Monitoring Requests | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Feedback | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Documents | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Financial | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ML Insights | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Security | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Staff Management | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Activity Log | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| QR Scanning | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Live Chat | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Delivery Analytics | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note:** Super Admin and Admin roles have access to ALL tabs.

## Additional Permissions

Beyond tab access, roles have specific action permissions:

| Permission | Description | Who Has It |
|------------|-------------|------------|
| `canManageStaff` | Create/edit/delete staff accounts | Super Admin, Admin |
| `canExportData` | Export data to CSV/PDF | Super Admin, Admin, IT, Logistics, Registrations, Finance |
| `canDeleteRecords` | Delete user content/records | Super Admin, Admin, Moderator |
| `canApproveRegistrations` | Approve/reject registrations | Super Admin, Admin, Logistics, Registrations, Monitoring |
| `canAccessSensitiveData` | View PII, financial data | Super Admin, Admin, Registrations, Finance |

## Implementation Files

| File | Purpose |
|------|---------|
| `src/config/staffPermissions.ts` | Role definitions and tab permissions |
| `src/hooks/useStaffPermissions.ts` | Hook to check current staff permissions |
| `src/components/admin/PermissionGate.tsx` | Component to wrap restricted content |
| `src/components/admin/StaffManagement.tsx` | Staff CRUD operations |

## How to Use

### 1. Check Permissions in Components

```typescript
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

function MyAdminComponent() {
  const { 
    canAccessTab, 
    canExportData,
    accessibleTabs,
    staffRole,
    isAdmin 
  } = useStaffPermissions();

  // Check tab access
  if (!canAccessTab('financial')) {
    return <AccessDenied />;
  }

  // Conditionally show features
  return (
    <div>
      {canExportData && <ExportButton />}
      {/* ... */}
    </div>
  );
}
```

### 2. Wrap Content with PermissionGate

```typescript
import { PermissionGate } from '@/components/admin/PermissionGate';

function AdminDashboard() {
  const { staffRole, accessibleTabs, isAdmin } = useStaffPermissions();

  return (
    <PermissionGate 
      requiredTab="financial" 
      staffRole={staffRole}
      accessibleTabs={accessibleTabs}
      isAdmin={isAdmin}
    >
      <FinancialReports />
    </PermissionGate>
  );
}
```

### 3. Filter Visible Tabs

```typescript
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

function AdminTabs() {
  const { accessibleTabs } = useStaffPermissions();

  return (
    <TabsList>
      {accessibleTabs.map(tab => (
        <TabsTrigger key={tab} value={tab}>
          {tab}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
```

## Database Schema

```sql
-- admin_staff table
CREATE TABLE admin_staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  created_by TEXT
);

-- Valid roles (enforced at application level)
-- super_admin, admin, it_helpdesk, logistics_officer, registrations_officer,
-- finance_officer, monitoring_officer, customer_support, moderator, viewer
```

## Creating a New Staff Member

1. Go to Admin Dashboard → Staff Management tab
2. Click "Add Staff Member"
3. Fill in:
   - Full Name
   - Email Address
   - Phone (optional)
   - Select Role from dropdown
   - Generate or enter password
4. Click "Create Account"
5. Share the generated password with the staff member securely

## Changing Staff Permissions

1. Go to Staff Management tab
2. Find the staff member in the list
3. Use the Status dropdown to:
   - **Active**: Full access based on role
   - **Inactive**: Cannot log in, data preserved
   - **Suspended**: Cannot log in, flagged for review
4. To change roles, delete and recreate the account (or implement role editing)

## Security Notes

- Staff roles are stored in the `admin_staff` database table
- Permissions are checked both client-side (for UI) and should be enforced server-side (RLS)
- Admin session uses localStorage with 24-hour expiry
- Always verify permissions on sensitive operations

---

**Last Updated:** December 2025









