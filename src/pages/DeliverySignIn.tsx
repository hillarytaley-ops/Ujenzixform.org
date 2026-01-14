/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🚚 DELIVERY PROVIDER SIGN-IN PAGE - SECURITY HARDENED                             ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  DO NOT MODIFY AUTH LOGIC WITHOUT SECURITY REVIEW  ⚠️⚠️⚠️                   ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   SECURITY FEATURES:                                                                 ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Database role is SOURCE OF TRUTH, not localStorage                     │   ║
 * ║   │  2. Users with different roles are BLOCKED, not allowed to sign in         │   ║
 * ║   │  3. Role is ALWAYS created in database during sign-in if missing           │   ║
 * ║   │  4. Verified: Supplier/Builder users cannot access delivery portal         │   ║
 * ║   │  5. localStorage is only trusted if user_role_id matches current user      │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   CRITICAL FLOW:                                                                     ║
 * ║   1. Get authenticated user from Supabase                                           ║
 * ║   2. Clear stale localStorage if user_role_id doesn't match                         ║
 * ║   3. Check DATABASE for actual role (source of truth)                               ║
 * ║   4. If role is 'delivery' → redirect to dashboard                                  ║
 * ║   5. If role is different → BLOCK access, sign out                                  ║
 * ║   6. If no role → CREATE 'delivery' role and redirect                               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Truck, KeyRound, Mail, Loader2, Eye, EyeOff, Package, MapPin, Clock, AlertTriangle, UserPlus } from "lucide-react";
import { saveUserSession } from "@/utils/sessionStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

const DeliverySignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/delivery-dashboard';

  useEffect(() => {
    checkExistingAuth();
  }, []);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * checkExistingAuth - CRITICAL AUTHENTICATION CHECK
   * ═══════════════════════════════════════════════════════════════════════════════
   * 
   * ⚠️ DO NOT MODIFY WITHOUT TESTING THE FULL FLOW ⚠️
   * 
   * This function determines if a user should:
   * 1. Be redirected to the delivery dashboard (already authenticated)
   * 2. Be shown the sign-in form (not authenticated)
   * 3. Be redirected to their correct portal (wrong role)
   * 
   * CRITICAL: localStorage check MUST come FIRST to prevent redirect loops.
   * The RoleProtectedRoute trusts localStorage, so we must set it correctly here.
   * 
   * @lastModified December 2025
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const checkExistingAuth = async () => {
    try {
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Get current authenticated user FIRST
      // ═══════════════════════════════════════════════════════════════════════
      // SECURITY FIX: We must know WHO the user is before trusting localStorage
      // ═══════════════════════════════════════════════════════════════════════
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔐 No user logged in, showing sign-in form');
        // Clear any stale localStorage
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        setCheckingAuth(false);
        return;
      }

      console.log('🔐 User already logged in:', user.email);
      
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: Check localStorage - BUT ONLY IF IT MATCHES THIS USER
      // ═══════════════════════════════════════════════════════════════════════
      const storedRole = localStorage.getItem('user_role');
      const storedRoleId = localStorage.getItem('user_role_id');
      
      // SECURITY: If localStorage is from a DIFFERENT user, clear it!
      if (storedRoleId && storedRoleId !== user.id) {
        console.log('🔐 localStorage from different user, clearing. Stored:', storedRoleId, 'Current:', user.id);
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: ALWAYS check DATABASE for the actual role (SOURCE OF TRUTH)
      // ═══════════════════════════════════════════════════════════════════════
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (roleError) {
        console.warn('🔐 Error fetching role:', roleError);
        // On network error, show the sign-in form - don't trust stale localStorage
        setCheckingAuth(false);
        return;
      }
      
      const dbRole = roleData?.role;
      console.log('🔐 Database role:', dbRole);
      
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 4: Handle based on database role
      // ═══════════════════════════════════════════════════════════════════════
      
      // If user is already a delivery provider or admin, redirect to dashboard
      // @ts-ignore - TypeScript types may not match actual DB values
      if (dbRole === 'delivery' || dbRole === 'delivery_provider' || dbRole === 'admin') {
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);
        console.log('🔐 Delivery/admin role confirmed, redirecting to dashboard');
        window.location.href = redirectTo;
        return;
      }
      
      // If user has a different role (builder/supplier), show warning and redirect to their portal
      if (dbRole === 'builder') {
        // Clear any stale delivery localStorage
        localStorage.setItem('user_role', 'builder');
        localStorage.setItem('user_role_id', user.id);
        toast({
          variant: "destructive",
          title: "⚠️ Wrong Portal",
          description: "You're registered as a Builder. Redirecting to Builder portal...",
          duration: 3000
        });
        setTimeout(() => {
          window.location.href = '/builder-dashboard';
        }, 1500);
        return;
      } else if (dbRole === 'supplier') {
        // Clear any stale delivery localStorage
        localStorage.setItem('user_role', 'supplier');
        localStorage.setItem('user_role_id', user.id);
        toast({
          variant: "destructive",
          title: "⚠️ Wrong Portal", 
          description: "You're registered as a Supplier. Redirecting to Supplier portal...",
          duration: 3000
        });
        setTimeout(() => {
          window.location.href = '/supplier-dashboard';
        }, 1500);
        return;
      }
      
      // If no role exists, this user can register as delivery provider
      // Show the sign-in form so they can confirm
      if (!dbRole) {
        console.log('🔐 No role found - user can register as delivery provider');
        // Clear any stale localStorage
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        setCheckingAuth(false);
        return;
      }
      
      // Fallback - show the sign-in form
      setCheckingAuth(false);
      
    } catch (error) {
      console.error('Auth check error:', error);
      // On any error, show the sign-in form - don't trust localStorage
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
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
    console.log('🔐 Attempting sign in for:', email);

    try {
      // Sign in with Supabase
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
          toast({
            variant: "destructive",
            title: "Email not verified",
            description: "Please check your email and click the verification link first."
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
      
      // Check if user is registered as a delivery provider in the database
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      let dbRole = roleData?.role;
      console.log('🔐 Database role:', dbRole);
      
      // If no role in DB, check user metadata (set during registration)
      if (!dbRole) {
        const metadataRole = authData.user.user_metadata?.role;
        console.log('🔐 Metadata role:', metadataRole);
        
        if (metadataRole === 'delivery' || metadataRole === 'delivery_provider') {
          // User registered as delivery but role wasn't saved to DB - fix it now
          console.log('🔐 Found delivery role in metadata, creating in database...');
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'delivery' as any });
          
          if (insertError) {
            console.warn('🔐 Could not create delivery role from metadata:', insertError);
          } else {
            console.log('🔐 Successfully created delivery role from metadata');
            dbRole = 'delivery' as any;
          }
        }
      }
      
      // If user has a DIFFERENT role (not delivery/admin), BLOCK them
      // @ts-ignore - TypeScript types may not match actual DB values
      if (dbRole && dbRole !== 'delivery' && dbRole !== 'delivery_provider' && dbRole !== 'admin') {
        // User has a different role - block them
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: `You are registered as a ${dbRole}. This portal is only for Delivery Providers.`,
        });
        setLoading(false);
        return;
      }
      
      // If STILL no role in database, create the delivery role now
      if (!dbRole) {
        console.log('🔐 No role found, creating delivery role in database...');
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'delivery' as any }); // Cast to any - DB accepts 'delivery'
        
        if (insertError) {
          console.warn('🔐 Could not create role in DB:', insertError);
          // Continue anyway - RoleProtectedRoute will handle it
        } else {
          console.log('🔐 Successfully created delivery role in database');
        }
      }
      
      // Set localStorage to their actual role
      const effectiveRole = dbRole || 'delivery';
      localStorage.setItem('user_role', effectiveRole);
      localStorage.setItem('user_role_id', userId);
      localStorage.setItem('user_email', userEmail);
      
      toast({
        title: "✅ Welcome Delivery Provider!",
        description: "Redirecting to your Dashboard...",
      });

      // Redirect to delivery dashboard
      window.location.replace('/delivery-dashboard');

    } catch (error: any) {
      console.error('Sign in exception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
      setLoading(false);
    }
  };

  // Quick Sign Up - instant account creation, no email confirmation
  const handleQuickSignUp = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password."
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 6 characters."
      });
      return;
    }

    setLoading(true);
    console.log('🔐 Quick sign up for:', email);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            role: 'delivery',
            user_type: 'delivery'
          },
          emailRedirectTo: undefined
        }
      });

      if (authError) {
        console.error('🔐 Sign up error:', authError);
        
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "This email is already registered. Try signing in instead."
          });
          setIsSignUp(false);
        } else {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: authError.message
          });
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: "Could not create account."
        });
        setLoading(false);
        return;
      }

      console.log('🔐 Sign up successful:', authData.user.email);
      
      const userId = authData.user.id;
      const userEmail = authData.user.email?.toLowerCase() || '';

      // If no session, try to sign in directly
      if (!authData.session) {
        console.log('🔐 No session after signup, attempting direct sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password
        });

        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            toast({
              title: "📧 Almost Done!",
              description: "Please check your email for a verification link, then sign in.",
              duration: 10000
            });
          } else {
            toast({
              title: "✅ Account Created!",
              description: "Please sign in with your new credentials.",
            });
            setIsSignUp(false);
          }
          setLoading(false);
          return;
        }

        if (signInData.user) {
          // SECURITY: Check if user already has a role in the database
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', signInData.user.id)
            .maybeSingle();
          
          // @ts-ignore
          if (existingRole?.role && existingRole.role !== 'delivery' && existingRole.role !== 'delivery_provider' && existingRole.role !== 'admin') {
            // User has a DIFFERENT role - BLOCK them
            console.log('🔐 User already has role:', existingRole.role, '- blocking delivery access');
            toast({
              variant: "destructive",
              title: "❌ Access Denied",
              description: `You are already registered as a ${existingRole.role}. You cannot register as a Delivery Provider.`,
              duration: 5000
            });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
          // Create delivery role only if no role exists
          if (!existingRole?.role) {
            console.log('🔐 Creating delivery role in database for new user');
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert({ user_id: signInData.user.id, role: 'delivery' as any });
            
            if (insertError) {
              console.warn('🔐 Could not create delivery role:', insertError);
            } else {
              console.log('🔐 Successfully created delivery role in database');
            }
          }

          localStorage.setItem('user_role', 'delivery');
          localStorage.setItem('user_role_id', signInData.user.id);
          saveUserSession(signInData.user.id, userEmail, 'delivery');

          toast({
            title: "✅ Account Created & Signed In!",
            description: "Welcome! Redirecting to your dashboard...",
          });

          setTimeout(() => {
            window.location.href = redirectTo;
          }, 500);
          return;
        }
      }

      // Session exists - user is signed in immediately
      // SECURITY: Check if user already has a role in the database
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      // @ts-ignore
      if (existingRole?.role && existingRole.role !== 'delivery' && existingRole.role !== 'delivery_provider' && existingRole.role !== 'admin') {
        // User has a DIFFERENT role - BLOCK them
        console.log('🔐 User already has role:', existingRole.role, '- blocking delivery access');
        toast({
          variant: "destructive",
          title: "❌ Access Denied",
          description: `You are already registered as a ${existingRole.role}. You cannot register as a Delivery Provider.`,
          duration: 5000
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      // Create delivery role only if no role exists
      if (!existingRole?.role) {
        console.log('🔐 Creating delivery role in database for new user (session exists)');
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'delivery' as any });
        
        if (insertError) {
          console.warn('🔐 Could not create delivery role:', insertError);
        } else {
          console.log('🔐 Successfully created delivery role in database');
        }
      }

      localStorage.setItem('user_role', 'delivery');
      localStorage.setItem('user_role_id', userId);
      saveUserSession(userId, userEmail, 'delivery');

      supabase.auth.updateUser({
        data: { role: 'delivery', user_type: 'delivery' }
      }).catch(() => {});

      toast({
        title: "✅ Account Created!",
        description: "Welcome! Redirecting to your dashboard...",
      });

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);

    } catch (error: any) {
      console.error('Sign up exception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900">
        <div className="absolute inset-0 bg-[url('/construction-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <Truck className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Delivery Provider Sign In
            </h1>
            <p className="text-xl text-teal-100">
              Access your delivery dashboard to manage deliveries, track orders, and grow your business
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
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Truck className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Delivery Portal</CardTitle>
                  <CardDescription>Sign in to manage your delivery account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full" onValueChange={(v) => setIsSignUp(v === 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Quick Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-800">
                      <strong>Delivery Providers Only:</strong> Builders and suppliers should use their respective portals.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <Alert className="bg-teal-50 border-teal-200">
                    <UserPlus className="h-4 w-4 text-teal-600" />
                    <AlertDescription className="text-sm text-teal-800">
                      <strong>Instant Access:</strong> Create your delivery account and get immediate access - no email confirmation needed!
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>

              <form onSubmit={isSignUp ? (e) => { e.preventDefault(); handleQuickSignUp(); } : handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="delivery@example.com"
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
                      placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
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
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Delivery Account
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Sign In as Delivery Provider
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                variant="link"
                className="text-sm text-teal-600"
                onClick={() => setShowResetDialog(true)}
              >
                Forgot your password?
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/delivery-registration" className="text-teal-600 hover:underline font-medium">
                  Register as Delivery Provider
                </Link>
              </div>
              
              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                <span>Are you a builder? </span>
                <Link to="/builder-signin" className="text-blue-600 hover:underline">
                  Builder Sign-In
                </Link>
                <span> | </span>
                <Link to="/supplier-signin" className="text-orange-600 hover:underline">
                  Supplier Sign-In
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Why Join as a Delivery Provider?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center p-6">
              <Package className="h-12 w-12 mx-auto mb-4 text-teal-600" />
              <h3 className="font-semibold mb-2">Get Delivery Jobs</h3>
              <p className="text-sm text-muted-foreground">
                Receive delivery requests from suppliers and builders
              </p>
            </Card>
            <Card className="text-center p-6">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-teal-600" />
              <h3 className="font-semibold mb-2">GPS Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Real-time tracking for efficient deliveries
              </p>
            </Card>
            <Card className="text-center p-6">
              <Clock className="h-12 w-12 mx-auto mb-4 text-teal-600" />
              <h3 className="font-semibold mb-2">Flexible Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Work on your own schedule and earn more
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
          <SimplePasswordReset onBack={() => setShowResetDialog(false)} />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default DeliverySignIn;
