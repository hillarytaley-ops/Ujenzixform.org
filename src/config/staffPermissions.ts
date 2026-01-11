/**
 * ============================================================================
 * Staff Role-Based Permissions Configuration
 * ============================================================================
 * 
 * This configuration defines which dashboard tabs each staff role can access.
 * 
 * ROLES:
 * - super_admin: Full access to everything
 * - admin: Full access to everything
 * - it_helpdesk: Technical support, user issues, system health
 * - logistics_officer: Delivery management, GPS tracking, routes
 * - registrations_officer: User registrations, document verification
 * - finance_officer: Financial reports, payments, billing
 * - monitoring_officer: Camera monitoring, site surveillance
 * - customer_support: Feedback, chat, user queries
 * - moderator: Content moderation, feedback review
 * - viewer: Read-only access to overview
 * 
 * @author MradiPro Team
 * @version 1.0.0
 * @lastModified December 2025
 */

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  color: string;
  allowedTabs: string[];
  canManageStaff: boolean;
  canExportData: boolean;
  canDeleteRecords: boolean;
  canApproveRegistrations: boolean;
  canAccessSensitiveData: boolean;
}

// All available dashboard tabs
export const ALL_ADMIN_TABS = [
  'overview',
  'monitoring',
  'gps',
  'pages',
  'registrations',
  'delivery-apps',
  'delivery-requests',
  'monitoring-requests',
  'feedback',
  'documents',
  'financial',
  'ml',
  'security',
  'staff',
  'activity-log',
  'scanning',
  'communications',
  'delivery-analytics',
  'settings'
] as const;

export type AdminTab = typeof ALL_ADMIN_TABS[number];

// Staff roles with their permissions
export const STAFF_ROLES: Record<string, StaffRole> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Complete system access with all permissions',
    color: 'bg-red-600',
    allowedTabs: [...ALL_ADMIN_TABS],
    canManageStaff: true,
    canExportData: true,
    canDeleteRecords: true,
    canApproveRegistrations: true,
    canAccessSensitiveData: true
  },
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all dashboard features',
    color: 'bg-purple-600',
    allowedTabs: [...ALL_ADMIN_TABS],
    canManageStaff: true,
    canExportData: true,
    canDeleteRecords: true,
    canApproveRegistrations: true,
    canAccessSensitiveData: true
  },
  it_helpdesk: {
    id: 'it_helpdesk',
    name: 'IT Helpdesk',
    description: 'Technical support and system monitoring',
    color: 'bg-blue-600',
    allowedTabs: [
      'overview',
      'pages',
      'security',
      'activity-log',
      'settings',
      'communications',
      'material-images'
    ],
    canManageStaff: false,
    canExportData: true,
    canDeleteRecords: false,
    canApproveRegistrations: false,
    canAccessSensitiveData: false
  },
  logistics_officer: {
    id: 'logistics_officer',
    name: 'Logistics Officer',
    description: 'Delivery management and route optimization',
    color: 'bg-green-600',
    allowedTabs: [
      'overview',
      'gps',
      'delivery-apps',
      'delivery-requests',
      'delivery-analytics',
      'scanning'
    ],
    canManageStaff: false,
    canExportData: true,
    canDeleteRecords: false,
    canApproveRegistrations: true, // Can approve delivery provider applications
    canAccessSensitiveData: false
  },
  registrations_officer: {
    id: 'registrations_officer',
    name: 'Registrations Officer',
    description: 'User registrations and document verification',
    color: 'bg-orange-600',
    allowedTabs: [
      'overview',
      'registrations',
      'delivery-apps',
      'documents',
      'activity-log'
    ],
    canManageStaff: false,
    canExportData: true,
    canDeleteRecords: false,
    canApproveRegistrations: true,
    canAccessSensitiveData: true // Can see user documents
  },
  finance_officer: {
    id: 'finance_officer',
    name: 'Finance Officer',
    description: 'Financial reports, payments, and billing',
    color: 'bg-emerald-600',
    allowedTabs: [
      'overview',
      'financial',
      'delivery-analytics',
      'activity-log'
    ],
    canManageStaff: false,
    canExportData: true,
    canDeleteRecords: false,
    canApproveRegistrations: false,
    canAccessSensitiveData: true // Can see financial data
  },
  monitoring_officer: {
    id: 'monitoring_officer',
    name: 'Monitoring Officer',
    description: 'Camera surveillance and site monitoring',
    color: 'bg-red-600',
    allowedTabs: [
      'overview',
      'monitoring',
      'monitoring-requests',
      'gps'
    ],
    canManageStaff: false,
    canExportData: false,
    canDeleteRecords: false,
    canApproveRegistrations: true, // Can approve monitoring requests
    canAccessSensitiveData: false
  },
  customer_support: {
    id: 'customer_support',
    name: 'Customer Support',
    description: 'User queries, feedback, and chat support',
    color: 'bg-teal-600',
    allowedTabs: [
      'overview',
      'feedback',
      'communications',
      'registrations',
      'delivery-requests'
    ],
    canManageStaff: false,
    canExportData: false,
    canDeleteRecords: false,
    canApproveRegistrations: false,
    canAccessSensitiveData: false
  },
  moderator: {
    id: 'moderator',
    name: 'Content Moderator',
    description: 'Review and moderate user content',
    color: 'bg-indigo-600',
    allowedTabs: [
      'overview',
      'feedback',
      'documents'
    ],
    canManageStaff: false,
    canExportData: false,
    canDeleteRecords: true, // Can remove inappropriate content
    canApproveRegistrations: false,
    canAccessSensitiveData: false
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboard overview',
    color: 'bg-gray-600',
    allowedTabs: [
      'overview'
    ],
    canManageStaff: false,
    canExportData: false,
    canDeleteRecords: false,
    canApproveRegistrations: false,
    canAccessSensitiveData: false
  }
};

