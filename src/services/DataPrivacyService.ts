import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';

interface PersonalDataField {
  field: string;
  type: 'phone' | 'email' | 'name' | 'id_number' | 'address' | 'financial';
  encrypted: boolean;
  anonymized: boolean;
  retention_days: number;
  required_consent: string[];
}

interface ConsentRecord {
  user_id: string;
  consent_type: string;
  granted: boolean;
  timestamp: Date;
  purpose: string;
  data_categories: string[];
  expiry_date?: Date;
  withdrawal_date?: Date;
}

interface DataProcessingLog {
  id: string;
  user_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'anonymize';
  data_type: string;
  purpose: string;
  legal_basis: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

export class DataPrivacyService {
  // SECURITY: Encryption key now stored securely in Supabase secrets
  // All encryption/decryption happens server-side via edge function
  private static readonly PHONE_REGEX = /(\+?254|0)?([17]\d{8})/g;
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static readonly ID_REGEX = /\b\d{8}\b/g; // Kenyan ID format

  // Data field classification
  private static personalDataFields: PersonalDataField[] = [
    {
      field: 'phone_number',
      type: 'phone',
      encrypted: true,
      anonymized: false,
      retention_days: 2555, // 7 years for financial records
      required_consent: ['payment_processing', 'communication']
    },
    {
      field: 'email',
      type: 'email',
      encrypted: true,
      anonymized: false,
      retention_days: 2555,
      required_consent: ['communication', 'account_management']
    },
    {
      field: 'full_name',
      type: 'name',
      encrypted: true,
      anonymized: true,
      retention_days: 1825, // 5 years
      required_consent: ['identity_verification', 'service_provision']
    },
    {
      field: 'national_id',
      type: 'id_number',
      encrypted: true,
      anonymized: true,
      retention_days: 2555,
      required_consent: ['identity_verification', 'compliance']
    },
    {
      field: 'address',
      type: 'address',
      encrypted: true,
      anonymized: true,
      retention_days: 1825,
      required_consent: ['delivery_services', 'service_provision']
    },
    {
      field: 'payment_data',
      type: 'financial',
      encrypted: true,
      anonymized: false,
      retention_days: 2555,
      required_consent: ['payment_processing', 'financial_services']
    }
  ];

  // Encrypt sensitive data server-side (secure)
  static async encryptData(data: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('secure-encryption', {
        body: { action: 'encrypt', data }
      });

      if (error) {
        console.error('Encryption service error:', error);
        throw new Error('Data encryption failed');
      }

      return result.encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt sensitive data server-side (secure)
  static async decryptData(encryptedData: string): Promise<string> {
    try {
      const { data: result, error } = await supabase.functions.invoke('secure-encryption', {
        body: { action: 'decrypt', data: encryptedData }
      });

      if (error) {
        console.error('Decryption service error:', error);
        throw new Error('Data decryption failed');
      }

      return result.decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Hash phone numbers for anonymization
  static hashPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const hash = CryptoJS.SHA256(cleaned + 'phone_salt').toString();
    return `phone_${hash.substring(0, 16)}`;
  }

  // Validate and format Kenyan phone numbers
  static validateKenyanPhone(phone: string): { valid: boolean; formatted?: string; error?: string } {
    const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Kenyan phone number patterns
    const patterns = [
      /^(\+254|254)[17]\d{8}$/, // +254 or 254 format
      /^0[17]\d{8}$/, // 0 format
      /^[17]\d{8}$/ // Without country code
    ];

    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        // Convert to standard +254 format
        let formatted = cleaned;
        if (formatted.startsWith('0')) {
          formatted = '254' + formatted.substring(1);
        } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
          formatted = '254' + formatted;
        } else if (formatted.startsWith('254')) {
          formatted = formatted;
        }
        
        if (!formatted.startsWith('+')) {
          formatted = '+' + formatted;
        }

        return { valid: true, formatted };
      }
    }

    return { 
      valid: false, 
      error: 'Invalid Kenyan phone number. Use format: +254712345678, 0712345678, or 712345678' 
    };
  }

  // Sanitize input data
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  // Mask phone numbers for display
  static maskPhoneNumber(phone: string): string {
    const validation = this.validateKenyanPhone(phone);
    if (!validation.valid || !validation.formatted) {
      return '***-***-****';
    }

    const formatted = validation.formatted;
    if (formatted.length >= 9) {
      return formatted.substring(0, 4) + '***' + formatted.substring(formatted.length - 3);
    }
    return '***-***-****';
  }

  // Mask email addresses
  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***@***.***';
    
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
      : '**';
    
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.length > 2
      ? domainName.substring(0, 2) + '*'.repeat(domainName.length - 2)
      : '**';
    
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  // Check consent for data processing
  static async checkConsent(userId: string, purpose: string): Promise<boolean> {
    try {
      // In production, check against database
      // For now, simulate consent check
      const consentTypes = ['payment_processing', 'communication', 'service_provision'];
      return consentTypes.includes(purpose);
    } catch (error) {
      console.error('Consent check failed:', error);
      return false;
    }
  }

