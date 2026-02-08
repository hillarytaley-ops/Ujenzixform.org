/**
 * ProfessionalBuilderAuth - BUILD v10 - INSTANT REDIRECT
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock, User, Phone, MapPin, ChevronRight, Briefcase } from 'lucide-react';

const ROLE = 'professional_builder';
const DASHBOARD = '/professional-builder-dashboard';
const TITLE = 'Professional Builder';

console.log('🔐 ProfessionalBuilderAuth BUILD v10 - INSTANT');

const ProfessionalBuilderAuth: React.FC = () => {
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
  const hasRedirected = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !hasRedirected.current) {
        hasRedirected.current = true;
        localStorage.setItem('user_role', ROLE);
        localStorage.setItem('user_role_id', session.user.id);
        localStorage.setItem('user_email', session.user.email || '');
        window.location.href = DASHBOARD;
      }
    });
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRedirected.current) return;
    setIsLoading(true);

    supabase.auth.signInWithPassword({ email: email.trim(), password })
      .then(({ data, error }) => {
        if (error) {
          setIsLoading(false);
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          return;
        }
        if (data?.user) {
          hasRedirected.current = true;
          localStorage.setItem('user_role', ROLE);
          localStorage.setItem('user_role_id', data.user.id);
          localStorage.setItem('user_email', data.user.email || '');
          window.location.href = DASHBOARD;
        }
      })
      .catch((err) => {
        setIsLoading(false);
        toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
      });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!fullName.trim()) throw new Error('Please enter your full name');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim(), role: ROLE, company_name: companyName.trim() } }
      });
      if (authError) throw authError;
      if (authData.user) {
        await supabase.from('profiles').upsert({ id: authData.user.id, user_id: authData.user.id, email: email.trim(), full_name: fullName.trim(), company_name: companyName.trim() || null, phone: phone.trim() || null, location: location.trim() || null });
        await supabase.from('user_roles').upsert({ user_id: authData.user.id, role: ROLE });
        toast({ title: 'Account created!', description: 'Please check your email to verify.' });
        setActiveTab('signin');
      }
    } catch (error: any) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col">
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 text-white hover:text-white/80"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Back to Home</span></Link>
          <Link to="/suppliers" className="text-white/60 hover:text-white text-sm flex items-center gap-1">Continue as Visitor <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"><Building2 className="h-5 w-5" /><span className="font-semibold">{TITLE}</span></div>
            <p className="text-white/60 mt-2 text-sm">Request quotes for construction projects</p>
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
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2"><Label>Full Name *</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Company Name</Label><div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="ABC Construction Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Email *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></div>
                    <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Nairobi, Kenya" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div></div>
                    <div className="space-y-2"><Label>Password *</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" minLength={6} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Account'}</Button>
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

export default ProfessionalBuilderAuth;
