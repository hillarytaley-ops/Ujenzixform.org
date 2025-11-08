import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface QuickPasswordResetProps {
  onBack?: () => void;
}

export const QuickPasswordReset: React.FC<QuickPasswordResetProps> = ({ onBack }) => {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Step 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send password reset with OTP
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Reset code sent!',
        description: 'Check your email for the 6-digit code (check spam folder too)',
      });

      setStep('code');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: 'Error sending code',
        description: error instanceof Error ? error.message : 'Failed to send reset code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive',
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP and update password
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (error) throw error;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setStep('success');
      
      toast({
        title: 'Password reset successful!',
        description: 'You can now sign in with your new password',
      });

      // Auto redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/auth';
      }, 3000);

    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Invalid code',
        description: 'The code you entered is invalid or expired. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Code resent!',
        description: 'A new 6-digit code has been sent to your email',
      });

      setResendCooldown(60);
    } catch (error) {
      toast({
        title: 'Error resending code',
        description: 'Failed to resend code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl border-white/70">
      {/* Step 1: Enter Email */}
      {step === 'email' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOTP} className="space-y-4">
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
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>

              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onBack}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              )}
            </form>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>⚡ Fast Reset:</strong> You'll receive a 6-digit code via email within 30 seconds. 
                Check your spam folder if you don't see it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </>
      )}

      {/* Step 2: Enter OTP and New Password */}
      {step === 'code' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the code from your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setStep('email')}
                  disabled={loading}
                  className="p-0 h-auto"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Change email
                </Button>
                
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={loading || resendCooldown > 0}
                  className="p-0 h-auto"
                >
                  {resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    'Resend code'
                  )}
                </Button>
              </div>
            </form>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Didn't receive the code?</strong> Check your spam folder or click "Resend code" above.
              </AlertDescription>
            </Alert>
          </CardContent>
        </>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Password Reset Successfully!</CardTitle>
            <CardDescription>
              Your password has been updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You can now sign in with your new password.
            </p>
            <Button
              onClick={() => window.location.href = '/auth'}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  );
};


