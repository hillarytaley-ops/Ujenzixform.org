/**
 * UnifiedAuth - Single authentication page for all user roles
 * 
 * Features:
 * - Detects role from URL parameter (?role=private_client|professional_builder|supplier|delivery)
 * - Shows role-specific branding and messaging
 * - Handles both sign-in and sign-up in one page
 * - Redirects to role-specific dashboard after auth
 */

console.log('🔐 UnifiedAuth BUILD v13 - STRICT DB role only Feb 8 2026');

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    dashboard: '/private-client-dashboard',
    features: [
      'Buy materials for home projects',
      'Track deliveries',
      'Compare prices from suppliers'
    ]
  },
  professional_builder: {
    title: 'Professional Builder',
    subtitle: 'Request bulk quotes & manage projects',
    icon: Building2,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    dashboard: '/professional-builder-dashboard',
    features: [
      'Request bulk quotes',
      'Manage projects',
      'Hire suppliers'
    ]
  },
  supplier: {
    title: 'Supplier',
    subtitle: 'List products & receive orders',
    icon: Store,
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    dashboard: '/supplier-dashboard',
    features: [
      'List products',
      'Receive orders',
      'Manage inventory'
    ]
  },
  delivery: {
    title: 'Delivery Provider',
    subtitle: 'Get transport jobs & earn',
    icon: Truck,
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    dashboard: '/delivery-dashboard',
    features: [
      'Get transport jobs',
      'Track logistics',
      'Earn per delivery'
    ]
  }
};

type RoleType = keyof typeof ROLE_CONFIG;

const UnifiedAuth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  
  // Get role from URL or default to private_client
  const roleParam = searchParams.get('role') as RoleType || 'private_client';
  const redirectTo = searchParams.get('redirect');
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Get role config
  const roleConfig = ROLE_CONFIG[roleParam] || ROLE_CONFIG.private_client;
  const RoleIcon = roleConfig.icon;
  
  // Check if already logged in on page load - redirect to their ACTUAL dashboard
  useEffect(() => {
    let handled = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled) return;
      
      console.log('🔐 UnifiedAuth: Auth event:', event, session?.user?.email);
      
      if (session?.user) {
        handled = true;
        
        // Check localStorage ONLY if user ID matches (security check)
        const cachedRole = localStorage.getItem('user_role');
        const cachedRoleId = localStorage.getItem('user_role_id');
        const roleVerified = localStorage.getItem('user_role_verified');
        const isFresh = roleVerified && (Date.now() - parseInt(roleVerified)) < 10 * 60 * 1000;
        
        if (cachedRole && cachedRoleId === session.user.id && isFresh) {
          console.log('🔐 UnifiedAuth: Using verified cached role:', cachedRole);
          const destination = getDashboardForRole(cachedRole);
          window.location.href = destination;
          return;
        }
        
        // MUST fetch from database - no fallback to URL parameter
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data: roleData }) => {
            if (!roleData?.role) {
              // No role in database - user is not properly registered
              console.log('🔐 UnifiedAuth: No role in DB - redirecting to home');
              window.location.href = '/home';
              return;
            }
            
            const dbRole = roleData.role;
            console.log('🔐 UnifiedAuth: Database role:', dbRole);
            
            // Store the DATABASE role (not URL parameter)
            localStorage.setItem('user_role', dbRole);
            localStorage.setItem('user_role_id', session.user.id);
            localStorage.setItem('user_role_verified', Date.now().toString());
            
            const destination = getDashboardForRole(dbRole);
            console.log('🔐 UnifiedAuth: REDIRECTING to:', destination);
            window.location.href = destination;
          })
          .catch((err) => {
            console.error('🔐 UnifiedAuth: DB error:', err);
            // On error, redirect to home - don't trust URL parameter
            window.location.href = '/home';
          });
      }
    });
    
    return () => subscription.unsubscribe();
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
    
    // Safety timeout - reset loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => setIsLoading(false), 5000);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      if (error) throw error;
      
      if (data.user) {
        // SECURITY: Fetch role from DATABASE - this is the source of truth
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        const dbRole = roleData?.role;
        console.log('🔐 Sign in - Database role:', dbRole, 'Requested role:', roleParam);
        
        if (!dbRole) {
          // User has no role - they need to register first
          toast({
            title: 'Not Registered',
            description: `You don't have a ${roleConfig.title} account. Please register first.`,
            variant: 'destructive'
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
        
        // SECURITY: Check if user's actual role matches the portal they're using
        if (dbRole !== roleParam && dbRole !== 'admin') {
          toast({
            title: 'Wrong Portal',
            description: `You are registered as a ${dbRole}. Redirecting to your dashboard...`,
          });
        }
        
        // Store ACTUAL database role
        localStorage.setItem('user_role', dbRole);
        localStorage.setItem('user_role_id', data.user.id);
        localStorage.setItem('user_role_verified', Date.now().toString());
        
        // Redirect to their ACTUAL dashboard (not the one they requested)
        const destination = getDashboardForRole(dbRole);
        setIsLoading(false);
        window.location.href = destination;
      }
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Please check your credentials',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!fullName.trim()) {
        throw new Error('Please enter your full name');
      }
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: roleParam
          }
        }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            user_id: authData.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            location: location.trim() || null,
            company_name: companyName.trim() || null
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
        
        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: authData.user.id,
            role: roleParam
          });
        
        if (roleError) {
          console.error('Role assignment error:', roleError);
        }
        
        // For suppliers, also create supplier record
        if (roleParam === 'supplier' && companyName) {
          const { error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              user_id: authData.user.id,
              company_name: companyName.trim(),
              email: email.trim(),
              phone: phone.trim() || null,
              location: location.trim() || null,
              status: 'pending'
            });
          
          if (supplierError) {
            console.error('Supplier creation error:', supplierError);
          }
        }
        
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        });
        
        // Switch to sign in tab
        setActiveTab('signin');
      }
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link to="/suppliers" className="text-white/60 hover:text-white text-sm flex items-center gap-1">
            Continue as Visitor
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Role Badge */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${roleConfig.gradient} text-white shadow-lg`}>
              <RoleIcon className="h-5 w-5" />
              <span className="font-semibold">{roleConfig.title}</span>
            </div>
            <p className="text-white/60 mt-2 text-sm">{roleConfig.subtitle}</p>
          </div>
          
          {/* Auth Card */}
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'signin' 
                  ? 'Sign in to access your dashboard' 
                  : `Register as a ${roleConfig.title}`
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                {/* Sign In Form */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full bg-gradient-to-r ${roleConfig.gradient} hover:opacity-90`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                {/* Sign Up Form */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="+254 7XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    {/* Company name for suppliers */}
                    {roleParam === 'supplier' && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-company">Company Name *</Label>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-company"
                            type="text"
                            placeholder="Your Company Ltd"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-location"
                          type="text"
                          placeholder="Nairobi, Kenya"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full bg-gradient-to-r ${roleConfig.gradient} hover:opacity-90`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              
              {/* Features */}
              <div className={`mt-6 p-4 rounded-lg ${roleConfig.bgLight}`}>
                <p className={`text-sm font-medium ${roleConfig.textColor} mb-2`}>
                  As a {roleConfig.title}, you can:
                </p>
                <ul className="space-y-1">
                  {roleConfig.features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <ChevronRight className={`h-3 w-3 ${roleConfig.textColor}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          
          {/* Role Switch Links */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm mb-3">Not a {roleConfig.title}?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                if (key === roleParam) return null;
                const Icon = config.icon;
                return (
                  <Link 
                    key={key}
                    to={`/auth?role=${key}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.title}
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
