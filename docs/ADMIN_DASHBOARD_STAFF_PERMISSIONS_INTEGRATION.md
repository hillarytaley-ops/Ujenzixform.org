# Admin Dashboard Staff Permissions Integration

## Overview

The Admin Dashboard now enforces granular role-based access control for staff members. Each staff member can only see and access the tabs they are authorized to use based on their assigned role.

## How It Works

### 1. Staff Role Detection

When a staff member accesses the Admin Dashboard, the `useStaffPermissions` hook:

1. Fetches the staff member's role from the `admin_staff` table
2. Falls back to checking `user_roles` for legacy admin authentication
3. Returns the list of accessible tabs and permission flags

### 2. Tab Visibility

Tabs are dynamically shown/hidden based on permissions:

```tsx
{canAccessTab('monitoring') && (
  <TabsTrigger value="monitoring">
    <Eye className="h-4 w-4 mr-2" />
    Cameras
  </TabsTrigger>
)}
```

### 3. Content Protection

Each tab's content is wrapped with `PermissionGate`:

```tsx
<TabsContent value="monitoring">
  <PermissionGate
    requiredTab="monitoring"
    staffRole={staffRole}
    accessibleTabs={accessibleTabs}
    isAdmin={isAdmin}
    onNavigateBack={() => setActiveTab('overview')}
  >
    <MonitoringTab />
  </PermissionGate>
</TabsContent>
```

### 4. Auto-Tab Switching

If a staff member's active tab becomes inaccessible (e.g., deep link or bookmark), the dashboard automatically switches to their first accessible tab:

```tsx
useEffect(() => {
  if (!permissionsLoading && accessibleTabs.length > 0) {
    if (!accessibleTabs.includes(activeTab) && !isAdmin) {
      setActiveTab(accessibleTabs[0]);
    }
  }
}, [permissionsLoading, accessibleTabs, activeTab, isAdmin]);
```

## Staff Role Badge

Non-admin staff see a badge showing their current role and accessible tab count:

```
🛡️ Logged in as: Logistics Officer  |  6 tabs accessible
```

## Staff Roles and Their Access

| Role | Tabs Accessible |
|------|-----------------|
| Super Admin / Admin | ALL TABS |
| IT Helpdesk | Overview, Pages, Security, Activity Log, Settings, Chat |
| Logistics Officer | Overview, GPS, Delivery Apps, Delivery Requests, Delivery Analytics, Scanning |
| Registrations Officer | Overview, Registrations, Delivery Apps, Documents, Activity Log |
| Finance Officer | Overview, Financial, Delivery Analytics, Activity Log |
| Monitoring Officer | Overview, Monitoring, Monitoring Requests, GPS |
| Customer Support | Overview, Feedback, Chat, Registrations, Delivery Requests |
| Content Moderator | Overview, Feedback, Documents |
| Viewer | Overview only |

## Permission-Aware UI Elements

Some UI elements are disabled based on permissions:

```tsx
<Button disabled={!canExportData}>
  Export Data {!canExportData && '(No Permission)'}
</Button>
```

## Files Modified

- `src/pages/AdminDashboard.tsx` - Main integration
- `src/config/staffPermissions.ts` - Role definitions
- `src/hooks/useStaffPermissions.ts` - Permissions hook
- `src/components/admin/PermissionGate.tsx` - Access gate component

## Testing

1. Login as a staff member with a specific role (e.g., `logistics_officer`)
2. Verify only their allowed tabs are visible
3. Try manually navigating to a restricted tab via URL
4. Verify the PermissionGate blocks access with a friendly message
5. Verify the "Go Back to Overview" button works

## Security Notes

- Admins and Super Admins always have full access
- Permission checks happen both on tab visibility AND content rendering
- The database `admin_staff` table is the source of truth for staff roles









