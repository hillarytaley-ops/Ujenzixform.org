import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Package,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number;
}

interface EnhancedDeliveryFormValidationProps {
  value: string;
  onChange: (value: string) => void;
  fieldType: 'address' | 'phone' | 'material' | 'instructions' | 'contact_name';
  label: string;
  placeholder?: string;
  required?: boolean;
  showSecurityScore?: boolean;
  onValidationChange?: (result: ValidationResult) => void;
}

export const EnhancedDeliveryFormValidation: React.FC<EnhancedDeliveryFormValidationProps> = ({
  value,
  onChange,
  fieldType,
  label,
  placeholder,
  required = false,
  showSecurityScore = false,
  onValidationChange
}) => {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    securityScore: 100
  });
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    validateField(value);
  }, [value, fieldType]);

  const validateField = async (inputValue: string) => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityScore: 100
    };

    if (required && !inputValue.trim()) {
      result.errors.push(`${label} is required`);
      result.isValid = false;
      result.securityScore = 0;
    }

    if (inputValue.trim()) {
      switch (fieldType) {
        case 'address':
          validateAddress(inputValue, result);
          break;
        case 'phone':
          validatePhone(inputValue, result);
          break;
        case 'material':
          validateMaterial(inputValue, result);
          break;
        case 'instructions':
          validateInstructions(inputValue, result);
          break;
        case 'contact_name':
          validateContactName(inputValue, result);
          break;
      }
    }

    setValidation(result);
    if (onValidationChange) {
      onValidationChange(result);
    }
  };

  const validateAddress = (address: string, result: ValidationResult) => {
    // Basic address validation
    if (address.length < 10) {
      result.errors.push('Address must be at least 10 characters');
      result.isValid = false;
      result.securityScore -= 30;
    }

    // Check for suspicious patterns
    if (address.toLowerCase().includes('test') || address.toLowerCase().includes('fake')) {
      result.warnings.push('Address appears to be a test/fake address');
      result.securityScore -= 40;
    }

    // Check for PO Box (might need special handling)
    if (address.toLowerCase().includes('p.o. box') || address.toLowerCase().includes('po box')) {
      result.warnings.push('PO Box address - delivery may require special arrangements');
      result.securityScore -= 10;
    }

    // Check for Kenyan location indicators
    const kenyanIndicators = ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'kenya'];
    const hasKenyanIndicator = kenyanIndicators.some(indicator => 
      address.toLowerCase().includes(indicator)
    );

    if (!hasKenyanIndicator) {
      result.warnings.push('Address may be outside Kenya - verify delivery coverage');
      result.securityScore -= 15;
    }

    // Check for complete address components
    const hasStreet = /\d+/.test(address); // Has numbers (likely street number)
    const hasArea = address.split(',').length >= 2; // Has comma-separated parts

    if (!hasStreet) {
      result.warnings.push('Consider adding street number for precise delivery');
      result.securityScore -= 5;
    }

    if (!hasArea) {
      result.warnings.push('Consider adding area/district for better location accuracy');
      result.securityScore -= 5;
    }
  };

  const validatePhone = (phone: string, result: ValidationResult) => {
    // Remove spaces and special characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Kenyan phone number patterns
    const kenyanPatterns = [
      /^(\+254|254|0)[17]\d{8}$/, // Standard Kenyan mobile
      /^(\+254|254|0)[24]\d{7}$/, // Kenyan landline
    ];

    const isValidKenyan = kenyanPatterns.some(pattern => pattern.test(cleanPhone));

    if (!isValidKenyan) {
      result.errors.push('Please enter a valid Kenyan phone number');
      result.isValid = false;
      result.securityScore -= 50;
    }

    // Check for suspicious patterns
    if (/^(\+254|254|0)1{9}$/.test(cleanPhone) || /^(\+254|254|0)0{9}$/.test(cleanPhone)) {
      result.warnings.push('Phone number appears to be a placeholder');
      result.securityScore -= 40;
    }

    // Validate mobile vs landline appropriateness
    if (isValidKenyan && /^(\+254|254|0)[24]/.test(cleanPhone)) {
      result.warnings.push('Landline number detected - mobile number recommended for delivery coordination');
      result.securityScore -= 10;
    }
  };

  const validateMaterial = (material: string, result: ValidationResult) => {
    // Check for valid construction materials
    const validMaterials = [
      'cement', 'sand', 'gravel', 'steel', 'iron', 'timber', 'wood',
      'brick', 'block', 'tile', 'stone', 'aggregate', 'concrete',
      'roofing', 'paint', 'hardware', 'electrical', 'plumbing'
    ];

    const materialLower = material.toLowerCase();
    const isValidMaterial = validMaterials.some(valid => 
      materialLower.includes(valid) || valid.includes(materialLower)
    );

    if (!isValidMaterial) {
      result.warnings.push('Material type not recognized - please verify it\'s a construction material');
      result.securityScore -= 20;
    }

    // Check for suspicious material descriptions
    if (material.toLowerCase().includes('test') || material.toLowerCase().includes('fake')) {
      result.warnings.push('Material description appears to be a test entry');
      result.securityScore -= 30;
    }

    // Check for hazardous materials
    const hazardousKeywords = ['explosive', 'chemical', 'toxic', 'dangerous', 'flammable'];
    if (hazardousKeywords.some(keyword => materialLower.includes(keyword))) {
      result.warnings.push('Potentially hazardous material detected - special handling may be required');
      result.securityScore -= 25;
    }
  };

  const validateInstructions = (instructions: string, result: ValidationResult) => {
    // Check for suspicious content
    const suspiciousPatterns = [
      /\b(cash|money|payment)\b/i,
      /\b(urgent|emergency|asap)\b/i,
      /\b(secret|confidential|private)\b/i,
      /<script|javascript:|onclick/i,
      /\b(test|fake|dummy)\b/i
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(instructions)) {
        result.warnings.push('Instructions contain potentially suspicious content');
        result.securityScore -= 15;
      }
    });

    // Check for excessive length
    if (instructions.length > 500) {
      result.warnings.push('Instructions are very long - consider summarizing key points');
      result.securityScore -= 10;
    }

    // Check for contact information in instructions (should use dedicated fields)
    if (/\+?\d{10,}/.test(instructions)) {
      result.warnings.push('Phone numbers detected in instructions - use contact fields instead');
      result.securityScore -= 15;
    }

    if (/@/.test(instructions)) {
      result.warnings.push('Email addresses detected in instructions - use contact fields instead');
      result.securityScore -= 15;
    }
  };

  const validateContactName = (name: string, result: ValidationResult) => {
    // Basic name validation
    if (name.length < 2) {
      result.errors.push('Contact name must be at least 2 characters');
      result.isValid = false;
      result.securityScore -= 30;
    }

    // Check for suspicious patterns
    if (/\d/.test(name)) {
      result.warnings.push('Contact name contains numbers - verify this is correct');
      result.securityScore -= 20;
    }

    if (name.toLowerCase().includes('test') || name.toLowerCase().includes('fake')) {
      result.warnings.push('Contact name appears to be a test entry');
      result.securityScore -= 40;
    }

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(name)) {
      result.warnings.push('Contact name contains special characters - verify this is correct');
      result.securityScore -= 15;
    }
  };

  const getValidationIcon = () => {
    if (validation.errors.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (validation.warnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const InputComponent = fieldType === 'instructions' ? Textarea : Input;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldType} className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          {getValidationIcon()}
        </Label>
        {showSecurityScore && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getSecurityScoreColor(validation.securityScore)}>
              Security: {validation.securityScore}%
            </Badge>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      <InputComponent
        id={fieldType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${
          validation.errors.length > 0 ? 'border-red-500 focus:border-red-500' :
          validation.warnings.length > 0 ? 'border-yellow-500 focus:border-yellow-500' :
          'border-green-500 focus:border-green-500'
        }`}
        {...(fieldType === 'instructions' ? { rows: 3 } : {})}
      />

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Details */}
      {showDetails && showSecurityScore && (
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">Security Analysis</span>
          </div>
          <div className="space-y-1">
            <p>Security Score: <span className={getSecurityScoreColor(validation.securityScore)}>{validation.securityScore}%</span></p>
            <p>Validation Status: {validation.isValid ? '✅ Valid' : '❌ Invalid'}</p>
            <p>Risk Factors: {validation.errors.length + validation.warnings.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};
