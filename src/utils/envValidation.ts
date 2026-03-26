/**
 * Environment Variable Validation Utility
 * 
 * This module provides secure validation for environment variables
 * and prevents the application from running with missing critical configuration.
 */

interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

// Define all environment variables used by the application
const ENV_CONFIG: EnvConfig[] = [
  {
    key: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (v) => v.startsWith('https://') && v.includes('.supabase.co')
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
    validator: (v) => v.startsWith('eyJ') && v.length > 100
  },
  {
    key: 'VITE_RECAPTCHA_SITE_KEY',
    required: false,
    description: 'Google reCAPTCHA v2 site key',
    validator: (v) => v.length === 40
  },
  {
    key: 'VITE_STRIPE_PUBLIC_KEY',
    required: false,
    description: 'Stripe publishable key for payments',
    validator: (v) => v.startsWith('pk_')
  },
  {
    key: 'VITE_GOOGLE_MAPS_API_KEY',
    required: false,
    description: 'Google Maps API key for location services'
  },
  {
    key: 'VITE_SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking'
  },
  {
    key: 'VITE_SENTRY_DEV_ENABLED',
    required: false,
    description: 'Set to "true" to send Sentry events from non-production builds'
  }
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configured: string[];
}

/**
 * Get an environment variable value
 * Supports both Vite (import.meta.env) and Node (process.env)
 */
export const getEnvVar = (key: string): string | undefined => {
  // Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Node/CRA environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

/**
 * Check if an environment variable is set
 */
export const hasEnvVar = (key: string): boolean => {
  const value = getEnvVar(key);
  return value !== undefined && value !== '' && value !== 'undefined';
};

/**
 * Validate all environment variables
 */
export const validateEnvironment = (): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    configured: []
  };

  for (const config of ENV_CONFIG) {
    const value = getEnvVar(config.key);
    const hasValue = hasEnvVar(config.key);

    if (config.required && !hasValue) {
      result.isValid = false;
      result.errors.push(`Missing required environment variable: ${config.key} - ${config.description}`);
    } else if (!config.required && !hasValue) {
      result.warnings.push(`Optional environment variable not set: ${config.key} - ${config.description}`);
    } else if (hasValue) {
      // Validate format if validator is provided
      if (config.validator && value && !config.validator(value)) {
        result.warnings.push(`Environment variable ${config.key} may have invalid format`);
      }
      result.configured.push(config.key);
    }
  }

  return result;
};

/**
 * Log environment validation results (for development)
 */
export const logEnvironmentStatus = (): void => {
  const result = validateEnvironment();
  const isDev = getEnvVar('MODE') === 'development' || getEnvVar('NODE_ENV') === 'development';

  if (!isDev) return; // Only log in development

  console.group('🔐 Environment Configuration');
  
  if (result.configured.length > 0) {
    console.log('✅ Configured:', result.configured.join(', '));
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings:');
    result.warnings.forEach(w => console.warn('  -', w));
  }
  
  if (result.errors.length > 0) {
    console.error('❌ Errors:');
    result.errors.forEach(e => console.error('  -', e));
  }
  
  console.groupEnd();
};

/**
 * Check if a specific feature is configured
 */
export const isFeatureConfigured = (feature: 'recaptcha' | 'stripe' | 'maps' | 'sentry'): boolean => {
  const featureKeys: Record<string, string> = {
    recaptcha: 'VITE_RECAPTCHA_SITE_KEY',
    stripe: 'VITE_STRIPE_PUBLIC_KEY',
    maps: 'VITE_GOOGLE_MAPS_API_KEY',
    sentry: 'VITE_SENTRY_DSN'
  };

  return hasEnvVar(featureKeys[feature]);
};

/**
 * Security check: Ensure no sensitive keys are exposed in client-side code
 */
export const checkForExposedSecrets = (): string[] => {
  const warnings: string[] = [];
  
  // These patterns should NEVER appear in client-side environment variables
  const dangerousPatterns = [
    { pattern: /^sk_/, name: 'Stripe secret key' },
    { pattern: /^service_role/, name: 'Supabase service role key' },
    { pattern: /password/i, name: 'Password' },
    { pattern: /secret/i, name: 'Secret' },
    { pattern: /private/i, name: 'Private key' }
  ];

  // Check all VITE_ prefixed variables (client-side exposed)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    for (const [key, value] of Object.entries(import.meta.env)) {
      if (key.startsWith('VITE_') && typeof value === 'string') {
        for (const { pattern, name } of dangerousPatterns) {
          if (pattern.test(value) || pattern.test(key)) {
            warnings.push(`⚠️ Potential ${name} exposed in ${key}`);
          }
        }
      }
    }
  }

  return warnings;
};

// Auto-run validation in development
if (typeof window !== 'undefined') {
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      logEnvironmentStatus();
      const secrets = checkForExposedSecrets();
      if (secrets.length > 0) {
        console.error('🚨 SECURITY WARNING: Potential secrets exposed!');
        secrets.forEach(s => console.error(s));
      }
    });
  } else {
    logEnvironmentStatus();
  }
}

export default {
  getEnvVar,
  hasEnvVar,
  validateEnvironment,
  isFeatureConfigured,
  checkForExposedSecrets
};




