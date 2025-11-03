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

  // Step 1: Request reset code via email
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
      // Use Supabase's password reset with OTP
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: '✅ Reset link sent!',
        description: 'Check your email and click the reset link. It will work on all devices.',
      });

      setStep('verify');
      setResendCooldown(60);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      
      // User-friendly error messages
      if (error.message?.includes('rate limit')) {
        toast({
          title: 'Too many requests',
          description: 'Please wait a moment before requesting another code',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error sending reset email',
          description: 'Make sure your email is registered with UjenziPro',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User gets link, we show instructions
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    toast({
      title: 'Check your email',
      description: 'Click the reset link in your email to continue',
    });
  };

  // Resend reset link
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: '✅ New link sent!',
        description: 'Check your email for a fresh reset link',
      });

      setResendCooldown(60);
    } catch (error) {
      toast({
        title: 'Error resending link',
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
              Enter your email to receive a secure password reset link
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
                  <strong>⚡ Quick Process:</strong> You'll receive a reset link in your email within 1-2 minutes. 
                  The link will work on all devices and browsers!
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Send Reset Link
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

      {/* Step 2: Check Email for Link */}
      {step === 'verify' && (
        <>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">✅ Email Sent!</CardTitle>
            <CardDescription>
              Check <strong className="text-foreground">{email}</strong> for the reset link
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                <strong>Password reset link sent successfully!</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                How to Reset Your Password:
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside ml-2">
                <li><strong>Open the email</strong> from UjenziPro (check spam if needed)</li>
                <li><strong>Click the "Reset Password" link</strong> in the email</li>
                <li>You'll be taken to a secure reset page</li>
                <li><strong>Enter your new password</strong> twice</li>
                <li>Click "Reset Password" button</li>
                <li>Done! Sign in with your new password ✅</li>
              </ol>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>💡 Troubleshooting:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Check your <strong>spam/junk folder</strong></li>
                  <li>• Email can take <strong>1-2 minutes</strong> to arrive</li>
                  <li>• Link works for <strong>1 hour</strong></li>
                  <li>• Click "Resend" if you don't receive it</li>
                  <li>• Make sure you can access email on your device</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                className="w-full h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend available in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Reset Link
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep('email');
                  setVerificationCode('');
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use Different Email
              </Button>

              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              )}
            </div>
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

