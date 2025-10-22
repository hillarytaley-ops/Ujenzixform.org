// Comprehensive delivery system types
export interface DeliveryProvider {
  id: string;
  user_id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  business_registration?: string;
  phone: string;
  email?: string;
  address?: string;
  
  // Vehicle information
  vehicle_type?: 'motorcycle' | 'van' | 'pickup' | 'truck' | 'trailer';
  vehicle_registration?: string;
  vehicle_capacity_kg?: number;
  vehicle_capacity_m3?: number;
  
  // Service area
  service_counties?: string[];
  max_delivery_radius_km?: number;
  base_location_lat?: number;
  base_location_lng?: number;
  
  // Performance metrics
  rating?: number;
  total_deliveries?: number;
  completed_deliveries?: number;
  on_time_delivery_rate?: number;
  average_delivery_time_hours?: number;
  customer_satisfaction?: number;
  
  // Business details
  is_verified?: boolean;
  is_active?: boolean;
  availability_status?: 'available' | 'busy' | 'offline' | 'suspended';
  pricing_per_km?: number;
  pricing_per_kg?: number;
  minimum_charge?: number;
  
  // Operational details
  operating_hours?: OperatingHours;
  emergency_available?: boolean;
  insurance_coverage?: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  tracking_number: string;
  
  // Order information
  order_id?: string;
  builder_id?: string;
  supplier_id?: string;
  provider_id?: string;
  
  // Material details
  material_type: string;
  material_description?: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  volume_m3?: number;
  
  // Location details
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  distance_km?: number;
  
  // Contact information
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  
  // Scheduling
  requested_date?: string;
  requested_time_start?: string;
  requested_time_end?: string;
  scheduled_pickup_time?: string;
  scheduled_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  
  // Status and progress
  status: 'pending' | 'confirmed' | 'dispatched' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  
  // Pricing
  estimated_cost?: number;
  final_cost?: number;
  currency?: string;
  cost_breakdown?: CostBreakdown;
  
  // Priority and urgency
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  urgency_multiplier?: number;
  
  // Special instructions and notes
  special_instructions?: string;
  delivery_notes?: string;
  internal_notes?: string;
  
  // Verification and completion
  delivery_confirmed?: boolean;
  signature_url?: string;
  photo_urls?: string[];
  completion_notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DeliveryTracking {
  id: string;
  delivery_id: string;
  provider_id: string;
  
  // GPS coordinates
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  
  // Movement data
  speed_kmh?: number;
  heading_degrees?: number;
  
  // Device information
  battery_level?: number;
  signal_strength?: number;
  device_id?: string;
  
  // Status information
  status: string;
  location_description?: string;
  traffic_conditions?: string;
  
  // Metadata
  recorded_at: string;
  created_at: string;
}

export interface DeliveryNotification {
  id: string;
  delivery_id: string;
  recipient_id: string;
  
  // Notification details
  type: 'status_update' | 'location_update' | 'delay_alert' | 'arrival_notification' | 'completion' | 'emergency';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Delivery context
  delivery_info?: any;
  
  // Notification state
  read: boolean;
  action_required: boolean;
  acknowledged: boolean;
  
  // Delivery channels
  sent_push?: boolean;
  sent_email?: boolean;
  sent_sms?: boolean;
  
  created_at: string;
  read_at?: string;
  acknowledged_at?: string;
}

export interface DeliveryReview {
  id: string;
  delivery_id: string;
  provider_id: string;
  reviewer_id: string;
  
  // Ratings (1-5 scale)
  overall_rating: number;
  timeliness_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  care_handling_rating?: number;
  
  // Review content
  comment?: string;
  would_recommend?: boolean;
  
  // Verification
  verified_delivery?: boolean;
  
  created_at: string;
}

export interface CostBreakdown {
  base_cost: number;
  distance_cost: number;
  weight_cost: number;
  urgency_cost: number;
  time_multiplier_cost: number;
  vehicle_type_cost: number;
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  start?: string;
  end?: string;
  closed?: boolean;
}

export interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  inTransitDeliveries: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  totalCost: number;
  averageCost: number;
  topMaterials: MaterialStats[];
  providerPerformance: ProviderPerformance[];
}

export interface MaterialStats {
  material_type: string;
  count: number;
  percentage: number;
}

export interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  total_deliveries: number;
  completion_rate: number;
  average_rating: number;
  on_time_rate: number;
}

export interface DeliveryFilters {
  status?: string;
  material_type?: string;
  provider_type?: string;
  date_range?: string;
  priority?: string;
  search?: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  altitude?: number;
}

export interface DeliveryRoute {
  id: string;
  delivery_id: string;
  start_location: GPSLocation;
  end_location: GPSLocation;
  current_location: GPSLocation;
  waypoints: GPSLocation[];
  total_distance: number;
  estimated_duration: number;
  actual_duration?: number;
  traffic_conditions?: string;
  route_status: 'planned' | 'active' | 'completed' | 'cancelled';
}

export interface Vehicle {
  id: string;
  provider_id: string;
  vehicle_type: string;
  registration: string;
  capacity_kg: number;
  current_load_kg: number;
  fuel_level: number;
  battery_level: number;
  maintenance_status: 'good' | 'needs_service' | 'out_of_service';
  last_service_date: string;
}

// AI Provider Matching Types
export interface ProviderMatchCriteria {
  pickup_location: {
    latitude: number;
    longitude: number;
  };
  delivery_location: {
    latitude: number;
    longitude: number;
  };
  material_weight?: number;
  material_volume?: number;
  urgency: string;
  preferred_vehicle_type?: string;
  max_cost?: number;
  required_rating?: number;
}

export interface ProviderMatch {
  provider: DeliveryProvider;
  match_score: number;
  estimated_cost: number;
  estimated_time_hours: number;
  distance_from_pickup_km: number;
  availability_confidence: number;
  reasons: string[];
}

export interface BulkDeliveryOperation {
  id: string;
  name: string;
  deliveries: string[]; // Array of delivery IDs
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_cost: number;
  estimated_completion: string;
  created_by: string;
  created_at: string;
}

export interface DeliveryInsights {
  efficiency_score: number;
  cost_optimization_suggestions: string[];
  provider_recommendations: string[];
  route_optimization_tips: string[];
  seasonal_trends: any;
  predictive_analytics: any;
}