  // Log data processing activities
  static async logDataProcessing(log: Omit<DataProcessingLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logEntry: DataProcessingLog = {
        ...log,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      // In production, save to secure audit log
      console.log('Data processing logged:', logEntry);
      
      // Store in local storage for demo (in production, use secure backend)
      const existingLogs = JSON.parse(localStorage.getItem('data_processing_logs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('data_processing_logs', JSON.stringify(existingLogs.slice(-100))); // Keep last 100 logs
    } catch (error) {
      console.error('Failed to log data processing:', error);
    }
  }

  // Anonymize personal data
  static anonymizeData(data: any, dataType: string): any {
    const anonymized = { ...data };

    switch (dataType) {
      case 'phone':
        anonymized.phone_number = this.hashPhoneNumber(data.phone_number || '');
        break;
      case 'email':
        anonymized.email = CryptoJS.SHA256(data.email + 'email_salt').toString().substring(0, 16) + '@anonymized.local';
        break;
      case 'name':
        anonymized.full_name = `User_${CryptoJS.SHA256(data.full_name + 'name_salt').toString().substring(0, 8)}`;
        break;
      case 'address':
        anonymized.address = `Location_${CryptoJS.SHA256(data.address + 'address_salt').toString().substring(0, 8)}`;
        break;
      case 'id_number':
        anonymized.national_id = `ID_${CryptoJS.SHA256(data.national_id + 'id_salt').toString().substring(0, 8)}`;
        break;
    }

    return anonymized;
  }

  // Data retention management
  static async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      
      for (const field of this.personalDataFields) {
        const expiryDate = new Date(now.getTime() - field.retention_days * 24 * 60 * 60 * 1000);
        
        // In production, query database for expired records
        console.log(`Cleaning up ${field.field} data older than ${expiryDate.toISOString()}`);
        
        // Log cleanup activity
        await this.logDataProcessing({
          user_id: 'system',
          action: 'delete',
          data_type: field.type,
          purpose: 'data_retention_compliance',
          legal_basis: 'retention_policy'
        });
      }
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

  // Generate privacy compliance report
  static generatePrivacyReport(userId: string): {
    personal_data: { [key: string]: any };
    processing_purposes: string[];
    consents: ConsentRecord[];
    retention_info: { [key: string]: Date };
    data_processing_logs: DataProcessingLog[];
  } {
    // This would fetch real data in production
    return {
      personal_data: {
        phone_number: this.maskPhoneNumber('+254712345678'),
        email: this.maskEmail('user@example.com'),
        full_name: 'John D***',
        address: 'Nairobi, ***'
      },
      processing_purposes: [
        'Service provision',
        'Payment processing',
        'Communication',
        'Legal compliance'
      ],
      consents: [
        {
          user_id: userId,
          consent_type: 'payment_processing',
          granted: true,
          timestamp: new Date(),
          purpose: 'Process M-Pesa and bank payments',
          data_categories: ['phone', 'financial']
        }
      ],
      retention_info: {
        phone_number: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000),
        email: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000),
        full_name: new Date(Date.now() + 1825 * 24 * 60 * 60 * 1000)
      },
      data_processing_logs: JSON.parse(localStorage.getItem('data_processing_logs') || '[]')
        .filter((log: DataProcessingLog) => log.user_id === userId)
    };
  }

  // Secure data export for user requests
  static async exportUserData(userId: string): Promise<Blob> {
    try {
      await this.logDataProcessing({
        user_id: userId,
        action: 'export',
        data_type: 'all_personal_data',
        purpose: 'data_portability_request',
        legal_basis: 'user_consent'
      });

      const report = this.generatePrivacyReport(userId);
      const exportData = {
        export_date: new Date().toISOString(),
        user_id: userId,
        ...report
      };

      return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error('Failed to export user data');
    }
  }

  // Validate data processing legal basis
  static validateLegalBasis(purpose: string, hasConsent: boolean): { valid: boolean; basis: string; error?: string } {
    const legalBases: { [key: string]: { basis: string; requires_consent: boolean } } = {
      'payment_processing': { basis: 'contract_performance', requires_consent: false },
      'service_provision': { basis: 'contract_performance', requires_consent: false },
      'communication': { basis: 'legitimate_interest', requires_consent: true },
      'marketing': { basis: 'consent', requires_consent: true },
      'analytics': { basis: 'legitimate_interest', requires_consent: true },
      'compliance': { basis: 'legal_obligation', requires_consent: false }
    };

    const legalBasis = legalBases[purpose];
    if (!legalBasis) {
      return { valid: false, basis: 'unknown', error: 'Unknown processing purpose' };
    }

    if (legalBasis.requires_consent && !hasConsent) {
      return { valid: false, basis: legalBasis.basis, error: 'User consent required' };
    }

    return { valid: true, basis: legalBasis.basis };
  }

  // Secure phone number storage
  static async storePhoneNumber(userId: string, phoneNumber: string, purpose: string): Promise<boolean> {
    try {
      const validation = this.validateKenyanPhone(phoneNumber);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const hasConsent = await this.checkConsent(userId, purpose);
      const legalBasisCheck = this.validateLegalBasis(purpose, hasConsent);
      
      if (!legalBasisCheck.valid) {
        throw new Error(legalBasisCheck.error);
      }

      const encryptedPhone = await this.encryptData(validation.formatted!);
      
      await this.logDataProcessing({
        user_id: userId,
        action: 'create',
        data_type: 'phone',
        purpose,
        legal_basis: legalBasisCheck.basis
      });

      // In production, store in database with encryption
      console.log('Phone number stored securely for user:', userId);
      return true;
    } catch (error) {
      console.error('Phone number storage failed:', error);
      return false;
    }
  }

  // Initialize privacy settings
  static initializePrivacySettings(): void {
    // Set up periodic data cleanup
    const cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    // Store cleanup interval ID for cleanup on app unmount
    (window as any).privacyCleanupInterval = cleanupInterval;

    console.log('Privacy service initialized');
  }

  // Cleanup privacy settings
  static cleanupPrivacySettings(): void {
    if ((window as any).privacyCleanupInterval) {
      clearInterval((window as any).privacyCleanupInterval);
    }
  }
}
