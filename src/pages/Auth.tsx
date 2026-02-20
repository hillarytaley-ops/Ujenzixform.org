// Auth Page - Build v11 - Auto-redirect users with roles to their dashboards
import { useState, useEffect, useRef } from "react";
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
import { Github, Mail, KeyRound, CheckCircle, Loader2, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

console.log('🔐 Auth.tsx BUILD v12 - Mobile-friendly with safety timeouts Feb 21 2026');

// Helper function to get dashboard path based on role
const getDashboardForRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'supplier':
      return '/supplier-dashboard';
    case 'delivery':
    case 'delivery_provider':
      return '/delivery-dashboard';
    case 'professional_builder':
      return '/professional-builder-dashboard';
    case 'private_client':
      return '/private-client-dashboard';
    default:
      return '/home';
  }
};

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const hasSignedIn = useRef(false); // Track if user explicitly signed in this session
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get redirect parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect') || null;
  const liteParam = urlParams.get('lite');
  const forceLogout = urlParams.get('logout') === '1'; // Allow force logout via URL
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

  // Check for existing session on mount - AUTO-REDIRECT users with roles to their dashboards
  useEffect(() => {
    // Safety timeout - ensure checkingSession is set to false after 3 seconds max
    // This prevents the page from hanging on slow mobile connections
    const safetyTimeout = setTimeout(() => {
      console.log('🔐 Safety timeout - showing auth form');
      setCheckingSession(false);
    }, 3000);

    const checkExistingSession = async () => {
      // If force logout requested, sign out first
      if (forceLogout) {
        console.log('🔐 Force logout requested');
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('🔐 Sign out error (ignored):', e);
        }
        // Remove the logout param from URL
        window.history.replaceState({}, '', window.location.pathname);
        clearTimeout(safetyTimeout);
        setCheckingSession(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('🔐 Existing session found:', session.user.email);
          setExistingSession(session);
          setUser(session.user);
          
          // Check if user has a role and auto-redirect to their dashboard
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle();
            
            if (!roleError && roleData?.role) {
              const dashboardPath = getDashboardForRole(roleData.role);
              console.log('🔐 User has role:', roleData.role, '- Redirecting to:', dashboardPath);
              // Save role to localStorage for instant access
              localStorage.setItem('user_role', roleData.role);
              localStorage.setItem('user_role_id', session.user.id);
              // Redirect to appropriate dashboard
              clearTimeout(safetyTimeout);
              window.location.href = dashboardPath;
              return;
            } else {
              console.log('🔐 No role found for user, staying on auth page');
            }
          } catch (error) {
            console.error('🔐 Error checking user role:', error);
          }
        }
      } catch (sessionError) {
        console.error('🔐 Error getting session:', sessionError);
      }
      
      clearTimeout(safetyTimeout);
      setCheckingSession(false);
    };
    
    checkExistingSession();
    
    return () => clearTimeout(safetyTimeout);
  }, [forceLogout]);

  // Listen for auth state changes - ONLY redirect on explicit SIGNED_IN event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event:', event, session?.user?.email);
      
      // ONLY redirect on explicit sign-in, NOT on INITIAL_SESSION
      // This prevents auto-redirect when user wants to sign in as different account
      if (hasSignedIn.current && session?.user && event === 'SIGNED_IN') {
        // Set a timeout for role check - don't hang on slow connections
        const roleCheckTimeout = setTimeout(() => {
          console.log('🔐 Role check timeout - redirecting to home');
          window.location.href = redirectTo || '/home';
        }, 5000);
        
        // Check if user has a role and redirect to their dashboard
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();
          
          clearTimeout(roleCheckTimeout);
          
          if (roleData?.role) {
            const dashboardPath = getDashboardForRole(roleData.role);
            console.log('🔐 Auth event: User has role:', roleData.role, '- Redirecting to:', dashboardPath);
            localStorage.setItem('user_role', roleData.role);
            localStorage.setItem('user_role_id', session.user.id);
            window.location.href = redirectTo || dashboardPath;
            return;
          }
        } catch (error) {
          console.error('🔐 Auth event: Error checking role:', error);
          clearTimeout(roleCheckTimeout);
        }
        
        // Fallback to home if no role found
        const target = redirectTo || '/home';
        console.log('🔐 REDIRECTING after explicit sign-in to:', target);
        window.location.href = target;
      }
    });
    
    return () => subscription.unsubscribe();
  }, [redirectTo]);

  // Sign out current user to allow signing in as different account
  const handleSignOutToSwitch = async () => {
    try {
      await supabase.auth.signOut();
      setExistingSession(null);
      setUser(null);
      toast({
        title: "Signed out",
        description: "You can now sign in with a different account.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Mark that user is explicitly signing up
      hasSignedIn.current = true;
      
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
        hasSignedIn.current = false;
        return { error };
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is enabled in Supabase
        console.log('Email confirmation required');
        hasSignedIn.current = false;
        return { error: null, needsConfirmation: true };
      }
      
      console.log('Sign up successful:', data);
      return { error: null, needsConfirmation: false };
    } catch (err: any) {
      console.error('Sign up exception:', err);
      hasSignedIn.current = false;
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Mark that user is explicitly signing in (not auto-redirect from cached session)
      hasSignedIn.current = true;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Sign in error:', error);
        hasSignedIn.current = false; // Reset on error
        return { error };
      }
      
      console.log('Sign in successful:', data);
      return { error: null };
    } catch (err: any) {
      console.error('Sign in exception:', err);
      hasSignedIn.current = false; // Reset on error
      return { error: err };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setLoading(true);
    // Mark explicit sign-in
    hasSignedIn.current = true;
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        hasSignedIn.current = false;
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: error.message
        });
      }
    } catch (error) {
      hasSignedIn.current = false;
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
    
    // Safety timeout - reset loading after 3 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      console.log('🔐 Safety timeout triggered - resetting loading state');
      setLoading(false);
    }, 3000);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      console.log('🔐 Attempting', isSignUp ? 'signup' : 'signin', 'for:', email);
      
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      clearTimeout(safetyTimeout);

      if (result.error) {
        setLoading(false); // Reset loading on error
        hasSignedIn.current = false;
        const error = result.error;
        console.error('🔐 Auth error:', error.message);
        
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
      
      console.log('🔐 Auth successful!');
      
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
          // Redirect immediately for signup
          const target = redirectTo || '/home';
          console.log('🔐 REDIRECTING after signup to:', target);
          window.location.href = target;
        }
        return;
      }
      
      // ✅ Successful sign in - check for role and redirect to appropriate dashboard
      toast({ title: "✅ Welcome back!", description: "Redirecting..." });
      setLoading(false);
      
      // Set a fallback redirect timeout - don't hang on slow connections
      const redirectTimeout = setTimeout(() => {
        console.log('🔐 Role check timeout - redirecting to home');
        window.location.href = redirectTo || '/home';
      }, 5000);
      
      // Check if user has a role and redirect to their dashboard
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .limit(1)
            .maybeSingle();
          
          clearTimeout(redirectTimeout);
          
          if (roleData?.role) {
            const dashboardPath = getDashboardForRole(roleData.role);
            console.log('🔐 User has role:', roleData.role, '- Redirecting to:', dashboardPath);
            localStorage.setItem('user_role', roleData.role);
            localStorage.setItem('user_role_id', currentUser.id);
            window.location.href = redirectTo || dashboardPath;
            return;
          }
        } else {
          clearTimeout(redirectTimeout);
        }
      } catch (error) {
        console.error('🔐 Error checking role on sign in:', error);
        clearTimeout(redirectTimeout);
      }
      
      // Fallback: Redirect to home if no role found
      const target = redirectTo || '/home';
      console.log('🔐 REDIRECTING NOW to:', target);
      window.location.href = target;
      
    } catch (error: any) {
      console.error('🔐 Auth exception:', error);
      clearTimeout(safetyTimeout);
      setLoading(false);
      hasSignedIn.current = false;
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

  // Show existing session banner if user is already logged in
  const existingSessionBanner = existingSession && (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="text-blue-800">
            Currently signed in as <strong>{existingSession.user.email}</strong>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const target = redirectTo || '/home';
              window.location.href = target;
            }}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            Continue as {existingSession.user.email?.split('@')[0]}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSignOutToSwitch}
            className="text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Switch Account
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  const authTabs = (
    <Tabs defaultValue="signup" className="w-full">
            {existingSessionBanner}
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
