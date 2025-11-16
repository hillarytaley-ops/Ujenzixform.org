import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGridSafe } from "@/components/suppliers/MaterialsGridSafe";
import { Building, ShoppingBag, Store } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const SuppliersRebuilt = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        const role = roleData?.role || 'builder';
        setUserRole(role);
        setIsAdmin(role === 'admin');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NAVIGATION BAR - GUARANTEED TO SHOW */}
      <Navigation />

      {/* Kenyan-Themed Hero Section */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <span className="text-4xl mb-2 block">🇰🇪</span>
            <p className="text-lg text-white font-semibold mb-2">Karibu - Welcome to Kenya's Premier</p>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-white">UjenziPro</span>
            <br />
            <span className="text-3xl md:text-4xl lg:text-5xl text-yellow-400">
              Suppliers Marketplace
            </span>
          </h1>
          
          <p className="text-lg mb-8 text-white max-w-4xl mx-auto">
            <strong className="text-yellow-400">Your Construction Materials Hub:</strong> Browse verified suppliers, explore product catalogs, 
            compare prices, request quotes, place orders, and arrange delivery across Kenya.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Suppliers
            </Button>
            
            <Button 
              size="lg"
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <Store className="h-5 w-5 mr-2" />
              Register as Supplier
            </Button>
            
            <Button 
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-6 text-lg shadow-xl"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Purchase Materials
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="w-full px-4 md:px-6 lg:px-8 py-8">
        {/* Materials Marketplace */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isAdmin ? '🇰🇪 Admin Materials View' : 'Materials Marketplace'}
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'Viewing materials marketplace as administrator' 
                : 'Browse construction materials from verified suppliers across Kenya'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialsGridSafe />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SuppliersRebuilt;

