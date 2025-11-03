import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft, Copy, Check } from 'lucide-react';

interface InstantPasswordResetProps {
  onBack?: () => void;
}

export const InstantPasswordReset: React.FC<InstantPasswordResetProps> = ({ onBack }) => {
  const [step, setStep] = useState<'email' | 'verify' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const { toast } = useToast();

  // Cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Step 1: Request reset code via email (TRUE OTP)
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Use Supabase's OTP system for recovery - sends 6-digit code!
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          data: {
            purpose: 'password_reset' // Track this is for password reset
          }
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Code sent!',
        description: 'Check your email for a 6-digit verification code (arrives in 30 seconds)',
      });

      setStep('verify');
      setResendCooldown(60);
    } catch (error: any) {
      console.error('Error sending code:', error);
      
      // User-friendly error messages
      if (error.message?.includes('rate limit')) {
        toast({
          title: 'Too many requests',
          description: 'Please wait a moment before requesting another code',
          variant: 'destructive',
        });
      } else if (error.message?.includes('not found') || error.message?.includes('User')) {
        toast({
          title: 'Email not found',
          description: 'This email is not registered. Please sign up first.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error sending code',
          description: 'Please try again or contact support',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code and reset password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate code
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the complete 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure both passwords are identical',
        variant: 'destructive',
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // First, verify the OTP code
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: verificationCode,
        type: 'email', // This is the OTP type
      });

      if (verifyError) throw verifyError;

      // If OTP is valid, we're now logged in - update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setStep('success');
      
      toast({
        title: '🎉 Password Reset Complete!',
        description: 'Your password has been successfully updated',
      });

      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);

    } catch (error: any) {
      console.error('Error verifying code:', error);
      
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        toast({
          title: 'Invalid or expired code',
          description: 'The code is incorrect or has expired. Please request a new one.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error resetting password',
          description: 'Please try again or request a new code',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          data: {
            purpose: 'password_reset'
          }
        }
      });

      if (error) throw error;

      toast({
        title: '✅ New code sent!',
        description: 'Check your email for a fresh 6-digit code',
      });

      setResendCooldown(60);
      setVerificationCode(''); // Clear old code
    } catch (error) {
      toast({
        title: 'Error resending code',
        description: 'Please try again in a moment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
      {/* Step 1: Enter Email */}
      {step === 'email' && (
        <>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email to receive a 6-digit verification code
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Use the email you registered with
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>⚡ Instant Code:</strong> You'll receive a 6-digit code in your email within 30 seconds. 
                  No links to click - just enter the code! Works on ALL devices!
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Get 6-Digit Code
                  </>
                )}
              </Button>

              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={onBack}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              )}
            </form>
          </CardContent>
        </>
      )}

      {/* Step 2: Enter 6-Digit Code and New Password */}
      {step === 'verify' && (
        <>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              Code sent to <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* 6-Digit Code Input */}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-base font-semibold">6-Digit Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                  className="text-center text-3xl tracking-[0.5em] font-mono h-16 font-bold"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code from your email
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-base font-semibold">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  className="h-12"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-base font-semibold">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  className="h-12"
                />
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match ✓
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700" 
                disabled={loading || verificationCode.length !== 6 || !newPassword || !confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>

              {/* Resend and Back buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setStep('email');
                    setVerificationCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                  className="p-0 h-auto text-sm"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Change email
                </Button>
                
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  className="p-0 h-auto text-sm"
                >
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <span className="text-blue-600">Resend code</span>
                  )}
                </Button>
              </div>
            </form>

            {/* Help text */}
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> Check your spam folder if you don't see the email. 
                Code expires in 1 hour. Just copy and paste the 6 digits!
              </AlertDescription>
            </Alert>
          </CardContent>
        </>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Password Reset Complete! 🎉
            </CardTitle>
            <CardDescription className="text-base">
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You can now sign in with your new password. Redirecting in 2 seconds...
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => window.location.href = '/auth'}
              className="w-full h-12 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Go to Sign In Now
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  );
};

