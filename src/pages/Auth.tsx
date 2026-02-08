// Auth Page - Build v2 - Force cache bust
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { User, Session } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator";
import { Github, Mail, KeyRound, CheckCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

console.log('🔐 Auth.tsx BUILD v6 - IMMEDIATE REDIRECT Feb 8 2026');

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get redirect parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect') || null;
  const liteParam = urlParams.get('lite');
  // Only use lite mode if explicitly requested with lite=1, NOT just because there's a redirect
  const liteMode = liteParam === '1';

  // Simple redirect when shouldRedirect is set
  useEffect(() => {
    if (shouldRedirect) {
      console.log('🔐 FORCING REDIRECT to:', shouldRedirect);
      // Force a full page navigation - this WILL work
      window.location.replace(shouldRedirect);
    }
  }, [shouldRedirect]);

  useEffect(() => {
    // Check if already logged in on page load - redirect IMMEDIATELY
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('🔐 Already logged in, redirecting NOW to:', redirectTo || '/home');
        window.location.href = redirectTo || '/home';
      }
    });
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email: email
          }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is enabled in Supabase
        console.log('Email confirmation required');
        return { error: null, needsConfirmation: true };
      }
      
      console.log('Sign up successful:', data);
      return { error: null, needsConfirmation: false };
    } catch (err: any) {
      console.error('Sign up exception:', err);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      console.log('Sign in successful:', data);
      return { error: null };
    } catch (err: any) {
      console.error('Sign in exception:', err);
      return { error: err };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: error.message
        });
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, isSignUp: boolean) => {
    e.preventDefault();
    setLoading(true);
    
    // Safety timeout - reset loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => setLoading(false), 5000);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (result.error) {
        setLoading(false); // Reset loading on error
        const error = result.error;
        if (error.message.includes("User already registered")) {
          toast({
            variant: "destructive",
            title: "Account exists",
            description: "This email is already registered. Please sign in instead."
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Invalid credentials",
            description: "Please check your email and password."
          });
        } else if (error.message.toLowerCase().includes("captcha")) {
          toast({
            variant: "destructive",
            title: "⚠️ CAPTCHA Protection Enabled",
            description: "Please disable CAPTCHA in Supabase Dashboard: Authentication → Providers → Email → Turn OFF 'Enable CAPTCHA protection'"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Authentication error",
            description: error.message
          });
        }
        return;
      }
      
      if (isSignUp) {
        setLoading(false); // Reset loading after signup
        if ('needsConfirmation' in result && result.needsConfirmation) {
          toast({
            title: "📧 Check your email",
            description: "We've sent a confirmation link to verify your account. Click the link to complete signup.",
          });
        } else {
          toast({
            title: "✅ Account created!",
            description: "Welcome to UjenziXform! Taking you to home...",
          });
          setTimeout(() => {
            const returnTo = sessionStorage.getItem('returnTo');
            if (returnTo) {
              sessionStorage.removeItem('returnTo');
              window.location.href = returnTo;
            } else {
              window.location.href = '/home';
            }
          }, 1500);
        }
        return;
      }
      
      // ✅ Successful sign in - redirect IMMEDIATELY
      toast({ title: "✅ Welcome back!", description: "Redirecting..." });
      clearTimeout(safetyTimeout);
      setLoading(false);
      
      // Redirect NOW - don't wait for anything else
      const target = redirectTo || '/home';
      console.log('🔐 REDIRECTING NOW to:', target);
      window.location.href = target;
      return; // Stop execution
      
    } catch (error: any) {
      console.error('Auth error:', error);
      clearTimeout(safetyTimeout);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "An unexpected error occurred."
      });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error sending reset email",
          description: error.message
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link. Please check your inbox."
        });
        setShowResetDialog(false);
        setResetEmail("");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while sending reset email."
      });
    } finally {
      setResetLoading(false);
    }
  };

  const authTabs = (
    <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => signInWithProvider('google')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => signInWithProvider('github')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
                
                {/* Forgot Password Link - After Sign In Button */}
                <div className="flex justify-start mt-4">
                  <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-primary hover:underline p-0 h-auto"
                      >
                        Forgot password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-transparent border-0 shadow-none p-0">
                      <SimplePasswordReset onBack={() => setShowResetDialog(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => signInWithProvider('google')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => signInWithProvider('github')}
                    disabled={loading}
                    className="w-full"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-5">
                  {/* Super Simple - Just 2 Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-base font-semibold">Your Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      required
                      autoFocus
                      autoComplete="email"
                      className="h-14 text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-base font-semibold">Choose Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-14 text-lg"
                    />
                  </div>

                  {/* Instant Access Promise */}
                  <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-300 border-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertDescription className="text-sm font-medium text-gray-800">
                      <strong className="text-green-700 text-base">⚡ Instant Access!</strong><br/>
                      No email verification needed. Start browsing materials immediately after signup.
                    </AlertDescription>
                  </Alert>

                  {/* Big, Prominent Signup Button */}
                  <Button 
                    type="submit" 
                    className="w-full h-16 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-lg shadow-xl" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                        Creating Your Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-6 w-6 mr-2" />
                        Get Started - It's Free! 🚀
                      </>
                    )}
                  </Button>

                  {/* Trust Signals */}
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Free Forever
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      No Credit Card
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      850+ Suppliers
                    </span>
                  </div>
                </form>
              </div>
            </TabsContent>
    </Tabs>
  );

  if (liteMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to UjenziXform</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>{authTabs}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/kenyan-workers.jpg')`,
          backgroundColor: '#1e3a5f',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
        role="img"
        aria-label="Kenyan construction workers in yellow hard hats reviewing blueprints at steel construction site"
      />
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      <AnimatedSection animation="scaleIn" className="relative z-10">
        <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl border-white/70">
          <CardHeader className="text-center">
            <CardTitle>Welcome to UjenziXform</CardTitle>
            <CardDescription>Jenga na UjenziXform - Build with Kenya's Premier Construction Platform</CardDescription>
          </CardHeader>
          <CardContent>{authTabs}</CardContent>
        </Card>
        {/* Admin Access Card - Compact & Centered */}
        <Card className="mt-4 max-w-xs mx-auto bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Admin Access</h4>
                <p className="text-xs text-slate-400 mt-0.5">UjenziXform Staff Only</p>
              </div>
              <Link to="/admin-login" className="w-full mt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 text-xs h-8"
                >
                  <KeyRound className="h-3 w-3 mr-1.5" />
                  Staff Portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
  );
};

export default Auth;
