// Auth Page — sign-in redirect must NOT await supabase.from() inside onAuthStateChange (deadlocks client).
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
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

console.log('🔐 Auth.tsx BUILD v32 - deferred post-sign-in redirect (no deadlock in onAuthStateChange)');

const DASHBOARDS: Record<string, string> = {
  admin: '/admin-dashboard',
  supplier: '/supplier-dashboard',
  delivery: '/delivery-dashboard',
  delivery_provider: '/delivery-dashboard',
  professional_builder: '/professional-builder-dashboard',
  builder: '/professional-builder-dashboard',
  private_client: '/private-client-dashboard',
};

const ROLE_REDIRECT_PRIORITY = [
  'admin',
  'professional_builder',
  'builder',
  'supplier',
  'delivery',
  'delivery_provider',
  'private_client',
] as const;

const ROLE_FETCH_MS = 10_000;

async function fetchRolesWithTimeout(userId: string) {
  const query = supabase.from('user_roles').select('role').eq('user_id', userId);
  const result = await Promise.race([
    query,
    new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ROLE_FETCH_MS)
    ),
  ]);
  return result;
}

const Auth = () => {
  const [formLoading, setFormLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const isSubmitting = useRef(false);
  /** Prevents double navigation when both listener and handleSignIn run */
  const redirectOnceRef = useRef(false);
  const { toast } = useToast();

  const redirectAfterSignIn = useCallback(
    async (session: Session) => {
      if (redirectOnceRef.current) return;
      redirectOnceRef.current = true;

      if (session.user.email) {
        localStorage.setItem('user_email', session.user.email);
      }
      localStorage.setItem('user_id', session.user.id);

      try {
        const { data: roleRows, error: roleError } = await fetchRolesWithTimeout(session.user.id);

        if (roleError && roleError.message !== 'timeout') {
          console.error('🔐 Role query error:', roleError.message);
        }

        const rows = roleRows as { role?: string }[] | null;
        const roles = (rows ?? [])
          .map((r) => r?.role)
          .filter((r): r is string => Boolean(r));
        const picked =
          ROLE_REDIRECT_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];

        console.log('🔐 Role data:', roles, '→', picked);

        if (picked && DASHBOARDS[picked]) {
          localStorage.setItem('user_role', picked);
          toast({ title: '✅ Welcome back!' });
          window.location.assign(DASHBOARDS[picked]);
          return;
        }

        console.log('🔐 No mappable role, going to home');
        toast({ title: '✅ Signed in!' });
        window.location.assign('/home');
      } catch (err) {
        console.error('🔐 Post-sign-in redirect error:', err);
        redirectOnceRef.current = false;
        throw err;
      }
    },
    [toast]
  );

  // OAuth / magic link / session restore: never await supabase in this callback (deadlock risk).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event, session?.user?.email);

      if (event !== 'SIGNED_IN' || !session?.user) return;

      window.setTimeout(() => {
        void redirectAfterSignIn(session).catch((err) => {
          console.error('🔐 Deferred redirect failed:', err);
          toast({
            variant: 'destructive',
            title: 'Could not finish sign-in',
            description: 'Try again or open the site from a fresh tab.',
          });
        });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [toast, redirectAfterSignIn]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || formLoading) return;
    isSubmitting.current = true;
    setFormLoading(true);

    const resetFormState = () => {
      setFormLoading(false);
      isSubmitting.current = false;
    };

    const safetyTimer = window.setTimeout(() => {
      console.warn('🔐 Sign-in UI safety timeout — resetting button');
      resetFormState();
    }, 15_000);

    try {
      console.log('🔐 Starting sign in for:', signInEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) {
        window.clearTimeout(safetyTimer);
        console.error('🔐 Sign in error:', error.message);
        toast({ variant: "destructive", title: "Sign in failed", description: error.message });
        resetFormState();
        return;
      }

      if (!data.session?.user) {
        window.clearTimeout(safetyTimer);
        toast({ variant: 'destructive', title: 'Sign in failed', description: 'No session returned.' });
        resetFormState();
        return;
      }

      // Run redirect outside the auth state callback stack (same deadlock rule as listener).
      await new Promise((r) => setTimeout(r, 0));

      try {
        await redirectAfterSignIn(data.session);
      } catch {
        toast({
          variant: 'destructive',
          title: 'Sign-in incomplete',
          description: 'Could not load your account. Try again.',
        });
        redirectOnceRef.current = false;
      } finally {
        window.clearTimeout(safetyTimer);
        resetFormState();
      }
    } catch (err: unknown) {
      window.clearTimeout(safetyTimer);
      console.error('🔐 Sign in exception:', err);
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      resetFormState();
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

      // Auto-confirmed: SIGNED_IN listener + deferred redirect handles navigation
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
