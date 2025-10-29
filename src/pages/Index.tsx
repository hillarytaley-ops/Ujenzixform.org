import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ShoppingCart, Star, Smartphone, MapPin, Shield, Truck, Building2, Globe, Store } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OptimizedBackground from "@/components/OptimizedBackground";
import AnimatedSection from "@/components/AnimatedSection";
import AnimatedCounter from "@/components/AnimatedCounter";
import VideoSection from "@/components/VideoSection";
import TrustBadges from "@/components/TrustBadges";
import ABTestCTAButtons from "@/components/ABTestCTAButtons";
import AnimatedHero from "@/components/AnimatedHero";
import AnimatedStatsGrid from "@/components/AnimatedStatsGrid";
import AnimatedCTAButtons from "@/components/AnimatedCTAButtons";
import AnimatedFeatureCard from "@/components/AnimatedFeatureCard";

// Memoized components for better performance
const FeatureCard = memo(({ feature, index }: { feature: any, index: number }) => (
  <AnimatedSection animation="fadeInUp" delay={index * 100}>
    <Card className="text-center hover:shadow-xl hover:scale-105 transition-all duration-300 bg-card border-border group">
      <CardHeader>
        <div className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit group-hover:scale-110 transition-transform duration-300">
          <feature.icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-lg text-card-foreground">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
      </CardContent>
    </Card>
  </AnimatedSection>
));

const TestimonialCard = memo(({ testimonial, index }: { testimonial: any, index: number }) => (
  <AnimatedSection animation="fadeInUp" delay={index * 150}>
    <Card className="hover:shadow-xl hover:-translate-y-2 transition-all duration-300 bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex mb-4">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-5 w-5 text-construction-orange fill-current hover:scale-125 transition-transform duration-200" />
          ))}
        </div>
        <p className="text-card-foreground mb-4">"{testimonial.content}"</p>
        <div>
          <div className="font-semibold text-card-foreground">{testimonial.name}</div>
          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
          <div className="text-xs text-kenyan-green font-medium mt-1">{testimonial.project}</div>
        </div>
      </CardContent>
    </Card>
  </AnimatedSection>
));

