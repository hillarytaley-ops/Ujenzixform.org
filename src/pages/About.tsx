import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  Award,
  Globe,
  Shield,
  SkipForward,
  Building2,
  Truck,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Quote,
  Package,
  ScanLine,
  QrCode,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";

function TeamAvatar({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src?.trim() || failed) {
    return <Users className="h-16 w-16 text-primary/40" aria-hidden />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const About: React.FC = () => {
  const publicStats = useHomePagePublicStats();
  const [pageViews, setPageViews] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const startTime = performance.now();

    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      setPerformanceMetrics((prev) => ({ ...prev, loadTime }));
    };

    window.addEventListener("load", handleLoad);
    const renderTime = performance.now() - startTime;
    setPerformanceMetrics((prev) => ({ ...prev, renderTime }));

    const views = parseInt(localStorage.getItem("about-page-views") || "0", 10) + 1;
    setPageViews(views);
    localStorage.setItem("about-page-views", String(views));

    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  const values = [
    {
      icon: Target,
      title: "Our Mission", 
      description: "To revolutionize Kenya's construction industry by creating seamless connections between builders and suppliers, fostering growth and innovation.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Community First",
      description: "We believe in building strong relationships and supporting local businesses to create a thriving construction ecosystem.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Award,
      title: "Quality Assurance",
      description:
        "We verify supplier storefronts and onboard builders through structured checks, and we keep improving trust and safety as the network grows.",
      color: "from-orange-500 to-amber-500"
    },
    {
      icon: Globe,
      title: "National Reach",
      description:
        "Kenya has 47 counties — we focus on major construction hubs today and aim to deepen coverage everywhere builders and suppliers need us.",
      color: "from-purple-500 to-pink-500"
    }
  ];

  const team = [
    {
      name: "Hillary Kapting'ei",
      role: "CEO & Founder",
      description: "Information Technology Specialist with 6 years of experience in tech innovation and construction solutions",
      image: "/hillary-ceo.jpg?v=2"
    },
    {
      name: "Sila Kapting'ei",
      role: "Construction Industry Expert",
      description: "Architectural Engineer with 10 years of experience in construction and engineering solutions",
      image: "/sila-expert.jpg"
    },
    {
      name: "Eliud Rugut",
      role: "Head of Business Development & Co-Founder",
      description: "Accomplished businessman and unmatched innovator with 15 years of experience in innovation and business development",
      image: "/eliud-cofounder.jpg?v=3"
    }
  ];

  const milestones = [
    { year: "2023", title: "Founded", description: "UjenziXform started in Nairobi to link construction supply and demand." },
    { year: "2024", title: "Marketplace momentum", description: "Materials discovery, builder projects, and supplier storefronts on one platform." },
    { year: "2025", title: "Operations depth", description: "Delivery coordination, QR traceability, and site monitoring workflows." },
    { year: "2026", title: "Growing together", description: "Scaling with Kenya’s builders, suppliers, and delivery partners." },
  ];

  return (
    <>
      {/* Skip Navigation Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 transition-all"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        <SkipForward className="h-4 w-4 inline mr-2" />
        Skip to main content
      </a>
      
      <div className="min-h-screen bg-background">
        <Navigation />

        {/* Hero Section - Professional with Construction Theme */}
        <section className="relative overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-slate-900/95" />
          </div>

          {/* Animated Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Grid Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative container mx-auto px-4 py-20 md:py-32">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <AnimatedSection animation="fadeInUp">
                <Badge className="mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 px-6 py-2 text-base font-semibold shadow-lg">
                  🇰🇪 Proudly Kenyan - Building the Future
                </Badge>
              </AnimatedSection>

              {/* Main Heading */}
              <AnimatedSection animation="fadeInUp" delay={100}>
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
                    About UjenziXform
                  </span>
                </h1>
              </AnimatedSection>

              {/* Subtitle */}
              <AnimatedSection animation="fadeInUp" delay={200}>
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Transforming Kenya&apos;s construction industry through technology, connecting{" "}
                  <span className="text-cyan-400 font-semibold">builders</span> with trusted{" "}
                  <span className="text-green-400 font-semibold">suppliers</span> and delivery partners nationwide.
                </p>
              </AnimatedSection>

              {/* CTA Buttons */}
              <AnimatedSection animation="fadeInUp" delay={300}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                  <Button 
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl"
                    asChild
                  >
                    <Link to="/builder-registration">
                      <Building2 className="h-5 w-5 mr-2" />
                      Join as Builder
                    </Link>
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
                    asChild
                  >
                    <Link to="/supplier-registration">
                      <Truck className="h-5 w-5 mr-2" />
                      Join as Supplier
                    </Link>
                  </Button>
                </div>
              </AnimatedSection>

              {/* Hero stats — live aggregates (same RPC as home / monitoring hero) */}
              <AnimatedSection animation="fadeInUp" delay={400}>
                <p className="text-xs text-gray-500 mb-4 max-w-xl mx-auto">
                  Live platform totals from our database (rounded; updates as people join and projects grow).
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums">
                      {formatHomeStatCount(publicStats.registeredNetwork, publicStats.loading)}
                    </div>
                    <div className="text-sm text-gray-400">Network accounts</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6">
                    <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1 tabular-nums">
                      {formatHomeStatCount(publicStats.builderProjects, publicStats.loading)}
                    </div>
                    <div className="text-sm text-gray-400">Builder projects</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6">
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-1 tabular-nums">
                      {formatHomeStatCount(publicStats.professionalBuilders, publicStats.loading)}
                    </div>
                    <div className="text-sm text-gray-400">CO/Contractors</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6">
                    <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-1 tabular-nums">
                      {formatHomeStatCount(publicStats.supplierCompanies, publicStats.loading)}
                    </div>
                    <div className="text-sm text-gray-400">Supplier companies</div>
                  </div>
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

        {/* Our Story Section */}
        <section className="py-20 bg-background" id="main-content" tabIndex={-1}>
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Story Content */}
                <AnimatedSection animation="fadeInUp">
                  <div>
                    <Badge variant="outline" className="mb-4">Our Story</Badge>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                      Building Kenya's <span className="text-primary">Future</span> Together
                    </h2>
                    <div className="space-y-4 text-lg text-muted-foreground">
                      <p>
                        UjenziXform was born from a simple observation: Kenya's construction industry needed
                        not just better connections, but complete project visibility.
                      </p>
                      <p>
                        Founded in 2023 by a team of construction industry veterans and technology experts, we
                        have grown into a dedicated digital platform for construction professionals in Kenya.
                      </p>
                      <p>
                        Today we support a growing network of builders, suppliers, and delivery partners. The live
                        figures on this page reflect real sign-ups and activity in our system — not a revenue or bank
                        total.
                      </p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Trusted Platform</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Verified Partners</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Secure Transactions</span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Timeline */}
                <AnimatedSection animation="fadeInUp" delay={200}>
                  <div className="bg-muted/50 rounded-2xl p-8">
                    <h3 className="text-xl font-semibold mb-6">Our Journey</h3>
                    <div className="space-y-6">
                      {milestones.map((milestone, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                              {milestone.year.slice(2)}
                            </div>
                            {index < milestones.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-2" />
                            )}
                          </div>
                          <div className="pb-6">
                            <div className="font-semibold">{milestone.title}</div>
                            <div className="text-sm text-muted-foreground">{milestone.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Our Values</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">What Drives Us</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Built on the foundation of Kenyan values: Ubuntu, integrity, and community strength
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-background">
                    <CardHeader className="pb-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${value.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                        <value.icon className="h-7 w-7 text-white" />
                      </div>
                      <CardTitle className="text-xl">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {value.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>

            {/* Ubuntu Quote */}
            <AnimatedSection animation="fadeInUp" delay={400}>
              <div className="mt-16 max-w-3xl mx-auto">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-8 text-center">
                    <Quote className="h-10 w-10 text-primary/40 mx-auto mb-4" />
                    <p className="text-xl md:text-2xl font-medium italic mb-4">
                      "I am because we are"
                    </p>
                    <p className="text-muted-foreground">
                      Our success is built on the success of every builder, supplier, and construction professional in Kenya.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Our Team</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Meet the Visionaries</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Experienced professionals dedicated to transforming Kenya's construction landscape
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {team.map((member, index) => (
                <AnimatedSection key={index} animation="scaleIn" delay={index * 150}>
                  <Card className="text-center hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="relative mx-auto mb-4">
                        <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-background shadow-xl group-hover:ring-primary/20 transition-all">
                          <TeamAvatar
                            src={member.image && member.image !== "/placeholder.svg" ? member.image : ""}
                            alt={`${member.name} - ${member.role}`}
                          />
                        </div>
                      </div>
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {member.role}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {member.description}
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
          <div className="absolute inset-0 opacity-10">
            <div 
              className="h-full w-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-white/10 text-white border-white/20">Our Impact</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Impact Across Kenya</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                From Mombasa to Kisumu, Nairobi to Eldoret — these activity metrics are live counts from the same
                public stats we use on the home page (materials, logistics, and QR).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <AnimatedSection animation="fadeInUp" delay={0}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center hover:bg-white/15 transition-all">
                  <Package className="h-8 w-8 text-green-400 mx-auto mb-3" aria-hidden />
                  <div className="text-5xl font-bold text-green-400 mb-2 tabular-nums">
                    {formatHomeStatCount(publicStats.approvedMaterials, publicStats.loading)}
                  </div>
                  <div className="text-xl font-semibold text-white mb-1">Approved materials</div>
                  <div className="text-sm text-gray-400">Marketplace rows (approved)</div>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={100}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center hover:bg-white/15 transition-all">
                  <Truck className="h-8 w-8 text-blue-400 mx-auto mb-3" aria-hidden />
                  <div className="text-5xl font-bold text-blue-400 mb-2 tabular-nums">
                    {formatHomeStatCount(publicStats.deliveryRequestsActive, publicStats.loading)}
                  </div>
                  <div className="text-xl font-semibold text-white mb-1">Active deliveries</div>
                  <div className="text-sm text-gray-400">In-flight delivery requests</div>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={200}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center hover:bg-white/15 transition-all">
                  <ScanLine className="h-8 w-8 text-yellow-400 mx-auto mb-3" aria-hidden />
                  <div className="text-5xl font-bold text-yellow-400 mb-2 tabular-nums">
                    {formatHomeStatCount(publicStats.qrScanEventsTotal, publicStats.loading)}
                  </div>
                  <div className="text-xl font-semibold text-white mb-1">QR scan events</div>
                  <div className="text-sm text-gray-400">Recorded scans on the platform</div>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={300}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center hover:bg-white/15 transition-all">
                  <QrCode className="h-8 w-8 text-red-400 mx-auto mb-3" aria-hidden />
                  <div className="text-5xl font-bold text-red-400 mb-2 tabular-nums">
                    {formatHomeStatCount(publicStats.materialItemsWithQr, publicStats.loading)}
                  </div>
                  <div className="text-xl font-semibold text-white mb-1">Materials with QR</div>
                  <div className="text-sm text-gray-400">Items carrying QR in catalog</div>
                </div>
              </AnimatedSection>
            </div>
            
            {/* Cities */}
            <div className="mt-16 text-center">
              <h3 className="text-xl font-semibold mb-6 text-white">Serving Kenya's Major Construction Hubs</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 'Nyeri', 'Malindi', 'Kitale'].map((city) => (
                  <Badge key={city} className="bg-white/10 text-white border-white/20 px-4 py-2 text-sm font-medium">
                    <MapPin className="h-3 w-3 mr-1" />
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary to-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <AnimatedSection animation="fadeInUp">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Something Great?</h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Join builders and suppliers who use UjenziXform to coordinate materials, delivery, and site visibility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="font-semibold px-8"
                  asChild
                >
                  <Link to="/builder-registration">
                    <Building2 className="h-5 w-5 mr-2" />
                    Get Started Today
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 font-semibold px-8"
                  asChild
                >
                  <Link to="/contact">
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Contact Us
                  </Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Dev Performance Metrics */}
        {import.meta.env.DEV && (
          <section className="py-4 bg-muted border-t">
            <div className="container mx-auto px-4">
              <div className="flex justify-center items-center gap-6 text-xs text-muted-foreground">
                <span>Page Views: {pageViews}</span>
                <span>Load Time: {performanceMetrics.loadTime.toFixed(2)}ms</span>
                <span>Render Time: {performanceMetrics.renderTime.toFixed(2)}ms</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  );
};

export default About;
