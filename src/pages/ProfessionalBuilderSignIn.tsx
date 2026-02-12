import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Home, Eye, EyeOff, Loader2, HardHat } from "lucide-react";

console.log('🔐 ProfessionalBuilderSignIn BUILD v5 - FIX SIGN IN BUTTON Feb 13 2026');

const ProfessionalBuilderSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in on page load - with timeout to prevent hanging
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Use timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (session?.user) {
          console.log('🔐 ProfessionalBuilderSignIn: Session found, checking DB role...');
          
          // MUST check database for actual role - with timeout
          const rolePromise = supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          const roleTimeout = new Promise((resolve) => 
            setTimeout(() => resolve({ data: null }), 3000)
          );
          
          const { data: roleData } = await Promise.race([rolePromise, roleTimeout]) as any;
          
          const dbRole = roleData?.role;
          console.log('🔐 ProfessionalBuilderSignIn: DB role:', dbRole);
          
          if (dbRole === 'professional_builder') {
            window.location.href = '/professional-builder-dashboard';
          } else if (dbRole) {
            // Wrong role - redirect to their actual dashboard
            toast({
              title: 'Wrong Portal',
              description: `You are registered as ${dbRole}. Redirecting...`,
            });
            if (dbRole === 'private_client') window.location.href = '/private-client-dashboard';
            else if (dbRole === 'supplier') window.location.href = '/supplier-dashboard';
            else if (dbRole === 'delivery' || dbRole === 'delivery_provider') window.location.href = '/delivery-dashboard';
            else if (dbRole === 'admin') window.location.href = '/admin-dashboard';
            else window.location.href = '/home';
          }
          // If no role, let them stay on page to sign in fresh
        }
      } catch (error) {
        console.log('🔐 Session check error or timeout:', error);
        // Continue - let user sign in
      }
    };
    
    checkSession();
  }, [toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 Sign in button clicked! Email:', email);
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    // Safety timeout - reset loading after 8 seconds and show error
    const safetyTimeout = setTimeout(() => {
      console.log('🔐 Sign in timeout - resetting');
      setLoading(false);
      toast({
        title: "Sign In Timeout",
        description: "The sign in is taking too long. Please try again.",
        variant: "destructive",
      });
    }, 8000);

    try {
      console.log('🔐 Calling supabase.auth.signInWithPassword...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('🔐 Sign in response:', { data: !!data, error: error?.message });

      if (error) {
        clearTimeout(safetyTimeout);
        throw error;
      }

      if (!data?.user) {
        clearTimeout(safetyTimeout);
        throw new Error('No user returned from sign in');
      }

      console.log('🔐 Sign in successful, checking role...');

      // Check if user has professional_builder role - with timeout
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      const roleTimeout = new Promise((resolve) => 
        setTimeout(() => resolve({ data: null, error: null }), 3000)
      );
      
      const { data: roleData, error: roleError } = await Promise.race([rolePromise, roleTimeout]) as any;

      clearTimeout(safetyTimeout);

      if (roleError) {
        console.warn('🔐 Role check error:', roleError);
        // Continue anyway - use default role
      }

      const dbRole = roleData?.role;
      console.log('🔐 DB role:', dbRole);
      
      // If user has a different role, redirect them to their correct dashboard
      if (dbRole && dbRole !== 'professional_builder') {
        toast({
          title: "Wrong Portal",
          description: `You are registered as ${dbRole}. Redirecting to your dashboard...`,
        });
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('user_role_verified', Date.now().toString());
        localStorage.setItem('user_email', data.user.email || '');
        
        // Redirect to their actual dashboard
        if (dbRole === 'private_client') window.location.replace('/private-client-dashboard');
        else if (dbRole === 'supplier') window.location.replace('/supplier-dashboard');
        else if (dbRole === 'delivery' || dbRole === 'delivery_provider') window.location.replace('/delivery-dashboard');
        else if (dbRole === 'admin') window.location.replace('/admin-dashboard');
        else window.location.replace('/home');
        return;
      }

      // Store role in localStorage (use DB role or default to professional_builder)
      const roleToStore = dbRole || 'professional_builder';
      localStorage.setItem('user_role', roleToStore);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('user_role_verified', Date.now().toString());
      localStorage.setItem('user_email', data.user.email || '');

      console.log('🔐 Redirecting to professional-builder-dashboard...');
      
      toast({
        title: "Sign In Successful",
        description: "Redirecting to your dashboard...",
      });

      // Redirect to dashboard
      window.location.replace('/professional-builder-dashboard');
    } catch (error: any) {
      clearTimeout(safetyTimeout);
      console.error('🔐 Sign in error:', error);
      
      let errorMessage = "Invalid email or password";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "The email or password you entered is incorrect.";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the verification link first.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />

      {/* Home Button */}
      <Link to="/home" className="absolute top-4 left-4 z-20">
        <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </Link>

      {/* Sign In Card */}
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-blue-500/20 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Professional Builder Sign In</CardTitle>
            <CardDescription className="text-gray-600">
              Access your professional construction dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link to="/reset-password" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              Forgot your password?
            </Link>
            <div className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/professional-builder-registration" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                Register here
              </Link>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Professional Builder Benefits:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Bulk material purchasing
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Project management tools
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Trade discounts & credit terms
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalBuilderSignIn;

