import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Phone, Mail, Clock, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { SUPPORT_PHONE_PRIMARY, SUPPORT_PHONE_SECONDARY } from "@/config/appIdentity";

function nameSchema(label: string) {
  return z
    .string()
    .min(1, `${label} is required`)
    .max(50, `${label} is too long`)
    .refine((s) => !/[<>]/.test(s), `${label} cannot contain < or >`)
    .refine((s) => s.trim().length > 0, `${label} cannot be only spaces`);
}

const contactSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
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
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      gdprConsent: false,
      honeypot: "",
    },
  });

  const messageLen = useWatch({ control, name: "message", defaultValue: "" })?.length ?? 0;

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

      // Use direct fetch to Supabase REST API (more reliable than client)
      // SUPABASE_URL and SUPABASE_ANON_KEY imported from centralized client
      
      // Format the comment with all contact form fields
      const formattedComment = `Name: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}\nSubject: ${data.subject}\n\nMessage:\n${data.message}`;
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          category: '[CONTACT FORM]',
          comment: formattedComment,
          rating: null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Contact form submission error:', errorText);
        throw new Error('Failed to submit contact form');
      }
      
      toast({
        title: "Message sent successfully!",
        description:
          "Thank you for contacting us. We aim to respond within one business day during the week (often faster).",
        variant: "default",
      });

      reset();
      
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
                🇰🇪 Kenya-based team · UjenziXform
              </div>
            </div>
            <h1 id="contact-hero-heading" className="text-6xl md:text-7xl font-bold mb-6 text-white drop-shadow-2xl">
              Get In Touch
            </h1>
            <p className="text-2xl md:text-3xl mb-8 text-white/90 font-medium drop-shadow-lg leading-relaxed">
              We help builders, suppliers, and delivery partners get unstuck — questions, partnerships, and platform
              support.
            </p>

            {/* Contact Highlights — aligned with business hours below */}
            <div className="flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Phone className="h-5 w-5 shrink-0" />
                <span className="font-medium">Phone support in business hours</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Mail className="h-5 w-5 shrink-0" />
                <span className="font-medium">Email &amp; form anytime</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <MapPin className="h-5 w-5 shrink-0" />
                <span className="font-medium">Nairobi HQ</span>
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
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Contact the UjenziXform team</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Use the form or reach us by phone or email. We focus on major construction hubs and work with teams across
              Kenya.
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
                  We aim to reply within one business day on weekdays (often faster). For urgent issues, call during
                  business hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      maxLength={2000}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                    <div className="text-xs text-muted-foreground text-right">
                      {messageLen}/2000 characters
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
                            }}
                          />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="gdprConsent"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I agree to the{" "}
                          <Link to="/privacy-policy" className="text-primary underline underline-offset-2">
                            privacy policy
                          </Link>{" "}
                          and{" "}
                          <Link to="/terms-of-service" className="text-primary underline underline-offset-2">
                            terms of service
                          </Link>{" "}
                          *
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
                  <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send message
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-center text-muted-foreground space-y-1">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        Sent over HTTPS
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        Honeypot field to reduce bots
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        Consent recorded with your message
                      </span>
                    </div>
                    <p>We may add CAPTCHA or stricter checks if spam increases.</p>
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
                          🇰🇪 Nairobi HQ — we work with teams across Kenya (major hubs first, growing nationwide).
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
                          <a
                            href={`tel:${SUPPORT_PHONE_PRIMARY.tel}`}
                            className="hover:text-primary transition-colors"
                          >
                            {SUPPORT_PHONE_PRIMARY.display}
                          </a>
                          <br />
                          <a
                            href={`tel:${SUPPORT_PHONE_SECONDARY.tel}`}
                            className="hover:text-primary transition-colors"
                          >
                            {SUPPORT_PHONE_SECONDARY.display}
                          </a>
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
                        <h3 className="font-bold text-2xl mb-2 text-gray-900">Email Address</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          <a href="mailto:info@ujenzixform.org" className="hover:text-primary transition-colors">info@ujenzixform.org</a>
                        </p>
                        <p className="text-sm text-red-600 font-medium mt-2">
                          ✉️ We aim to reply within one business day on weekdays.
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
              Quick answers to help you get started with UjenziXform
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
                  Use the registration links for{" "}
                  <Link to="/builder-registration" className="text-primary font-medium underline underline-offset-2">
                    builders
                  </Link>{" "}
                  or{" "}
                  <Link to="/supplier-registration" className="text-primary font-medium underline underline-offset-2">
                    suppliers
                  </Link>
                  . We review submissions as quickly as we can and may request documents depending on your role.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/95 backdrop-blur-sm border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-red-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">Is there a fee to use UjenziXform?</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Basic registration and browsing is free. Fees depend on how you use the marketplace and services —
                  see current terms and product pages, or ask us for the latest structure.
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
                  We use document checks, references, and onboarding steps appropriate to each role. What we require
                  can vary; trust indicators in the app reflect what we have been able to confirm — not every member
                  has the same depth of review.
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
                  Anyone in Kenya can sign up. Delivery and on-the-ground coverage depend on suppliers and drivers in
                  each area — we are strongest in major construction hubs and are expanding over time, consistent with
                  how we describe coverage on our About page.
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
