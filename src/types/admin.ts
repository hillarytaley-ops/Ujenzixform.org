/**
 * Admin Types
 * Comprehensive type definitions for admin functionality in MradiPro
 */

// Matches the app_role enum in Supabase: admin, builder, supplier, delivery_provider
export type AdminRole = 'admin';
export type AppRole = 'admin' | 'builder' | 'supplier' | 'delivery_provider';
export type ActionStatus = 'success' | 'failed' | 'pending';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: AdminRole;
  permissions: AdminPermission[];
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

export type AdminPermission = 
  | 'manage_users'
  | 'manage_suppliers'
  | 'manage_builders'
  | 'manage_deliveries'
  | 'manage_orders'
  | 'view_analytics'
  | 'manage_settings'
  | 'manage_content'
  | 'manage_staff'
  | 'view_logs'
  | 'manage_monitoring'
  | 'approve_registrations'
  | 'manage_payments'
  | 'export_data';

export interface AdminDashboardStats {
  // Registration stats
  total_suppliers: number;
  total_builders: number;
  total_delivery_providers: number;
  
  // Pending approvals
  pending_supplier_registrations: number;
  pending_builder_registrations: number;
  pending_delivery_registrations: number;
  
  // Activity stats
  total_orders: number;
  total_deliveries: number;
  active_deliveries: number;
  
  // Revenue stats
  total_revenue: number;
  monthly_revenue: number;
  
  // Recent activity
  recent_registrations: RecentRegistration[];
  recent_orders: RecentOrder[];
  recent_activities: AdminActivity[];
}

export interface RecentRegistration {
  id: string;
  type: 'supplier' | 'builder' | 'delivery_provider';
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  builder_name: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface AdminActivity {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  category: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface RegistrationRecord {
  id: string;
  type: 'supplier' | 'builder' | 'delivery_provider';
  name: string;
  email: string;
  phone: string;
  county?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  
  // Additional details
  business_name?: string;
  category?: string;
  documents?: string[];
  notes?: string;
}

export interface SupplierRegistrationRecord {
  id: string;
  auth_user_id?: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  county?: string;
  address?: string;
  business_registration?: string;
  material_categories?: string[];
  materials_offered?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface BuilderRegistrationRecord {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
  builder_category: 'professional' | 'private';
  builder_type?: 'individual' | 'company';
  company_name?: string;
  county?: string;
  license_number?: string;
  specializations?: string[];
  years_experience?: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface DeliveryProviderRegistrationRecord {
  id: string;
  auth_user_id?: string;
  provider_name: string;
  contact_person?: string;
  email: string;
  phone: string;
  provider_type: 'individual' | 'company';
  vehicle_type?: string;
  vehicle_registration?: string;
  county?: string;
  service_areas?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: 'user' | 'supplier' | 'builder' | 'delivery_provider' | 'order' | 'delivery' | 'system';
  target_id: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  reason?: string;
  status: ActionStatus;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description?: string;
  category: string;
  is_public: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_roles?: string[];
  target_users?: string[];
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  status: ActionStatus;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action_required: boolean;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface MonitoringRequest {
  id: string;
  builder_id: string;
  project_id: string;
  project_name: string;
  builder_name: string;
  builder_email: string;
  request_type: 'camera_installation' | 'drone_monitoring' | 'site_inspection';
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  requested_date?: string;
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  access_code?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminFilters {
  search?: string;
  status?: string;
  type?: string;
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_more: boolean;
}

export interface BulkAction {
  action: 'approve' | 'reject' | 'delete' | 'suspend' | 'activate';
  target_ids: string[];
  target_type: string;
  reason?: string;
}

export interface BulkActionResult {
  success_count: number;
  failure_count: number;
  errors: {
    id: string;
    error: string;
  }[];
}















