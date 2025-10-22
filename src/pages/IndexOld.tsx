
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ShoppingCart, Star, Smartphone, MapPin, Shield, Truck, Building2, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

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
    <div 
      className="min-h-screen relative bg-gradient-hero"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/construction-bg.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4 bg-kenyan-green text-white border-kenyan-green">
            🇰🇪 Kujenga Pamoja - Building Together Across Kenya
          </Badge>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            <span className="text-text-on-dark">Jenga, </span>
            <span className="text-acacia-gold">Unganisha, </span>
            <span className="text-text-on-dark">na </span>
            <span className="text-kenyan-green">Stawi Pamoja</span>
          </h1>
          <div className="text-2xl font-medium mb-4 text-acacia-gold">
            Build, Connect, and Prosper Together
          </div>
          <p className="text-xl text-text-secondary-light mb-8 max-w-2xl mx-auto">
            Kenya's leading platform connecting builders with verified construction material suppliers. 
            From Mombasa to Eldoret, from Kisumu to Garissa - find quality materials, competitive prices, 
            and build lasting partnerships across all 47 counties.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/builders">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-4">
                I'm a Builder
              </Button>
            </Link>
            <Link to="/suppliers">
              <Button size="lg" variant="outline" className="border-construction-orange text-construction-orange hover:bg-construction-orange hover:text-foreground text-lg px-8 py-4">
                I'm a Supplier
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-acacia-gold">2,500+</div>
              <div className="text-text-secondary-light">Active Builders</div>
              <div className="text-xs text-text-secondary-light">Across 47 Counties</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-kenyan-green">850+</div>
              <div className="text-text-secondary-light">Verified Suppliers</div>
              <div className="text-xs text-text-secondary-light">Quality Guaranteed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">25,000+</div>
              <div className="text-text-secondary-light">Successful Projects</div>
              <div className="text-xs text-text-secondary-light">KES 15B+ Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-construction-orange">47</div>
              <div className="text-text-secondary-light">Counties Covered</div>
              <div className="text-xs text-text-secondary-light">Coast to Lake</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose UjenziPro?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We make it easy for builders and suppliers to find each other, 
              negotiate fair prices, and build successful partnerships.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow bg-card border-border">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
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
              <Card key={index} className="hover:shadow-lg transition-shadow bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-construction-orange fill-current" />
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
            ))}
          </div>
        </div>
      </section>

      {/* Kenya-Specific Features */}
      <section className="py-16 bg-gradient-to-br from-kenyan-green/10 to-acacia-gold/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Built for Kenya, By Kenyans
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
      <section 
        className="py-16 text-text-on-dark relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/lovable-uploads/6ea15a8f-a981-4c02-a56e-64ed62ab7a57.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Construction Business?</h2>
          <p className="text-xl mb-8 text-text-secondary-light">Join thousands of builders and suppliers already using UjenziPro</p>
          <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90 text-foreground text-lg px-8 py-4">
            Start Building Connections Today
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
