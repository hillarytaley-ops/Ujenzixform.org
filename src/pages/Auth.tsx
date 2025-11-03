import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { User, Session } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator";
import { Github, Mail, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InstantPasswordReset } from "@/components/InstantPasswordReset";

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to builder portal
        if (session?.user) {
          navigate("/portal");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Redirect if already authenticated
      if (session?.user) {
        navigate("/portal");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email: email,
            email_confirmed: true // Skip email confirmation for faster signup
          }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      console.log('Sign up successful:', data);
      return { error: null };
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

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
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
      } else if (isSignUp) {
        toast({
          title: "✅ Account created!",
          description: "Welcome to UjenziPro! Taking you to your dashboard...",
        });
        // Auto-redirect to home page after signup
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully."
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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Beautiful Kenyan Construction Workers with Yellow Hard Hats Background - Responsive */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/kenyan-workers.jpg'), url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-gW4eb5K3am2BERQxC6jCNuhvaVOrTl.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
        role="img"
        aria-label="Kenyan construction workers in yellow hard hats reviewing blueprints at steel construction site"
      />
      
      {/* Light overlay for readability - clearer background */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      
      <AnimatedSection animation="scaleIn" className="relative z-10">
        <Card className="w-full max-w-md bg-white/98 backdrop-blur-sm shadow-2xl border-white/70">
        <CardHeader className="text-center">
          <CardTitle>Welcome to UjenziPro</CardTitle>
          <CardDescription>
            Connect with construction professionals across Kenya
          </CardDescription>
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
                      <InstantPasswordReset onBack={() => setShowResetDialog(false)} />
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

                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>

        {/* Admin Staff Portal Link */}
        <div className="mt-6 text-center bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-white/50">
          <Link 
            to="/admin-login"
            className="text-sm text-gray-700 hover:text-blue-600 underline flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <span>🔒</span>
            <span>UjenziPro Staff? Use Admin Portal</span>
          </Link>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default Auth;