/**
 * DeliveryAuth — sign-in for approved delivery providers; "Apply" tab sends users
 * to /delivery/apply without granting the delivery role (admin approves applications).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Truck, Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock, User, Phone, MapPin, ChevronRight, Briefcase, CheckCircle } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

const ROLE = 'delivery';
const DASHBOARD = '/delivery-dashboard';
const TITLE = 'Delivery Provider';

const ROLE_DASHBOARDS: Record<string, string> = {
  'private_client': '/private-client-dashboard',
  'professional_builder': '/professional-builder-dashboard',
  'supplier': '/supplier-dashboard',
  'delivery': '/delivery-dashboard',
  'delivery_provider': '/delivery-dashboard',
  'admin': '/admin-dashboard',
};

const cachedRole = localStorage.getItem('user_role');
const cachedUserId = localStorage.getItem('user_role_id');
if ((cachedRole === ROLE || cachedRole === 'delivery_provider') && cachedUserId) {
  window.location.replace(DASHBOARD);
}

const APPLY_PATH = '/delivery/apply';

const DeliveryAuth: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [isPrefilledFromLogin, setIsPrefilledFromLogin] = useState(false);
  const [prefilledUserId, setPrefilledUserId] = useState<string | null>(null);
  const [prefilledAccessToken, setPrefilledAccessToken] = useState<string | null>(null);
  const redirecting = useRef(false);

  // Check if user is already logged in via general login
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed?.user?.email && parsed?.access_token) {
            console.log('🔐 Found existing session for:', parsed.user.email);
            
            const roleResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${parsed.user.id}&select=role`,
              { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${parsed.access_token}` } }
            );
            const roleData = await roleResponse.json();
            const currentRole = roleData?.[0]?.role;
            
            if (currentRole === ROLE || currentRole === 'delivery_provider') {
              console.log('🔐 User is already a delivery provider, redirecting...');
              localStorage.setItem('user_role', currentRole);
              localStorage.setItem('user_role_id', parsed.user.id);
              window.location.href = DASHBOARD;
              return;
            }
            
            setEmail(parsed.user.email);
            setPrefilledUserId(parsed.user.id);
            setPrefilledAccessToken(parsed.access_token);
            setIsPrefilledFromLogin(true);
            setActiveTab('signup');
            
            toast({
              title: '👋 Welcome!',
              description: 'Continue to the partner application — we review every submission before activation.',
            });
          }
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email && !isPrefilledFromLogin) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (roleData?.role === ROLE || roleData?.role === 'delivery_provider') {
            localStorage.setItem('user_role', roleData.role);
            localStorage.setItem('user_role_id', session.user.id);
            window.location.href = DASHBOARD;
            return;
          }
          
          setEmail(session.user.email);
          setPrefilledUserId(session.user.id);
          setPrefilledAccessToken(session.access_token);
          setIsPrefilledFromLogin(true);
          setActiveTab('signup');
          
          toast({
            title: '👋 Welcome!',
            description: 'Continue to the partner application — we review every submission before activation.',
          });
        }
      } catch (error) {
        console.log('🔐 No existing auth session found');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkExistingAuth();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redirecting.current) return;
    setIsLoading(true);

    try {
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const authData = await authResponse.json();
      
      if (!authResponse.ok || authData.error) {
        setIsLoading(false);
        toast({ title: 'Sign in failed', description: authData.error_description || authData.error || 'Invalid credentials', variant: 'destructive' });
        return;
      }

      if (!authData.access_token || !authData.user) {
        setIsLoading(false);
        toast({ title: 'Sign in failed', description: 'No user returned', variant: 'destructive' });
        return;
      }

      // Check DB role
      const roleResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${authData.user.id}&select=role`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${authData.access_token}` } }
      );
      const roleData = await roleResponse.json();
      const dbRole = roleData?.[0]?.role;

      // Store session
      const session = { access_token: authData.access_token, refresh_token: authData.refresh_token, expires_at: Math.floor(Date.now() / 1000) + authData.expires_in, expires_in: authData.expires_in, token_type: authData.token_type, user: authData.user };
      localStorage.setItem('sb-wuuyjjpgzgeimiptuuws-auth-token', JSON.stringify(session));
      localStorage.setItem('user_role_id', authData.user.id);
      localStorage.setItem('user_email', authData.user.email || '');

      redirecting.current = true;
      
      if (!dbRole) {
        localStorage.removeItem('user_role');
        setIsLoading(false);
        redirecting.current = false;
        toast({
          title: 'Signed in',
          description: 'Continue your delivery partner application. Accounts are activated after review.',
        });
        window.location.href = APPLY_PATH;
        return;
      }
      
      if (dbRole !== ROLE && dbRole !== 'delivery_provider') {
        const correctDashboard = ROLE_DASHBOARDS[dbRole] || '/home';
        localStorage.setItem('user_role', dbRole);
        toast({ title: 'Wrong Portal', description: `You are registered as ${dbRole}. Redirecting to your dashboard.` });
        window.location.href = correctDashboard;
      } else {
        localStorage.setItem('user_role', dbRole);
        window.location.href = DASHBOARD;
      }
    } catch (err: any) {
      setIsLoading(false);
      toast({ title: 'Sign in failed', description: err.message || 'Network error', variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!fullName.trim()) { setIsLoading(false); toast({ title: 'Error', description: 'Please enter your full name', variant: 'destructive' }); return; }
    
    try {
      // If user is pre-filled from general login, use their existing session
      if (isPrefilledFromLogin && prefilledUserId && prefilledAccessToken) {
        console.log('🔐 Using pre-filled session from general login...');
        const userId = prefilledUserId;
        const accessToken = prefilledAccessToken;
        
        const roleCheckResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&select=role`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` } }
        );
        const roleCheckData = await roleCheckResponse.json();
        const currentRole = roleCheckData?.[0]?.role;

        if (currentRole === ROLE || currentRole === 'delivery_provider') {
          localStorage.setItem('user_role', currentRole);
          localStorage.setItem('user_role_id', userId);
          localStorage.setItem('user_email', email);
          toast({ title: 'Welcome back', description: 'Redirecting to your dashboard...' });
          window.location.href = DASHBOARD;
          return;
        }

        await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            company_name: companyName.trim() || null,
            phone: phone || null,
            location: location || null,
          }),
        });

        if (currentRole) {
          localStorage.setItem('user_role', currentRole);
        } else {
          localStorage.removeItem('user_role');
        }
        localStorage.setItem('user_role_id', userId);
        localStorage.setItem('user_email', email);

        toast({
          title: 'Profile saved',
          description: 'Opening the delivery partner application — your role is assigned only after approval.',
        });
        window.location.href = APPLY_PATH;
        return;
      }
      
      // First, try to sign in to check if user already exists
      console.log('🔐 Checking if user already exists...');
      const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const signInData = await signInResponse.json();
      
      if (signInResponse.ok && signInData.access_token && signInData.user) {
        // User already exists! Update their role
        console.log('🔐 User exists! Updating role to delivery_provider...');
        const userId = signInData.user.id;
        const accessToken = signInData.access_token;
        
        // Check current role
        const roleCheckResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&select=role`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` } }
        );
        const roleCheckData = await roleCheckResponse.json();
        const currentRole = roleCheckData?.[0]?.role;
        
        if (currentRole === ROLE || currentRole === 'delivery_provider') {
          localStorage.setItem('sb-wuuyjjpgzgeimiptuuws-auth-token', JSON.stringify({
            access_token: accessToken,
            refresh_token: signInData.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + signInData.expires_in,
            expires_in: signInData.expires_in,
            token_type: signInData.token_type,
            user: signInData.user
          }));
          localStorage.setItem('user_role', currentRole);
          localStorage.setItem('user_role_id', userId);
          localStorage.setItem('user_email', signInData.user.email || '');
          toast({ title: 'Welcome back!', description: 'Redirecting to your dashboard...' });
          window.location.href = DASHBOARD;
          return;
        }

        await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            company_name: companyName.trim() || null,
            phone: phone || null,
            location: location || null,
          }),
        });

        localStorage.setItem('sb-wuuyjjpgzgeimiptuuws-auth-token', JSON.stringify({
          access_token: accessToken,
          refresh_token: signInData.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + signInData.expires_in,
          expires_in: signInData.expires_in,
          token_type: signInData.token_type,
          user: signInData.user
        }));
        if (currentRole) {
          localStorage.setItem('user_role', currentRole);
        } else {
          localStorage.removeItem('user_role');
        }
        localStorage.setItem('user_role_id', userId);
        localStorage.setItem('user_email', signInData.user.email || '');

        toast({
          title: 'Signed in',
          description: 'Opening the delivery partner application. You are not a provider until approved.',
        });
        window.location.href = APPLY_PATH;
        return;
      }
      
      // User doesn't exist - create new account
      console.log('🔐 Creating new user account...');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          email: email.trim(),
          password,
          data: { full_name: fullName.trim(), company_name: companyName.trim() || undefined },
        }),
      });
      const data = await response.json();
      
      if (!response.ok || data.error) { 
        if (data.error_description?.includes('already') || data.msg?.includes('already')) {
          setIsLoading(false);
          toast({ title: 'Account exists', description: 'This email is already registered. Please check your password and try again.', variant: 'destructive' });
          return;
        }
        setIsLoading(false); 
        toast({ title: 'Registration failed', description: data.error_description || data.error || data.msg, variant: 'destructive' }); 
        return; 
      }
      
      const accessToken = data.access_token ?? data.session?.access_token;
      const refreshToken = data.refresh_token ?? data.session?.refresh_token;
      const expiresIn = data.expires_in ?? data.session?.expires_in;

      if (accessToken && data.user && typeof expiresIn === 'number') {
        localStorage.setItem(
          'sb-wuuyjjpgzgeimiptuuws-auth-token',
          JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn,
            expires_in: expiresIn,
            token_type: data.token_type ?? data.session?.token_type ?? 'bearer',
            user: data.user,
          })
        );
        localStorage.setItem('user_role_id', data.user.id);
        localStorage.setItem('user_email', data.user.email || email.trim());
        localStorage.removeItem('user_role');
        toast({
          title: 'Account created',
          description: 'Complete your delivery partner application next. We activate accounts after review.',
        });
        window.location.href = APPLY_PATH;
        return;
      }

      toast({
        title: 'Check your email',
        description: 'Verify your account, then sign in and open Apply to become a delivery partner.',
      });
      setActiveTab('signin');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col">
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 text-white hover:text-white/80"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Back to Home</span></Link>
          <Link to="/suppliers" className="text-white/60 hover:text-white text-sm flex items-center gap-1">Continue as Visitor <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"><Truck className="h-5 w-5" /><span className="font-semibold">{TITLE}</span></div>
            <p className="text-white/60 mt-2 text-sm">Deliver materials to construction sites</p>
          </div>
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{activeTab === 'signin' ? 'Welcome Back' : 'Apply as partner'}</CardTitle>
              <CardDescription>
                {activeTab === 'signin'
                  ? 'Sign in if you are already an approved delivery partner'
                  : 'Create an account and submit an application — approval required before dashboard access'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Apply</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2"><Label>Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {isPrefilledFromLogin && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Signed in.</strong> Save your details below, then you will open the full partner application. The delivery role is assigned only after admin approval.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2"><Label>Full Name *</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Company Name</Label><div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Fast Deliveries Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" /></div></div>
                    
                    {/* Email - Read-only if pre-filled */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Email *
                        {isPrefilledFromLogin && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified</span>}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="your@email.com" 
                          value={email} 
                          onChange={(e) => !isPrefilledFromLogin && setEmail(e.target.value)} 
                          className={`pl-10 ${isPrefilledFromLogin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          readOnly={isPrefilledFromLogin}
                          disabled={isPrefilledFromLogin}
                          required 
                        />
                      </div>
                      {isPrefilledFromLogin && <p className="text-xs text-gray-500">Email from your existing account</p>}
                    </div>
                    
                    <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Nairobi, Kenya" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div></div>
                    
                    {/* Password - Hidden if pre-filled */}
                    {!isPrefilledFromLogin && (
                      <div className="space-y-2"><Label>Password *</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required autoComplete="new-password" /></div></div>
                    )}
                    
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600" disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Please wait...</>
                      ) : isPrefilledFromLogin ? (
                        'Continue to application'
                      ) : (
                        'Create account and apply'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DeliveryAuth;
