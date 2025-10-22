import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaterialRecognitionResult {
  material_type: string;
  category: string;
  confidence: number;
  alternative_matches: MaterialMatch[];
  quality_assessment: QualityAssessment;
  recommendations: string[];
  fraud_indicators: FraudIndicator[];
}

interface MaterialMatch {
  material_type: string;
  confidence: number;
  reasoning: string;
}

interface QualityAssessment {
  overall_quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected';
  quality_score: number;
  quality_factors: string[];
  defects_detected: string[];
  recommendations: string[];
}

interface FraudIndicator {
  type: 'fake_qr' | 'tampered_code' | 'duplicate_material' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
}

interface UseAIMaterialRecognitionResult {
  recognizeMaterial: (qrCode: string, imageData?: string) => Promise<MaterialRecognitionResult>;
  validateMaterialAuthenticity: (qrCode: string, materialData: any) => Promise<boolean>;
  assessMaterialQuality: (imageData: string) => Promise<QualityAssessment>;
  detectCounterfeitQR: (qrCode: string) => Promise<FraudIndicator[]>;
  isAnalyzing: boolean;
  error: string | null;
}

export const useAIMaterialRecognition = (): UseAIMaterialRecognitionResult => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // AI-powered material recognition from QR code
  const recognizeMaterial = useCallback(async (qrCode: string, imageData?: string): Promise<MaterialRecognitionResult> => {
    try {
      setIsAnalyzing(true);
      setError(null);

      // Parse QR code structure
      const qrParts = qrCode.split('-');
      const materialKeywords = qrParts.length > 1 ? qrParts[1].toLowerCase() : '';
      
      // Material type recognition algorithm
      const materialDatabase = {
        'cement': {
          category: 'Binding Materials',
          keywords: ['cement', 'portland', 'ppc', 'opc'],
          typical_units: ['bags', 'kg', 'tons'],
          quality_indicators: ['strength', 'setting_time', 'fineness']
        },
        'steel': {
          category: 'Structural Materials',
          keywords: ['steel', 'rebar', 'iron', 'rod', 'bar'],
          typical_units: ['kg', 'tons', 'pieces'],
          quality_indicators: ['tensile_strength', 'yield_strength', 'ductility']
        },
        'brick': {
          category: 'Masonry Materials',
          keywords: ['brick', 'block', 'clay'],
          typical_units: ['pieces', 'pallets'],
          quality_indicators: ['compressive_strength', 'water_absorption', 'dimensions']
        },
        'sand': {
          category: 'Aggregates',
          keywords: ['sand', 'fine', 'river', 'sea'],
          typical_units: ['cubic_meters', 'm3', 'tons'],
          quality_indicators: ['fineness_modulus', 'silt_content', 'organic_impurities']
        },
        'gravel': {
          category: 'Aggregates',
          keywords: ['gravel', 'stone', 'aggregate', 'ballast'],
          typical_units: ['cubic_meters', 'm3', 'tons'],
          quality_indicators: ['gradation', 'crushing_strength', 'shape']
        }
      };

      // Find best material match
      let bestMatch = { material_type: 'Unknown', confidence: 0 };
      const alternativeMatches: MaterialMatch[] = [];

      Object.entries(materialDatabase).forEach(([materialType, data]) => {
        let confidence = 0;
        const reasoning: string[] = [];

        // Check keyword matches
        data.keywords.forEach(keyword => {
          if (materialKeywords.includes(keyword)) {
            confidence += 30;
            reasoning.push(`Keyword match: ${keyword}`);
          }
        });

        // Check QR code structure
        if (qrCode.includes(materialType.toUpperCase())) {
          confidence += 40;
          reasoning.push(`Direct material type match`);
        }

        // Bonus for complete QR structure
        if (qrParts.length >= 5) {
          confidence += 10;
          reasoning.push(`Well-structured QR code`);
        }

        if (confidence > bestMatch.confidence) {
          if (bestMatch.confidence > 0) {
            alternativeMatches.push({
              material_type: bestMatch.material_type,
              confidence: bestMatch.confidence,
              reasoning: 'Previous best match'
            });
          }
          bestMatch = { material_type: materialType, confidence };
        } else if (confidence > 20) {
          alternativeMatches.push({
            material_type: materialType,
            confidence,
            reasoning: reasoning.join(', ')
          });
        }
      });

      // Quality assessment based on QR code and image
      const qualityAssessment = await assessMaterialQuality(imageData || '');

      // Generate recommendations
      const recommendations: string[] = [];
      if (bestMatch.confidence < 70) {
        recommendations.push('Manual verification recommended - low confidence match');
      }
      if (qualityAssessment.overall_quality === 'poor') {
        recommendations.push('Quality inspection required before use');
      }
      if (qrParts.length < 4) {
        recommendations.push('QR code format may be incomplete or non-standard');
      }

      // Detect potential fraud
      const fraudIndicators = await detectCounterfeitQR(qrCode);

      const result: MaterialRecognitionResult = {
        material_type: bestMatch.material_type,
        category: materialDatabase[bestMatch.material_type as keyof typeof materialDatabase]?.category || 'Unknown',
        confidence: bestMatch.confidence,
        alternative_matches: alternativeMatches,
        quality_assessment: qualityAssessment,
        recommendations,
        fraud_indicators: fraudIndicators
      };

      return result;

    } catch (err) {
      console.error('Error in material recognition:', err);
      setError(err instanceof Error ? err.message : 'Material recognition failed');
      
      // Return default result on error
      return {
        material_type: 'Unknown',
        category: 'Unknown',
        confidence: 0,
        alternative_matches: [],
        quality_assessment: {
          overall_quality: 'poor',
          quality_score: 0,
          quality_factors: ['Analysis failed'],
          defects_detected: ['Recognition error'],
          recommendations: ['Manual inspection required']
        },
        recommendations: ['Manual verification required due to analysis error'],
        fraud_indicators: []
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const validateMaterialAuthenticity = useCallback(async (qrCode: string, materialData: any): Promise<boolean> => {
    try {
      // Enhanced QR code format validation
      if (!qrCode || typeof qrCode !== 'string') {
        return false;
      }

      // Sanitize QR code input
      const sanitizedQrCode = qrCode.trim().replace(/[^\w\-]/g, '');
      
      // Check QR code format and structure
      if (!sanitizedQrCode.startsWith('UJP-') || sanitizedQrCode.length < 15) {
        return false;
      }

      // Enhanced cryptographic checksum validation
      if (sanitizedQrCode.includes('-CHK')) {
        const parts = sanitizedQrCode.split('-CHK');
        const code = parts[0];
        const providedChecksum = parts[1];
        
        // Use crypto-js for proper hash validation
        const crypto = await import('crypto-js');
        const calculatedHash = crypto.SHA256(code + 'UJENZIPRO_SALT').toString();
        const calculatedChecksum = calculatedHash.slice(0, 8); // Use 8 chars for better security
        
        if (providedChecksum.toLowerCase() !== calculatedChecksum.toLowerCase()) {
          console.warn('QR Code checksum validation failed');
          return false;
        }
      }

      // Server-side validation through secure function
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_qr_code_server_side', {
          qr_code_param: sanitizedQrCode,
          material_data_param: materialData
        });

      if (validationError) {
        console.error('Server-side QR validation error:', validationError);
        return false;
      }

      // Check against database with additional security checks
      const { data, error } = await supabase
        .from('material_items')
        .select('id, qr_code, material_type, quantity, supplier_id, created_at, is_active')
        .eq('qr_code', sanitizedQrCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn('QR Code not found in database or inactive');
        return false;
      }

      // Enhanced material data consistency validation
      if (materialData) {
        const validationChecks = [
          data.material_type === materialData.material_type,
          Math.abs(data.quantity - materialData.quantity) < 0.01, // Allow small floating point differences
          data.supplier_id === materialData.supplier_id
        ];

        if (!validationChecks.every(check => check)) {
          console.warn('Material data consistency validation failed');
          return false;
        }
      }

      // Log successful validation for audit
      await supabase.rpc('log_qr_validation_success', {
        qr_code_param: sanitizedQrCode,
        material_id_param: data.id
      });

      return true;
    } catch (error) {
      console.error('Error validating material authenticity:', error);
      // Log validation failure for security monitoring
      await supabase.rpc('log_qr_validation_failure', {
        qr_code_param: qrCode,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, []);

  const assessMaterialQuality = useCallback(async (imageData: string): Promise<QualityAssessment> => {
    // AI-powered quality assessment (simplified implementation)
    const qualityFactors: string[] = [];
    const defectsDetected: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 85; // Default good quality

    // Simulate image analysis
    if (imageData) {
      // In production, this would use computer vision APIs
      const imageSize = imageData.length;
      
      if (imageSize < 10000) {
        qualityFactors.push('Low image resolution');
        qualityScore -= 10;
        recommendations.push('Take higher resolution photos for better assessment');
      }
      
      // Simulate defect detection
      if (Math.random() > 0.8) {
        defectsDetected.push('Surface irregularities detected');
        qualityScore -= 15;
      }
      
      if (Math.random() > 0.9) {
        defectsDetected.push('Color variation beyond normal range');
        qualityScore -= 10;
      }
    } else {
      qualityFactors.push('No image provided for visual assessment');
      qualityScore -= 5;
      recommendations.push('Provide material photos for comprehensive quality assessment');
    }

    // Determine overall quality
    let overallQuality: QualityAssessment['overall_quality'];
    if (qualityScore >= 90) overallQuality = 'excellent';
    else if (qualityScore >= 75) overallQuality = 'good';
    else if (qualityScore >= 60) overallQuality = 'acceptable';
    else if (qualityScore >= 40) overallQuality = 'poor';
    else overallQuality = 'rejected';

    return {
      overall_quality: overallQuality,
      quality_score: qualityScore,
      quality_factors: qualityFactors,
      defects_detected: defectsDetected,
      recommendations: recommendations
    };
  }, []);

  const detectCounterfeitQR = useCallback(async (qrCode: string): Promise<FraudIndicator[]> => {
    const indicators: FraudIndicator[] = [];

    try {
      // Check for suspicious patterns
      if (qrCode.includes('TEST') || qrCode.includes('FAKE')) {
        indicators.push({
          type: 'fake_qr',
          severity: 'high',
          description: 'QR code contains test/fake indicators',
          confidence: 95
        });
      }

      // Check for duplicate QR codes in recent scans
      const { data: recentScans } = await supabase
        .from('scanner_audit_log')
        .select('qr_code, created_at')
        .eq('qr_code', qrCode)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (recentScans && recentScans.length > 3) {
        indicators.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          description: 'QR code scanned multiple times recently',
          confidence: 75
        });
      }

      // Check QR code format integrity
      const expectedParts = 5; // UJP-MATERIAL-TYPE-ID-TIMESTAMP
      const actualParts = qrCode.split('-').length;
      
      if (actualParts < expectedParts) {
        indicators.push({
          type: 'tampered_code',
          severity: 'medium',
          description: 'QR code format appears incomplete or modified',
          confidence: 60
        });
      }

      // Check for sequential patterns (potential batch fraud)
      const qrNumber = qrCode.match(/\d+/g)?.join('');
      if (qrNumber && /^(\d)\1{4,}$/.test(qrNumber)) {
        indicators.push({
          type: 'fake_qr',
          severity: 'high',
          description: 'QR code contains suspicious sequential number pattern',
          confidence: 80
        });
      }

    } catch (error) {
      console.error('Error in counterfeit detection:', error);
      indicators.push({
        type: 'suspicious_pattern',
        severity: 'low',
        description: 'Could not complete fraud analysis',
        confidence: 30
      });
    }

    return indicators;
  }, []);

  return {
    recognizeMaterial,
    validateMaterialAuthenticity,
    assessMaterialQuality,
    detectCounterfeitQR,
    isAnalyzing,
    error
  };
};
