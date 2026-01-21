/**
 * Centralized Error Handling Utility for UjenziPro
 * Provides user-friendly error messages and logging
 */

// Error types for categorization
export type ErrorType = 
  | 'AUTH'
  | 'NETWORK'
  | 'DATABASE'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'PAYMENT'
  | 'UPLOAD'
  | 'UNKNOWN';

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  AUTH: 'Authentication failed. Please sign in again.',
  NETWORK: 'Network error. Please check your internet connection and try again.',
  DATABASE: 'Unable to save your data. Please try again.',
  VALIDATION: 'Please check your input and try again.',
  PERMISSION: 'You don\'t have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  PAYMENT: 'Payment processing failed. Please try again or use a different method.',
  UPLOAD: 'File upload failed. Please check the file size and format.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

// Detailed error messages for specific scenarios
const SPECIFIC_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  
  // Database errors
  'duplicate key value': 'This record already exists.',
  'foreign key violation': 'Cannot delete this item as it\'s linked to other records.',
  'null value in column': 'Please fill in all required fields.',
  
  // RLS errors
  'new row violates row-level security': 'You don\'t have permission to create this record.',
  'violates row-level security policy': 'Access denied. Please contact support if this persists.',
  
  // Network errors
  'Failed to fetch': 'Unable to connect to the server. Please check your internet.',
  'NetworkError': 'Network connection lost. Please try again.',
  'timeout': 'Request timed out. Please try again.',
  
  // File upload errors
  'File too large': 'File is too large. Maximum size is 10MB.',
  'Invalid file type': 'Invalid file type. Please upload JPG, PNG, or PDF files.',
  
  // Payment errors
  'insufficient_funds': 'Insufficient funds. Please use a different payment method.',
  'card_declined': 'Card was declined. Please try a different card.',
  'expired_card': 'Card has expired. Please use a different card.',
};

// Supabase error code mappings
const SUPABASE_ERROR_CODES: Record<string, ErrorType> = {
  'PGRST301': 'PERMISSION',
  'PGRST204': 'DATABASE',
  '23505': 'VALIDATION', // unique_violation
  '23503': 'VALIDATION', // foreign_key_violation
  '23502': 'VALIDATION', // not_null_violation
  '42501': 'PERMISSION', // insufficient_privilege
  '42P01': 'DATABASE', // undefined_table
  '28000': 'AUTH', // invalid_authorization_specification
  '28P01': 'AUTH', // invalid_password
};

interface ErrorDetails {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string;
  originalError?: unknown;
}

/**
 * Parse and categorize an error
 */
export function parseError(error: unknown): ErrorDetails {
  // Default error details
  let type: ErrorType = 'UNKNOWN';
  let message = 'An unexpected error occurred';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    message = (err.message as string) || (err.error as string) || message;
    code = (err.code as string) || (err.status as string)?.toString();
    
    // Check for Supabase error structure
    if (err.code && typeof err.code === 'string') {
      type = SUPABASE_ERROR_CODES[err.code] || type;
    }
  }

  // Determine error type from message
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('password') || lowerMessage.includes('credentials')) {
    type = 'AUTH';
  } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
    type = 'NETWORK';
  } else if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('unauthorized') || lowerMessage.includes('rls') || lowerMessage.includes('row-level')) {
    type = 'PERMISSION';
  } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    type = 'NOT_FOUND';
  } else if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    type = 'RATE_LIMIT';
  } else if (lowerMessage.includes('payment') || lowerMessage.includes('card') || lowerMessage.includes('transaction')) {
    type = 'PAYMENT';
  } else if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
    type = 'UPLOAD';
  } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    type = 'VALIDATION';
  }

  // Get user-friendly message
  let userMessage = ERROR_MESSAGES[type];
  
  // Check for specific error messages
  for (const [key, specificMessage] of Object.entries(SPECIFIC_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      userMessage = specificMessage;
      break;
    }
  }

  return {
    type,
    message,
    userMessage,
    code,
    originalError: error,
  };
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  return parseError(error).userMessage;
}

/**
 * Log error to console (and potentially to external service)
 */
export function logError(error: unknown, context?: string): void {
  const errorDetails = parseError(error);
  
  console.error(`[UjenziPro Error]${context ? ` [${context}]` : ''}`, {
    type: errorDetails.type,
    message: errorDetails.message,
    code: errorDetails.code,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToErrorTracking(errorDetails);
  // }
}

/**
 * Handle error with toast notification
 */
export function handleErrorWithToast(
  error: unknown,
  toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void,
  context?: string
): void {
  const errorDetails = parseError(error);
  
  logError(error, context);
  
  toast({
    title: getErrorTitle(errorDetails.type),
    description: errorDetails.userMessage,
    variant: 'destructive',
  });
}

/**
 * Get error title based on type
 */
function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    AUTH: 'Authentication Error',
    NETWORK: 'Connection Error',
    DATABASE: 'Data Error',
    VALIDATION: 'Validation Error',
    PERMISSION: 'Access Denied',
    NOT_FOUND: 'Not Found',
    RATE_LIMIT: 'Too Many Requests',
    PAYMENT: 'Payment Error',
    UPLOAD: 'Upload Error',
    UNKNOWN: 'Error',
  };
  return titles[type];
}

/**
 * Create a retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorDetails = parseError(error);
      
      // Don't retry auth or permission errors
      if (['AUTH', 'PERMISSION', 'VALIDATION'].includes(errorDetails.type)) {
        throw error;
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Async error boundary wrapper
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logError(error, 'safeAsync');
    return fallback;
  }
}

