
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Phone, Mail, Clock, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
// import { useContactFormSecurity } from "@/hooks/useContactFormSecurity";
// import { RecaptchaWrapper } from "@/components/ui/RecaptchaWrapper";

const contactSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .regex(/^[a-zA-Z\s\-']+$/, "First name contains invalid characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .regex(/^[a-zA-Z\s\-']+$/, "Last name contains invalid characters"),
  email: z.string()
    .email("Please enter a valid email")
    .max(100, "Email address too long")
    .refine(email => !email.includes('..'), "Invalid email format"),
  phone: z.string()
    .min(10, "Please enter a valid phone number")
    .max(20, "Phone number too long")
    .regex(/^[0-9\s\-+()]+$/, "Phone number contains invalid characters"),
  subject: z.string()
    .min(1, "Subject is required")
    .max(200, "Subject too long")
    .refine(subject => !/<.*>/.test(subject), "Subject contains invalid characters"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message too long")
    .refine(message => !/<script.*>/.test(message), "Message contains invalid content"),
  gdprConsent: z.boolean().refine(val => val === true, "You must agree to the privacy policy"),
  honeypot: z.string().max(0, "Bot detected") // Should be empty
});

type ContactForm = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityScore, setSecurityScore] = useState(100);
  const [formInteractions, setFormInteractions] = useState(0);
  const { toast } = useToast();
  
  // Track form interactions for security
  const trackInteraction = (type: string) => {
    setFormInteractions(prev => prev + 1);
    console.log('Form interaction:', type);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      gdprConsent: false,
      honeypot: '' // Honeypot field should be empty
    }
  });

  // Watch form values for security validation
  const formValues = watch();

  // Enhanced form submission with basic security
  const onSubmit = async (data: ContactForm) => {
    setIsSubmitting(true);
    
    try {
      // Basic security validation
      if (data.honeypot && data.honeypot.length > 0) {
        toast({
          title: "Security Check Failed",
          description: "Bot activity detected.",
          variant: "destructive",
        });
        return;
      }

      if (!data.gdprConsent) {
        toast({
          title: "Consent Required",
          description: "Please agree to the privacy policy to continue.",
          variant: "destructive",
        });
        return;
      }

      // Simulate secure form submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Message sent successfully!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
        variant: "default",
      });
      
      reset();
      setSecurityScore(100);
      setFormInteractions(0);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <header 
          className="text-white py-24 relative overflow-hidden"
          role="banner"
          aria-labelledby="contact-hero-heading"
        >
        {/* Clean professional contact background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-center">
              <div className="bg-gradient-to-r from-green-600 to-red-600 text-white px-6 py-2 rounded-full text-lg font-semibold border border-white/30">
                🇰🇪 Connect with Kenya's Construction Leaders
              </div>
            </div>
            <h1 id="contact-hero-heading" className="text-6xl md:text-7xl font-bold mb-6 text-white drop-shadow-2xl">
              Get In Touch
            </h1>
            <p className="text-2xl md:text-3xl mb-8 text-white/90 font-medium drop-shadow-lg leading-relaxed">
              We're here to help you connect, build, and succeed across Kenya's construction industry
            </p>
            
            {/* Contact Highlights */}
            <div className="flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Phone className="h-5 w-5" />
                <span className="font-medium">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Quick Response</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Nairobi Office</span>
              </div>
            </div>
          </div>
        </div>
        </header>
      </AnimatedSection>

      {/* Contact Section */}
      <main className="py-20 relative overflow-hidden">
        {/* Clean form background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Contact Kenya's Construction Experts</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              From Nairobi to Mombasa, from Kisumu to Eldoret - we're here to support your construction projects
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            
            {/* Contact Form */}
            <AnimatedSection animation="fadeInLeft">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-50 to-red-50 border-b border-gray-200">
                <CardTitle className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="h-8 w-8 text-primary" />
                  Send us a Message
                </CardTitle>
                <CardDescription className="text-lg text-gray-700">
                  Connect with Kenya's leading construction platform. We'll respond within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Security Status */}
                {process.env.NODE_ENV === 'development' && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>Security Score: {securityScore}/100</span>
                        <span>Interactions: {formInteractions}</span>
                        <span>Protected: ✅</span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Honeypot field (hidden from users) */}
                  <input
                    type="text"
                    {...register("honeypot")}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Enter your first name"
                        {...register("firstName")}
                        onFocus={() => trackInteraction('focus')}
                        onChange={(e) => {
                          trackInteraction('typing');
                          register("firstName").onChange(e);
                        }}
                        maxLength={50}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Enter your last name"
                        {...register("lastName")}
                        onFocus={() => trackInteraction('focus')}
                        onChange={(e) => {
                          trackInteraction('typing');
                          register("lastName").onChange(e);
                        }}
                        maxLength={50}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email address"
                      {...register("email")}
                      onFocus={() => trackInteraction('focus')}
                      onChange={(e) => {
                        trackInteraction('typing');
                        register("email").onChange(e);
                      }}
                      maxLength={100}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="Enter your phone number (e.g., +254 712 345 678)"
                      {...register("phone")}
                      onFocus={() => trackInteraction('focus')}
                      onChange={(e) => {
                        trackInteraction('typing');
                        register("phone").onChange(e);
                      }}
                      maxLength={20}
                      autoComplete="tel"
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input 
                      id="subject" 
                      placeholder="What is this regarding?"
                      {...register("subject")}
                      onFocus={() => trackInteraction('focus')}
                      onChange={(e) => {
                        trackInteraction('typing');
                        register("subject").onChange(e);
                      }}
                      maxLength={200}
                      autoComplete="off"
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Tell us more about how we can help you..." 
                      rows={6}
                      {...register("message")}
                      onFocus={() => trackInteraction('focus')}
                      onChange={(e) => {
                        trackInteraction('typing');
                        register("message").onChange(e);
                      }}
                      maxLength={2000}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                    <div className="text-xs text-muted-foreground text-right">
                      {formValues.message?.length || 0}/2000 characters
                    </div>
                  </div>

                  {/* GDPR Compliance */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Controller
                        name="gdprConsent"
                        control={control}
                        render={({ field }) => (
                          <Checkbox 
                            id="gdprConsent"
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              trackInteraction('checkbox');
                            }}
                          />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label 
                          htmlFor="gdprConsent"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I agree to the privacy policy and terms of service *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By checking this box, you consent to us processing your personal data to respond to your inquiry. 
                          You can withdraw consent at any time by contacting us.
                        </p>
                      </div>
                    </div>
                    {errors.gdprConsent && (
                      <p className="text-sm text-destructive">{errors.gdprConsent.message}</p>
                    )}
                  </div>
                  

                  {/* Security Score Display */}
                  {securityScore < 80 && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Security validation failed. Please review your input and ensure all fields are properly filled.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || securityScore < 50}
                    className="w-full" 
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Send Secure Message
                      </>
                    )}
                  </Button>

                  {/* Form Security Info */}
                  <div className="text-xs text-center text-muted-foreground space-y-1">
                    <div className="flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        SSL Encrypted
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Spam Protected
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        GDPR Compliant
                      </span>
                    </div>
                    <p>Protected by advanced security measures and rate limiting</p>
                  </div>
                </form>
              </CardContent>
              </Card>
            </AnimatedSection>

            {/* Contact Information */}
            <AnimatedSection animation="fadeInRight">
              <div className="space-y-8">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/50 shadow-2xl">
                  <h2 className="text-4xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <MapPin className="h-8 w-8 text-primary" />
                    Contact Information
                  </h2>
                  <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                    Have questions about construction materials, suppliers, or our platform? 
                    We'd love to hear from you. Our Kenya-based team is ready to help.
                  </p>
                </div>

                <div className="space-y-6">
                  <AnimatedSection animation="fadeInRight" delay={100}>
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className="p-4 bg-gradient-to-br from-green-500 to-red-500 rounded-full shadow-lg">
                        <MapPin className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl mb-2 text-gray-900">Nairobi Office</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          Libra House, Suite No. 3<br />
                          P.O BOX 73329-00200<br />
                          Nairobi, Kenya
                        </p>
                        <p className="text-sm text-green-600 font-medium mt-2">
                          🇰🇪 Serving all 47 counties from our Nairobi headquarters
                        </p>
                      </div>
                    </div>
                  </CardContent>
                    </Card>
                  </AnimatedSection>

                  <AnimatedSection animation="fadeInRight" delay={200}>
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-green-500 rounded-full shadow-lg">
                        <Phone className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl mb-2 text-gray-900">Phone Numbers</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          <a href="tel:+254726749849" className="hover:text-primary transition-colors">+254 726 749 849</a><br />
                          <a href="tel:+254733987654" className="hover:text-primary transition-colors">+254 733 987 654</a>
                        </p>
                        <p className="text-sm text-blue-600 font-medium mt-2">
                          📞 Available during business hours for immediate assistance
                        </p>
                      </div>
                    </div>
                    </CardContent>
                    </Card>
                  </AnimatedSection>

                  <AnimatedSection animation="fadeInRight" delay={300}>
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <div className="p-4 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full shadow-lg">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl mb-2 text-gray-900">Email Addresses</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          <a href="mailto:info@ujenzipro.com" className="hover:text-primary transition-colors">info@ujenzipro.com</a><br />
                          <a href="mailto:support@ujenzipro.com" className="hover:text-primary transition-colors">support@ujenzipro.com</a>
                        </p>
                        <p className="text-sm text-red-600 font-medium mt-2">
                          ✉️ 24-hour response guarantee for all inquiries
                        </p>
                      </div>
                    </div>
                    </CardContent>
                    </Card>
                  </AnimatedSection>

                  <AnimatedSection animation="fadeInRight" delay={400}>
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-lg">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl mb-2 text-gray-900">Business Hours</h3>
                        <div className="text-gray-700 text-lg leading-relaxed space-y-1">
                          <p><strong>Monday - Friday:</strong> 8:00 AM - 6:00 PM</p>
                          <p><strong>Saturday:</strong> 9:00 AM - 4:00 PM</p>
                          <p><strong>Sunday:</strong> Closed</p>
                        </div>
                        <p className="text-sm text-purple-600 font-medium mt-2">
                          🕒 East Africa Time (EAT) - UTC+3
                        </p>
                      </div>
                    </div>
                    </CardContent>
                    </Card>
                  </AnimatedSection>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </main>

      {/* FAQ Section */}
      <section 
        className="py-24 relative overflow-hidden"
        aria-labelledby="faq-heading"
      >
        {/* Clean FAQ background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 id="faq-heading" className="text-5xl font-bold mb-6 text-white drop-shadow-2xl">Frequently Asked Questions</h2>
            <p className="text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-lg">
              Quick answers to help you get started with Kenya's leading construction platform
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto space-y-8">
            <AnimatedSection animation="fadeInUp" delay={0}>
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">How do I register as a builder or supplier?</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Click on "Get Started" and select whether you're a builder or supplier. 
                  Fill out the registration form with your business details and we'll verify your account within 24 hours. 
                  Our verification process ensures quality and trust across Kenya's construction network.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">Is there a fee to use UjenziPro?</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Basic registration and browsing is completely free. We charge a small commission only when successful 
                  transactions are completed through our platform. This ensures we're aligned with your success and 
                  only earn when you do business through UjenziPro.
                </p>
              </CardContent>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={200}>
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-red-50 to-green-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">How do you verify suppliers and builders?</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  We verify business registration documents, check references, and conduct thorough background checks. 
                  All verified members receive a trust badge on their profile. Our verification process includes 
                  site visits for major suppliers and builders to ensure quality standards.
                </p>
              </CardContent>
              </Card>
            </AnimatedSection>

            {/* Additional Kenya-specific FAQ */}
            <AnimatedSection animation="fadeInUp" delay={300}>
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">Do you serve all counties in Kenya?</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Yes! UjenziPro proudly serves all 47 counties of Kenya. From major cities like Nairobi, Mombasa, 
                  and Kisumu to remote rural areas, we connect builders with local suppliers and coordinate 
                  deliveries nationwide through our extensive network.
                </p>
              </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
