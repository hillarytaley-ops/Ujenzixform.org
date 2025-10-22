export interface Supplier {
  id: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialties: string[];
  materials_offered: string[];
  rating: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
  company_logo_url?: string;
  // Contact access control fields
  contact_info_status?: string;
  can_view_contact?: boolean;
  contact_access_level?: string;
  has_business_relationship?: boolean;
  business_verified?: boolean;
  
  // Review aggregation fields
  total_reviews?: number;
  average_rating?: number;
  recommendation_rate?: number;
  
  // Business performance fields
  delivery_performance?: number;
  order_accuracy_rate?: number;
  response_time_hours?: number;
  business_registration?: string;
  business_type?: 'Manufacturer' | 'Distributor' | 'Retailer' | 'Supplier' | 'Wholesaler';
  years_in_business?: number;
  employee_count?: number;
  
  // Geographic and operational fields
  latitude?: number;
  longitude?: number;
  delivery_radius_km?: number;
  county?: string;
  postal_code?: string;
  business_hours?: BusinessHours;
  operational_status?: 'Active' | 'Temporarily Closed' | 'Seasonal' | 'Inactive';
  website_url?: string;
  social_media?: SocialMediaLinks;
  languages_supported?: string[];
  
  // Advanced business features
  certifications?: string[];
  payment_terms?: 'Cash on Delivery' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 60' | 'Advance Payment' | 'Custom';
  minimum_order_value?: number;
  maximum_order_value?: number;
  lead_time_days?: number;
  bulk_discount_available?: boolean;
  credit_terms_available?: boolean;
  insurance_coverage?: boolean;
  quality_certifications?: string[];
  services_offered?: string[];
  delivery_methods?: string[];
  payment_methods?: string[];
  warranty_offered?: boolean;
  warranty_period_months?: number;
  return_policy?: string;
  customer_support_hours?: string;
  monthly_capacity_tons?: number;
  storage_capacity_m3?: number;
  fleet_size?: number;
  established_year?: number;
  annual_revenue_range?: 'Under 1M' | '1M-5M' | '5M-10M' | '10M-50M' | '50M-100M' | 'Over 100M';
}

export interface Material {
  id: string;
  name: string;
  category: string;
  supplier: Supplier;
  price?: number;
  unit?: string;
  description?: string;
  image_url?: string;
  rating?: number;
  in_stock?: boolean;
}

export interface SupplierFilters {
  search: string;
  category: string;
  location: string;
  rating: number;
  verified: boolean | null;
}

export interface MaterialFilters {
  search: string;
  category: string;
  priceRange: [number, number];
  inStock: boolean | null;
}

export const MATERIAL_CATEGORIES = [
  "All Categories",
  "Cement",
  "Steel", 
  "Tiles",
  "Aggregates",
  "Roofing",
  "Paint",
  "Timber",
  "Hardware",
  "Plumbing",
  "Electrical"
] as const;

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface SocialMediaLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
}

export interface SupplierReview {
  id: string;
  supplier_id: string;
  reviewer_id: string;
  rating: number;
  product_quality_rating?: number;
  delivery_rating?: number;
  customer_service_rating?: number;
  value_for_money_rating?: number;
  order_accuracy_rating?: number;
  communication_rating?: number;
  comment: string;
  product_category?: string;
  order_value?: string;
  delivery_time?: string;
  verified_purchase?: boolean;
  would_recommend?: boolean;
  helpful_votes?: number;
  created_at: string;
  reviewer_name?: string;
  reviewer_company?: string;
}

export interface SupplierRatingStats {
  total_reviews: number;
  average_rating: number;
  recommendation_rate: number;
  rating_distribution: {
    [key: number]: number;
  };
  detailed_ratings: {
    product_quality: number;
    delivery: number;
    customer_service: number;
    value_for_money: number;
    order_accuracy: number;
    communication: number;
  };
}

export interface SupplierCapabilities {
  id: string;
  company_name: string;
  business_type?: string;
  certifications?: string[];
  services_offered?: string[];
  delivery_methods?: string[];
  payment_methods?: string[];
  payment_terms?: string;
  minimum_order_value?: number;
  lead_time_days?: number;
  delivery_radius_km?: number;
  warranty_offered?: boolean;
  warranty_period_months?: number;
  bulk_discount_available?: boolean;
  credit_terms_available?: boolean;
  insurance_coverage?: boolean;
}