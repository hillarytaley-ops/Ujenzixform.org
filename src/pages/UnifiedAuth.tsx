/**
 * UnifiedAuth - Single authentication page for all user roles
 * 
 * BUILD v23 - NO DB QUERIES - Let RoleProtectedRoute handle security
 */

console.log('🔐 UnifiedAuth BUILD v23 - NO DB AT SIGNIN Feb 8 2026');

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, Building2, Store, Truck, Eye, EyeOff, Loader2, 
  ArrowLeft, Mail, Lock, User, Phone, MapPin, ChevronRight
} from 'lucide-react';

// Role configuration
const ROLE_CONFIG = {
  private_client: {
    title: 'Private Builder',
    subtitle: 'Buy materials for home projects',
    icon: Home,
    gradient: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    dashboard: '/private-client-dashboard',
    features: ['Buy materials for home projects', 'Track deliveries', 'Compare prices from suppliers']
  },
  professional_builder: {
    title: 'Professional Builder',
    subtitle: 'Request bulk quotes & manage projects',
    icon: Building2,
    gradient: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    dashboard: '/professional-builder-dashboard',
    features: ['Request bulk quotes', 'Manage projects', 'Hire suppliers']
  },
  supplier: {
    title: 'Supplier',
    subtitle: 'List products & receive orders',
    icon: Store,
    gradient: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    dashboard: '/supplier-dashboard',
    features: ['List products', 'Receive orders', 'Manage inventory']
  },
  delivery: {
    title: 'Delivery Provider',
    subtitle: 'Get transport jobs & earn',
    icon: Truck,
    gradient: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    dashboard: '/delivery-dashboard',
    features: ['Get transport jobs', 'Track logistics', 'Earn per delivery']
  }
};

type RoleType = keyof typeof ROLE_CONFIG;

const UnifiedAuth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const roleParam = searchParams.get('role') as RoleType || 'private_client';
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const roleConfig = ROLE_CONFIG[roleParam] || ROLE_CONFIG.private_client;
  const RoleIcon = roleConfig.icon;
  
  // Check if already logged in
  useEffect(() => {
    const cachedRole = localStorage.getItem('user_role');
    const cachedEmail = localStorage.getItem('user_email');
    
    if (cachedRole && cachedEmail) {
      console.log('🔐 Already logged in as', cachedRole);
      // Go to their dashboard - RoleProtectedRoute will verify
      window.location.href = getDashboardForRole(cachedRole);
    }
  }, []);
  
  const getDashboardForRole = (role: string): string => {
    switch (role) {
      case 'private_client': return '/private-client-dashboard';
      case 'professional_builder': return '/professional-builder-dashboard';
      case 'supplier': return '/supplier-dashboard';
      case 'delivery': return '/delivery-dashboard';
      case 'admin': return '/admin-dashboard';
      default: return '/suppliers';
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('🔐 Sign-in for', email);
    
    // Use a simple callback approach - no await that can hang
    supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    }).then(({ data, error }) => {
      if (error) {
        console.log('🔐 Error:', error.message);
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      
      if (data.user) {
        console.log('🔐 Success! Storing portal role and redirecting...');
        // Store portal role - RoleProtectedRoute will verify against DB
        localStorage.setItem('user_role', roleParam);
        localStorage.setItem('user_role_id', data.user.id visually);
        localStorage.setItem('user_email', data.user.email || '');
        localStorage.setItem('user_role_verified', Date.now().toString());
        
        // Redirect immediately - RoleProtectedRoute handles security
        window.location.href = roleConfig.dashboard;
      }
    }).catch((err) => {
      console.log('🔐 Exception:', err);
      toast({ title: 'Sign in failed', description: 'An error occurred', variant: 'destructive' });
      setIsLoading(false);
    });
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!fullName.trim()) throw new Error('Please enter your full name');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), role: roleParam } }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Create profile
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          user_id: authData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          location: location.trim() || null,
          company_name: companyName.trim() || null
        });
        
        // Assign role
        await supabase.from('user_roles').upsert({ user_id: authData.user.id, role: roleParam });
        
        // For suppliers
        if (roleParam === 'supplier' && companyName) {
          await supabase.from('suppliers').insert({
            user_id: authData.user.id,
            company_name: companyName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            location: location.trim() || null,
            status: 'pending'
          });
        }
        
        toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
        setActiveTab('signin');
      }
    } catch (error: any) {
      toast({ title: 'Registration failed', description: error.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 text-white hover:text-white/80">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link to="/suppliers" className="text-white/60 hover:text-white text-sm flex items-center gap-1">
            Continue as Visitor <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${roleConfig.gradient} text-white shadow-lg`}>
              <RoleIcon className="h-5 w-5" />
              <span className="font-semibold">{roleConfig.title}</span>
            </div>
            <p className="text-white/60 mt-2 text-sm">{roleConfig.subtitle}</p>
          </div>
          
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'signin' ? 'Sign in to access your dashboard' : `Register as a ${roleConfig.title}`}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button type="submit" className={`w-full bg-gradient-to-r ${roleConfig.gradient} hover:opacity-90`} disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-name" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-phone" type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    
                    {roleParam === 'supplier' && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-company">Company Name *</Label>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-company" type="text" placeholder="Your Company Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-location" type="text" placeholder="Nairobi, Kenya" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" minLength={6} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button type="submit" className={`w-full bg-gradient-to-r ${roleConfig.gradient} hover:opacity-90`} disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</> : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              
              <div className={`mt-6 p-4 rounded-lg ${roleConfig.bgLight}`}>
                <p className={`text-sm font-medium ${roleConfig.textColor} mb-2`}>As a {roleConfig.title}, you can:</p>
                <ul className="space-y-1">
                  {roleConfig.features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <ChevronRight className={`h-3 w-3 ${roleConfig.textColor}`} />{feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm mb-3">Not a {roleConfig.title}?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                if (key === roleParam) return null;
                const Icon = config.icon;
                return (
                  <Link key={key} to={`/unified-auth?role=${key}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/20">
                    <Icon className="h-3 w-3" />{config.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UnifiedAuth;
