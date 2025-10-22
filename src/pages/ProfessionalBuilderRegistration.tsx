import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, CheckCircle, ArrowLeft, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
  "Kitale", "Garissa", "Nyeri", "Machakos", "Meru", "Kericho", "Embu",
  "Migori", "Kakamega", "Lamu", "Naivasha", "Nanyuki", "Voi", "Kilifi",
  "Lodwar", "Wajir", "Marsabit", "Moyale", "Chuka", "Kiambu", "Kajiado",
  "Murang'a", "Kirinyaga", "Nyandarua", "Laikipia", "Samburu", "Trans Nzoia",
  "Uasin Gishu", "Elgeyo Marakwet", "Nandi", "Baringo", "West Pokot", 
  "Turkana", "Bomet", "Narok", "Makueni", "Kitui", "Mwingi", "Tharaka Nithi", 
  "Isiolo", "Mandera", "Garissa"
];

const PROFESSIONAL_SPECIALTIES = [
  "Commercial Construction", "Residential Construction", "Road Construction",
  "Bridge Construction", "High-rise Buildings", "Industrial Construction",
  "Infrastructure Development", "Project Management", "Construction Consulting",
  "Electrical Contracting", "Plumbing Contracting", "HVAC Systems",
  "Steel Construction", "Concrete Works", "Foundation Engineering",
  "Structural Engineering", "Architectural Services", "Interior Design",
  "Landscaping & Urban Planning", "Solar Installation", "Water Systems Engineering"
];

const professionalRegistrationSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  company_name: z.string().min(2, "Company name is required"),
  registration_number: z.string().min(1, "Business registration number is required"),
  license_number: z.string().min(1, "Professional license number is required"),
  location: z.string().min(1, "Please select your location"),
  specialties: z.array(z.string()).min(1, "Please select at least one specialty"),
  years_experience: z.number().min(1, "Professional builders must have at least 1 year of experience"),
  description: z.string().min(100, "Description must be at least 100 characters for professional builders"),
  portfolio_url: z.string().url("Please enter a valid portfolio URL").optional().or(z.literal("")),
  insurance_details: z.string().min(10, "Insurance details are required for professional builders"),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
  privacy_accepted: z.boolean().refine(val => val === true, {
    message: "You must accept the privacy policy"
  })
});

type ProfessionalRegistrationFormData = z.infer<typeof professionalRegistrationSchema>;

const ProfessionalBuilderRegistration = () => {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ProfessionalRegistrationFormData>({
    resolver: zodResolver(professionalRegistrationSchema),
    defaultValues: {
      specialties: [],
      years_experience: 1,
      terms_accepted: false,
      privacy_accepted: false,
      portfolio_url: ""
    }
  });

  const handleSpecialtyToggle = (specialty: string) => {
    const currentSpecialties = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter(s => s !== specialty)
      : [...selectedSpecialties, specialty];
    
    setSelectedSpecialties(currentSpecialties);
    form.setValue("specialties", currentSpecialties);
  };

  const onSubmit = async (data: ProfessionalRegistrationFormData) => {
    setIsSubmitting(true);

    try {
      // Create user account with builder_category metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: "temp_password_" + Math.random().toString(36).substring(7), // Temporary password
        options: {
          data: {
            full_name: data.full_name,
            builder_category: 'professional',
            user_type: 'company'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      toast({
        title: "Professional Builder Registration Submitted",
        description: "Your application will be reviewed within 1-2 business days. You'll receive an email with login credentials and next steps.",
      });

      // Reset form
      form.reset();
      setSelectedSpecialties([]);
      
      // Redirect to success page or login
      navigate("/auth?message=registration_success");

    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: "There was an error submitting your registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Kenyan Professional Construction Background */}
      <section 
        className="relative text-white py-16 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/kenyan-professional-construction-bg.svg')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-700/70 to-blue-800/80"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-12 w-12 mr-3" />
              <h1 className="text-4xl font-bold drop-shadow-lg">Professional Builder Registration</h1>
            </div>
            <p className="text-xl mb-8 opacity-95 drop-shadow-md">
              Join our network of certified contractors and construction companies across Kenya
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link to="/builder-registration">
                <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 shadow-lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Registration Options
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Professional Requirements Notice */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Building2 className="h-5 w-5" />
                Professional Builder Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Valid Business License</p>
                      <p className="text-blue-700">Registered business with Kenya Bureau of Standards (KEBS) certification</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">NCA Registration</p>
                      <p className="text-blue-700">Valid National Construction Authority (NCA) license</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Insurance Coverage</p>
                      <p className="text-blue-700">Valid liability and professional indemnity insurance</p>
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Form */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Professional Builder Application</CardTitle>
              <p className="text-muted-foreground">
                Complete the form below to register as a certified professional builder or contractor
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+254 700 000 000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>County *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your county" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {KENYAN_COUNTIES.map((county) => (
                                  <SelectItem key={county} value={county}>
                                    {county}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Business Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registration_number"
                        render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Registration Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter KRA PIN or Business Registration Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="license_number"
                        render={({ field }) => (
                        <FormItem>
                          <FormLabel>NCA License Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter NCA license number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="years_experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="1" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="portfolio_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio/Website URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://your-website.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Specialties */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Professional Specialties</h3>
                    <FormField
                      control={form.control}
                      name="specialties"
                      render={() => (
                        <FormItem>
                          <FormLabel>Select Your Specialties *</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {PROFESSIONAL_SPECIALTIES.map((specialty) => (
                              <div key={specialty} className="flex items-center space-x-2">
                                <Checkbox
                                  id={specialty}
                                  checked={selectedSpecialties.includes(specialty)}
                                  onCheckedChange={() => handleSpecialtyToggle(specialty)}
                                />
                                <Label htmlFor={specialty} className="text-sm font-normal">
                                  {specialty}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {selectedSpecialties.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedSpecialties.map((specialty) => (
                                <Badge key={specialty} variant="secondary">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Insurance Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Insurance Information</h3>
                    <FormField
                      control={form.control}
                      name="insurance_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Details *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide details about your liability insurance, professional indemnity, and any other relevant coverage"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Company Profile</h3>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About Your Company *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your company, services, experience, notable projects, and what makes you unique (minimum 100 characters)"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Terms and Privacy */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Terms & Conditions</h3>
                    
                    <FormField
                      control={form.control}
                      name="terms_accepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I accept the Terms and Conditions for Professional Builders *
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              By checking this box, you agree to our professional builder terms of service and certification requirements
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="privacy_accepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I accept the Privacy Policy *
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              We handle your data securely and never share business information without consent
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? "Submitting Application..." : "Submit Professional Builder Registration"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfessionalBuilderRegistration;
