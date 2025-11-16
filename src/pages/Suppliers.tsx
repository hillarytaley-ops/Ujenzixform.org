import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaterialsGridSafe } from "@/components/suppliers/MaterialsGridSafe";
import { Building, ShoppingBag, Store } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const Suppliers = () => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
        <div className="min-h-screen bg-background">
      {/* NAVIGATION BAR - AT THE TOP */}
          <Navigation />

      {/* Kenyan-Themed Hero Section */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          {/* Kenya Flag */}
          <div className="mb-6">
            <span className="text-4xl mb-2 block">🇰🇪</span>
            <p className="text-lg text-white font-semibold mb-2 drop-shadow-lg">
              Karibu - Welcome to Kenya's Premier
            </p>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white drop-shadow-2xl">UjenziPro</span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-yellow-400 drop-shadow-2xl">
              Suppliers Marketplace
            </span>
          </h1>
          
          {/* Description */}
          <p className="text-base md:text-lg mb-8 text-white max-w-4xl mx-auto px-4 font-medium drop-shadow-lg">
            <strong className="text-yellow-400">Your Construction Materials Hub:</strong> Browse verified suppliers, 
            explore product catalogs, compare prices, request quotes, place orders, and arrange delivery across Kenya.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 max-w-3xl mx-auto">
            <Button 
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Materials
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
              onClick={() => {
                if (user) {
                  window.scrollTo({ top: 600, behavior: 'smooth' });
                } else {
                  window.location.href = '/auth?redirect=/suppliers';
                }
              }}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Purchase Materials
            </Button>
          </div>
          </div>
         </section>

      {/* Main Content Area */}
      <main className="w-full px-4 md:px-6 lg:px-8 py-12 bg-gradient-to-b from-gray-50 to-white">
        {/* Admin Badge (if admin) */}
          {isAdmin && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-6 text-center">
              <p className="text-lg font-bold text-blue-900">
                🇰🇪 Admin View - You have full access to all supplier data
                  </p>
                </div>
              </div>
        )}

        {/* Materials Marketplace Section */}
        <div className="max-w-7xl mx-auto">
                  <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
              <CardTitle className="text-3xl flex items-center gap-2">
                {isAdmin ? '🛡️ Admin Materials View' : '📦 Materials Marketplace'}
                      </CardTitle>
                      <CardDescription className="text-base">
                {isAdmin 
                  ? 'Administrator view of all construction materials from verified suppliers' 
                  : 'Browse construction materials from verified suppliers across Kenya'}
                      </CardDescription>
                    </CardHeader>
            <CardContent className="p-6">
              {/* 20 Kenyan Construction Materials with Request Quote & Buy Now Buttons */}
              <MaterialsGridSafe />
                    </CardContent>
                  </Card>
                </div>
      </main>

      {/* Footer */}
        <Footer />
      </div>
  );
};

export default Suppliers;

