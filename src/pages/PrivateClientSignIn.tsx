import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Home, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";

console.log('🔐 PrivateClientSignIn BUILD v2 - onAuthStateChange Feb 8 2026');

const PrivateClientSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use onAuthStateChange for reliable redirect
  useEffect(() => {
    let redirected = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 PrivateClientSignIn event:', event, session?.user?.email);
      
      if (!redirected && session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        redirected = true;
        console.log('🔐 PrivateClientSignIn REDIRECTING to /private-client-dashboard');
        window.location.href = '/private-client-dashboard';
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Safety timeout - reset loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => setLoading(false), 5000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has private_client role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (roleError) throw roleError;

      if (roleData?.role !== 'private_client') {
        toast({
          title: "Access Denied",
          description: "This sign-in is for Private Builders only. Please use the correct portal.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      // Store role in localStorage
      localStorage.setItem('user_role', 'private_client');
      localStorage.setItem('user_role_id', data.user.id);
      localStorage.setItem('user_role_verified', Date.now().toString());

      // Redirect INSTANTLY
      window.location.replace('/private-client-dashboard');
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />

      {/* Home Button */}
      <Link to="/home" className="absolute top-4 left-4 z-20">
        <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </Link>

      {/* Sign In Card */}
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-green-500/20 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Private Builder Sign In</CardTitle>
            <CardDescription className="text-gray-600">
              Access your personal purchasing dashboard
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
                className="border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500 pr-10"
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
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3"
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
            <Link to="/reset-password" className="text-sm text-green-600 hover:text-green-700 hover:underline">
              Forgot your password?
            </Link>
            <div className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/private-client-registration" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                Register here
              </Link>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Private Builder Benefits:</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Direct material purchases
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Personal project tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Exclusive pricing & offers
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivateClientSignIn;

