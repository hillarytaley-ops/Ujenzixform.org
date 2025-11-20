import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Building2, User, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";


const BuilderRegistration = () => {

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Kenyan Builder Selection Background */}
      <section 
        className="relative text-white py-16 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/kenyan-builder-selection-bg.svg')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/70 via-orange-700/60 to-red-600/70"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">Join MradiPro Platform</h1>
            <p className="text-xl mb-8 opacity-95 drop-shadow-md">
              Are you a professional builder or a client needing construction services?
            </p>
            
            <Link to="/builders">
              <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 shadow-lg">
                <ArrowRight className="h-4 w-4 mr-2" />
                Browse Builder Directory
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Registration Type Selection */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choose Your Registration Type</h2>
            <p className="text-lg text-muted-foreground">
              Select the option that best describes your building business
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Professional Builder Card */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-800">Professional Builder</CardTitle>
                <p className="text-blue-600 font-medium">Contractors & Construction Companies</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Licensed construction companies in Kenya</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Certified contractors with NCA registration</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Professional liability insurance required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Access to commercial projects across Kenya</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link to="/professional-builder-registration">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Register as Professional Builder
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Private Client Card */}
            <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-800">Private Client</CardTitle>
                <p className="text-green-600 font-medium">Homeowners & Property Developers</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Homeowners planning construction projects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Connect with professional builders and suppliers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Access to verified construction professionals</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Streamlined project management tools</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link to="/private-client-registration">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      Register as Private Client
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Protection Notice */}
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-center justify-center">
                  <Shield className="h-5 w-5" />
                  Your Information is Protected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Secure Encryption</p>
                      <p className="text-muted-foreground">All data transmitted using industry-standard SSL encryption</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Verified Process</p>
                      <p className="text-muted-foreground">Manual review ensures quality and authenticity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Privacy Compliant</p>
                      <p className="text-muted-foreground">Data used only for verification and platform services</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default BuilderRegistration;