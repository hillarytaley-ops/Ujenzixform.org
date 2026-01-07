import React, { memo, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Users, 
  ShoppingCart, 
  Star, 
  Smartphone, 
  MapPin, 
  Shield, 
  Truck, 
  Building2, 
  Globe, 
  Store,
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart3,
  QrCode,
  Camera,
  Package,
  Clock,
  TrendingUp,
  Award,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import VideoSection from "@/components/VideoSection";

const Index = () => {
  const { userRole } = useAuth();
  
  // Determine scanner link based on user role
  // - Suppliers: Dispatch Scanner
  // - Delivery: Receiving Scanner
  // - Builders: No scanner (link to tracking instead)
  // - Others: General scanners page
  const getScannerLink = useMemo(() => {
    if (userRole === 'supplier') return '/supplier-dispatch-scanner';
    if (userRole === 'delivery') return '/delivery-receiving-scanner';
    if (userRole === 'builder') return '/tracking'; // Builders can't access scanners
    return '/scanners'; // Admin and unauthenticated see general page
  }, [userRole]);

  const platformFeatures = [
    {
      icon: Building2,
      title: "Find Certified Builders",
      description: "Connect with 2,500+ verified construction professionals across all 47 counties",
      color: "from-blue-500 to-cyan-600",
      link: "/builders"
    },
    {
      icon: Store,
      title: "Browse Suppliers",
      description: "Access 850+ quality-verified suppliers with competitive pricing",
      color: "from-green-500 to-emerald-600",
      link: "/suppliers"
    },
    {
      icon: Truck,
      title: "GPS Delivery Tracking",
      description: "Real-time delivery tracking with live driver location updates",
      color: "from-orange-500 to-red-600",
      link: "/delivery"
    },
    {
      icon: QrCode,
      title: "QR Material Scanning",
      description: userRole === 'builder' 
        ? "Track your material deliveries in real-time" 
        : "Scan and verify materials with our smart QR code system",
      color: "from-purple-500 to-pink-600",
      link: getScannerLink
    },
    {
      icon: Camera,
      title: "Site Monitoring",
      description: "Live camera feeds and drone surveillance for your construction sites",
      color: "from-indigo-500 to-blue-600",
      link: "/monitoring"
    },
    {
      icon: MapPin,
      title: "Real-Time Tracking",
      description: "Track all your deliveries and materials in one dashboard",
      color: "from-teal-500 to-cyan-600",
      link: "/tracking"
    }
  ];

  const stats = [
    { value: "2,500+", label: "Professional Builders", icon: Building2 },
    { value: "850+", label: "Verified Suppliers", icon: Store },
    { value: "25,000+", label: "Projects Completed", icon: CheckCircle2 },
    { value: "47", label: "Counties Covered", icon: MapPin }
  ];

  const testimonials = [
    {
      name: "John Kamau",
      role: "General Contractor",
      location: "Nairobi",
      content: "MradiPro has revolutionized how I source materials. The GPS tracking and QR verification give me peace of mind.",
      rating: 5,
      image: "JK"
    },
    {
      name: "Mary Wanjiku",
      role: "Hardware Store Owner",
      location: "Nakuru",
      content: "My sales increased by 200% in 6 months. The platform connects me with builders across Kenya seamlessly.",
      rating: 5,
      image: "MW"
    },
    {
      name: "Ahmed Hassan",
      role: "Construction Manager",
      location: "Mombasa",
      content: "The site monitoring feature is incredible. I can check on multiple projects from anywhere in real-time.",
      rating: 5,
      image: "AH"
    }
  ];

  const techFeatures = [
    { icon: Zap, label: "Real-Time Updates" },
    { icon: Shield, label: "Secure Transactions" },
    { icon: BarChart3, label: "Analytics Dashboard" },
    { icon: Smartphone, label: "Mobile Optimized" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section - Professional Construction + Tech Look */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background - Gradient shows instantly, image loads in background */}
        <div className="absolute inset-0">
          {/* Base gradient (shows immediately) */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />
          
          {/* Background image - Construction site with workers and machinery */}
          <img 
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&q=80"
            alt="Construction site with workers"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
            style={{ opacity: 0, transition: 'opacity 0.6s ease-in-out' }}
          />
          
          {/* Overlay gradient - darker for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-slate-900/85" />
          
          {/* Additional dark overlay on left for text area */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-transparent" />
        </div>

        {/* Animated Tech Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating orbs - orange accent */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Construction-themed grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Animated lines */}
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-orange-500/20 to-transparent" />
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <AnimatedSection animation="fadeInUp">
                <Badge className="mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 px-4 py-2 text-sm font-semibold">
                  🇰🇪 Kenya's #1 Construction Platform
                </Badge>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={100}>
                <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-orange-400">
                  Welcome to MradiPro
                </h3>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  <span className="text-white">Building Kenya's</span>
                  <br />
                  <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                    Digital Construction
                  </span>
                  <br />
                  <span className="text-white">Future</span>
                </h1>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={200}>
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed max-w-xl">
                  The complete construction management platform. Find builders, source materials, 
                  track deliveries with GPS, scan QR codes, and monitor sites with live cameras — 
                  all in one powerful ecosystem.
                </p>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={300}>
                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/builder-registration">
                    <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-6 text-lg shadow-xl">
                      <Building2 className="h-5 w-5 mr-2" />
                      Get Started Free
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/suppliers">
                    <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg backdrop-blur-sm">
                      <Play className="h-5 w-5 mr-2" />
                      See How It Works
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>

              {/* Tech Features Pills */}
              <AnimatedSection animation="fadeInUp" delay={400}>
                <div className="flex flex-wrap gap-3">
                  {techFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                      <feature.icon className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-white">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>

            {/* Right Content - Stats Card */}
            <AnimatedSection animation="fadeInUp" delay={300}>
              <div className="hidden lg:block">
                <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-6">
                      {stats.map((stat, index) => (
                        <div key={index} className="text-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                          <stat.icon className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                          <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                          <div className="text-sm text-gray-300">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-center gap-2 text-gray-300">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span>Trusted by 5,200+ construction professionals</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AnimatedSection>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background"/>
          </svg>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-8 bg-background -mt-4 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: "🚚", label: "Request Delivery", link: "/delivery" },
              { icon: "📍", label: "Track Materials", link: "/tracking" },
              { icon: "🎥", label: "Site Monitoring", link: "/monitoring" },
              { icon: "📦", label: userRole === 'builder' ? "Track Deliveries" : "QR Scanner", link: userRole === 'builder' ? "/tracking" : getScannerLink }
            ].map((item, index) => (
              <Link to={item.link} key={index}>
                <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20">
                  <CardContent className="p-4 text-center">
                    <span className="text-3xl block mb-2">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sign In Portals Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Access Your Dashboard</h2>
            <p className="text-muted-foreground">Sign in to your account to manage your business</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Builder Portal */}
            <Link to="/builder-signin">
              <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Builder Portal</h3>
                  <p className="text-sm text-muted-foreground mb-4">Manage your projects & orders</p>
                  <Badge className="bg-blue-100 text-blue-700">Sign In →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* Supplier Portal */}
            <Link to="/supplier-signin">
              <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">Supplier Portal</h3>
                  <p className="text-sm text-muted-foreground mb-4">Manage inventory & sales</p>
                  <Badge className="bg-orange-100 text-orange-700">Sign In →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* Delivery Provider Portal */}
            <Link to="/delivery-signin">
              <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-8 w-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-teal-800 mb-2">Delivery Provider</h3>
                  <p className="text-sm text-muted-foreground mb-4">Manage deliveries & routes</p>
                  <Badge className="bg-teal-100 text-teal-700">Sign In →</Badge>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Registration Section - All User Types */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-white/10 text-white border-white/20">New to MradiPro?</Badge>
            <h2 className="text-3xl font-bold mb-2">Join Our Platform</h2>
            <p className="text-white/70 max-w-xl mx-auto">Register based on your role to access tailored features</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {/* Private Client */}
            <Link to="/private-builder-registration">
              <Card className="h-full hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500/30 hover:border-emerald-400">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1">Private Client</h3>
                  <p className="text-emerald-100/70 text-xs mb-3">Home projects & personal purchases</p>
                  <Badge className="bg-white text-emerald-700 text-xs">Register →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* Professional Builder */}
            <Link to="/professional-builder-registration">
              <Card className="h-full hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/30 hover:border-blue-400">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1">Pro Builder</h3>
                  <p className="text-blue-100/70 text-xs mb-3">Contractors & companies</p>
                  <Badge className="bg-white text-blue-700 text-xs">Register →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* Supplier */}
            <Link to="/supplier-registration">
              <Card className="h-full hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-amber-600 to-orange-600 border-amber-500/30 hover:border-amber-400">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1">Supplier</h3>
                  <p className="text-amber-100/70 text-xs mb-3">Sell construction materials</p>
                  <Badge className="bg-white text-amber-700 text-xs">Register →</Badge>
                </CardContent>
              </Card>
            </Link>

            {/* Delivery Provider */}
            <Link to="/delivery/apply">
              <Card className="h-full hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-teal-600 to-cyan-600 border-teal-500/30 hover:border-teal-400">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1">Delivery</h3>
                  <p className="text-teal-100/70 text-xs mb-3">Transport & logistics</p>
                  <Badge className="bg-white text-teal-700 text-xs">Apply →</Badge>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Complete Platform
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Build
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From finding materials to monitoring your construction site, 
                MradiPro has all the tools you need in one powerful platform.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <Link to={feature.link}>
                  <Card className="h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer border-2 border-transparent hover:border-primary/20">
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <feature.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                      <div className="mt-4 flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn more <ArrowRight className="h-4 w-4 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-white/10 text-white border-white/20">
                🎬 Platform Demo
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                See MradiPro in Action
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Watch how our platform transforms construction management across Kenya
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto">
            <VideoSection 
              videoId="pedwSxiDpCs"
              useYouTube={true}
              thumbnail="https://img.youtube.com/vi/pedwSxiDpCs/maxresdefault.jpg"
              title="MradiPro Complete Platform Demo"
              description="See all features in action"
            />
          </div>

          {/* Video Feature Tags */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {["Live Monitoring", "GPS Tracking", "QR Scanning", "M-Pesa Payments", "47 Counties"].map((tag, index) => (
              <span key={index} className="px-4 py-2 bg-white/10 rounded-full text-sm">
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-orange-500/10 text-orange-600 border-orange-500/20">
                Simple Process
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get Started in 3 Steps
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Create Your Account",
                description: "Sign up as a builder or supplier and create your professional profile",
                icon: Users,
                color: "from-blue-500 to-cyan-600"
              },
              {
                step: "02",
                title: "Connect & Discover",
                description: "Find materials, suppliers, or builders that match your needs",
                icon: Search,
                color: "from-green-500 to-emerald-600"
              },
              {
                step: "03",
                title: "Build & Grow",
                description: "Track deliveries, monitor sites, and scale your construction business",
                icon: TrendingUp,
                color: "from-orange-500 to-red-600"
              }
            ].map((item, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 150}>
                <div className="text-center relative">
                  <div className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <span className="absolute top-0 right-1/4 -translate-x-1/2 text-6xl font-bold text-muted/20">
                    {item.step}
                  </span>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Kenya-Specific Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-green-600/10 text-green-700 border-green-600/20">
                🇰🇪 Made for Kenya
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for Kenya, By Kenyans
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Features designed specifically for the Kenyan construction market
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Smartphone, title: "M-Pesa Integration", description: "Pay seamlessly with M-Pesa and all major mobile money services", color: "bg-green-600" },
              { icon: MapPin, title: "47 Counties Coverage", description: "Find suppliers and deliver materials across all Kenyan counties", color: "bg-orange-500" },
              { icon: Shield, title: "KEBS Verified", description: "All materials meet Kenya Bureau of Standards specifications", color: "bg-blue-600" },
              { icon: Truck, title: "Local Logistics", description: "Partner with local transporters who understand Kenyan roads", color: "bg-red-500" },
              { icon: Building2, title: "SACCO Financing", description: "Connect with SACCOs for flexible project financing options", color: "bg-purple-600" },
              { icon: Globe, title: "Multi-Language", description: "Available in English and Swahili for better communication", color: "bg-teal-600" }
            ].map((feature, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`${feature.color} p-3 rounded-xl flex-shrink-0`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                <Star className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                Customer Stories
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trusted by Builders Across Kenya
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 150}>
                <Card className="h-full hover:shadow-xl transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {testimonial.image}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        <div className="text-xs text-primary">{testimonial.location}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-primary via-blue-600 to-primary text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <AnimatedSection animation="fadeInUp">
            <Award className="h-16 w-16 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Construction Business?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join 5,200+ construction professionals already using MradiPro to grow their business
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/builder-registration">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl">
                  <Building2 className="h-5 w-5 mr-2" />
                  Register as Builder
                </Button>
              </Link>
              <Link to="/supplier-registration">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg">
                  <Store className="h-5 w-5 mr-2" />
                  Register as Supplier
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-white/60 text-sm">
              Already have an account? <Link to="/auth" className="text-white underline hover:no-underline">Sign In</Link>
            </p>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
