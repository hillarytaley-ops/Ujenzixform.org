import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, ShoppingCart, FileText, UserPlus, LogIn, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FloatingSocialSidebar } from "@/components/FloatingSocialSidebar";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { prefetchRoutes } from "@/utils/routePrefetch";
 
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
    // Prefetch likely next pages for instant navigation
    prefetchRoutes(['/delivery', '/tracking', '/feedback'], 3000, 1000);
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FloatingSocialSidebar />
      <CartSidebar />
      <FloatingCartButton />
      <Navigation />

      {/* Hero Section - KENYAN Suppliers Using MradiPro Technology */}
      <section className="text-white py-24 px-4 relative overflow-hidden min-h-[600px]">
        {/* Main Background - Authentic Kenyan Hardware Store (Zoomed Out) */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/suppliers-hero-bg.jpg')`,
            backgroundSize: '120%',
            backgroundPosition: 'center center',
          }}
          aria-label="Kenyan hardware store with paint, Sika products, wheelbarrows and building materials"
        />
        
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-900/80" />
        
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
        
        {/* Tech Circuit Pattern Overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80H10z' fill='none' stroke='%2310b981' stroke-width='0.5'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2310b981'/%3E%3Ccircle cx='90' cy='10' r='2' fill='%2310b981'/%3E%3Ccircle cx='10' cy='90' r='2' fill='%2310b981'/%3E%3Ccircle cx='90' cy='90' r='2' fill='%2310b981'/%3E%3Cpath d='M50 10v30M10 50h30M50 60v30M60 50h30' stroke='%2310b981' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }} />
        
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
        
        {/* Main Content Container */}
        <div className="relative z-10 container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Side - Text Content */}
            <div className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <span className="text-2xl">🇰🇪</span>
                <span className="text-white font-semibold text-sm">Trusted by 500+ Kenyan Suppliers</span>
              </div>
              
              {/* Main Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                Kenyan Suppliers
                <span className="block text-emerald-400">Powered by MradiPro</span>
              </h1>
              
              {/* Subheading */}
              <p className="text-lg md:text-xl text-white/90 max-w-xl">
                From Nairobi to Mombasa, Kenyan construction material suppliers are growing their business with MradiPro's digital platform.
              </p>
              
              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400">500+</p>
                  <p className="text-white/80 text-sm">Active Suppliers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400">10K+</p>
                  <p className="text-white/80 text-sm">Products Listed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400">47</p>
                  <p className="text-white/80 text-sm">Counties Covered</p>
                </div>
              </div>
              
              {/* CTA Buttons - Matching Home Page */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/builder-registration">
                  <Button size="lg" className="bg-emerald-500 text-white hover:bg-emerald-400 font-bold px-8 py-6 text-lg shadow-xl">
                    <Building className="mr-2 h-5 w-5" />
                    Register as Builder
                  </Button>
                </Link>
                <Link to="/supplier-registration">
                  <Button size="lg" variant="outline" className="border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400/20 font-bold px-8 py-6 text-lg">
                    Register as Supplier
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right Side - Supplier Visual with Technology */}
            <div className="relative hidden lg:block">
              {/* Main Supplier Image with Tablet */}
              <div className="relative">
                {/* Primary Image - Kenyan Hardware Store (Zoomed Out) */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-500/30">
                  <img 
                    src="/suppliers-hero-bg.jpg"
                    alt="Kenyan hardware store with paint, building materials and supplies"
                    className="w-full h-[420px] object-contain bg-slate-800"
                    style={{ objectPosition: 'center center' }}
                  />
                  {/* Tech Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-transparent to-teal-900/30" />
                  
                  {/* MradiPro App Interface Overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Building className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">🇰🇪 MradiPro Supplier</p>
                            <p className="text-sm text-emerald-600">Digital Inventory Management</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Today's Sales</p>
                          <p className="font-bold text-emerald-600">KSh 125,000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scanning Effect Lines */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
                </div>
                
                {/* Floating Product Card - Top Right */}
                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-3 border border-gray-100 animate-bounce">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🧱</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Cement</p>
                      <p className="text-xs text-emerald-600">+23 orders</p>
                    </div>
                  </div>
                </div>
                
                {/* Floating Stats - Bottom Left */}
                <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-6 w-6" />
                    <div>
                      <p className="text-2xl font-black">500+</p>
                      <p className="text-xs opacity-90">Active Suppliers</p>
                    </div>
                  </div>
                </div>
                
                {/* Phone with App - Side */}
                <div className="absolute top-1/3 -right-12 transform">
                  <div className="w-28 h-52 bg-gray-900 rounded-3xl p-1.5 shadow-2xl border-2 border-gray-700 rotate-6 hover:rotate-0 transition-transform duration-500">
                    <div className="w-full h-full bg-gradient-to-b from-emerald-500 to-teal-700 rounded-2xl overflow-hidden relative">
                      {/* Phone Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-900 rounded-b-lg"></div>
                      {/* App Header */}
                      <div className="bg-emerald-600 p-2 text-center mt-2">
                        <p className="text-white text-[10px] font-bold">📱 MradiPro</p>
                      </div>
                      {/* App Content */}
                      <div className="p-2 space-y-1.5">
                        <div className="bg-white/25 rounded-lg p-1.5 backdrop-blur-sm">
                          <p className="text-white text-[8px] font-medium">📦 New Orders: 15</p>
                        </div>
                        <div className="bg-white/25 rounded-lg p-1.5 backdrop-blur-sm">
                          <p className="text-white text-[8px] font-medium">📊 Stock: 1,200+</p>
                        </div>
                        <div className="bg-white/25 rounded-lg p-1.5 backdrop-blur-sm">
                          <p className="text-white text-[8px] font-medium">💰 KSh 125K Today</p>
                        </div>
                        <div className="bg-yellow-400/40 rounded-lg p-1.5 border border-yellow-300/50">
                          <p className="text-white text-[8px] font-bold text-center">🔔 3 New Quotes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Construction Materials Icons - Floating */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-sm">🔧</span>
                  </div>
                  <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-sm">🪵</span>
                  </div>
                  <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-sm">⚙️</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shopping Trolley with Building Materials - Mobile & Desktop */}
            <div className="absolute bottom-4 right-4 lg:hidden">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Shop Materials</p>
                    <p className="text-xs text-emerald-600">Cement, Steel, Wood...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Large Shopping Trolley Visual - Floating on Left for Desktop */}
        <div className="absolute bottom-8 left-8 hidden xl:block z-20">
          <div className="relative">
            {/* Trolley Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-4 border-2 border-emerald-100 transform hover:scale-105 transition-transform duration-300">
              {/* Trolley Icon with Materials */}
              <div className="relative w-40 h-32 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl flex items-center justify-center overflow-hidden">
                {/* Trolley */}
                <div className="text-6xl">🛒</div>
                {/* Materials in trolley */}
                <div className="absolute top-2 left-2 text-xl animate-bounce" style={{animationDelay: '0ms'}}>🧱</div>
                <div className="absolute top-4 right-3 text-lg animate-bounce" style={{animationDelay: '200ms'}}>🪵</div>
                <div className="absolute top-1 right-8 text-base animate-bounce" style={{animationDelay: '400ms'}}>🔩</div>
                <div className="absolute bottom-8 left-6 text-sm animate-bounce" style={{animationDelay: '100ms'}}>⚙️</div>
                <div className="absolute bottom-6 right-6 text-base animate-bounce" style={{animationDelay: '300ms'}}>🪨</div>
              </div>
              {/* Cart Info */}
              <div className="mt-3 text-center">
                <p className="font-bold text-gray-900">Building Materials Cart</p>
                <p className="text-sm text-emerald-600">Shop from 500+ suppliers</p>
                <div className="flex justify-center gap-1 mt-2">
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Cement</span>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Steel</span>
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Wood</span>
                </div>
              </div>
            </div>
            {/* Items Count Badge */}
            <div className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg animate-pulse">
              12
            </div>
          </div>
        </div>
        
        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" fillOpacity="0.1"/>
          </svg>
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          {/* Flag */}
          <div className="text-5xl mb-4">🇰🇪</div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
            MradiPro Suppliers
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-semibold text-yellow-300 mb-6 drop-shadow-md">
            Kenya's Premier Materials Marketplace
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto text-white/90">
            Browse verified suppliers and quality construction materials across all 47 counties
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            <Button 
              size="lg"
              className="w-full h-14 bg-white text-blue-900 hover:bg-gray-100 font-bold text-lg"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Materials
            </Button>
            
            {/* Organized Sign In & Register Portals */}
            <div className="grid grid-cols-3 gap-3">
              {/* Private Client */}
              <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-green-300 text-xs font-semibold mb-2 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Private Client
                </p>
                <div className="flex flex-col gap-1">
                  <Link to="/private-client-signin">
                    <Button size="sm" className="w-full h-8 bg-green-600 hover:bg-green-700 text-xs">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/private-builder-registration">
                    <Button size="sm" variant="outline" className="w-full h-8 border-green-400/50 text-green-300 hover:bg-green-500/20 text-xs">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Professional Builder */}
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30">
                <p className="text-blue-300 text-xs font-semibold mb-2 flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  Pro Builder
                </p>
                <div className="flex flex-col gap-1">
                  <Link to="/professional-builder-signin">
                    <Button size="sm" className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-xs">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/professional-builder-registration">
                    <Button size="sm" variant="outline" className="w-full h-8 border-blue-400/50 text-blue-300 hover:bg-blue-500/20 text-xs">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Supplier */}
              <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg p-3 border border-amber-400/30">
                <p className="text-amber-300 text-xs font-semibold mb-2 flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  Supplier
                </p>
                <div className="flex flex-col gap-1">
                  <Link to="/supplier-signin">
                    <Button size="sm" className="w-full h-8 bg-amber-600 hover:bg-amber-700 text-xs">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/supplier-registration">
                    <Button size="sm" variant="outline" className="w-full h-8 border-amber-400/50 text-amber-300 hover:bg-amber-500/20 text-xs">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Status / Sign In Section */}
      {!loading && (
        <section className="py-8 px-4 bg-gray-50 border-b">
          <div className="container mx-auto max-w-4xl">
            {user && userRole ? (
              // Logged in user - show capabilities and dashboard link
              <Card className="border-2 border-green-500 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="text-green-600">✅</span>
                        Welcome back, {user.email}!
                      </h3>
                      {(userRole === 'builder' || userRole === 'professional_builder') && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-blue-600">Builder Account:</strong> Request quotes and create purchase orders.
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
                      {userRole === 'supplier' && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-amber-600">Supplier Account:</strong> Manage your products and orders.
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-amber-600">
                              <Building className="h-3 w-3 mr-1" />
                              Manage Products
                            </Badge>
                            <Badge className="bg-amber-600">
                              <FileText className="h-3 w-3 mr-1" />
                              View Orders
                            </Badge>
                          </div>
                        </div>
                      )}
                      {userRole === 'private_client' && (
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong className="text-green-600">Private Client Account:</strong> Purchase materials directly.
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
                    {/* Dashboard Button */}
                    <div className="flex gap-2">
                      {(userRole === 'builder' || userRole === 'professional_builder' || userRole === 'private_client') && (
                        <Link to="/builder-dashboard">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Building className="h-4 w-4 mr-2" />
                            My Dashboard
                          </Button>
                        </Link>
                      )}
                      {userRole === 'supplier' && (
                        <Link to="/supplier-dashboard">
                          <Button className="bg-amber-600 hover:bg-amber-700">
                            <Building className="h-4 w-4 mr-2" />
                            My Dashboard
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : user && !userRole ? (
              // Logged in but no role - prompt to complete registration
              <Card className="border-2 border-blue-500 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <span className="text-blue-600">👋</span>
                    Complete Your Registration
                  </CardTitle>
                  <CardDescription>
                    You're signed in as {user.email}. Choose your role to continue:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link to="/builder-registration" className="block">
                      <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 h-14">
                        <Building className="h-5 w-5 mr-2" />
                        Register as Builder
                      </Button>
                    </Link>
                    <Link to="/supplier-registration" className="block">
                      <Button size="lg" variant="outline" className="w-full border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white h-14">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Register as Supplier
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Not logged in - show 3 sign-in portals
              <div id="portals" className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Portal</h2>
                  <p className="text-gray-600">Sign in to access the marketplace and purchase materials</p>
                </div>
                
                {/* 3 Sign-in Portals Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Private Client Portal - Green */}
                  <Card className="border-2 border-green-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <ShoppingCart className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Private Client</CardTitle>
                      <CardDescription className="text-green-100">
                        Personal purchases for home projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Direct material purchases
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Personal project tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Exclusive offers
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/private-client-signin" className="block">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/private-client-registration" className="block">
                          <Button variant="outline" className="w-full border-green-500 text-green-700 hover:bg-green-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Builder Portal - Blue */}
                  <Card className="border-2 border-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Professional Builder</CardTitle>
                      <CardDescription className="text-blue-100">
                        Contractors & construction companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Bulk material orders
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Trade discounts & credit
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          Project management tools
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/professional-builder-signin" className="block">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/professional-builder-registration" className="block">
                          <Button variant="outline" className="w-full border-blue-500 text-blue-700 hover:bg-blue-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supplier Portal - Amber */}
                  <Card className="border-2 border-amber-500 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="text-center bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-t-lg">
                      <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Supplier</CardTitle>
                      <CardDescription className="text-amber-100">
                        Sell your materials on MradiPro
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          List & manage products
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          Receive & process orders
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-600">✓</span>
                          Grow your business
                        </li>
                      </ul>
                      <div className="space-y-2">
                        <Link to="/supplier-signin" className="block">
                          <Button className="w-full bg-amber-600 hover:bg-amber-700">
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/supplier-registration" className="block">
                          <Button variant="outline" className="w-full border-amber-500 text-amber-700 hover:bg-amber-50">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
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
