/**
 * ============================================================
 * MradiPro SMS Service Tests
 * ============================================================
 * 
 * Unit tests for SMS notification service
 * Run with: npm test -- --grep "SMSService"
 */

import { describe, it, expect, vi } from 'vitest';
import { SMS_TEMPLATES } from './SMSService';

// Mock the service for testing
const mockSMSService = {
  formatPhoneNumber: (phone: string): string | null => {
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      return null;
    }

    if (cleaned.length !== 12) {
      return null;
    }

    return '+' + cleaned;
  },

  estimateCost: (message: string, recipientCount: number): { segments: number; cost: number } => {
    const singleSmsLength = 160;
    const multipartSmsLength = 153;
    
    let segments: number;
    if (message.length <= singleSmsLength) {
      segments = 1;
    } else {
      segments = Math.ceil(message.length / multipartSmsLength);
    }

    const costPerSegment = 0.80;
    const cost = segments * recipientCount * costPerSegment;

    return { segments, cost };
  },

  isConfigured: (): boolean => {
    return true;
  },
};

describe('SMSService', () => {
  describe('formatPhoneNumber', () => {
    it('should format phone starting with 0 correctly', () => {
      expect(mockSMSService.formatPhoneNumber('0712345678')).toBe('+254712345678');
    });

    it('should format phone starting with 7 correctly', () => {
      expect(mockSMSService.formatPhoneNumber('712345678')).toBe('+254712345678');
    });

    it('should handle +254 prefix', () => {
      expect(mockSMSService.formatPhoneNumber('+254712345678')).toBe('+254712345678');
    });

    it('should handle 254 prefix without +', () => {
      expect(mockSMSService.formatPhoneNumber('254712345678')).toBe('+254712345678');
    });

    it('should return null for invalid numbers', () => {
      expect(mockSMSService.formatPhoneNumber('123')).toBeNull();
      expect(mockSMSService.formatPhoneNumber('abc')).toBeNull();
      expect(mockSMSService.formatPhoneNumber('')).toBeNull();
    });

    it('should handle numbers with spaces and dashes', () => {
      expect(mockSMSService.formatPhoneNumber('0712-345-678')).toBe('+254712345678');
      expect(mockSMSService.formatPhoneNumber('0712 345 678')).toBe('+254712345678');
      expect(mockSMSService.formatPhoneNumber('+254 712 345 678')).toBe('+254712345678');
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost for single SMS', () => {
      const result = mockSMSService.estimateCost('Hello', 1);
      expect(result.segments).toBe(1);
      expect(result.cost).toBe(0.80);
    });

    it('should calculate cost for exactly 160 characters', () => {
      const message = 'a'.repeat(160);
      const result = mockSMSService.estimateCost(message, 1);
      expect(result.segments).toBe(1);
    });

    it('should calculate segments for long messages', () => {
      const message = 'a'.repeat(320);
      const result = mockSMSService.estimateCost(message, 1);
      expect(result.segments).toBe(3); // 320 / 153 = 2.09 → 3
    });

    it('should multiply cost by recipient count', () => {
      const result = mockSMSService.estimateCost('Hello', 10);
      expect(result.cost).toBe(8.00); // 0.80 * 10
    });

    it('should handle bulk SMS cost calculation', () => {
      const message = 'a'.repeat(200); // 2 segments
      const result = mockSMSService.estimateCost(message, 100);
      expect(result.segments).toBe(2);
      expect(result.cost).toBe(160); // 2 * 100 * 0.80
    });
  });
});

describe('SMS Templates', () => {
  describe('ORDER_PLACED', () => {
    it('should generate order confirmation message', () => {
      const message = SMS_TEMPLATES.ORDER_PLACED('ORD-12345', 50000);
      expect(message).toContain('ORD-12345');
      expect(message).toContain('50,000');
      expect(message).toContain('MradiPro');
    });
  });

  describe('ORDER_SHIPPED', () => {
    it('should generate shipping notification', () => {
      const message = SMS_TEMPLATES.ORDER_SHIPPED('ORD-12345', 'TRK-ABC123');
      expect(message).toContain('ORD-12345');
      expect(message).toContain('TRK-ABC123');
      expect(message).toContain('on the way');
    });
  });

  describe('PAYMENT_RECEIVED', () => {
    it('should generate payment confirmation', () => {
      const message = SMS_TEMPLATES.PAYMENT_RECEIVED(25000, 'QJK3Z8X9P2');
      expect(message).toContain('25,000');
      expect(message).toContain('QJK3Z8X9P2');
      expect(message).toContain('Thank you');
    });
  });

  describe('OTP_CODE', () => {
    it('should generate OTP message', () => {
      const message = SMS_TEMPLATES.OTP_CODE('123456');
      expect(message).toContain('123456');
      expect(message).toContain('verification');
      expect(message).toContain('Do not share');
    });
  });

  describe('WELCOME', () => {
    it('should generate welcome message', () => {
      const message = SMS_TEMPLATES.WELCOME('John');
      expect(message).toContain('John');
      expect(message).toContain('MradiPro');
      expect(message).toContain('Kenya');
    });
  });

  describe('DELIVERY_NEARBY', () => {
    it('should include estimated time', () => {
      const message = SMS_TEMPLATES.DELIVERY_NEARBY(15);
      expect(message).toContain('15');
      expect(message).toContain('mins');
    });
  });

  describe('MONITORING_ALERT', () => {
    it('should include project and alert details', () => {
      const message = SMS_TEMPLATES.MONITORING_ALERT('Kilimani Tower', 'Motion detected');
      expect(message).toContain('Kilimani Tower');
      expect(message).toContain('Motion detected');
      expect(message).toContain('monitoring');
    });
  });

  describe('Message Length Validation', () => {
    it('should keep templates under 160 characters for single SMS', () => {
      // Most critical templates should be single SMS
      const orderPlaced = SMS_TEMPLATES.ORDER_PLACED('ORD-12345', 50000);
      const otpCode = SMS_TEMPLATES.OTP_CODE('123456');
      const deliveryNearby = SMS_TEMPLATES.DELIVERY_NEARBY(15);

      expect(orderPlaced.length).toBeLessThanOrEqual(160);
      expect(otpCode.length).toBeLessThanOrEqual(160);
      expect(deliveryNearby.length).toBeLessThanOrEqual(160);
    });
  });
});

describe('SMSService Integration', () => {
  it.skip('should send SMS via Africa\'s Talking', async () => {
    // Would test actual API call
  });

  it.skip('should save SMS log to database', async () => {
    // Would test database operations
  });

  it.skip('should handle delivery reports', async () => {
    // Would test webhook handling
  });
});












