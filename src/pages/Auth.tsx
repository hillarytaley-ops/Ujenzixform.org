// Auth — post-sign-in uses REST fetch for user_roles + React Router navigate (avoids supabase-js auth deadlocks + stuck "Signing in…").
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/config/appIdentity";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRolesViaRest } from "@/lib/userRolesRest";
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

console.log('🔐 Auth.tsx BUILD v36 - signIn timeout race + finally always clears spinner');

const DASHBOARDS: Record<string, string> = {
  admin: '/admin-dashboard',
  super_admin: '/admin-dashboard',
  supplier: '/supplier-dashboard',
  delivery: '/delivery-dashboard',
  delivery_provider: '/delivery-dashboard',
  professional_builder: '/professional-builder-dashboard',
  builder: '/professional-builder-dashboard',
  private_client: '/private-client-dashboard',
};

const ROLE_REDIRECT_PRIORITY = [
  'super_admin',
  'admin',
  'professional_builder',
  'builder',
  'supplier',
  'delivery',
  'delivery_provider',
  'private_client',
] as const;

function pickDashboardPath(roles: string[]): string | null {
  const picked =
    ROLE_REDIRECT_PRIORITY.find((r) => roles.includes(r)) ?? roles[0] ?? null;
  if (picked && DASHBOARDS[picked]) return DASHBOARDS[picked];
  return null;
}

const SIGN_IN_NETWORK_MS = 22_000;

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms));
}

const Auth = () => {
  const navigate = useNavigate();
  const [formLoading, setFormLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const isSubmitting = useRef(false);
  const passwordSignInFlowRef = useRef(false);
  const { toast } = useToast();

  const completeSignInNavigation = useCallback(
    async (session: Session) => {
      if (session.user.email) {
        localStorage.setItem('user_email', session.user.email);
      }
      localStorage.setItem('user_id', session.user.id);

      const roles = await fetchUserRolesViaRest(session.user.id, session.access_token);
      const path = pickDashboardPath(roles);

      console.log('🔐 Role data:', roles, '→', path);

      if (path) {
        const picked =
          ROLE_REDIRECT_PRIORITY.find((r) => roles.includes(r)) ?? roles[0] ?? '';
        if (picked) localStorage.setItem('user_role', picked);
        toast({ title: '✅ Welcome back!' });
        navigate(path, { replace: true });
        return;
      }

      toast({
        title: '✅ Signed in',
        description: 'No dashboard role found — open your dashboard from the menu or contact support.',
      });
      navigate('/home', { replace: true });
    },
    [navigate, toast]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event, session?.user?.email);

      if (event !== 'SIGNED_IN' || !session?.user) return;
      if (passwordSignInFlowRef.current) {
        console.log('🔐 Listener skipped (password flow navigates separately)');
        return;
      }

      window.setTimeout(() => {
        void completeSignInNavigation(session).catch((err) => {
          console.error('🔐 Deferred navigation failed:', err);
          toast({
            variant: 'destructive',
            title: 'Could not finish sign-in',
            description: 'Try again or reload the page.',
          });
        });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [toast, completeSignInNavigation]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || formLoading) return;
    isSubmitting.current = true;
    setFormLoading(true);
    passwordSignInFlowRef.current = true;

    const resetButton = () => {
      setFormLoading(false);
      isSubmitting.current = false;
    };

    try {
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: signInEmail,
          password: signInPassword,
        }),
        rejectAfter(SIGN_IN_NETWORK_MS, 'SIGN_IN_TIMEOUT'),
      ]);

      if (error) {
        toast({ variant: "destructive", title: "Sign in failed", description: error.message });
        return;
      }

      if (!data.session?.user) {
        toast({ variant: 'destructive', title: 'Sign in failed', description: 'No session returned.' });
        return;
      }

      // Stop showing "Signing in…" as soon as we have a session; navigation may take another second.
      resetButton();

      await new Promise((r) => setTimeout(r, 0));

      try {
        await completeSignInNavigation(data.session);
      } catch (err) {
        console.error('🔐 Post sign-in navigation:', err);
        toast({
          variant: 'destructive',
          title: 'Could not open your dashboard',
          description: 'You are signed in — try Home or refresh.',
        });
        navigate('/home', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'SIGN_IN_TIMEOUT') {
        console.warn('🔐 signInWithPassword timed out');
        toast({
          variant: 'destructive',
          title: 'Sign-in timed out',
          description: 'Check your connection and try again.',
        });
      } else {
        console.error('🔐 Sign in exception:', err);
        toast({
          variant: 'destructive',
          title: 'Sign in failed',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      passwordSignInFlowRef.current = false;
      resetButton();
    }
  };

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
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github' | 'apple') => {
    if (formLoading) return;
    setFormLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
          skipBrowserRedirect: false,
        },
      });
      if (error) {
        toast({
          variant: 'destructive',
          title: `${provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : 'GitHub'} sign-in failed`,
          description: error.message,
        });
        setFormLoading(false);
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        setFormLoading(false);
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setFormLoading(false);
    }
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={formLoading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={formLoading}>
                      <Github className="mr-2 h-4 w-4" /> GitHub
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('apple')} disabled={formLoading}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                        />
                      </svg>
                      Apple
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button variant="outline" onClick={() => signInWithProvider('google')} disabled={formLoading}>
                      <Mail className="mr-2 h-4 w-4" /> Google
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('github')} disabled={formLoading}>
                      <Github className="mr-2 h-4 w-4" /> GitHub
                    </Button>
                    <Button variant="outline" onClick={() => signInWithProvider('apple')} disabled={formLoading}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                        />
                      </svg>
                      Apple
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
              <a href={TERMS_OF_SERVICE_URL} className="text-primary hover:underline">
                Terms of Service
              </a>
              {" "}and{" "}
              <a href={PRIVACY_POLICY_URL} className="text-primary hover:underline">
                Privacy Policy
              </a>
            </div>

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
