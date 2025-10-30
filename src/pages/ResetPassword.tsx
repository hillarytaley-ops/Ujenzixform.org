import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { KeyRound, Lock, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid or expired reset link",
          description: "Please request a new password reset link."
        });
        setTimeout(() => navigate("/auth"), 3000);
      }
    });
  }, [navigate, toast]);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same."
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long."
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error resetting password",
          description: error.message
        });
      } else {
        toast({
          title: "Password updated successfully!",
          description: "You can now sign in with your new password.",
          action: <CheckCircle className="h-5 w-5 text-green-600" />
        });
        setTimeout(() => navigate("/auth"), 2000);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('/auth-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
          role="img"
          aria-label="Kenyan construction workers with hard hats reviewing construction project plans at building site"
        />
        
        {/* No overlay - 100% clear background! */}
        
        <AnimatedSection animation="scaleIn" className="relative z-10">
          <Card className="w-full max-w-md bg-white/70 backdrop-blur-2xl shadow-2xl border-white/90">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Validating Reset Link...</CardTitle>
              <CardDescription>
                Please wait while we verify your password reset link.
              </CardDescription>
            </CardHeader>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Beautiful Kenyan Construction Workers with Yellow Hard Hats Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://1drv.ms/u/c/ab1ea28a217e89bc/ETlICCcd8txOsCYnAv6MkgsBvKgrzcT341mNdzx1zw0MIA?e=hfoSfp'), url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-gW4eb5K3am2BERQxC6jCNuhvaVOrTl.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
        role="img"
        aria-label="Kenyan construction workers in yellow hard hats reviewing blueprints at steel construction site"
      />
      
      {/* Semi-transparent overlay for readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>
      
      <AnimatedSection animation="scaleIn" className="relative z-10">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl border-white/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
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
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting password..." : "Reset Password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
  );
};

export default ResetPassword;



