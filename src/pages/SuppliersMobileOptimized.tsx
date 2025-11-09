import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Store, Package } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

// Lazy load the materials grid
const MaterialsGridSafe = React.lazy(() => 
  import("@/components/suppliers/MaterialsGridSafe").then(module => ({
    default: module.MaterialsGridSafe
  })).catch(() => ({
    default: () => (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">Materials loading...</p>
        <p className="text-sm text-gray-500 mt-2">Please refresh if this persists</p>
      </div>
    )
  }))
);

// Ultra-optimized Suppliers page for mobile/iPhone
const SuppliersMobileOptimized = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Simple, Highly Visible Hero for iPhone */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Flag */}
          <div className="text-5xl mb-4">🇰🇪</div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            UjenziPro Suppliers
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-semibold text-yellow-300 mb-6">
            Kenya's Premier Materials Marketplace
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Browse verified suppliers and quality construction materials across all 47 counties
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <Button 
              size="lg"
              className="w-full h-14 bg-white text-blue-900 hover:bg-gray-100 font-bold text-lg"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Materials
            </Button>
            
            <Link to={user ? "/suppliers" : "/auth"} className="w-full">
              <Button 
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-white text-white hover:bg-white/20 font-bold text-lg"
              >
                <Store className="h-5 w-5 mr-2" />
                {user ? 'My Dashboard' : 'Sign In'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <main className="py-12 px-4">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Construction Materials
            </h2>
            <p className="text-gray-600">
              850+ verified suppliers across Kenya
            </p>
          </div>

          {/* Materials Grid - iPhone Safe Version */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Browse Materials</CardTitle>
              <CardDescription>
                High-quality construction materials from verified suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading materials...</p>
                </div>
              }>
                <MaterialsGridSafe />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuppliersMobileOptimized;

