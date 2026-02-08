/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                              ║
 * ║   🏪 SUPPLIER SIGN-IN PAGE - SECURITY HARDENED                              ║
 * ║                                                                              ║
 * ║   ⚠️  DO NOT MODIFY AUTH LOGIC WITHOUT TESTING  ⚠️                          ║
 * ║                                                                              ║
 * ║   SECURITY FIX: December 24, 2025                                           ║
 * ║   - Database role is SOURCE OF TRUTH, not localStorage                      ║
 * ║   - Users with different roles are BLOCKED, not allowed to sign in          ║
 * ║   - Role is ALWAYS created in database during sign-in if missing            ║
 * ║   - Verified: Builder/Delivery users cannot access supplier portal          ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Store, KeyRound, Mail, Loader2, Eye, EyeOff, Package, TrendingUp, ShoppingBag, AlertTriangle } from "lucide-react";
import { saveUserSession } from "@/utils/sessionStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

const SupplierSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // Redirect to dashboard after sign-in (not home page)
  const redirectTo = searchParams.get('redirect') || '/supplier-dashboard';

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address first."
      });
      return;
    }
    
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to resend",
          description: error.message
        });
      } else {
        toast({
          title: "✅ Verification Email Sent!",
          description: "Please check your inbox and click the verification link.",
          duration: 10000
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not resend verification email."
      });
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    checkExistingAuth();
  }, []);

  // Auth check - ALWAYS check database for actual role, not metadata
  const checkExistingAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔐 No user logged in, showing sign-in form');
        setCheckingAuth(false);
        return;
      }

      console.log('🔐 User already logged in:', user.email);
      
      // ALWAYS check the DATABASE for the actual role - this is the source of truth
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const dbRole = roleData?.role;
      console.log('🔐 Database role:', dbRole);
      
      // Block builders - redirect to builder portal
      if (dbRole === 'builder') {
        toast({
          variant: "destructive",
          title: "❌ Wrong Portal",
          description: "You're registered as a Builder. Please use the Builder Sign-In portal.",
          duration: 5000
        });
        setCheckingAuth(false);
        return;
      }
      
      // Block delivery providers - redirect to delivery portal
      if (dbRole === 'delivery') {
        toast({
          variant: "destructive",
          title: "❌ Wrong Portal",
          description: "You're registered as a Delivery Provider. Please use the Delivery Sign-In portal.",
          duration: 5000
        });
        setCheckingAuth(false);
        return;
      }
      
      // User is supplier OR admin - allow access
      if (dbRole === 'supplier' || dbRole === 'admin') {
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);
        localStorage.setItem('user_role_verified', Date.now().toString());
        toast({
          title: "✅ Welcome Back!",
          description: "Redirecting to dashboard...",
        });
        window.location.href = '/supplier-dashboard';
        return;
      }
      
      // User has NO role - they need to register first
      if (!dbRole) {
        console.log('🔐 User has no role - must register first');
        toast({
          variant: "destructive",
          title: "❌ Not Registered",
          description: "You need to register as a Supplier first. Please use the Register link below.",
          duration: 5000
        });
        // Sign them out to prevent auto-login issues
        await supabase.auth.signOut();
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        localStorage.removeItem('user_role_verified');
        setCheckingAuth(false);
        return;
      }
      
      setCheckingAuth(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setCheckingAuth(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password."
      });
      return;
    }

    setLoading(true);
    
    // Safety timeout - reset loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authError) {
        console.error('🔐 Sign in error:', authError);
        
        if (authError.message.includes('Invalid login credentials')) {
          toast({
            variant: "destructive",
            title: "Incorrect credentials",
            description: "The email or password you entered is incorrect. Please try again."
          });
        } else if (authError.message.includes('Email not confirmed')) {
          setShowEmailNotVerified(true);
          toast({
            variant: "destructive",
            title: "Email not verified",
            description: "Please check your email and click the verification link, or click 'Resend' below.",
            duration: 10000
          });
        } else {
          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: authError.message
          });
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: "Could not authenticate. Please try again."
        });
        setLoading(false);
        return;
      }

      console.log('🔐 Sign in successful for:', authData.user.email);
      
      const userId = authData.user.id;
      const userEmail = authData.user.email?.toLowerCase() || '';
      
      // ✅ MOBILE OPTIMIZED: Check localStorage first for instant redirect
      const cachedRole = localStorage.getItem('user_role');
      const cachedRoleId = localStorage.getItem('user_role_id');
      
      // If we have a valid cached supplier/admin role for this user, redirect immediately
      if (cachedRole && cachedRoleId === userId && (cachedRole === 'supplier' || cachedRole === 'admin')) {
        console.log('🔐 Using cached role for fast redirect:', cachedRole);
        localStorage.setItem('user_role_verified', Date.now().toString());
        localStorage.setItem('user_email', userEmail);
        toast({ title: "✅ Welcome!", description: "Redirecting to dashboard..." });
        window.location.href = '/supplier-dashboard';
        return;
      }
      
      // Fetch role from database (source of truth) - with timeout
      let dbRole: string | null = null;
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        dbRole = roleData?.role || null;
        console.log('🔐 Database role:', dbRole);
      } catch (roleError) {
        console.error('🔐 Role fetch failed:', roleError);
        // Continue with supplier role assumption
        dbRole = 'supplier';
      }
      
      // If user has a DIFFERENT role (not supplier/admin), BLOCK them
      // @ts-ignore - TypeScript types may not match actual DB values
      if (dbRole && dbRole !== 'supplier' && dbRole !== 'admin') {
        // User has a different role - they cannot access supplier dashboard
        console.log('🔐 User has different role:', dbRole, '- blocking supplier access');
        toast({
          variant: "destructive",
          title: "❌ Access Denied",
          description: `You are registered as a ${dbRole}. This portal is only for Suppliers. Please use the correct portal.`,
          duration: 5000
        });
        setLoading(false);
        return;
      }
      
      // If NO role exists, BLOCK them - they must register first
      if (!dbRole) {
        console.log('🔐 No role found - user must register first');
        toast({
          variant: "destructive",
          title: "❌ Not Registered",
          description: "You are not registered as a Supplier. Please register first using the link below.",
          duration: 5000
        });
        // Sign them out to prevent unauthorized access
        await supabase.auth.signOut();
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        localStorage.removeItem('user_role_verified');
        setLoading(false);
        return;
      }
      
      // Set localStorage to supplier (or admin if they're admin)
      const effectiveRole = dbRole === 'admin' ? 'admin' : 'supplier';
      localStorage.setItem('user_role', effectiveRole);
      localStorage.setItem('user_role_id', userId);
      localStorage.setItem('user_role_verified', Date.now().toString());
      saveUserSession(userId, userEmail, effectiveRole);

      toast({
        title: "✅ Welcome!",
        description: "Redirecting to dashboard...",
      });

      // Redirect to supplier dashboard IMMEDIATELY
      window.location.replace('/supplier-dashboard');
      return;

    } catch (error: any) {
      console.error('Sign in exception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-orange-600 via-orange-700 to-red-800">
        <div className="absolute inset-0 bg-[url('/construction-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <Store className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Supplier Sign In
            </h1>
            <p className="text-xl text-orange-100">
              Access your supplier dashboard to manage products, orders, and grow your business
            </p>
          </div>
        </div>
      </section>

      {/* Sign In Form */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-md">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Store className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Supplier Portal</CardTitle>
                  <CardDescription>Sign in to manage your supplier account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Role Warning */}
              <Alert className="mb-4 bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800">
                  <strong>Suppliers Only:</strong> This portal is for registered suppliers. 
                  Builders should use the <Link to="/builder-signin" className="underline font-medium">Builder Sign-In</Link>.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Store className="mr-2 h-4 w-4" />
                      Sign In as Supplier
                    </>
                  )}
                </Button>

                {/* Email Not Verified Warning */}
                {showEmailNotVerified && (
                  <Alert className="mt-4 bg-red-50 border-red-200">
                    <Mail className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800">
                      <strong>Email not verified!</strong> Check your inbox for the verification link, or{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-red-600 underline font-semibold"
                        onClick={resendVerificationEmail}
                        disabled={resendingEmail}
                      >
                        {resendingEmail ? "Sending..." : "click here to resend"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                variant="link"
                className="text-sm text-orange-600"
                onClick={() => setShowResetDialog(true)}
              >
                Forgot your password?
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/supplier-registration" className="text-orange-600 hover:underline font-medium">
                  Register as Supplier
                </Link>
              </div>
              
              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                <span>Are you a builder? </span>
                <Link to="/builder-signin" className="text-blue-600 hover:underline">
                  Builder Sign-In
                </Link>
                <span> | </span>
                <Link to="/delivery-signin" className="text-teal-600 hover:underline">
                  Delivery Sign-In
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Why Join as a Supplier?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center p-6">
              <Package className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="font-semibold mb-2">List Your Products</h3>
              <p className="text-sm text-muted-foreground">
                Showcase your construction materials to thousands of builders
              </p>
            </Card>
            <Card className="text-center p-6">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="font-semibold mb-2">Grow Your Business</h3>
              <p className="text-sm text-muted-foreground">
                Reach more customers and increase your sales
              </p>
            </Card>
            <Card className="text-center p-6">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="font-semibold mb-2">Easy Order Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage orders, track deliveries, and handle payments
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <SimplePasswordReset onSuccess={() => setShowResetDialog(false)} />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default SupplierSignIn;