// Tab metadata for display
export const TAB_METADATA: Record<AdminTab, { name: string; icon: string; description: string; category: string }> = {
  'overview': {
    name: 'Overview',
    icon: 'LayoutDashboard',
    description: 'Dashboard statistics and summary',
    category: 'General'
  },
  'monitoring': {
    name: 'Site Monitoring',
    icon: 'Camera',
    description: 'Live camera feeds and surveillance',
    category: 'Monitoring'
  },
  'gps': {
    name: 'GPS Tracking',
    icon: 'MapPin',
    description: 'Real-time delivery location tracking',
    category: 'Logistics'
  },
  'pages': {
    name: 'App Pages',
    icon: 'Globe',
    description: 'Application pages and routes',
    category: 'System'
  },
  'registrations': {
    name: 'Registrations',
    icon: 'UserPlus',
    description: 'User registration requests',
    category: 'Users'
  },
  'delivery-apps': {
    name: 'Delivery Applications',
    icon: 'Truck',
    description: 'Delivery provider applications',
    category: 'Logistics'
  },
  'delivery-requests': {
    name: 'Delivery Requests',
    icon: 'Package',
    description: 'Material delivery requests',
    category: 'Logistics'
  },
  'monitoring-requests': {
    name: 'Monitoring Requests',
    icon: 'Eye',
    description: 'Site monitoring service requests',
    category: 'Monitoring'
  },
  'feedback': {
    name: 'User Feedback',
    icon: 'MessageSquare',
    description: 'Customer feedback and reviews',
    category: 'Support'
  },
  'documents': {
    name: 'Documents',
    icon: 'FileText',
    description: 'User documents and verification',
    category: 'Users'
  },
  'financial': {
    name: 'Financial',
    icon: 'DollarSign',
    description: 'Financial reports and transactions',
    category: 'Finance'
  },
  'ml': {
    name: 'ML Insights',
    icon: 'Brain',
    description: 'Machine learning analytics',
    category: 'Analytics'
  },
  'security': {
    name: 'Security',
    icon: 'Shield',
    description: 'Security settings and logs',
    category: 'System'
  },
  'staff': {
    name: 'Staff Management',
    icon: 'Users',
    description: 'Admin staff accounts',
    category: 'Admin'
  },
  'activity-log': {
    name: 'Activity Log',
    icon: 'History',
    description: 'System activity history',
    category: 'System'
  },
  'scanning': {
    name: 'QR Scanning',
    icon: 'QrCode',
    description: 'QR code scan management',
    category: 'Operations'
  },
  'communications': {
    name: 'Live Chat',
    icon: 'MessageCircle',
    description: 'Customer support chat',
    category: 'Support'
  },
  'delivery-analytics': {
    name: 'Delivery Analytics',
    icon: 'BarChart',
    description: 'Delivery performance metrics',
    category: 'Analytics'
  },
  'settings': {
    name: 'Settings',
    icon: 'Settings',
    description: 'System configuration',
    category: 'System'
  }
};

// Helper functions
export function getStaffRole(roleId: string): StaffRole | null {
  return STAFF_ROLES[roleId] || null;
}

export function canAccessTab(roleId: string, tab: AdminTab): boolean {
  const role = getStaffRole(roleId);
  if (!role) return false;
  return role.allowedTabs.includes(tab);
}

export function getAccessibleTabs(roleId: string): AdminTab[] {
  const role = getStaffRole(roleId);
  if (!role) return [];
  return role.allowedTabs as AdminTab[];
}

export function hasPermission(roleId: string, permission: keyof Pick<StaffRole, 'canManageStaff' | 'canExportData' | 'canDeleteRecords' | 'canApproveRegistrations' | 'canAccessSensitiveData'>): boolean {
  const role = getStaffRole(roleId);
  if (!role) return false;
  return role[permission];
}

// Get all roles for dropdown selection
export function getAllStaffRoles(): StaffRole[] {
  return Object.values(STAFF_ROLES);
}

// Group tabs by category for better organization
export function getTabsByCategory(): Record<string, AdminTab[]> {
  const grouped: Record<string, AdminTab[]> = {};
  
  for (const [tab, meta] of Object.entries(TAB_METADATA)) {
    if (!grouped[meta.category]) {
      grouped[meta.category] = [];
    }
    grouped[meta.category].push(tab as AdminTab);
  }
  
  return grouped;
}









