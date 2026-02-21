// Auth Page - Build v19 - FAST REDIRECT with timeout
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { Separator } from "@/components/ui/separator";
import { Github, Mail, KeyRound, CheckCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

console.log('🔐 Auth.tsx BUILD v20 - FIX STUCK LOADING Feb 21 2026');

// Get dashboard path for a role
const getDashboardForRole = (role: string): string => {
  const dashboards: Record<string, string> = {
    'admin': '/admin-dashboard',
    'supplier': '/supplier-dashboard',
    'delivery': '/delivery-dashboard',
    'delivery_provider': '/delivery-dashboard',
    'professional_builder': '/professional-builder-dashboard',
    'private_client': '/private-client-dashboard',
  };
  return dashboards[role] || '/home';
};

// Fetch role and redirect to dashboard - with 3 second timeout
const redirectToDashboard = async (userId: string): Promise<boolean> => {
  console.log('🔐 Fetching role for user:', userId);
  
  // Create a promise that rejects after 3 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Role fetch timeout')), 3000);
  });
  
  // Create the actual fetch promise
  const fetchPromise = (async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    console.log('🔐 Role query result:', { data, error });
    
    if (!error && data?.role) {
      return data.role;
    }
    return null;
  })();
  
  try {
    // Race between fetch and timeout
    const role = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (role) {
      const dashboard = getDashboardForRole(role);
      console.log('🔐 REDIRECTING NOW to:', dashboard, 'for role:', role);
      localStorage.setItem('user_role', role);
      // Use replace to prevent back button returning to auth
      window.location.replace(dashboard);
      return true;
    }
  } catch (e) {
    console.error('🔐 Role fetch error or timeout:', e);
  }
  
  return false;
};

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Controlled form inputs
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  
  const isSubmitting = useRef(false);
  const { toast } = useToast();

  // ON PAGE LOAD: Check if user has session + role, redirect to dashboard
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🔐 Session found for:', session.user.email);
          const redirected = await redirectToDashboard(session.user.id);
          if (redirected) return; // User redirected to dashboard
        }
      } catch (e) {
        console.error('🔐 Session check error:', e);
      }
      
      // No session or no role - show login form
      setCheckingSession(false);
    };
    
    // Safety timeout
    const timeout = setTimeout(() => setCheckingSession(false), 3000);
    checkAndRedirect();
    return () => clearTimeout(timeout);
  }, []);

  // SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || !signInEmail || !signInPassword) return;
    
    isSubmitting.current = true;
    setLoading(true);
    console.log('🔐 Starting sign in for:', signInEmail);
    
    try {
      // First check if already signed in
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      let userId: string;
      
      if (existingSession?.user) {
        // Already signed in - just redirect
        console.log('🔐 Already signed in as:', existingSession.user.email);
        userId = existingSession.user.id;
      } else {
        // Not signed in - do the sign in
        console.log('🔐 Calling signInWithPassword...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password: signInPassword
        });
        
        console.log('🔐 Sign in result:', { user: data?.user?.email, error: error?.message });
        
        if (error) {
          toast({ variant: "destructive", title: "Sign in failed", description: error.message });
          setLoading(false);
          isSubmitting.current = false;
          return;
        }
        
        if (!data.user) {
          toast({ variant: "destructive", title: "Sign in failed", description: "No user returned" });
          setLoading(false);
          isSubmitting.current = false;
          return;
        }
        
        userId = data.user.id;
      }
      
      console.log('🔐 Checking role for user:', userId);
      
      // Check role and redirect to dashboard
      const redirected = await redirectToDashboard(userId);
      
      if (!redirected) {
        console.log('🔐 No role found, redirecting to /home');
        window.location.replace('/home');
      }
      // Don't reset loading - we're navigating away
      
    } catch (err: any) {
      console.error('🔐 Sign in exception:', err);
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // SIGN UP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || !signUpEmail || !signUpPassword) return;
    
    isSubmitting.current = true;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
      });
      
      if (error) {
        toast({ variant: "destructive", title: "Sign up failed", description: error.message });
        setLoading(false);
        isSubmitting.current = false;
        return;
      }
      
      if (data.user && !data.session) {
        // Email confirmation required
        toast({ title: "📧 Check your email", description: "Click the confirmation link to complete signup." });
        setLoading(false);
        isSubmitting.current = false;
        return;
      }
      
      if (data.user) {
        toast({ title: "✅ Account created!" });
        // New user - go to home to register for a role
        window.location.href = '/home';
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // OAuth sign in
  const signInWithProvider = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth` }
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "OAuth sign in failed" });
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Checking session...</p>
        </div>
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
        }}
      />
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      
      <AnimatedSection animation="scaleIn" className="relative z-10">
        <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle>Welcome to UjenziXform</CardTitle>
            <CardDescription>Kenya's Premier Construction Platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              {/* SIGN IN TAB */}
              <TabsContent value="signin">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={loading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={loading}>
                      <Github className="mr-2 h-4 w-4" /> GitHub
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || !signInEmail || !signInPassword}>
                      {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
                    </Button>
                  </form>
                  
                  <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                    <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowResetDialog(true)}>
                      Forgot password?
                    </Button>
                    <DialogContent className="sm:max-w-md bg-transparent border-0 shadow-none p-0">
                      <SimplePasswordReset onBack={() => setShowResetDialog(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>
              
              {/* SIGN UP TAB */}
              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={loading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={loading}>
                      <Github className="mr-2 h-4 w-4" /> GitHub
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Your Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="john@example.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        disabled={loading}
                        className="h-14 text-lg"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Choose Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        minLength={8}
                        disabled={loading}
                        className="h-14 text-lg"
                        required
                      />
                    </div>

                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-sm">
                        <strong className="text-green-700">⚡ Instant Access!</strong><br/>
                        No email verification needed.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      type="submit" 
                      className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-bold text-lg" 
                      disabled={loading || !signUpEmail || !signUpPassword || signUpPassword.length < 8}
                    >
                      {loading ? <><Loader2 className="h-6 w-6 mr-2 animate-spin" /> Creating Account...</> : <>Get Started - It's Free! 🚀</>}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Admin Access */}
        <Card className="mt-4 max-w-xs mx-auto bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <h4 className="text-sm font-semibold text-white">Admin Access</h4>
              <Link to="/admin-login" className="w-full">
                <Button variant="outline" size="sm" className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700">
                  <KeyRound className="h-3 w-3 mr-1.5" /> Staff Portal
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
