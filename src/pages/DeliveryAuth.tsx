/**
 * DeliveryAuth - BUILD v15 - FETCH API + DB ROLE CHECK
 */

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Truck, Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock, User, Phone, MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

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
if (cachedRole === ROLE && cachedUserId) {
  window.location.replace(DASHBOARD);
}

console.log('🔐 DeliveryAuth BUILD v15 - SECURE');

const DeliveryAuth: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const redirecting = useRef(false);

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
      
      if (dbRole && dbRole !== ROLE) {
        const correctDashboard = ROLE_DASHBOARDS[dbRole] || '/home';
        localStorage.setItem('user_role', dbRole);
        toast({ title: 'Wrong Portal', description: `You are a ${dbRole}. Redirecting to your dashboard.` });
        window.location.href = correctDashboard;
      } else {
        localStorage.setItem('user_role', ROLE);
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
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: email.trim(), password, data: { full_name: fullName.trim(), role: ROLE, company_name: companyName.trim() } }),
      });
      const data = await response.json();
      if (!response.ok || data.error) { setIsLoading(false); toast({ title: 'Registration failed', description: data.error_description || data.error, variant: 'destructive' }); return; }
      toast({ title: 'Account created!', description: 'Please check your email to verify.' });
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
              <CardTitle className="text-2xl">{activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}</CardTitle>
              <CardDescription>{activeTab === 'signin' ? 'Sign in to your dashboard' : `Register as a ${TITLE}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6"><TabsTrigger value="signin">Sign In</TabsTrigger><TabsTrigger value="signup">Sign Up</TabsTrigger></TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2"><Label>Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2"><Label>Full Name *</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Company Name</Label><div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Fast Deliveries Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Email *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Nairobi, Kenya" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Password *</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" minLength={6} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Account'}</Button>
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
