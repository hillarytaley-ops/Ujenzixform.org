import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DispatchScanner } from '@/components/qr/DispatchScanner';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { 
  QrCode, 
  Scan, 
  Package, 
  Truck, 
  CheckCircle2, 
  Shield, 
  Clock, 
  MapPin,
  Camera,
  AlertTriangle,
  ArrowRight,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * SupplierDispatchScanner - Accessible ONLY to suppliers
 * Used for scanning materials when dispatching orders to builders
 * Builders are NOT allowed to access this page
 */
const SupplierDispatchScanner = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const localRole = localStorage.getItem('user_role');
  const effectiveRole = userRole || localRole;

  // Block builders from accessing this page
  useEffect(() => {
    if (effectiveRole === 'builder') {
      // Redirect builders to tracking page
      navigate('/tracking', { replace: true });
    }
  }, [effectiveRole, navigate]);

  // Show access denied for builders
  if (effectiveRole === 'builder') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-800 dark:text-red-200">Access Restricted</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                As a <strong>Builder</strong>, you don't have access to the dispatch scanner. 
                Only registered <strong>Suppliers</strong> can dispatch materials.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/tracking')} className="bg-primary">
                  <Truck className="h-4 w-4 mr-2" />
                  Track My Deliveries
                </Button>
                <Button variant="outline" onClick={() => navigate('/builder-dashboard')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 via-blue-700 to-cyan-800">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 via-transparent to-cyan-900/40" />
        </div>

        {/* Animated Scanner Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-3/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-4 py-2 text-sm font-medium">
              <Scan className="h-4 w-4 mr-2" />
              Supplier Dispatch Station
            </Badge>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                Dispatch Scanner
              </span>
            </h1>

            <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
              Scan materials before dispatching to builders. Each scan records the material, 
              quantity, and timestamp for complete supply chain transparency.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
                <div className="text-xl font-bold text-cyan-400">Fast</div>
                <div className="text-xs text-gray-400">&lt;2s Scan</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
                <div className="text-xl font-bold text-green-400">Secure</div>
                <div className="text-xs text-gray-400">Verified</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
                <div className="text-xl font-bold text-blue-400">Tracked</div>
                <div className="text-xs text-gray-400">Real-time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 73C120 66 240 53 360 46C480 40 600 40 720 43C840 46 960 53 1080 56C1200 60 1320 60 1380 60L1440 60V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="currentColor" className="text-background"/>
          </svg>
        </div>
      </section>

      {/* Main Scanner Section */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <ErrorBoundary fallback={
            <div className="max-w-xl mx-auto p-6 border rounded-lg bg-muted">
              <div className="text-center space-y-3">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                <h2 className="text-xl font-semibold">Scanner failed to render</h2>
                <p className="text-muted-foreground">Please refresh the page and start the camera manually.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          }>
            <div className="max-w-2xl mx-auto">
              <Card className="overflow-hidden shadow-lg border-2 border-cyan-500/20">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Scan className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Material Dispatch Scanner</CardTitle>
                        <CardDescription className="text-white/80">Scan materials before loading for delivery</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">Outgoing</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <DispatchScanner />
                </CardContent>
              </Card>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">How Dispatch Scanning Works</h2>
            <p className="text-muted-foreground">Simple 3-step process for secure material dispatch</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center border-2 hover:border-cyan-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-cyan-100 dark:bg-cyan-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-2">Step 1</div>
                <h3 className="font-semibold mb-2">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">Point your camera at the material's QR code</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Step 2</div>
                <h3 className="font-semibold mb-2">Confirm Details</h3>
                <p className="text-sm text-muted-foreground">Verify material type, quantity, and destination</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-green-500/50 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-green-100 dark:bg-green-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Step 3</div>
                <h3 className="font-semibold mb-2">Dispatch</h3>
                <p className="text-sm text-muted-foreground">Load material and hand over to delivery driver</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Shield className="h-8 w-8 text-cyan-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Fraud Prevention</h3>
                <p className="text-xs text-muted-foreground">Verified QR codes prevent substitution</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Instant Updates</h3>
                <p className="text-xs text-muted-foreground">Builders notified immediately</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <MapPin className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">GPS Tagged</h3>
                <p className="text-xs text-muted-foreground">Location recorded automatically</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Audit Trail</h3>
                <p className="text-xs text-muted-foreground">Complete dispatch history</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4">Need to manage your orders or view analytics?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/supplier-dashboard">
              <Button variant="secondary" className="font-semibold">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            <Link to="/tracking">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 font-semibold">
                Track Deliveries
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SupplierDispatchScanner;












