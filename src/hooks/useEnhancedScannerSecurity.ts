import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezoneOffset: number;
  language: string;
  fingerprint: string;
}

interface RateLimitStatus {
  rateLimitOk: boolean;
  currentCount: number;
  limitThreshold: number;
  resetTime: string;
}

interface SecurityValidationResult {
  isValid: boolean;
  validationScore: number;
  securityFlags: string[];
  errorMessage?: string;
}

export const useEnhancedScannerSecurity = () => {
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);

  // Generate device fingerprint
  const generateDeviceFingerprint = useCallback(async (): Promise<DeviceFingerprint> => {
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezoneOffset = new Date().getTimezoneOffset();
    const language = navigator.language;

    try {
      const { data: fingerprint, error } = await supabase
        .rpc('generate_device_fingerprint', {
          user_agent_param: userAgent,
          screen_resolution: screenResolution,
          timezone_offset: timezoneOffset,
          language_param: language
        });

      if (error) throw error;

      const deviceFp: DeviceFingerprint = {
        userAgent,
        screenResolution,
        timezoneOffset,
        language,
        fingerprint: fingerprint || 'unknown'
      };

      setDeviceFingerprint(deviceFp);
      return deviceFp;
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      const fallbackFp: DeviceFingerprint = {
        userAgent,
        screenResolution,
        timezoneOffset,
        language,
        fingerprint: 'fallback_' + Date.now()
      };
      setDeviceFingerprint(fallbackFp);
      return fallbackFp;
    }
  }, []);

  // Get user location with enhanced validation
  const getUserLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocationData(locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        options
      );
    });
  }, []);

  // Verify scan location with multiple sources
  const verifyLocation = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<{
    locationValid: boolean;
    confidenceScore: number;
    verificationMethod: string;
    warnings: string[];
  }> => {
    try {
      // Get IP address for additional verification
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();

      const { data, error } = await supabase
        .rpc('verify_scan_location', {
          scan_lat: latitude,
          scan_lng: longitude,
          ip_address_param: ipData.ip
        });

      if (error) throw error;

      return data[0] || {
        locationValid: false,
        confidenceScore: 0,
        verificationMethod: 'none',
        warnings: ['Verification failed']
      };
    } catch (error) {
      console.error('Location verification error:', error);
      return {
        locationValid: false,
        confidenceScore: 0,
        verificationMethod: 'error',
        warnings: ['Location verification failed']
      };
    }
  }, []);

  // Check rate limits
  const checkRateLimit = useCallback(async (): Promise<RateLimitStatus> => {
    try {
      const { data, error } = await supabase
        .rpc('check_scan_rate_limit');

      if (error) throw error;

      const status = data[0] || {
        rate_limit_ok: false,
        current_count: 0,
        limit_threshold: 0,
        reset_time: new Date().toISOString()
      };

      setRateLimitStatus(status);
      return status;
    } catch (error) {
      console.error('Rate limit check error:', error);
      const fallbackStatus: RateLimitStatus = {
        rateLimitOk: false,
        currentCount: 999,
        limitThreshold: 100,
        resetTime: new Date().toISOString()
      };
      setRateLimitStatus(fallbackStatus);
      return fallbackStatus;
    }
  }, []);

  // Enhanced QR code validation
  const validateQRCodeSecurely = useCallback(async (
    qrCode: string,
    materialData?: any
  ): Promise<SecurityValidationResult> => {
    try {
      // Input sanitization
      const sanitizedQrCode = qrCode.trim().replace(/[^\w\-]/g, '');
      
      if (!sanitizedQrCode || sanitizedQrCode.length < 10) {
        return {
          isValid: false,
          validationScore: 0,
          securityFlags: ['INVALID_INPUT'],
          errorMessage: 'Invalid QR code format'
        };
      }

      // Server-side validation
      const { data, error } = await supabase
        .rpc('validate_qr_code_server_side', {
          qr_code_param: sanitizedQrCode,
          material_data_param: materialData ? JSON.stringify(materialData) : null
        });

      if (error) throw error;

      return data[0] || {
        isValid: false,
        validationScore: 0,
        securityFlags: ['VALIDATION_FAILED'],
        errorMessage: 'Server validation failed'
      };
    } catch (error) {
      console.error('QR validation error:', error);
      return {
        isValid: false,
        validationScore: 0,
        securityFlags: ['SYSTEM_ERROR'],
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  // Comprehensive security check before scanning
  const performSecurityCheck = useCallback(async (): Promise<{
    canProceed: boolean;
    securityScore: number;
    issues: string[];
    recommendations: string[];
  }> => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    try {
      // Check rate limits
      const rateLimit = await checkRateLimit();
      if (!rateLimit.rateLimitOk) {
        issues.push('Rate limit exceeded');
        recommendations.push('Wait before scanning again');
        securityScore -= 30;
      }

      // Generate device fingerprint
      await generateDeviceFingerprint();

      // Try to get location
      try {
        const location = await getUserLocation();
        const locationVerification = await verifyLocation(location.latitude, location.longitude);
        
        if (!locationVerification.locationValid) {
          issues.push('Location verification failed');
          recommendations.push('Enable location services and ensure GPS accuracy');
          securityScore -= 20;
        }

        if (locationVerification.warnings.length > 0) {
          issues.push(...locationVerification.warnings);
          securityScore -= 10;
        }
      } catch (locationError) {
        issues.push('Location access denied');
        recommendations.push('Grant location permission for enhanced security');
        securityScore -= 15;
      }

      // Check device fingerprint consistency
      if (!deviceFingerprint) {
        issues.push('Device fingerprint unavailable');
        recommendations.push('Ensure JavaScript is enabled');
        securityScore -= 10;
      }

      return {
        canProceed: securityScore >= 50,
        securityScore,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Security check error:', error);
      return {
        canProceed: false,
        securityScore: 0,
        issues: ['Security check failed'],
        recommendations: ['Contact system administrator']
      };
    }
  }, [checkRateLimit, generateDeviceFingerprint, getUserLocation, verifyLocation, deviceFingerprint]);

  // Initialize security components
  useEffect(() => {
    generateDeviceFingerprint();
    checkRateLimit();
  }, [generateDeviceFingerprint, checkRateLimit]);

  return {
    deviceFingerprint,
    locationData,
    rateLimitStatus,
    generateDeviceFingerprint,
    getUserLocation,
    verifyLocation,
    checkRateLimit,
    validateQRCodeSecurely,
    performSecurityCheck
  };
};











