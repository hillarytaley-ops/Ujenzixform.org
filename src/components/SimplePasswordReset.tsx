import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

interface SimplePasswordResetProps {
  onBack?: () => void;
}

export const SimplePasswordReset: React.FC<SimplePasswordResetProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSendReset = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      
      toast({
        title: '✅ Reset email sent!',
        description: 'Check your inbox for the password reset link',
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      
      toast({
        title: 'Error sending reset email',
        description: error.message || 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            Reset link sent to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-sm text-green-800">
              <strong>✅ Email sent successfully!</strong> Check your inbox and spam folder.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm text-blue-900">📧 Next Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Look for email from UjenziPro</li>
              <li>Click the "Reset Password" link</li>
              <li>Enter your new password</li>
              <li>Sign in with new password</li>
            </ol>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Troubleshooting:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Email can take 1-5 minutes to arrive</li>
                <li>• Check spam/junk folder</li>
                <li>• Link expires in 1 hour</li>
                <li>• Try with different browser if link doesn't work</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Try Different Email
            </Button>

            {onBack && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email to receive a password reset link
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSendReset} className="space-y-4">
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
              Enter the email you used to sign up
            </p>
          </div>

          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700" disabled={loading}>
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

        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Can't access your email?</strong> Contact support at support@ujenzipro.co.ke 
            or create a new account with a different email.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

