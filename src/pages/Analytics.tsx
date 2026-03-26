import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { MLMaterialAnalytics } from '@/components/analytics/MLMaterialAnalytics';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Brain, BarChart3, TrendingUp, Zap, Video } from 'lucide-react';

const Analytics = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminSession, setIsAdminSession] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check for admin session from localStorage (admin dashboard login)
      const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true';
      const adminEmail = localStorage.getItem('admin_email');
      const storedRole = localStorage.getItem('user_role');
      
      if (isAdminAuthenticated && adminEmail && storedRole === 'admin') {
        console.log('✅ Admin session detected from localStorage');
        setIsAdminSession(true);
        setUserRole('admin');
        // Create a mock user object for admin
        setUser({ id: 'admin', email: adminEmail });
        setLoading(false);
        return;
      }

      // Check Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('No authenticated user');
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(user);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      setUserRole((roleData?.role as any) || null);
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ADMIN ONLY ACCESS - Block all non-admin users
  // Allow access if admin session from localStorage OR admin role from database
  if (!user || (userRole !== 'admin' && !isAdminSession)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
            <p className="text-gray-700 mb-6">
              This page is restricted to administrators only.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Return to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section className="text-white py-20 relative overflow-hidden">
          {/* AI/Tech Background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/70 to-gray-800/70"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="mb-6">
              <span className="text-2xl mb-2 block">🇰🇪</span>
              <p className="text-lg text-gray-200 mb-2">Kenya's First AI-Powered</p>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                Material Analytics
              </span>
              <br />
              <span className="text-3xl md:text-4xl text-blue-400">
                Dashboard
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
              <strong>Smart construction intelligence:</strong> Combine catalog analytics with{' '}
              <Link to="/monitoring" className="text-blue-300 underline-offset-4 hover:underline">
                Monitoring cameras
              </Link>{' '}
              for site vision — material cues, deliveries, and staff safety signals — plus forecasts and cost
              optimization.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">AI-Powered</div>
                <div className="text-sm opacity-90">Smart Analytics</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">85%+</div>
                <div className="text-sm opacity-90">Accuracy</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">15%</div>
                <div className="text-sm opacity-90">Cost Savings</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-400">Real-Time</div>
                <div className="text-sm opacity-90">Updates</div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Main Analytics Dashboard */}
      <main className="container mx-auto px-4 py-8 bg-gradient-to-b from-gray-50/30 to-white min-h-screen">
        {!user ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Brain className="h-16 w-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-4">Sign In to Access ML Analytics</h2>
            <p className="text-muted-foreground mb-6">
              Get AI-powered insights into your construction material usage and costs
            </p>
            <Button size="lg" onClick={() => window.location.href = '/auth'}>
              Sign In to Continue
            </Button>
          </div>
        ) : (
          <MLMaterialAnalytics 
            userId={user.id}
            userRole={userRole as any}
          />
        )}

        {/* ML Features Showcase */}
        <AnimatedSection animation="fadeInUp">
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <div className="p-3 bg-blue-100 rounded-full w-fit mb-4">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Predictive Analytics</h3>
              <p className="text-sm text-muted-foreground">
                ML algorithms predict future material needs based on historical usage patterns, 
                helping you order the right quantities at the right time.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <div className="p-3 bg-green-100 rounded-full w-fit mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Trend Detection</h3>
              <p className="text-sm text-muted-foreground">
                Identify material demand trends across Kenya, seasonal patterns, 
                and price fluctuations to make informed purchasing decisions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <div className="p-3 bg-purple-100 rounded-full w-fit mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Cost Optimization</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered recommendations to reduce material costs by 15-20% through 
                bulk purchasing, supplier selection, and waste reduction.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <div className="p-3 bg-orange-100 rounded-full w-fit mb-4">
                <Video className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Site vision</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Uses the same cameras as Monitoring to surface material sightings, perimeter activity, and PPE-style
                staff safety checks — with live video for verification.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/monitoring">Open Monitoring</Link>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
};

export default Analytics;

