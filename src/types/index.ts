/**
 * UjenziXform Type Definitions
 * Central export point for all application types
 * 
 * Usage:
 * import { Supplier, Builder, Delivery, AdminUser } from '@/types';
 * import type { RegistrationStatus, KenyaCounty } from '@/types';
 */

// Supplier types
export * from './supplier';

// Builder types  
export * from './builder';

// Delivery types
export * from './delivery';

// Admin types
export * from './admin';

// User profile types
export * from './userProfile';

// Chat types
export * from './chat';

// Common/shared types
export * from './common';

// Admin Dashboard specific types
export * from './adminDashboard';

// Re-export commonly used types for convenience
export type {
  // Supplier
  Supplier,
  Material,
  SupplierFilters,
  MaterialFilters,
  SupplierReview,
  SupplierRatingStats,
  SupplierCapabilities,
  BusinessHours as SupplierBusinessHours,
  SocialMediaLinks,
} from './supplier';

export type {
  // Builder
  Builder,
  BuilderRegistration,
  BuilderProject,
  BuilderOrder,
  BuilderQuote,
  BuilderDashboardStats,
  BuilderFilters,
  BuilderVideo,
  BuilderGalleryImage,
  OrderItem,
  QuoteItem,
} from './builder';

export type {
  // Delivery
  DeliveryProvider,
  Delivery,
  DeliveryTracking,
  DeliveryNotification,
  DeliveryReview,
  DeliveryMetrics,
  DeliveryFilters,
  DeliveryRoute,
  GPSLocation,
  ProviderMatch,
  ProviderMatchCriteria,
  Vehicle,
  CostBreakdown,
  BulkDeliveryOperation,
  DeliveryInsights,
} from './delivery';

export type {
  // Admin
  AdminUser,
  AdminRole,
  AdminPermission,
  AdminDashboardStats,
  AdminActivity,
  AdminAction,
  AdminNotification,
  AdminFilters,
  SupplierRegistrationRecord,
  BuilderRegistrationRecord,
  DeliveryProviderRegistrationRecord,
  RegistrationRecord,
  SystemSetting,
  FeatureFlag,
  AuditLog,
  MonitoringRequest,
  PaginatedResponse,
  BulkAction,
  BulkActionResult,
} from './admin';

export type {
  // User Profile
  UserProfile,
  UserRole,
  BuilderCategory as UserBuilderCategory,
  UserType,
  BuilderState,
} from './userProfile';

export type {
  // Common
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginatedData,
  FormField,
  FormState,
  FieldConfig,
  SelectOption,
  ValidationRule,
  Location,
  Address,
  DateRange,
  TimeSlot,
  BusinessHours,
  DaySchedule,
  FileUpload,
  FileUploadProgress,
  Notification,
  NotificationType,
  NotificationPriority,
  RegistrationStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  StatusInfo,
  AsyncState,
  LoadingState,
  Nullable,
  Optional,
  DeepPartial,
} from './common';

// Export constants
export { MATERIAL_CATEGORIES } from './supplier';
export { 
  KENYA_COUNTIES,
  STATUS_MAP,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
} from './common';

// Export error classes
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from './common';

// Export type guards
export {
  isNotNull,
  isNotUndefined,
  isDefined,
} from './common';

// Export utility function
export { getUserBuilderState } from './userProfile';















