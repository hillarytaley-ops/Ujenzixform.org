import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Phone
} from 'lucide-react';
import { DataPrivacyService } from '@/services/DataPrivacyService';

interface SecurePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean, formatted?: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showMasked?: boolean;
  purpose?: string;
  userId?: string;
  className?: string;
}

export const SecurePhoneInput: React.FC<SecurePhoneInputProps> = ({
  value,
  onChange,
  onValidChange,
  label = "Phone Number",
  placeholder = "e.g., +254712345678",
  required = false,
  showMasked = false,
  purpose = "communication",
  userId,
  className = ""
}) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formatted, setFormatted] = useState<string>('');
  const [showValue, setShowValue] = useState<boolean>(!showMasked);
  const [consentGiven, setConsentGiven] = useState<boolean>(false);

  useEffect(() => {
    validatePhone(value);
  }, [value]);

  useEffect(() => {
    if (userId && purpose) {
      checkConsent();
    }
  }, [userId, purpose]);

  const validatePhone = (phone: string) => {
    if (!phone.trim()) {
      setIsValid(false);
      setError('');
      setFormatted('');
      if (onValidChange) onValidChange(false);
      return;
    }

    const validation = DataPrivacyService.validateKenyanPhone(phone);
    
    setIsValid(validation.valid);
    setError(validation.error || '');
    setFormatted(validation.formatted || '');

    if (onValidChange) {
      onValidChange(validation.valid, validation.formatted);
    }
  };

  const checkConsent = async () => {
    if (!userId || !purpose) return;
    
    try {
      const hasConsent = await DataPrivacyService.checkConsent(userId, purpose);
      setConsentGiven(hasConsent);
    } catch (error) {
      console.error('Failed to check consent:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Sanitize input to prevent XSS
    const sanitized = DataPrivacyService.sanitizeInput(newValue);
    onChange(sanitized);
  };

  const handleConsentGrant = async () => {
    if (!userId || !purpose) return;

    try {
      // In production, this would call an API to grant consent
      await DataPrivacyService.logDataProcessing({
        user_id: userId,
        action: 'create',
        data_type: 'consent',
        purpose: purpose,
        legal_basis: 'user_consent'
      });

      setConsentGiven(true);
    } catch (error) {
      console.error('Failed to grant consent:', error);
    }
  };

  const getDisplayValue = () => {
    if (showValue || !value) return value;
    return DataPrivacyService.maskPhoneNumber(value);
  };

  const getValidationIcon = () => {
    if (!value.trim()) return null;
    
    if (isValid) {
      return <CheckCircle className="h-4 w-4 text-kenyan-green" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="secure-phone-input" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        
        <div className="flex items-center gap-2">
          {showMasked && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowValue(!showValue)}
              className="h-6 px-2"
            >
              {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
          
          <Badge 
            variant={isValid ? "default" : "destructive"} 
            className={`text-xs ${isValid ? 'bg-kenyan-green' : ''}`}
          >
            <Shield className="h-3 w-3 mr-1" />
            {isValid ? 'Secure' : 'Invalid'}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Input
          id="secure-phone-input"
          type="tel"
          value={getDisplayValue()}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pr-10 ${isValid ? 'border-kenyan-green' : error ? 'border-red-500' : ''}`}
          autoComplete="tel"
          inputMode="tel"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {isValid && formatted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Valid Kenyan phone number: <strong>{formatted}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Consent Notice */}
      {userId && purpose && !consentGiven && value.trim() && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-sm">
                We need your consent to process your phone number for {purpose.replace('_', ' ')}.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleConsentGrant}
                  className="bg-kenyan-green hover:bg-kenyan-green/90"
                >
                  Grant Consent
                </Button>
                <Button size="sm" variant="outline">
                  Learn More
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Privacy Notice */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span>Your phone number is encrypted and stored securely</span>
        </div>
        <div>
          • Used only for {purpose.replace('_', ' ')} purposes
        </div>
        <div>
          • Never shared with third parties without consent
        </div>
        <div>
          • You can withdraw consent anytime in Privacy Settings
        </div>
      </div>

      {/* Technical Details for Developers */}
      {process.env.NODE_ENV === 'development' && isValid && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-xs space-y-1">
              <div><strong>Dev Info:</strong></div>
              <div>Original: {value}</div>
              <div>Formatted: {formatted}</div>
              <div>Masked: {DataPrivacyService.maskPhoneNumber(value)}</div>
              <div>Hashed: {DataPrivacyService.hashPhoneNumber(value)}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
