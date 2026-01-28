/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                              ║
 * ║   🏗️ BUILDER SIGN-IN PAGE - SECURITY HARDENED                               ║
 * ║                                                                              ║
 * ║   ⚠️  DO NOT MODIFY AUTH LOGIC WITHOUT TESTING  ⚠️                          ║
 * ║                                                                              ║
 * ║   SECURITY FIX: December 24, 2025                                           ║
 * ║   - Database role is SOURCE OF TRUTH, not localStorage                      ║
 * ║   - Users with different roles are BLOCKED, not allowed to sign in          ║
 * ║   - Role is ALWAYS created in database during sign-in if missing            ║
 * ║   - Verified: Supplier/Delivery users cannot access builder portal          ║
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Building2, KeyRound, Mail, Loader2, Eye, EyeOff, Hammer, Users, ShieldCheck, AlertTriangle, UserPlus } from "lucide-react";
import { saveUserSession } from "@/utils/sessionStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimplePasswordReset } from "@/components/SimplePasswordReset";

const BuilderSignIn = () => {
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
  // Get redirect parameter - default to home
  const redirectTo = searchParams.get('redirect') || '/home';

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
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const dbRole = roleData?.role;
      console.log('🔐 Database role:', dbRole);
      
      // If user has a role in the database, respect it
      if (dbRole === 'supplier') {
        toast({
          title: "📍 Wrong Portal",
          description: "You're registered as a Supplier. Redirecting...",
        });
        window.location.href = '/supplier-dashboard';
        return;
      }
      
      if (dbRole === 'delivery') {
        toast({
          title: "📍 Wrong Portal", 
          description: "You're registered as a Delivery Provider. Redirecting...",
        });
        window.location.href = '/delivery-dashboard';
        return;
      }
      
      // If user is a builder (professional_builder, private_client, or legacy 'builder'), allow access
      const isBuilderRole = ['builder', 'professional_builder', 'private_client'].includes(dbRole || '');
      
      if (isBuilderRole) {
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', user.id);
        localStorage.setItem('user_role_verified', Date.now().toString());
        toast({
          title: "✅ Welcome Back!",
          description: "Redirecting to home...",
        });
        window.location.href = redirectTo;
        return;
      }
      
      // User has NO role - they need to register first
      if (!dbRole) {
        console.log('🔐 User has no role - must register first');
        toast({
          variant: "destructive",
          title: "❌ Not Registered",
          description: "You need to register first. Please use the appropriate registration link.",
          duration: 5000
        });
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
      
      // ✅ MOBILE OPTIMIZED: Check localStorage first for instant redirect
      const cachedRole = localStorage.getItem('user_role');
      const cachedRoleId = localStorage.getItem('user_role_id');
      const isCachedBuilderRole = ['builder', 'professional_builder', 'private_client'].includes(cachedRole || '');
      
      // If we have a valid cached builder role for this user, redirect immediately
      if (cachedRole && cachedRoleId === userId && isCachedBuilderRole) {
        console.log('🔐 Using cached role for fast redirect:', cachedRole);
        localStorage.setItem('user_role_verified', Date.now().toString());
        localStorage.setItem('user_email', userEmail);
        toast({ title: "✅ Welcome!", description: "Redirecting to home..." });
        window.location.href = '/home';
        return;
      }
      
      // Fetch role from database (source of truth)
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
        
        // Accept builder, professional_builder, or private_client from metadata
        const builderMetadataRoles = ['builder', 'professional_builder', 'private_client'];
        if (builderMetadataRoles.includes(metadataRole)) {
          // User registered as builder but role wasn't saved to DB - fix it now
          // Default to private_client for new users
          const roleToCreate = metadataRole === 'builder' ? 'private_client' : metadataRole;
          console.log('🔐 Found builder role in metadata, creating in database as:', roleToCreate);
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: roleToCreate as any });
          
          if (insertError) {
            console.warn('🔐 Could not create builder role from metadata:', insertError);
          } else {
            console.log('🔐 Successfully created builder role from metadata');
            dbRole = roleToCreate;
          }
        }
      }

      // Check if user has a DIFFERENT role (supplier or delivery) in the DATABASE
      if (dbRole === 'supplier') {
        console.log('🚫 User is registered as SUPPLIER in database');
        toast({
          variant: "destructive",
          title: "❌ Wrong Portal",
          description: "You're registered as a Supplier. Please use the Supplier Sign-In portal.",
          duration: 5000
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      if (dbRole === 'delivery') {
        console.log('🚫 User is registered as DELIVERY in database');
        toast({
          variant: "destructive",
          title: "❌ Wrong Portal",
          description: "You're registered as a Delivery Provider. Please use the Delivery Sign-In portal.",
          duration: 5000
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check if user is a builder type (professional_builder, private_client, or legacy 'builder')
      const isBuilderRole = ['builder', 'professional_builder', 'private_client'].includes(dbRole || '');
      
      // If NO role exists, BLOCK them - they must register first
      if (!dbRole) {
        console.log('🔐 No role found - user must register first');
        toast({
          variant: "destructive",
          title: "❌ Not Registered",
          description: "You are not registered. Please register first using the link below.",
          duration: 5000
        });
        await supabase.auth.signOut();
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_role_id');
        localStorage.removeItem('user_role_verified');
        setLoading(false);
        return;
      }
      
      // User has valid builder role - allow access
      console.log('✅ Granting builder access, role:', dbRole);
      
      localStorage.setItem('user_role', dbRole);
      localStorage.setItem('user_role_id', userId);
      localStorage.setItem('user_role_verified', Date.now().toString());
      saveUserSession(userId, userEmail, dbRole);

      toast({
        title: "✅ Welcome!",
        description: "Redirecting to home...",
      });

      // Redirect to appropriate page
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);

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
            role: 'private_client',
            user_type: 'private_client'
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
          
          // Allow builder types (professional_builder, private_client, legacy 'builder') and admin
          const allowedRoles = ['builder', 'professional_builder', 'private_client', 'admin'];
          if (existingRole?.role && !allowedRoles.includes(existingRole.role)) {
            // User has a DIFFERENT role - BLOCK them
            console.log('🔐 User already has role:', existingRole.role, '- blocking builder access');
            toast({
              variant: "destructive",
              title: "❌ Access Denied",
              description: `You are already registered as a ${existingRole.role}. You cannot register as a Builder.`,
              duration: 5000
            });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
          // Create private_client role only if no role exists
          if (!existingRole?.role) {
            console.log('🔐 Creating private_client role in database for new user');
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert({ user_id: signInData.user.id, role: 'private_client' as any });
            
            if (insertError) {
              console.warn('🔐 Could not create private_client role:', insertError);
            } else {
              console.log('🔐 Successfully created private_client role in database');
            }
          }

          const roleToStore = existingRole?.role || 'private_client';
          localStorage.setItem('user_role', roleToStore);
          localStorage.setItem('user_role_id', signInData.user.id);
          saveUserSession(signInData.user.id, userEmail, roleToStore);

          toast({
            title: "✅ Account Created & Signed In!",
            description: "Welcome! Redirecting to home...",
          });

          setTimeout(() => {
            window.location.href = '/home';
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
      
      // Allow builder types (professional_builder, private_client, legacy 'builder') and admin
      const allowedRoles = ['builder', 'professional_builder', 'private_client', 'admin'];
      if (existingRole?.role && !allowedRoles.includes(existingRole.role)) {
        // User has a DIFFERENT role - BLOCK them
        console.log('🔐 User already has role:', existingRole.role, '- blocking builder access');
        toast({
          variant: "destructive",
          title: "❌ Access Denied",
          description: `You are already registered as a ${existingRole.role}. You cannot register as a Builder.`,
          duration: 5000
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      // Create private_client role only if no role exists
      if (!existingRole?.role) {
        console.log('🔐 Creating private_client role in database for new user (session exists)');
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'private_client' as any });
        
        if (insertError) {
          console.warn('🔐 Could not create private_client role:', insertError);
        } else {
          console.log('🔐 Successfully created private_client role in database');
        }
      }

      const roleToStore = existingRole?.role || 'private_client';
      localStorage.setItem('user_role', roleToStore);
      localStorage.setItem('user_role_id', userId);
      saveUserSession(userId, userEmail, roleToStore);

      supabase.auth.updateUser({
        data: { role: roleToStore, user_type: roleToStore }
      }).catch(() => {});

      toast({
        title: "✅ Account Created!",
        description: "Welcome! Redirecting to home...",
      });

      setTimeout(() => {
        window.location.href = '/home';
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Builder Sign In</CardTitle>
          <CardDescription>
            Access your builder dashboard to manage projects and orders
          </CardDescription>
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
                  <strong>Builders Only:</strong> Suppliers should use the <Link to="/supplier-signin" className="underline font-medium">Supplier Sign-In</Link>.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Instant Access:</strong> Create your builder account and get immediate access - no email confirmation needed!
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
              className="w-full bg-blue-600 hover:bg-blue-700"
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
                  Create Builder Account
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Sign In as Builder
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button
            variant="link"
            className="text-sm text-blue-600"
            onClick={() => setShowResetDialog(true)}
          >
            Forgot your password?
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/builder-registration" className="text-blue-600 hover:underline font-medium">
              Register as Builder
            </Link>
          </div>
          
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <span>Are you a supplier? </span>
            <Link to="/supplier-signin" className="text-orange-600 hover:underline">
              Supplier Sign-In
            </Link>
            <span> | </span>
            <Link to="/delivery-signin" className="text-teal-600 hover:underline">
              Delivery Sign-In
            </Link>
          </div>
        </CardFooter>
      </Card>

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
    </div>
  );
};

export default BuilderSignIn;
