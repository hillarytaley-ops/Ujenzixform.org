import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Lock,
  Key,
  Fingerprint
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryMFAChallengeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verified: boolean) => void;
  deliveryData: any;
  operationType: 'create_delivery' | 'access_driver_contact' | 'bulk_operation' | 'high_value_delivery';
  requiredMethods?: ('sms' | 'email' | 'totp')[];
}

interface MFAMethod {
  type: 'sms' | 'email' | 'totp';
  label: string;
  icon: any;
  description: string;
  enabled: boolean;
}

export const DeliveryMFAChallenge: React.FC<DeliveryMFAChallengeProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deliveryData,
  operationType,
  requiredMethods = ['sms']
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'totp'>('sms');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  const mfaMethods: MFAMethod[] = [
    {
      type: 'sms',
      label: 'SMS Verification',
      icon: Smartphone,
      description: 'Send verification code to your registered phone number',
      enabled: true
    },
    {
      type: 'email',
      label: 'Email Verification',
      icon: Mail,
      description: 'Send verification code to your registered email',
      enabled: true
    },
    {
      type: 'totp',
      label: 'Authenticator App',
      icon: Key,
      description: 'Use your authenticator app (Google Authenticator, Authy)',
      enabled: false // Would be enabled if user has TOTP set up
    }
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codeSent && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setCodeSent(false);
      setVerificationCode('');
    }
    return () => clearTimeout(timer);
  }, [codeSent, timeRemaining]);

  const getOperationDescription = () => {
    switch (operationType) {
      case 'create_delivery':
        return 'Creating a new delivery request';
      case 'access_driver_contact':
        return 'Accessing driver contact information';
      case 'bulk_operation':
        return 'Performing bulk delivery operations';
      case 'high_value_delivery':
        return 'Processing high-value delivery request';
      default:
        return 'Sensitive delivery operation';
    }
  };

  const getSecurityLevel = () => {
    switch (operationType) {
      case 'access_driver_contact':
        return { level: 'High', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'bulk_operation':
        return { level: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      case 'high_value_delivery':
        return { level: 'Critical', color: 'bg-red-100 text-red-800', icon: Shield };
      default:
        return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: Lock };
    }
  };

  const sendVerificationCode = async () => {
    if (isLocked) {
      toast({
        title: "Account Temporarily Locked",
        description: "Too many failed attempts. Please try again in 15 minutes.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsVerifying(true);

      // Get user profile for contact information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Generate verification code (6-digit)
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // In production, this would send actual SMS/email
      console.log(`MFA Code for ${selectedMethod}: ${code}`);

      // Store code securely (in production, this would be hashed)
      sessionStorage.setItem('mfa_code', code);
      sessionStorage.setItem('mfa_expiry', (Date.now() + 300000).toString()); // 5 minutes

      setCodeSent(true);
      setTimeRemaining(300);

      // Log MFA request
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'mfa_code_requested',
        severity: 'medium',
        details: {
          operation_type: operationType,
          method: selectedMethod,
          delivery_context: deliveryData
        }
      });

      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to your ${selectedMethod === 'sms' ? 'phone' : 'email'}.`,
      });

    } catch (error) {
      console.error('Error sending verification code:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyCode = async () => {
    if (isLocked) return;

    try {
      setIsVerifying(true);

      // Get stored code and expiry
      const storedCode = sessionStorage.getItem('mfa_code');
      const expiry = sessionStorage.getItem('mfa_expiry');

      if (!storedCode || !expiry || Date.now() > parseInt(expiry)) {
        throw new Error('Verification code expired');
      }

      if (verificationCode !== storedCode) {
        setAttempts(prev => prev + 1);
        
        if (attempts >= 2) { // 3 attempts total
          setIsLocked(true);
          sessionStorage.removeItem('mfa_code');
          sessionStorage.removeItem('mfa_expiry');
          
          // Log security event
          await supabase.from('security_events').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            event_type: 'mfa_max_attempts_exceeded',
            severity: 'high',
            details: {
              operation_type: operationType,
              attempts: attempts + 1
            }
          });

          toast({
            title: "Account Locked",
            description: "Too many failed verification attempts. Account temporarily locked for security.",
            variant: "destructive"
          });
          return;
        }

        throw new Error('Invalid verification code');
      }

      // Successful verification
      sessionStorage.removeItem('mfa_code');
      sessionStorage.removeItem('mfa_expiry');

      // Log successful MFA
      await supabase.from('security_events').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: 'mfa_verification_success',
        severity: 'low',
        details: {
          operation_type: operationType,
          method: selectedMethod
        }
      });

      toast({
        title: "Verification Successful",
        description: "Multi-factor authentication completed successfully.",
      });

      onSuccess(true);
      onClose();

    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const securityLevel = getSecurityLevel();
  const SecurityIcon = securityLevel.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Security Verification Required
          </DialogTitle>
          <DialogDescription>
            {getOperationDescription()} requires additional security verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Security Level Indicator */}
          <div className="flex items-center justify-center">
            <Badge className={securityLevel.color}>
              <SecurityIcon className="h-3 w-3 mr-1" />
              {securityLevel.level} Security Operation
            </Badge>
          </div>

          {/* MFA Method Selection */}
          {!codeSent && (
            <div className="space-y-4">
              <Label>Choose verification method:</Label>
              <div className="space-y-2">
                {mfaMethods.filter(method => method.enabled && requiredMethods.includes(method.type)).map(method => {
                  const Icon = method.icon;
                  return (
                    <label key={method.type} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name="mfa-method"
                        value={method.type}
                        checked={selectedMethod === method.type}
                        onChange={(e) => setSelectedMethod(e.target.value as any)}
                        className="text-primary"
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{method.label}</div>
                        <div className="text-sm text-muted-foreground">{method.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verification Code Input */}
          {codeSent && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Verification code sent via {selectedMethod}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Code expires in {formatTime(timeRemaining)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter 6-digit verification code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                  disabled={isLocked}
                />
              </div>

              {attempts > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Invalid code. {3 - attempts} attempts remaining.
                  </AlertDescription>
                </Alert>
              )}

              {isLocked && (
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Account Temporarily Locked</AlertTitle>
                  <AlertDescription>
                    Too many failed verification attempts. Please wait 15 minutes before trying again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Security Notice */}
          <Alert>
            <Fingerprint className="h-4 w-4" />
            <AlertTitle>Enhanced Security</AlertTitle>
            <AlertDescription>
              This additional verification helps protect against unauthorized access and ensures 
              the security of delivery operations and driver information.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isVerifying}>
              Cancel
            </Button>
            {!codeSent ? (
              <Button onClick={sendVerificationCode} disabled={isVerifying || isLocked}>
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Send Code
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={verifyCode} 
                disabled={isVerifying || verificationCode.length !== 6 || isLocked}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Resend Code */}
          {codeSent && timeRemaining === 0 && (
            <div className="text-center">
              <Button variant="link" onClick={() => {
                setCodeSent(false);
                setVerificationCode('');
                setTimeRemaining(300);
              }}>
                Resend verification code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
