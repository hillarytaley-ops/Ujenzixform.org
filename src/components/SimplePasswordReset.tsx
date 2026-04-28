import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, AlertCircle, Key, CheckCircle } from 'lucide-react';

interface SimplePasswordResetProps {
  onBack?: () => void;
  /** Alias used by some parent pages (e.g. Auth dialog). */
  onClose?: () => void;
  onSuccess?: () => void;
}

const RESET_REDIRECT_PATH = '/reset-password';

export const SimplePasswordReset: React.FC<SimplePasswordResetProps> = ({
  onBack,
  onClose,
  onSuccess,
}) => {
  const handleBack = onBack ?? onClose ?? onSuccess;
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
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
      // Recovery email (not magic link): use Reset Password template + verify type `recovery`.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${RESET_REDIRECT_PATH}`,
      });

      if (error) throw error;

      setStep('code');
      setResendCooldown(60);
      
      toast({
        title: '✅ Code sent!',
        description: 'Check your email for a 6-digit verification code',
      });

    } catch (error: any) {
      console.error('Send code error:', error);
      
      toast({
        title: 'Error sending code',
        description: 'This email may not be registered. Please sign up first.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure both passwords match',
        variant: 'destructive',
      });
      return;
    }

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
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setStep('success');
      
      toast({
        title: '🎉 Password reset complete!',
        description: 'You can now sign in with your new password',
      });

      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);

    } catch (error: any) {
      console.error('Verify error:', error);
      
      toast({
        title: 'Invalid or expired code',
        description: 'Please request a new code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${RESET_REDIRECT_PATH}`,
      });

      if (error) throw error;

      setResendCooldown(60);
      setCode('');
      
      toast({
        title: '✅ New code sent!',
        description: 'Check your email for a fresh code',
      });

    } catch (error) {
      toast({
        title: 'Error resending code',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Enter Email
  if (step === 'email') {
    return (
      <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Get a 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSendCode} className="space-y-4">
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
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                <strong>Quick reset:</strong> You should receive a 6-digit code in the password-reset email.
                If the message looks empty, check spam — your project email template may need a visible code line (see Supabase Reset Password template).
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700" disabled={loading}>
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

            {handleBack && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Enter Code and New Password
  if (step === 'code') {
    return (
      <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Enter Code</CardTitle>
          <CardDescription>
            Code sent to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            {/* 6-Digit Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="font-semibold">6-Digit Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                disabled={loading}
                autoFocus
                className="text-center text-4xl tracking-[0.5em] font-mono h-16 font-bold"
              />
              <p className="text-xs text-center text-muted-foreground">
                Enter the 6-digit code from your email
              </p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-pass">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                placeholder="Min 8 characters"
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
              <Label htmlFor="confirm-pass">Confirm Password</Label>
              <Input
                id="confirm-pass"
                type="password"
                placeholder="Re-enter password"
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
                  Passwords match
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-green-600 hover:bg-green-700" 
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Reset Password
                </>
              )}
            </Button>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setStep('email')}
                className="p-0 h-auto text-sm"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Change email
              </Button>

              <Button
                type="button"
                variant="link"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="p-0 h-auto text-sm"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
              </Button>
            </div>
          </form>

          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              Didn't receive code? Check spam folder or click resend above.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Success
  return (
    <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-green-600">Success! 🎉</CardTitle>
        <CardDescription>
          Password reset complete
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Alert className="bg-green-50 border-green-200 mb-4">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your password has been updated. Redirecting to login...
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => window.location.href = '/auth'}
          className="w-full h-12 bg-green-600 hover:bg-green-700"
        >
          Go to Sign In
        </Button>
      </CardContent>
    </Card>
  );
};

