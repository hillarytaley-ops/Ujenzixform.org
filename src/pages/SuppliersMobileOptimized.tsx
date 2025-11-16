import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, ShoppingCart, FileText, UserPlus, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
 
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";

// Ultra-optimized Suppliers page for mobile/iPhone
const SuppliersMobileOptimized = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
          .maybeSingle();
        
        setUserRole(roleData?.role || null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

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
            
            {/* Sign In Button */}
            <Link to="/auth">
              <Button 
                size="lg"
                variant="secondary"
                className="w-full h-12 bg-white/20 text-white hover:bg-white/30"
              >
                <Building className="h-5 w-5 mr-2" />
                Sign In / Register
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* User Status / Sign In Section */}
      {!loading && (
        <section className="py-8 px-4 bg-gray-50 border-b">
          <div className="container mx-auto max-w-4xl">
            {user && userRole ? (
              // Logged in user - show capabilities
              <Alert className="bg-white border-2 border-green-500">
                <AlertDescription>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">
                        Welcome, {user.email}! ✅
                      </h3>
                      {(userRole === 'builder' || userRole === 'professional_builder') && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-blue-600">Builder Account:</strong> You can request quotes and create purchase orders.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-blue-600">
                              <FileText className="h-3 w-3 mr-1" />
                              Request Quotes
                            </Badge>
                            <Badge className="bg-blue-600">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Purchase Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                      {userRole === 'private_client' && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-green-600">Private Client Account:</strong> You can purchase materials directly.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-green-600">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Direct Purchase
                            </Badge>
                            <Badge className="bg-green-600">
                              <Building className="h-3 w-3 mr-1" />
                              Instant Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              // Not logged in - show sign in options
              <Card className="border-2 border-blue-500 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Sign In to Get Started</CardTitle>
                  <CardDescription className="text-base">
                    Create an account to request quotes or purchase materials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Professional Builders */}
                    <Card className="border-2 border-blue-300 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Professional Builders
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">✓</span>
                            <span>Request quotes from multiple suppliers</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">✓</span>
                            <span>Create purchase orders</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">✓</span>
                            <span>Track deliveries</span>
                          </li>
                        </ul>
                        <Link to="/professional-builder-registration" className="block">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register as Builder
                          </Button>
                        </Link>
                        <Link to="/auth" className="block">
                          <Button variant="outline" className="w-full">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* Private Clients */}
                    <Card className="border-2 border-green-300 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Private Clients
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Purchase materials directly</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Instant checkout</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Home delivery available</span>
                          </li>
                        </ul>
                        <Link to="/private-client-registration" className="block">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register as Client
                          </Button>
                        </Link>
                        <Link to="/auth" className="block">
                          <Button variant="outline" className="w-full">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

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
            {!user && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-300">
                <AlertDescription className="text-center">
                  <strong>👋 Sign in above to request quotes or purchase materials!</strong>
                </AlertDescription>
              </Alert>
            )}
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
              <MaterialsGrid />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuppliersMobileOptimized;