const Index = () => {
  const features = [
    {
      icon: Search,
      title: "Find Materials Easily",
      description: "Search thousands of construction materials from verified suppliers across Kenya"
    },
    {
      icon: Users,
      title: "Connect with Professionals", 
      description: "Network with trusted builders and reliable material suppliers"
    },
    {
      icon: ShoppingCart,
      title: "Request Quotes",
      description: "Get competitive prices and compare offers from multiple sellers"
    },
    {
      icon: Star,
      title: "Verified Reviews",
      description: "Read genuine reviews and ratings from the construction community"
    }
  ];

  const testimonials = [
    {
      name: "John Kamau",
      role: "General Contractor, Nairobi",
      content: "UjenziPro has revolutionized how I source materials from Mombasa to Kisumu. M-Pesa integration makes payments seamless, and I save 30% on every project.",
      rating: 5,
      project: "Built 50+ homes in Kiambu"
    },
    {
      name: "Mary Wanjiku",
      role: "Hardware Store Owner, Nakuru", 
      content: "This platform connected me with builders across Central Kenya. My sales increased by 200% in 6 months. The delivery tracking to remote areas is excellent!",
      rating: 5,
      project: "Serving 15+ counties"
    },
    {
      name: "Ahmed Hassan",
      role: "Builder, Mombasa",
      content: "Finding quality cement and steel in Coast region used to be challenging. Now I get competitive quotes from suppliers in Nairobi with reliable delivery to Kilifi.",
      rating: 5,
      project: "Coastal construction specialist"
    },
    {
      name: "Grace Achieng",
      role: "SACCO Manager, Kisumu",
      content: "We finance many construction projects. UjenziPro's transparent pricing and verified suppliers give us confidence in approving loans for our members.",
      rating: 5,
      project: "KES 500M+ projects financed"
    }
  ];

  return (
    <OptimizedBackground
      src="/construction-site-drones.jpg"
      fallbackSrc="/kenyan-home-bg-small.svg"
      className="min-h-screen"
    >
        <Navigation />

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <AnimatedSection animation="fadeInUp">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground drop-shadow-lg">
              Kenya's Construction Marketplace
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-foreground/90 max-w-4xl mx-auto">
              Connect builders, suppliers, and construction professionals across all 47 counties
            </p>
            <p className="text-lg mb-10 text-foreground/80 max-w-4xl mx-auto leading-relaxed">
              <strong>Your Complete Construction Solution:</strong> Find and hire certified builders and contractors, 
              browse verified suppliers and source quality materials, request and manage deliveries with real-time GPS tracking, 
              scan materials with QR codes for authenticity verification, monitor construction sites with live cameras and drones, 
              process secure M-Pesa payments, generate purchase orders and invoices, track project progress, 
              and manage your entire construction workflow - all in one integrated platform designed for Kenya's construction industry.
            </p>
          </AnimatedSection>
          
          {/* Main Action Buttons */}
          <AnimatedSection animation="fadeInUp" delay={100}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/builders">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-6 shadow-xl">
                  👷 Find Builders
                </Button>
              </Link>
              <Link to="/suppliers">
                <Button size="lg" variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-10 py-6 shadow-xl bg-white/90">
                  🏪 Browse Suppliers
                </Button>
              </Link>
            </div>
            
            {/* Quick Access Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-12">
              <Link to="/delivery">
                <Button variant="ghost" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-white/80 hover:shadow-md transition-all bg-white/60">
                  <span className="text-2xl">🚚</span>
                  <span className="text-sm font-medium">Request Delivery</span>
                </Button>
              </Link>
              <Link to="/tracking">
                <Button variant="ghost" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-white/80 hover:shadow-md transition-all bg-white/60">
                  <span className="text-2xl">📍</span>
                  <span className="text-sm font-medium">Track Materials</span>
                </Button>
              </Link>
              <Link to="/monitoring">
                <Button variant="ghost" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-white/80 hover:shadow-md transition-all bg-white/60">
                  <span className="text-2xl">🎥</span>
                  <span className="text-sm font-medium">Site Monitoring</span>
                </Button>
              </Link>
              <Link to="/scanners">
                <Button variant="ghost" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-white/80 hover:shadow-md transition-all bg-white/60">
                  <span className="text-2xl">📦</span>
                  <span className="text-sm font-medium">QR Scanner</span>
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          {/* Registration Section */}
          <AnimatedSection animation="scaleIn" delay={200}>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Ready to Get Started?</h2>
              <p className="text-gray-700 mb-6">Join UjenziPro and grow your construction business</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/builder-registration">
                  <Button size="lg" className="w-full bg-construction-orange hover:bg-construction-orange/90 text-white py-6">
                    <Building2 className="h-5 w-5 mr-2" />
                    Register as Builder
                  </Button>
                </Link>
                <Link to="/suppliers">
                  <Button size="lg" variant="outline" className="w-full border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white py-6">
                    <Store className="h-5 w-5 mr-2" />
                    Register as Supplier
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Already have an account? <Link to="/auth" className="text-primary hover:underline font-medium">Sign In</Link>
              </p>
            </div>
          </AnimatedSection>

          {/* Quick Stats */}
          <div className="mt-12">
            <AnimatedStatsGrid
              stats={[
                {
                  value: 2500,
                  suffix: "+",
                  label: "Professional Builders",
                  sublabel: "Across 47 Counties",
                  color: "text-acacia-gold"
                },
                {
                  value: 850,
                  suffix: "+",
                  label: "Verified Suppliers",
                  sublabel: "Quality Guaranteed",
                  color: "text-kenyan-green"
                },
                {
                  value: 25000,
                  suffix: "+",
                  label: "Successful Projects",
                  sublabel: "KES 15B+ Value",
                  color: "text-primary"
                },
                {
                  value: 5200,
                  suffix: "+",
                  label: "Happy Clients",
                  sublabel: "Coast to Lake",
                  color: "text-construction-orange"
                }
              ]}
            />
          </div>

        </section>

        {/* Video Section - Complete Platform Demo with Monitoring */}
        <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="fadeInUp">
              <div className="text-center mb-12">
                {/* NEW Badge highlighting monitoring */}
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1 text-sm font-semibold">
                  🚁 NEW: Real-Time Site Monitoring
                </Badge>
                
                {/* Updated heading */}
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  See UjenziPro's Complete Platform in Action
                </h2>
                
                {/* Enhanced description with monitoring emphasis */}
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Watch our comprehensive demo featuring{' '}
                  <span className="font-semibold text-primary">
                    real-time construction site monitoring with drones and cameras
                  </span>
                  , builder directory, supplier network, QR material tracking, and secure M-Pesa payments 
                  across all 47 counties.
                </p>
                
                {/* Video metadata */}
                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
                    <span>5-6 minutes</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base">📹</span>
                    <span>Full HD</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <span>All Features</span>
                  </span>
                </div>
              </div>
            </AnimatedSection>
            
            <div className="max-w-5xl mx-auto">
              {/* YouTube Video - UjenziPro Complete Demo */}
              <VideoSection 
                videoId="pedwSxiDpCs"
                useYouTube={true}
                thumbnail="https://img.youtube.com/vi/pedwSxiDpCs/maxresdefault.jpg"
                title="UjenziPro Complete Platform Demo with Monitoring"
                description="Real-time site monitoring, builder network, supplier marketplace, QR tracking, and more"
              />
              
              {/* Feature cards showing what's in the video */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
                  <div className="text-3xl mb-2">🚁</div>
                  <div className="font-semibold text-sm text-foreground">Live Monitoring</div>
                  <div className="text-xs text-muted-foreground mt-1">Drones & Cameras</div>
                </div>
                
                <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
                  <div className="text-3xl mb-2">👷</div>
                  <div className="font-semibold text-sm text-foreground">2,500+ Builders</div>
                  <div className="text-xs text-muted-foreground mt-1">Verified Professionals</div>
                </div>
                
                <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
                  <div className="text-3xl mb-2">🏪</div>
                  <div className="font-semibold text-sm text-foreground">850+ Suppliers</div>
                  <div className="text-xs text-muted-foreground mt-1">Quality Materials</div>
                </div>
                
                <div className="text-center p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default">
                  <div className="text-3xl mb-2">📦</div>
                  <div className="font-semibold text-sm text-foreground">QR Tracking</div>
                  <div className="text-xs text-muted-foreground mt-1">Full Traceability</div>
                </div>
              </div>
              
              {/* Benefits callout */}
              <div className="mt-8 bg-gradient-to-r from-blue-50/50 to-gray-50/50 rounded-lg p-6 border border-gray-200">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    Everything You Need in One Platform
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>M-Pesa Payments</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>47 Counties</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>KEBS Verified</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>Real-time Alerts</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>GPS Delivery</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-kenyan-green">✓</span>
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="fadeInUp">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Why Choose UjenziPro?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We make it easy for builders and suppliers to find each other, 
                  negotiate fair prices, and build successful partnerships.
                </p>
              </div>
            </AnimatedSection>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <AnimatedFeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary-foreground mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground">Simple steps to get started</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-foreground text-background rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold border-2 border-border">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2 text-secondary-foreground">Create Your Profile</h3>
                <p className="text-muted-foreground">Sign up and create a detailed profile showcasing your business</p>
              </div>
              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2 text-secondary-foreground">Search & Connect</h3>
                <p className="text-muted-foreground">Find materials or customers using our advanced search filters</p>
              </div>
              <div className="text-center">
                <div className="bg-construction-orange text-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2 text-secondary-foreground">Build & Grow</h3>
                <p className="text-muted-foreground">Complete transactions and build lasting business relationships</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-accent">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-accent-foreground mb-4">What Our Users Say</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <TestimonialCard key={index} testimonial={testimonial} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Kenya-Specific Features */}
        <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Built for Kenya, By Kenyans
              </h2>
              <p className="text-xl font-semibold text-white max-w-2xl mx-auto drop-shadow-lg">
                Features designed specifically for the Kenyan construction market
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-kenyan-green rounded-full w-fit">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">M-Pesa Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Pay seamlessly with M-Pesa, Airtel Money, and all major Kenyan mobile money services. 
                    No need for cash or bank transfers.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-acacia-gold rounded-full w-fit">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">47 Counties Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    From Turkana to Kwale, from Mandera to Busia. Find suppliers and deliver materials 
                    across all Kenyan counties with accurate delivery estimates.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit">
                    <Shield className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">KEBS Verified</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    All materials meet Kenya Bureau of Standards specifications. 
                    Quality assured for your construction projects.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-construction-orange rounded-full w-fit">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">Local Logistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Partner with local transporters who understand Kenyan roads, weather patterns, 
                    and delivery challenges across diverse terrain.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-kenyan-black rounded-full w-fit">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">SACCO Financing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Connect with SACCOs and microfinance institutions for project financing. 
                    Build now, pay later with flexible terms.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-safety-yellow rounded-full w-fit">
                    <Globe className="h-6 w-6 text-kenyan-black" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">Multi-Language</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Available in English and Swahili. Local language support for better 
                    communication across diverse communities.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-text-on-dark relative">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/kenyan-home-bg-small.svg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          <div className="container mx-auto px-4 text-center relative z-10">
            <AnimatedSection animation="fadeInUp">
              <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">Ready to Transform Your Construction Business?</h2>
              <p className="text-xl mb-8 text-text-secondary-light drop-shadow-md">Join thousands of builders, suppliers, and clients already using UjenziPro</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/builder-registration">
                  <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90 text-foreground text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200">
                    Start Building Connections Today
                  </Button>
                </Link>
                <Link to="/suppliers">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4 shadow-lg backdrop-blur-sm transform hover:scale-105 transition-all duration-200">
                    Explore Opportunities
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>

        <Footer />
    </OptimizedBackground>
  );
};

export default Index;