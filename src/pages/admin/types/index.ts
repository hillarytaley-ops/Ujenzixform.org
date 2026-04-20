import { LucideIcon } from "lucide-react";

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  totalBuilders: number;
  totalSuppliers: number;
  totalDelivery: number;
  pendingRegistrations: number;
  activeToday: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  // Order stats
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  // Delivery request stats
  totalDeliveryRequests: number;
  pendingDeliveryRequests: number;
}

// Feedback Record
export interface FeedbackRecord {
  id: string;
  user_email: string;
  message: string;
  rating: number;
  category: string;
  created_at: string;
  status: string;
  name?: string | null;
  subject?: string | null;
  user_type?: string | null;
  // Reply fields
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  replied_by?: string | null;
  replied_by_name?: string | null;
}

// App Page for monitoring
export interface AppPage {
  name: string;
  path: string;
  icon: LucideIcon;
  status: 'active' | 'inactive' | 'maintenance';
  visits: number;
  description: string;
  category: 'public' | 'protected' | 'admin';
}

// User Record
export interface UserRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in: string | null;
}

// Registration Record (Builder, Supplier, Delivery)
export interface RegistrationRecord {
  id: string;
  type: 'builder' | 'supplier' | 'delivery';
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  county?: string;
  builder_category?: string;
  material_categories?: string[];
  vehicle_type?: string;
  service_areas?: string[];
  status: string;
  created_at: string;
  bank_name?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
}

// Document Record
export interface DocumentRecord {
  id: string;
  name: string;
  type: 'id_document' | 'business_certificate' | 'nca_certificate' | 'profile_photo' | 'license' | 'insurance' | 'other';
  uploadedBy: string;
  userEmail: string;
  userRole: string;
  size: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

// ML Activity
export interface MLActivity {
  id: string;
  type: 'prediction' | 'classification' | 'recommendation' | 'anomaly_detection' | 'sentiment_analysis';
  model: string;
  input: string;
  output: string;
  confidence: number;
  processingTime: number;
  userId?: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

// ML Statistics
export interface MLStats {
  totalPredictions: number;
  successRate: number;
  avgProcessingTime: number;
  activeModels: number;
  todayPredictions: number;
  errorRate: number;
}

// Financial Document
export interface FinancialDocument {
  id: string;
  type: 'invoice' | 'payment' | 'purchase_order' | 'purchase_receipt';
  reference: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  partyName: string;
  partyEmail?: string;
  description?: string;
  items?: FinancialDocumentItem[];
}

export interface FinancialDocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Financial Statistics
export interface FinancialStats {
  totalInvoices: number;
  totalPayments: number;
  totalPurchaseOrders: number;
  totalReceipts: number;
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  overdueInvoices: number;
}

// Delivery Application
export interface DeliveryApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string;
  physical_address: string;
  vehicle_type: string;
  vehicle_registration: string;
  driving_license_number: string;
  years_experience: number;
  service_areas: string[];
  availability: string;
  has_smartphone: boolean;
  background_check_consent: boolean;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  bank_name?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  _registration_id?: string | null;
  _source?: string;
}

// Builder Delivery Request
export interface BuilderDeliveryRequest {
  id: string;
  builder_id: string;
  builder_email?: string;
  builder_name?: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  pickup_location?: string;
  pickup_address?: string;
  dropoff_location?: string;
  dropoff_address?: string;
  item_description?: string;
  estimated_weight?: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency?: string;
  special_instructions?: string;
  required_vehicle_type?: string;
  status: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  estimated_cost?: number;
  final_cost?: number;
  current_location?: string;
  tracking_updates?: TrackingUpdate[];
  created_at: string;
  updated_at: string;
}

export interface TrackingUpdate {
  timestamp: string;
  status: string;
  location?: string;
  notes?: string;
}

// Camera Record
// Camera Connection Types
export type CameraConnectionType = 
  | 'url'               // Simple URL link (current behavior)
  | 'rtsp'              // RTSP stream (rtsp://...)
  | 'hls'               // HLS stream (.m3u8)
  | 'webrtc'            // WebRTC peer connection
  | 'ip_camera'         // Direct IP camera with credentials
  | 'onvif'             // ONVIF protocol
  | 'embedded'          // Embedded iframe viewer
  | 'usb'               // Local USB camera
  | 'mobile'            // Mobile device camera (phone/tablet)
  | 'vendor_cellular';  // Solar / 4G IP (e.g. Hikvision): prefer RTMP/SRT → MediaMTX VPS → HLS in stream_url; RTSP only if LAN pull

export interface CameraCredentials {
  username?: string;
  password?: string;
  api_key?: string;
  port?: number;
}

export interface CameraRecord {
  id: string;
  name: string;
  location: string | null;
  project_id: string | null;
  project_name?: string;
  stream_url: string | null;
  /** RTMP publish URL for camera → MediaMTX (ops); not for browser playback. */
  ingest_rtmp_url?: string | null;
  /** SRT publish URL when camera supports SRT push. */
  ingest_srt_url?: string | null;
  /** Comma-separated IPs/hostnames for MediaMTX `MTX_WEBRTCADDITIONALHOSTS` when using WebRTC; not used for HLS-only. */
  mediamtx_webrtc_additional_hosts?: string | null;
  is_active: boolean;
  camera_type: string;
  connection_type: CameraConnectionType;
  ip_address?: string | null;
  credentials?: CameraCredentials | null;
  embed_code?: string | null;
  resolution?: string | null;
  fps?: number | null;
  recording_enabled?: boolean;
  motion_detection?: boolean;
  supports_ptz?: boolean;
  supports_two_way_audio?: boolean;
  status: 'online' | 'offline' | 'error';
  last_connected?: string | null;
  created_at: string;
  updated_at: string;
}

// Camera Form Data
export interface CameraFormData {
  name: string;
  location: string;
  stream_url: string;
  ingest_rtmp_url?: string;
  ingest_srt_url?: string;
  mediamtx_webrtc_additional_hosts?: string;
  camera_type: string;
  connection_type: CameraConnectionType;
  ip_address?: string;
  port?: number;
  username?: string;
  password?: string;
  embed_code?: string;
  resolution?: string;
  recording_enabled?: boolean;
  motion_detection?: boolean;
  supports_ptz?: boolean;
  supports_two_way_audio?: boolean;
  is_active: boolean;
}

// Admin Context for sharing state across tabs
export interface AdminContextType {
  stats: DashboardStats;
  setStats: React.Dispatch<React.SetStateAction<DashboardStats>>;
  users: UserRecord[];
  setUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>;
  registrations: RegistrationRecord[];
  setRegistrations: React.Dispatch<React.SetStateAction<RegistrationRecord[]>>;
  feedbackList: FeedbackRecord[];
  setFeedbackList: React.Dispatch<React.SetStateAction<FeedbackRecord[]>>;
  cameras: CameraRecord[];
  setCameras: React.Dispatch<React.SetStateAction<CameraRecord[]>>;
  documents: DocumentRecord[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentRecord[]>>;
  loading: boolean;
  adminEmail: string;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  refreshData: () => Promise<void>;
}

// Pagination
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationState;
}

// Filter Options
export interface FilterOptions {
  search: string;
  status?: string;
  role?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Sort Options
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Table Column Definition
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

