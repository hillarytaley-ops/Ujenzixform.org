/**
 * Common Types
 * Shared type definitions used across MradiPro
 */

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  status: number;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =====================================================
// Form Types
// =====================================================

export interface FormField<T = string> {
  value: T;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export type ValidationRule<T> = (value: T, formValues?: Record<string, unknown>) => string | undefined;

export interface FieldConfig<T = string> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: ValidationRule<T>[];
  defaultValue?: T;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// =====================================================
// Location Types
// =====================================================

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface Address {
  street?: string;
  city?: string;
  county?: string;
  sub_county?: string;
  postal_code?: string;
  country?: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
}

export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
  'Wajir', 'West Pokot'
] as const;

export type KenyaCounty = typeof KENYA_COUNTIES[number];

// =====================================================
// Date & Time Types
// =====================================================

export interface DateRange {
  start: string;
  end: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface BusinessHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: TimeSlot[];
}

// =====================================================
// File Types
// =====================================================

export interface FileUpload {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =====================================================
// Status Types
// =====================================================

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
export type DeliveryStatus = 'pending' | 'confirmed' | 'dispatched' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'failed';

export interface StatusInfo {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
}

export const STATUS_MAP: Record<string, StatusInfo> = {
  pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
  active: { label: 'Active', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  inactive: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  suspended: { label: 'Suspended', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  delivered: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
  in_transit: { label: 'In Transit', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// =====================================================
// Notification Types
// =====================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// =====================================================
// Error Types
// =====================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// =====================================================
// Utility Types
// =====================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Type guard helpers
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}















