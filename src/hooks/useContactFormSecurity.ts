import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BotProvider } from '@/lib/botChallengeConfig';
import { submitPublicForm } from '@/services/submitPublicForm';

interface ContactFormMetrics {
  submissionStartTime: number;
  formInteractions: number;
  fieldFocusCount: number;
  typingPatterns: number[];
  sessionId: string;
}

interface RateLimitStatus {
  rateLimitOk: boolean;
  currentCount: number;
  resetTime: string;
  blockedUntil?: string;
}

interface SpamDetectionResult {
  isSpam: boolean;
  spamScore: number;
  spamIndicators: string[];
  recommendedAction: string;
}

interface CSRFToken {
  token: string;
  expiresAt: number;
}

export const useContactFormSecurity = () => {
  const [metrics, setMetrics] = useState<ContactFormMetrics>({
    submissionStartTime: Date.now(),
    formInteractions: 0,
    fieldFocusCount: 0,
    typingPatterns: [],
    sessionId: generateSessionId()
  });

  const [csrfToken, setCsrfToken] = useState<CSRFToken | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);

  // Generate session ID
  function generateSessionId(): string {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Generate CSRF token
  const generateCSRFToken = useCallback((): CSRFToken => {
    const token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    const csrfToken = { token, expiresAt };
    setCsrfToken(csrfToken);
    
    // Store in sessionStorage for validation
    sessionStorage.setItem('contact_csrf_token', JSON.stringify(csrfToken));
    
    return csrfToken;
  }, []);

  // Validate CSRF token
  const validateCSRFToken = useCallback((token: string): boolean => {
    const storedToken = sessionStorage.getItem('contact_csrf_token');
    if (!storedToken) return false;
    
    try {
      const parsed = JSON.parse(storedToken);
      return parsed.token === token && parsed.expiresAt > Date.now();
    } catch {
      return false;
    }
  }, []);

  // Track form interactions
  const trackInteraction = useCallback((interactionType: string) => {
    setMetrics(prev => ({
      ...prev,
      formInteractions: prev.formInteractions + 1,
      fieldFocusCount: interactionType === 'focus' ? prev.fieldFocusCount + 1 : prev.fieldFocusCount,
      typingPatterns: interactionType === 'typing' 
        ? [...prev.typingPatterns, Date.now() - prev.submissionStartTime].slice(-10)
        : prev.typingPatterns
    }));
  }, []);

  // Check rate limits
  const checkRateLimit = useCallback(async (): Promise<RateLimitStatus> => {
    try {
      // Get client IP (simplified - in production use proper IP detection)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();

      const { data, error } = await supabase
        .rpc('check_contact_form_rate_limit', {
          ip_address_param: ipData.ip
        });

      if (error) throw error;

      const row = data?.[0] as {
        rate_limit_ok?: boolean;
        current_count?: number;
        reset_time?: string;
        blocked_until?: string;
      } | undefined;

      const status: RateLimitStatus = {
        rateLimitOk: row?.rate_limit_ok ?? false,
        currentCount: row?.current_count ?? 999,
        resetTime: row?.reset_time ?? new Date().toISOString(),
        blockedUntil: row?.blocked_until,
      };

      setRateLimitStatus(status);
      return status;
    } catch (error) {
      console.error('Rate limit check error:', error);
      const fallbackStatus: RateLimitStatus = {
        rateLimitOk: false,
        currentCount: 999,
        resetTime: new Date().toISOString()
      };
      setRateLimitStatus(fallbackStatus);
      return fallbackStatus;
    }
  }, []);

  // Advanced input sanitization
  const sanitizeInput = useCallback((input: string, fieldType: string): string => {
    if (!input) return '';
    
    let sanitized = input.trim();
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Field-specific sanitization
    switch (fieldType) {
      case 'name':
        // Only allow letters, spaces, hyphens, apostrophes
        sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
        break;
      case 'email':
        // Basic email character filtering
        sanitized = sanitized.replace(/[^a-zA-Z0-9@.\-_]/g, '');
        break;
      case 'phone':
        // Only allow numbers, spaces, hyphens, plus
        sanitized = sanitized.replace(/[^0-9\s\-+()]/g, '');
        break;
      case 'subject':
        // Remove special characters but allow basic punctuation
        sanitized = sanitized.replace(/[<>\"'&{}[\]]/g, '');
        break;
      case 'message':
        // Allow most characters but remove dangerous ones
        sanitized = sanitized.replace(/[<>\"'&{}[\]]/g, '');
        // Limit length to prevent abuse
        sanitized = sanitized.slice(0, 2000);
        break;
    }
    
    return sanitized;
  }, []);

  // Validate form data with enhanced security
  const validateFormSecurity = useCallback((formData: any): {
    isValid: boolean;
    errors: string[];
    securityScore: number;
  } => {
    const errors: string[] = [];
    let securityScore = 100;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /<.*>/,
      /eval\(/i,
      /document\./i,
      /window\./i
    ];

    Object.entries(formData).forEach(([field, value]) => {
      if (typeof value === 'string') {
        suspiciousPatterns.forEach(pattern => {
          if (pattern.test(value)) {
            errors.push(`Suspicious content detected in ${field}`);
            securityScore -= 20;
          }
        });
      }
    });

    // Check for excessive length
    if (formData.message && formData.message.length > 2000) {
      errors.push('Message too long');
      securityScore -= 15;
    }

    // Check for minimum interaction time
    const submissionTime = Date.now() - metrics.submissionStartTime;
    if (submissionTime < 5000) { // Less than 5 seconds
      errors.push('Form submitted too quickly');
      securityScore -= 30;
    }

    // Check for sufficient interactions
    if (metrics.formInteractions < 5) {
      errors.push('Insufficient form interactions');
      securityScore -= 25;
    }

    return {
      isValid: errors.length === 0 && securityScore >= 50,
      errors,
      securityScore
    };
  }, [metrics]);

  const submitSecureForm = useCallback(async (
    formData: Record<string, string>,
    bot?: { token?: string; provider?: BotProvider },
  ): Promise<{
    success: boolean;
    message: string;
    submissionId?: string;
    requiresReview?: boolean;
  }> => {
    try {
      // Check rate limits
      const rateLimit = await checkRateLimit();
      if (!rateLimit.rateLimitOk) {
        return {
          success: false,
          message: `Rate limit exceeded. Please wait until ${new Date(rateLimit.resetTime).toLocaleTimeString()} before submitting again.`
        };
      }

      // Validate CSRF token
      if (!csrfToken || !validateCSRFToken(csrfToken.token)) {
        return {
          success: false,
          message: 'Security validation failed. Please refresh the page and try again.'
        };
      }

      // Sanitize form data
      const sanitizedData = {
        firstName: sanitizeInput(formData.firstName, 'name'),
        lastName: sanitizeInput(formData.lastName, 'name'),
        email: sanitizeInput(formData.email, 'email'),
        phone: sanitizeInput(formData.phone, 'phone'),
        subject: sanitizeInput(formData.subject, 'subject'),
        message: sanitizeInput(formData.message, 'message')
      };

      // Validate form security
      const securityValidation = validateFormSecurity(sanitizedData);
      if (!securityValidation.isValid) {
        return {
          success: false,
          message: 'Form validation failed. Please check your input and try again.'
        };
      }

      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();

      const submissionMetadata = {
        ip_address: ipData.ip,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        session_id: metrics.sessionId,
        honeypot_field: formData.honeypot ?? '',
        submission_time_ms: Date.now() - metrics.submissionStartTime,
        form_interactions: metrics.formInteractions,
        csrf_token: csrfToken.token
      };

      const result = await submitPublicForm({
        formType: 'contact',
        formData: { ...sanitizedData, honeypot: formData.honeypot ?? '' },
        metadata: submissionMetadata,
        botToken: bot?.token,
        botProvider: bot?.provider,
      });

      return {
        success: result.success,
        message: result.message,
        submissionId: result.submissionId,
        requiresReview: result.requiresReview,
      };

    } catch (error) {
      console.error('Form submission error:', error);
      return {
        success: false,
        message: 'An error occurred while submitting your message. Please try again.'
      };
    }
  }, [csrfToken, validateCSRFToken, checkRateLimit, sanitizeInput, validateFormSecurity, metrics]);

  // Initialize security features
  useEffect(() => {
    generateCSRFToken();
    checkRateLimit();
  }, [generateCSRFToken, checkRateLimit]);

  return {
    metrics,
    csrfToken,
    rateLimitStatus,
    trackInteraction,
    sanitizeInput,
    validateFormSecurity,
    submitSecureForm,
    generateCSRFToken,
    validateCSRFToken
  };
};
















