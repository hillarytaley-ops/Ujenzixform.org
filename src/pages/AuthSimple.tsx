import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, KeyRound } from "lucide-react";

const AuthSimple = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    console.log('🔐 Signing in:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message
        });
        return;
      }

      console.log('✅ Sign in successful!', data);
      toast({
        title: "Signed In!",
        description: "Redirecting to marketplace..."
      });

      // Simple redirect - no complex logic
      setTimeout(() => {
        window.location.href = '/suppliers';
      }, 500);

    } catch (error: any) {
      console.error('💥 Exception:', error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    console.log('📝 Signing up:', email);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: error.message
        });
        return;
      }

      console.log('✅ Sign up successful!', data);

      if (data.session) {
        // Instant signup - has session
        toast({
          title: "Account Created!",
          description: "Redirecting to marketplace..."
        });
        setTimeout(() => {
          window.location.href = '/suppliers';
        }, 500);
      } else {
        // Email confirmation required
        setLoading(false);
        toast({
          title: "Check Your Email",
          description: "We sent you a confirmation link. Please check your inbox."
        });
      }

    } catch (error: any) {
      console.error('💥 Exception:', error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to MradiPro</CardTitle>
          <CardDescription>Sign in or create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <Link to="/reset-password" className="hover:text-primary">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/home" className="hover:text-primary">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthSimple;










