/**
 * Builder Types
 * Comprehensive type definitions for builders in MradiPro
 */

export type BuilderCategory = 'professional' | 'private';
export type BuilderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Builder {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
  
  // Builder classification
  builder_category: BuilderCategory;
  builder_type?: 'individual' | 'company';
  company_name?: string;
  business_registration?: string;
  
  // Location
  county?: string;
  sub_county?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  
  // Professional details (for professional builders)
  license_number?: string;
  specializations?: string[];
  years_experience?: number;
  portfolio_url?: string;
  certifications?: string[];
  
  // Status
  status: BuilderStatus;
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  
  // Metadata
  created_at: string;
  updated_at?: string;
  notes?: string;
}

export interface BuilderRegistration {
  id: string;
  auth_user_id?: string;
  
  // Personal information
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
  
  // Builder type
  builder_category: BuilderCategory;
  builder_type?: 'individual' | 'company';
  company_name?: string;
  business_registration?: string;
  
  // Location details
  county?: string;
  sub_county?: string;
  location?: string;
  address?: string;
  
  // Professional details
  license_number?: string;
  specializations?: string[];
  years_experience?: number;
  qualifications?: string[];
  nca_registration?: string;
  
  // Project information
  current_projects?: string;
  project_types?: string[];
  typical_project_size?: string;
  
  // Status
  status: BuilderStatus;
  rejection_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface BuilderProject {
  id: string;
  builder_id: string;
  project_name: string;
  project_type: string;
  description?: string;
  
  // Location
  location: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  
  // Timeline
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  
  // Status
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress_percentage?: number;
  
  // Budget
  estimated_budget?: number;
  actual_cost?: number;
  currency?: string;
  
  // Monitoring
  monitoring_enabled?: boolean;
  camera_access_code?: string;
  
  // Metadata
  created_at: string;
  updated_at?: string;
  notes?: string;
}

export interface BuilderOrder {
  id: string;
  builder_id: string;
  project_id?: string;
  supplier_id: string;
  
  // Order details
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  currency: string;
  
  // Status
  status: 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  
  // Delivery
  delivery_address: string;
  delivery_date?: string;
  delivery_notes?: string;
  
  // Payment
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  payment_method?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  confirmed_at?: string;
  delivered_at?: string;
}

export interface OrderItem {
  id: string;
  material_id?: string;
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface BuilderQuote {
  id: string;
  builder_id: string;
  supplier_id: string;
  project_id?: string;
  
  // Quote details
  quote_number: string;
  items: QuoteItem[];
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  currency: string;
  
  // Validity
  valid_until: string;
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'converted';
  
  // Notes
  notes?: string;
  terms_conditions?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  accepted_at?: string;
}

export interface QuoteItem {
  id: string;
  material_id?: string;
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  availability?: 'in_stock' | 'limited' | 'out_of_stock' | 'on_order';
  lead_time_days?: number;
}

export interface BuilderDashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_orders: number;
  pending_orders: number;
  total_spent: number;
  pending_deliveries: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'delivery' | 'quote' | 'project' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  link?: string;
}

export interface BuilderFilters {
  search?: string;
  status?: BuilderStatus;
  category?: BuilderCategory;
  county?: string;
  verified?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Video/Gallery types for builders
export interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  views_count?: number;
  likes_count?: number;
  is_featured?: boolean;
  is_public?: boolean;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface BuilderGalleryImage {
  id: string;
  builder_id: string;
  project_id?: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  category?: string;
  is_featured?: boolean;
  is_public?: boolean;
  display_order?: number;
  created_at: string;
}















