import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TrendingUp,
  Award,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import VideoSection from "@/components/VideoSection";

type Props = {
  userRole: string | null;
};

const testimonialAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const IndexHomeBelowFold = ({ userRole }: Props) => {
  const getScannerLink = useMemo(() => {
    if (userRole === "supplier") return "/supplier-dispatch-scanner";
    if (userRole === "delivery") return "/delivery-receiving-scanner";
    return "/scanners";
  }, [userRole]);

  const platformFeatures = useMemo(
    () => [
      {
        icon: Building2,
        title: "Find Certified Builders",
        description:
          "Browse the professional builder directory, posts, and video updates in one place.",
        color: "from-blue-500 to-cyan-600",
        link: "/builders",
      },
      {
        icon: Store,
        title: "Browse Suppliers",
        description:
          "Compare supplier listings, request quotes, and manage orders from your dashboard.",
        color: "from-green-500 to-emerald-600",
        link: "/suppliers",
      },
      {
        icon: Truck,
        title: "GPS Delivery Tracking",
        description: "Real-time delivery tracking with live driver location updates",
        color: "from-orange-500 to-red-600",
        link: "/delivery",
      },
      {
        icon: QrCode,
        title: "QR Material Scanning",
        description:
          userRole === "builder"
            ? "Track your material deliveries in real-time"
            : "Scan and verify materials with our smart QR code system",
        color: "from-purple-500 to-pink-600",
        link: getScannerLink,
      },
      {
        icon: Camera,
        title: "Site Monitoring",
        description: "Live camera feeds and drone surveillance for your construction sites",
        color: "from-indigo-500 to-blue-600",
        link: "/monitoring",
      },
    ],
    [userRole, getScannerLink]
  );

  const testimonials = [
    {
      name: "James K. Muthoni",
      role: "Site supervisor",
      org: "Nairobi residential",
      content:
        "Dispatch and QR handoff cut down phone tag with suppliers. We still verify specs on each PO, but coordination is much faster.",
      rating: 5,
      seed: "james-muthoni-nbi",
    },
    {
      name: "Grace Wambui Githaiga",
      role: "Hardware & steel stockist",
      org: "Rift Valley",
      content:
        "Bulk quote requests are clearer than WhatsApp threads alone. Payout timing still depends on the buyer, but the workflow keeps everyone aligned.",
      rating: 4,
      seed: "grace-githaiga-rv",
    },
    {
      name: "Omar S. Bett",
      role: "Logistics coordinator",
      org: "Coastal corridor",
      content:
        "GPS milestones help our drivers and site teams agree on handover without constant calls. Monitoring quality varies by camera setup.",
      rating: 5,
      seed: "omar-bett-coast",
    },
  ];

  return (
    <>
      {/* Quick Access Section */}
      <section className="py-8 bg-background -mt-4 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: "🚚", label: "Request Delivery", link: "/delivery" },
              { icon: "🏪", label: "Find Suppliers", link: "/suppliers" },
              { icon: "🎥", label: "Site Monitoring", link: "/monitoring" },
              { icon: "📦", label: "QR Scanner", link: getScannerLink },
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

      {/* Choose Your Portal Section */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-widest text-white/60 mb-2">CHOOSE YOUR PORTAL</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Card className="h-full hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center flex flex-col h-full">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Private Builder</h3>
                <p className="text-emerald-100/80 text-sm mb-4">Buy materials for home projects</p>
                <ul className="text-left text-emerald-100/70 text-xs space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-300">›</span> Buy materials for home projects
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-300">›</span> Track deliveries, Compare prices
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link to="/private-client-auth">
                    <Button size="sm" className="w-full bg-white text-emerald-700 hover:bg-white/90 font-semibold">
                      Explore
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center flex flex-col h-full">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Professional Builder</h3>
                <p className="text-blue-100/80 text-sm mb-4">Request bulk quotes & manage projects</p>
                <ul className="text-left text-blue-100/70 text-xs space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-300">›</span> Request bulk quotes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-300">›</span> Manage projects, Hire suppliers
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link to="/professional-builder-auth">
                    <Button size="sm" className="w-full bg-white text-blue-700 hover:bg-white/90 font-semibold">
                      Explore
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl hover:shadow-2xl rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center flex flex-col h-full">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Store className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Supplier</h3>
                <p className="text-orange-100/80 text-sm mb-4">List products & receive orders</p>
                <ul className="text-left text-orange-100/70 text-xs space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-orange-300">›</span> List products
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-300">›</span> Receive orders, Manage inventory
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link to="/supplier-auth">
                    <Button size="sm" className="w-full bg-white text-orange-700 hover:bg-white/90 font-semibold">
                      Explore
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center flex flex-col h-full">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Delivery Provider</h3>
                <p className="text-purple-100/80 text-sm mb-4">Get transport jobs & earn</p>
                <ul className="text-left text-purple-100/70 text-xs space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">›</span> Get transport jobs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">›</span> Track logistics, Earn per delivery
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link to="/delivery">
                    <Button size="sm" className="w-full bg-white text-purple-700 hover:bg-white/90 font-semibold">
                      Explore
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Complete Platform</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Build</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From finding materials to monitoring your construction site, UjenziXform brings the tools you use
                day-to-day into one workflow.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <Link to={feature.link}>
                  <Card className="h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer border-2 border-transparent hover:border-primary/20">
                    <CardContent className="p-6">
                      <div
                        className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                      >
                        <feature.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
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
      <section id="platform-demo" className="scroll-mt-24 py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-white/10 text-white border-white/20">🎬 Platform Demo</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See UjenziXform in Action</h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Watch how our platform supports construction workflows across Kenya
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto">
            <VideoSection
              videoId="YC0e8kEmen4"
              useYouTube={true}
              thumbnail="https://img.youtube.com/vi/YC0e8kEmen4/hqdefault.jpg"
              title="UjenziXform Complete Platform Demo"
              description="See features in action"
            />
          </div>

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
              <Badge className="mb-4 bg-orange-500/10 text-orange-600 border-orange-500/20">Simple Process</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started in 3 Steps</h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Create Your Account",
                description: "Sign up as a builder or supplier and create your professional profile",
                icon: Users,
                color: "from-blue-500 to-cyan-600",
              },
              {
                step: "02",
                title: "Connect & Discover",
                description: "Find materials, suppliers, or builders that match your needs",
                icon: Search,
                color: "from-green-500 to-emerald-600",
              },
              {
                step: "03",
                title: "Build & Grow",
                description: "Track deliveries, monitor sites, and scale your construction business",
                icon: TrendingUp,
                color: "from-orange-500 to-red-600",
              },
            ].map((item, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 150}>
                <div className="text-center relative">
                  <div
                    className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                  >
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <span className="absolute top-0 right-1/4 -translate-x-1/2 text-6xl font-bold text-muted/20">{item.step}</span>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Kenya-Specific Features — claims match what the product actually exposes */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-green-600/10 text-green-700 border-green-600/20">🇰🇪 Made for Kenya</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Kenya, By Kenyans</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Features aimed at how construction actually runs here—payments, logistics, and local coverage.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Smartphone,
                title: "M-Pesa Integration",
                description: "Pay with M-Pesa and other mobile money options supported in checkout.",
                color: "bg-green-600",
              },
              {
                icon: MapPin,
                title: "47 Counties Coverage",
                description: "List and deliver across Kenya’s counties—coverage depends on active suppliers and drivers in each area.",
                color: "bg-orange-500",
              },
              {
                icon: Shield,
                title: "Certifications on listings",
                description:
                  "Suppliers can document KEBS and other certifications on products; always confirm specs on your quotes and deliveries.",
                color: "bg-blue-600",
              },
              {
                icon: Truck,
                title: "Local logistics",
                description: "Coordinate with transporters on the platform and track milestones where GPS is enabled.",
                color: "bg-red-500",
              },
              {
                icon: CreditCard,
                title: "Multiple payment paths",
                description:
                  "Checkout supports M-Pesa, bank, and SACCO-style payment types where that flow is enabled for your account.",
                color: "bg-purple-600",
              },
              {
                icon: Globe,
                title: "English & Kiswahili",
                description: "Use the language switcher and Kiswahili-aware assistant responses alongside English across supported screens.",
                color: "bg-teal-600",
              },
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
                What teams tell us
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Voices from the network</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Summarized feedback from pilots and early partners. Names and avatars are illustrative; ratings reflect individual
                experiences.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 150}>
                <Card className="h-full hover:shadow-xl transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        Early partner
                      </Badge>
                      <div className="flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i <= testimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={testimonialAvatar(testimonial.seed)}
                        alt=""
                        className="w-12 h-12 rounded-full bg-muted shrink-0"
                        width={48}
                        height={48}
                        loading="lazy"
                      />
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role} · {testimonial.org}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — network size comes from parent via data attribute for optional hydration; we keep copy generic here */}
      <section className="py-20 bg-gradient-to-r from-primary via-blue-600 to-primary text-white relative overflow-hidden">
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
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Transform Your Construction Business?</h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join builders, suppliers, and delivery partners already coordinating on UjenziXform.
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
              Already have an account?{" "}
              <Link to="/auth" className="text-white underline hover:no-underline">
                Sign In
              </Link>
            </p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
};

export default IndexHomeBelowFold;
