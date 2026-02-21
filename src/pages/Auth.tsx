// Auth Page - Build v24 - FETCH ROLE DIRECTLY
import { useState, useRef, useEffect } from "react";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

console.log('🔐 Auth.tsx BUILD v25 - DETAILED LOGGING Feb 21 2026');

// Dashboard paths
const DASHBOARDS: Record<string, string> = {
  'admin': '/admin-dashboard',
  'supplier': '/supplier-dashboard',
  'delivery': '/delivery-dashboard',
  'delivery_provider': '/delivery-dashboard',
  'professional_builder': '/professional-builder-dashboard',
  'private_client': '/private-client-dashboard',
};

const Auth = () => {
  const [loading, setLoading] = useState(true); // Start with loading true
  const [formLoading, setFormLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const isSubmitting = useRef(false);
  const { toast } = useToast();

  // On mount: Check session and role, redirect if needed
  useEffect(() => {
    const checkAndRedirect = async () => {
      console.log('🔐 BUILD v25 - Checking session...');
      
      try {
        // Get current session
        console.log('🔐 Calling getSession...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 getSession result:', { session: session?.user?.email, error: sessionError });
        
        if (session?.user) {
          console.log('🔐 Session found:', session.user.email, 'ID:', session.user.id);
          
          // Fetch role from database
          console.log('🔐 Fetching role from user_roles table...');
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();
          
          console.log('🔐 Role query result:', { roleData, roleError });
          
          if (roleError) {
            console.error('🔐 Role fetch error:', roleError);
          }
          
          if (roleData?.role) {
            const dashboard = DASHBOARDS[roleData.role];
            console.log('🔐 Role:', roleData.role, '-> Dashboard:', dashboard);
            
            if (dashboard) {
              console.log('🔐 REDIRECTING NOW to:', dashboard);
              localStorage.setItem('user_role', roleData.role);
              window.location.replace(dashboard);
              return; // Don't set loading false, we're redirecting
            } else {
              console.log('🔐 No dashboard mapping for role:', roleData.role);
            }
          } else {
            console.log('🔐 No role found in database for user');
          }
        } else {
          console.log('🔐 No session found');
        }
      } catch (err) {
        console.error('🔐 Session check error:', err);
      }
      
      // No session or no role - show login form
      console.log('🔐 Showing login form');
      setLoading(false);
    };
    
    checkAndRedirect();
  }, []);

  // Show loading while checking session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setFormLoading(true);

    try {
      console.log('🔐 Signing in:', signInEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword
      });

      if (error) {
        console.error('🔐 Sign in error:', error.message);
        toast({ variant: "destructive", title: "Sign in failed", description: error.message });
        setFormLoading(false);
        isSubmitting.current = false;
        return;
      }

      if (data.user) {
        console.log('🔐 Sign in success, fetching role...');
        
        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .limit(1)
          .maybeSingle();
        
        console.log('🔐 Role:', roleData?.role);
        
        if (roleData?.role && DASHBOARDS[roleData.role]) {
          localStorage.setItem('user_role', roleData.role);
          toast({ title: "✅ Welcome back!" });
          window.location.replace(DASHBOARDS[roleData.role]);
          return;
        }
        
        // No role - go to home
        toast({ title: "✅ Signed in!" });
        window.location.replace('/home');
      }
      
    } catch (err: any) {
      console.error('🔐 Sign in exception:', err);
      toast({ variant: "destructive", title: "Error", description: err.message });
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  // SIGN UP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setFormLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
      });

      if (error) {
        toast({ variant: "destructive", title: "Sign up failed", description: error.message });
        setFormLoading(false);
        isSubmitting.current = false;
        return;
      }

      if (data.user && !data.session) {
        toast({ title: "📧 Check your email", description: "Click the confirmation link." });
        setFormLoading(false);
        isSubmitting.current = false;
        return;
      }

      toast({ title: "✅ Account created!" });
      window.location.replace('/home');
      
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/home` }
    });
  };

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
              
              <TabsContent value="signin">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={formLoading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={formLoading}>
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
                        autoComplete="email"
                        disabled={formLoading}
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
                        autoComplete="current-password"
                        disabled={formLoading}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={formLoading || !signInEmail || !signInPassword}>
                      {formLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
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
              
              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={formLoading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={formLoading}>
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
                        autoComplete="email"
                        disabled={formLoading}
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
                        autoComplete="new-password"
                        minLength={8}
                        disabled={formLoading}
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
                      disabled={formLoading || !signUpEmail || !signUpPassword || signUpPassword.length < 8}
                    >
                      {formLoading ? <><Loader2 className="h-6 w-6 mr-2 animate-spin" /> Creating...</> : <>Get Started Free! 🚀</>}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
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
