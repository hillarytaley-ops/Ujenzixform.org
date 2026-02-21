// Auth Page - Build v28 - SIMPLE AUTH PAGE
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Github, Mail, KeyRound, CheckCircle, Loader2, Shield } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

console.log('🔐 Auth.tsx BUILD v28 - SIMPLE AUTH PAGE Feb 21 2026');

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
  const [formLoading, setFormLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const isSubmitting = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || formLoading) return;
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

      console.log('🔐 signInWithPassword returned:', { user: data.user?.email, session: !!data.session });
      
      if (data.user && data.session) {
        console.log('🔐 Sign in success! User:', data.user.id);
        
        // Fetch role from database using REST API
        console.log('🔐 Fetching role via REST API...');
        const roleUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${data.user.id}&select=role&limit=1`;
        console.log('🔐 Role URL:', roleUrl);
        
        try {
          const response = await fetch(roleUrl, {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('🔐 Role response status:', response.status);
          const roleData = await response.json();
          console.log('🔐 Role data:', roleData);
          
          if (roleData && roleData[0]?.role) {
            const role = roleData[0].role;
            console.log('🔐 Found role:', role);
            localStorage.setItem('user_role', role);
            
            if (DASHBOARDS[role]) {
              console.log('🔐 REDIRECTING to dashboard:', DASHBOARDS[role]);
              toast({ title: "✅ Welcome back!" });
              window.location.href = DASHBOARDS[role];
              return;
            } else {
              console.log('🔐 No dashboard mapping for role:', role);
            }
          } else {
            console.log('🔐 No role in response');
          }
        } catch (roleErr) {
          console.error('🔐 Role fetch error:', roleErr);
        }
        
        // No role found - go to home page
        console.log('🔐 Going to home page (no role)');
        toast({ title: "✅ Signed in!" });
        window.location.href = '/home';
        return;
      } else {
        console.log('🔐 No user or session in response');
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
    if (isSubmitting.current || formLoading) return;
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
      window.location.href = '/home';
      
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
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
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
                        required
                        disabled={formLoading}
                        autoComplete="email"
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
                        required
                        disabled={formLoading}
                        autoComplete="current-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={formLoading}>
                      {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowResetDialog(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        <KeyRound className="inline h-3 w-3 mr-1" />
                        Forgot your password?
                      </button>
                    </div>
                  </form>
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
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                        disabled={formLoading}
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        disabled={formLoading}
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={formLoading}>
                      {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
                    </Button>
                  </form>
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700 text-sm">
                      After signing up, you'll select your role on the home page.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </div>

            {/* Staff Access Link */}
            <div className="mt-4 pt-4 border-t">
              <Link to="/admin-login">
                <Button variant="outline" className="w-full bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
                  <Shield className="mr-2 h-4 w-4" />
                  Staff Access
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <SimplePasswordReset onClose={() => setShowResetDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
