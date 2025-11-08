import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Target, Award, Globe, Shield, ExternalLink, SkipForward } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import AnimatedCounter from "@/components/AnimatedCounter";

const About: React.FC = () => {
  const [pageViews, setPageViews] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    renderTime: 0
  });

  useEffect(() => {
    // Performance monitoring
    const startTime = performance.now();
    
    // Track page load performance
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      setPerformanceMetrics(prev => ({ ...prev, loadTime }));
    };
    
    window.addEventListener('load', handleLoad);

    // Track render performance
    const renderTime = performance.now() - startTime;
    setPerformanceMetrics(prev => ({ ...prev, renderTime }));

    // Basic page view tracking (privacy-conscious)
    const views = parseInt(localStorage.getItem('about-page-views') || '0') + 1;
    setPageViews(views);
    localStorage.setItem('about-page-views', views.toString());

    // Security monitoring - log page access
    console.info('About page accessed', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 50), // Limited for privacy
      referrer: document.referrer ? 'has-referrer' : 'direct', // Privacy-safe
    });

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);
  const values = [
    {
      icon: Target,
      title: "Our Mission", 
      description: "To revolutionize Kenya's construction industry by creating seamless connections between builders and suppliers, fostering growth and innovation."
    },
    {
      icon: Users,
      title: "Community First",
      description: "We believe in building strong relationships and supporting local businesses to create a thriving construction ecosystem."
    },
    {
      icon: Award,
      title: "Quality Assurance",
      description: "Every supplier and builder on our platform is verified to ensure the highest standards of quality and reliability."
    },
    {
      icon: Globe,
      title: "National Reach",
      description: "Connecting construction professionals across all 47 counties of Kenya, from Nairobi to remote rural areas."
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

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "UjenziPro",
    "description": "Kenya's leading construction platform connecting builders with trusted suppliers",
    "url": "https://ujenzipro.com",
    "logo": "https://ujenzipro.com/logo.png",
    "foundingDate": "2023",
    "founders": [
      {
        "@type": "Person",
        "name": "Sila Kapting'ei",
        "jobTitle": "CEO"
      },
      {
        "@type": "Person", 
        "name": "Hillary Kaptng'ei",
        "jobTitle": "CTO & Founder"
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "Kenya",
      "addressLocality": "Nairobi"
    },
    "sameAs": [
      "https://linkedin.com/company/ujenzipro",
      "https://twitter.com/ujenzipro"
    ]
  };

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

        {/* Hero Section */}
        <AnimatedSection animation="fadeInUp">
          <section 
            className="text-white py-24 relative overflow-hidden"
            role="banner"
            aria-labelledby="hero-heading"
          >
          {/* Clean professional background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800"></div>
          
          {/* Overlay with Kenyan flag colors gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-gray-900/40 to-gray-800/40"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge className="mb-6 bg-gradient-to-r from-green-600 to-red-600 text-white border-white/30 px-4 py-2 text-lg font-semibold" aria-label="Proudly Kenyan company">
              🇰🇪 Proudly Kenyan - Building the Future
            </Badge>
            <h1 id="hero-heading" className="text-6xl md:text-7xl font-bold mb-8 text-white drop-shadow-2xl">
              About UjenziPro
            </h1>
            <p className="text-2xl md:text-3xl max-w-4xl mx-auto text-white font-medium drop-shadow-lg leading-relaxed">
              Transforming Kenya's construction industry through technology, 
              connecting builders with trusted suppliers across all 47 counties
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Globe className="h-5 w-5" />
                <span className="font-medium">All 47 Counties</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Users className="h-5 w-5" />
                <span className="font-medium">1,000+ Builders</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Award className="h-5 w-5" />
                <span className="font-medium">500+ Suppliers</span>
              </div>
            </div>
          </div>
          </section>
        </AnimatedSection>

        {/* Our Story Section */}
        <AnimatedSection animation="fadeInUp">
          <section className="py-20 bg-muted" role="main" aria-labelledby="story-heading" id="main-content" tabIndex={-1}>
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 id="story-heading" className="text-4xl font-bold text-center mb-12">Our Story</h2>
              <div className="prose prose-lg mx-auto">
                <p className="text-lg leading-relaxed mb-6 text-muted-foreground">
                  UjenziPro was born from a simple observation: Kenya's construction industry needed
                  not just better connections, but complete project visibility. As builders struggled to find 
                  reliable suppliers and track their material deliveries, while suppliers couldn't efficiently 
                  reach their ideal customers, we saw an opportunity to revolutionize the entire construction workflow.
                </p>
                <p className="text-lg leading-relaxed mb-6 text-muted-foreground">
                  Founded in 2023 by a team of construction industry veterans and technology experts, 
                  we've quickly grown to become Kenya's leading platform for construction professionals. 
                  Our comprehensive solution goes beyond simple connections - we provide real-time project tracking, 
                  delivery management, and complete transparency throughout the construction supply chain.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Today, we're proud to serve thousands of builders and suppliers across all 47 counties, 
                  facilitating millions of shillings in transactions, tracking thousands of deliveries, 
                  and providing complete project visibility that's helping build the Kenya of tomorrow.
                </p>
              </div>
            </div>
          </div>
          </section>
        </AnimatedSection>

        {/* Values Section */}
        <section className="py-24 relative overflow-hidden" aria-labelledby="values-heading">
          {/* Clean values background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <h2 id="values-heading" className="text-5xl font-bold text-center mb-4 text-gray-900 drop-shadow-sm">Our Values</h2>
            <p className="text-xl text-center mb-16 text-gray-700 max-w-3xl mx-auto">
              Built on the foundation of Kenyan values: Ubuntu, integrity, and community strength
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {values.map((value, index) => (
                <AnimatedSection key={`value-${index}`} animation="fadeInUp" delay={index * 100}>
                  <Card 
                    className="text-center hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white/95"
                    tabIndex={0}
                  >
                  <CardHeader className="pb-4">
                    <div className="mx-auto mb-6 p-6 bg-gradient-to-br from-green-500 to-red-500 rounded-full w-fit shadow-lg">
                      <value.icon className="h-10 w-10 text-white" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-lg text-gray-700 leading-relaxed">{value.description}</CardDescription>
                  </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
            
            {/* Kenyan Construction Philosophy */}
            <div className="mt-16 text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30 max-w-3xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Ubuntu in Construction</h3>
                <p className="text-lg text-gray-800 italic">
                  "I am because we are" - Our success is built on the success of every builder, 
                  supplier, and construction professional in Kenya.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 relative overflow-hidden" aria-labelledby="team-heading">
          {/* Clean team background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <h2 id="team-heading" className="text-5xl font-bold text-center mb-6 text-white drop-shadow-2xl">Meet Our Team</h2>
            <p className="text-xl text-center mb-16 text-white/90 max-w-3xl mx-auto drop-shadow-lg">
              Experienced professionals dedicated to transforming Kenya's construction landscape
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {team.map((member, index) => (
                <AnimatedSection key={`team-member-${index}`} animation="scaleIn" delay={index * 100}>
                  <Card 
                    className="text-center hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-white bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white/95 hover:scale-105"
                    tabIndex={0}
                  >
                  <CardHeader>
                    <div 
                      className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center overflow-hidden"
                      role="img"
                      aria-label={`Photo placeholder for ${member.name}`}
                    >
                      {member.image && member.image !== '/placeholder.svg' ? (
                        <img
                          src={member.image}
                          alt={`${member.name} - ${member.role}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback to icon on image error
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <Users className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription className="text-primary font-medium">
                      {member.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{member.description}</p>
                  </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section 
          className="py-24 text-white relative overflow-hidden"
          aria-labelledby="stats-heading"
        >
          {/* Clean stats background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <h2 id="stats-heading" className="text-5xl font-bold text-center mb-4 drop-shadow-2xl">Our Impact Across Kenya</h2>
            <p className="text-xl text-center mb-16 text-white/90 max-w-3xl mx-auto drop-shadow-lg">
              From Mombasa to Kisumu, from Nairobi to Eldoret - we're building Kenya's future together
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <AnimatedSection animation="fadeInUp" delay={0}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-white rounded-lg" tabIndex={0}>
                  <div className="text-5xl font-bold mb-3 text-green-400 drop-shadow-lg" aria-label="One thousand plus">
                    <AnimatedCounter end={1000} suffix="+" />
                  </div>
                  <div className="text-xl font-semibold text-white mb-2">Active Builders</div>
                  <div className="text-sm text-white/80">Across all 47 counties</div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={100}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-white rounded-lg" tabIndex={0}>
                  <div className="text-5xl font-bold mb-3 text-blue-400 drop-shadow-lg" aria-label="Five hundred plus">
                    <AnimatedCounter end={500} suffix="+" />
                  </div>
                  <div className="text-xl font-semibold text-white mb-2">Verified Suppliers</div>
                  <div className="text-sm text-white/80">Quality-assured partners</div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={200}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-white rounded-lg" tabIndex={0}>
                  <div className="text-5xl font-bold mb-3 text-yellow-400 drop-shadow-lg" aria-label="Ten thousand plus">
                    <AnimatedCounter end={10000} suffix="+" />
                  </div>
                  <div className="text-xl font-semibold text-white mb-2">Successful Projects</div>
                  <div className="text-sm text-white/80">Completed nationwide</div>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={300}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 focus-within:ring-2 focus-within:ring-white rounded-lg" tabIndex={0}>
                  <div className="text-5xl font-bold mb-3 text-red-400 drop-shadow-lg" aria-label="Two billion Kenyan Shillings plus">
                    KSh <AnimatedCounter end={2} suffix="B+" />
                  </div>
                  <div className="text-xl font-semibold text-white mb-2">Total Transactions</div>
                  <div className="text-sm text-white/80">Economic impact</div>
                </div>
              </AnimatedSection>
            </div>
            
            {/* Kenyan Cities Showcase */}
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Serving Kenya's Major Construction Hubs</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 'Nyeri'].map((city) => (
                  <Badge key={city} className="bg-white/20 text-white border-white/30 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and Security Section */}

        {/* Performance & Security Footer */}
        {process.env.NODE_ENV === 'development' && (
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
